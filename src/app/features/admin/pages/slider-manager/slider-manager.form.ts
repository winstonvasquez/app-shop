/** Campos editables de un banner del carrusel (el banner guardado añade `id`). */
export interface BannerForm {
    titulo: string;
    subtitulo: string;
    imagenUrl: string;
    link: string;
    orden: number;
    activo: boolean;
}

/** Cuerpo que viaja al backend: `imagenUrl` puede ser null (aún se subirá el archivo). */
export interface BannerCuerpo extends Omit<BannerForm, 'imagenUrl'> {
    imagenUrl: string | null;
}

/**
 * Valida un banner antes de guardarlo. Devuelve el mensaje a mostrar, o `null` si es válido.
 *
 * Regla de negocio: un banner del carrusel **necesita título y necesita imagen**, pero la imagen
 * puede llegar por dos vías excluyentes — un archivo que se subirá tras crear el registro, o una
 * URL escrita a mano. Basta con una de las dos; exigir la URL cuando ya hay archivo elegido
 * bloquearía el flujo normal de alta.
 */
export function validarBanner(f: BannerForm, tieneArchivo: boolean): string | null {
    if (!f.titulo.trim()) return 'El título es obligatorio.';
    if (!tieneArchivo && !f.imagenUrl.trim()) return 'Seleccioná una imagen o ingresá una URL.';
    return null;
}

/**
 * Cuerpo del PUT/POST de banner.
 *
 * Regla de negocio: **una URL vacía viaja `null`, no `''`** — el registro se crea sin imagen y
 * el binario se sube después contra el id ya existente; un `''` quedaría guardado como ruta de
 * imagen y la tienda pediría un recurso inexistente.
 */
export function cuerpoDeBanner(f: BannerForm): BannerCuerpo {
    return { ...f, imagenUrl: f.imagenUrl || null };
}
