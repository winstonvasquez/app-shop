// Models aligned with backend DTOs from microshopusers

export interface CompanyResponse {
    id: number;
    name: string;
    ruc: string;
    isActive: boolean;
    legalName: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    logoUrl: string | null;
    domain: string | null;
}

export interface CompanyRequest {
    name: string;
    ruc: string;
    active: boolean;
    legalName?: string;
    address?: string;
    phone?: string;
    email?: string;
    logoUrl?: string;
    domain?: string;
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

// Company module (SaaS)
export interface CompanyModuleResponse {
    id: number;
    code: string;
    name: string;
    description: string | null;
    icon: string | null;
    routePrefix: string | null;
    enabled: boolean;
}

// Company user
export interface CompanyUserResponse {
    userId: number;
    username: string;
    fullName: string;
    email: string;
    roles: string[];
    isActive: boolean;
    assignedAt: string;
}

// Company subscription
export interface CompanySubscriptionResponse {
    subscriptionId: number;
    planCode: string;
    planName: string;
    planDescription: string | null;
    status: string;
    startsAt: string;
    endsAt: string | null;
    trialEndsAt: string | null;
    priceMonthly: number | null;
    priceAnnual: number | null;
    maxUsers: number;
}
