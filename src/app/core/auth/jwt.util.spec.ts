import { describe, expect, it } from 'vitest';
import {
    extractRoleFromJwtPayload, modulosDesdeClaim, payloadDeJwt, usuarioDesdeJwt,
} from './jwt.util';

/** Arma un JWT de mentira con el payload dado. La firma no se verifica en el frontend. */
const jwt = (payload: unknown): string =>
    `cabecera.${btoa(JSON.stringify(payload))}.firma`;

const AHORA = Date.parse('2026-08-06T12:00:00Z');
const EN_UNA_HORA = Math.floor(AHORA / 1000) + 3600;
const HACE_UNA_HORA = Math.floor(AHORA / 1000) - 3600;

describe('extractRoleFromJwtPayload', () => {
    it('toma `role` cuando viene como cadena', () => {
        expect(extractRoleFromJwtPayload({ role: 'ADMIN' })).toBe('ADMIN');
    });

    it('toma el primero de `roles` cuando el array no está vacío', () => {
        expect(extractRoleFromJwtPayload({ roles: ['SUPERADMIN', 'ADMIN'] })).toBe('SUPERADMIN');
    });

    it('un `roles` vacío no cuenta: sigue buscando y acaba sin rol', () => {
        expect(extractRoleFromJwtPayload({ roles: [] })).toBeUndefined();
    });

    it('acepta `authorities` como array de cadenas (forma de Spring Security)', () => {
        expect(extractRoleFromJwtPayload({ authorities: ['ROLE_ADMIN'] })).toBe('ROLE_ADMIN');
    });

    it('acepta `authorities` como array de objetos `{ authority }`', () => {
        expect(extractRoleFromJwtPayload({ authorities: [{ authority: 'ROLE_EMPLOYEE' }] }))
            .toBe('ROLE_EMPLOYEE');
    });

    it('un payload sin ninguna de las tres formas no tiene rol', () => {
        expect(extractRoleFromJwtPayload({ sub: 'ana', userId: 7 })).toBeUndefined();
    });

    it('`role` gana sobre `roles` y sobre `authorities`', () => {
        expect(extractRoleFromJwtPayload({
            role: 'CUSTOMER', roles: ['ADMIN'], authorities: ['ROLE_ADMIN'],
        })).toBe('CUSTOMER');
    });

    it('un `role` que no es cadena se ignora y se cae al siguiente formato', () => {
        expect(extractRoleFromJwtPayload({ role: 42, roles: ['ADMIN'] })).toBe('ADMIN');
    });

    it('un objeto de authorities sin campo `authority` da rol vacío, no revienta', () => {
        expect(extractRoleFromJwtPayload({ authorities: [{ otro: 'x' }] })).toBe('');
    });
});

describe('modulosDesdeClaim', () => {
    it('parte la cadena por comas y recorta los espacios', () => {
        expect(modulosDesdeClaim('VENTAS, COMPRAS ,RRHH')).toEqual(['VENTAS', 'COMPRAS', 'RRHH']);
    });

    it('descarta los huecos que dejan las comas de más', () => {
        expect(modulosDesdeClaim('VENTAS,,COMPRAS,')).toEqual(['VENTAS', 'COMPRAS']);
    });

    it('falla cerrado: cadena vacía, ausencia o tipo distinto ⇒ ningún módulo', () => {
        expect(modulosDesdeClaim('')).toEqual([]);
        expect(modulosDesdeClaim(undefined)).toEqual([]);
        expect(modulosDesdeClaim(null)).toEqual([]);
        expect(modulosDesdeClaim(['VENTAS'])).toEqual([]);
    });
});

describe('payloadDeJwt', () => {
    it('decodifica el segundo segmento del token', () => {
        expect(payloadDeJwt(jwt({ sub: 'ana' }))).toEqual({ sub: 'ana' });
    });

    it('devuelve null si el token no tiene segmentos', () => {
        expect(payloadDeJwt('sin-puntos')).toBeNull();
    });

    it('devuelve null si el payload no es base64 válido', () => {
        expect(payloadDeJwt('a.!!!.c')).toBeNull();
    });

    it('devuelve null si el base64 decodifica a algo que no es JSON', () => {
        expect(payloadDeJwt(`a.${btoa('esto no es json')}.c`)).toBeNull();
    });

    it('un payload `null` se trata como token corrupto', () => {
        expect(payloadDeJwt(jwt(null))).toBeNull();
    });
});

describe('usuarioDesdeJwt', () => {
    const VALIDO = {
        sub: 'ana@empresa.pe', userId: 7, companyId: 3,
        modules: 'VENTAS,COMPRAS', role: 'ADMIN', exp: EN_UNA_HORA,
    };

    it('arma el usuario con los claims del token', () => {
        expect(usuarioDesdeJwt(jwt(VALIDO), AHORA)).toEqual({
            userId: 7,
            username: 'ana@empresa.pe',
            activeCompanyId: 3,
            availableCompanyIds: [],
            enabledModules: ['VENTAS', 'COMPRAS'],
            role: 'ADMIN',
        });
    });

    it('`availableCompanyIds` sale vacío: no viaja en el token, se repuebla al iniciar sesión', () => {
        expect(usuarioDesdeJwt(jwt(VALIDO), AHORA)!.availableCompanyIds).toEqual([]);
    });

    it('un token caducado NO da sesión', () => {
        expect(usuarioDesdeJwt(jwt({ ...VALIDO, exp: HACE_UNA_HORA }), AHORA)).toBeNull();
    });

    it('el instante exacto de expiración todavía vale (la comparación es estrictamente menor)', () => {
        const exp = Math.floor(AHORA / 1000);
        expect(usuarioDesdeJwt(jwt({ ...VALIDO, exp }), exp * 1000)).not.toBeNull();
        expect(usuarioDesdeJwt(jwt({ ...VALIDO, exp }), exp * 1000 + 1)).toBeNull();
    });

    it('un token SIN `exp` no caduca: se acepta', () => {
        const { exp: _descartado, ...sinExp } = VALIDO;
        expect(usuarioDesdeJwt(jwt(sinExp), AHORA)).not.toBeNull();
    });

    it('un token corrupto NO da sesión', () => {
        expect(usuarioDesdeJwt('esto-no-es-un-jwt', AHORA)).toBeNull();
        expect(usuarioDesdeJwt('a.!!!.c', AHORA)).toBeNull();
    });

    it('sin claim `modules` el usuario queda sin módulos habilitados', () => {
        const { modules: _descartado, ...sinModulos } = VALIDO;
        expect(usuarioDesdeJwt(jwt(sinModulos), AHORA)!.enabledModules).toEqual([]);
    });

    it('sin claim de rol el usuario queda sin rol (los guards deciden qué hacer)', () => {
        const { role: _descartado, ...sinRol } = VALIDO;
        expect(usuarioDesdeJwt(jwt(sinRol), AHORA)!.role).toBeUndefined();
    });

    it('por defecto compara la expiración contra el reloj actual', () => {
        expect(usuarioDesdeJwt(jwt({ ...VALIDO, exp: Math.floor(Date.now() / 1000) - 1 }))).toBeNull();
        expect(usuarioDesdeJwt(jwt({ ...VALIDO, exp: Math.floor(Date.now() / 1000) + 60 }))).not.toBeNull();
    });
});
