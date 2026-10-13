export interface CategoryResponse {
    id: number;
    nombre: string;
    descripcion: string;
    imagenUrl?: string;
    nivel: number;
    /** El backend aún no lo devuelve en la respuesta; se usa si llega, para preseleccionar el padre al editar. */
    padreId?: number;
    activo?: boolean;
    orden?: number;
    fechaCreacion?: string;
    fechaActualizacion?: string;
    /**
     * `true` si la categoría es de la TAXONOMÍA GLOBAL (no pertenece a ninguna empresa). Son 49 de
     * las 54 filas: se listan a todas las empresas pero son de SOLO LECTURA, porque editarlas
     * afectaría a las seis a la vez — el backend responde 409 a cualquier escritura.
     *
     * Hay que usarlo para OCULTAR las acciones de editar/borrar/subir imagen en esas filas. Sin eso,
     * la pantalla ofrece botones que sólo pueden fallar.
     */
    global?: boolean;
}

export interface CategoryRequest {
    nombre: string;
    descripcion: string;
    imagenUrl?: string;
    nivel: number;
    /** CategoriaRequestDto.padreId. Omitido o null = SIN padre: reenviar siempre el actual en un PUT. */
    padreId?: number;
    activo?: boolean;
}

export interface CategoryFilter {
    search?: string;
    nivel?: number;
    /** OJO: el backend espera el param `conImagen` (CategoriaController.getAll), no `hasImage`. */
    conImagen?: boolean;
    activo?: boolean;
    padreId?: number;
    fechaCreacionDesde?: string;
    fechaCreacionHasta?: string;
}

export interface Category {
    id: number;
    nombre: string;
    descripcion: string;
    imagenUrl: string;
    nivel: number;
}

export interface MegaMenuProductoItem {
    id: number;
    nombre: string;
    imagenUrl: string | null;
    precio: number;
    badge: string | null;
}

export interface MegaMenuCategoriaDto {
    id: number;
    nombre: string;
    imagenUrl: string | null;
    productos: MegaMenuProductoItem[];
}
