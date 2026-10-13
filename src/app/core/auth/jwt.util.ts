import { User, UserRole } from './auth.model';

/**
 * Decodifica el payload de un JWT. **No verifica la firma** — no puede: la clave es del backend.
 * Sirve sólo para leer claims que el propio backend acaba de emitir; toda decisión de autorización
 * real la toma el servidor.
 *
 * Devuelve `null` ante cualquier token que no se pueda leer (sin punto, base64 inválido, JSON
 * roto, o un `null` literal), que es el caso «token corrupto» y se trata como sesión inexistente.
 */
export function payloadDeJwt(token: string): Record<string, unknown> | null {
    try {
        return JSON.parse(atob(token.split('.')[1] ?? ''));
    } catch {
        return null;
    }
}

/**
 * Extrae el rol del payload ya decodificado.
 *
 * El backend lo manda de tres formas según el endpoint, y hay que aceptar las tres: `role`
 * (cadena), `roles` (array) o `authorities` (la forma de Spring Security, que puede ser un array
 * de cadenas o de objetos `{ authority }`). Se toma SIEMPRE el primer elemento: este frontend
 * modela un rol por usuario.
 */
export function extractRoleFromJwtPayload(payload: Record<string, unknown>): UserRole | undefined {
    if (typeof payload['role'] === 'string') {
        return payload['role'] as UserRole;
    }
    if (Array.isArray(payload['roles']) && payload['roles'].length > 0) {
        return String(payload['roles'][0]) as UserRole;
    }
    if (Array.isArray(payload['authorities']) && payload['authorities'].length > 0) {
        const first = payload['authorities'][0];
        const authority = typeof first === 'string' ? first : (first as Record<string, string>)['authority'] ?? '';
        return authority as UserRole;
    }
    return undefined;
}

/**
 * Módulos habilitados a partir del claim `modules`, que viaja como una sola cadena separada por
 * comas (`"VENTAS,COMPRAS"`). Un claim que no sea cadena, o vacío, significa «ningún módulo»:
 * los feature flags fallan CERRADOS, así que ante la duda no se habilita nada.
 */
export function modulosDesdeClaim(claim: unknown): string[] {
    return typeof claim === 'string'
        ? claim.split(',').map(m => m.trim()).filter(Boolean)
        : [];
}

/**
 * Reconstruye el usuario de la sesión a partir del token guardado, que es lo que permite seguir
 * autenticado tras recargar la página.
 *
 * Devuelve `null` en los dos casos en que NO hay sesión válida —token corrupto y token
 * caducado—; el llamador debe borrar el token en ambos. `availableCompanyIds` sale vacío a
 * propósito: no viaja en el token y sólo se repuebla al iniciar sesión.
 *
 * `ahoraMs` es parámetro para poder fijar el instante en las pruebas.
 */
export function usuarioDesdeJwt(token: string, ahoraMs = Date.now()): User | null {
    const payload = payloadDeJwt(token);
    if (!payload) return null;

    const exp = payload['exp'];
    if (exp && Number(exp) * 1000 < ahoraMs) return null;

    return {
        userId: payload['userId'] as number,
        username: payload['sub'] as string,
        activeCompanyId: payload['companyId'] as number,
        availableCompanyIds: [],
        enabledModules: modulosDesdeClaim(payload['modules']),
        role: extractRoleFromJwtPayload(payload),
    };
}
