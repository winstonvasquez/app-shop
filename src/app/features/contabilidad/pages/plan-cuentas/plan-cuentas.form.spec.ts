import { describe, expect, it } from 'vitest';
import { CuentaFormRaw, construirCuentaRequest, construirCuentaUpdateRequest } from './plan-cuentas.form';

function raw(parcial: Partial<CuentaFormRaw> = {}): CuentaFormRaw {
    return {
        codigo: '10411',
        nombre: 'Cuentas corrientes operativas',
        tipo: 'ACTIVO',
        cuentaPadreId: 'cta-1041',
        estado: 'ACTIVO',
        esAnalitica: true,
        aceptaMovimiento: true,
        ...parcial,
    };
}

describe('construirCuentaRequest', () => {
    it('traduce el formulario completo al alta, sin enviar el nivel', () => {
        const req = construirCuentaRequest(raw());

        expect(req).toEqual({
            codigo: '10411',
            nombre: 'Cuentas corrientes operativas',
            tipo: 'ACTIVO',
            cuentaPadreId: 'cta-1041',
            estado: 'ACTIVO',
            esAnalitica: true,
            aceptaMovimiento: true,
        });
        expect('nivel' in req).toBe(false);
    });

    it('envía null cuando no se eligió cuenta padre: la cuenta es raíz', () => {
        expect(construirCuentaRequest(raw({ cuentaPadreId: '' })).cuentaPadreId).toBeNull();
        expect(construirCuentaRequest(raw({ cuentaPadreId: null })).cuentaPadreId).toBeNull();
    });

    it('conserva los booleanos en false, que son dato y no ausencia', () => {
        const req = construirCuentaRequest(raw({ esAnalitica: false, aceptaMovimiento: false }));
        expect(req.esAnalitica).toBe(false);
        expect(req.aceptaMovimiento).toBe(false);
    });

    it('respeta el estado INACTIVO elegido en el formulario', () => {
        expect(construirCuentaRequest(raw({ estado: 'INACTIVO' })).estado).toBe('INACTIVO');
    });
});

describe('construirCuentaUpdateRequest', () => {
    it('omite el código, que es clave de negocio bloqueada en edición', () => {
        const req = construirCuentaUpdateRequest(raw());

        expect('codigo' in req).toBe(false);
        expect(req).toEqual({
            nombre: 'Cuentas corrientes operativas',
            tipo: 'ACTIVO',
            cuentaPadreId: 'cta-1041',
            estado: 'ACTIVO',
            esAnalitica: true,
            aceptaMovimiento: true,
        });
    });

    it('aplica la misma regla del padre vacío que el alta', () => {
        expect(construirCuentaUpdateRequest(raw({ cuentaPadreId: '' })).cuentaPadreId).toBeNull();
    });
});
