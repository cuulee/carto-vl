import BaseExpression from './base';

/**
 * Get the top `n` properties.
 *
 * @param {carto.expressions.Base} property - Column of the table
 * @param {number} n - Number of top properties to be returned
 * @return {carto.expressions.Base}
 *
 * @example <caption>Use top 3 categories to define a color ramp.</caption>
 * const s = carto.expressions;
 * const viz = new carto.Viz({
 *   color: s.ramp(s.top(s.prop('category'), 3), s.palettes.VIVID)
 * });
 *
 * @example <caption>Use top 3 categories to define a color ramp. (String)</caption>
 * const viz = new carto.Viz(`
 *   color: ramp(top($category, 3), VIVID)
 * `);
 *
 * @memberof carto.expressions
 * @name top
 * @function
 * @api
 */
export default class Top extends BaseExpression {
    constructor(property, buckets) {
        // TODO 'cat'
        super({ property, buckets });
        // TODO improve type check
    }
    eval(feature) {
        const p = this.property.eval(feature);
        const buckets = Math.round(this.buckets.eval());
        const metaColumn = this._meta.columns.find(c => c.name == this.property.name);
        let ret;
        metaColumn.categoryNames.map((name, i) => {
            if (i == p) {
                ret = i < buckets ? i + 1 : 0;
            }
        });
        return ret;
    }
    _compile(metadata) {
        super._compile(metadata);
        if (this.property.type != 'category') {
            throw new Error(`top() first argument must be of type category, but it is of type '${this.property.type}'`);
        }
        this.type = 'category';
        this.othersBucket = true;
        this._meta = metadata;
        this._textureBuckets = null;
    }
    get numCategories() {
        return Math.round(this.buckets.eval()) + 1;
    }
    _applyToShaderSource(getGLSLforProperty) {
        const property = this.property._applyToShaderSource(getGLSLforProperty);
        return {
            preface: this._prefaceCode(property.preface + `uniform sampler2D topMap${this._uid};\n`),
            inline: `(255.*texture2D(topMap${this._uid}, vec2(${property.inline}/1024., 0.5)).a)`
        };
    }
    _postShaderCompile(program, gl) {
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        this.property._postShaderCompile(program);
        this._getBinding(program)._texLoc = gl.getUniformLocation(program, `topMap${this._uid}`);
    }
    _preDraw(program, drawMetadata, gl) {
        let buckets = Math.round(this.buckets.eval());
        if (buckets > this.property.numCategories) {
            buckets = this.property.numCategories;
        }
        if (this._textureBuckets !== buckets) {
            this._textureBuckets = buckets;
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            const width = 1024;
            let pixels = new Uint8Array(4 * width);
            const metaColumn = this._meta.columns.find(c => c.name == this.property.name);
            metaColumn.categoryNames.map((name, i) => {
                if (i < buckets) {
                    pixels[4 * this._meta.categoryIDs[name] + 3] = (i + 1);
                }
            });
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);            
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
                width, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                pixels);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        }
        this.property._preDraw(program, drawMetadata);
        gl.activeTexture(gl.TEXTURE0 + drawMetadata.freeTexUnit);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(this._getBinding(program)._texLoc, drawMetadata.freeTexUnit);
        drawMetadata.freeTexUnit++;
    }
    //TODO _free
}
