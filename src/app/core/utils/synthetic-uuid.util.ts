/**
 * Conversión Long↔UUID sintético — espejo exacto de `new UUID(0, id)` en Java.
 *
 * Varios microservicios modelan como `UUID` una clave que en su origen es un `Long`
 * (el `productId` del catálogo de ventas dentro de las entidades de logística, el
 * `companyId` en las cabeceras multi-tenant, el `userId` en `X-Solicitante-Id` de
 * compras). Con `mostSigBits = 0`, el string que produce Java es siempre
 * `"00000000-0000-0000-0000-" + id en hex` con 12 dígitos y ceros a la izquierda,
 * y `getLeastSignificantBits()` recupera el Long.
 *
 * Vive en `@core` porque lo necesitan features distintas: duplicarlo por feature ya
 * había producido tres copias divergentes (interceptor de tenant, contabilidad e
 * inventario), y una cuarta copia en compras habría sido el cuarto sitio donde
 * arreglar el mismo bug.
 *
 * Enviar el Long crudo donde el backend declara `UUID` NO es un fallo silencioso:
 * Spring responde 400 porque no puede convertir `"14"` a UUID.
 */
export function longToSyntheticUuid(id: number): string {
    return `00000000-0000-0000-0000-${id.toString(16).padStart(12, '0')}`;
}

/** Inverso de {@link longToSyntheticUuid} — recupera el Long original. */
export function syntheticUuidToLong(uuid: string): number {
    const hex = uuid.split('-').pop() ?? '0';
    return parseInt(hex, 16);
}
