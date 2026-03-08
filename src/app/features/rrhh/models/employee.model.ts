export interface Employee {
    id: number;
    tenantId: number;
    codigoEmpleado: string;
    nombres: string;
    apellidos: string;
    documentoIdentidad: string;
    fechaIngreso: string;
    cargo?: string;
    area?: string;
    email?: string;
    telefono?: string;
    estado: 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO' | 'CESADO';
    createdAt: string;
    updatedAt?: string;
}

export interface EmployeeRequest {
    codigoEmpleado: string;
    nombres: string;
    apellidos: string;
    documentoIdentidad: string;
    fechaIngreso: string;
    cargo?: string;
    area?: string;
    email?: string;
    telefono?: string;
    estado?: 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO' | 'CESADO';
}
