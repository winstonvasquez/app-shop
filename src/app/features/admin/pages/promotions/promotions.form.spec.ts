import { describe, expect, it } from 'vitest';
import { FormControl, FormGroup } from '@angular/forms';
import {
    calcularEstadoPromocion, construirAsignacionRequest, construirPromocionRequest, resumenAsignacion, hoyLocalISO, parseFechaLocal,
    PromocionFormRaw, validadoresValor, validarRangoFechas,
} from './promotions.form';

const BASE: PromocionFormRaw = {
    nombre: 'Verano',
    descripcion: null,
    tipo: 'PORCENTAJE',
    valor: 10,
    alcance: 'CARRITO',
    productoId: null,
    categoriaId: null,
    montoMinimo: null,
    codigoCupon: null,
    limiteUsos: null,
    fechaInicio: '2026-01-01',
    fechaFin: '2026-03-31',
    activo: true,
};

describe('construirPromocionRequest', () => {
    it('alcance PRODUCTO conserva el producto y anula categoría y monto mínimo', () => {
        const dto = construirPromocionRequest({
            ...BASE, alcance: 'PRODUCTO', productoId: 55, categoriaId: 9, montoMinimo: 100,
        });
        expect(dto.productoId).toBe(55);
        expect(dto.categoriaId).toBeNull();
        expect(dto.montoMinimo).toBeNull();
    });

    it('alcance CATEGORIA conserva la categoría y anula producto y monto mínimo', () => {
        const dto = construirPromocionRequest({
            ...BASE, alcance: 'CATEGORIA', productoId: 55, categoriaId: 9, montoMinimo: 100,
        });
        expect(dto.categoriaId).toBe(9);
        expect(dto.productoId).toBeNull();
        expect(dto.montoMinimo).toBeNull();
    });

    it('alcance CARRITO conserva el monto mínimo y anula producto y categoría', () => {
        const dto = construirPromocionRequest({
            ...BASE, alcance: 'CARRITO', productoId: 55, categoriaId: 9, montoMinimo: 100,
        });
        expect(dto.montoMinimo).toBe(100);
        expect(dto.productoId).toBeNull();
        expect(dto.categoriaId).toBeNull();
    });

    it('el categoriaId del select llega como texto y se envía numérico', () => {
        const dto = construirPromocionRequest({ ...BASE, alcance: 'CATEGORIA', categoriaId: '12' });
        expect(dto.categoriaId).toBe(12);
    });

    it('alcance CATEGORIA sin categoría elegida manda null, no NaN', () => {
        const dto = construirPromocionRequest({ ...BASE, alcance: 'CATEGORIA', categoriaId: null });
        expect(dto.categoriaId).toBeNull();
    });

    it('descripción y cupón vacíos se omiten (undefined), no viajan como ""', () => {
        const dto = construirPromocionRequest({ ...BASE, descripcion: '', codigoCupon: '' });
        expect(dto.descripcion).toBeUndefined();
        expect(dto.codigoCupon).toBeUndefined();
    });

    it('sin límite de usos el campo se omite', () => {
        expect(construirPromocionRequest({ ...BASE, limiteUsos: null }).limiteUsos).toBeUndefined();
    });

    it('un límite de 0 usos NO se pisa: es un valor legítimo distinto de «sin límite»', () => {
        expect(construirPromocionRequest({ ...BASE, limiteUsos: 0 }).limiteUsos).toBe(0);
    });

    it('activo false se respeta; null cae al default true', () => {
        expect(construirPromocionRequest({ ...BASE, activo: false }).activo).toBe(false);
        expect(construirPromocionRequest({ ...BASE, activo: null }).activo).toBe(true);
    });

    it('nunca envía usosActuales ni estado: son derivados del backend', () => {
        const dto = construirPromocionRequest(BASE);
        expect('usosActuales' in dto).toBe(false);
        expect('estado' in dto).toBe(false);
    });

    it('un monto mínimo de 0 en CARRITO viaja tal cual', () => {
        expect(construirPromocionRequest({ ...BASE, alcance: 'CARRITO', montoMinimo: 0 }).montoMinimo).toBe(0);
    });
});

describe('código de cupón', () => {
    it('se normaliza a mayúsculas sin espacios (el backend busca en mayúsculas)', () => {
        expect(construirPromocionRequest({ ...BASE, codigoCupon: '  verano25 ' }).codigoCupon).toBe('VERANO25');
    });
    it('un cupón de sólo espacios se omite', () => {
        expect(construirPromocionRequest({ ...BASE, codigoCupon: '   ' }).codigoCupon).toBeUndefined();
    });
});

describe('validadoresValor', () => {
    const errores = (tipo: string, valor: number) => new FormControl(valor, validadoresValor(tipo)).errors;
    it('rechaza 0 en cualquier tipo', () => {
        expect(errores('MONTO_FIJO', 0)).toHaveProperty('min');
        expect(errores('PORCENTAJE', 0)).toHaveProperty('min');
    });
    it('PORCENTAJE tiene tope 100; MONTO_FIJO no', () => {
        expect(errores('PORCENTAJE', 150)).toHaveProperty('max');
        expect(errores('PORCENTAJE', 100)).toBeNull();
        expect(errores('MONTO_FIJO', 150)).toBeNull();
    });
});

describe('validarRangoFechas', () => {
    const grupo = (fechaInicio: string, fechaFin: string) =>
        new FormGroup({ fechaInicio: new FormControl(fechaInicio), fechaFin: new FormControl(fechaFin) });
    it('fin anterior a inicio es error; igual o posterior no', () => {
        expect(validarRangoFechas(grupo('2026-03-10', '2026-03-01'))).toEqual({ rangoFechas: true });
        expect(validarRangoFechas(grupo('2026-03-10', '2026-03-10'))).toBeNull();
        expect(validarRangoFechas(grupo('2026-03-10', ''))).toBeNull();
    });
});

describe('fechas locales', () => {
    it('parseFechaLocal da el día pedido a medianoche local, no el anterior', () => {
        const d = parseFechaLocal('2026-10-13');
        expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 9, 13, 0]);
    });
    it('hoyLocalISO usa el día local', () => {
        expect(hoyLocalISO(new Date(2026, 9, 13, 23, 30))).toBe('2026-10-13');
    });
    it('una promoción que vence hoy sigue ACTIVA; ayer es VENCIDA; inactiva manda', () => {
        const hoy = new Date(2026, 9, 13, 20, 0);
        expect(calcularEstadoPromocion({ activo: true, fechaFin: '2026-10-13' }, hoy)).toBe('ACTIVA');
        expect(calcularEstadoPromocion({ activo: true, fechaFin: '2026-10-12' }, hoy)).toBe('VENCIDA');
        expect(calcularEstadoPromocion({ activo: false, fechaFin: '2026-10-12' }, hoy)).toBe('INACTIVA');
    });
});

describe('asignación de cupón', () => {
    it('TODOS no manda segmento', () => {
        expect(construirAsignacionRequest('TODOS', '7')).toEqual({});
    });
    it('SEGMENTO manda el id numérico', () => {
        expect(construirAsignacionRequest('SEGMENTO', '7')).toEqual({ segmentoId: 7 });
    });
    it('SEGMENTO sin elegir no manda segmento', () => {
        expect(construirAsignacionRequest('SEGMENTO', '')).toEqual({});
    });
    it('resume el resultado', () => {
        expect(resumenAsignacion({ asignados: 3, yaAsignados: 1, sinCuenta: 2 }))
            .toBe('3 asignados · 1 ya lo tenían · 2 sin cuenta en la tienda');
    });
});
