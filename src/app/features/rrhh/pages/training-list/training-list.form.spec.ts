import { describe, expect, it } from 'vitest';
import { Training } from '../../models/training.model';
import {
    capacitacionRequestDesdeForm,
    formularioDesdeCapacitacion,
    ValoresFormularioCapacitacion,
} from './training-list.form';

const formularioCompleto: ValoresFormularioCapacitacion = {
    nombre: 'Inducción SUNAT',
    descripcion: 'Facturación electrónica',
    instructor: 'Ana Quispe',
    fechaInicio: '2026-04-01',
    fechaFin: '2026-04-03',
    duracionHoras: 12,
};

describe('capacitacionRequestDesdeForm', () => {
    it('con todo relleno traslada cada campo', () => {
        expect(capacitacionRequestDesdeForm(formularioCompleto)).toEqual({
            nombre: 'Inducción SUNAT',
            descripcion: 'Facturación electrónica',
            instructor: 'Ana Quispe',
            fechaInicio: '2026-04-01',
            fechaFin: '2026-04-03',
            duracionHoras: 12,
        });
    });

    it('sin fecha de fin, la capacitación empieza y termina el mismo día', () => {
        expect(capacitacionRequestDesdeForm({ ...formularioCompleto, fechaFin: '' }).fechaFin)
            .toBe('2026-04-01');
        expect(capacitacionRequestDesdeForm({ ...formularioCompleto, fechaFin: null }).fechaFin)
            .toBe('2026-04-01');
    });

    it("descripción e instructor en '' salen como undefined", () => {
        const r = capacitacionRequestDesdeForm({
            ...formularioCompleto,
            descripcion: '',
            instructor: '',
        });
        expect(r.descripcion).toBeUndefined();
        expect(r.instructor).toBeUndefined();
    });

    it('descripción e instructor en null también salen como undefined', () => {
        const r = capacitacionRequestDesdeForm({
            ...formularioCompleto,
            descripcion: null,
            instructor: null,
        });
        expect(r.descripcion).toBeUndefined();
        expect(r.instructor).toBeUndefined();
    });

    it('sin duración declarada viaja ausente', () => {
        expect(capacitacionRequestDesdeForm({ ...formularioCompleto, duracionHoras: null })
            .duracionHoras).toBeUndefined();
    });

    it('duración 0 viaja ausente — comportamiento original conservado', () => {
        expect(capacitacionRequestDesdeForm({ ...formularioCompleto, duracionHoras: 0 })
            .duracionHoras).toBeUndefined();
    });
});

const capacitacionMinima: Training = {
    id: 1,
    tenantId: 1,
    nombre: 'Inducción SUNAT',
    descripcion: null,
    fechaInicio: '2026-04-01',
    fechaFin: '2026-04-03',
    instructor: null,
    duracionHoras: null,
    estado: 'PLANIFICADO',
    participantes: 0,
    createdAt: '2026-03-01',
    updatedAt: null,
};

describe('formularioDesdeCapacitacion', () => {
    it('los opcionales en null caen a valores que un control acepta', () => {
        const v = formularioDesdeCapacitacion(capacitacionMinima);
        expect(v.descripcion).toBe('');
        expect(v.instructor).toBe('');
        expect(v.duracionHoras).toBe(0);
    });

    it('copia los campos obligatorios', () => {
        const v = formularioDesdeCapacitacion(capacitacionMinima);
        expect(v.nombre).toBe('Inducción SUNAT');
        expect(v.fechaInicio).toBe('2026-04-01');
        expect(v.fechaFin).toBe('2026-04-03');
    });

    it('con todo relleno no pisa ningún valor guardado', () => {
        const v = formularioDesdeCapacitacion({
            ...capacitacionMinima,
            descripcion: 'Facturación electrónica',
            instructor: 'Ana Quispe',
            duracionHoras: 12,
        });
        expect(v.descripcion).toBe('Facturación electrónica');
        expect(v.instructor).toBe('Ana Quispe');
        expect(v.duracionHoras).toBe(12);
    });
});
