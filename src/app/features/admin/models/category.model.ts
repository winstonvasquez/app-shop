// Models aligned with backend DTOs from microshopventas

export interface CategoryResponse {
    id: number;
    nombre: string;
    descripcion: string | null;
    imagenUrl: string | null;
    nivel: number;
    /**
     * `true` si la categoría es de la TAXONOMÍA GLOBAL (`company_id NULL` en BD): 49 de las 54 filas.
     * Se listan a todas las empresas pero son de SOLO LECTURA — el backend responde 409 a cualquier
     * escritura, porque editarlas afectaría a las seis empresas a la vez.
     *
     * La tabla debe ocultar editar/eliminar/subir-imagen cuando es `true`; ofrecerlos deja botones
     * que sólo pueden fallar.
     */
    global?: boolean;
}

export interface CategoryRequest {
    nombre: string;
    descripcion?: string | null;
    imagenUrl?: string | null;
    nivel: number;
}

// Extended model for frontend with additional properties for UX
export interface CategoryFormModel extends CategoryRequest {
    id?: number; // For edit mode

    // Additional frontend-only properties
    _isLoading?: boolean;
    _isDirty?: boolean;
    _errors?: Record<string, string>;
    _imagePreview?: string; // For image preview
}

// Filter model
export interface CategoryFilter {
    search?: string;
    nivel?: number;
    hasImage?: boolean;
}
