/**
 * Traduce el error crudo del SDK de Facebook al mensaje que ve el usuario.
 *
 * El SDK no expone códigos de error: sólo un `message` en inglés, así que la clasificación es por
 * subcadena y el ORDEN de las reglas es la regla de negocio. De más específico a más genérico:
 *  1. SDK aún no inicializado (`FB.init`) — es transitorio, así que se invita a reintentar;
 *  2. App ID sin configurar — es un fallo de despliegue, no del usuario;
 *  3. cualquier mención a `http` — Facebook exige HTTPS incluso en desarrollo.
 *
 * Un mensaje que encaje en varias reglas se queda con la primera (p. ej. uno que hable de
 * `App Id` y de `before` se trata como SDK no listo, que es lo que el usuario puede resolver).
 * Sin coincidencia se muestra el mensaje original; si viene vacío, un texto genérico — nunca
 * un modal en blanco.
 */
export function mensajeDeErrorDeFacebook(msg: string): string {
    if (msg.includes('FB.init') || msg.includes('before') || msg.includes('initialized')) {
        return 'El SDK de Facebook no está listo todavía. Intenta de nuevo en unos segundos.';
    }
    if (msg.includes('Facebook App Id') || msg.includes('App Id')) {
        return 'El App ID de Facebook no está configurado. Revisa environment.ts.';
    }
    if (msg.includes('http')) {
        return 'Facebook requiere HTTPS. Activa SSL en tu servidor de desarrollo.';
    }
    return msg || 'Error al abrir el inicio de sesión con Facebook.';
}
