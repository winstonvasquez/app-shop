import { describe, expect, it } from 'vitest';
import { Payroll } from '../../models/payroll.model';
import {
    boletaRequestDesdeForm,
    formularioDesdeBoleta,
    ValoresFormularioBoleta,
} from './payroll.form';

const formularioCompleto: ValoresFormularioBoleta = {
    employeeId: 12,
    periodo: '2026-03',
    sueldoBase: 3000,
    bonos: 500,
    descuentos: 120,
    asignacionFamiliar: 102.5,
    montoHorasExtras: 80,
    diasTrabajados: 30,
};

describe('boletaRequestDesdeForm', () => {
    it('con todo relleno traslada cada campo', () => {
        expect(boletaRequestDesdeForm(formularioCompleto)).toEqual({
            employeeId: 12,
            periodo: '2026-03',
            sueldoBase: 3000,
            bonos: 500,
            descuentos: 120,
            asignacionFamiliar: 102.5,
            montoHorasExtras: 80,
            diasTrabajados: 30,
        });
    });

    it('los importes opcionales sin teclear salen como undefined', () => {
        const r = boletaRequestDesdeForm({
            ...formularioCompleto,
            bonos: null,
            descuentos: null,
            asignacionFamiliar: null,
            montoHorasExtras: null,
            diasTrabajados: null,
        });
        expect(r.bonos).toBeUndefined();
        expect(r.descuentos).toBeUndefined();
        expect(r.asignacionFamiliar).toBeUndefined();
        expect(r.montoHorasExtras).toBeUndefined();
        expect(r.diasTrabajados).toBeUndefined();
    });

    it('un 0 es un importe legítimo y NO se pierde', () => {
        const r = boletaRequestDesdeForm({
            ...formularioCompleto,
            bonos: 0,
            descuentos: 0,
            asignacionFamiliar: 0,
            montoHorasExtras: 0,
            diasTrabajados: 0,
        });
        expect(r.bonos).toBe(0);
        expect(r.descuentos).toBe(0);
        expect(r.asignacionFamiliar).toBe(0);
        expect(r.montoHorasExtras).toBe(0);
        expect(r.diasTrabajados).toBe(0);
    });

    it('los obligatorios se trasladan aunque el sueldo base sea 0', () => {
        const r = boletaRequestDesdeForm({ ...formularioCompleto, sueldoBase: 0 });
        expect(r.sueldoBase).toBe(0);
        expect(r.employeeId).toBe(12);
        expect(r.periodo).toBe('2026-03');
    });
});

const boletaMinima: Payroll = {
    id: 1,
    tenantId: 1,
    employeeId: 12,
    periodo: '2026-03',
    sueldoBase: 3000,
    neto: 2600,
    estado: 'GENERADO',
    createdAt: '2026-03-31',
};

describe('formularioDesdeBoleta', () => {
    it('copia los campos obligatorios', () => {
        const v = formularioDesdeBoleta(boletaMinima);
        expect(v.employeeId).toBe(12);
        expect(v.periodo).toBe('2026-03');
        expect(v.sueldoBase).toBe(3000);
    });

    it('los importes ausentes vuelven a null (control numérico vacío)', () => {
        const v = formularioDesdeBoleta(boletaMinima);
        expect(v.bonos).toBeNull();
        expect(v.descuentos).toBeNull();
        expect(v.asignacionFamiliar).toBeNull();
        expect(v.montoHorasExtras).toBeNull();
    });

    it('sin diasTrabajados cae al mes comercial de 30 días', () => {
        expect(formularioDesdeBoleta(boletaMinima).diasTrabajados).toBe(30);
    });

    it('con todo relleno no pisa ningún valor guardado', () => {
        const v = formularioDesdeBoleta({
            ...boletaMinima,
            bonos: 500,
            descuentos: 120,
            asignacionFamiliar: 102.5,
            montoHorasExtras: 80,
            diasTrabajados: 26,
        });
        expect(v.bonos).toBe(500);
        expect(v.descuentos).toBe(120);
        expect(v.asignacionFamiliar).toBe(102.5);
        expect(v.montoHorasExtras).toBe(80);
        expect(v.diasTrabajados).toBe(26);
    });

    it('un importe guardado en 0 se conserva y no se confunde con ausente', () => {
        const v = formularioDesdeBoleta({ ...boletaMinima, bonos: 0, descuentos: 0 });
        expect(v.bonos).toBe(0);
        expect(v.descuentos).toBe(0);
    });

    it('0 días trabajados NO se degrada al default de 30', () => {
        expect(formularioDesdeBoleta({ ...boletaMinima, diasTrabajados: 0 }).diasTrabajados).toBe(0);
    });
});
