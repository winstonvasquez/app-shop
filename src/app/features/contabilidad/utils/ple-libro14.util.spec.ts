import { describe, expect, it } from 'vitest';
import { VentaPLE, generarPLE14, lineaPLE14 } from './ple-libro14.util';

function venta(parcial: Partial<VentaPLE> = {}): VentaPLE {
    return {
        id: 1,
        fecha: '2026-03-15T00:00:00',
        tipoComprobante: 'FACTURA',
        serie: 'F001',
        numero: '00000045',
        rucCliente: '20123456789',
        razonSocial: 'Distribuidora Andina SAC',
        baseImponible: 100,
        igv: 18,
        total: 118,
        estado: 'EMITIDO',
        ...parcial,
    };
}

const PERIODO = '20260300';

describe('lineaPLE14', () => {
    it('emite los 29 campos del libro 14 en el orden exigido por SUNAT', () => {
        const campos = lineaPLE14(venta(), 0, PERIODO).split('|');

        expect(campos).toHaveLength(29);
        expect(campos).toEqual([
            '20260300',     // 1  periodo
            '000001',       // 2  CUO
            'M001',         // 3  correlativo del asiento
            '01',           // 4  tipo de comprobante (factura)
            'F001',         // 5  serie
            '00000045',     // 6  número
            '15/03/2026',   // 7  fecha de emisión
            '',             // 8  fecha de vencimiento
            '6',            // 9  tipo de documento del cliente (RUC)
            '20123456789',  // 10 número de documento
            'Distribuidora Andina SAC', // 11 razón social
            '0.00',         // 12 valor facturado de la exportación
            '100.00',       // 13 base imponible gravada
            '0.00',         // 14 descuento de la base
            '18.00',        // 15 IGV
            '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', // 16-21 exonerada/inafecta/ISC/otros
            '118.00',       // 22 importe total
            '1.000',        // 23 tipo de cambio
            '', '', '', '', // 24-27 comprobante que modifica
            '1',            // 28 estado (registrado)
            '',             // 29 campo libre
        ]);
    });

    it('numera CUO y correlativo desde 1 según la posición en la lista', () => {
        const campos = lineaPLE14(venta(), 11, PERIODO).split('|');
        expect(campos[1]).toBe('000012');
        expect(campos[2]).toBe('M012');
    });

    it('usa el código 03 para la boleta', () => {
        expect(lineaPLE14(venta({ tipoComprobante: 'BOLETA' }), 0, PERIODO).split('|')[3]).toBe('03');
    });

    it('informa 00 cuando el comprobante no es factura ni boleta', () => {
        expect(lineaPLE14(venta({ tipoComprobante: 'NOTA_CREDITO' }), 0, PERIODO).split('|')[3]).toBe('00');
    });

    it('marca DNI cuando el documento del cliente no tiene 11 dígitos', () => {
        const campos = lineaPLE14(venta({ rucCliente: '45678912' }), 0, PERIODO).split('|');
        expect(campos[8]).toBe('1');
        expect(campos[9]).toBe('45678912');
    });

    it('marca el comprobante anulado con estado 8', () => {
        expect(lineaPLE14(venta({ estado: 'ANULADO' }), 0, PERIODO).split('|')[27]).toBe('8');
    });

    it('rellena con vacíos y ceros los campos que el backend no envía', () => {
        const incompleta = venta({
            serie: undefined as unknown as string,
            numero: undefined as unknown as string,
            rucCliente: undefined as unknown as string,
            razonSocial: undefined as unknown as string,
            baseImponible: undefined as unknown as number,
            igv: undefined as unknown as number,
            total: undefined as unknown as number,
            fecha: '',
        });
        const campos = lineaPLE14(incompleta, 0, PERIODO).split('|');

        expect(campos[4]).toBe('');      // serie
        expect(campos[5]).toBe('');      // número
        expect(campos[6]).toBe('');      // fecha
        expect(campos[8]).toBe('1');     // sin documento se informa DNI
        expect(campos[9]).toBe('');      // documento
        expect(campos[10]).toBe('');     // razón social
        expect(campos[12]).toBe('0.00'); // base
        expect(campos[14]).toBe('0.00'); // IGV
        expect(campos[21]).toBe('0.00'); // total
        expect(campos).toHaveLength(29); // el número de campos NO depende de los datos
    });

    it('conserva el importe cero, que es un dato y no un hueco', () => {
        const campos = lineaPLE14(venta({ baseImponible: 0, igv: 0, total: 0 }), 0, PERIODO).split('|');
        expect([campos[12], campos[14], campos[21]]).toEqual(['0.00', '0.00', '0.00']);
    });
});

describe('generarPLE14', () => {
    it('separa las líneas con CRLF y no deja salto final', () => {
        const texto = generarPLE14([venta(), venta({ estado: 'ANULADO' })], PERIODO);
        const lineas = texto.split('\r\n');

        expect(lineas).toHaveLength(2);
        expect(lineas[0].split('|')[1]).toBe('000001');
        expect(lineas[1].split('|')[1]).toBe('000002');
        expect(texto.endsWith('\r\n')).toBe(false);
    });

    it('sin ventas devuelve texto vacío', () => {
        expect(generarPLE14([], PERIODO)).toBe('');
    });
});
