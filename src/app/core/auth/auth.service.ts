import { inject, Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '@env/environment';
import { CheckEmailResponse, LoginRequest, LoginResponse, User, UserRole, VerifyOtpRequest, SocialLoginRequest, RegisterWithOtpRequest } from './auth.model';

const TOKEN_KEY = 'auth_token';

/**
 * Extrae el rol del payload JWT decodificado.
 * El backend puede enviarlo como: role (string), roles (array) o authorities (Spring Security).
 * Función standalone para poder usarla en inicializadores de campo de clase.
 */
function extractRoleFromJwtPayload(payload: Record<string, unknown>): UserRole | undefined {
    if (typeof payload['role'] === 'string') {
        return payload['role'] as UserRole;
    }
    if (Array.isArray(payload['roles']) && payload['roles'].length > 0) {
        return String(payload['roles'][0]) as UserRole;
    }
    if (Array.isArray(payload['authorities']) && payload['authorities'].length > 0) {
        const first = payload['authorities'][0];
        const authority = typeof first === 'string' ? first : (first as Record<string, string>)['authority'] ?? '';
        return authority as UserRole;
    }
    return undefined;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);

    private currentUserSignal = signal<User | null>(this.loadUserFromStorage());

    readonly currentUser = this.currentUserSignal.asReadonly();
    readonly isAuthenticated = computed(() => this.currentUser() !== null);
    readonly enabledModules = computed(() => this.currentUser()?.enabledModules ?? []);

    /** Retorna true si el usuario autenticado tiene rol de cliente */
    isCustomer(): boolean {
        const user = this.currentUser();
        if (!user) return false;
        const role = user.role;
        if (!role) return false;
        return role === 'CUSTOMER';
    }

    /** Retorna true si el usuario autenticado tiene rol de admin o empleado */
    isAdmin(): boolean {
        const user = this.currentUser();
        if (!user) return false;
        const role = user.role;
        if (!role) return false;
        return role === 'ADMIN' || role === 'EMPLOYEE' || role === 'ROLE_ADMIN' || role === 'ROLE_USER';
    }

    login(request: LoginRequest): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(
            `${environment.apiUrls.users}/api/auth/login`,
            request
        ).pipe(
            tap(response => {
                this.setSession(response);
            })
        );
    }

    checkEmail(email: string): Observable<CheckEmailResponse> {
        return this.http.post<CheckEmailResponse>(
            `${environment.apiUrls.users}/api/auth/check-email`,
            { email }
        );
    }

    sendOtp(email: string): Observable<void> {
        return this.http.post<void>(
            `${environment.apiUrls.users}/api/auth/send-otp`,
            { email }
        );
    }

    verifyOtpAndLogin(payload: VerifyOtpRequest): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(
            `${environment.apiUrls.users}/api/auth/verify-otp`,
            payload
        ).pipe(
            tap(response => {
                if (!response.isNewUser) {
                    this.setSession(response);
                }
            })
        );
    }

    registerWithOtp(payload: RegisterWithOtpRequest): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(
            `${environment.apiUrls.users}/api/auth/register-with-otp`,
            payload
        ).pipe(
            tap(response => this.setSession(response))
        );
    }

    socialLogin(payload: SocialLoginRequest): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(
            `${environment.apiUrls.users}/api/auth/social-login`,
            payload
        ).pipe(
            tap(response => this.setSession(response))
        );
    }

    logout(): void {
        localStorage.removeItem(TOKEN_KEY);
        this.currentUserSignal.set(null);
        this.router.navigate(['/']);
    }

    getToken(): string | null {
        return localStorage.getItem(TOKEN_KEY);
    }

    hasModule(moduleCode: string): boolean {
        return this.enabledModules().includes(moduleCode);
    }

    setSessionFromResponse(response: LoginResponse): void {
        this.setSession(response);
    }

    private setSession(response: LoginResponse): void {
        localStorage.setItem(TOKEN_KEY, response.token);
        // Extract modules and role from response or decode from JWT
        let modules: string[] = response.enabledModules ?? [];
        let role: UserRole | undefined;
        try {
            const payload = JSON.parse(atob(response.token.split('.')[1]));
            if (modules.length === 0 && payload.modules && typeof payload.modules === 'string') {
                modules = payload.modules.split(',').map((m: string) => m.trim()).filter(Boolean);
            }
            role = extractRoleFromJwtPayload(payload);
        } catch {
            modules = [];
        }
        this.currentUserSignal.set({
            userId: response.userId,
            username: response.username,
            activeCompanyId: response.activeCompanyId,
            availableCompanyIds: response.availableCompanyIds,
            enabledModules: modules,
            role
        });
    }


    private loadUserFromStorage(): User | null {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
            return null;
        }

        try {
            // Decode JWT payload (simple base64 decode)
            const payload = JSON.parse(atob(token.split('.')[1]));

            // Check if token is expired
            if (payload.exp && payload.exp * 1000 < Date.now()) {
                localStorage.removeItem(TOKEN_KEY);
                return null;
            }

            // Extract modules from JWT claim
            let enabledModules: string[] = [];
            if (payload.modules && typeof payload.modules === 'string') {
                enabledModules = payload.modules.split(',').map((m: string) => m.trim()).filter(Boolean);
            }

            const role = extractRoleFromJwtPayload(payload);

            return {
                userId: payload.userId,
                username: payload.sub,
                activeCompanyId: payload.companyId,
                availableCompanyIds: [], // Will be populated on next login
                enabledModules,
                role
            };
        } catch {
            localStorage.removeItem(TOKEN_KEY);
            return null;
        }
    }
}
