// const { default: axios } = require('axios');
const db = require("./db");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const handlebars = require("handlebars");

/* eslint-disable indent */
function getStatusPenggunaan(status) {
  // 0 digunakan dinas operasional, 1 digunakan dinas jabatan
  switch (status) {
    case 0:
      return "Dinas Operasional";
    case 1:
      return "Dinas Jabatan";
    default:
      return "Tidak diketahui";
  }
}

function phoneNumberFormatter(number) {
  let str = String(number);

  // 1. Menghilangkan karakter selain angka
  let formatted = str.replace(/\D/g, "");

  // 2. Menghilangkan prefix 0 di depan -> di ganti dengan 62
  if (formatted.startsWith("0")) {
    formatted = "62" + formatted.substring(1);
  }

  if (!formatted.endsWith("@c.us")) {
    formatted += "@c.us";
  }

  return formatted;
}

async function checkAuthentication(phoneNumber, getKendaraan = false) {
  try {
    let customQuery = {};
    if (getKendaraan) {
      customQuery = {
        include: {
          riwayatPenggunaan: {
            select: {
              kendaraan_id: true,
            },
            where: {
              AND: [{ isApproved: true }, { selesai: null }],
            },
            orderBy: {
              id: "desc",
            },
            take: 1,
          },
        },
      };
    }
    const user = await db.user.findFirstOrThrow({
      where: { phoneNumber },
      ...customQuery,
    });
    return user;
  } catch (error) {
    console.log("Check authentication error: ", error);
    return Error("User not found");
  }
}

async function checkAuthenticationAdmin(phoneNumber) {
  try {
    const user = await db.user.findFirstOrThrow({
      where: {
        AND: [{ phoneNumber }, { role: "admin" }],
      },
    });
    return user;
  } catch (error) {
    return Error("User not found");
  }
}

async function checkKendaraan(kendaraanId) {
  try {
    const kendaraan = await db.kendaraan.findFirstOrThrow({
      where: { id: parseInt(kendaraanId), isDeleted: false },
    });
    return kendaraan.id;
  } catch (error) {
    return Error("Kendaraan not found");
  }
}

async function getLabels(indexes = []) {
  let query = {};
  if (indexes.length > 0) {
    query = {
      where: {
        indeks: {
          in: indexes,
        },
      },
    };
  }
  const labels = await db.label.findMany({
    ...query,
  });
  return labels;
}

async function getAdmin() {
  const admin = await db.user.findFirst({
    where: { role: "admin" },
  });
  return {
    chatId: phoneNumberFormatter(admin.phoneNumber),
    ...admin,
  };
}

function getKondisi(hasilLaporan) {
  const detected_labels = [];
  const detected_problems = [];
  const kondisiLabels = hasilLaporan.reduce((acc, curr) => {
    acc.push(
      ...curr.outputKlasifikasi.map((item) => {
        if (!detected_labels.includes(item.label.id)) {
          detected_labels.push(item.label.id);
          detected_problems.push(item.label.label);
        }
        return item.label;
      })
    );
    return acc;
  }, []);

  const total_bobot = kondisiLabels.reduce((acc, curr) => {
    return acc + curr.bobot;
  }, 0);

  const indeks = total_bobot / detected_labels.length;

  return {
    jml_laporan: hasilLaporan.length,
    bobot: total_bobot,
    jml_masalah: detected_labels.length,
    masalah: detected_problems,
    indeks: indeks ?? 0,
    label: labelKerusakan(indeks),
    persentase: getPecentage(indeks),
  };
}

function getKondisiLaporan(outputKlasifikasi) {
  const detected_labels = [];
  const detected_problems = [];
  const detected_bobot = [];

  outputKlasifikasi.forEach((item) => {
    if (!detected_labels.includes(item.label.id)) {
      detected_labels.push(item.label.id);
      detected_problems.push(item.label.label);
      detected_bobot.push(item.label.bobot);
    }
  });

  const total_bobot = detected_bobot.reduce((acc, curr) => acc + curr, 0);

  const indeks = total_bobot / detected_labels.length;

  return {
    bobot: total_bobot,
    jml_masalah: detected_labels.length,
    masalah: detected_problems,
    indeks: indeks ?? 0,
    label: labelKerusakan(indeks),
    persentase: getPecentage(indeks),
  };
}

function labelKerusakan(value) {
  let nilai = Math.floor(value);
  let label;
  if (nilai >= 1 && nilai <= 3) {
    label = "Rusak Ringan";
  } else if (nilai >= 4 && nilai <= 6) {
    label = "Rusak";
  } else if (nilai >= 7 && nilai <= 10) {
    label = "Sangat Rusak";
  } else {
    label = "Nilai tidak valid";
  }
  return label;
}

function getPecentage(value) {
  if (value) {
    return `${Math.round(value * 10)}%`;
  } else {
    return "0%";
  }
}

function getAge(dateString) {
  var today = new Date();
  var birthDate = new Date(dateString);
  var age = today.getFullYear() - birthDate.getFullYear();
  var m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age ?? 0;
}

function convertDateString(dateString) {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString("default", { month: "long" });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function weightedProduct(bobot, skalaKepentingan, skalaKerusakan) {
  // Langkah 2: Normalisasi Bobot
  const totalBobot = bobot.reduce((sum, w) => sum + w, 0);
  const bobotTernormalisasi = bobot.map((w) => w / totalBobot);

  // Langkah 3: Hitung Produk Bobot dan Skala Kepentingan
  const produkBobotSkala = bobotTernormalisasi.map((w) =>
    skalaKepentingan.map((sk) => w * sk)
  );

  // Langkah 4: Jumlahkan Hasil Produk
  const totalProduk = produkBobotSkala.map((produk) =>
    produk.reduce((sum, value) => sum + value, 0)
  );

  // Langkah 5: Tentukan Skala Kerusakan
  const hasilSkalaKerusakan = totalProduk.map(
    (produk) => skalaKerusakan[produk - 1]
  );

  return hasilSkalaKerusakan;
}

async function createPDF() {
  const content = fs.readFileSync(
    path.join(__dirname, "..", "public", "sip_template.html"),
    "utf-8"
  );

  const template = handlebars.compile(content);
  const html = template({
    fullname: "Sample Nama",
    nip: "-",
    jabatan:
      "PPNPN pada Bagian Umum dan BMN Sekretariat Direktorat Jenderal Pendidikan Islam",
    alamatKantor: "alamat kantor",
    merk: "ASUS",
    tipe: "ASUS ROG Strix Scar",
    nup: "924",
    jenisbarang: "Laptop",
    tempat: "Jakarta",
    tanggal: "22 Desember 2022",
    accname: "Nama Approval",
    accnip: "198237123124",
    reqname: "Nama yang Mengajukan",
    reqnip: "12312313212",
  });
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, {
    waitUntil: ["domcontentloaded", "load", "networkidle0"],
  });
  const buffer = await page.pdf({
    format: "A4",
    margin: {
      bottom: "0px",
      top: "0px",
      right: "0px",
      left: "0px",
    },
  });
  await browser.close();
  return buffer;
}

module.exports = {
  getStatusPenggunaan,
  phoneNumberFormatter,
  checkAuthentication,
  checkAuthenticationAdmin,
  checkKendaraan,
  getLabels,
  getAdmin,
  labelKerusakan,
  getPecentage,
  getKondisi,
  getKondisiLaporan,
  getAge,
  convertDateString,
  weightedProduct,
  createPDF,
};
