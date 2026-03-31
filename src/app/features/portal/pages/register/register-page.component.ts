import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PortalService } from '../../services/portal.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { LoginResponse } from '../../../../core/auth/auth.model';

@Component({
    selector: 'app-register-page',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    template: `
    <div class="register-page">
      <div class="register-card">
        <div class="register-header">
          <h1>Crear cuenta</h1>
          <p>30 días gratis · Sin tarjeta de crédito</p>
        </div>

        <!-- Step indicator -->
        <div class="steps">
          @for (s of [1,2,3]; track s) {
            <div class="step" [class.active]="step() === s" [class.done]="step() > s">
              <div class="step-dot">{{ step() > s ? '✓' : s }}</div>
              <span>{{ s === 1 ? 'Empresa' : s === 2 ? 'Admin' : 'Plan' }}</span>
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
              <label for="companyName">Nombre de la empresa *</label>
              <input id="companyName" type="text" formControlName="companyName" placeholder="Mi Empresa SAC">
              @if (companyForm.get('companyName')?.invalid && companyForm.get('companyName')?.touched) {
                <span class="field-error">Nombre requerido</span>
              }
            </div>
            <div class="field">
              <label for="ruc">RUC (11 dígitos) *</label>
              <input id="ruc" type="text" formControlName="ruc" placeholder="20123456789" maxlength="11">
              @if (companyForm.get('ruc')?.invalid && companyForm.get('ruc')?.touched) {
                <span class="field-error">RUC debe tener 11 dígitos</span>
              }
            </div>
            <button type="submit" class="btn-next" [disabled]="companyForm.invalid">Siguiente →</button>
          </form>
        }

        <!-- Step 2: Admin user -->
        @if (step() === 2) {
          <form [formGroup]="adminForm" (ngSubmit)="nextStep()">
            <div class="field-row">
              <div class="field">
                <label for="nombres">Nombres *</label>
                <input id="nombres" type="text" formControlName="adminNombres" placeholder="Juan">
              </div>
              <div class="field">
                <label for="apellidos">Apellidos *</label>
                <input id="apellidos" type="text" formControlName="adminApellidos" placeholder="García">
              </div>
            </div>
            <div class="field">
              <label for="email">Email *</label>
              <input id="email" type="email" formControlName="adminEmail" placeholder="juan@empresa.com">
              @if (adminForm.get('adminEmail')?.invalid && adminForm.get('adminEmail')?.touched) {
                <span class="field-error">Email válido requerido</span>
              }
            </div>
            <div class="field">
              <label for="password">Contraseña (mín. 8 caracteres) *</label>
              <input id="password" type="password" formControlName="adminPassword">
              @if (adminForm.get('adminPassword')?.invalid && adminForm.get('adminPassword')?.touched) {
                <span class="field-error">Mínimo 8 caracteres</span>
              }
            </div>
            <div class="btn-row">
              <button type="button" class="btn-back" (click)="step.set(1)">← Volver</button>
              <button type="submit" class="btn-next" [disabled]="adminForm.invalid">Siguiente →</button>
            </div>
          </form>
        }

        <!-- Step 3: Plan selection -->
        @if (step() === 3) {
          <div class="plan-select">
            <p class="plan-label">Selecciona tu plan inicial:</p>
            <div class="plan-options">
              @for (p of planOptions; track p.code) {
                <button class="plan-opt" [class.selected]="selectedPlan() === p.code" (click)="selectedPlan.set(p.code)">
                  <strong>{{ p.name }}</strong>
                  <span>S/ {{ p.price }}/mes</span>
                  <small>{{ p.desc }}</small>
                </button>
              }
            </div>
            <div class="btn-row">
              <button class="btn-back" (click)="step.set(2)">← Volver</button>
              <button class="btn-next" [disabled]="loading()" (click)="submit()">
                {{ loading() ? 'Creando cuenta...' : 'Crear cuenta gratis' }}
              </button>
            </div>
          </div>
        }

        <p class="login-link">¿Ya tienes cuenta? <a routerLink="/auth/login">Ingresar</a></p>
      </div>
    </div>
    `,
    styles: [`
      .register-page { min-height: calc(100vh - 128px); display: flex; align-items: center; justify-content: center; padding: 40px 24px; }
      .register-card { width: 100%; max-width: 480px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 16px; padding: 40px; }
      .register-header { text-align: center; margin-bottom: 28px; }
      .register-header h1 { font-size: 1.75rem; font-weight: 800; color: #fff; margin: 0 0 8px; }
      .register-header p { color: var(--color-subtle); font-size: 0.875rem; }
      .steps { display: flex; justify-content: space-between; margin-bottom: 32px; position: relative; }
      .steps::before { content: ''; position: absolute; top: 14px; left: 10%; right: 10%; height: 2px; background: var(--color-border); z-index: 0; }
      .step { display: flex; flex-direction: column; align-items: center; gap: 6px; z-index: 1; }
      .step-dot { width: 28px; height: 28px; border-radius: 50%; background: var(--color-surface-raised); border: 2px solid var(--color-border); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; color: var(--color-subtle); }
      .step.active .step-dot { border-color: var(--color-primary); color: var(--color-primary); background: rgba(215,19,42,0.1); }
      .step.done .step-dot { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }
      .step span { font-size: 0.7rem; color: var(--color-subtle); }
      .step.active span { color: #fff; }
      .error-box { background: rgba(215,19,42,0.1); border: 1px solid rgba(215,19,42,0.4); color: #fc8181; border-radius: 8px; padding: 10px 14px; font-size: 0.85rem; margin-bottom: 16px; }
      .field { margin-bottom: 16px; }
      .field label { display: block; font-size: 0.8rem; color: var(--color-subtle); margin-bottom: 6px; font-weight: 500; }
      .field input { width: 100%; background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: 8px; padding: 10px 12px; color: #fff; font-size: 0.9rem; box-sizing: border-box; }
      .field input:focus { outline: none; border-color: var(--color-primary); }
      .field-error { font-size: 0.75rem; color: var(--color-primary); }
      .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .btn-next { width: 100%; background: var(--color-primary); color: #fff; border: none; border-radius: 8px; padding: 12px; font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: opacity 0.15s; }
      .btn-next:hover:not(:disabled) { opacity: 0.88; }
      .btn-next:disabled { opacity: 0.5; cursor: not-allowed; }
      .btn-back { background: none; border: 1px solid var(--color-border); color: var(--color-subtle); border-radius: 8px; padding: 12px 20px; cursor: pointer; font-size: 0.9rem; }
      .btn-row { display: flex; gap: 10px; }
      .btn-row .btn-next { flex: 1; }
      .plan-label { color: var(--color-subtle); font-size: 0.875rem; margin-bottom: 12px; }
      .plan-options { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
      .plan-opt { background: var(--color-surface-raised); border: 2px solid var(--color-border); border-radius: 10px; padding: 14px 16px; cursor: pointer; text-align: left; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 4px; transition: border-color 0.15s; }
      .plan-opt strong { color: #fff; font-size: 0.9rem; }
      .plan-opt span { color: var(--color-primary); font-weight: 700; font-size: 0.9rem; }
      .plan-opt small { width: 100%; color: var(--color-subtle); font-size: 0.75rem; }
      .plan-opt.selected { border-color: var(--color-primary); background: rgba(215,19,42,0.08); }
      .login-link { text-align: center; color: var(--color-subtle); font-size: 0.8rem; margin-top: 20px; }
      .login-link a { color: var(--color-primary); text-decoration: none; }
    `]
})
export class RegisterPageComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly portalService = inject(PortalService);
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

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
