import { describe, expect, it } from 'vitest';
import {
    accionesOrdenCompra,
    avisoTrasAprobar,
    claseBadgeEstadoOrden,
    construirPayloadOrdenCompra,
    etiquetaEstadoOrden,
    itemsOrdenIncompletos,
    lineasEdicionOrdenCompra,
    OcItemForm,
    TotalesOrdenCompra,
    valoresEdicionOrdenCompra,
    ValoresFormularioOrdenCompra,
} from './ordenes-compra.form';
import { OrdenCompra } from '../../models/orden-compra.model';

const ordenGuardada: OrdenCompra = {
    id: 'oc-1',
    codigo: 'OC-2026-0001',
    proveedorId: 'prov-1',
    fechaEmision: '2026-08-01',
    fechaEntregaEstimada: '2026-08-15',
    condicionPago: 'CREDITO_30',
    almacenDestino: 'ALM-01',
    estado: 'BORRADOR',
    observaciones: 'Entregar en obra',
    contratoId: 'ctr-1',
    moneda: 'USD',
    tipoCambio: 3.75,
};

describe('valoresEdicionOrdenCompra', () => {
    it('copia la cabecera cuando la OC está completa', () => {
        expect(valoresEdicionOrdenCompra(ordenGuardada)).toEqual({
            codigo: 'OC-2026-0001',
            proveedorId: 'prov-1',
            fechaEmision: '2026-08-01',
            fechaEntregaEstimada: '2026-08-15',
            condicionPago: 'CREDITO_30',
            almacenDestino: 'ALM-01',
            observaciones: 'Entregar en obra',
            contratoId: 'ctr-1',
            moneda: 'USD',
            tipoCambio: 3.75,
        });
    });

    it('cae a PEN en una OC antigua sin moneda registrada', () => {
        // Si abriera en blanco, el select vacío acabaría guardando la OC sin moneda.
        const v = valoresEdicionOrdenCompra({ ...ordenGuardada, moneda: undefined });
        expect(v.moneda).toBe('PEN');
    });

    it('vacía los opcionales ausentes en vez de dejarlos undefined', () => {
        const v = valoresEdicionOrdenCompra({
            ...ordenGuardada,
            fechaEntregaEstimada: undefined,
            observaciones: undefined,
            contratoId: undefined,
        });
        expect(v.fechaEntregaEstimada).toBe('');
        expect(v.observaciones).toBe('');
        expect(v.contratoId).toBe('');
    });

    it('deja tipoCambio en null y no en 0 cuando la OC no lo tiene', () => {
        // Un 0 se leería como tipo de cambio real y invalidaría los importes.
        expect(valoresEdicionOrdenCompra({ ...ordenGuardada, tipoCambio: undefined }).tipoCambio).toBeNull();
    });

    it('conserva el codigo para mostrarlo bloqueado en edición', () => {
        expect(valoresEdicionOrdenCompra(ordenGuardada).codigo).toBe('OC-2026-0001');
    });
});

describe('lineasEdicionOrdenCompra', () => {
    it('mapea las líneas guardadas al formulario', () => {
        const lineas = lineasEdicionOrdenCompra({
            ...ordenGuardada,
            items: [
                { productoId: 'p-1', productoNombre: 'Cemento', sku: 'CEM', cantidad: 4, precioUnitario: 25 },
            ],
        });
        expect(lineas).toEqual([
            { productoId: 'p-1', productoNombre: 'Cemento', sku: 'CEM', cantidad: 4, precioUnitario: 25 },
        ]);
    });

    it('vacía el sku ausente, que el formulario trata como texto', () => {
        const lineas = lineasEdicionOrdenCompra({
            ...ordenGuardada,
            items: [{ productoNombre: 'Ítem libre', cantidad: 1, precioUnitario: 10 }],
        });
        expect(lineas[0].sku).toBe('');
        // productoId se deja tal cual: el builder del payload ya lo omite si viene vacío.
        expect(lineas[0].productoId).toBeUndefined();
    });

    it('devuelve un array vacío si la OC no trae líneas', () => {
        expect(lineasEdicionOrdenCompra({ ...ordenGuardada, items: undefined })).toEqual([]);
    });
});

const totales: TotalesOrdenCompra = { subtotal: 100, igv: 18, total: 118 };

const itemValido: OcItemForm = {
    productoId: 'prod-1',
    productoNombre: 'Cemento Sol 42.5kg',
    sku: 'CEM-425',
    cantidad: 4,
    precioUnitario: 25,
};

const formularioCompleto: ValoresFormularioOrdenCompra = {
    codigo: 'OC-2026-0001',
    proveedorId: 'prov-1',
    fechaEmision: '2026-08-01',
    fechaEntregaEstimada: '2026-08-15',
    condicionPago: 'CREDITO_30',
    almacenDestino: 'ALM-01',
    observaciones: 'Entregar en obra',
    contratoId: 'ctr-1',
    moneda: 'USD',
    tipoCambio: 3.75,
};

describe('itemsOrdenIncompletos', () => {
    it('acepta una lista de líneas completas', () => {
        expect(itemsOrdenIncompletos([itemValido, { ...itemValido, cantidad: 1 }])).toBe(false);
    });

    it('rechaza una línea sin nombre de producto, incluso si son solo espacios', () => {
        expect(itemsOrdenIncompletos([{ ...itemValido, productoNombre: '' }])).toBe(true);
        expect(itemsOrdenIncompletos([{ ...itemValido, productoNombre: '   ' }])).toBe(true);
    });

    it('rechaza cantidad menor que 1', () => {
        expect(itemsOrdenIncompletos([{ ...itemValido, cantidad: 0 }])).toBe(true);
        expect(itemsOrdenIncompletos([{ ...itemValido, cantidad: -2 }])).toBe(true);
    });

    it('rechaza precio 0: en una OC no es bonificación sino línea sin cotizar', () => {
        expect(itemsOrdenIncompletos([{ ...itemValido, precioUnitario: 0 }])).toBe(true);
        expect(itemsOrdenIncompletos([{ ...itemValido, precioUnitario: -1 }])).toBe(true);
    });

    it('basta UNA línea mala entre varias buenas', () => {
        expect(itemsOrdenIncompletos([itemValido, { ...itemValido, precioUnitario: 0 }])).toBe(true);
    });

    it('una lista vacía no tiene líneas incompletas (el vacío lo valida el componente aparte)', () => {
        expect(itemsOrdenIncompletos([])).toBe(false);
    });
});

describe('construirPayloadOrdenCompra', () => {
    it('descarta el codigo: el correlativo lo emite el backend', () => {
        const payload = construirPayloadOrdenCompra(formularioCompleto, [itemValido], totales);
        expect('codigo' in payload).toBe(false);
    });

    it('copia el resto del formulario y adjunta los totales calculados', () => {
        const payload = construirPayloadOrdenCompra(formularioCompleto, [itemValido], totales);
        expect(payload.proveedorId).toBe('prov-1');
        expect(payload.fechaEmision).toBe('2026-08-01');
        expect(payload.fechaEntregaEstimada).toBe('2026-08-15');
        expect(payload.condicionPago).toBe('CREDITO_30');
        expect(payload.almacenDestino).toBe('ALM-01');
        expect(payload.observaciones).toBe('Entregar en obra');
        expect(payload.subtotal).toBe(100);
        expect(payload.igv).toBe(18);
        expect(payload.total).toBe(118);
    });

    it('en moneda extranjera SÍ manda el tipo de cambio', () => {
        const payload = construirPayloadOrdenCompra(formularioCompleto, [itemValido], totales);
        expect(payload.moneda).toBe('USD');
        expect(payload.tipoCambio).toBe(3.75);
    });

    it('en PEN descarta el tipo de cambio aunque el formulario lo traiga', () => {
        // Regla clave: el usuario pudo teclear un TC y luego volver a soles; si viajara,
        // quedaría un tipo de cambio guardado que los reportes leerían.
        const payload = construirPayloadOrdenCompra(
            { ...formularioCompleto, moneda: 'PEN', tipoCambio: 3.75 },
            [itemValido],
            totales
        );
        expect(payload.moneda).toBe('PEN');
        expect(payload.tipoCambio).toBeUndefined();
    });

    it('sin moneda cae a PEN y por tanto tampoco manda tipo de cambio', () => {
        const payload = construirPayloadOrdenCompra(
            { ...formularioCompleto, moneda: null, tipoCambio: 3.75 },
            [itemValido],
            totales
        );
        expect(payload.moneda).toBe('PEN');
        expect(payload.tipoCambio).toBeUndefined();
    });

    it('con moneda extranjera pero sin tipo de cambio lo omite en vez de mandar null', () => {
        const payload = construirPayloadOrdenCompra(
            { ...formularioCompleto, moneda: 'USD', tipoCambio: null },
            [itemValido],
            totales
        );
        expect(payload.tipoCambio).toBeUndefined();
    });

    it('omite contratoId vacío: es una OC suelta, no un UUID a resolver', () => {
        const sinContrato = construirPayloadOrdenCompra(
            { ...formularioCompleto, contratoId: '' },
            [itemValido],
            totales
        );
        expect(sinContrato.contratoId).toBeUndefined();
    });

    it('deja pasar el null de los controles que reset() no repuebla', () => {
        // `openCreateForm()` hace reset() sin valores para fechaEntregaEstimada ni
        // observaciones: llegan en null y así viajan (el backend trata null = ausente).
        const payload = construirPayloadOrdenCompra(
            { ...formularioCompleto, fechaEntregaEstimada: null, observaciones: null },
            [itemValido],
            totales
        );
        expect(payload.fechaEntregaEstimada).toBeNull();
        expect(payload.observaciones).toBeNull();
    });

    it('recalcula el subtotal de cada línea como cantidad × precio', () => {
        const payload = construirPayloadOrdenCompra(formularioCompleto, [itemValido], totales);
        expect(payload.items?.[0].subtotal).toBe(100);
    });

    it('omite productoId y sku vacíos, pero conserva los que sí tienen valor', () => {
        const payload = construirPayloadOrdenCompra(
            formularioCompleto,
            [{ productoId: '', productoNombre: 'Ítem libre', sku: '', cantidad: 2, precioUnitario: 5 }],
            totales
        );
        expect(payload.items?.[0].productoId).toBeUndefined();
        expect(payload.items?.[0].sku).toBeUndefined();
        expect(payload.items?.[0].productoNombre).toBe('Ítem libre');
        expect(payload.items?.[0].subtotal).toBe(10);
    });

    it('mapea varias líneas conservando el orden', () => {
        const payload = construirPayloadOrdenCompra(
            formularioCompleto,
            [itemValido, { ...itemValido, productoNombre: 'Arena fina', cantidad: 3, precioUnitario: 10 }],
            totales
        );
        expect(payload.items?.map((i) => i.productoNombre)).toEqual(['Cemento Sol 42.5kg', 'Arena fina']);
        expect(payload.items?.[1].subtotal).toBe(30);
    });

    it('sin líneas devuelve un array vacío', () => {
        const payload = construirPayloadOrdenCompra(formularioCompleto, [], totales);
        expect(payload.items).toEqual([]);
    });
});

describe('claseBadgeEstadoOrden', () => {
    it('pinta cada estado del ciclo de la OC', () => {
        expect(claseBadgeEstadoOrden('BORRADOR')).toBe('neutral');
        expect(claseBadgeEstadoOrden('PENDIENTE')).toBe('warning');
        expect(claseBadgeEstadoOrden('APROBADA')).toBe('success');
        expect(claseBadgeEstadoOrden('ENVIADA')).toBe('accent');
        expect(claseBadgeEstadoOrden('RECIBIDA')).toBe('success');
        expect(claseBadgeEstadoOrden('CANCELADA')).toBe('error');
    });

    it('cae a neutro ante un estado desconocido', () => {
        expect(claseBadgeEstadoOrden('LIQUIDADA')).toBe('neutral');
        expect(claseBadgeEstadoOrden('')).toBe('neutral');
    });

    it('pinta los estados de recepción', () => {
        expect(claseBadgeEstadoOrden('RECIBIDA_PARCIALMENTE')).toBe('info');
        expect(claseBadgeEstadoOrden('CONFIRMADA_PROVEEDOR')).toBe('accent');
    });
});

describe('accionesOrdenCompra', () => {
    it('cancelar sólo en los estados previos a la recepción', () => {
        for (const e of ['BORRADOR', 'PENDIENTE', 'APROBADA', 'ENVIADA', 'CONFIRMADA_PROVEEDOR']) {
            expect(accionesOrdenCompra(e).cancelar).toBe(true);
        }
        for (const e of ['RECIBIDA_PARCIALMENTE', 'RECIBIDA', 'CANCELADA', '', undefined]) {
            expect(accionesOrdenCompra(e).cancelar).toBe(false);
        }
    });

    it('cerrar saldo sólo desde RECIBIDA_PARCIALMENTE', () => {
        expect(accionesOrdenCompra('RECIBIDA_PARCIALMENTE').cerrarSaldo).toBe(true);
        expect(accionesOrdenCompra('RECIBIDA').cerrarSaldo).toBe(false);
        expect(accionesOrdenCompra('APROBADA').cerrarSaldo).toBe(false);
    });

    it('aprobar en BORRADOR/PENDIENTE y enviar sólo en APROBADA', () => {
        expect(accionesOrdenCompra('BORRADOR')).toMatchObject({ aprobar: true, enviar: false });
        expect(accionesOrdenCompra('PENDIENTE').aprobar).toBe(true);
        expect(accionesOrdenCompra('APROBADA')).toMatchObject({ aprobar: false, enviar: true });
    });
});

describe('etiquetaEstadoOrden / avisoTrasAprobar', () => {
    it('PENDIENTE se muestra «En aprobación»; el resto usa el catálogo', () => {
        expect(etiquetaEstadoOrden('PENDIENTE', 'Pendiente')).toBe('En aprobación');
        expect(etiquetaEstadoOrden('APROBADA', 'Aprobada')).toBe('Aprobada');
    });

    it('avisa «Enviada a aprobación» si la OC sigue PENDIENTE tras aprobar', () => {
        expect(avisoTrasAprobar('PENDIENTE')).toBe('Enviada a aprobación');
        expect(avisoTrasAprobar('APROBADA')).toBe('Orden de compra aprobada');
    });
});
