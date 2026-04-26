import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { environment } from '@env/environment';

import { DsButtonComponent, DsWordmarkComponent } from '@shared/ui/ds';

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPassword     = control.get('newPassword')?.value as string | null;
    const confirmPassword = control.get('confirmPassword')?.value as string | null;
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
        return { passwordsMismatch: true };
    }
    return null;
}

@Component({
    selector: 'app-reset-password',
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

        <div class="ic-wrap" [class.is-success]="success()">
            <lucide-icon [name]="success() ? 'check-circle' : 'key-round'" [size]="26"/>
        </div>

        <h1 class="title">{{ success() ? '¡Contraseña actualizada!' : 'Nueva contraseña' }}</h1>
        <p class="sub">
            @if (success()) {
                Tu contraseña fue cambiada exitosamente. Te redirigimos al inicio de sesión.
            } @else if (!token) {
                El enlace de recuperación no es válido. Solicita uno nuevo.
            } @else {
                Ingresa y confirma tu nueva contraseña.
            }
        </p>

        @if (!token) {
            <ds-button variant="primary" size="md" [full]="true" routerLink="/auth/forgot-password">
                Solicitar nuevo enlace
            </ds-button>
        }

        @if (token && !success()) {
            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form">
                @if (error()) {
                    <div class="alert err">
                        <lucide-icon name="alert-triangle" [size]="16"/>
                        {{ error() }}
                    </div>
                }

                <div class="field">
                    <label class="lbl">Nueva contraseña <span class="req">*</span></label>
                    <label class="input-wrap"
                        [class.is-error]="form.get('newPassword')?.invalid && form.get('newPassword')?.touched">
                        <lucide-icon name="lock" [size]="16" class="ic"/>
                        <input formControlName="newPassword"
                            [type]="show1() ? 'text' : 'password'"
                            placeholder="Mínimo 8 caracteres"
                            autocomplete="new-password"/>
                        <button type="button" class="toggle" (click)="show1.set(!show1())" aria-label="Mostrar/ocultar">
                            <lucide-icon [name]="show1() ? 'eye-off' : 'eye'" [size]="16"/>
                        </button>
                    </label>
                    @if (form.get('newPassword')?.invalid && form.get('newPassword')?.touched) {
                        <span class="hint err">La contraseña debe tener al menos 8 caracteres.</span>
                    }
                </div>

                <div class="field">
                    <label class="lbl">Confirmar contraseña <span class="req">*</span></label>
                    <label class="input-wrap"
                        [class.is-error]="form.hasError('passwordsMismatch') && form.get('confirmPassword')?.touched">
                        <lucide-icon name="lock" [size]="16" class="ic"/>
                        <input formControlName="confirmPassword"
                            [type]="show2() ? 'text' : 'password'"
                            placeholder="Repite tu nueva contraseña"
                            autocomplete="new-password"/>
                        <button type="button" class="toggle" (click)="show2.set(!show2())" aria-label="Mostrar/ocultar">
                            <lucide-icon [name]="show2() ? 'eye-off' : 'eye'" [size]="16"/>
                        </button>
                    </label>
                    @if (form.hasError('passwordsMismatch') && form.get('confirmPassword')?.touched) {
                        <span class="hint err">Las contraseñas no coinciden.</span>
                    }
                </div>

                <ds-button variant="primary" size="lg" type="submit" [full]="true"
                    [disabled]="form.invalid || isSaving()">
                    @if (isSaving()) { Guardando… } @else { Cambiar contraseña }
                </ds-button>

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
        transition: background 200ms, color 200ms;
    }
    .ic-wrap.is-success {
        background: color-mix(in srgb, var(--c-success) 12%, var(--c-surface));
        color: var(--c-success);
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
    .toggle {
        background: none; border: none; padding: 4px;
        color: var(--c-muted); cursor: pointer;
        display: inline-flex;
    }
    .toggle:hover { color: var(--c-text); }

    .hint { font-size: 12px; }
    .hint.err { color: var(--c-danger); }

    .alert {
        display: flex; gap: 8px; align-items: center;
        padding: 10px 14px;
        border-radius: var(--r-md);
        font-size: 13px;
    }
    .alert.err {
        background: color-mix(in srgb, var(--c-danger) 12%, var(--c-surface));
        border: 1px solid color-mix(in srgb, var(--c-danger) 30%, var(--c-border));
        color: var(--c-danger);
    }

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
export class ResetPasswordComponent implements OnInit {
    private readonly fb     = inject(FormBuilder);
    private readonly http   = inject(HttpClient);
    private readonly router = inject(Router);
    private readonly route  = inject(ActivatedRoute);

    isSaving = signal(false);
    success  = signal(false);
    error    = signal<string | null>(null);
    show1    = signal(false);
    show2    = signal(false);

    token: string | null = null;

    form = this.fb.group(
        {
            newPassword:     ['', [Validators.required, Validators.minLength(8)]],
            confirmPassword: ['', [Validators.required]],
        },
        { validators: passwordsMatchValidator },
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
            { token: this.token, newPassword },
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
                    this.error.set(httpErr.error?.detail ?? 'Token inválido o expirado. Solicita un nuevo enlace.');
                } else if (httpErr.status === 0) {
                    this.error.set('No se pudo conectar con el servidor. Intenta más tarde.');
                } else {
                    this.error.set('Ocurrió un error inesperado. Intenta nuevamente.');
                }
            },
        });
    }
}
