import mitt from 'mitt';
import * as util from './util';
import SourceBase from './source/base';
import Viz from './viz';
import CartoMap from './map';
import getCMIntegrator from './integrator/carto';
import getMGLIntegrator from './integrator/mapbox-gl';
import CartoValidationError from './error-handling/carto-validation-error';
import { cubic } from '../core/viz/functions';
import RenderLayer from '../core/renderLayer';

export default class Layer {
    /**
    *
    * A Layer is the primary way to visualize geospatial data.
    *
    * To create a layer a {@link carto.source.Base|source} and {@link carto.Viz|viz} are required:
    *
    * - The {@link carto.source.Base|source} is used to know **what** data will be displayed in the Layer.
    * - The {@link carto.Viz|viz} is used to know **how** to draw the data in the Layer.
    *
    * @param {string} id - The ID of the layer. Can be used in the {@link addTo|addTo} function
    * @param {carto.source.Base} source - The source of the data
    * @param {carto.Viz} viz - The description of the visualization of the data
    *
    * @example
    * const layer = new carto.Layer('layer0', source, viz);
    *
    * @fires CartoError
    *
    * @constructor Layer
    * @memberof carto
    * @api
    */
    constructor(id, source, viz) {
        this._checkId(id);
        this._checkSource(source);
        this._checkViz(viz);

        this._init(id, source, viz);
    }

    _init(id, source, viz) {
        viz._boundLayer = this;
        this.state = 'init';
        this._id = id;

        this._emitter = mitt();
        this._lastViewport = null;
        this._lastMNS = null;
        this._integrator = null;
        this.metadata = null;
        this._renderLayer = new RenderLayer();
        this.state = 'init';
        this.isLoaded = false;

        this._source = source;
        this._viz = viz;

        this.update(source, viz);
    }

    /**
     * Register an event handler for the given type.
     *
     * @param {string} eventName - Type of event to listen for
     * @param {function} callback - Function to call in response to given event
     * @memberof carto.Layer
     * @instance
     * @api
     */
    on(eventName, callback) {
        return this._emitter.on(eventName, callback);
    }

    /**
     * Remove an event handler for the given type.
     *
     * @param {string} eventName - Type of event to unregister
     * @param {function} callback - Handler function to unregister
     * @memberof carto.Layer
     * @instance
     * @api
     */
    off(eventName, callback) {
        return this._emitter.off(eventName, callback);
    }

    /**
     * Add this layer to a map.
     *
     * @param {mapboxgl.Map} map - The map on which to add the layer
     * @param {string?} beforeLayerID - The ID of an existing layer to insert the new layer before. If this values is not passed the layer will be added on the top of the existing layers.
     * @memberof carto.Layer
     * @instance
     * @api
     */
    addTo(map, beforeLayerID) {
        if (this._isCartoMap(map)) {
            this._addToCartoMap(map, beforeLayerID);
        } else if (this._isMGLMap(map)) {
            this._addToMGLMap(map, beforeLayerID);
        } else {
            throw new CartoValidationError('layer', 'nonValidMap');
        }
    }

    async update(source, viz) {
        this._checkSource(source);
        this._checkViz(viz);
        if (!this._renderLayer.getRenderer()) {
            return;
        }
        source = source._clone();
        this._atomicChangeUID = this._atomicChangeUID + 1 || 1;
        const uid = this._atomicChangeUID;
        const metadata = await source.requestMetadata(style);

        if (this._atomicChangeUID > uid) {
            throw new Error('Another atomic change was done before this one committed');
        }

        // Everything was ok => commit changes
        this.metadata = metadata;

        source.bindLayer(this._onDataframeAdded.bind(this), this._onDataFrameRemoved.bind(this), this._onDataLoaded.bind(this));
        if (this._source !== source) {
            this._freeSource();
        }
        this._source = source;
        this.requestData();

        if (this._viz) {
            this._viz.onChange(null);
        }
        this._viz = viz;
        viz.onChange(this._vizChanged.bind(this));
        this._compileShaders(viz, metadata);
    }

    /**
     * Blend the current viz with another viz.
     *
     * This allows smooth transforms between two different vizs.
     *
     * @example <caption> Smooth transition variating point size </caption>
     * // We create two different vizs varying the width
     * const viz0 = new carto.Viz({ width: 10 });
     * const viz1 = new carto.Viz({ width: 20 });
     * // Create a layer with the first viz
     * const layer = new carto.Layer('layer', source, viz0);
     * // We add the layer to the map, the points in this layer will have widh 10
     * layer.addTo(map, 'layer0');
     * // The points will be animated from 10px to 20px for 500ms.
     * layer.blendToViz(viz1, 500);
     *
     * @param {carto.Viz} viz - The final viz
     * @param {number} [duration=400] - The animation duration in milliseconds
     *
     * @memberof carto.Layer
     * @instance
     * @api
     */
    blendToViz(viz, ms = 400, interpolator = cubic) {
        this._checkViz(viz);
        if (this._viz) {
            viz.getColor()._blendFrom(this._viz.getColor(), ms, interpolator);
            viz.getStrokeColor()._blendFrom(this._viz.getStrokeColor(), ms, interpolator);
            viz.getWidth()._blendFrom(this._viz.getWidth(), ms, interpolator);
            viz.getStrokeWidth()._blendFrom(this._viz.getStrokeWidth(), ms, interpolator);
            viz.getFilter()._blendFrom(this._viz.getFilter(), ms, interpolator);
        }

        this._vizChanged(viz).then(() => {
            if (this._viz) {
                this._viz.onChange(null);
            }
            this._viz = viz;
            this._viz.onChange(this._vizChanged.bind(this));
        });
    }

    setRenderer(renderer) {
        this._renderLayer.setRenderer(renderer);
        this.update(this._source, this._viz);
    }

    async requestMetadata(viz) {
        viz = viz || this._viz;
        if (!viz) {
            return;
        }
        return this._source.requestMetadata(viz);
    }

    async requestData() {
        if (!this.metadata) {
            return;
        }
        this._source.requestData(this._getViewport());
    }

    hasDataframes() {
        return this._renderLayer.hasDataframes();
    }

    getId() {
        return this._id;
    }

    getSource() {
        return this._source;
    }

    getViz() {
        return this._viz;
    }

    getNumFeatures() {
        return this._renderLayer.getNumFeatures();
    }

    getIntegrator() {
        return this._integrator;
    }

    getFeaturesAtPosition(pos) {
        return this._renderLayer.getFeaturesAtPosition(pos).map(this._addLayerIdToFeature.bind(this));
    }

    $paintCallback() {
        if (this._viz && this._viz.colorShader) {
            this._renderLayer.viz = this._viz;
            this._integrator.renderer.renderLayer(this._renderLayer);
        }
        if (!this.isLoaded && this.state == 'dataLoaded') {
            this._fire('loaded');
            this.isLoaded = true;
        }
    }

    _fire(eventType, eventData) {
        return this._emitter.emit(eventType, eventData);
    }

    /**
     * Callback executed when the client adds a new dataframe
     * @param {Dataframe} dataframe
     */
    _onDataframeAdded(dataframe) {
        this._renderLayer.addDataframe(dataframe);
        this._integrator.invalidateWebGLState();
        this._integrator.needRefresh();
    }

    /**
     * Callback executed when the client removes dataframe
     * @param {Dataframe} dataframe
     */
    _onDataFrameRemoved(dataframe) {
        this._renderLayer.removeDataframe(dataframe);
        this._integrator.invalidateWebGLState();
        this._integrator.needRefresh();
    }

    /**
     * Callback executed when the client finishes loading data
     */
    _onDataLoaded() {
        this.state = 'dataLoaded';
        this._integrator.needRefresh();
    }

    _addLayerIdToFeature(feature) {
        feature.layerId = this._id;
        return feature;
    }

    _isCartoMap(map) {
        return map instanceof CartoMap;
    }

    _isMGLMap() {
        // TODO: implement this
        return true;
    }

    _addToCartoMap(map, beforeLayerID) {
        this._integrator = getCMIntegrator(map);
        this._integrator.addLayer(this, beforeLayerID);
    }

    _addToMGLMap(map, beforeLayerID) {
        if (map.isStyleLoaded()) {
            this._onMapLoaded(map, beforeLayerID);
        } else {
            map.on('load', () => {
                this._onMapLoaded(map, beforeLayerID);
            });
        }
    }

    _onMapLoaded(map, beforeLayerID) {
        this._integrator = getMGLIntegrator(map);
        this._integrator.addLayer(this, beforeLayerID);
    }

    _compileShaders(viz, metadata) {
        viz.compileShaders(this._integrator.renderer.gl, metadata);
    }

    async _vizChanged(viz) {
        if (!this._source) {
            throw new Error('A source is required before changing the viz');
        }
        const source = this._source;
        const metadata = await source.requestMetadata(viz);
        if (this._source !== source) {
            throw new Error('A source change was made before the metadata was retrieved, therefore, metadata is stale and it cannot be longer consumed');
        }
        this.metadata = metadata;
        this._compileShaders(viz, this.metadata);
        this._integrator.needRefresh();
        return this.requestData();
    }

    _checkId(id) {
        if (util.isUndefined(id)) {
            throw new CartoValidationError('layer', 'idRequired');
        }
        if (!util.isString(id)) {
            throw new CartoValidationError('layer', 'idStringRequired');
        }
        if (id === '') {
            throw new CartoValidationError('layer', 'nonValidId');
        }
    }

    _checkSource(source) {
        if (util.isUndefined(source)) {
            throw new CartoValidationError('layer', 'sourceRequired');
        }
        if (!(source instanceof SourceBase)) {
            throw new CartoValidationError('layer', 'nonValidSource');
        }
    }

    _checkViz(viz) {
        if (util.isUndefined(viz)) {
            throw new CartoValidationError('layer', 'vizRequired');
        }
        if (!(viz instanceof Viz)) {
            throw new CartoValidationError('layer', 'nonValidViz');
        }
        if (viz._boundLayer && viz._boundLayer !== this) {
            throw new CartoValidationError('layer', 'sharedViz');
        }
    }

    _getViewport() {
        if (this._integrator) {
            return this._integrator.renderer.getBounds();
        }
        throw new Error('?');
    }

    _freeSource() {
        if (this._source) {
            this._source.free();
        }
        this._renderLayer.freeDataframes();
    }
}
