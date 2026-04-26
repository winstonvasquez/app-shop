import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '@core/auth/auth.service';
import { DsButtonComponent, DsWordmarkComponent } from '@shared/ui/ds';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        TranslateModule,
        RouterLink,
        LucideAngularModule,
        DsButtonComponent,
        DsWordmarkComponent,
    ],
    templateUrl: './login.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block w-full min-h-screen' },
})
export class LoginComponent {
    private fb          = inject(FormBuilder);
    private authService = inject(AuthService);
    private router      = inject(Router);
    private route       = inject(ActivatedRoute);
    private translate   = inject(TranslateService);

    loginForm = this.fb.group({
        username: ['', [Validators.required]],
        password: ['', [Validators.required]],
    });

    loading      = signal<boolean>(false);
    errorMessage = signal<string | null>(null);
    showPassword = signal<boolean>(false);
    rememberMe   = signal<boolean>(true);

    err(field: 'username' | 'password'): string {
        const c = this.loginForm.get(field);
        if (!c || c.pristine || c.valid) return '';
        if (c.hasError('required')) return this.translate.instant('auth.fieldRequired');
        return this.translate.instant('auth.fieldInvalid');
    }

    errorBanner(): string {
        const key = this.errorMessage();
        return key ? this.translate.instant(key) : '';
    }

    togglePassword(): void { this.showPassword.update(v => !v); }
    toggleRemember(): void { this.rememberMe.update(v => !v); }

    onSubmit(): void {
        if (this.loginForm.invalid) return;

        this.loading.set(true);
        this.errorMessage.set(null);

        const { username, password } = this.loginForm.value;

        this.authService.login({ username: username!, password: password! }).subscribe({
            next: () => {
                this.loading.set(false);
                this.navigateAfterLogin();
            },
            error: (error) => {
                this.loading.set(false);
                this.errorMessage.set(error.status === 401
                    ? 'auth.errorInvalidCredentials'
                    : 'auth.errorConnection',
                );
            },
        });
    }

    private navigateAfterLogin(): void {
        const returnUrlParam   = this.route.snapshot.queryParams['returnUrl'];
        const returnUrlSession = sessionStorage.getItem('returnUrl');
        const returnUrl        = returnUrlParam || returnUrlSession;

        if (returnUrl) {
            sessionStorage.removeItem('returnUrl');
            this.router.navigateByUrl(returnUrl);
            return;
        }

        if (this.authService.isCustomer()) {
            this.router.navigate(['/home']);
        } else {
            this.router.navigate(['/admin/dashboard']);
        }
    }
}
