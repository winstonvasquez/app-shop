export interface CompanyResponse {
    id: number;
    name: string;
    ruc: string;
    active: boolean;
}

export interface UserCompanyResponse {
    id: number;
    userId: number;
    companyId: number;
    active: boolean;
}
