import ShaderCache from '../../../../src/core/shaders/shader-cache';

describe('src/core/shaders/shader-cache', () => {
    let shaderCache;
    beforeEach(() => {
        shaderCache = new ShaderCache();
    });

    describe('has', () => {
        it('should return false when not in webgl context and code is different', () => {
            const fakeWebGLContext = jasmine.createSpy();
            const code = 'fake_shader_code';

            expect(shaderCache.has(fakeWebGLContext, code)).toEqual(false);
        });

        it('should return false when not in webgl context and code is the same different', () => {
            const fakeWebGLContext0 = jasmine.createSpy();
            const fakeWebGLContext1 = jasmine.createSpy();
            const fakeShaderCode = 'fake_shader_code';
            const fakeShader = jasmine.createSpy();
            shaderCache.set(fakeWebGLContext0, fakeShaderCode, fakeShader);

            expect(shaderCache.has(fakeWebGLContext1, fakeShaderCode)).toEqual(false);
        });

        it('should return true when same webgl context and code is the same different', () => {
            const fakeWebGLContext0 = jasmine.createSpy();
            const fakeShaderCode = 'fake_shader_code';
            const fakeShader = jasmine.createSpy();
            shaderCache.set(fakeWebGLContext0, fakeShaderCode, fakeShader);

            expect(shaderCache.has(fakeWebGLContext0, fakeShaderCode)).toEqual(true);
        });

    });
    
    describe('get', () => {
        it('should return a previous stored shader', () => {
            const fakeWebGLContext0 = jasmine.createSpy();
            const fakeShaderCode = 'fake_shader_code';
            const fakeShader = jasmine.createSpy();
            shaderCache.set(fakeWebGLContext0, fakeShaderCode, fakeShader);

            expect(shaderCache.get(fakeWebGLContext0, fakeShaderCode)).toEqual(fakeShader);
        });

        it('should return null when shader is not stored (different webgl context)', () => {
            const fakeWebGLContext0 = jasmine.createSpy();
            const fakeWebGLContext1 = jasmine.createSpy();
            const fakeShaderCode = 'fake_shader_fakeShaderCode_0';
            const fakeShader = jasmine.createSpy();
            shaderCache.set(fakeWebGLContext0, fakeShaderCode, fakeShader);

            expect(shaderCache.get(fakeWebGLContext1, fakeShaderCode)).toBeUndefined();
        });

        it('should return null when shader is not stored (different code)', () => {
            const fakeWebGLContext0 = jasmine.createSpy();
            const fakeShaderCode0 = 'fake_shader_fakeShaderCode_0';
            const fakeShaderCode1 = 'fake_shader_fakeShaderCode_1';
            const fakeShader = jasmine.createSpy();
            
            shaderCache.set(fakeWebGLContext0, fakeShaderCode0, fakeShader);

            expect(shaderCache.get(fakeWebGLContext0, fakeShaderCode1)).toBeUndefined();
        });
    });
});
