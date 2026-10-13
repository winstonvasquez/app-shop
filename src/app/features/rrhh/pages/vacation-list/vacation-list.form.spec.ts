import { describe, expect, it } from 'vitest';
import {
    diasDeVacacion,
    EstadoFiltrosVacacion,
    filtrosDeVacacion,
    solicitudDeVacacion,
} from './vacation-list.form';

describe('diasDeVacacion', () => {
    it('cuenta los extremos: un solo día son 1 día, no 0', () => {
        expect(diasDeVacacion('2026-03-10', '2026-03-10')).toBe(1);
    });

    it('una semana de lunes a domingo son 7 días', () => {
        expect(diasDeVacacion('2026-03-09', '2026-03-15')).toBe(7);
    });

    it('cuenta a través de un cambio de mes', () => {
        expect(diasDeVacacion('2026-01-30', '2026-02-02')).toBe(4);
    });

    it('sin fecha de inicio da 0', () => {
        expect(diasDeVacacion('', '2026-03-15')).toBe(0);
        expect(diasDeVacacion(null, '2026-03-15')).toBe(0);
        expect(diasDeVacacion(undefined, '2026-03-15')).toBe(0);
    });

    it('sin fecha de fin da 0', () => {
        expect(diasDeVacacion('2026-03-09', '')).toBe(0);
        expect(diasDeVacacion('2026-03-09', null)).toBe(0);
        expect(diasDeVacacion('2026-03-09', undefined)).toBe(0);
    });

    it('un rango invertido da 0, no un número negativo', () => {
        expect(diasDeVacacion('2026-03-15', '2026-03-09')).toBe(0);
    });

    it('una fecha ilegible da 0 en vez de NaN', () => {
        expect(diasDeVacacion('no-es-fecha', '2026-03-15')).toBe(0);
    });
});

const filtrosVacios: EstadoFiltrosVacacion = {
    search: '',
    estado: '',
    tipoVacacion: '',
    employeeId: '',
    departmentId: '',
    aprobadoPorId: '',
    fechaInicioDesde: null,
    fechaInicioHasta: null,
    fechaFinDesde: null,
    fechaFinHasta: null,
    fechaAprobacionDesde: null,
    fechaAprobacionHasta: null,
};

describe('filtrosDeVacacion', () => {
    it('sin filtros: todo sale como undefined y solo viaja la paginación', () => {
        const f = filtrosDeVacacion(filtrosVacios, 0, 20);
        expect(f.page).toBe(0);
        expect(f.size).toBe(20);
        expect(f.search).toBeUndefined();
        expect(f.estado).toBeUndefined();
        expect(f.tipoVacacion).toBeUndefined();
        expect(f.employeeId).toBeUndefined();
        expect(f.departmentId).toBeUndefined();
        expect(f.aprobadoPorId).toBeUndefined();
    });

    it("un id vacío NO se convierte en 0 (Number('') daría un id falso)", () => {
        const f = filtrosDeVacacion(filtrosVacios, 0, 20);
        expect(f.employeeId).not.toBe(0);
        expect(f.departmentId).not.toBe(0);
        expect(f.aprobadoPorId).not.toBe(0);
    });

    it('los rangos de fecha en null salen como undefined', () => {
        const f = filtrosDeVacacion(filtrosVacios, 0, 20);
        expect(f.fechaInicioDesde).toBeUndefined();
        expect(f.fechaInicioHasta).toBeUndefined();
        expect(f.fechaFinDesde).toBeUndefined();
        expect(f.fechaFinHasta).toBeUndefined();
        expect(f.fechaAprobacionDesde).toBeUndefined();
        expect(f.fechaAprobacionHasta).toBeUndefined();
    });

    it('con todo relleno convierte los ids de texto a número', () => {
        const f = filtrosDeVacacion(
            {
                search: 'quispe',
                estado: 'SOLICITADO',
                tipoVacacion: 'ANUAL',
                employeeId: '12',
                departmentId: '3',
                aprobadoPorId: '9',
                fechaInicioDesde: '2026-01-01',
                fechaInicioHasta: '2026-01-31',
                fechaFinDesde: '2026-02-01',
                fechaFinHasta: '2026-02-28',
                fechaAprobacionDesde: '2026-01-05',
                fechaAprobacionHasta: '2026-01-20',
            },
            2,
            50,
        );
        expect(f.page).toBe(2);
        expect(f.size).toBe(50);
        expect(f.search).toBe('quispe');
        expect(f.estado).toBe('SOLICITADO');
        expect(f.tipoVacacion).toBe('ANUAL');
        expect(f.employeeId).toBe(12);
        expect(f.departmentId).toBe(3);
        expect(f.aprobadoPorId).toBe(9);
        expect(f.fechaInicioDesde).toBe('2026-01-01');
        expect(f.fechaAprobacionHasta).toBe('2026-01-20');
    });
});

describe('solicitudDeVacacion', () => {
    const completo = {
        employeeId: 12,
        fechaInicio: '2026-03-09',
        fechaFin: '2026-03-15',
        dias: 7,
        tipoVacacion: 'ANUAL',
        motivo: 'Descanso anual',
    };

    it('con todo relleno traslada cada campo', () => {
        expect(solicitudDeVacacion(completo)).toEqual({
            employeeId: 12,
            fechaInicio: '2026-03-09',
            fechaFin: '2026-03-15',
            dias: 7,
            tipoVacacion: 'ANUAL',
            motivo: 'Descanso anual',
        });
    });

    it('los opcionales en null salen como undefined', () => {
        const r = solicitudDeVacacion({ ...completo, motivo: null, tipoVacacion: null });
        expect(r.motivo).toBeUndefined();
        expect(r.tipoVacacion).toBeUndefined();
    });

    it('conserva dias tal cual (la autoridad final es el backend, pero tiene que pasar @Min(1))', () => {
        expect(solicitudDeVacacion({ ...completo, dias: 1 }).dias).toBe(1);
    });
});
