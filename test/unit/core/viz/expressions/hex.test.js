import { validateStaticType, validateStaticTypeErrors } from './utils';
import { hex } from '../../../../../src/core/viz/functions';

describe('src/core/viz/expressions/hex', () => {
    describe('error control', () => {
        validateStaticTypeErrors('hex', []);
        validateStaticTypeErrors('hex', ['number']);
        validateStaticTypeErrors('hex', ['category']);
        validateStaticTypeErrors('hex', ['#Z08080']);
    });

    describe('type', () => {
        validateStaticType('hex', ['#808080'], 'color');
        validateStaticType('hex', ['#AAA'], 'color');
    });

    describe('eval', () => {
        it('should work with #FFF forms', () => {
            expect(hex('#FFF').eval()).toEqual({ r: 255, g: 255, b: 255, a: 1 });
        });
        it('should work with #FFF0 forms', () => {
            expect(hex('#FFF0').eval()).toEqual({ r: 255, g: 255, b: 255, a: 0 });
            expect(hex('#FFFF').eval()).toEqual({ r: 255, g: 255, b: 255, a: 1 });
        });
        it('should work with #FFFFFF forms', () => {
            expect(hex('#FFFFFF').eval()).toEqual({ r: 255, g: 255, b: 255, a: 1 });
        });
        it('should work with #FFFFFF00 forms', () => {
            expect(hex('#FFFFFF00').eval()).toEqual({ r: 255, g: 255, b: 255, a: 0 });
            expect(hex('#FFFFFFFF').eval()).toEqual({ r: 255, g: 255, b: 255, a: 1 });
        });
    });
});
