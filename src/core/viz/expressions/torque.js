import BaseExpression from './base';
import { implicitCast, DEFAULT, clamp } from './utils';
import { div, mod, now, linear, globalMin, globalMax } from '../functions';
import Property from './property';

const DEFAULT_FADE = 0.15;

/**
 * Create a FadeIn/FadeOut configuration. See `torque` for more details.
 *
 * @param {carto.expressions.Base|number} param1 - Expression of type number or Number
 * @param {carto.expressions.Base|number} param2 - Expression of type number or Number
 * @return {carto.expressions.Base}
 *
 * @example <caption>Fade in of 0.1 seconds, fade out of 0.3 seconds.</caption>
 * const s = carto.expressions;
 * const viz = new carto.Viz({
 *   filter: s.torque(s.prop('day'), 40, s.fade(0.1, 0.3))
 * });
 *
 * @example <caption>Fade in of 0.1 seconds, fade out of 0.3 seconds. (String)</caption>
 * const viz = new carto.Viz(`
 *   filter: torque($day, 40, fade(0.1, 0.3))
 * `);
 *
 * @example<caption>Fade in and fade out of 0.5 seconds.</caption>
 * const s = carto.expressions;
 * const viz = new carto.Viz({
 *   filter: s.torque(s.prop('day'), 40, s.fade(0.5))
 * });
 *
 * @example<caption>Fade in and fade out of 0.5 seconds. (String)</caption>
 * const viz = new carto.Viz(`
 *   filter: torque($day, 40, fade(0.5))
 * `);
 *
 * @memberof carto.expressions
 * @name fade
 * @function
 * @api
*/
export class Fade extends BaseExpression {
    constructor(param1 = DEFAULT, param2 = DEFAULT) {
        let fadeIn = param1;
        let fadeOut = param2;
        if (param1 == DEFAULT) {
            fadeIn = DEFAULT_FADE;
        }
        if (param2 == DEFAULT) {
            fadeOut = fadeIn;
        }
        fadeIn = implicitCast(fadeIn);
        fadeOut = implicitCast(fadeOut);
        // TODO improve type check
        super({ fadeIn, fadeOut });
        this.type = 'fade';
        this.inlineMaker = (inline) => ({
            in: inline.fadeIn,
            out: inline.fadeOut,
        });
    }
}

/**
 * Create an animated temporal filter (torque).
 *
 * @param {carto.expressions.Base} input input to base the temporal filter,
 * if input is a property, the beginning and end of the animation will be determined by the minimum and maximum timestamps of the property on the dataset,
 * this can be problematic if outliers are present. Otherwise input must be a number expression in which 0 means beginning of the animation and 1 means end.
 *
 * It can be combined with linear and time expressions.
 * @param {Number} duration duration of the animation in seconds, optional, defaults to 10 seconds
 * @param {carto.expressions.Base} fade fadeIn/fadeOut configuration, optional, defaults to 0.15 seconds of fadeIn and 0.15 seconds of fadeOut
 * @return {carto.expressions.Torque}
 *
 * @example <caption>Temporal map by $day (of numeric type), with a duration of 40 seconds, fadeIn of 0.1 seconds and fadeOut of 0.3 seconds. (String)</caption>
 * const viz = new carto.Viz(`
 *   width: 2
 *   color: ramp(linear(clusterAvg($temp), 0,30), tealrose)
 *   filter: torque($day, 40, fade(0.1, 0.3))
 * `);
 *
 * @example <caption>Temporal map by $date (of date type), with a duration of 40 seconds, fadeIn of 0.1 seconds and fadeOut of 0.3 seconds. (String)</caption>
 * const viz = new carto.Viz(`
 *   width: 2
 *   color: ramp(linear(clusterAvg($temp), 0,30), tealrose)
 *   filter: torque(linear($date, time('2022-03-09T00:00:00Z'), time('2033-08-12T00:00:00Z')), 40, fade(0.1, 0.3))
 * `);
 *
 * @example <caption>Using the `getSimTime` method to get the simulated time.</caption>
 * const s = carto.expressions;
 * let torqueExpr = s.torque(s.linear(s.prop('saledate'), 1991, 2017), 20, s.fade(0.7, 0.4));
 * const torqueStyle = {
 *   color: s.ramp(s.linear(s.prop('priceperunit'), 2000, 1010000), [s.rgb(0, 255, 0), s.rgb(255, 0, 0)]),
 *   width: s.mul(s.sqrt(s.prop('priceperunit')), 0.05),
 *   filter: torqueExpr
 * };
 * layer.on('updated', () => {
 *   let currTime = Math.floor(torqueExpr.getSimTime());
 *   document.getElementById('timestamp').innerHTML = currTime;
 * });
 *
 * @memberof carto.expressions
 * @name torque
 * @function
 * @api
*/
/**
 * Torque class
 *
 * This class is instanced automatically by using the `torque` function. It is documented for its methods.
 *
 * @memberof carto.expressions
 * @name Torque
 * @abstract
 * @hideconstructor
 * @class
 * @api
 */
export class Torque extends BaseExpression {
    constructor(input, duration = 10, fade = new Fade()) {
        if (!Number.isFinite(duration)) {
            throw new Error('Torque(): invalid second parameter, duration.');
        }
        if (input instanceof Property) {
            input = linear(input, globalMin(input), globalMax(input));
        }
        const _cycle = div(mod(now(), duration), duration);
        super({ input, _cycle, fade });
        // TODO improve type check
        this.duration = duration;
    }
    eval(feature) {
        const input = this.input.eval(feature);
        const cycle = this._cycle.eval(feature);
        const duration = this.duration;
        const fadeIn = this.fade.fadeIn.eval(feature);
        const fadeOut = this.fade.fadeOut.eval(feature);
        return 1 - clamp(Math.abs(input - cycle) * duration / (input > cycle ? fadeIn : fadeOut), 0, 1);
    }
    /**
     * Get the current time stamp of the simulation
     *
     * @api
     * @returns {Number|Date} Current time stamp of the simulation, if the simulation is based on a numeric expression this will output a number, if it is based on a date expression it will output a date
     * @memberof carto.expressions.Torque
     * @instance
     * @name getSimTime
     */
    getSimTime() {
        const c = this._cycle.eval(); //from 0 to 1

        const min = this.input.min.eval();
        const max = this.input.max.eval();

        if (!(this.input.min.eval() instanceof Date)) {
            return min + c * (max - min);
        }


        const tmin = min.getTime();
        const tmax = max.getTime();
        const m = c;
        const tmix = tmax * m + (1 - m) * tmin;

        const date = new Date();
        date.setTime(tmix);
        return date;

    }
    _compile(meta) {
        super._compile(meta);
        if (this.input.type != 'number') {
            throw new Error('Torque(): invalid first parameter, input.');
        } else if (this.fade.type != 'fade') {
            throw new Error('Torque(): invalid third parameter, fade.');
        }
        this.type = 'number';

        this.inlineMaker = (inline) =>
            `(1.- clamp(abs(${inline.input}-${inline._cycle})*(${this.duration.toFixed(20)})/(${inline.input}>${inline._cycle}? ${inline.fade.in}: ${inline.fade.out}), 0.,1.) )`;
    }
}
