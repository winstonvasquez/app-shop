import { describe, expect, it } from 'vitest';
import { metaRequestDesdeForm, ValoresFormularioMeta } from './goal-list.form';

const formularioCompleto: ValoresFormularioMeta = {
    employeeId: 12,
    titulo: 'Cerrar el trimestre sin observaciones',
    descripcion: 'Sin hallazgos en la auditoría interna',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-03-31',
    prioridad: 'ALTA',
    porcentajeAvance: 45,
};

describe('metaRequestDesdeForm', () => {
    it('con todo relleno traslada cada campo', () => {
        expect(metaRequestDesdeForm(formularioCompleto)).toEqual({
            employeeId: 12,
            titulo: 'Cerrar el trimestre sin observaciones',
            descripcion: 'Sin hallazgos en la auditoría interna',
            fechaInicio: '2026-01-01',
            fechaFin: '2026-03-31',
            prioridad: 'ALTA',
            porcentajeAvance: 45,
        });
    });

    it("la descripción en '' sale como undefined", () => {
        expect(metaRequestDesdeForm({ ...formularioCompleto, descripcion: '' }).descripcion)
            .toBeUndefined();
    });

    it('la descripción en null también sale como undefined', () => {
        expect(metaRequestDesdeForm({ ...formularioCompleto, descripcion: null }).descripcion)
            .toBeUndefined();
    });

    it('sin prioridad elegida cae a MEDIA', () => {
        expect(metaRequestDesdeForm({ ...formularioCompleto, prioridad: '' }).prioridad).toBe('MEDIA');
        expect(metaRequestDesdeForm({ ...formularioCompleto, prioridad: null }).prioridad).toBe('MEDIA');
    });

    it('un avance de 0% es legítimo y se conserva', () => {
        expect(metaRequestDesdeForm({ ...formularioCompleto, porcentajeAvance: 0 }).porcentajeAvance)
            .toBe(0);
    });

    it('sin avance declarado la meta arranca en 0%', () => {
        expect(metaRequestDesdeForm({ ...formularioCompleto, porcentajeAvance: null }).porcentajeAvance)
            .toBe(0);
    });

    it('un avance de 100% se conserva', () => {
        expect(metaRequestDesdeForm({ ...formularioCompleto, porcentajeAvance: 100 }).porcentajeAvance)
            .toBe(100);
    });
});
