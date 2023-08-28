/* eslint-disable no-unused-vars */
const fs = require('fs');
const path = require('path');
const papa = require('papaparse');
const db = require('../../src/db');

function toCamelCase(str) {
  var words = str.split(/[\s/]+/);
  if (words.length === 1) {
    return words[0].toLowerCase();
  }
  for (var i = 1; i < words.length; i++) {
    words[i] = words[i].charAt(0).toUpperCase() + words[i].slice(1).toLowerCase();
  }
  return words.join('').replace(/^(.)/, function(match) {
    return match.toLowerCase();
  });
}

function initKendaraan() {
  // const url = 'https://raw.githubusercontent.com/AkhdanFirdaus/bmn-model/main/dataset/raw_master_kendaraan.csv';
  const data = [];
  const location = path.resolve(__dirname, 'dataset/raw_master_kendaraan.csv');
  const file = fs.createReadStream(location);
  papa.parse(file, {
    header: true,
    delimiter: ',',
    step: function (results) {
      const kendaraan = results.data;
      const keys = Object.keys(kendaraan);
      const newKeys = keys.map(key => toCamelCase(key));
      const newKendaraan = {};
      for (let i = 0; i < newKeys.length; i++) {
        const key = newKeys[i];
        newKendaraan[key] = kendaraan[keys[i]];
      }
      data.push(newKendaraan);
    },
    complete: async function() {
      const kendaraan = data.filter(kendaraan => !kendaraan.namaBarang.includes('Sepeda Motor'));
      //TODO: masukkan fungsi input ke database
      for (const data of kendaraan) {
        await db.kendaraan.create({
          data: {
            kodeSatker: data.kodeSatker,
            namaSatker: data.namaSatker,
            kodeBarang: data.kodeBarang,
            namaBarang: data.namaBarang,
            nup: parseInt(data.nup),
            kondisi: data.kondisi === 'Baik' ? 1 : 0,
            merk: data.merkTipe,
            tglRekamPertama: data.tglRekamPertama,
            tglPerolehan: data.tglPerolehan,
            nilaiPerolehanPertama: data.nilaiPerolehanPertama ? parseInt(data.nilaiPerolehanPertama) : 0,
            nilaiMutasi: data.nilaiMutasi ? parseInt(data.nilaiMutasi) : 0,
            nilaiPerolehan: data.nilaiPerolehan ? parseInt(data.nilaiPerolehan) : 0,
            nilaiPenyusutan: data.nilaiPenyusutan ? parseInt(data.nilaiPenyusutan) : 0,
            nilaiBuku: data.nilaiBuku ? parseInt(data.nilaiBuku) : 0,
            kuantitas: data.kuantitas ? parseInt(data.kuantitas) : 1,
            jmlFoto: data.jmlFoto ? parseInt(data.jmlFoto) : 0,
            // 0 digunakan dinas operasional, 1 digunakan dinas jabatan
            statusPenggunaan: data === 'Digunakan sendiri untuk operasional' ? 0 : 1,
            statusPengelolaan: data.statusPengelolaan,
            noPsp: data.noPsp,
            tglPsp: data.tglPsp,
            noBpkb: data.nOBpkb,
            noPolisi: data.nOPolisi,
            pemakai: data.pemakai,
            jumlahKib: data.jumlahKib ? parseInt(data.jumlahKib) : 0,
          },
        });
      }
    }
  });
}

function initLabel() {
  const data = [];
  const location = path.resolve(__dirname, 'dataset/data_label.csv');
  const file = fs.createReadStream(location);
  papa.parse(file, {
    header: true,
    delimiter: ',',
    step: function (results) {
      const label = results.data;
      data.push(label);
    },
    complete: async function() {
      for (const lbl of data) {
        const available = await db.label.findFirst({
          where: {
            indeks: parseInt(lbl.indeks),
          }
        });

        if (available) {
          await db.label.update({
            where: {
              id: available.id
            },
            data: {
              label: lbl.kerusakan,
              bobot: parseInt(lbl.bobot),
              indeks: parseInt(lbl.indeks),
              maxBiaya: parseFloat(lbl.maxBiaya),
              minBiaya: parseFloat(lbl.minBiaya),
              rataRataBiaya: parseFloat(lbl.rataRataBiaya),
            },
          });
        } else {
          await db.label.create({
            data: {
              label: lbl.kerusakan,
              bobot: parseInt(lbl.bobot),
              indeks: parseInt(lbl.indeks),
              maxBiaya: parseFloat(lbl.maxBiaya),
              minBiaya: parseFloat(lbl.minBiaya),
              rataRataBiaya: parseFloat(lbl.rataRataBiaya),
            },
          });

        }
      }
    }
  });
}

function init() {
  // initKendaraan();
  initLabel();
}

init();