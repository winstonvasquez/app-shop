import { inject, Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '@env/environment';
import { CheckEmailResponse, LoginRequest, LoginResponse, User, UserRole, VerifyOtpRequest, SocialLoginRequest, RegisterWithOtpRequest } from './auth.model';
import { STORAGE_KEYS, ROLES } from '@shared/constants/app.constants';
import { API_ENDPOINTS } from '@shared/constants/api.constants';
import { extractRoleFromJwtPayload, modulosDesdeClaim, payloadDeJwt, usuarioDesdeJwt } from './jwt.util';

const TOKEN_KEY = STORAGE_KEYS.token;

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
        return role === ROLES.admin || role === ROLES.employee || role === 'ROLE_ADMIN' || role === 'ROLE_USER';
    }

    /**
     * Retorna true si el usuario autenticado es SUPERADMIN (super-admin de la plataforma,
     * cross-tenant — distinto de un ADMIN normal, que solo administra su propia empresa).
     */
    isSuperAdmin(): boolean {
        const user = this.currentUser();
        if (!user) return false;
        const role = user.role;
        if (!role) return false;
        return role === ROLES.superadmin || role === 'ROLE_SUPERADMIN';
    }

    /**
     * Escrituras de gestión de la tienda: catálogo, promociones, banners, sucursales, devoluciones de
     * pedido y apariencia. Es la regla del backend `GESTION_TIENDA` (ADMIN o GERENTE; SUPERADMIN entra
     * por la jerarquía de roles): a cualquier otro rol esas escrituras le responden 403.
     */
    puedeGestionarTienda(): boolean {
        const role = this.currentUser()?.role;
        return role === 'ROLE_ADMIN' || role === 'ROLE_GERENTE' || role === 'ROLE_SUPERADMIN'
            || role === ROLES.admin || role === ROLES.superadmin;
    }

    login(request: LoginRequest): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(
            `${environment.apiUrls.users}${API_ENDPOINTS.auth.login}`,
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
        localStorage.removeItem(STORAGE_KEYS.shopTheme);
        localStorage.removeItem(STORAGE_KEYS.adminTheme);
        localStorage.removeItem(STORAGE_KEYS.posTheme);
        this.clearTenantScopedLocalState();
        this.currentUserSignal.set(null);
        this.router.navigate(['/auth/login']);
    }

    /**
     * Limpia carrito y datos de invitado guardados en localStorage. Ninguno de los dos
     * está namespaced por companyId — si un registro/login de una empresa nueva no los
     * limpia, un carrito con productId de OTRA empresa (misma pestaña/dispositivo) queda
     * visible en la tienda de la empresa recién creada. Llamar SIEMPRE antes de establecer
     * la sesión de una empresa nueva (ver register-page.component.ts).
     */
    clearTenantScopedLocalState(): void {
        localStorage.removeItem(STORAGE_KEYS.cart);
        localStorage.removeItem(STORAGE_KEYS.guestEmail);
        localStorage.removeItem(STORAGE_KEYS.guestPhone);
        localStorage.removeItem(STORAGE_KEYS.guestName);
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
        // Aislamiento multi-tenant en el navegador: el carrito y los datos de invitado NO están
        // namespaced por empresa, así que si la sesión que entra pertenece a una empresa distinta
        // de la que estaba activa hay que descartarlos. Antes esto solo se hacía en logout() y en
        // register-page, de modo que un login normal o un cambio de empresa activa dejaba resucitar
        // el carrito de la empresa anterior (con productIds que no existen en la nueva).
        // El punto de control va aquí, en setSession, porque TODOS los caminos que establecen
        // sesión pasan por él (login, verifyOtpAndLogin, registerWithOtp, socialLogin y el switch
        // de empresa vía setSessionFromResponse); parchear los llamadores uno a uno dejaría
        // siempre alguno fuera.
        const empresaAnterior = this.currentUserSignal()?.activeCompanyId
            ?? this.loadUserFromStorage()?.activeCompanyId;
        if (empresaAnterior != null && empresaAnterior !== response.activeCompanyId) {
            this.clearTenantScopedLocalState();
        }

        localStorage.setItem(TOKEN_KEY, response.token);
        // Los módulos y el rol vienen en la respuesta o, si no, se leen del propio token.
        // Ojo: un token ilegible descarta también los módulos que trajera la respuesta — es el
        // comportamiento que ya había, y es el conservador (los feature flags fallan cerrados).
        let modules: string[] = response.enabledModules ?? [];
        let role: UserRole | undefined;
        const payload = payloadDeJwt(response.token);
        if (!payload) {
            modules = [];
        } else {
            if (modules.length === 0) modules = modulosDesdeClaim(payload['modules']);
            role = extractRoleFromJwtPayload(payload);
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


    /**
     * Restaura la sesión desde el token guardado. Un token que no da usuario (corrupto o
     * caducado) se BORRA: dejarlo puesto haría que cada petición saliera con un token muerto
     * y el usuario viera 401 en vez de la pantalla de login.
     */
    private loadUserFromStorage(): User | null {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
            return null;
        }
        const usuario = usuarioDesdeJwt(token);
        if (!usuario) {
            localStorage.removeItem(TOKEN_KEY);
        }
        return usuario;
    }
}
