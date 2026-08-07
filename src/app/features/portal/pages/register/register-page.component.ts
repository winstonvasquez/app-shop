import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { PortalService } from '../../services/portal.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { LoginResponse } from '../../../../core/auth/auth.model';
import { SaasPlanInfo } from '../../../../core/models/saas.model';
import { Title, Meta } from '@angular/platform-browser';

@Component({
    selector: 'app-register-page',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink],
    template: `
    <div class="register-page">
      <!-- Textura sutil + glow naranja: misma firma visual (parchment + Ink Blue + Signal Orange) que el hero de landing -->
      <div class="orb orb-primary" aria-hidden="true"></div>
      <div class="orb orb-accent" aria-hidden="true"></div>

      <div class="register-card">
        <div class="register-header">
          <h1 class="register-title">Crear Cuenta</h1>
          <p class="register-subtitle">30 días de prueba gratis · Sin tarjeta de crédito</p>
        </div>

        <!-- Step indicator -->
        <div class="steps">
          @for (s of [1,2,3]; track s) {
            <div class="step" [class.active]="step() === s" [class.done]="step() > s">
              <div class="step-dot">
                @if (step() > s) {
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                } @else {
                  {{ s }}
                }
              </div>
              <span class="step-label">{{ s === 1 ? 'Empresa' : s === 2 ? 'Administrador' : 'Plan' }}</span>
            </div>
          }
        </div>

        @if (error()) {
          <div class="error-box">{{ error() }}</div>
        }

        <!-- Step 1: Company -->
        @if (step() === 1) {
          <form [formGroup]="companyForm" (ngSubmit)="nextStep()">
            <div class="field">
              <label for="companyName">Nombre de la Empresa *</label>
              <input id="companyName" type="text" formControlName="companyName" placeholder="Mi Empresa SAC" autocomplete="organization">
              @if (companyForm.get('companyName')?.invalid && companyForm.get('companyName')?.touched) {
                <span class="field-error">Nombre requerido para continuar</span>
              }
            </div>
            <div class="field">
              <label for="ruc">RUC (11 dígitos) *</label>
              <input id="ruc" type="text" formControlName="ruc" placeholder="20123456789" maxlength="11" autocomplete="off">
              @if (companyForm.get('ruc')?.invalid && companyForm.get('ruc')?.touched) {
                <span class="field-error">RUC inválido (debe tener exactamente 11 dígitos numéricos)</span>
              }
            </div>
            <button type="submit" class="btn-next" [disabled]="companyForm.invalid" id="btn-step1-next">
              Siguiente Paso
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </form>
        }

        <!-- Step 2: Admin user -->
        @if (step() === 2) {
          <form [formGroup]="adminForm" (ngSubmit)="nextStep()">
            <div class="field-row">
              <div class="field">
                <label for="nombres">Nombres *</label>
                <input id="nombres" type="text" formControlName="adminNombres" placeholder="Juan" autocomplete="given-name">
              </div>
              <div class="field">
                <label for="apellidos">Apellidos *</label>
                <input id="apellidos" type="text" formControlName="adminApellidos" placeholder="García" autocomplete="family-name">
              </div>
            </div>
            <div class="field">
              <label for="email">Correo Electrónico *</label>
              <input id="email" type="email" formControlName="adminEmail" placeholder="juan@empresa.com" autocomplete="email">
              @if (adminForm.get('adminEmail')?.invalid && adminForm.get('adminEmail')?.touched) {
                <span class="field-error">Por favor ingresa un correo electrónico válido</span>
              }
            </div>
            <div class="field">
              <label for="password">Contraseña (Mín. 8 caracteres) *</label>
              <input id="password" type="password" formControlName="adminPassword" placeholder="••••••••" autocomplete="new-password">
              @if (adminForm.get('adminPassword')?.invalid && adminForm.get('adminPassword')?.touched) {
                <span class="field-error">La contraseña debe tener al menos 8 caracteres</span>
              }
            </div>
            <div class="btn-row">
              <button type="button" class="btn-back" (click)="step.set(1)" id="btn-step2-back">← Volver</button>
              <button type="submit" class="btn-next" [disabled]="adminForm.invalid" id="btn-step2-next">
                Siguiente
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>
          </form>
        }

        <!-- Step 3: Plan selection -->
        @if (step() === 3) {
          <div class="plan-select">
            <p class="plan-label">Confirma tu plan inicial seleccionado:</p>
            <div class="plan-options">
              @for (p of planOptions(); track p.code) {
                <button type="button" class="plan-opt" [class.selected]="selectedPlan() === p.code" (click)="selectedPlan.set(p.code)" [id]="'opt-plan-' + p.code">
                  <div class="plan-opt-info">
                    <strong class="opt-name">{{ p.name }}</strong>
                    <small class="opt-desc">{{ p.desc }}</small>
                  </div>
                  <span class="opt-price">S/ {{ p.price }}/mes</span>
                </button>
              }
            </div>
            <div class="btn-row">
              <button type="button" class="btn-back" (click)="step.set(2)" id="btn-step3-back">← Volver</button>
              <button class="btn-next" [disabled]="loading()" (click)="submit()" id="btn-register-submit">
                {{ loading() ? 'Creando cuenta...' : 'Crear Cuenta Gratis' }}
              </button>
            </div>
          </div>
        }

        <p class="login-link">¿Ya tienes una cuenta activa? <a routerLink="/auth/login" id="link-login">Ingresar aquí</a></p>
      </div>
    </div>
    `,
    styles: [`
      .register-page {
        min-height: calc(100vh - 144px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 60px 24px;
        position: relative;
        z-index: 10;
        background-color: var(--color-background, #F7F6F3);
        background-image: 
          radial-gradient(ellipse at 50% 30%, rgba(247, 246, 243, 0.72) 0%, rgba(247, 246, 243, 0.92) 100%),
          url('/images/register_corporate_bg.png');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        overflow: hidden;
      }

      /* Textura sutil de puntos + glow visual */
      .register-page::before {
        content: '';
        position: absolute;
        inset: 0;
        background-image: radial-gradient(color-mix(in srgb, var(--color-primary, #0B3D91) 6%, transparent) 1.2px, transparent 1.2px);
        background-size: 24px 24px;
        pointer-events: none;
        z-index: 1;
      }

      .orb {
        position: absolute;
        border-radius: 50%;
        pointer-events: none;
        z-index: 0;
        filter: blur(90px);
      }

      .orb-primary {
        top: -12%;
        right: -8%;
        width: 520px;
        height: 520px;
        background: radial-gradient(circle, color-mix(in srgb, var(--color-primary, #0B3D91) 18%, transparent) 0%, transparent 70%);
      }

      .orb-accent {
        bottom: -14%;
        left: -8%;
        width: 540px;
        height: 540px;
        background: radial-gradient(circle, color-mix(in srgb, var(--color-accent, #F08C00) 15%, transparent) 0%, transparent 65%);
      }

      .register-card {
        width: 100%;
        max-width: 500px;
        padding: 44px 40px;
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.94);
        backdrop-filter: blur(20px) saturate(160%);
        -webkit-backdrop-filter: blur(20px) saturate(160%);
        border: 1px solid rgba(220, 216, 206, 0.85);
        box-shadow: 0 24px 64px -16px rgba(11, 61, 145, 0.16), 0 0 0 1px rgba(255, 255, 255, 0.8) inset;
        position: relative;
        z-index: 2;
        overflow: hidden;

        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #0B3D91 0%, #F08C00 100%);
        }
      }

      .register-header {
        text-align: center;
        margin-bottom: 32px;
      }

      .register-title {
        font-family: var(--f-display, 'Source Serif 4', serif);
        font-size: 1.85rem;
        font-weight: 700;
        color: var(--color-text-primary, #0E1B2C);
        margin: 0 0 8px;
        letter-spacing: -0.5px;
      }

      .register-subtitle {
        color: var(--color-text-secondary, #5A6473);
        font-size: 0.875rem;
      }

      /* Stepper indicator */
      .steps {
        display: flex;
        justify-content: space-between;
        margin-bottom: 36px;
        position: relative;
      }

      .steps::before {
        content: '';
        position: absolute;
        top: 14px;
        left: 10%;
        right: 10%;
        height: 2px;
        background: var(--color-border, #DCD8CE);
        z-index: 0;
      }

      .step {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        z-index: 1;
        width: 30%;
      }

      .step-dot {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: var(--color-surface, #FFFFFF);
        border: 2px solid var(--color-border, #DCD8CE);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8rem;
        font-weight: 700;
        color: var(--color-text-muted, #8C95A3);
        transition: all 0.3s ease;
      }

      .step.active .step-dot {
        border-color: var(--color-accent, #F08C00);
        color: #ffffff;
        background: var(--color-accent, #F08C00);
      }

      .step.done .step-dot {
        background: var(--color-success, #0E8A5F);
        border-color: var(--color-success, #0E8A5F);
        color: #ffffff;
      }

      .step-label {
        font-size: 0.725rem;
        color: var(--color-text-muted, #8C95A3);
        font-weight: 500;
      }

      .step.active .step-label {
        color: var(--color-text-primary, #0E1B2C);
        font-weight: 600;
      }

      /* Error notification */
      .error-box {
        background: color-mix(in srgb, var(--color-danger, #C0392B) 8%, white);
        border: 1px solid color-mix(in srgb, var(--color-danger, #C0392B) 25%, transparent);
        color: var(--color-danger, #C0392B);
        border-radius: var(--r-md, 10px);
        padding: 12px 16px;
        font-size: 0.85rem;
        margin-bottom: 24px;
      }

      /* Fields & Inputs */
      .field {
        margin-bottom: 20px;
      }

      .field label {
        display: block;
        font-size: 0.775rem;
        color: var(--color-text-secondary, #5A6473);
        margin-bottom: 8px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .field input {
        width: 100%;
        background: var(--color-surface, #FFFFFF);
        border: 1px solid var(--color-border, #DCD8CE);
        border-radius: var(--r-md, 10px);
        padding: 12px 16px;
        color: var(--color-text-primary, #0E1B2C);
        font-size: 0.95rem;
        box-sizing: border-box;
        transition: all 0.25s ease;

        &:focus {
          outline: none;
          border-color: var(--color-primary, #0B3D91);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary, #0B3D91) 15%, transparent);
        }
      }

      .field-error {
        font-size: 0.775rem;
        color: var(--color-danger, #C0392B);
        margin-top: 6px;
        display: block;
      }

      .field-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }

      /* Buttons & Actions */
      .btn-next {
        width: 100%;
        background: var(--color-accent, #F08C00);
        color: #ffffff;
        border: none;
        border-radius: var(--r-md, 10px);
        padding: 14px;
        font-weight: 700;
        font-size: 0.95rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        box-shadow: var(--s-sm, 0 1px 2px rgba(15,23,42,.08));
        transition: all 0.25s ease;

        &:hover:not(:disabled) {
          background: var(--color-accent-dark, #C97300);
          transform: translateY(-1px);
          box-shadow: var(--s-md, 0 4px 12px rgba(15,23,42,.12));
        }

        &:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          box-shadow: none;
        }
      }

      .btn-back {
        background: transparent;
        border: 1px solid var(--color-border, #DCD8CE);
        color: var(--color-text-secondary, #5A6473);
        border-radius: var(--r-md, 10px);
        padding: 14px 20px;
        cursor: pointer;
        font-size: 0.95rem;
        font-weight: 600;
        transition: all 0.2s ease;

        &:hover {
          background: var(--color-surface-raised, #EFEDE7);
          color: var(--color-text-primary, #0E1B2C);
          border-color: var(--color-primary, #0B3D91);
        }
      }

      .btn-row {
        display: flex;
        gap: 12px;
        margin-top: 12px;

        .btn-next {
          flex: 1;
        }
      }

      /* Step 3: Plan selection */
      .plan-label {
        color: var(--color-text-secondary, #5A6473);
        font-size: 0.9rem;
        margin-bottom: 16px;
      }

      .plan-options {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 24px;
      }

      .plan-opt {
        background: var(--color-surface, #FFFFFF);
        border: 1px solid var(--color-border, #DCD8CE);
        border-radius: var(--r-lg, 14px);
        padding: 16px;
        cursor: pointer;
        text-align: left;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: all 0.25s ease;

        .plan-opt-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .opt-name {
          color: var(--color-text-primary, #0E1B2C);
          font-size: 0.95rem;
          font-weight: 700;
        }

        .opt-desc {
          color: var(--color-text-secondary, #5A6473);
          font-size: 0.775rem;
        }

        .opt-price {
          color: var(--color-accent-dark, #C97300);
          font-weight: 800;
          font-size: 0.95rem;
        }

        &.selected {
          border-color: var(--color-accent, #F08C00);
          background: color-mix(in srgb, var(--color-accent, #F08C00) 6%, white);
        }

        &:hover:not(.selected) {
          border-color: var(--color-primary, #0B3D91);
          background: var(--color-surface-raised, #EFEDE7);
        }
      }

      .login-link {
        text-align: center;
        color: var(--color-text-secondary, #5A6473);
        font-size: 0.85rem;
        margin-top: 28px;
        border-top: 1px solid var(--color-border, #DCD8CE);
        padding-top: 20px;

        a {
          color: var(--color-primary, #0B3D91);
          font-weight: 700;
          text-decoration: none;

          &:hover {
            text-decoration: underline;
          }
        }
      }

      @media (max-width: 480px) {
        .register-card {
          padding: 32px 20px;
        }

        .field-row {
          grid-template-columns: 1fr;
          gap: 0;
        }
      }
    `]
})
export class RegisterPageComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly portalService = inject(PortalService);
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly titleService = inject(Title);
    private readonly metaService = inject(Meta);

    step = signal(1);
    selectedPlan = signal('PROFESSIONAL');
    loading = signal(false);
    error = signal('');

    private readonly plans = signal<SaasPlanInfo[]>([]);

    /** Deriva las tarjetas de plan de los datos reales del backend (nunca hardcodeados). */
    readonly planOptions = computed(() =>
        this.plans().map((p) => ({
            code: p.code,
            name: p.name,
            price: p.priceMonthly,
            desc: `${p.moduleCodes.length} módulo${p.moduleCodes.length === 1 ? '' : 's'} · ${p.maxUsers >= 999 ? 'usuarios ilimitados' : `${p.maxUsers} usuarios`}`,
        })),
    );

    companyForm = this.fb.group({
        companyName: ['', Validators.required],
        ruc: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
    });

    adminForm = this.fb.group({
        adminNombres: ['', Validators.required],
        adminApellidos: ['', Validators.required],
        adminEmail: ['', [Validators.required, Validators.email]],
        adminPassword: ['', [Validators.required, Validators.minLength(8)]],
    });

    ngOnInit(): void {
        this.titleService.setTitle('Crear Cuenta Gratis - AppShop ERP');
        this.metaService.updateTag({ name: 'description', content: 'Regístrate en AppShop ERP y disfruta de 30 días de prueba gratuita sin tarjeta de crédito. Automatiza tu facturación, POS, inventarios y contabilidad hoy mismo.' });

        // OpenGraph
        this.metaService.updateTag({ property: 'og:title', content: 'Crear Cuenta Gratis - AppShop ERP' });
        this.metaService.updateTag({ property: 'og:description', content: 'Regístrate en pocos pasos y comienza tu prueba gratuita sin tarjeta de crédito.' });

        const plan = this.route.snapshot.queryParamMap.get('plan');
        if (plan) this.selectedPlan.set(plan);

        this.portalService.getPlans().subscribe((plans) => this.plans.set(plans));
    }

    nextStep(): void {
        if (this.step() === 1 && this.companyForm.valid) this.step.set(2);
        else if (this.step() === 2 && this.adminForm.valid) this.step.set(3);
    }

    submit(): void {
        this.loading.set(true);
        this.error.set('');
        const payload = {
            ...this.companyForm.value,
            ...this.adminForm.value,
            planCode: this.selectedPlan(),
        } as unknown as Parameters<typeof this.portalService.register>[0];

        this.portalService.register(payload).subscribe({
            next: (res: unknown) => {
                const response = res as LoginResponse;
                if (response?.token) {
                    // Evita que un carrito/datos de invitado de OTRA empresa (misma pestaña)
                    // se cuelen en la tienda de la empresa recién registrada.
                    this.authService.clearTenantScopedLocalState();
                    this.authService.setSessionFromResponse(response);
                }
                this.router.navigate(['/admin']);
            },
            error: (err: { error?: { detail?: string; message?: string } }) => {
                this.error.set(err?.error?.detail || err?.error?.message || 'Error al crear la cuenta. Intenta nuevamente.');
                this.loading.set(false);
            }
        });
    }
}
