const fs = require('fs');
const path = require('path');
const papa = require('papaparse');

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
    complete: function() {
      const kendaraan =data.filter(kendaraan => !kendaraan.namaBarang.includes('Sepeda Motor'));
      //TODO: masukkan fungsi input ke database
      console.log(kendaraan);
    }
  });
}

function init() {
  initKendaraan();
}

init();