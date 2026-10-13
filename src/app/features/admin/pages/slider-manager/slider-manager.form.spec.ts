import { describe, expect, it } from 'vitest';
import { BannerForm, cuerpoDeBanner, validarBanner } from './slider-manager.form';

const VACIO: BannerForm = { titulo: '', subtitulo: '', imagenUrl: '', link: '', orden: 0, activo: true };
const CON_URL: BannerForm = { ...VACIO, titulo: 'Verano', imagenUrl: 'https://cdn/banner.webp' };

describe('validarBanner', () => {
    it('título y URL presentes: válido', () => {
        expect(validarBanner(CON_URL, false)).toBeNull();
    });

    it('título presente y archivo elegido sin URL: válido (la imagen sube después)', () => {
        expect(validarBanner({ ...VACIO, titulo: 'Verano' }, true)).toBeNull();
    });

    it('sin título no se guarda, aunque haya imagen', () => {
        expect(validarBanner({ ...CON_URL, titulo: '' }, true)).toBe('El título es obligatorio.');
    });

    it('un título de puros espacios no cuenta como título', () => {
        expect(validarBanner({ ...CON_URL, titulo: '   ' }, false)).toBe('El título es obligatorio.');
    });

    it('sin archivo y sin URL pide una de las dos', () => {
        expect(validarBanner({ ...VACIO, titulo: 'Verano' }, false))
            .toBe('Seleccioná una imagen o ingresá una URL.');
    });

    it('una URL de puros espacios no cuenta como URL', () => {
        expect(validarBanner({ ...VACIO, titulo: 'Verano', imagenUrl: '  ' }, false))
            .toBe('Seleccioná una imagen o ingresá una URL.');
    });

    it('el título se valida antes que la imagen (un solo mensaje por vez)', () => {
        expect(validarBanner(VACIO, false)).toBe('El título es obligatorio.');
    });
});

describe('cuerpoDeBanner', () => {
    it('con URL la conserva y arrastra el resto de campos', () => {
        expect(cuerpoDeBanner({ ...CON_URL, subtitulo: 'sub', link: '/ofertas', orden: 3, activo: false })).toEqual({
            titulo: 'Verano', subtitulo: 'sub', imagenUrl: 'https://cdn/banner.webp',
            link: '/ofertas', orden: 3, activo: false,
        });
    });

    it('sin URL manda null, no la cadena vacía', () => {
        expect(cuerpoDeBanner({ ...VACIO, titulo: 'Verano' }).imagenUrl).toBeNull();
    });

    it('no muta el formulario de origen', () => {
        const f = { ...CON_URL };
        cuerpoDeBanner(f);
        expect(f.imagenUrl).toBe('https://cdn/banner.webp');
    });

    it('orden 0 y activo false sobreviven (no los pisa ningún default)', () => {
        const cuerpo = cuerpoDeBanner({ ...CON_URL, orden: 0, activo: false });
        expect(cuerpo.orden).toBe(0);
        expect(cuerpo.activo).toBe(false);
    });
});
