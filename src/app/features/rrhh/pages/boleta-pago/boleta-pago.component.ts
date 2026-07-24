import { Component, DestroyRef, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PayrollService } from '../../services/payroll.service';
import { EmployeeService } from '../../services/employee.service';
import { Payroll, PayrollStatus } from '../../models/payroll.model';
import { Employee } from '../../models/employee.model';
import { CompanyService } from '@features/admin/services/company.service';
import { CompanyResponse } from '@features/admin/models/company.model';
import { AuthService } from '@core/auth/auth.service';

/**
 * Boleta de pago con PROCEDENCIA: carga una planilla persistida por su payrollId
 * (GET /hr/api/payroll/{id}) — ya no hay datos demo ni cálculo en el cliente. El
 * empleado y la empresa se traen del backend; los montos vienen del motor de nómina.
 * Se llega a esta pantalla exclusivamente desde la Planilla del periodo.
 */
@Component({
    selector: 'app-boleta-pago',
    standalone: true,
    imports: [DecimalPipe, DatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [`
        @media print {
            .no-print { display: none !important; }
            .boleta-wrapper { padding: 0; background: white; }
            .boleta-container { max-width: 100%; box-shadow: none; border: 1px solid #ccc; }
        }
        .boleta-wrapper { padding: var(--space-lg); min-height: 100vh; background: var(--color-background); }
        .boleta-container {
            max-width: 860px; margin: 0 auto; background: var(--color-surface-raised);
            border: 1px solid var(--color-border); border-radius: 4px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.4); font-size: 0.875rem; color: var(--color-text-on);
        }
        .boleta-header {
            display: grid; grid-template-columns: 1fr auto; gap: 16px; align-items: start;
            padding: 20px 24px; border-bottom: 2px solid var(--color-primary);
        }
        .empresa-nombre { font-size: 1.1rem; font-weight: 700; color: var(--color-primary); margin-bottom: 4px; }
        .empresa-detalle { font-size: 0.8rem; color: var(--color-text-muted); line-height: 1.5; }
        .boleta-titulo { text-align: right; }
        .boleta-titulo h2 { font-size: 1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
        .boleta-titulo .numero { font-size: 0.78rem; color: var(--color-text-muted); }
        .seccion { padding: 14px 24px; border-bottom: 1px solid var(--color-border); }
        .seccion-titulo {
            font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
            color: var(--color-text-muted); margin-bottom: 10px;
        }
        .datos-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 6px 24px; }
        .dato-fila { display: flex; gap: 8px; font-size: 0.82rem; }
        .dato-label { color: var(--color-text-muted); min-width: 110px; flex-shrink: 0; }
        .dato-valor { font-weight: 600; }
        .conceptos-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
        .conceptos-col { padding: 14px 24px; }
        .conceptos-col:first-child { border-right: 1px solid var(--color-border); }
        .col-titulo {
            font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
            margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid var(--color-border);
        }
        .concepto-fila { display: flex; justify-content: space-between; align-items: center; padding: 3px 0; font-size: 0.82rem; }
        .concepto-fila.subtotal { border-top: 1px solid var(--color-border); margin-top: 8px; padding-top: 6px; font-weight: 700; }
        .monto { font-family: 'Courier New', monospace; font-size: 0.82rem; min-width: 80px; text-align: right; }
        .monto-ingreso { color: var(--color-success); }
        .monto-descuento { color: var(--color-warning); }
        .totales-bar {
            display: flex; justify-content: space-between; align-items: center; padding: 16px 24px;
            background: color-mix(in oklch, var(--color-success) 10%, var(--color-surface-raised));
            border-top: 2px solid var(--color-success); border-bottom: 1px solid var(--color-border);
        }
        .neto-label { font-size: 0.9rem; font-weight: 700; text-transform: uppercase; }
        .neto-monto { font-size: 1.4rem; font-weight: 700; color: var(--color-success); font-family: 'Courier New', monospace; }
        .aportes-nota { font-size: 0.78rem; color: var(--color-text-muted); line-height: 1.6; }
        .firmas-seccion { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; padding: 24px 24px 20px; }
        .firma-item { text-align: center; }
        .firma-linea { border-top: 1px solid var(--color-border); margin-bottom: 6px; padding-top: 6px; }
        .firma-label { font-size: 0.78rem; color: var(--color-text-muted); }
        .acciones-bar { display: flex; gap: 12px; margin-bottom: var(--space-md); align-items: center; flex-wrap: wrap; }
    `],
    template: `
    <div class="boleta-wrapper">
      @if (cargando()) {
        <div class="loading-container"><div class="spinner"></div></div>
      } @else if (planilla(); as p) {
        <!-- Acciones -->
        <div class="acciones-bar no-print">
          <button class="btn btn-secondary" (click)="volver()">← Volver a Planilla</button>
          <button class="btn btn-secondary" (click)="verEmpleado(p.employeeId)">Ver empleado</button>
          <button class="btn btn-primary" (click)="imprimir()">Imprimir</button>
          @if (p.estado === 'GENERADO') {
            <button class="btn btn-primary" [disabled]="accionando()" (click)="aprobar(p)">Aprobar</button>
          }
          @if (p.estado === 'APROBADO') {
            <button class="btn btn-primary" [disabled]="accionando()" (click)="pagar(p)">Marcar como pagada</button>
          }
          <span class="badge" [class]="estadoBadge(p.estado)" style="margin-left:auto">{{ p.estado }}</span>
        </div>
        @if (error(); as e) {
          <div class="card no-print" style="margin-bottom:var(--space-md);border-left:3px solid var(--color-error)">
            <div class="card-body" style="padding:10px 14px;font-size:0.85rem;color:var(--color-error)">{{ e }}</div>
          </div>
        }

        <!-- Boleta -->
        <div class="boleta-container">
          <!-- Encabezado empresa / título -->
          <div class="boleta-header">
            <div>
              <div class="empresa-nombre">{{ empresa()?.legalName || empresa()?.name || 'Empresa' }}</div>
              <div class="empresa-detalle">
                @if (empresa()?.ruc) { RUC: {{ empresa()?.ruc }}<br> }
                @if (empresa()?.address) { {{ empresa()?.address }} }
              </div>
            </div>
            <div class="boleta-titulo">
              <h2>Boleta de Pago</h2>
              <div class="numero">Período: {{ periodoLabel(p.periodo) }}</div>
              <div class="numero">N° B{{ p.periodo.replace('-','') }}-{{ p.id.toString().padStart(6,'0') }}</div>
            </div>
          </div>

          <!-- Datos del trabajador -->
          <div class="seccion">
            <div class="seccion-titulo">Datos del Trabajador</div>
            <div class="datos-grid">
              <div class="dato-fila"><span class="dato-label">Apellidos y Nombres:</span><span class="dato-valor">{{ nombreTrabajador(p) }}</span></div>
              <div class="dato-fila"><span class="dato-label">Código:</span><span class="dato-valor">{{ empleado()?.codigoEmpleado || '—' }}</span></div>
              <div class="dato-fila"><span class="dato-label">Cargo:</span><span class="dato-valor">{{ empleado()?.cargo || empleado()?.positionName || '—' }}</span></div>
              <div class="dato-fila"><span class="dato-label">Área:</span><span class="dato-valor">{{ empleado()?.area || empleado()?.departmentName || '—' }}</span></div>
              <div class="dato-fila"><span class="dato-label">DNI / Doc.:</span><span class="dato-valor">{{ empleado()?.documentoIdentidad || '—' }}</span></div>
              <div class="dato-fila"><span class="dato-label">Fecha Ingreso:</span><span class="dato-valor">{{ empleado()?.fechaIngreso ? (empleado()!.fechaIngreso | date:'dd/MM/yyyy') : '—' }}</span></div>
              <div class="dato-fila"><span class="dato-label">Sist. Previsional:</span><span class="dato-valor">{{ p.afpOnp || empleado()?.sistemaPrevisional || '—' }}</span></div>
              <div class="dato-fila"><span class="dato-label">Días Trabajados:</span><span class="dato-valor">{{ p.diasTrabajados ?? 30 }}</span></div>
            </div>
          </div>

          <!-- Ingresos y Descuentos -->
          <div class="conceptos-grid" style="border-bottom: 1px solid var(--color-border)">
            <!-- Ingresos -->
            <div class="conceptos-col">
              <div class="col-titulo" style="color: var(--color-success)">Ingresos</div>
              <div class="concepto-fila"><span>Sueldo Básico</span><span class="monto monto-ingreso">{{ p.sueldoBase | number:'1.2-2' }}</span></div>
              @if ((p.asignacionFamiliar || 0) > 0) {
                <div class="concepto-fila"><span>Asignación Familiar</span><span class="monto monto-ingreso">{{ p.asignacionFamiliar | number:'1.2-2' }}</span></div>
              }
              @if ((p.montoHorasExtras || 0) > 0) {
                <div class="concepto-fila"><span>Horas Extras ({{ p.horasExtras | number:'1.0-2' }} h)</span><span class="monto monto-ingreso">{{ p.montoHorasExtras | number:'1.2-2' }}</span></div>
              }
              @if ((p.bonos || 0) > 0) {
                <div class="concepto-fila"><span>Bonos</span><span class="monto monto-ingreso">{{ p.bonos | number:'1.2-2' }}</span></div>
              }
              <div class="concepto-fila subtotal"><span>TOTAL INGRESOS</span><span class="monto monto-ingreso">{{ totalIngresos(p) | number:'1.2-2' }}</span></div>
            </div>
            <!-- Descuentos -->
            <div class="conceptos-col">
              <div class="col-titulo" style="color: var(--color-warning)">Descuentos</div>
              <div class="concepto-fila"><span>{{ p.afpOnp || 'AFP/ONP' }}</span><span class="monto monto-descuento">{{ p.montoAfpOnp | number:'1.2-2' }}</span></div>
              @if ((p.rentaQuinta || 0) > 0) {
                <div class="concepto-fila"><span>Renta 5ta Categoría</span><span class="monto monto-descuento">{{ p.rentaQuinta | number:'1.2-2' }}</span></div>
              }
              @if ((p.descuentos || 0) > 0) {
                <div class="concepto-fila"><span>Otros Descuentos</span><span class="monto monto-descuento">{{ p.descuentos | number:'1.2-2' }}</span></div>
              }
              <div class="concepto-fila subtotal"><span>TOTAL DESCUENTOS</span><span class="monto monto-descuento">{{ totalDescuentos(p) | number:'1.2-2' }}</span></div>
            </div>
          </div>

          <!-- Neto a pagar -->
          <div class="totales-bar">
            <div>
              <div class="neto-label">Neto a Pagar</div>
              <div class="aportes-nota">
                Aporte ESSALUD empleador (9%): S/ {{ p.essalud | number:'1.2-2' }} — no descuenta al trabajador
              </div>
            </div>
            <div class="neto-monto">S/ {{ p.neto | number:'1.2-2' }}</div>
          </div>

          <!-- Aportes del empleador y beneficios sociales del periodo (informativo, no afectan el neto) -->
          @if ((p.gratificacion || 0) > 0 || (p.cts || 0) > 0) {
            <div class="seccion">
              <div class="seccion-titulo">Beneficios Sociales del Periodo (pago aparte)</div>
              <div class="datos-grid">
                @if ((p.gratificacion || 0) > 0) {
                  <div class="dato-fila"><span class="dato-label">Gratificación:</span><span class="dato-valor">S/ {{ p.gratificacion | number:'1.2-2' }}</span></div>
                }
                @if ((p.cts || 0) > 0) {
                  <div class="dato-fila"><span class="dato-label">CTS (semestral):</span><span class="dato-valor">S/ {{ p.cts | number:'1.2-2' }}</span></div>
                }
              </div>
            </div>
          }

          <!-- Firmas -->
          <div class="firmas-seccion">
            <div class="firma-item"><div style="height: 40px"></div><div class="firma-linea"></div><div class="firma-label">Firma del Trabajador</div></div>
            <div class="firma-item"><div style="height: 40px"></div><div class="firma-linea"></div><div class="firma-label">Firma del Empleador</div></div>
          </div>
        </div>
      } @else {
        <div class="card">
          <div class="card-body" style="text-align:center;padding:var(--space-xl)">
            <p style="color:var(--color-text-muted)">No se encontró la boleta solicitada.</p>
            <button class="btn btn-secondary" style="margin-top:var(--space-md)" (click)="volver()">← Volver a Planilla</button>
          </div>
        </div>
      }
    </div>
  `
})
export class BoletaPagoComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly payrollService = inject(PayrollService);
    private readonly employeeService = inject(EmployeeService);
    private readonly companyService = inject(CompanyService);
    private readonly authService = inject(AuthService);
    private readonly destroyRef = inject(DestroyRef);

    readonly planilla = signal<Payroll | null>(null);
    readonly empleado = signal<Employee | null>(null);
    readonly empresa = signal<CompanyResponse | null>(null);
    readonly cargando = signal(true);
    readonly accionando = signal(false);
    readonly error = signal<string | null>(null);

    ngOnInit(): void {
        this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
            const id = Number(params.get('id'));
            if (Number.isFinite(id) && id > 0) {
                void this.cargar(id);
            } else {
                this.cargando.set(false);
                this.planilla.set(null);
            }
        });
    }

    private async cargar(id: number): Promise<void> {
        this.cargando.set(true);
        this.error.set(null);
        try {
            const p = await this.payrollService.getById(id);
            this.planilla.set(p);
            // Datos del trabajador y de la empresa (best-effort; la boleta se muestra igual si fallan)
            void this.employeeService.getEmployeeById(p.employeeId)
                .then(e => this.empleado.set(e))
                .catch(() => { /* sin datos extra de empleado */ });
            const companyId = this.authService.currentUser()?.activeCompanyId;
            if (companyId) {
                firstValueFrom(this.companyService.getById(companyId))
                    .then(c => this.empresa.set(c))
                    .catch(() => { /* sin datos de empresa */ });
            }
        } catch {
            this.planilla.set(null);
        } finally {
            this.cargando.set(false);
        }
    }

    totalIngresos(p: Payroll): number {
        return (p.sueldoBase || 0) + (p.bonos || 0) + (p.montoHorasExtras || 0) + (p.asignacionFamiliar || 0);
    }

    totalDescuentos(p: Payroll): number {
        return (p.descuentos || 0) + (p.montoAfpOnp || 0) + (p.rentaQuinta || 0);
    }

    nombreTrabajador(p: Payroll): string {
        const e = this.empleado();
        if (e) return `${e.apellidos}, ${e.nombres}`;
        return p.employeeName || `Empleado #${p.employeeId}`;
    }

    async aprobar(p: Payroll): Promise<void> {
        this.accionando.set(true);
        this.error.set(null);
        try {
            const updated = await this.payrollService.approvePayroll(p.id);
            this.planilla.set(updated);
        } catch {
            this.error.set('No se pudo aprobar la boleta (¿estado no es GENERADO?).');
        } finally {
            this.accionando.set(false);
        }
    }

    async pagar(p: Payroll): Promise<void> {
        this.accionando.set(true);
        this.error.set(null);
        try {
            const updated = await this.payrollService.markAsPaid(p.id);
            this.planilla.set(updated);
        } catch {
            this.error.set('No se pudo marcar como pagada (¿estado no es APROBADO?).');
        } finally {
            this.accionando.set(false);
        }
    }

    imprimir(): void {
        window.print();
    }

    volver(): void {
        void this.router.navigate(['/admin/rrhh/payroll']);
    }

    verEmpleado(employeeId: number): void {
        void this.router.navigate(['/admin/rrhh/employees', employeeId, 'detail']);
    }

    estadoBadge(estado: PayrollStatus): string {
        switch (estado) {
            case 'GENERADO':  return 'badge-info';
            case 'APROBADO':  return 'badge-warning';
            case 'PAGADO':    return 'badge-success';
            case 'CANCELADO': return 'badge-error';
        }
    }

    periodoLabel(periodo: string): string {
        const [anio, mes] = periodo.split('-');
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const idx = parseInt(mes, 10) - 1;
        return `${meses[idx] ?? mes} ${anio}`;
    }
}
