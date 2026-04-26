import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { environment } from '@env/environment';

import { DsButtonComponent, DsWordmarkComponent } from '@shared/ui/ds';

@Component({
    selector: 'app-forgot-password',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        RouterLink,
        TranslateModule,
        LucideAngularModule,
        DsButtonComponent,
        DsWordmarkComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block w-full min-h-screen' },
    template: `
<main class="ds-recover">
    <div class="card">
        <div class="brand"><ds-wordmark [size]="24"/></div>

        <div class="ic-wrap">
            <lucide-icon name="mail" [size]="26"/>
        </div>

        <h1 class="title">Recuperar contraseña</h1>
        <p class="sub">Ingresa tu correo y te enviaremos un enlace seguro para restablecerla.</p>

        @if (sent()) {
            <div class="alert ok">
                <lucide-icon name="check-circle" [size]="18"/>
                <div>
                    <strong>¡Enlace enviado!</strong>
                    <p>Revisa tu correo. Si no lo ves, mira tu carpeta de spam.</p>
                </div>
            </div>
            <ds-button variant="secondary" size="md" [full]="true" routerLink="/auth/login" icon="arrow-left">
                Volver al inicio de sesión
            </ds-button>
        }

        @if (!sent()) {
            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form">
                @if (error()) {
                    <div class="alert err">
                        <lucide-icon name="alert-triangle" [size]="16"/>
                        {{ error() }}
                    </div>
                }

                <div class="field">
                    <label class="lbl">Correo electrónico <span class="req">*</span></label>
                    <label class="input-wrap" [class.is-error]="!!emailError()">
                        <lucide-icon name="mail" [size]="16" class="ic"/>
                        <input formControlName="email" type="email" placeholder="tu@correo.pe" autocomplete="email"/>
                    </label>
                    @if (emailError()) {
                        <span class="hint err">{{ emailError() }}</span>
                    }
                </div>

                <ds-button variant="primary" size="lg" type="submit" [full]="true"
                    [disabled]="form.invalid || isSending()">
                    @if (isSending()) { Enviando… } @else { Enviar enlace de recuperación }
                </ds-button>

                <div class="info">
                    <lucide-icon name="shield" [size]="14" class="info-ic"/>
                    <span>Por tu seguridad, el enlace expira en 30 minutos. Si no lo recibes, revisa tu carpeta de spam.</span>
                </div>

                <a routerLink="/auth/login" class="back-link">← Volver al inicio de sesión</a>
            </form>
        }
    </div>
</main>

<style>
    .ds-recover {
        background: var(--c-bg, var(--color-background));
        min-height: 100vh;
        display: flex; align-items: center; justify-content: center;
        font-family: var(--f-sans);
        color: var(--c-text);
        padding: 24px;
    }
    .card {
        width: 100%; max-width: 440px;
        background: var(--c-surface);
        border: 1px solid var(--c-border);
        border-radius: var(--r-xl);
        box-shadow: var(--s-lg);
        padding: 36px;
    }
    .brand { display: flex; justify-content: center; margin-bottom: 20px; }
    .ic-wrap {
        width: 56px; height: 56px;
        border-radius: var(--r-lg);
        background: color-mix(in srgb, var(--c-brand) 12%, var(--c-surface));
        color: var(--c-brand);
        display: inline-flex; align-items: center; justify-content: center;
        margin: 0 auto 16px;
    }
    .title {
        font-family: var(--f-display);
        font-size: 24px; font-weight: 700;
        margin: 0 0 6px; color: var(--c-text);
        text-align: center; letter-spacing: -0.02em;
    }
    .sub {
        font-size: 14px; color: var(--c-muted);
        margin: 0 0 24px;
        text-align: center; line-height: 1.5;
    }
    .form { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .lbl { font-size: 12px; font-weight: 600; color: var(--c-text); }
    .req { color: var(--c-danger); }
    .input-wrap {
        display: flex; align-items: center;
        height: 44px; padding: 0 14px; gap: 8px;
        background: var(--c-surface);
        border: 1px solid var(--c-border);
        border-radius: var(--r-md);
        transition: border-color 120ms, box-shadow 120ms;
    }
    .input-wrap:focus-within {
        border-color: var(--c-brand);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-brand) 25%, transparent);
    }
    .input-wrap.is-error { border-color: var(--c-danger); }
    .input-wrap input {
        flex: 1; border: none; outline: none;
        font-size: 14px; color: var(--c-text);
        background: transparent; font-family: inherit;
    }
    .input-wrap .ic { color: var(--c-muted); }

    .hint { font-size: 12px; }
    .hint.err { color: var(--c-danger); }

    .alert {
        display: flex; gap: 10px; align-items: flex-start;
        padding: 12px;
        border-radius: var(--r-md);
        font-size: 13px;
        margin-bottom: 4px;
    }
    .alert.err {
        background: color-mix(in srgb, var(--c-danger) 12%, var(--c-surface));
        border: 1px solid color-mix(in srgb, var(--c-danger) 30%, var(--c-border));
        color: var(--c-danger);
    }
    .alert.ok {
        background: color-mix(in srgb, var(--c-success) 12%, var(--c-surface));
        border: 1px solid color-mix(in srgb, var(--c-success) 30%, var(--c-border));
        color: var(--c-success);
        margin-bottom: 16px;
    }
    .alert.ok p { margin: 4px 0 0; color: var(--c-text); font-size: 13px; }

    .info {
        background: color-mix(in srgb, var(--c-info) 8%, var(--c-surface));
        border: 1px solid color-mix(in srgb, var(--c-info) 25%, var(--c-border));
        border-radius: var(--r-md);
        padding: 12px;
        font-size: 12px; color: var(--c-muted);
        display: flex; gap: 8px; align-items: flex-start;
    }
    .info-ic { color: var(--c-info); flex-shrink: 0; margin-top: 1px; }

    .back-link {
        text-align: center; font-size: 13px;
        color: var(--c-brand); font-weight: 600;
        text-decoration: none; cursor: pointer;
    }
    .back-link:hover { filter: brightness(1.1); }

    @media (max-width: 640px) {
        .card { padding: 24px; }
    }
</style>
    `,
})
export class ForgotPasswordComponent {
    private readonly fb   = inject(FormBuilder);
    private readonly http = inject(HttpClient);

    isSending = signal(false);
    sent      = signal(false);
    error     = signal<string | null>(null);

    form = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
    });

    emailError(): string {
        const c = this.form.get('email');
        if (!c || c.pristine || c.valid) return '';
        if (c.hasError('required')) return 'Correo electrónico requerido.';
        if (c.hasError('email'))    return 'Ingresa un correo electrónico válido.';
        return 'Campo inválido.';
    }

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
            { email },
        ).subscribe({
            next: () => {
                this.isSending.set(false);
                this.sent.set(true);
            },
            error: (err: unknown) => {
                this.isSending.set(false);
                const httpErr = err as { status?: number };
                this.error.set(httpErr.status === 0
                    ? 'No se pudo conectar con el servidor. Intenta más tarde.'
                    : 'Ocurrió un error al procesar tu solicitud. Intenta nuevamente.',
                );
            },
        });
    }
}
