export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    username: string;
    userId: number;
    activeCompanyId: number;
    availableCompanyIds: number[];
    isNewUser?: boolean;
    enabledModules?: string[];
}

export type UserRole = 'CUSTOMER' | 'ADMIN' | 'EMPLOYEE' | string;

export interface User {
    userId: number;
    username: string;
    activeCompanyId: number;
    availableCompanyIds: number[];
    enabledModules: string[];
    role?: UserRole;
}

export interface CheckEmailResponse {
    exists: boolean;
    maskedEmail: string;
}

export interface VerifyOtpRequest {
    email: string;
    otp: string;
}

export interface SocialLoginRequest {
    provider: string;
    token: string;
}

export interface RegisterWithOtpRequest {
    email: string;
    nombres: string;
    apellidos: string;
    tipoDocumento: string;
    numeroDocumento: string;
    fechaNacimiento: string;
}
