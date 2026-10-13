import { describe, expect, it } from 'vitest';
import {
    claseBadgeEstadoSolicitud,
    construirItemsSolicitud,
    construirPayloadAltaSolicitud,
    construirPayloadEdicionSolicitud,
    valoresCabeceraSolicitud,
    valoresLineaSolicitud,
} from './solicitudes-compra.form';
import { SolicitudCompra, SolicitudCompraItem } from '../../models/solicitud-compra.model';

describe('valoresCabeceraSolicitud', () => {
    it('copia la cabecera cuando está completa', () => {
        const s = {
            justificacion: 'Reposición',
            departamento: 'LOGISTICA',
            prioridad: 'ALTA',
            fechaRequerida: '2026-09-01',
        } as SolicitudCompra;

        expect(valoresCabeceraSolicitud(s)).toEqual({
            justificacion: 'Reposición',
            departamento: 'LOGISTICA',
            prioridad: 'ALTA',
            fechaRequerida: '2026-09-01',
        });
    });

    it('aplica los defaults del alta en una solicitud antigua sin estos campos', () => {
        // Sin esto los controles abrirían nulos y al guardar borrarían el dato.
        expect(valoresCabeceraSolicitud({} as SolicitudCompra)).toEqual({
            justificacion: '',
            departamento: '',
            prioridad: 'NORMAL',
            fechaRequerida: '',
        });
    });

    it('trata null igual que ausente', () => {
        const s = { justificacion: null, prioridad: null } as unknown as SolicitudCompra;
        expect(valoresCabeceraSolicitud(s).justificacion).toBe('');
        expect(valoresCabeceraSolicitud(s).prioridad).toBe('NORMAL');
    });

    it('respeta la prioridad vacía guardada: `??` solo suple ausencia', () => {
        const s = { prioridad: '' } as SolicitudCompra;
        expect(valoresCabeceraSolicitud(s).prioridad).toBe('');
    });
});

describe('valoresLineaSolicitud', () => {
    it('copia la línea cuando está completa', () => {
        const item: SolicitudCompraItem = {
            productoId: 'prod-1',
            proveedorSugeridoId: 'prov-1',
            productoNombre: 'Cemento',
            sku: 'CEM-425',
            cantidad: 20,
            unidadMedida: 'BOLSA',
            precioEstimado: 25.5,
            observaciones: 'Urgente',
        };

        expect(valoresLineaSolicitud(item)).toEqual({
            productoId: 'prod-1',
            proveedorSugeridoId: 'prov-1',
            productoNombre: 'Cemento',
            sku: 'CEM-425',
            cantidad: 20,
            unidadMedida: 'BOLSA',
            precioEstimado: 25.5,
            observaciones: 'Urgente',
        });
    });

    it('rellena los ids ocultos para que la edición no los pierda', () => {
        // Son los que construirItemsSolicitud vuelve a mandar al guardar.
        const v = valoresLineaSolicitud({ productoNombre: 'X', cantidad: 1 });
        expect(v.productoId).toBe('');
        expect(v.proveedorSugeridoId).toBe('');
    });

    it('aplica los defaults del alta en el resto de campos', () => {
        const v = valoresLineaSolicitud({ productoNombre: 'X', cantidad: 1 });
        expect(v.sku).toBe('');
        expect(v.unidadMedida).toBe('UNIDAD');
        expect(v.observaciones).toBe('');
    });

    it('deja precioEstimado en null y no en 0 cuando no hay estimación', () => {
        // Un 0 se mostraría como un precio estimado de S/ 0 que el usuario no puso.
        expect(valoresLineaSolicitud({ productoNombre: 'X', cantidad: 1 }).precioEstimado).toBeNull();
    });

    it('conserva un precioEstimado 0 guardado explícitamente', () => {
        expect(valoresLineaSolicitud({ productoNombre: 'X', cantidad: 1, precioEstimado: 0 }).precioEstimado).toBe(0);
    });

    it('cae a cantidad 1 si la línea llegara sin cantidad', () => {
        const item = { productoNombre: 'X' } as unknown as SolicitudCompraItem;
        expect(valoresLineaSolicitud(item).cantidad).toBe(1);
    });
});

describe('construirItemsSolicitud', () => {
    it('copia una línea completa sin aplicar defaults', () => {
        const items = construirItemsSolicitud([
            {
                productoId: 'prod-1',
                proveedorSugeridoId: 'prov-1',
                productoNombre: 'Cemento Sol 42.5kg',
                sku: 'CEM-425',
                cantidad: 20,
                unidadMedida: 'BOLSA',
                precioEstimado: 25.5,
                observaciones: 'Urgente para obra',
            },
        ]);

        expect(items).toEqual([
            {
                productoId: 'prod-1',
                proveedorSugeridoId: 'prov-1',
                productoNombre: 'Cemento Sol 42.5kg',
                sku: 'CEM-425',
                cantidad: 20,
                unidadMedida: 'BOLSA',
                precioEstimado: 25.5,
                observaciones: 'Urgente para obra',
            },
        ]);
    });

    it('preserva productoId y proveedorSugeridoId, que no tienen input en el alta', () => {
        // Si se perdieran, la edición los borraría y convertirAOC propagaría un
        // productoId null hasta Recepción (causa raíz del NPE conocido).
        const items = construirItemsSolicitud([
            { productoId: 'prod-9', proveedorSugeridoId: 'prov-9', productoNombre: 'X', cantidad: 1 },
        ]);
        expect(items[0].productoId).toBe('prod-9');
        expect(items[0].proveedorSugeridoId).toBe('prov-9');
    });

    it('omite productoId y proveedorSugeridoId vacíos', () => {
        const items = construirItemsSolicitud([
            { productoId: '', proveedorSugeridoId: '', productoNombre: 'Ítem libre', cantidad: 1 },
        ]);
        expect(items[0].productoId).toBeUndefined();
        expect(items[0].proveedorSugeridoId).toBeUndefined();
    });

    it('cae a UNIDAD cuando la unidad de medida viene vacía o ausente', () => {
        expect(construirItemsSolicitud([{ productoNombre: 'X', cantidad: 1, unidadMedida: '' }])[0].unidadMedida)
            .toBe('UNIDAD');
        expect(construirItemsSolicitud([{ productoNombre: 'X', cantidad: 1 }])[0].unidadMedida).toBe('UNIDAD');
    });

    it('deja precioEstimado ausente cuando el campo está vacío, en vez de mandar NaN', () => {
        expect(construirItemsSolicitud([{ productoNombre: 'X', cantidad: 1 }])[0].precioEstimado).toBeUndefined();
        expect(construirItemsSolicitud([{ productoNombre: 'X', cantidad: 1, precioEstimado: '' }])[0].precioEstimado)
            .toBeUndefined();
        expect(construirItemsSolicitud([{ productoNombre: 'X', cantidad: 1, precioEstimado: null }])[0].precioEstimado)
            .toBeUndefined();
    });

    it('el precioEstimado 0 se descarta: el ternario lo trata como campo sin llenar', () => {
        // Comportamiento vigente conservado tal cual en la extracción: un 0 tecleado
        // NO viaja. Es una estimación, no un precio de compra.
        expect(construirItemsSolicitud([{ productoNombre: 'X', cantidad: 1, precioEstimado: 0 }])[0].precioEstimado)
            .toBeUndefined();
    });

    it('numeriza cantidad y precio, que el input entrega como cadena', () => {
        const items = construirItemsSolicitud([{ productoNombre: 'X', cantidad: '12', precioEstimado: '4.75' }]);
        expect(items[0].cantidad).toBe(12);
        expect(items[0].precioEstimado).toBe(4.75);
    });

    it('mapea varias líneas conservando el orden', () => {
        const items = construirItemsSolicitud([
            { productoNombre: 'A', cantidad: 1 },
            { productoNombre: 'B', cantidad: 2 },
        ]);
        expect(items.map((i) => i.productoNombre)).toEqual(['A', 'B']);
    });

    it('sin líneas devuelve un array vacío', () => {
        expect(construirItemsSolicitud([])).toEqual([]);
    });
});

describe('construirPayloadEdicionSolicitud', () => {
    it('copia justificación, prioridad, fecha e ítems', () => {
        const p = construirPayloadEdicionSolicitud({
            justificacion: 'Reposición de stock',
            prioridad: 'ALTA',
            fechaRequerida: '2026-09-01',
            items: [{ productoNombre: 'Cemento', cantidad: 5 }],
        });

        expect(p.justificacion).toBe('Reposición de stock');
        expect(p.prioridad).toBe('ALTA');
        expect(p.fechaRequerida).toBe('2026-09-01');
        expect(p.items).toHaveLength(1);
    });

    it('NO incluye departamento ni solicitanteNombre: no se reasignan editando', () => {
        const p = construirPayloadEdicionSolicitud({
            justificacion: 'X',
            departamento: 'LOGISTICA',
        });
        expect('departamento' in p).toBe(false);
        expect('solicitanteNombre' in p).toBe(false);
    });

    it('con el formulario vacío aplica los defaults del alta', () => {
        const p = construirPayloadEdicionSolicitud({});
        expect(p.justificacion).toBe('');
        expect(p.prioridad).toBe('NORMAL');
        expect(p.fechaRequerida).toBeUndefined();
        expect(p.items).toEqual([]);
    });

    it('convierte el null de fechaRequerida en ausente, no lo manda como null', () => {
        expect(construirPayloadEdicionSolicitud({ fechaRequerida: null }).fechaRequerida).toBeUndefined();
    });

    it('conserva la cadena vacía de fechaRequerida: `??` solo suple ausencia', () => {
        expect(construirPayloadEdicionSolicitud({ fechaRequerida: '' }).fechaRequerida).toBe('');
    });

    it('trata null igual que ausente en justificación y prioridad', () => {
        const p = construirPayloadEdicionSolicitud({ justificacion: null, prioridad: null });
        expect(p.justificacion).toBe('');
        expect(p.prioridad).toBe('NORMAL');
    });
});

describe('construirPayloadAltaSolicitud', () => {
    it('añade solicitante y departamento sobre el payload de edición', () => {
        const p = construirPayloadAltaSolicitud(
            {
                justificacion: 'Nueva obra',
                departamento: 'OPERACIONES',
                prioridad: 'ALTA',
                fechaRequerida: '2026-09-01',
                items: [{ productoNombre: 'Cemento', cantidad: 5 }],
            },
            'jperez'
        );

        expect(p.solicitanteNombre).toBe('jperez');
        expect(p.departamento).toBe('OPERACIONES');
        expect(p.justificacion).toBe('Nueva obra');
        expect(p.prioridad).toBe('ALTA');
        expect(p.items).toHaveLength(1);
    });

    it('toma el solicitante del argumento y no del formulario', () => {
        // Viene del usuario autenticado: nadie puede solicitar a nombre de otro.
        const p = construirPayloadAltaSolicitud({ justificacion: 'X' }, 'mlopez');
        expect(p.solicitanteNombre).toBe('mlopez');
    });

    it('omite el departamento cuando viene vacío o nulo', () => {
        expect(construirPayloadAltaSolicitud({ departamento: null }, 'u').departamento).toBeUndefined();
        // La cadena vacía sí viaja: `?? undefined` solo captura null/undefined.
        expect(construirPayloadAltaSolicitud({ departamento: '' }, 'u').departamento).toBe('');
    });

    it('aplica los mismos defaults que la edición', () => {
        const p = construirPayloadAltaSolicitud({}, 'u');
        expect(p.justificacion).toBe('');
        expect(p.prioridad).toBe('NORMAL');
        expect(p.fechaRequerida).toBeUndefined();
        expect(p.items).toEqual([]);
    });
});

describe('claseBadgeEstadoSolicitud', () => {
    it('solo la aprobación pendiente avisa en ámbar', () => {
        expect(claseBadgeEstadoSolicitud('PENDIENTE_APROBACION')).toBe('badge badge-warning');
    });

    it('pinta el resto de estados del ciclo', () => {
        expect(claseBadgeEstadoSolicitud('APROBADA')).toBe('badge badge-success');
        expect(claseBadgeEstadoSolicitud('RECHAZADA')).toBe('badge badge-error');
        expect(claseBadgeEstadoSolicitud('CONVERTIDA_OC')).toBe('badge badge-accent');
    });

    it('borrador y cancelada son neutras: ninguna exige acción del aprobador', () => {
        expect(claseBadgeEstadoSolicitud('BORRADOR')).toBe('badge badge-neutral');
        expect(claseBadgeEstadoSolicitud('CANCELADA')).toBe('badge badge-neutral');
    });

    it('cae a neutro sin estado o ante un estado desconocido', () => {
        expect(claseBadgeEstadoSolicitud(undefined)).toBe('badge badge-neutral');
        expect(claseBadgeEstadoSolicitud('')).toBe('badge badge-neutral');
        expect(claseBadgeEstadoSolicitud('ARCHIVADA')).toBe('badge badge-neutral');
    });
});
