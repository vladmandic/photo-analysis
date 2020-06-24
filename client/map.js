/* global L */

// eslint-disable-next-line no-unused-vars
const config = require('./config.js').default;
const db = require('./indexdb.js');
const log = require('./log.js');
const nearest = require('./nearest.js');
const gallery = require('./gallery.js');

let mapContainer;

async function find(lat, lon) {
  // get data
  let all;
  const sort = window.options.listSortOrder;
  if (sort.includes('alpha-down')) all = await db.all('name', true);
  else if (sort.includes('alpha-up')) all = await db.all('name', false);
  else if (sort.includes('numeric-down')) all = await db.all('date', false);
  else if (sort.includes('numeric-up')) all = await db.all('date', true);
  else if (sort.includes('amount-down')) all = await db.all('size', false);
  else if (sort.includes('amount-up')) all = await db.all('size', true);
  else all = db.all();
  // const all = await db.all();
  const points = all
    .filter((a) => (a.exif && a.exif.lat && a.exif.lon))
    .map((a) => ({ lat: a.exif.lat, lon: a.exif.lon }));
  const count = Math.trunc(11 - mapContainer._zoom / 2);
  const coord = nearest.find(points, lat, lon, count);
  window.filtered = all.filter((a) => {
    for (let i = 0; i < count; i++) {
      if (a.exif && a.exif.lat && a.exif.lon && a.exif.lat === coord[i].lat && a.exif.lon === coord[i].lon) return true;
    }
    return false;
  });
  if (window.debug) log.result(`Map search: ${lat} ${lon} Found: ${coord[0].lat} ${coord[0].lon} Images: ${window.filtered.length} Level: ${count}`);
  gallery.redraw();
}

async function show(visible) {
  if (window.debug) log.result(`Map show: ${visible}`);
  if (!visible && mapContainer) {
    mapContainer.off();
    mapContainer.remove();
    $('#map').toggle(false);
    return;
  }
  $('#map').toggle('slow');
  $('#map').width($('#main').width() - $('#folderbar').width());
  $('#map').height(0.4 * $('#main').height());
  if ($('#map').css('display') === 'none') return;
  // $('#results').html('<div id="map" style="width: 100%; height: 100%;"></div>');
  if (mapContainer) {
    mapContainer.off();
    mapContainer.remove();
  }
  L.mapquest.key = 'lYrP4vF3Uk5zgTiGGuEzQGwGIVDGuy24';
  mapContainer = L.mapquest.map('map', {
    center: [25.7632076, -80.1927073],
    layers: L.mapquest.tileLayer(window.options.mapColor),
    zoom: 3,
  });
  mapContainer.on('click', (evt) => {
    find(evt.latlng.lat, evt.latlng.lng);
  });
  L.mapquest.geocodingControl().addTo(mapContainer);
  $('.leaflet-bottom.leaflet-left').html(''); // hide branding
  $('.leaflet-bottom.leaflet-right').html(''); // hide branding
  const points = window.filtered
    .filter((a) => (a.exif && a.exif.lat && a.exif.lon))
    .map((a) => [a.exif.lat, a.exif.lon, 0.1]);
  const heat = { maxZoom: 15, max: 1.0, radius: 25, blur: 15, minOpacity: 0.3 };
  L.heatLayer(points, heat).addTo(mapContainer);
  if (window.debug) log.result(`Map added ${points.length} points`);
}

exports.show = show;

// https://developer.mapquest.com/documentation/mapquest-js/v1.3/