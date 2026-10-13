import { describe, expect, it } from 'vitest';
import { productIdToUuid } from '../../utils/synthetic-uuid.util';
import { LotesFiltrosUI, lotesFiltrosParams } from './lot-management.params';

const VACIO: LotesFiltrosUI = {
    q: '', productId: null, activo: null, proveedorNombre: '', estadoVencimiento: '',
    vencimientoDesde: null, vencimientoHasta: null,
    fabricacionDesde: null, fabricacionHasta: null
};

describe('lotesFiltrosParams', () => {
    it('con todos los filtros puestos los traslada tal cual', () => {
        expect(lotesFiltrosParams({
            q: 'L-1', productId: 42, activo: true,
            proveedorNombre: 'Acme', estadoVencimiento: 'POR_VENCER',
            vencimientoDesde: '2026-01-01', vencimientoHasta: '2026-01-31',
            fabricacionDesde: '2025-01-01', fabricacionHasta: '2025-12-31'
        })).toEqual({
            q: 'L-1', productoId: productIdToUuid(42), activo: true,
            proveedorNombre: 'Acme', estadoVencimiento: 'POR_VENCER',
            vencimientoDesde: '2026-01-01', vencimientoHasta: '2026-01-31',
            fabricacionDesde: '2025-01-01', fabricacionHasta: '2025-12-31'
        });
    });

    it('sin nada elegido, TODOS los parámetros salen undefined', () => {
        const r = lotesFiltrosParams(VACIO);
        expect(r.q).toBeUndefined();
        expect(r.productoId).toBeUndefined();
        expect(r.activo).toBeUndefined();
        expect(r.proveedorNombre).toBeUndefined();
        expect(r.estadoVencimiento).toBeUndefined();
        expect(r.vencimientoDesde).toBeUndefined();
        expect(r.vencimientoHasta).toBeUndefined();
        expect(r.fabricacionDesde).toBeUndefined();
        expect(r.fabricacionHasta).toBeUndefined();
    });

    it('el producto viaja como UUID sintético, no como el id numérico', () => {
        const r = lotesFiltrosParams({ ...VACIO, productId: 7 });
        expect(r.productoId).toBe(productIdToUuid(7));
        expect(r.productoId).not.toBe('7');
    });

    it('producto 0 es un id legítimo y NO se descarta', () => {
        // `!= null` y no `if (productId)`: el 0 tiene que convertirse igual.
        expect(lotesFiltrosParams({ ...VACIO, productId: 0 }).productoId).toBe(productIdToUuid(0));
    });

    it('activo distingue "inactivo" de "sin filtrar"', () => {
        // El caso que rompe con `|| undefined`: `false` es un filtro real (lotes dados de baja).
        expect(lotesFiltrosParams({ ...VACIO, activo: false }).activo).toBe(false);
        expect(lotesFiltrosParams({ ...VACIO, activo: true }).activo).toBe(true);
        expect(lotesFiltrosParams({ ...VACIO, activo: null }).activo).toBeUndefined();
    });

    it('una fecha en cadena vacía cuenta como no elegida', () => {
        const r = lotesFiltrosParams({ ...VACIO, vencimientoDesde: '', fabricacionHasta: '' });
        expect(r.vencimientoDesde).toBeUndefined();
        expect(r.fabricacionHasta).toBeUndefined();
    });

    it('cada rango de fecha es independiente: sólo el extremo puesto viaja', () => {
        const r = lotesFiltrosParams({ ...VACIO, vencimientoHasta: '2026-03-01', fabricacionDesde: '2025-06-01' });
        expect(r.vencimientoDesde).toBeUndefined();
        expect(r.vencimientoHasta).toBe('2026-03-01');
        expect(r.fabricacionDesde).toBe('2025-06-01');
        expect(r.fabricacionHasta).toBeUndefined();
    });
});
