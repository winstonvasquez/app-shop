// Models aligned with backend DTOs from microshopusers

export interface CompanyResponse {
    id: number;
    name: string;
    ruc: string;
    isActive: boolean;
}

export interface CompanyRequest {
    name: string;
    ruc: string;
    active: boolean;
}

// Extended model for frontend with additional properties for UX
export interface CompanyFormModel extends CompanyRequest {
    id?: number; // For edit mode

    // Additional frontend-only properties
    _isLoading?: boolean;
    _isDirty?: boolean;
    _errors?: Record<string, string>;
}

// Filter model
export interface CompanyFilter {
    search?: string;
    active?: boolean;
}

// User-Company relationship
export interface UserCompanyResponse {
    id: number;
    userId: number;
    companyId: number;
    roleIds: number[];
}
