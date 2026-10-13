import { describe, expect, it } from 'vitest';
import { armarInspeccionBody, nuevaFilaInspeccion, validarInspeccion } from './devoluciones.form';

describe('inspección de devoluciones', () => {
    const fila = { ...nuevaFilaInspeccion('00000000-0000-0000-0000-00000000000e', 'Mouse'), sku: ' MS-1 ', cantidad: 2 };

    it('valida filas vacías, SKU y cantidad', () => {
        expect(validarInspeccion([], 'BUENO')).toMatch(/al menos un producto/);
        expect(validarInspeccion([nuevaFilaInspeccion('x', 'Mouse')], 'BUENO')).toMatch(/SKU/);
        expect(validarInspeccion([{ ...fila, cantidad: 0 }], 'BUENO')).toMatch(/cantidad/);
        expect(validarInspeccion([fila], '')).toMatch(/condición general/);
        expect(validarInspeccion([fila], 'BUENO')).toBeNull();
    });

    it('arma el body con disposición por ítem y recorta textos', () => {
        expect(armarInspeccionBody('dev-1', [{ ...fila, disposition: 'DESECHAR', notes: ' ' }], 'DANADO', ' caja rota ')).toEqual({
            returnRequestId: 'dev-1',
            items: [{
                productoId: '00000000-0000-0000-0000-00000000000e', sku: 'MS-1', productoNombre: 'Mouse',
                cantidad: 2, condition: 'BUENO', disposition: 'DESECHAR', notes: undefined,
            }],
            overallCondition: 'DANADO',
            overallNotes: 'caja rota',
        });
    });
});
