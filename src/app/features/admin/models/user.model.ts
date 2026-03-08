// Models aligned with backend DTOs from microshopusers

export interface UserResponse {
    id: number;
    username: string;
    email: string;
    rol: RolDto;
    persona: PersonaDto;
    createdAt: string;
    updatedAt: string;
}

export interface RolDto {
    id: number;
    nombre: string;
    descripcion: string;
}

export interface PersonaDto {
    id: number;
    nombres: string;
    apellidos: string;
    nombreCompleto: string;
    tipoDocumento: string;
    numeroDocumento: string;
    fechaNacimiento: string; // ISO date string
}

export interface UserRequest {
    username: string;
    email: string;
    password: string;
    rolId: number;
    nombres: string;
    apellidos: string;
    tipoDocumento: string;
    numeroDocumento: string;
    fechaNacimiento: string; // ISO date string (YYYY-MM-DD)
}

// Extended model for frontend with additional properties for UX
export interface UserFormModel extends UserRequest {
    id?: number; // For edit mode

    // Additional frontend-only properties
    _isLoading?: boolean;
    _isDirty?: boolean;
    _errors?: Record<string, string>;
    _passwordConfirm?: string; // For password confirmation
}

// Filter model
export interface UserFilter {
    search?: string;
    rolId?: number;
    tipoDocumento?: string;
}

// Tipo de documento options
export const TIPO_DOCUMENTO_OPTIONS = [
    { value: 'DNI', label: 'DNI' },
    { value: 'CE', label: 'Carnet de Extranjería' },
    { value: 'PASAPORTE', label: 'Pasaporte' }
] as const;

export type TipoDocumento = typeof TIPO_DOCUMENTO_OPTIONS[number]['value'];
