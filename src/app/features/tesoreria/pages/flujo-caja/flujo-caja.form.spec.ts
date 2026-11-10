import { describe, expect, it } from 'vitest';
import { FinancialMovement } from '../../models/tesoreria.model';
import {
    opcionesTransferencia, esAnulable, esMovimientoManual, idsAnulados, motivoAnulacionValido,
    construirTransferenciaRequest, transferenciaMismoOrigenYDestino, ValoresFormularioTransferencia
} from './flujo-caja.form';

const base: ValoresFormularioTransferencia = {
    origenTipo: 'CAJA', origenId: 1, destinoTipo: 'BANCO', destinoId: 1,
    monto: 150, moneda: 'USD', fecha: '2026-11-10', descripcion: ' Depósito del día ',
};

describe('transferenciaMismoOrigenYDestino', () => {
    it('mismo id pero distinto tipo (caja 1 → banco 1) es válido', () => {
        expect(transferenciaMismoOrigenYDestino(base)).toBe(false);
    });

    it('mismo tipo e id es inválido', () => {
        expect(transferenciaMismoOrigenYDestino({ ...base, destinoTipo: 'CAJA' })).toBe(true);
    });

    it('sin origen elegido no se marca (lo cubre el required)', () => {
        expect(transferenciaMismoOrigenYDestino({ ...base, origenId: null, destinoId: null, destinoTipo: 'CAJA' })).toBe(false);
    });
});

describe('construirTransferenciaRequest', () => {
    it('copia los campos, recorta la descripción y pone el tenant del JWT', () => {
        expect(construirTransferenciaRequest(base, 4)).toEqual({
            tenantId: 4, origenTipo: 'CAJA', origenId: 1, destinoTipo: 'BANCO', destinoId: 1,
            monto: 150, moneda: 'USD', fecha: '2026-11-10', descripcion: 'Depósito del día',
        });
    });

    it('sin moneda cae a PEN y omite fecha/descripcion vacías', () => {
        const r = construirTransferenciaRequest({ ...base, moneda: null, fecha: '', descripcion: '  ' }, 1);
        expect(r.moneda).toBe('PEN');
        expect(r.fecha).toBeUndefined();
        expect(r.descripcion).toBeUndefined();
    });
});

const mov = (o: Partial<FinancialMovement>): FinancialMovement => ({
    id: 1, tipoMovimiento: 'INGRESO', origen: 'CAJA', monto: 10, moneda: 'PEN', fecha: '2026-11-10', descripcion: 'x', ...o,
});

describe('anulación de movimientos', () => {
    it('un movimiento manual de caja es anulable', () => {
        expect(esAnulable(mov({ referencia: 'MAN-1' }), new Set())).toBe(true);
    });

    it('cobros, pagos, traspasos, ajustes y anulaciones no son manuales', () => {
        expect(esMovimientoManual(mov({ origen: 'COBRO' }))).toBe(false);
        expect(esMovimientoManual(mov({ origen: 'PAGO' }))).toBe(false);
        expect(esMovimientoManual(mov({ tipoMovimiento: 'TRANSFERENCIA' }))).toBe(false);
        for (const referencia of ['TRF-1', 'ANUL-1', 'CIERRE-2-9', 'APERT-2-9', 'PAGO-5']) {
            expect(esMovimientoManual(mov({ referencia }))).toBe(false);
        }
    });

    it('un movimiento con contramovimiento ANUL- ya no es anulable', () => {
        const lista = [mov({ id: 7 }), mov({ id: 8, tipoMovimiento: 'EGRESO', referencia: 'ANUL-7', relacionadoId: 7 })];
        const anulados = idsAnulados(lista);
        expect(anulados.has(7)).toBe(true);
        expect(esAnulable(lista[0], anulados)).toBe(false);
    });

    it('el motivo es obligatorio y de hasta 300 caracteres', () => {
        expect(motivoAnulacionValido('  ')).toBeNull();
        expect(motivoAnulacionValido(null)).toBeNull();
        expect(motivoAnulacionValido(' error de digitación ')).toBe('error de digitación');
        expect(motivoAnulacionValido('a'.repeat(301))).toBeNull();
    });
});

describe('opcionesTransferencia', () => {
    const todas = [
        { value: 1, label: 'Caja A', moneda: 'PEN', abierta: true },
        { value: 2, label: 'Caja B (cerrada)', moneda: 'PEN', abierta: false },
        { value: 3, label: 'Caja USD', moneda: 'USD', abierta: true },
    ];

    it('las cajas ofrecen sólo abiertas de la moneda elegida', () => {
        expect(opcionesTransferencia(todas, 'CAJA', 'PEN').map(o => o.value)).toEqual([1]);
    });

    it('las cuentas no se filtran por estado de caja, sí por moneda', () => {
        expect(opcionesTransferencia(todas, 'BANCO', 'PEN').map(o => o.value)).toEqual([1, 2]);
    });

    it('excluye el origen ya elegido', () => {
        expect(opcionesTransferencia(todas, 'BANCO', 'PEN', 1).map(o => o.value)).toEqual([2]);
    });
});
