import { HttpParams } from '@angular/common/http';

/**
 * Construye los `HttpParams` de un listado a partir de un objeto de filtros, omitiendo los
 * campos que el backend no debe recibir.
 *
 * Sustituye la cadena de `if (filtros.x) params = params.set('x', filtros.x)` que estaba
 * repetida 400 veces en 49 servicios y que era, por sí sola, la mayor fuente de complejidad
 * ciclomática del frontend (métodos de CC 13-28 que bajan a CC 1-2 al usar esto).
 *
 * ## Qué se omite y por qué
 *
 * Se omiten `undefined`, `null` y la cadena vacía — el caso «el usuario no eligió nada».
 * **`0` y `false` SÍ se envían**, que es una diferencia deliberada con el `if (x)` que sustituye:
 * aquel descartaba en silencio un filtro numérico de valor 0 y un booleano en `false`. Si un
 * filtro booleano tiene que significar «no filtrar» cuando vale `false`, eso debe decirse en el
 * sitio de llamada (`soloAlerta: filtros.soloAlerta || undefined`) y no esconderse aquí.
 *
 * Un array se envía como el parámetro repetido (`?estado=A&estado=B`), que es lo que Spring
 * espera para un `List<T>`; sus elementos vacíos se descartan con el mismo criterio.
 */
export function toHttpParams(fuente: Record<string, unknown> | undefined | null): HttpParams {
    let params = new HttpParams();
    if (!fuente) return params;

    for (const [clave, valor] of Object.entries(fuente)) {
        if (Array.isArray(valor)) {
            for (const item of valor) {
                if (esVacio(item)) continue;
                params = params.append(clave, String(item));
            }
            continue;
        }
        if (esVacio(valor)) continue;
        params = params.set(clave, String(valor));
    }
    return params;
}

function esVacio(valor: unknown): boolean {
    return valor === undefined || valor === null || valor === '';
}
