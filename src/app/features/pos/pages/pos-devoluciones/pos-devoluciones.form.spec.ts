import { describe, expect, it } from 'vitest';
import { LineaDevolucion, construirDevolucionRequest } from './pos-devoluciones.form';
import { DetalleVentaPosResponse } from '../../models/venta-pos.model';

function detalle(id: number): DetalleVentaPosResponse {
    return {
        id,
        varianteId: id * 10,
        varianteSku: `SKU-${id}`,
        varianteNombre: 'Producto',
        cantidad: 4,
        precioUnitario: 25,
        subtotalLinea: 100,
        descuentoTipo: 'NINGUNO',
        descuentoValor: 0,
        descuentoMonto: 0,
    };
}

function linea(id: number, parcial: Partial<LineaDevolucion> = {}): LineaDevolucion {
    return {
        detalle: detalle(id),
        seleccionada: false,
        cantidadDevuelta: 0,
        maxDevolvible: 4,
        montoDevuelto: 0,
        ...parcial,
    };
}

const SELECCIONADA = linea(1, { seleccionada: true, cantidadDevuelta: 2, montoDevuelto: 50 });

describe('construirDevolucionRequest — casos que bloquean la emisión', () => {
    it('sin motivo no hay nota de crédito', () => {
        expect(construirDevolucionRequest({ motivo: '' }, [SELECCIONADA])).toBeNull();
    });

    it('motivo ausente o null se trata igual que vacío', () => {
        expect(construirDevolucionRequest({}, [SELECCIONADA])).toBeNull();
        expect(construirDevolucionRequest({ motivo: null }, [SELECCIONADA])).toBeNull();
    });

    it('sin líneas seleccionadas no hay nada que devolver', () => {
        expect(construirDevolucionRequest({ motivo: 'DEFECTUOSO' }, [])).toBeNull();
        expect(construirDevolucionRequest({ motivo: 'DEFECTUOSO' }, [linea(1)])).toBeNull();
    });

    it('una línea marcada pero con cantidad 0 NO cuenta como devolución', () => {
        const marcadaSinCantidad = linea(1, { seleccionada: true, cantidadDevuelta: 0 });
        expect(construirDevolucionRequest({ motivo: 'DEFECTUOSO' }, [marcadaSinCantidad])).toBeNull();
    });

    it('una línea con cantidad pero SIN marcar tampoco cuenta', () => {
        const conCantidadSinMarcar = linea(1, { seleccionada: false, cantidadDevuelta: 3 });
        expect(construirDevolucionRequest({ motivo: 'DEFECTUOSO' }, [conCantidadSinMarcar])).toBeNull();
    });
});

describe('construirDevolucionRequest — cuerpo emitido', () => {
    it('envía sólo las líneas marcadas con cantidad, con su id de detalle', () => {
        const req = construirDevolucionRequest({ motivo: 'DEFECTUOSO' }, [
            SELECCIONADA,
            linea(2),
            linea(3, { seleccionada: true, cantidadDevuelta: 1 }),
            linea(4, { seleccionada: true, cantidadDevuelta: 0 }),
        ]);

        expect(req).toEqual({
            motivo: 'DEFECTUOSO',
            observaciones: undefined,
            lineas: [
                { detalleVentaPosId: 1, cantidadDevuelta: 2 },
                { detalleVentaPosId: 3, cantidadDevuelta: 1 },
            ],
        });
    });

    it('las observaciones en blanco viajan como undefined, no como cadena vacía', () => {
        expect(construirDevolucionRequest({ motivo: 'X', observaciones: '' }, [SELECCIONADA])?.observaciones)
            .toBeUndefined();
        expect(construirDevolucionRequest({ motivo: 'X' }, [SELECCIONADA])?.observaciones)
            .toBeUndefined();
    });

    it('las observaciones escritas se conservan tal cual', () => {
        const req = construirDevolucionRequest(
            { motivo: 'X', observaciones: 'Caja abollada en el traslado' },
            [SELECCIONADA],
        );
        expect(req?.observaciones).toBe('Caja abollada en el traslado');
    });
});
