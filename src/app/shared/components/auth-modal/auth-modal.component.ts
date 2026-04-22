import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';
import { SocialAuthService, SocialUser, GoogleSigninButtonModule } from '@abacritt/angularx-social-login';
import { GoogleLoginProvider, FacebookLoginProvider } from '@abacritt/angularx-social-login';
import { RegisterFormComponent, RegisterData } from './register-form.component';
import { environment } from '../../../../environments/environment';

type AuthStep = 'select' | 'email' | 'otp' | 'register';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [GoogleSigninButtonModule, RegisterFormComponent],
  templateUrl: './auth-modal.component.html',
  styleUrl: './auth-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthModal {
  isOpen = input(false);
  close = output<void>();
  loginSuccess = output<void>();

  private auth = inject(AuthService);
  private socialAuthService = inject(SocialAuthService);

  constructor() {
    this.socialAuthService.authState.subscribe((user: SocialUser) => {
      if (user) {
        this.loading.set(true);
        this.errorMsg.set('');

        let provider = '';
        if (user.provider === GoogleLoginProvider.PROVIDER_ID) provider = 'google';
        if (user.provider === FacebookLoginProvider.PROVIDER_ID) provider = 'facebook';

        this.auth.socialLogin({ provider, token: user.idToken || user.authToken || '' }).subscribe({
          next: () => {
            this.loading.set(false);
            this.loginSuccess.emit();
            this.closeModal();
            // Sign out from social provider to prevent auto-login loops if user logs out
            this.socialAuthService.signOut(true).catch(() => { });
          },
          error: (err) => {
            this.loading.set(false);
            this.errorMsg.set(err?.error?.message ?? `Error autenticando con ${user.provider}`);
            this.socialAuthService.signOut(true).catch(() => { });
          }
        });
      }
    });
  }

  /** true si Google client ID está configurado (no es placeholder) */
  readonly isGoogleConfigured = !environment.socialAuth.googleClientId.startsWith('TU_');

  step = signal<AuthStep>('select');
  email = signal('');
  otp = signal('');
  loading = signal(false);
  errorMsg = signal('');
  maskedEmail = signal('');

  closeModal() {
    this.resetState();
    this.close.emit();
  }

  goToEmail() {
    this.errorMsg.set('');
    this.step.set('email');
  }

  goBack() {
    this.errorMsg.set('');
    if (this.step() === 'otp') {
      this.step.set('email');
    } else if (this.step() === 'register') {
      this.step.set('otp');
    } else {
      this.step.set('select');
    }
  }

  onEmailSubmit() {
    const e = this.email().trim();
    if (!e || !e.includes('@')) {
      this.errorMsg.set('Ingresa un correo electrónico válido.');
      return;
    }
    this.loading.set(true);
    this.errorMsg.set('');

    this.auth.checkEmail(e).subscribe({
      next: (res) => {
        this.maskedEmail.set(res.maskedEmail);
        this.auth.sendOtp(e).subscribe({
          next: () => {
            this.loading.set(false);
            this.step.set('otp');
          },
          error: (err) => {
            this.loading.set(false);
            this.errorMsg.set(err?.error?.message ?? 'Error al enviar el código. Inténtalo de nuevo.');
          }
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.message ?? 'No se pudo verificar el correo.');
      }
    });
  }

  onOtpSubmit() {
    const code = this.otp().trim();
    if (code.length !== 6) {
      this.errorMsg.set('El código debe tener 6 dígitos.');
      return;
    }
    this.loading.set(true);
    this.errorMsg.set('');

    this.auth.verifyOtpAndLogin({ email: this.email().trim(), otp: code }).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.isNewUser) {
          this.step.set('register');
        } else {
          this.loginSuccess.emit();
          this.closeModal();
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.message ?? 'Código incorrecto o expirado. Inténtalo de nuevo.');
      }
    });
  }

  onRegisterSubmit(data: RegisterData) {
    this.loading.set(true);
    this.errorMsg.set('');

    this.auth.registerWithOtp({
      email: this.email().trim(),
      ...data
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.loginSuccess.emit();
        this.closeModal();
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.message ?? 'Error al registrar. Inténtalo de nuevo.');
      }
    });
  }

  resendOtp() {
    this.loading.set(true);
    this.errorMsg.set('');
    this.auth.sendOtp(this.email().trim()).subscribe({
      next: () => this.loading.set(false),
      error: () => {
        this.loading.set(false);
        this.errorMsg.set('No se pudo reenviar el código.');
      }
    });
  }

  async signInWithFacebook(): Promise<void> {
    // Facebook requires HTTPS even in development
    if (location.protocol !== 'https:') {
      this.errorMsg.set('Facebook requiere HTTPS. Activa SSL en tu servidor de desarrollo: ng serve --ssl');
      return;
    }

    try {
      this.errorMsg.set('');
      this.loading.set(true);
      await this.socialAuthService.signIn(FacebookLoginProvider.PROVIDER_ID);
    } catch (err: unknown) {
      this.loading.set(false);
      const msg: string = (err as { message?: string })?.message ?? '';
      if (msg.includes('FB.init') || msg.includes('before') || msg.includes('initialized')) {
        this.errorMsg.set('El SDK de Facebook no está listo todavía. Intenta de nuevo en unos segundos.');
      } else if (msg.includes('Facebook App Id') || msg.includes('App Id')) {
        this.errorMsg.set('El App ID de Facebook no está configurado. Revisa environment.ts.');
      } else if (msg.includes('http')) {
        this.errorMsg.set('Facebook requiere HTTPS. Activa SSL en tu servidor de desarrollo.');
      } else {
        this.errorMsg.set(msg || 'Error al abrir el inicio de sesión con Facebook.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  signInWithApple(): void {
    // Apple is currently a placeholder until configured or custom library added
    this.errorMsg.set('El inicio de sesión con Apple no está configurado todavía.');
  }

  isValidEmailOrPhone(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[\d\s\-+()]{7,15}$/;
    return emailRegex.test(trimmed) || phoneRegex.test(trimmed);
  }

  private resetState() {
    this.step.set('select');
    this.email.set('');
    this.otp.set('');
    this.errorMsg.set('');
    this.loading.set(false);
    this.maskedEmail.set('');
  }
}
