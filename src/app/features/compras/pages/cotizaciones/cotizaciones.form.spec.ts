import { describe, expect, it } from 'vitest';
import {
    claseBadgeEstadoCotizacion,
    construirCotizacionRequest,
    construirItemsCotizacion,
} from './cotizaciones.form';

describe('construirItemsCotizacion', () => {
    it('copia una línea completa sin aplicar defaults', () => {
        const items = construirItemsCotizacion([
            {
                productoId: 'prod-1',
                productoNombre: 'Cemento Sol 42.5kg',
                sku: 'CEM-425',
                cantidad: 20,
                unidadMedida: 'BOLSA',
                especificaciones: 'Tipo I, sacos de 42.5 kg',
            },
        ]);

        expect(items).toEqual([
            {
                productoId: 'prod-1',
                productoNombre: 'Cemento Sol 42.5kg',
                sku: 'CEM-425',
                cantidad: 20,
                unidadMedida: 'BOLSA',
                especificaciones: 'Tipo I, sacos de 42.5 kg',
            },
        ]);
    });

    it('omite los opcionales vacíos y cae a UNIDAD en la unidad de medida', () => {
        const items = construirItemsCotizacion([
            { productoId: '', productoNombre: 'Ítem libre', sku: '', cantidad: 3, unidadMedida: '', especificaciones: '' },
        ]);

        expect(items[0].productoId).toBeUndefined();
        expect(items[0].sku).toBeUndefined();
        expect(items[0].especificaciones).toBeUndefined();
        // Una cantidad sin unidad no es cotizable: UNIDAD es el default del alta.
        expect(items[0].unidadMedida).toBe('UNIDAD');
        expect(items[0].productoNombre).toBe('Ítem libre');
    });

    it('trata los campos ausentes igual que los vacíos', () => {
        const items = construirItemsCotizacion([{ productoNombre: 'Suelto', cantidad: 1 }]);
        expect(items[0].productoId).toBeUndefined();
        expect(items[0].sku).toBeUndefined();
        expect(items[0].especificaciones).toBeUndefined();
        expect(items[0].unidadMedida).toBe('UNIDAD');
    });

    it('numeriza la cantidad, que el input entrega como cadena', () => {
        expect(construirItemsCotizacion([{ productoNombre: 'X', cantidad: '15' }])[0].cantidad).toBe(15);
    });

    it('mapea varias líneas conservando el orden', () => {
        const items = construirItemsCotizacion([
            { productoNombre: 'A', cantidad: 1 },
            { productoNombre: 'B', cantidad: 2 },
        ]);
        expect(items.map((i) => i.productoNombre)).toEqual(['A', 'B']);
    });

    it('sin líneas devuelve un array vacío', () => {
        expect(construirItemsCotizacion([])).toEqual([]);
    });
});

describe('construirCotizacionRequest', () => {
    it('con el formulario completo copia todo tal cual', () => {
        const req = construirCotizacionRequest({
            titulo: 'Materiales de obra Q3',
            descripcion: 'Compra trimestral',
            fechaVencimiento: '2026-09-30',
            proveedorIds: ['prov-1', 'prov-2'],
            items: [{ productoNombre: 'Cemento', cantidad: 10 }],
        });

        expect(req.titulo).toBe('Materiales de obra Q3');
        expect(req.descripcion).toBe('Compra trimestral');
        expect(req.fechaVencimiento).toBe('2026-09-30');
        expect(req.proveedorIds).toEqual(['prov-1', 'prov-2']);
        expect(req.items).toHaveLength(1);
    });

    it('con el formulario vacío deja obligatorios en blanco y omite la descripción', () => {
        const req = construirCotizacionRequest({});
        // Obligatorios: cadena vacía (el backend los rechaza con 400 explícito).
        expect(req.titulo).toBe('');
        expect(req.fechaVencimiento).toBe('');
        // Opcional: ausente, no cadena vacía.
        expect(req.descripcion).toBeUndefined();
        expect(req.proveedorIds).toEqual([]);
        expect(req.items).toEqual([]);
    });

    it('trata null igual que ausente', () => {
        const req = construirCotizacionRequest({
            titulo: null,
            descripcion: null,
            fechaVencimiento: null,
            proveedorIds: null,
            items: null,
        });
        expect(req.titulo).toBe('');
        expect(req.fechaVencimiento).toBe('');
        expect(req.descripcion).toBeUndefined();
        expect(req.proveedorIds).toEqual([]);
        expect(req.items).toEqual([]);
    });

    it('conserva la descripción vacía como ausente solo si es null, no si es cadena vacía', () => {
        // `??` no filtra el '': si el usuario borró el campo, viaja como ''.
        expect(construirCotizacionRequest({ descripcion: '' }).descripcion).toBe('');
        expect(construirCotizacionRequest({ descripcion: null }).descripcion).toBeUndefined();
    });

    it('filtra los huecos de proveedorIds que deja el multi-select al quitar un proveedor', () => {
        // Un id vacío haría que el backend invite a un proveedor inexistente.
        const req = construirCotizacionRequest({
            proveedorIds: ['prov-1', '', null, 'prov-2'],
        });
        expect(req.proveedorIds).toEqual(['prov-1', 'prov-2']);
    });

    it('deja proveedorIds vacío si todos los elementos son huecos', () => {
        expect(construirCotizacionRequest({ proveedorIds: ['', null] }).proveedorIds).toEqual([]);
    });

    it('no incluye el codigo: el correlativo lo emite el backend', () => {
        const req = construirCotizacionRequest({ titulo: 'X' });
        expect('codigo' in req).toBe(false);
    });
});

describe('claseBadgeEstadoCotizacion', () => {
    it('pinta cada estado del ciclo de la cotización', () => {
        expect(claseBadgeEstadoCotizacion('CREADA')).toBe('badge badge-neutral');
        expect(claseBadgeEstadoCotizacion('ENVIADA')).toBe('badge badge-accent');
        expect(claseBadgeEstadoCotizacion('EN_RESPUESTA')).toBe('badge badge-warning');
        expect(claseBadgeEstadoCotizacion('CANCELADA')).toBe('badge badge-error');
    });

    it('adjudicada y convertida son ambas verdes: las dos son desenlace exitoso', () => {
        expect(claseBadgeEstadoCotizacion('ADJUDICADA')).toBe('badge badge-success');
        expect(claseBadgeEstadoCotizacion('CONVERTIDA_OC')).toBe('badge badge-success');
    });

    it('cae a neutro ante un estado desconocido', () => {
        expect(claseBadgeEstadoCotizacion('VENCIDA')).toBe('badge badge-neutral');
        expect(claseBadgeEstadoCotizacion('')).toBe('badge badge-neutral');
    });
});
