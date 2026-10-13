import { describe, expect, it } from 'vitest';
import { CarritoParaVenta, construirVentaPosRequest, errorFacturaSinRuc, tipoDocSunat } from './pos-page.venta-request';
import { CartItem, ProductoCatalogoPOS } from '../../models/catalogo-pos.model';

function producto(varianteId: number): ProductoCatalogoPOS {
    return {
        varianteId,
        sku: `SKU-${varianteId}`,
        nombre: 'Producto',
        nombreProducto: 'Producto',
        categoriaId: '1',
        categoria: 'General',
        precioBase: 10,
        precioAjuste: 0,
        precioFinal: 10,
        stockActual: 5,
        stockMinimo: 1,
    };
}

function item(parcial: Partial<CartItem> = {}): CartItem {
    return {
        variante: producto(1),
        cantidad: 1,
        subtotal: 10,
        descuentoTipo: 'NINGUNO',
        descuentoValor: 0,
        descuentoMonto: 0,
        autorizadoPor: null,
        bolsas: 0,
        ...parcial,
    };
}

function carrito(parcial: Partial<CarritoParaVenta> = {}): CarritoParaVenta {
    return {
        turnoCajaId: 7,
        items: [item()],
        pagoDividido: false,
        pagos: [{ metodo: 'EFECTIVO', monto: 0 }, { metodo: 'YAPE', monto: 0 }],
        giftCardCodigo: '',
        metodoPagoPrimario: 'EFECTIVO',
        tipoCpe: 'BOLETA',
        clienteId: null,
        clienteNombre: '',
        clienteTipoDoc: '0',
        clienteNumeroDoc: '',
        giftCardCubreTodo: false,
        descuento: 0,
        montoRecibido: 0,
        ...parcial,
    };
}

describe('construirVentaPosRequest — carrito mínimo', () => {
    it('omite TODO lo opcional que está en su valor por defecto', () => {
        const req = construirVentaPosRequest(carrito());

        expect(req.turnoCajaId).toBe(7);
        expect(req.metodoPago).toBe('EFECTIVO');
        expect(req.tipoCpe).toBe('BOLETA');
        // Ninguno de estos viaja como 0 ni como '': el backend distingue «no informado».
        expect(req.clienteId).toBeUndefined();
        expect(req.clienteNombre).toBeUndefined();
        expect(req.descuento).toBeUndefined();
        expect(req.montoRecibido).toBeUndefined();
        expect(req.pagos).toBeUndefined();
        expect(req.items).toEqual([
            {
                varianteId: 1,
                cantidad: 1,
                descuentoTipo: undefined,
                descuentoValor: undefined,
                autorizadoPor: undefined,
                bolsas: undefined,
            },
        ]);
    });

    it('rellena todo lo opcional cuando el cajero lo informó', () => {
        const req = construirVentaPosRequest(carrito({
            items: [item({
                descuentoTipo: 'PORCENTAJE',
                descuentoValor: 15,
                autorizadoPor: 42,
                bolsas: 3,
                cantidad: 2,
            })],
            metodoPagoPrimario: 'TARJETA',
            tipoCpe: 'FACTURA',
            clienteId: 99,
            clienteNombre: 'ACME S.A.C.',
            descuento: 5,
            montoRecibido: 50,
        }));

        expect(req.metodoPago).toBe('TARJETA');
        expect(req.tipoCpe).toBe('FACTURA');
        expect(req.clienteId).toBe(99);
        expect(req.clienteNombre).toBe('ACME S.A.C.');
        expect(req.descuento).toBe(5);
        expect(req.montoRecibido).toBe(50);
        expect(req.items[0]).toEqual({
            varianteId: 1,
            cantidad: 2,
            descuentoTipo: 'PORCENTAJE',
            descuentoValor: 15,
            autorizadoPor: 42,
            bolsas: 3,
        });
    });
});

describe('construirVentaPosRequest — bordes de cada campo opcional', () => {
    it('autorizadoPor 0 SÍ viaja: es un id, no un valor por defecto', () => {
        // Si aquí se usara `||` en vez de `??`, el supervisor con id 0 se perdería.
        const req = construirVentaPosRequest(carrito({ items: [item({ autorizadoPor: 0 })] }));
        expect(req.items[0].autorizadoPor).toBe(0);
    });

    it('clienteId 0 SÍ viaja, clienteId null no', () => {
        expect(construirVentaPosRequest(carrito({ clienteId: 0 })).clienteId).toBe(0);
        expect(construirVentaPosRequest(carrito({ clienteId: null })).clienteId).toBeUndefined();
    });

    it('descuentoTipo NINGUNO no viaja aunque haya valor', () => {
        const req = construirVentaPosRequest(carrito({
            items: [item({ descuentoTipo: 'NINGUNO', descuentoValor: 20 })],
        }));
        expect(req.items[0].descuentoTipo).toBeUndefined();
        // El valor sí sobrevive por sí solo: sólo se filtra por > 0.
        expect(req.items[0].descuentoValor).toBe(20);
    });

    it('descuentoValor 0 y bolsas 0 se omiten', () => {
        const req = construirVentaPosRequest(carrito({
            items: [item({ descuentoTipo: 'MONTO', descuentoValor: 0, bolsas: 0 })],
        }));
        expect(req.items[0].descuentoTipo).toBe('MONTO');
        expect(req.items[0].descuentoValor).toBeUndefined();
        expect(req.items[0].bolsas).toBeUndefined();
    });

    it('mapea todas las líneas del carrito, no sólo la primera', () => {
        const req = construirVentaPosRequest(carrito({
            items: [item(), item({ variante: producto(2), cantidad: 4 })],
        }));
        expect(req.items.map(i => i.varianteId)).toEqual([1, 2]);
        expect(req.items[1].cantidad).toBe(4);
    });
});

describe('construirVentaPosRequest — gift card', () => {
    it('gift card que cubre todo: GIFT_CARD, código presente y sin monto recibido ni pagos', () => {
        const req = construirVentaPosRequest(carrito({
            giftCardCodigo: 'GC-0001',
            giftCardCubreTodo: true,
            metodoPagoPrimario: 'YAPE',
            montoRecibido: 50,
            pagoDividido: true,
            pagos: [{ metodo: 'EFECTIVO', monto: 5 }, { metodo: 'YAPE', monto: 5 }],
        }));
        expect(req.metodoPago).toBe('GIFT_CARD');
        expect(req.giftCardCodigo).toBe('GC-0001');
        expect(req.montoRecibido).toBeUndefined();
        expect(req.pagos).toBeUndefined();
    });

    it('gift card parcial + efectivo: método EFECTIVO (el del resto) y código presente', () => {
        const req = construirVentaPosRequest(carrito({
            giftCardCodigo: 'GC-0001',
            giftCardCubreTodo: false,
            metodoPagoPrimario: 'EFECTIVO',
            montoRecibido: 20,
        }));
        expect(req.metodoPago).toBe('EFECTIVO');
        expect(req.giftCardCodigo).toBe('GC-0001');
        expect(req.montoRecibido).toBe(20);
    });

    it('gift card parcial + pago dividido: pagos del resto, sin GIFT_CARD dentro', () => {
        const req = construirVentaPosRequest(carrito({
            giftCardCodigo: 'GC-0001',
            pagoDividido: true,
            metodoPagoPrimario: 'MIXTO',
            pagos: [{ metodo: 'EFECTIVO', monto: 10 }, { metodo: 'YAPE', monto: 5 }],
        }));
        expect(req.metodoPago).toBe('MIXTO');
        expect(req.giftCardCodigo).toBe('GC-0001');
        expect(req.pagos?.map(p => p.metodo)).toEqual(['EFECTIVO', 'YAPE']);
    });

    it('sin gift card no viaja código', () => {
        expect(construirVentaPosRequest(carrito()).giftCardCodigo).toBeUndefined();
    });

    it('código vacío no pisa el método elegido por el cajero', () => {
        const req = construirVentaPosRequest(carrito({ giftCardCodigo: '', metodoPagoPrimario: 'PLIN' }));
        expect(req.metodoPago).toBe('PLIN');
    });
});

describe('construirVentaPosRequest — documento del cliente', () => {
    it('envía tipo y número de documento; sin número, no viaja', () => {
        const con = construirVentaPosRequest(carrito({ clienteTipoDoc: '6', clienteNumeroDoc: '20123456789' }));
        expect(con.clienteTipoDoc).toBe('6');
        expect(con.clienteNumeroDoc).toBe('20123456789');
        expect(construirVentaPosRequest(carrito()).clienteNumeroDoc).toBeUndefined();
    });
});

describe('tipoDocSunat', () => {
    it('RUC→6, DNI→1, cualquier otro o vacío→0', () => {
        expect(tipoDocSunat('RUC')).toBe('6');
        expect(tipoDocSunat('dni')).toBe('1');
        expect(tipoDocSunat('CE')).toBe('0');
        expect(tipoDocSunat('')).toBe('0');
        expect(tipoDocSunat(undefined)).toBe('0');
    });
});

describe('errorFacturaSinRuc', () => {
    it('BOLETA nunca bloquea', () => {
        expect(errorFacturaSinRuc('BOLETA', '0', '')).toBeNull();
    });
    it('FACTURA sin RUC de 11 dígitos bloquea con mensaje', () => {
        expect(errorFacturaSinRuc('FACTURA', '0', '')).toContain('RUC');
        expect(errorFacturaSinRuc('FACTURA', '1', '12345678')).toContain('RUC');
        expect(errorFacturaSinRuc('FACTURA', '6', '2012345678')).toContain('RUC');
    });
    it('FACTURA con RUC válido pasa', () => {
        expect(errorFacturaSinRuc('FACTURA', '6', '20123456789')).toBeNull();
    });
});

describe('construirVentaPosRequest — pago dividido', () => {
    it('el monto recibido es la SUMA de los pagos, no lo tecleado en efectivo', () => {
        const req = construirVentaPosRequest(carrito({
            pagoDividido: true,
            montoRecibido: 999,
            pagos: [{ metodo: 'EFECTIVO', monto: 30 }, { metodo: 'YAPE', monto: 20.5 }],
        }));
        expect(req.montoRecibido).toBe(50.5);
    });

    it('sólo viajan los pagos con monto > 0', () => {
        const req = construirVentaPosRequest(carrito({
            pagoDividido: true,
            pagos: [
                { metodo: 'EFECTIVO', monto: 30 },
                { metodo: 'YAPE', monto: 0 },
                { metodo: 'TARJETA', monto: 10 },
            ],
        }));
        expect(req.pagos).toEqual([
            { metodo: 'EFECTIVO', monto: 30 },
            { metodo: 'TARJETA', monto: 10 },
        ]);
    });

    it('pago dividido con todos los montos en 0: suma 0 y NO se omite', () => {
        // 0 aquí no es «no informado»: es el resultado real de sumar. Va explícito.
        const req = construirVentaPosRequest(carrito({
            pagoDividido: true,
            pagos: [{ metodo: 'EFECTIVO', monto: 0 }, { metodo: 'YAPE', monto: 0 }],
        }));
        expect(req.montoRecibido).toBe(0);
        expect(req.pagos).toEqual([]);
    });

    it('sin pago dividido los pagos no viajan y el monto recibido 0 se omite', () => {
        const req = construirVentaPosRequest(carrito({
            pagoDividido: false,
            montoRecibido: 0,
            pagos: [{ metodo: 'EFECTIVO', monto: 30 }],
        }));
        expect(req.pagos).toBeUndefined();
        expect(req.montoRecibido).toBeUndefined();
    });
});
