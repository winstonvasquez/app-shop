// Models aligned with backend DTOs from microshopventas

export interface CategoryResponse {
    id: number;
    nombre: string;
    descripcion: string | null;
    imagenUrl: string | null;
    nivel: number;
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
