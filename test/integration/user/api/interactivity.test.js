import * as carto from '../../../../src/';
import mapboxgl from '../../../../vendor/mapbox-gl-dev';

describe('Interactivity', () => {
    let div, source, style, layer, map;
    beforeEach(() => {
        const setup = _setup('map');
        div = setup.div;
        map = setup.map;

        source = new carto.source.GeoJSON(geojson);
        style = new carto.Style('color: rgba(1, 0, 0, 1)');
        layer = new carto.Layer('layer', source, style);
    });
    describe('When the user creates a new Interactivity object', () => {


        it('should throw an error when some layer is not attached to a map', () => {
            expect(() => new carto.Interactivity([layer])).toThrowError(/.*map.*/);
        });

        it('should throw an error when layers belong to different maps', done => {
            let loadedLayers = 0;
            const setup = _setup('map1');
            const div2 = setup.div;
            const map2 = setup.map;
            const source2 = new carto.source.GeoJSON(geojson);
            const style2 = new carto.Style('color: rgba(1, 0, 0, 1)');
            const layer2 = new carto.Layer('layer2', source2, style2);

            layer.on('loaded', _testHelper);
            layer2.on('loaded', _testHelper);

            layer.addTo(map);
            layer2.addTo(map2);

            // Create the interactivity object when both layers were added to a map.
            // this only happens when loadedLayers equals to 2.
            function _testHelper() {
                loadedLayers++;
                if (loadedLayers === 2) {
                    expect(() => new carto.Interactivity([layer, layer2])).toThrowError(/all layers must belong to the same map/);
                    document.body.removeChild(div2);
                    done();
                }
            }
        }, 10000);
    });

    describe('.on', () => {
        let interactivity;
        it('should throw an error when suscribing to an invalid event', done => {
            layer.on('loaded', () => {
                interactivity = new carto.Interactivity([layer]);
                expect(() => { interactivity.on('invalidEventName'); }).toThrowError(/Unrecognized event/);
                done();
            });
            layer.addTo(map);
        });
    });

    describe('.off', () => {
        let interactivity;
        it('should throw an error when suscribing to an invalid event', done => {
            layer.on('loaded', () => {
                interactivity = new carto.Interactivity([layer]);
                expect(() => { interactivity.off('invalidEventName'); }).toThrowError(/Unrecognized event/);
                done();
            });
            layer.addTo(map);
        });
    });

    afterEach(() => {
        document.body.removeChild(div);
    });
});

function _setup(name) {
    const div = document.createElement('div');
    div.id = name;
    div.style.width = '100px';
    div.style.height = '100px';
    document.body.appendChild(div);

    const map = new mapboxgl.Map({
        container: name,
        style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
        center: [0, 30],
        zoom: 2
    });

    return { div, map };
}

const geojson = {
    'type': 'Feature',
    'geometry': {
        'type': 'Point',
        'coordinates': [0, 0]
    },
    'properties': {
        'cartodb_id': 1
    }
};