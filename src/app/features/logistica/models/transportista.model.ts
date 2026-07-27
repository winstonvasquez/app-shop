export interface Transportista {
    id: string;
    code: string;
    name: string;
    serviceType: string;
    contactPhone?: string;
    contactEmail?: string;
    apiUrl?: string;
    active: boolean;
    tenantId?: string;
    companyId?: string;
    createdAt?: string;
    /** Tarifa base fija por envío (ronda 3 consistenciación). Null si no está configurada. */
    baseCost?: number | null;
    /** Costo adicional por kilo (ronda 3 consistenciación). Null si no está configurada. */
    costPerKg?: number | null;
}

export interface TransportistaPage {
    content: Transportista[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}

export interface CreateTransportistaDto {
    code: string;
    name: string;
    serviceType: string;
    contactPhone?: string;
    contactEmail?: string;
    apiUrl?: string;
    apiKey?: string;
    active?: boolean;
    tenantId: string;
    companyId: string;
    baseCost?: number | null;
    costPerKg?: number | null;
}
