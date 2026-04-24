export interface Department {
    id: number;
    tenantId: number;
    codigo: string;
    nombre: string;
    descripcion?: string;
    managerId?: number;
    managerName?: string;
    parentId?: number;
    parentName?: string;
    activo: boolean;
    employeeCount: number;
    positionCount: number;
    createdAt: string;
    updatedAt?: string;
    subDepartments?: Department[];
}

export interface DepartmentRequest {
    codigo: string;
    nombre: string;
    descripcion?: string;
    managerId?: number;
    parentId?: number;
}
