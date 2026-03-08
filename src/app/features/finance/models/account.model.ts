export interface Account {
    id: number;
    tenantId: number;
    planCuentasId: number;
    cuentaPadreId?: number;
    codigo: string;
    nombre: string;
    descripcion?: string;
    tipoCuenta: AccountType;
    naturaleza: AccountNature;
    nivel: number;
    aceptaMovimiento: boolean;
    requiereTercero: boolean;
    requiereCentroCosto: boolean;
    requiereDocumento: boolean;
    activo: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export enum AccountType {
    ACTIVO = 'ACTIVO',
    PASIVO = 'PASIVO',
    PATRIMONIO = 'PATRIMONIO',
    INGRESO = 'INGRESO',
    GASTO = 'GASTO'
}

export enum AccountNature {
    DEUDORA = 'DEUDORA',
    ACREEDORA = 'ACREEDORA'
}

export interface CreateAccountRequest {
    codigo: string;
    nombre: string;
    descripcion?: string;
    tipoCuenta: AccountType;
    naturaleza: AccountNature;
    nivel: number;
    cuentaPadreId?: number;
    aceptaMovimiento: boolean;
    requiereTercero: boolean;
    requiereCentroCosto: boolean;
    requiereDocumento: boolean;
}
