const map = new carto.Map({
    container: 'map',
    background: 'black'
});

const source = new carto.source.GeoJSON(sources['point']);
const viz = new carto.Viz();
const layer = new carto.Layer('layer', source, viz);

layer.addTo(map);
