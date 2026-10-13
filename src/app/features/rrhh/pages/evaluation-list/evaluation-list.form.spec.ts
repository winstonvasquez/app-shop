import { describe, expect, it } from 'vitest';
import {
    detallesDeEvaluacion,
    evaluacionRequestDesdeForm,
    ValoresFormularioEvaluacion,
} from './evaluation-list.form';

const formularioCompleto: ValoresFormularioEvaluacion = {
    employeeId: 12,
    evaluadorId: 3,
    periodo: '2026-03',
    tipoEvaluacion: 'SEMESTRAL',
    puntaje: 87,
    fechaEvaluacion: '2026-03-31',
    comentarios: 'Buen desempeño',
    fortalezas: 'Comunicación',
    areasMejora: 'Puntualidad',
    planMejora: 'Curso de gestión del tiempo',
};

describe('detallesDeEvaluacion', () => {
    it('descarta las filas sin criterio elegido', () => {
        const d = detallesDeEvaluacion([
            { criteriaId: 1, puntaje: 90, comentarios: '' },
            { criteriaId: null, puntaje: 50, comentarios: 'a medias' },
            { criteriaId: 2, puntaje: 70, comentarios: 'ok' },
        ]);
        expect(d).toHaveLength(2);
        expect(d.map(x => x.criteriaId)).toEqual([1, 2]);
    });

    it("un comentario vacío viaja ausente, no como ''", () => {
        const [d] = detallesDeEvaluacion([{ criteriaId: 1, puntaje: 90, comentarios: '' }]);
        expect(d.comentarios).toBeUndefined();
    });

    it('conserva el comentario cuando lo hay', () => {
        const [d] = detallesDeEvaluacion([{ criteriaId: 1, puntaje: 90, comentarios: 'excelente' }]);
        expect(d.comentarios).toBe('excelente');
    });

    it('un puntaje de 0 es una nota legítima y se conserva', () => {
        const [d] = detallesDeEvaluacion([{ criteriaId: 1, puntaje: 0, comentarios: '' }]);
        expect(d.puntaje).toBe(0);
    });

    it('el criterio con id 0 NO se descarta (0 != null)', () => {
        expect(detallesDeEvaluacion([{ criteriaId: 0, puntaje: 10, comentarios: '' }])).toHaveLength(1);
    });

    it('sin filas devuelve lista vacía', () => {
        expect(detallesDeEvaluacion([])).toEqual([]);
    });
});

describe('evaluacionRequestDesdeForm', () => {
    it('con todo relleno traslada cada campo', () => {
        const r = evaluacionRequestDesdeForm(formularioCompleto, [
            { criteriaId: 1, puntaje: 90, comentarios: 'ok' },
        ]);
        expect(r.employeeId).toBe(12);
        expect(r.evaluadorId).toBe(3);
        expect(r.periodo).toBe('2026-03');
        expect(r.tipoEvaluacion).toBe('SEMESTRAL');
        expect(r.puntaje).toBe(87);
        expect(r.fechaEvaluacion).toBe('2026-03-31');
        expect(r.comentarios).toBe('Buen desempeño');
        expect(r.fortalezas).toBe('Comunicación');
        expect(r.areasMejora).toBe('Puntualidad');
        expect(r.planMejora).toBe('Curso de gestión del tiempo');
        expect(r.details).toEqual([{ criteriaId: 1, puntaje: 90, comentarios: 'ok' }]);
    });

    it("los textos largos en '' salen como undefined", () => {
        const r = evaluacionRequestDesdeForm(
            {
                ...formularioCompleto,
                comentarios: '',
                fortalezas: '',
                areasMejora: '',
                planMejora: '',
            },
            [],
        );
        expect(r.comentarios).toBeUndefined();
        expect(r.fortalezas).toBeUndefined();
        expect(r.areasMejora).toBeUndefined();
        expect(r.planMejora).toBeUndefined();
    });

    it('los textos largos en null también salen como undefined', () => {
        const r = evaluacionRequestDesdeForm(
            {
                ...formularioCompleto,
                comentarios: null,
                fortalezas: null,
                areasMejora: null,
                planMejora: null,
            },
            [],
        );
        expect(r.comentarios).toBeUndefined();
        expect(r.planMejora).toBeUndefined();
    });

    it('sin tipo de evaluación elegido cae a ANUAL', () => {
        expect(evaluacionRequestDesdeForm({ ...formularioCompleto, tipoEvaluacion: '' }, []).tipoEvaluacion)
            .toBe('ANUAL');
        expect(evaluacionRequestDesdeForm({ ...formularioCompleto, tipoEvaluacion: null }, []).tipoEvaluacion)
            .toBe('ANUAL');
    });

    it('sin detalles viaja undefined, no un array vacío que borraría las notas guardadas', () => {
        expect(evaluacionRequestDesdeForm(formularioCompleto, []).details).toBeUndefined();
    });

    it('si TODAS las filas quedan sin criterio, details también viaja undefined', () => {
        const r = evaluacionRequestDesdeForm(formularioCompleto, [
            { criteriaId: null, puntaje: 50, comentarios: '' },
        ]);
        expect(r.details).toBeUndefined();
    });

    it('un puntaje global de 0 se conserva', () => {
        expect(evaluacionRequestDesdeForm({ ...formularioCompleto, puntaje: 0 }, []).puntaje).toBe(0);
    });
});
