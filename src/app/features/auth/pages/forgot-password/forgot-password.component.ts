import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '@env/environment';

@Component({
    selector: 'app-forgot-password',
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
                Recuperar contraseña
            </h1>
            <p class="mt-3 text-[var(--color-text-muted)] text-sm">
                Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
            </p>
        </header>

        <!-- Éxito -->
        @if (sent()) {
        <div class="p-5 bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 rounded-xl text-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 mx-auto mb-3 text-[var(--color-success)]"
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-[var(--color-success)] font-semibold text-base">
                ¡Enlace enviado!
            </p>
            <p class="text-[var(--color-text-muted)] text-sm mt-2">
                Revisa tu correo, te enviamos un enlace para restablecer tu contraseña.
                Si no lo ves, revisa tu carpeta de spam.
            </p>
            <a [routerLink]="['/auth/login']"
                class="inline-block mt-5 text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] transition-colors">
                Volver al inicio de sesión
            </a>
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
        @if (!sent()) {
        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>

            <!-- Email -->
            <div class="mb-6">
                <label for="email" class="block mb-2 text-sm font-medium text-[var(--color-text-secondary)]">
                    Correo electrónico
                </label>
                <input
                    id="email"
                    type="email"
                    formControlName="email"
                    placeholder="tu@correo.com"
                    class="block w-full rounded-xl bg-[var(--color-surface-raised)] py-3.5 px-4 text-[var(--color-text-primary)] ring-1 ring-inset ring-[var(--color-border)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)] transition-shadow text-base" />
                @if (form.get('email')?.invalid && form.get('email')?.touched) {
                <p class="mt-1.5 text-xs text-[var(--color-error)]">
                    Ingresa un correo electrónico válido.
                </p>
                }
            </div>

            <!-- Submit -->
            <button
                type="submit"
                [disabled]="form.invalid || isSending()"
                class="flex w-full justify-center items-center gap-3 btn-primary-gradient rounded-xl px-4 py-4 text-sm font-bold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0">
                @if (isSending()) {
                <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Enviando...</span>
                } @else {
                <span>Enviar enlace</span>
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
export class ForgotPasswordComponent {
    private readonly fb = inject(FormBuilder);
    private readonly http = inject(HttpClient);

    isSending = signal(false);
    sent = signal(false);
    error = signal<string | null>(null);

    form = this.fb.group({
        email: ['', [Validators.required, Validators.email]]
    });

    onSubmit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.isSending.set(true);
        this.error.set(null);

        const email = this.form.value.email!;

        this.http.post<void>(
            `${environment.apiUrls.users}/api/auth/forgot-password`,
            { email }
        ).subscribe({
            next: () => {
                this.isSending.set(false);
                this.sent.set(true);
            },
            error: (err: unknown) => {
                this.isSending.set(false);
                const httpErr = err as { status?: number };
                this.error.set(
                    httpErr.status === 0
                        ? 'No se pudo conectar con el servidor. Intenta más tarde.'
                        : 'Ocurrió un error al procesar tu solicitud. Intenta nuevamente.'
                );
            }
        });
    }
}
