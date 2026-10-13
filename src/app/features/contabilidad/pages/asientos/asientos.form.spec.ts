import { describe, expect, it } from 'vitest';
import { CabeceraAsientoForm, LineaAsientoForm, construirAsientoRequest, construirMovimientos } from './asientos.form';

function linea(parcial: Partial<LineaAsientoForm> = {}): LineaAsientoForm {
    return {
        cuentaId: 'cta-1',
        codigoCuenta: '1041',
        nombreCuenta: 'Cuentas corrientes operativas',
        debe: 100,
        haber: 0,
        glosa: '',
        ...parcial,
    };
}

const cabecera: CabeceraAsientoForm = {
    fecha: '2026-03-15',
    glosa: 'Cobranza de factura F001-45',
    tipo: 'MANUAL',
};

describe('construirMovimientos', () => {
    it('mapea una línea completa con su propia glosa', () => {
        const movs = construirMovimientos([linea({ glosa: 'Depósito en cuenta' })], cabecera.glosa);

        expect(movs).toEqual([{
            cuentaId: 'cta-1',
            codigoCuenta: '1041',
            debe: 100,
            haber: 0,
            glosa: 'Depósito en cuenta',
        }]);
    });

    it('hereda la glosa de la cabecera cuando la línea no trae la suya', () => {
        expect(construirMovimientos([linea()], cabecera.glosa)[0].glosa).toBe('Cobranza de factura F001-45');
    });

    it('descarta la fila sin cuenta elegida aunque tenga importe', () => {
        expect(construirMovimientos([linea({ cuentaId: '', debe: 250 })], cabecera.glosa)).toEqual([]);
    });

    it('descarta la fila con cuenta pero sin importe en ninguna columna', () => {
        expect(construirMovimientos([linea({ debe: 0, haber: 0 })], cabecera.glosa)).toEqual([]);
    });

    it('acepta la fila que sólo tiene haber', () => {
        const movs = construirMovimientos([linea({ debe: 0, haber: 100 })], cabecera.glosa);
        expect(movs).toHaveLength(1);
        expect(movs[0]).toMatchObject({ debe: 0, haber: 100 });
    });

    it('numeriza los importes que el input entrega como cadena', () => {
        const cruda = { ...linea(), debe: '150.75' as unknown as number, haber: '' as unknown as number };
        expect(construirMovimientos([cruda], cabecera.glosa)[0]).toMatchObject({ debe: 150.75, haber: 0 });
    });

    it('trata un importe no numérico como cero, así que la fila se descarta', () => {
        const cruda = { ...linea(), debe: 'abc' as unknown as number, haber: 0 };
        expect(construirMovimientos([cruda], cabecera.glosa)).toEqual([]);
    });

    it('descarta un importe negativo: en partida doble el signo lo da la columna', () => {
        expect(construirMovimientos([linea({ debe: -100, haber: 0 })], cabecera.glosa)).toEqual([]);
    });

    it('conserva el orden de las filas válidas y omite las intermedias vacías', () => {
        const movs = construirMovimientos(
            [linea({ codigoCuenta: '1041' }), linea({ cuentaId: '', codigoCuenta: '' }), linea({ codigoCuenta: '7011', debe: 0, haber: 100 })],
            cabecera.glosa,
        );
        expect(movs.map(m => m.codigoCuenta)).toEqual(['1041', '7011']);
    });

    it('devuelve lista vacía si no hay líneas', () => {
        expect(construirMovimientos([], cabecera.glosa)).toEqual([]);
    });
});

describe('construirAsientoRequest', () => {
    it('arma el asiento con origen MANUAL y la empresa activa en companyId y tenantId', () => {
        const req = construirAsientoRequest(cabecera, [linea()], 'per-2026-03', 7);

        expect(req).toEqual({
            fecha: '2026-03-15',
            glosa: 'Cobranza de factura F001-45',
            tipo: 'MANUAL',
            origen: 'MANUAL',
            periodoId: 'per-2026-03',
            companyId: '7',
            tenantId: '7',
            movimientos: [{
                cuentaId: 'cta-1',
                codigoCuenta: '1041',
                debe: 100,
                haber: 0,
                glosa: 'Cobranza de factura F001-45',
            }],
        });
    });

    it('cae a la empresa 1 cuando no hay empresa activa', () => {
        expect(construirAsientoRequest(cabecera, [], '', undefined).companyId).toBe('1');
        expect(construirAsientoRequest(cabecera, [], '', null).tenantId).toBe('1');
    });

    it('conserva el 0 como empresa: sólo null/undefined caen al default', () => {
        expect(construirAsientoRequest(cabecera, [], '', 0).companyId).toBe('0');
    });

    it('acepta la empresa ya en texto sin volverla a envolver', () => {
        expect(construirAsientoRequest(cabecera, [], '', '12').companyId).toBe('12');
    });
});
