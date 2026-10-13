import { describe, expect, it } from 'vitest';
import {
    claseBadgeEstadoRecepcion,
    construirCreateRecepcionRequest,
    RecepcionItemForm,
} from './recepcion.form';

const linea: RecepcionItemForm = {
    ordenItemId: 'oi-1',
    productoNombre: 'Cemento Sol 42.5kg',
    cantidadPedida: 10,
    cantidadRecibida: 8,
};

describe('construirCreateRecepcionRequest', () => {
    it('con el formulario completo copia todos los datos de la guía', () => {
        const req = construirCreateRecepcionRequest(
            {
                ordenCompraId: 'oc-1',
                numeroGuia: 'T001-000123',
                transportista: 'Transportes Lima SAC',
                fechaRecepcion: '2026-08-05',
                responsable: 'Juan Pérez',
                almacenDestino: 'ALM-01',
                observaciones: 'Llegó con retraso',
            },
            [linea]
        );

        expect(req).toEqual({
            ordenCompraId: 'oc-1',
            numeroGuia: 'T001-000123',
            transportista: 'Transportes Lima SAC',
            fechaRecepcion: '2026-08-05',
            responsable: 'Juan Pérez',
            almacenDestino: 'ALM-01',
            observaciones: 'Llegó con retraso',
            items: [{ ordenItemId: 'oi-1', cantidadRecibida: 8 }],
        });
    });

    it('con solo la OC omite todos los opcionales en vez de mandarlos vacíos', () => {
        // Registro mínimo: qué OC y qué llegó. El resto se completa después.
        const req = construirCreateRecepcionRequest({ ordenCompraId: 'oc-1' }, [linea]);

        expect(req.ordenCompraId).toBe('oc-1');
        expect(req.numeroGuia).toBeUndefined();
        expect(req.transportista).toBeUndefined();
        expect(req.fechaRecepcion).toBeUndefined();
        expect(req.responsable).toBeUndefined();
        expect(req.almacenDestino).toBeUndefined();
        expect(req.observaciones).toBeUndefined();
    });

    it('convierte a undefined los opcionales que llegan como cadena vacía', () => {
        // Clave para almacenDestino: mandar '' borraría el almacén precargado de la OC.
        const req = construirCreateRecepcionRequest(
            {
                ordenCompraId: 'oc-1',
                numeroGuia: '',
                transportista: '',
                fechaRecepcion: '',
                responsable: '',
                almacenDestino: '',
                observaciones: '',
            },
            [linea]
        );

        expect(req.numeroGuia).toBeUndefined();
        expect(req.transportista).toBeUndefined();
        expect(req.fechaRecepcion).toBeUndefined();
        expect(req.responsable).toBeUndefined();
        expect(req.almacenDestino).toBeUndefined();
        expect(req.observaciones).toBeUndefined();
    });

    it('sin ordenCompraId manda cadena vacía, que el backend rechaza con 400', () => {
        expect(construirCreateRecepcionRequest({}, [linea]).ordenCompraId).toBe('');
        expect(construirCreateRecepcionRequest({ ordenCompraId: null }, [linea]).ordenCompraId).toBe('');
    });

    it('de cada línea solo manda ordenItemId y cantidadRecibida', () => {
        const req = construirCreateRecepcionRequest({ ordenCompraId: 'oc-1' }, [linea]);
        expect(req.items).toEqual([{ ordenItemId: 'oi-1', cantidadRecibida: 8 }]);
        // El nombre y la cantidad pedida son contexto de pantalla, no payload.
        expect(req.items?.[0]).not.toHaveProperty('productoNombre');
        expect(req.items?.[0]).not.toHaveProperty('cantidadPedida');
    });

    it('conserva la recepción de 0 unidades: es un faltante declarado, no un hueco', () => {
        const req = construirCreateRecepcionRequest(
            { ordenCompraId: 'oc-1' },
            [{ ...linea, cantidadRecibida: 0 }]
        );
        expect(req.items?.[0].cantidadRecibida).toBe(0);
    });

    it('mapea varias líneas conservando el orden', () => {
        const req = construirCreateRecepcionRequest({ ordenCompraId: 'oc-1' }, [
            linea,
            { ordenItemId: 'oi-2', productoNombre: 'Arena', cantidadPedida: 5, cantidadRecibida: 5 },
        ]);
        expect(req.items?.map((i) => i.ordenItemId)).toEqual(['oi-1', 'oi-2']);
    });

    it('sin líneas devuelve un array vacío', () => {
        expect(construirCreateRecepcionRequest({ ordenCompraId: 'oc-1' }, []).items).toEqual([]);
    });
});

describe('claseBadgeEstadoRecepcion', () => {
    it('pendiente avisa y los desenlaces buenos cierran en verde', () => {
        expect(claseBadgeEstadoRecepcion('PENDIENTE')).toBe('warning');
        expect(claseBadgeEstadoRecepcion('CONFORME')).toBe('success');
        expect(claseBadgeEstadoRecepcion('COMPLETADA')).toBe('success');
    });

    it('acepta las dos variantes que emite el backend para el mismo desenlace', () => {
        expect(claseBadgeEstadoRecepcion('CON_DIFERENCIAS')).toBe('error');
        expect(claseBadgeEstadoRecepcion('DIFERENCIA')).toBe('error');
    });

    it('cae a neutro ante un estado desconocido', () => {
        expect(claseBadgeEstadoRecepcion('ANULADA')).toBe('neutral');
        expect(claseBadgeEstadoRecepcion('')).toBe('neutral');
    });
});
