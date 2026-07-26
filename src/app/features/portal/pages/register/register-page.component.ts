import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { PortalService } from '../../services/portal.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { LoginResponse } from '../../../../core/auth/auth.model';
import { Title, Meta } from '@angular/platform-browser';

@Component({
    selector: 'app-register-page',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink],
    template: `
    <div class="register-page">
      <div class="register-card glass-card">
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
              @for (p of planOptions; track p.code) {
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
      }

      .register-card {
        width: 100%;
        max-width: 480px;
        padding: 48px;
        border-radius: 24px;
      }

      .register-header {
        text-align: center;
        margin-bottom: 32px;
      }

      .register-title {
        font-size: 1.75rem;
        font-weight: 800;
        color: #ffffff;
        margin: 0 0 8px;
        letter-spacing: -0.5px;
      }

      .register-subtitle {
        color: var(--portal-muted);
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
        background: rgba(255, 255, 255, 0.08);
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
        background: rgba(5, 8, 20, 0.8);
        border: 2px solid rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8rem;
        font-weight: 700;
        color: var(--portal-muted);
        transition: all 0.3s ease;
      }

      .step.active .step-dot {
        border-color: var(--neon-purple);
        color: #ffffff;
        box-shadow: 0 0 10px rgba(168, 85, 247, 0.4);
        background: var(--neon-purple);
      }

      .step.done .step-dot {
        background: var(--neon-teal);
        border-color: var(--neon-teal);
        color: #050814;
        box-shadow: 0 0 10px rgba(6, 182, 212, 0.3);
      }

      .step-label {
        font-size: 0.725rem;
        color: var(--portal-muted);
        font-weight: 500;
      }

      .step.active .step-label {
        color: #ffffff;
        font-weight: 600;
      }

      /* Error notification */
      .error-box {
        background: rgba(244, 63, 94, 0.1);
        border: 1px solid rgba(244, 63, 94, 0.25);
        color: #f43f5e;
        border-radius: 10px;
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
        color: var(--portal-muted);
        margin-bottom: 8px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .field input {
        width: 100%;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        padding: 12px 16px;
        color: #ffffff;
        font-size: 0.95rem;
        box-sizing: border-box;
        transition: all 0.25s ease;

        &:focus {
          outline: none;
          border-color: var(--neon-purple);
          background: rgba(255, 255, 255, 0.05);
          box-shadow: 0 0 10px rgba(168, 85, 247, 0.2), inset 0 1px 2px rgba(0, 0, 0, 0.2);
        }
      }

      .field-error {
        font-size: 0.775rem;
        color: #f43f5e;
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
        background: linear-gradient(135deg, var(--neon-purple) 0%, var(--neon-blue) 100%);
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        padding: 14px;
        font-weight: 700;
        font-size: 0.95rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        box-shadow: 0 4px 15px rgba(168, 85, 247, 0.25);
        transition: all 0.25s ease;

        &:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(168, 85, 247, 0.4);
          filter: brightness(1.1);
        }

        &:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          box-shadow: none;
        }
      }

      .btn-back {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: var(--portal-muted);
        border-radius: 10px;
        padding: 14px 20px;
        cursor: pointer;
        font-size: 0.95rem;
        font-weight: 600;
        transition: all 0.2s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.15);
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
        color: var(--portal-muted);
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
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 12px;
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
          color: #ffffff;
          font-size: 0.95rem;
          font-weight: 700;
        }

        .opt-desc {
          color: var(--portal-muted);
          font-size: 0.775rem;
        }

        .opt-price {
          color: var(--neon-teal);
          font-weight: 700;
          font-size: 0.95rem;
          text-shadow: 0 0 10px rgba(6, 182, 212, 0.2);
        }

        &.selected {
          border-color: var(--neon-teal);
          background: rgba(6, 182, 212, 0.05);
          box-shadow: 0 0 15px rgba(6, 182, 212, 0.15);
        }

        &:hover:not(.selected) {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.12);
        }
      }

      .login-link {
        text-align: center;
        color: var(--portal-muted);
        font-size: 0.85rem;
        margin-top: 28px;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        padding-top: 20px;

        a {
          color: var(--neon-teal);
          text-decoration: none;
          font-weight: 600;
          transition: all 0.2s ease;

          &:hover {
            color: #ffffff;
            text-shadow: 0 0 8px rgba(6, 182, 212, 0.4);
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

    readonly planOptions = [
        { code: 'STARTER', name: 'Starter', price: 99, desc: 'POS + Ventas · 5 usuarios' },
        { code: 'PROFESSIONAL', name: 'Professional', price: 299, desc: '7 módulos · 25 usuarios' },
        { code: 'ENTERPRISE', name: 'Enterprise', price: 799, desc: 'Todo incluido · ilimitado' },
    ];

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

