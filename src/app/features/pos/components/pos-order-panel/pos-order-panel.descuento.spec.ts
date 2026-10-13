import { describe, expect, it } from 'vitest';
import {
    estadoInicialDescuento, necesitaAutorizacion, porcentajeAAutorizar, porcentajeDescuentoTotal,
    porcentajeDescuentoGlobal, porcentajeEquivalente, tokenCubre,
} from './pos-order-panel.descuento';
import { CartItem, DescuentoTipo, ProductoCatalogoPOS } from '../../models/catalogo-pos.model';

const MAX = 10;

/** Descuento de una línea sin token previo: lo que antes decidía `requiereAutorizacionSupervisor`. */
function requiereAutorizacionSupervisor(
    tipo: DescuentoTipo, valor: number, linea: CartItem | undefined, max: number,
): boolean {
    return necesitaAutorizacion(porcentajeEquivalente(tipo, valor, linea), max, null);
}

function producto(precioFinal: number): ProductoCatalogoPOS {
    return {
        varianteId: 1,
        sku: 'SKU-1',
        nombre: 'Producto',
        nombreProducto: 'Producto',
        categoriaId: '1',
        categoria: 'General',
        precioBase: precioFinal,
        precioAjuste: 0,
        precioFinal,
        stockActual: 10,
        stockMinimo: 1,
    };
}

function item(parcial: Partial<CartItem> = {}): CartItem {
    return {
        variante: producto(100),
        cantidad: 1,
        subtotal: 100,
        descuentoTipo: 'NINGUNO',
        descuentoValor: 0,
        descuentoMonto: 0,
        autorizadoPor: null,
        bolsas: 0,
        ...parcial,
    };
}

describe('estadoInicialDescuento', () => {
    it('sin línea en el carrito abre en porcentaje y a cero', () => {
        expect(estadoInicialDescuento(undefined)).toEqual({ tipo: 'PORCENTAJE', valor: 0 });
    });

    it('una línea sin descuento (NINGUNO) abre en porcentaje: NINGUNO no es elegible', () => {
        expect(estadoInicialDescuento(item({ descuentoTipo: 'NINGUNO', descuentoValor: 0 })))
            .toEqual({ tipo: 'PORCENTAJE', valor: 0 });
    });

    it('reabrir muestra el descuento ya aplicado, para corregirlo y no re-teclearlo', () => {
        expect(estadoInicialDescuento(item({ descuentoTipo: 'MONTO', descuentoValor: 12.5 })))
            .toEqual({ tipo: 'MONTO', valor: 12.5 });
        expect(estadoInicialDescuento(item({ descuentoTipo: 'PORCENTAJE', descuentoValor: 7 })))
            .toEqual({ tipo: 'PORCENTAJE', valor: 7 });
    });

    it('un descuento con tipo NINGUNO pero valor residual conserva el valor', () => {
        // Comportamiento heredado: sólo se traduce el tipo, el valor se muestra tal cual.
        expect(estadoInicialDescuento(item({ descuentoTipo: 'NINGUNO', descuentoValor: 20 })))
            .toEqual({ tipo: 'PORCENTAJE', valor: 20 });
    });
});

describe('requiereAutorizacionSupervisor — descuento en porcentaje', () => {
    it('por debajo del techo lo aprueba el cajero', () => {
        expect(requiereAutorizacionSupervisor('PORCENTAJE', 5, item(), MAX)).toBe(false);
    });

    it('justo en el techo NO pide PIN: el límite es inclusivo', () => {
        expect(requiereAutorizacionSupervisor('PORCENTAJE', 10, item(), MAX)).toBe(false);
    });

    it('un punto por encima ya pide PIN', () => {
        expect(requiereAutorizacionSupervisor('PORCENTAJE', 10.01, item(), MAX)).toBe(true);
        expect(requiereAutorizacionSupervisor('PORCENTAJE', 50, item(), MAX)).toBe(true);
    });

    it('en porcentaje no necesita la línea para decidir', () => {
        expect(requiereAutorizacionSupervisor('PORCENTAJE', 5, undefined, MAX)).toBe(false);
        expect(requiereAutorizacionSupervisor('PORCENTAJE', 99, undefined, MAX)).toBe(true);
    });
});

describe('requiereAutorizacionSupervisor — descuento en soles', () => {
    it('convierte el importe a porcentaje del bruto de la línea', () => {
        // S/ 5 sobre 2 × S/ 100 = 2,5 % → pasa.
        expect(requiereAutorizacionSupervisor('MONTO', 5, item({ cantidad: 2 }), MAX)).toBe(false);
        // Los mismos S/ 5 sobre 1 × S/ 20 = 25 % → no pasa.
        expect(requiereAutorizacionSupervisor('MONTO', 5, item({ variante: producto(20) }), MAX)).toBe(true);
    });

    it('el equivalente exacto al techo NO pide PIN', () => {
        // S/ 10 sobre S/ 100 = 10 % justo.
        expect(requiereAutorizacionSupervisor('MONTO', 10, item(), MAX)).toBe(false);
        expect(requiereAutorizacionSupervisor('MONTO', 10.5, item(), MAX)).toBe(true);
    });

    it('un descuento de 0 nunca pide PIN', () => {
        expect(requiereAutorizacionSupervisor('MONTO', 0, item(), MAX)).toBe(false);
    });

    it('sin la línea en el carrito pide PIN: no hay bruto contra el que medir', () => {
        expect(requiereAutorizacionSupervisor('MONTO', 1, undefined, MAX)).toBe(true);
    });

    it('con bruto 0 pide PIN aunque el importe sea ridículo', () => {
        // Producto gratis: cualquier rebaja es infinitamente mayor que el bruto.
        expect(requiereAutorizacionSupervisor('MONTO', 0.01, item({ variante: producto(0) }), MAX)).toBe(true);
        // Y también con cantidad 0, que da el mismo bruto.
        expect(requiereAutorizacionSupervisor('MONTO', 1, item({ cantidad: 0 }), MAX)).toBe(true);
    });

    it('el tipo NINGUNO recorre la misma rama que MONTO', () => {
        // Defensa heredada: sólo PORCENTAJE tiene atajo, todo lo demás se mide contra el bruto.
        expect(requiereAutorizacionSupervisor('NINGUNO', 1, item(), MAX)).toBe(false);
        expect(requiereAutorizacionSupervisor('NINGUNO', 99, item(), MAX)).toBe(true);
    });
});

describe('porcentajeDescuentoGlobal', () => {
    it('es el descuento sobre la suma de líneas ya con su descuento', () => {
        // Línea de S/ 100 con S/ 20 de descuento propio → base 80; S/ 8 global = 10 %.
        expect(porcentajeDescuentoGlobal(8, [item({ subtotal: 80 })])).toBeCloseTo(10);
    });

    it('sin descuento global es 0, aunque no haya líneas', () => {
        expect(porcentajeDescuentoGlobal(0, [])).toBe(0);
    });

    it('sin base contra la que medir es 100 %', () => {
        expect(porcentajeDescuentoGlobal(5, [])).toBe(100);
        expect(porcentajeDescuentoGlobal(5, [item({ subtotal: 0 })])).toBe(100);
    });
});

describe('porcentajeDescuentoTotal', () => {
    it('sin descuentos es 0', () => {
        expect(porcentajeDescuentoTotal([item()], 0)).toBe(0);
    });

    it('suma líneas (porcentaje y monto) y global sobre el bruto, como el servidor', () => {
        const lineas = [
            item({ descuentoTipo: 'PORCENTAJE', descuentoValor: 5, descuentoMonto: 5, subtotal: 95 }),
            item({ descuentoTipo: 'MONTO', descuentoValor: 30, descuentoMonto: 30, subtotal: 70 }),
        ];
        // Bruto 200; líneas rebajan 35 y el global 10: 45/200 = 22,5 %.
        expect(porcentajeDescuentoTotal(lineas, 10)).toBeCloseTo(22.5);
        // 10 % por línea + 10 % global no es 10 %: es 19 % del bruto.
        expect(porcentajeDescuentoTotal([item({ descuentoTipo: 'PORCENTAJE', descuentoValor: 10, descuentoMonto: 10, subtotal: 90 })], 9))
            .toBeCloseTo(19);
    });

    it('ignora una línea NINGUNO con valor residual', () => {
        expect(porcentajeDescuentoTotal([item({ descuentoTipo: 'NINGUNO', descuentoValor: 50 })], 0)).toBe(0);
    });
});

describe('porcentajeAAutorizar', () => {
    it('redondea hacia arriba a 2 decimales para que el token nunca quede corto', () => {
        expect(porcentajeAAutorizar(33.3333)).toBe(33.34);
        expect(porcentajeAAutorizar(10)).toBe(10);
    });
});

describe('tokenCubre / necesitaAutorizacion', () => {
    it('sin token no cubre; con token cubre hasta su porcentaje, inclusive', () => {
        expect(tokenCubre(null, 1)).toBe(false);
        expect(tokenCubre({ porcentaje: 20 }, 20)).toBe(true);
        expect(tokenCubre({ porcentaje: 20 }, 20.01)).toBe(false);
    });

    it('un token vigente que cubre el descuento evita pedir otro PIN', () => {
        expect(necesitaAutorizacion(15, MAX, null)).toBe(true);
        expect(necesitaAutorizacion(15, MAX, { porcentaje: 20 })).toBe(false);
        expect(necesitaAutorizacion(25, MAX, { porcentaje: 20 })).toBe(true);
        expect(necesitaAutorizacion(MAX, MAX, null)).toBe(false);
    });
});
