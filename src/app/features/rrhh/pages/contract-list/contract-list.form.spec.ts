import { describe, expect, it } from 'vitest';
import {
    contratoRequestDesdeForm,
    EstadoFiltrosContrato,
    filtrosDeContrato,
    ValoresFormularioContrato,
} from './contract-list.form';

const formularioCompleto: ValoresFormularioContrato = {
    employeeId: 12,
    tipoContrato: 'PLAZO_FIJO',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    salarioBase: 2500,
    moneda: 'USD',
    jornadaLaboral: 'COMPLETA',
    horasSemanales: 48,
    periodoPruebaMeses: 3,
    documentoContratoUrl: 'https://docs/contrato.pdf',
};

describe('contratoRequestDesdeForm', () => {
    it('con todo relleno traslada cada campo', () => {
        expect(contratoRequestDesdeForm(formularioCompleto)).toEqual({
            employeeId: 12,
            tipoContrato: 'PLAZO_FIJO',
            fechaInicio: '2026-01-01',
            fechaFin: '2026-12-31',
            salarioBase: 2500,
            moneda: 'USD',
            jornadaLaboral: 'COMPLETA',
            horasSemanales: 48,
            periodoPruebaMeses: 3,
            documentoContratoUrl: 'https://docs/contrato.pdf',
        });
    });

    it("fechaFin en '' es contrato indefinido: sale como undefined, no como cadena vacía", () => {
        expect(contratoRequestDesdeForm({ ...formularioCompleto, fechaFin: '' }).fechaFin)
            .toBeUndefined();
    });

    it('fechaFin en null también sale como undefined', () => {
        expect(contratoRequestDesdeForm({ ...formularioCompleto, fechaFin: null }).fechaFin)
            .toBeUndefined();
    });

    it("documentoContratoUrl en '' significa sin adjunto", () => {
        expect(
            contratoRequestDesdeForm({ ...formularioCompleto, documentoContratoUrl: '' })
                .documentoContratoUrl,
        ).toBeUndefined();
    });

    it('sin moneda elegida cae a PEN', () => {
        expect(contratoRequestDesdeForm({ ...formularioCompleto, moneda: null }).moneda).toBe('PEN');
    });

    it('periodoPruebaMeses ausente sale como undefined', () => {
        expect(
            contratoRequestDesdeForm({ ...formularioCompleto, periodoPruebaMeses: null })
                .periodoPruebaMeses,
        ).toBeUndefined();
    });

    it('un periodo de prueba de 0 meses es legítimo y NO se convierte en undefined', () => {
        expect(
            contratoRequestDesdeForm({ ...formularioCompleto, periodoPruebaMeses: 0 })
                .periodoPruebaMeses,
        ).toBe(0);
    });

    it('un salario base de 0 se conserva tal cual', () => {
        expect(contratoRequestDesdeForm({ ...formularioCompleto, salarioBase: 0 }).salarioBase).toBe(0);
    });
});

const filtrosVacios: EstadoFiltrosContrato = {
    search: '',
    status: '',
    type: '',
    jornadaLaboral: '',
    moneda: '',
    employeeId: null,
    departmentId: null,
};

describe('filtrosDeContrato', () => {
    it('sin filtros: todo texto vacío sale como undefined', () => {
        const f = filtrosDeContrato(filtrosVacios, 0, 20);
        expect(f.search).toBeUndefined();
        expect(f.status).toBeUndefined();
        expect(f.type).toBeUndefined();
        expect(f.jornadaLaboral).toBeUndefined();
        expect(f.moneda).toBeUndefined();
    });

    it('sin filtros: las FK en null se pasan tal cual y los rangos quedan undefined', () => {
        const f = filtrosDeContrato(filtrosVacios, 0, 20);
        expect(f.employeeId).toBeNull();
        expect(f.departmentId).toBeNull();
        expect(f.fechaInicioDesde).toBeUndefined();
        expect(f.fechaFinHasta).toBeUndefined();
    });

    it('la paginación siempre viaja', () => {
        const f = filtrosDeContrato(filtrosVacios, 4, 10);
        expect(f.page).toBe(4);
        expect(f.size).toBe(10);
    });

    it('con todo relleno traslada cada filtro', () => {
        const f = filtrosDeContrato(
            {
                search: 'quispe',
                status: 'ACTIVO',
                type: 'PLAZO_FIJO',
                jornadaLaboral: 'COMPLETA',
                moneda: 'PEN',
                employeeId: 12,
                departmentId: 3,
                fechaInicioDesde: '2026-01-01',
                fechaInicioHasta: '2026-06-30',
                fechaFinDesde: '2026-07-01',
                fechaFinHasta: '2026-12-31',
            },
            0,
            20,
        );
        expect(f.search).toBe('quispe');
        expect(f.status).toBe('ACTIVO');
        expect(f.type).toBe('PLAZO_FIJO');
        expect(f.jornadaLaboral).toBe('COMPLETA');
        expect(f.moneda).toBe('PEN');
        expect(f.employeeId).toBe(12);
        expect(f.departmentId).toBe(3);
        expect(f.fechaInicioDesde).toBe('2026-01-01');
        expect(f.fechaFinHasta).toBe('2026-12-31');
    });
});
