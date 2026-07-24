import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PayrollService } from '../../services/payroll.service';
import { Payroll, PayrollStatus } from '../../models/payroll.model';

/**
 * Planilla del periodo — orquesta el motor de nómina del backend (microshopusers).
 * NO calcula nada en el cliente: genera (POST /run), lista lo persistido (GET /period)
 * y transiciona estados (GENERADO → APROBADO → PAGADO). Cada fila abre su boleta real
 * por payrollId → la boleta tiene procedencia trazable.
 */
@Component({
    selector: 'app-payroll',
    standalone: true,
    imports: [DecimalPipe, DatePipe, FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Planilla Remunerativa</h1>
        <p class="page-subtitle">Corrida mensual — cálculo AFP/ONP, Renta 5ta, ESSALUD y beneficios en el servidor</p>
      </div>
      <div class="page-actions">
        <input class="input-field" type="month" [(ngModel)]="periodo" (ngModelChange)="cargarPeriodo()"
               style="width:160px" [max]="mesMaximo">
        <button class="btn btn-primary" (click)="generarPlanilla()" [disabled]="cargando()">
          {{ cargando() ? 'Procesando…' : 'Generar Planilla' }}
        </button>
      </div>
    </div>

    @if (mensaje(); as m) {
      <div class="card" style="margin-bottom:var(--space-md);border-left:3px solid var(--color-info)">
        <div class="card-body" style="padding:12px 16px;font-size:0.85rem;color:var(--color-text-on)">{{ m }}</div>
      </div>
    }
    @if (error(); as e) {
      <div class="card" style="margin-bottom:var(--space-md);border-left:3px solid var(--color-error)">
        <div class="card-body" style="padding:12px 16px;font-size:0.85rem;color:var(--color-error)">{{ e }}</div>
      </div>
    }

    @if (cargando()) {
      <div class="loading-container"><div class="spinner"></div></div>
    }

    @if (planillas().length > 0) {
      <!-- KPIs resumen -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--space-md);margin-bottom:var(--space-lg)">
        <div class="card"><div class="card-body">
          <div class="text-sm" style="color:var(--color-text-muted)">Total haberes brutos</div>
          <div class="font-bold" style="font-size:1.75rem;color:var(--color-primary)">S/ {{ totalBruto() | number:'1.2-2' }}</div>
          <div class="text-sm" style="color:var(--color-text-muted)">{{ planillas().length }} trabajadores</div>
        </div></div>
        <div class="card"><div class="card-body">
          <div class="text-sm" style="color:var(--color-text-muted)">Total descuentos</div>
          <div class="font-bold" style="font-size:1.75rem;color:var(--color-warning)">S/ {{ totalDescuentos() | number:'1.2-2' }}</div>
          <div class="text-sm" style="color:var(--color-text-muted)">AFP/ONP + Renta 5ta</div>
        </div></div>
        <div class="card"><div class="card-body">
          <div class="text-sm" style="color:var(--color-text-muted)">Total neto a pagar</div>
          <div class="font-bold" style="font-size:1.75rem;color:var(--color-success)">S/ {{ totalNeto() | number:'1.2-2' }}</div>
        </div></div>
        <div class="card"><div class="card-body">
          <div class="text-sm" style="color:var(--color-text-muted)">ESSALUD empleador (9%)</div>
          <div class="font-bold" style="font-size:1.75rem">S/ {{ totalEssalud() | number:'1.2-2' }}</div>
        </div></div>
        <div class="card"><div class="card-body">
          <div class="text-sm" style="color:var(--color-text-muted)">Costo total empresa</div>
          <div class="font-bold" style="font-size:1.75rem">S/ {{ (totalBruto() + totalEssalud()) | number:'1.2-2' }}</div>
          <div class="text-sm" style="color:var(--color-text-muted)">bruto + ESSALUD</div>
        </div></div>
      </div>

      <!-- Tabla planilla -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Detalle de Planilla — {{ periodoLabel() }}</h3>
          <span class="badge badge-neutral">{{ planillas().length }} boletas</span>
        </div>
        <div style="overflow-x:auto">
          <table class="table" style="font-size:0.8rem;min-width:1080px">
            <thead>
              <tr>
                <th class="table-header-cell">Empleado / Previsional</th>
                <th class="table-header-cell text-right">S. Base</th>
                <th class="table-header-cell text-right">As.Fam.</th>
                <th class="table-header-cell text-right">H.Extra</th>
                <th class="table-header-cell text-right" style="color:var(--color-success)">BRUTO</th>
                <th class="table-header-cell text-right">AFP/ONP</th>
                <th class="table-header-cell text-right">Renta 5ta</th>
                <th class="table-header-cell text-right" style="color:var(--color-warning)">DESCT.</th>
                <th class="table-header-cell text-right" style="color:var(--color-success)">NETO</th>
                <th class="table-header-cell">Estado</th>
                <th class="table-header-cell">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (p of planillas(); track p.id) {
                <tr class="table-row">
                  <td class="table-cell">
                    <div class="font-bold">{{ p.employeeName || ('Empleado #' + p.employeeId) }}</div>
                    <div style="color:var(--color-text-muted);font-size:0.72rem">
                      <span class="badge badge-neutral" style="font-size:0.65rem">{{ p.afpOnp || '—' }}</span>
                      · {{ p.diasTrabajados ?? 30 }} días
                    </div>
                  </td>
                  <td class="table-cell text-right font-mono">{{ p.sueldoBase | number:'1.2-2' }}</td>
                  <td class="table-cell text-right font-mono">{{ (p.asignacionFamiliar || 0) > 0 ? (p.asignacionFamiliar | number:'1.2-2') : '—' }}</td>
                  <td class="table-cell text-right font-mono">{{ (p.montoHorasExtras || 0) > 0 ? (p.montoHorasExtras | number:'1.2-2') : '—' }}</td>
                  <td class="table-cell text-right font-mono font-bold" style="color:var(--color-success)">{{ bruto(p) | number:'1.2-2' }}</td>
                  <td class="table-cell text-right font-mono" style="color:var(--color-warning)">{{ p.montoAfpOnp | number:'1.2-2' }}</td>
                  <td class="table-cell text-right font-mono" style="color:var(--color-warning)">{{ (p.rentaQuinta || 0) > 0 ? (p.rentaQuinta | number:'1.2-2') : '—' }}</td>
                  <td class="table-cell text-right font-mono font-bold" style="color:var(--color-warning)">{{ descuentos(p) | number:'1.2-2' }}</td>
                  <td class="table-cell text-right font-mono font-bold" style="color:var(--color-success)">{{ p.neto | number:'1.2-2' }}</td>
                  <td class="table-cell">
                    <span class="badge" [class]="estadoBadge(p.estado)">{{ p.estado }}</span>
                    @if (p.estado === 'PAGADO' && p.fechaPago) {
                      <div style="font-size:0.65rem;color:var(--color-text-muted);margin-top:2px">{{ p.fechaPago | date:'dd/MM/yyyy' }}</div>
                    }
                  </td>
                  <td class="table-cell">
                    <div style="display:flex;gap:6px;flex-wrap:wrap">
                      <button class="btn btn-secondary" style="font-size:0.72rem;padding:4px 10px" (click)="verBoleta(p.id)">Ver boleta</button>
                      @if (p.estado === 'GENERADO') {
                        <button class="btn btn-primary" style="font-size:0.72rem;padding:4px 10px" [disabled]="accionando()" (click)="aprobar(p)">Aprobar</button>
                      }
                      @if (p.estado === 'APROBADO') {
                        <button class="btn btn-primary" style="font-size:0.72rem;padding:4px 10px" [disabled]="accionando()" (click)="pagar(p)">Pagar</button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
            <tfoot>
              <tr style="font-weight:700;border-top:2px solid var(--color-border)">
                <td class="table-cell">TOTALES</td>
                <td class="table-cell text-right font-mono">{{ totalSueldoBase() | number:'1.2-2' }}</td>
                <td class="table-cell text-right">—</td>
                <td class="table-cell text-right">—</td>
                <td class="table-cell text-right font-mono" style="color:var(--color-success)">{{ totalBruto() | number:'1.2-2' }}</td>
                <td class="table-cell text-right">—</td>
                <td class="table-cell text-right">—</td>
                <td class="table-cell text-right font-mono" style="color:var(--color-warning)">{{ totalDescuentos() | number:'1.2-2' }}</td>
                <td class="table-cell text-right font-mono" style="color:var(--color-success)">{{ totalNeto() | number:'1.2-2' }}</td>
                <td class="table-cell"></td>
                <td class="table-cell"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    }

    @if (planillas().length === 0 && !cargando()) {
      <div class="card">
        <div class="card-body" style="text-align:center;padding:var(--space-xl)">
          <p style="color:var(--color-text-muted)">
            No hay planilla generada para <strong>{{ periodoLabel() }}</strong>.
            Pulse <strong>Generar Planilla</strong> para calcular las boletas de todos los empleados activos.
          </p>
        </div>
      </div>
    }
  `
})
export class PayrollComponent implements OnInit {
    private readonly payrollService = inject(PayrollService);
    private readonly router = inject(Router);

    readonly planillas = this.payrollService.payrolls;
    readonly cargando = this.payrollService.loading;
    readonly accionando = signal(false);
    readonly mensaje = signal<string | null>(null);
    readonly error = signal<string | null>(null);

    periodo = new Date().toISOString().substring(0, 7);
    readonly mesMaximo = new Date().toISOString().substring(0, 7);

    private readonly ingresos = (p: Payroll) =>
        (p.sueldoBase || 0) + (p.bonos || 0) + (p.montoHorasExtras || 0) + (p.asignacionFamiliar || 0);
    bruto = (p: Payroll) => this.ingresos(p);
    descuentos = (p: Payroll) => (p.descuentos || 0) + (p.montoAfpOnp || 0) + (p.rentaQuinta || 0);

    totalSueldoBase = computed(() => this.planillas().reduce((s, p) => s + (p.sueldoBase || 0), 0));
    totalBruto      = computed(() => this.planillas().reduce((s, p) => s + this.ingresos(p), 0));
    totalDescuentos = computed(() => this.planillas().reduce((s, p) => s + this.descuentos(p), 0));
    totalNeto       = computed(() => this.planillas().reduce((s, p) => s + (p.neto || 0), 0));
    totalEssalud    = computed(() => this.planillas().reduce((s, p) => s + (p.essalud || 0), 0));

    async ngOnInit(): Promise<void> {
        await this.cargarPeriodo();
    }

    /** Lista las planillas persistidas del periodo seleccionado. */
    async cargarPeriodo(): Promise<void> {
        this.error.set(null);
        this.mensaje.set(null);
        try {
            await this.payrollService.getByPeriod(this.periodo);
        } catch {
            this.error.set('No se pudieron cargar las planillas del periodo.');
        }
    }

    /** Genera (persiste) las boletas faltantes del periodo y refresca la lista. */
    async generarPlanilla(): Promise<void> {
        this.error.set(null);
        this.mensaje.set(null);
        try {
            const nuevas = await this.payrollService.generatePayrollForPeriod(this.periodo);
            await this.payrollService.getByPeriod(this.periodo);
            this.mensaje.set(nuevas.length > 0
                ? `Se generaron ${nuevas.length} boleta(s) nueva(s) para ${this.periodoLabel()}.`
                : `Todas las boletas de ${this.periodoLabel()} ya estaban generadas.`);
        } catch {
            this.error.set('No se pudo generar la planilla. Verifique que existan empleados activos.');
        }
    }

    async aprobar(p: Payroll): Promise<void> {
        this.accionando.set(true);
        this.error.set(null);
        try {
            await this.payrollService.approvePayroll(p.id);
            this.mensaje.set(`Boleta de ${p.employeeName ?? ('#' + p.employeeId)} aprobada — se disparó el pago en tesorería y el asiento contable.`);
        } catch {
            this.error.set('No se pudo aprobar la boleta.');
        } finally {
            this.accionando.set(false);
        }
    }

    async pagar(p: Payroll): Promise<void> {
        this.accionando.set(true);
        this.error.set(null);
        try {
            await this.payrollService.markAsPaid(p.id);
            this.mensaje.set(`Boleta de ${p.employeeName ?? ('#' + p.employeeId)} marcada como pagada.`);
        } catch {
            this.error.set('No se pudo marcar como pagada.');
        } finally {
            this.accionando.set(false);
        }
    }

    verBoleta(payrollId: number): void {
        this.router.navigate(['/admin/rrhh/boleta', payrollId]);
    }

    estadoBadge(estado: PayrollStatus): string {
        switch (estado) {
            case 'GENERADO':  return 'badge-info';
            case 'APROBADO':  return 'badge-warning';
            case 'PAGADO':    return 'badge-success';
            case 'CANCELADO': return 'badge-error';
        }
    }

    periodoLabel(): string {
        const [anio, mes] = this.periodo.split('-');
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const idx = parseInt(mes, 10) - 1;
        return `${meses[idx] ?? mes} ${anio}`;
    }
}
