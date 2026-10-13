import { describe, expect, it } from 'vitest';
import { OrdenCompra } from '../../compras/models/orden-compra.model';
import { generarPLE08, lineaPLE08 } from './ple-libro08.util';

function orden(parcial: Partial<OrdenCompra> = {}): OrdenCompra {
    return {
        codigo: 'OC-2026-0001',
        proveedorId: 'prov-9',
        proveedorNombre: 'Ferretería El Sol SAC',
        fechaEmision: '2026-03-15T00:00:00',
        condicionPago: 'CONTADO',
        almacenDestino: 'ALM-01',
        estado: 'APROBADA',
        subtotal: 200,
        igv: 36,
        total: 236,
        ...parcial,
    };
}

const PERIODO = '20260300';

describe('lineaPLE08', () => {
    it('emite los 31 campos del libro 8 en el orden exigido por SUNAT', () => {
        const campos = lineaPLE08(orden(), 0, PERIODO).split('|');

        expect(campos).toHaveLength(31);
        expect(campos).toEqual([
            '20260300',   // 1  periodo
            '000001',     // 2  CUO
            '15/03/2026', // 3  fecha de emisión
            '',           // 4  fecha de vencimiento
            '01',         // 5  tipo de comprobante (factura)
            'OC',         // 6  serie
            '20260001',   // 7  número
            '6',          // 8  tipo de documento del proveedor (RUC)
            '',           // 9  número de documento
            'Ferretería El Sol SAC', // 10 razón social
            '200.00',     // 11 base imponible gravada
            '36.00',      // 12 IGV
            '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', // 13-19 otras bases
            '236.00',     // 20 importe total
            'PEN',        // 21 moneda
            '1.000',      // 22 tipo de cambio
            '', '', '',   // 23-25 comprobante que modifica
            '0',          // 26 detracción
            '0.00', '0.00', // 27-28 retención / percepción
            '1',          // 29 estado (vigente)
            '0', '0',     // 30-31 campos libres
        ]);
    });

    it('numera el CUO desde 1 según la posición en la lista', () => {
        expect(lineaPLE08(orden(), 8, PERIODO).split('|')[1]).toBe('000009');
    });

    it('marca la orden cancelada con estado 8', () => {
        expect(lineaPLE08(orden({ estado: 'CANCELADA' }), 0, PERIODO).split('|')[28]).toBe('8');
    });

    it('cae al id del proveedor cuando no llega su razón social', () => {
        const campos = lineaPLE08(orden({ proveedorNombre: undefined }), 0, PERIODO).split('|');
        expect(campos[9]).toBe('prov-9');
    });

    it('deja la razón social vacía cuando no hay ni nombre ni id', () => {
        const sinProveedor = orden({ proveedorNombre: undefined, proveedorId: undefined as unknown as string });
        expect(lineaPLE08(sinProveedor, 0, PERIODO).split('|')[9]).toBe('');
    });

    it('con un código sin guion deja el número vacío y usa el código como serie', () => {
        // `''` no es nullish, así que el `?? padded(indice)` del número NO se aplica:
        // se fija el comportamiento actual (ver observaciones).
        const campos = lineaPLE08(orden({ codigo: 'F001' }), 4, PERIODO).split('|');
        expect(campos[5]).toBe('F001');
        expect(campos[6]).toBe('');
    });

    it('sólo cuando el código falta del todo caen los defaults F001 / correlativo', () => {
        const campos = lineaPLE08(orden({ codigo: undefined as unknown as string }), 4, PERIODO).split('|');
        expect(campos[5]).toBe('F001');
        expect(campos[6]).toBe('00000005');
    });

    it('trata los importes ausentes como 0.00 y conserva el cero legítimo', () => {
        const sinImportes = lineaPLE08(orden({ subtotal: undefined, igv: undefined, total: undefined }), 0, PERIODO).split('|');
        expect([sinImportes[10], sinImportes[11], sinImportes[19]]).toEqual(['0.00', '0.00', '0.00']);

        const enCero = lineaPLE08(orden({ subtotal: 0, igv: 0, total: 0 }), 0, PERIODO).split('|');
        expect([enCero[10], enCero[11], enCero[19]]).toEqual(['0.00', '0.00', '0.00']);
    });

    it('deja la fecha vacía cuando la orden no la trae', () => {
        expect(lineaPLE08(orden({ fechaEmision: '' }), 0, PERIODO).split('|')[2]).toBe('');
    });
});

describe('generarPLE08', () => {
    it('separa las líneas con CRLF y no deja salto final', () => {
        const texto = generarPLE08([orden(), orden({ estado: 'CANCELADA' })], PERIODO);
        const lineas = texto.split('\r\n');

        expect(lineas).toHaveLength(2);
        expect(lineas[0].split('|')[1]).toBe('000001');
        expect(lineas[1].split('|')[1]).toBe('000002');
        expect(texto.endsWith('\r\n')).toBe(false);
    });

    it('sin órdenes devuelve texto vacío', () => {
        expect(generarPLE08([], PERIODO)).toBe('');
    });
});
