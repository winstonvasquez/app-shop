import { inject, Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '@env/environment';
import { CheckEmailResponse, LoginRequest, LoginResponse, User, VerifyOtpRequest, SocialLoginRequest, RegisterWithOtpRequest } from './auth.model';

const TOKEN_KEY = 'auth_token';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);

    private currentUserSignal = signal<User | null>(this.loadUserFromStorage());

    readonly currentUser = this.currentUserSignal.asReadonly();
    readonly isAuthenticated = computed(() => this.currentUser() !== null);

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

    private setSession(response: LoginResponse): void {
        localStorage.setItem(TOKEN_KEY, response.token);
        this.currentUserSignal.set({
            userId: response.userId,
            username: response.username,
            activeCompanyId: response.activeCompanyId,
            availableCompanyIds: response.availableCompanyIds
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

            return {
                userId: payload.userId,
                username: payload.sub,
                activeCompanyId: payload.companyId,
                availableCompanyIds: [] // Will be populated on next login
            };
        } catch {
            localStorage.removeItem(TOKEN_KEY);
            return null;
        }
    }
}
