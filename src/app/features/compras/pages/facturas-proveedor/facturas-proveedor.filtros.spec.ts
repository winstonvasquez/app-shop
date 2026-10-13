import { describe, expect, it } from 'vitest';
import { construirFiltrosFactura, type ValoresFiltroFactura } from './facturas-proveedor.filtros';

const VACIO: ValoresFiltroFactura = {
    q: '', estado: '', tipoDocumento: '', resultadoMatch: '', estadoSunat: '', moneda: '',
    proveedorId: '', conDetraccion: '',
    fechaEmisionDesde: null, fechaEmisionHasta: null,
    fechaVencimientoDesde: null, fechaVencimientoHasta: null,
};

describe('construirFiltrosFactura', () => {
    it('sin nada elegido no manda ningún filtro', () => {
        const f = construirFiltrosFactura(VACIO);
        expect(Object.values(f).every((v) => v === undefined)).toBe(true);
    });

    it('los ocho filtros de texto viajan tal cual cuando tienen valor', () => {
        const f = construirFiltrosFactura({
            ...VACIO, q: 'F001', estado: 'PENDIENTE', tipoDocumento: 'FACTURA',
            resultadoMatch: 'OK', estadoSunat: 'ACEPTADO', moneda: 'PEN',
            proveedorId: '42', conDetraccion: 'true',
        });
        expect(f).toMatchObject({
            q: 'F001', estado: 'PENDIENTE', tipoDocumento: 'FACTURA', resultadoMatch: 'OK',
            estadoSunat: 'ACEPTADO', moneda: 'PEN', proveedorId: '42', conDetraccion: 'true',
        });
    });

    it('las cuatro fechas admiten null y valor', () => {
        const f = construirFiltrosFactura({
            ...VACIO, fechaEmisionDesde: '2026-01-01', fechaVencimientoHasta: '2026-03-31',
        });
        expect(f.fechaEmisionDesde).toBe('2026-01-01');
        expect(f.fechaVencimientoHasta).toBe('2026-03-31');
        expect(f.fechaEmisionHasta).toBeUndefined();
        expect(f.fechaVencimientoDesde).toBeUndefined();
    });

    // La divergencia que había entre las dos copias: la de exportación usaba `??`, que deja pasar
    // la cadena vacía. Aquí se fija el criterio único: en blanco es «sin elegir».
    it('una fecha en cadena vacía es «sin elegir», no un filtro por cadena vacía', () => {
        expect(construirFiltrosFactura({ ...VACIO, fechaEmisionDesde: '' }).fechaEmisionDesde)
            .toBeUndefined();
    });

    it('`conDetraccion: "false"` es una elección legítima y viaja', () => {
        expect(construirFiltrosFactura({ ...VACIO, conDetraccion: 'false' }).conDetraccion).toBe('false');
    });
});
