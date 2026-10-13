import { describe, expect, it } from 'vitest';
import {
    ValoresFormularioRecurrente,
    construirAsientoRecurrenteRequest,
    construirLineasRecurrentes,
} from './asientos-recurrentes.form';

const lineasValidas = [
    { accountCode: '6311', movementType: 'DEBE', amount: 500 },
    { accountCode: '4212', movementType: 'HABER', amount: 500 },
];

const formCompleto: ValoresFormularioRecurrente = {
    nombre: 'Alquiler de local',
    descripcion: 'Renta mensual del almacén central',
    frecuencia: 'TRIMESTRAL',
    diaEjecucion: 5,
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    glosa: 'Provisión de alquiler',
};

describe('construirLineasRecurrentes', () => {
    it('mapea las líneas conservando cuenta, tipo y orden', () => {
        expect(construirLineasRecurrentes(lineasValidas)).toEqual([
            { accountCode: '6311', movementType: 'DEBE', amount: 500 },
            { accountCode: '4212', movementType: 'HABER', amount: 500 },
        ]);
    });

    it('numeriza el importe que el input entrega como texto', () => {
        const [linea] = construirLineasRecurrentes([{ accountCode: '6311', movementType: 'DEBE', amount: '1250.50' }]);
        expect(linea.amount).toBe(1250.5);
    });

    it('conserva el importe cero', () => {
        expect(construirLineasRecurrentes([{ accountCode: '6311', movementType: 'DEBE', amount: 0 }])[0].amount).toBe(0);
    });

    it('sin líneas devuelve lista vacía', () => {
        expect(construirLineasRecurrentes([])).toEqual([]);
    });
});

describe('construirAsientoRecurrenteRequest', () => {
    it('traduce el formulario completo al request', () => {
        expect(construirAsientoRecurrenteRequest(formCompleto, lineasValidas)).toEqual({
            name: 'Alquiler de local',
            description: 'Renta mensual del almacén central',
            frequency: 'TRIMESTRAL',
            executionDay: 5,
            startDate: '2026-01-01',
            endDate: '2026-12-31',
            templateGloss: 'Provisión de alquiler',
            templateLines: [
                { accountCode: '6311', movementType: 'DEBE', amount: 500 },
                { accountCode: '4212', movementType: 'HABER', amount: 500 },
            ],
        });
    });

    it('aplica los defaults del alta cuando el formulario llega vacío', () => {
        const req = construirAsientoRecurrenteRequest({}, []);

        expect(req.name).toBe('');
        expect(req.description).toBe('');
        expect(req.frequency).toBe('MENSUAL');
        expect(req.executionDay).toBe(1);
        expect(req.startDate).toBe('');
        expect(req.templateGloss).toBe('');
        expect(req.templateLines).toEqual([]);
    });

    it('trata el null de los controles igual que su ausencia', () => {
        const req = construirAsientoRecurrenteRequest({
            nombre: null, descripcion: null, frecuencia: null,
            diaEjecucion: null, fechaInicio: null, fechaFin: null, glosa: null,
        }, []);

        expect(req).toMatchObject({
            name: '', description: '', frequency: 'MENSUAL',
            executionDay: 1, startDate: '', endDate: null, templateGloss: '',
        });
    });

    it('sin fecha de fin envía null: la plantilla queda con vigencia indefinida', () => {
        expect(construirAsientoRecurrenteRequest({ ...formCompleto, fechaFin: '' }, []).endDate).toBeNull();
        expect(construirAsientoRecurrenteRequest({ ...formCompleto, fechaFin: null }, []).endDate).toBeNull();
    });

    it('numeriza el día de ejecución que el input entrega como texto', () => {
        expect(construirAsientoRecurrenteRequest({ ...formCompleto, diaEjecucion: '28' }, []).executionDay).toBe(28);
    });

    it('conserva el día 0 en vez de caer al default: sólo null/undefined disparan el 1', () => {
        expect(construirAsientoRecurrenteRequest({ ...formCompleto, diaEjecucion: 0 }, []).executionDay).toBe(0);
    });
});
