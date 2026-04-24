export interface SaasModuleInfo {
    id: number;
    code: string;
    name: string;
    description: string;
    icon: string;
    routePrefix: string;
    enabled: boolean;
}

export interface SaasPlanInfo {
    id: number;
    code: string;
    name: string;
    description: string;
    priceMonthly: number;
    priceAnnual: number;
    maxUsers: number;
    moduleCodes: string[];
}

export interface CompanyProfile {
    id: number;
    name: string;
    ruc: string;
    legalName: string;
    address: string;
    phone: string;
    email: string;
    logoUrl: string;
    planCode: string;
    subscriptionStatus: 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
    enabledModules: SaasModuleInfo[];
}

export interface SaasRegisterPayload {
    companyName: string;
    ruc: string;
    adminEmail: string;
    adminPassword: string;
    adminNombres: string;
    adminApellidos: string;
    planCode: string;
}
