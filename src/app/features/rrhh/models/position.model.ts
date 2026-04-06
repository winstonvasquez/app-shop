export interface Position {
    id: number;
    tenantId: number;
    codigo: string;
    nombre: string;
    descripcion?: string;
    departmentId: number;
    departmentName?: string;
    nivel?: string;
    salarioMinimo?: number;
    salarioMaximo?: number;
    requisitos?: string;
    activo: boolean;
    employeeCount: number;
    createdAt: string;
    updatedAt?: string;
}

export interface PositionRequest {
    codigo: string;
    nombre: string;
    descripcion?: string;
    departmentId: number;
    nivel?: string;
    salarioMinimo?: number;
    salarioMaximo?: number;
    requisitos?: string;
}
