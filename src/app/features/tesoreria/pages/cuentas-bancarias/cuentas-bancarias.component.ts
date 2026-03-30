import { Component, inject, signal, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DrawerComponent } from '../../../../shared/components/drawer/drawer.component';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '@core/auth/auth.service';
import { environment } from '@env/environment';

export interface CuentaBancaria {
    id?: number;
    banco: string;
    numeroCuenta: string;
    tipoCuenta: 'CORRIENTE' | 'AHORRO' | 'CTS' | 'DETRACCIONES';
    moneda: 'PEN' | 'USD' | 'EUR';
    saldoContable: number;
    titular: string;
    cci?: string;
    activa: boolean;
    tenantId?: number;
}

@Component({
    selector: 'app-cuentas-bancarias',
    standalone: true,
    imports: [DecimalPipe, FormsModule, DrawerComponent],
    template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Cuentas Bancarias</h1>
        <p class="page-subtitle">{{ cuentasActivas() }} cuentas activas — saldo total S/ {{ saldoTotalPEN() | number:'1.2-2' }}</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" (click)="showModal.set(true)">+ Nueva Cuenta</button>
      </div>
    </div>

    @if (error()) {
      <div class="card mb-lg" style="border-left:3px solid var(--color-warning);padding:var(--space-md)">
        <p style="color:var(--color-text-muted);font-size:0.875rem">
          Servicio no disponible — mostrando datos locales de demostración.
        </p>
      </div>
    }

    <!-- KPIs por moneda -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--space-md);margin-bottom:var(--space-lg)">
      <div class="card">
        <div class="card-body">
          <div class="text-sm" style="color:var(--color-text-muted)">Saldo PEN</div>
          <div class="font-bold" style="font-size:1.75rem;color:var(--color-primary)">
            S/ {{ saldoTotalPEN() | number:'1.2-2' }}
          </div>
          <div class="text-sm" style="color:var(--color-text-muted)">{{ cuentasPEN() }} cuentas en soles</div>
        </div>
      </div>
      <div class="card">
        <div class="card-body">
          <div class="text-sm" style="color:var(--color-text-muted)">Saldo USD</div>
          <div class="font-bold" style="font-size:1.75rem">
            $ {{ saldoTotalUSD() | number:'1.2-2' }}
          </div>
          <div class="text-sm" style="color:var(--color-text-muted)">{{ cuentasUSD() }} cuentas en dólares</div>
        </div>
      </div>
      <div class="card">
        <div class="card-body">
          <div class="text-sm" style="color:var(--color-text-muted)">Cuenta detracciones</div>
          <div class="font-bold" style="font-size:1.75rem;color:var(--color-accent)">
            S/ {{ saldoDetracciones() | number:'1.2-2' }}
          </div>
          <div class="text-sm" style="color:var(--color-text-muted)">Banco Nación</div>
        </div>
      </div>
    </div>

    <!-- Tabla cuentas -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Cuentas registradas</h3>
        <div style="display:flex;gap:8px">
          <select class="input-field" [(ngModel)]="filtroBanco" style="width:160px;font-size:0.85rem">
            <option value="">Todos los bancos</option>
            @for (b of bancosUnicos(); track b) {
              <option [value]="b">{{ b }}</option>
            }
          </select>
        </div>
      </div>

      @if (cargando()) {
        <div class="loading-container"><div class="spinner"></div></div>
      } @else {
        <table class="table">
          <thead>
            <tr>
              <th class="table-header-cell">Banco</th>
              <th class="table-header-cell">N° Cuenta</th>
              <th class="table-header-cell">CCI</th>
              <th class="table-header-cell">Tipo</th>
              <th class="table-header-cell">Titular</th>
              <th class="table-header-cell">Moneda</th>
              <th class="table-header-cell text-right">Saldo Contable</th>
              <th class="table-header-cell">Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (c of cuentasFiltradas(); track $index) {
              <tr class="table-row">
                <td class="table-cell font-bold">{{ c.banco }}</td>
                <td class="table-cell font-mono text-sm">{{ c.numeroCuenta }}</td>
                <td class="table-cell font-mono text-sm" style="color:var(--color-text-muted)">
                  {{ c.cci || '—' }}
                </td>
                <td class="table-cell"><span [class]="badgeTipo(c.tipoCuenta)">{{ c.tipoCuenta }}</span></td>
                <td class="table-cell text-sm">{{ c.titular }}</td>
                <td class="table-cell font-mono">{{ c.moneda }}</td>
                <td class="table-cell text-right font-mono font-bold">
                  {{ c.moneda === 'USD' ? '$' : 'S/' }} {{ c.saldoContable | number:'1.2-2' }}
                </td>
                <td class="table-cell">
                  <span [class]="c.activa ? 'badge badge-success' : 'badge badge-neutral'">
                    {{ c.activa ? 'ACTIVA' : 'INACTIVA' }}
                  </span>
                </td>
              </tr>
            }
            @if (cuentasFiltradas().length === 0) {
              <tr class="table-row">
                <td colspan="8" style="text-align:center;padding:var(--space-lg);color:var(--color-text-muted)">
                  No hay cuentas bancarias registradas
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>

    <app-drawer
      [isOpen]="showModal()"
      title="Nueva Cuenta Bancaria"
      size="lg"
      side="right"
      [hasFooter]="true"
      (closed)="cerrarModal()">

      <div style="display:flex;flex-direction:column;gap:14px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label class="input-label">Banco *</label>
            <select class="input-field" [(ngModel)]="form.banco">
              <option value="">Seleccionar...</option>
              @for (b of BANCOS; track b) {
                <option [value]="b">{{ b }}</option>
              }
            </select>
          </div>
          <div>
            <label class="input-label">Tipo de Cuenta *</label>
            <select class="input-field" [(ngModel)]="form.tipoCuenta">
              <option value="CORRIENTE">Cuenta Corriente</option>
              <option value="AHORRO">Cuenta de Ahorros</option>
              <option value="CTS">CTS</option>
              <option value="DETRACCIONES">Detracciones</option>
            </select>
          </div>
          <div>
            <label class="input-label">N° Cuenta *</label>
            <input class="input-field font-mono" [(ngModel)]="form.numeroCuenta"
                   placeholder="000-1234567890">
          </div>
          <div>
            <label class="input-label">Moneda *</label>
            <select class="input-field" [(ngModel)]="form.moneda">
              <option value="PEN">PEN — Soles</option>
              <option value="USD">USD — Dólares</option>
              <option value="EUR">EUR — Euros</option>
            </select>
          </div>
        </div>
        <div>
          <label class="input-label">CCI (Código de Cuenta Interbancario)</label>
          <input class="input-field font-mono" [(ngModel)]="form.cci"
                 placeholder="002-123-000123456789-12" maxlength="26">
        </div>
        <div>
          <label class="input-label">Titular de la Cuenta</label>
          <input class="input-field" [(ngModel)]="form.titular"
                 placeholder="Empresa SAC">
        </div>
        <div>
          <label class="input-label">Saldo Contable Inicial</label>
          <input class="input-field" type="number" [(ngModel)]="form.saldoContable"
                 placeholder="0.00" min="0" step="0.01">
        </div>
      </div>

      <div slot="footer">
        <button class="btn btn-secondary" (click)="cerrarModal()">Cancelar</button>
        <button class="btn btn-primary" (click)="guardar()"
                [disabled]="guardando() || !formValido()">
          {{ guardando() ? 'Guardando...' : 'Guardar Cuenta' }}
        </button>
      </div>
    </app-drawer>
  `
})
export class CuentasBancariasComponent {
    private http = inject(HttpClient);
    private auth = inject(AuthService);

    cargando = signal(false);
    guardando = signal(false);
    error = signal<string | null>(null);
    showModal = signal(false);
    filtroBanco = '';

    readonly BANCOS = [
        'BCP — Banco de Crédito del Perú',
        'BBVA Perú',
        'Scotiabank Perú',
        'Interbank',
        'Banco Pichincha',
        'Banco GNB',
        'Banco Falabella',
        'Banbif',
        'Banco Ripley',
        'Caja Municipal Arequipa',
        'Caja Huancayo',
        'Banco de la Nación'
    ];

    // Demo data — in production would come from API
    cuentas = signal<CuentaBancaria[]>([
        { id: 1, banco: 'BCP — Banco de Crédito del Perú', numeroCuenta: '194-12345678-0-01', cci: '002-194-000123456780-01', tipoCuenta: 'CORRIENTE', moneda: 'PEN', saldoContable: 85420.50, titular: 'MicroShop SAC', activa: true },
        { id: 2, banco: 'BCP — Banco de Crédito del Perú', numeroCuenta: '194-98765432-1-07', cci: '002-194-000987654321-07', tipoCuenta: 'CORRIENTE', moneda: 'USD', saldoContable: 12300.00, titular: 'MicroShop SAC', activa: true },
        { id: 3, banco: 'BBVA Perú', numeroCuenta: '0011-0180-01-00123456', cci: '011-018-000100123456-59', tipoCuenta: 'AHORRO', moneda: 'PEN', saldoContable: 34200.00, titular: 'MicroShop SAC', activa: true },
        { id: 4, banco: 'Banco de la Nación', numeroCuenta: '00-123456789', cci: '018-000-000123456789-00', tipoCuenta: 'DETRACCIONES', moneda: 'PEN', saldoContable: 8750.30, titular: 'MicroShop SAC', activa: true },
        { id: 5, banco: 'Scotiabank Perú', numeroCuenta: '0002345678', cci: '009-000-000002345678-92', tipoCuenta: 'CTS', moneda: 'PEN', saldoContable: 15600.00, titular: 'MicroShop SAC', activa: true },
    ]);

    form: CuentaBancaria = this.defaultForm();

    cuentasFiltradas = computed(() => {
        if (!this.filtroBanco) return this.cuentas();
        return this.cuentas().filter(c => c.banco === this.filtroBanco);
    });

    bancosUnicos = computed(() => [...new Set(this.cuentas().map(c => c.banco))]);
    cuentasActivas = computed(() => this.cuentas().filter(c => c.activa).length);
    cuentasPEN = computed(() => this.cuentas().filter(c => c.moneda === 'PEN' && c.activa).length);
    cuentasUSD = computed(() => this.cuentas().filter(c => c.moneda === 'USD' && c.activa).length);
    saldoTotalPEN = computed(() =>
        this.cuentas().filter(c => c.moneda === 'PEN' && c.activa && c.tipoCuenta !== 'DETRACCIONES')
            .reduce((s, c) => s + c.saldoContable, 0)
    );
    saldoTotalUSD = computed(() =>
        this.cuentas().filter(c => c.moneda === 'USD' && c.activa).reduce((s, c) => s + c.saldoContable, 0)
    );
    saldoDetracciones = computed(() =>
        this.cuentas().filter(c => c.tipoCuenta === 'DETRACCIONES' && c.activa).reduce((s, c) => s + c.saldoContable, 0)
    );

    formValido = computed(() => !!this.form.banco && !!this.form.numeroCuenta && !!this.form.moneda);

    guardar() {
        if (!this.formValido()) return;
        const nueva: CuentaBancaria = {
            ...this.form,
            id: Date.now(),
            activa: true,
            tenantId: this.auth.currentUser()?.activeCompanyId ?? 1
        };
        this.cuentas.update(list => [...list, nueva]);
        this.cerrarModal();
    }

    cerrarModal() {
        this.showModal.set(false);
        this.form = this.defaultForm();
    }

    badgeTipo(tipo: string): string {
        const map: Record<string, string> = {
            CORRIENTE: 'badge badge-accent',
            AHORRO: 'badge badge-success',
            CTS: 'badge badge-neutral',
            DETRACCIONES: 'badge badge-warning'
        };
        return map[tipo] ?? 'badge';
    }

    private defaultForm(): CuentaBancaria {
        return {
            banco: '',
            numeroCuenta: '',
            tipoCuenta: 'CORRIENTE',
            moneda: 'PEN',
            saldoContable: 0,
            titular: '',
            cci: '',
            activa: true
        };
    }
}
