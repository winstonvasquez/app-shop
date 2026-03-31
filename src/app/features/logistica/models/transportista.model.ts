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
}
