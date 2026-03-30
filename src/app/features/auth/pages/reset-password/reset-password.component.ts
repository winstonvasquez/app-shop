import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '@env/environment';

/** Validador que comprueba que newPassword y confirmPassword coincidan. */
function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get('newPassword')?.value as string | null;
    const confirmPassword = control.get('confirmPassword')?.value as string | null;
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
        return { passwordsMismatch: true };
    }
    return null;
}

@Component({
    selector: 'app-reset-password',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block w-full min-h-screen' },
    template: `
<main class="login-layout min-h-screen flex items-center justify-center bg-[var(--color-background)] p-6">
    <div class="w-full sm:w-[420px]">

        <!-- Header -->
        <header class="mb-10 text-center">
            <div class="flex items-center justify-center gap-2 mb-6">
                <span class="text-3xl font-black tracking-tighter text-[var(--color-text-primary)]">APP</span>
                <span class="text-3xl font-black tracking-tighter text-[var(--color-primary)]">SHOP</span>
            </div>
            <h1 class="text-3xl font-extrabold text-[var(--color-text-primary)] tracking-tight">
                Nueva contraseña
            </h1>
            <p class="mt-3 text-[var(--color-text-muted)] text-sm">
                Ingresa y confirma tu nueva contraseña.
            </p>
        </header>

        <!-- Token ausente -->
        @if (!token) {
        <div class="p-5 bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 rounded-xl text-center">
            <p class="text-[var(--color-error)] font-semibold">Enlace inválido</p>
            <p class="text-[var(--color-text-muted)] text-sm mt-2">
                El enlace de recuperación no es válido. Solicita uno nuevo.
            </p>
            <a [routerLink]="['/auth/forgot-password']"
                class="inline-block mt-4 text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] transition-colors">
                Solicitar nuevo enlace
            </a>
        </div>
        }

        <!-- Éxito -->
        @if (success()) {
        <div class="p-5 bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 rounded-xl text-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 mx-auto mb-3 text-[var(--color-success)]"
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-[var(--color-success)] font-semibold text-base">
                ¡Contraseña actualizada!
            </p>
            <p class="text-[var(--color-text-muted)] text-sm mt-2">
                Tu contraseña fue cambiada exitosamente. Redirigiendo al inicio de sesión...
            </p>
        </div>
        }

        <!-- Error -->
        @if (error()) {
        <div class="mb-6 p-4 bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 text-[var(--color-error)] rounded-xl text-sm font-medium flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ error() }}
        </div>
        }

        <!-- Formulario -->
        @if (token && !success()) {
        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>

            <!-- Nueva contraseña -->
            <div class="mb-5">
                <label for="newPassword" class="block mb-2 text-sm font-medium text-[var(--color-text-secondary)]">
                    Nueva contraseña
                </label>
                <input
                    id="newPassword"
                    type="password"
                    formControlName="newPassword"
                    placeholder="Mínimo 8 caracteres"
                    class="block w-full rounded-xl bg-[var(--color-surface-raised)] py-3.5 px-4 text-[var(--color-text-primary)] ring-1 ring-inset ring-[var(--color-border)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)] transition-shadow text-base" />
                @if (form.get('newPassword')?.invalid && form.get('newPassword')?.touched) {
                <p class="mt-1.5 text-xs text-[var(--color-error)]">
                    La contraseña debe tener al menos 8 caracteres.
                </p>
                }
            </div>

            <!-- Confirmar contraseña -->
            <div class="mb-6">
                <label for="confirmPassword" class="block mb-2 text-sm font-medium text-[var(--color-text-secondary)]">
                    Confirmar contraseña
                </label>
                <input
                    id="confirmPassword"
                    type="password"
                    formControlName="confirmPassword"
                    placeholder="Repite tu nueva contraseña"
                    class="block w-full rounded-xl bg-[var(--color-surface-raised)] py-3.5 px-4 text-[var(--color-text-primary)] ring-1 ring-inset ring-[var(--color-border)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)] transition-shadow text-base" />
                @if (form.hasError('passwordsMismatch') && form.get('confirmPassword')?.touched) {
                <p class="mt-1.5 text-xs text-[var(--color-error)]">
                    Las contraseñas no coinciden.
                </p>
                }
            </div>

            <!-- Submit -->
            <button
                type="submit"
                [disabled]="form.invalid || isSaving()"
                class="flex w-full justify-center items-center gap-3 btn-primary-gradient rounded-xl px-4 py-4 text-sm font-bold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0">
                @if (isSaving()) {
                <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Guardando...</span>
                } @else {
                <span>Cambiar contraseña</span>
                }
            </button>

        </form>

        <!-- Volver al login -->
        <div class="mt-8 text-center text-sm">
            <a [routerLink]="['/auth/login']"
                class="font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] transition-colors">
                ← Volver al inicio de sesión
            </a>
        </div>
        }

    </div>
</main>
    `
})
export class ResetPasswordComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    isSaving = signal(false);
    success = signal(false);
    error = signal<string | null>(null);

    token: string | null = null;

    form = this.fb.group(
        {
            newPassword: ['', [Validators.required, Validators.minLength(8)]],
            confirmPassword: ['', [Validators.required]]
        },
        { validators: passwordsMatchValidator }
    );

    ngOnInit(): void {
        this.token = this.route.snapshot.queryParamMap.get('token');
    }

    onSubmit(): void {
        if (this.form.invalid || !this.token) {
            this.form.markAllAsTouched();
            return;
        }

        this.isSaving.set(true);
        this.error.set(null);

        const { newPassword } = this.form.value;

        this.http.post<void>(
            `${environment.apiUrls.users}/api/auth/reset-password`,
            { token: this.token, newPassword }
        ).subscribe({
            next: () => {
                this.isSaving.set(false);
                this.success.set(true);
                setTimeout(() => this.router.navigate(['/auth/login']), 2500);
            },
            error: (err: unknown) => {
                this.isSaving.set(false);
                const httpErr = err as { status?: number; error?: { detail?: string } };
                if (httpErr.status === 400) {
                    this.error.set(
                        httpErr.error?.detail ?? 'Token inválido o expirado. Solicita un nuevo enlace.'
                    );
                } else if (httpErr.status === 0) {
                    this.error.set('No se pudo conectar con el servidor. Intenta más tarde.');
                } else {
                    this.error.set('Ocurrió un error inesperado. Intenta nuevamente.');
                }
            }
        });
    }
}
