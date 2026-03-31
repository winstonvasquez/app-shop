import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EmployeeService } from '../../services/employee.service';
import { Employee } from '../../models/employee.model';
import { ConfiguracionRemunerativa, ConfiguracionRemunerativaService, CONFIG_DEFAULT } from '../../services/configuracion-remunerativa.service';

/** Tipos de AFP disponibles en Perú */
type AFP = 'INTEGRA' | 'PRIMA' | 'PROFUTURO' | 'HABITAT';

interface LineaPlanilla {
    empleadoId: number;
    empleadoNombre: string;
    cargo: string;
    area: string;
    sueldoBase: number;
    asignacionFamiliar: boolean;
    otrosBonos: number;
    sistemaPrevisional: 'AFP' | 'ONP';
    afp: AFP;
    remuneracionBasica: number;
    totalBruto: number;
    descuentoAfp: number;   // jubilación + seguro + comisión
    descuentoOnp: number;
    descuentoRenta5ta: number;
    totalDescuentos: number;
    netoAPagar: number;
    aporteEssalud: number;  // cargo empleador
}

@Component({
    selector: 'app-payroll',
    standalone: true,
    imports: [DecimalPipe, FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Planilla Remunerativa</h1>
        <p class="page-subtitle">Cálculo de haberes, descuentos y aportes — Normas Peruanas</p>
      </div>
      <div class="page-actions">
        <input class="input-field" type="month" [(ngModel)]="periodo"
               style="width:150px" [max]="mesMaximo">
        <button class="btn btn-primary" (click)="generarPlanilla()" [disabled]="cargando()">
          {{ cargando() ? 'Calculando...' : 'Generar Planilla' }}
        </button>
      </div>
    </div>

    @if (cargando()) {
      <div class="loading-container"><div class="spinner"></div></div>
    }

    @if (lineas().length > 0) {
      <!-- KPIs resumen -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--space-md);margin-bottom:var(--space-lg)">
        <div class="card">
          <div class="card-body">
            <div class="text-sm" style="color:var(--color-text-muted)">Total haberes brutos</div>
            <div class="font-bold" style="font-size:1.75rem;color:var(--color-primary)">
              S/ {{ totalBruto() | number:'1.2-2' }}
            </div>
            <div class="text-sm" style="color:var(--color-text-muted)">{{ lineas().length }} trabajadores</div>
          </div>
        </div>
        <div class="card">
          <div class="card-body">
            <div class="text-sm" style="color:var(--color-text-muted)">Total descuentos</div>
            <div class="font-bold" style="font-size:1.75rem;color:var(--color-warning)">
              S/ {{ totalDescuentos() | number:'1.2-2' }}
            </div>
            <div class="text-sm" style="color:var(--color-text-muted)">AFP/ONP + Renta 5ta</div>
          </div>
        </div>
        <div class="card">
          <div class="card-body">
            <div class="text-sm" style="color:var(--color-text-muted)">Total neto a pagar</div>
            <div class="font-bold" style="font-size:1.75rem;color:var(--color-success)">
              S/ {{ totalNeto() | number:'1.2-2' }}
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-body">
            <div class="text-sm" style="color:var(--color-text-muted)">ESSALUD empleador (9%)</div>
            <div class="font-bold" style="font-size:1.75rem">
              S/ {{ totalEssalud() | number:'1.2-2' }}
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-body">
            <div class="text-sm" style="color:var(--color-text-muted)">Costo total empresa</div>
            <div class="font-bold" style="font-size:1.75rem">
              S/ {{ (totalBruto() + totalEssalud()) | number:'1.2-2' }}
            </div>
            <div class="text-sm" style="color:var(--color-text-muted)">bruto + ESSALUD</div>
          </div>
        </div>
      </div>

      <!-- Tabla planilla -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Detalle de Planilla — {{ periodo }}</h3>
          <span class="badge badge-neutral">{{ lineas().length }} trabajadores</span>
        </div>
        <div style="overflow-x:auto">
          <table class="table" style="font-size:0.8rem;min-width:1050px">
            <thead>
              <tr>
                <th class="table-header-cell">Empleado / Cargo</th>
                <th class="table-header-cell text-right">S. Base</th>
                <th class="table-header-cell text-right">As.Fam.</th>
                <th class="table-header-cell text-right">Otros</th>
                <th class="table-header-cell text-right" style="color:var(--color-success)">BRUTO</th>
                <th class="table-header-cell text-right">AFP/ONP</th>
                <th class="table-header-cell text-right">Renta 5ta</th>
                <th class="table-header-cell text-right" style="color:var(--color-warning)">DESCT.</th>
                <th class="table-header-cell text-right" style="color:var(--color-success)">NETO</th>
                <th class="table-header-cell text-right">ESSALUD</th>
                <th class="table-header-cell">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (l of lineas(); track l.empleadoId) {
                <tr class="table-row">
                  <td class="table-cell">
                    <div class="font-bold">{{ l.empleadoNombre }}</div>
                    <div style="color:var(--color-text-muted);font-size:0.72rem">
                      {{ l.cargo }} · {{ l.area }}
                      <span class="badge badge-neutral" style="font-size:0.65rem;margin-left:4px">
                        {{ l.sistemaPrevisional === 'AFP' ? l.afp : 'ONP' }}
                      </span>
                    </div>
                  </td>
                  <td class="table-cell text-right font-mono">{{ l.sueldoBase | number:'1.2-2' }}</td>
                  <td class="table-cell text-right font-mono">
                    {{ l.asignacionFamiliar ? '102.00' : '—' }}
                  </td>
                  <td class="table-cell text-right font-mono">{{ l.otrosBonos | number:'1.2-2' }}</td>
                  <td class="table-cell text-right font-mono font-bold" style="color:var(--color-success)">
                    {{ l.totalBruto | number:'1.2-2' }}
                  </td>
                  <td class="table-cell text-right font-mono" style="color:var(--color-warning)">
                    {{ (l.descuentoAfp + l.descuentoOnp) | number:'1.2-2' }}
                  </td>
                  <td class="table-cell text-right font-mono" style="color:var(--color-warning)">
                    {{ l.descuentoRenta5ta | number:'1.2-2' }}
                  </td>
                  <td class="table-cell text-right font-mono font-bold" style="color:var(--color-warning)">
                    {{ l.totalDescuentos | number:'1.2-2' }}
                  </td>
                  <td class="table-cell text-right font-mono font-bold" style="color:var(--color-success)">
                    {{ l.netoAPagar | number:'1.2-2' }}
                  </td>
                  <td class="table-cell text-right font-mono" style="color:var(--color-text-muted)">
                    {{ l.aporteEssalud | number:'1.2-2' }}
                  </td>
                  <td class="table-cell">
                    <button class="btn btn-secondary" style="font-size:0.75rem;padding:4px 10px"
                            (click)="verBoleta(l.empleadoId)">
                      Ver Boleta
                    </button>
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
                <td class="table-cell text-right font-mono" style="color:var(--color-warning)">{{ totalRenta5ta() | number:'1.2-2' }}</td>
                <td class="table-cell text-right font-mono" style="color:var(--color-warning)">{{ totalDescuentos() | number:'1.2-2' }}</td>
                <td class="table-cell text-right font-mono" style="color:var(--color-success)">{{ totalNeto() | number:'1.2-2' }}</td>
                <td class="table-cell text-right font-mono">{{ totalEssalud() | number:'1.2-2' }}</td>
                <td class="table-cell"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Leyenda -->
      <div class="card" style="margin-top:var(--space-md)">
        <div class="card-header"><h3 class="card-title">Tasas y Normativa Aplicada</h3></div>
        <div class="card-body" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px;font-size:0.82rem;color:var(--color-text-muted)">
          <div>
            <strong style="display:block;margin-bottom:4px;color:var(--color-text-on)">Descuentos del Trabajador</strong>
            AFP Jubilación: 10.00%<br>
            AFP Seg. Invalidez: ~1.75–1.84%<br>
            AFP Comisión flujo: ~0.77–1.59%<br>
            ONP (alternativa): 13.00%
          </div>
          <div>
            <strong style="display:block;margin-bottom:4px;color:var(--color-text-on)">Aportes del Empleador</strong>
            ESSALUD: 9.00% s/ remuneración<br>
            Seguro Vida Ley (opcional)
          </div>
          <div>
            <strong style="display:block;margin-bottom:4px;color:var(--color-text-on)">Conceptos Remunerativos</strong>
            Asignación familiar: S/ 102.00<br>
            H.Extra 25%: días hábiles<br>
            H.Extra 35%: domingos/feriados
          </div>
          <div>
            <strong style="display:block;margin-bottom:4px;color:var(--color-text-on)">Renta 5ta — Tramos (anual)</strong>
            Exoneración: 7 UIT (S/ {{ 7 * uit() | number:'1.0-0' }})<br>
            De 5 a 20 UIT: 8% | 20 a 35: 14%<br>
            De 35 a 45 UIT: 17% | +45: 20%<br>
            UIT {{ mesMaximo.substring(0,4) }}: S/ {{ uit() | number:'1.0-0' }}
          </div>
        </div>
      </div>
    }

    @if (lineas().length === 0 && !cargando()) {
      <div class="card">
        <div class="card-body" style="text-align:center;padding:var(--space-xl)">
          <p style="color:var(--color-text-muted)">
            Seleccione el período y genere la planilla para ver los cálculos de todos los empleados activos.
          </p>
        </div>
      </div>
    }
  `
})
export class PayrollComponent implements OnInit {
    private readonly employeeService = inject(EmployeeService);
    private readonly configuracionService = inject(ConfiguracionRemunerativaService);
    private readonly router = inject(Router);

    cargando = signal(false);
    lineas = signal<LineaPlanilla[]>([]);
    private config = signal<ConfiguracionRemunerativa>(CONFIG_DEFAULT);
    uit = computed(() => this.config().uit);

    periodo = new Date().toISOString().substring(0, 7);
    mesMaximo = new Date().toISOString().substring(0, 7);

    totalBruto      = computed(() => this.lineas().reduce((s, l) => s + l.totalBruto, 0));
    totalDescuentos = computed(() => this.lineas().reduce((s, l) => s + l.totalDescuentos, 0));
    totalNeto       = computed(() => this.lineas().reduce((s, l) => s + l.netoAPagar, 0));
    totalEssalud    = computed(() => this.lineas().reduce((s, l) => s + l.aporteEssalud, 0));
    totalSueldoBase = computed(() => this.lineas().reduce((s, l) => s + l.sueldoBase, 0));
    totalRenta5ta   = computed(() => this.lineas().reduce((s, l) => s + l.descuentoRenta5ta, 0));

    verBoleta(empleadoId: number): void {
        this.router.navigate(['/rrhh/boleta'], { queryParams: { empleadoId, periodo: this.periodo } });
    }

    async ngOnInit() {
        const [config] = await Promise.allSettled([
            this.configuracionService.getConfiguracion(),
            this.employeeService.loadEmployees().catch(() => { /* no disponible */ }),
        ]);
        if (config.status === 'fulfilled') {
            this.config.set(config.value);
        }
    }

    async generarPlanilla() {
        this.cargando.set(true);
        try {
            let empleados: Employee[] = [];
            try {
                await this.employeeService.loadEmployees();
                empleados = this.employeeService.activeEmployees();
            } catch { /* fallback */ }

            if (empleados.length === 0) empleados = this.empleadosDemo();
            this.lineas.set(empleados.map(e => this.calcularPlanilla(e)));
        } finally {
            this.cargando.set(false);
        }
    }

    private calcularPlanilla(emp: Employee): LineaPlanilla {
        const cfg = this.config();
        const sueldoBase = this.sueldoBasePorCargo(emp.cargo ?? '');
        const asignacionFamiliar = true;
        const otrosBonos = 0;
        const sistemaPrevisional = 'AFP' as 'AFP' | 'ONP';
        const afp: AFP = 'INTEGRA';

        const remuneracionBasica = sueldoBase + (asignacionFamiliar ? cfg.asignacionFamiliar : 0);
        const totalBruto = remuneracionBasica + otrosBonos;

        const afpMap: Record<AFP, typeof cfg.integra> = {
            INTEGRA: cfg.integra, PRIMA: cfg.prima,
            PROFUTURO: cfg.profuturo, HABITAT: cfg.habitat
        };
        const tasas = afpMap[afp];
        const descuentoAfp = sistemaPrevisional === 'AFP'
            ? remuneracionBasica * (tasas.jubilacion + tasas.seguroInvalidez + tasas.comision)
            : 0;
        const descuentoOnp = sistemaPrevisional === 'ONP'
            ? remuneracionBasica * cfg.onpTasa
            : 0;

        // Renta 5ta: proyección anual = bruto × 14 meses (12 + 2 gratificaciones)
        const descuentoRenta5ta = this.calcularRenta5ta(totalBruto * 14) / 12;

        const totalDescuentos = descuentoAfp + descuentoOnp + descuentoRenta5ta;
        const netoAPagar = totalBruto - totalDescuentos;
        const aporteEssalud = remuneracionBasica * cfg.essaludTasa;

        return {
            empleadoId: emp.id, empleadoNombre: `${emp.nombres} ${emp.apellidos}`,
            cargo: emp.cargo ?? '—', area: emp.area ?? '—',
            sueldoBase, asignacionFamiliar, otrosBonos, sistemaPrevisional, afp,
            remuneracionBasica, totalBruto,
            descuentoAfp, descuentoOnp, descuentoRenta5ta,
            totalDescuentos, netoAPagar, aporteEssalud
        };
    }

    /**
     * Renta 5ta — escala progresiva SUNAT
     * Exoneración: primeras 7 UIT del ingreso neto anual
     * Tramos: hasta 5 UIT → 8%; 5–20 → 14%; 20–35 → 17%; 35–45 → 20%; +45 → 30%
     * Usa la UIT dinámica cargada desde el backend (fallback: 5150).
     */
    private calcularRenta5ta(ingresoAnual: number): number {
        const uit = this.uit();
        const baseImponible = Math.max(0, ingresoAnual - 7 * uit);
        if (baseImponible <= 0) return 0;
        const tramos = [
            { limite: 5 * uit,  tasa: 0.08 },
            { limite: 15 * uit, tasa: 0.14 },
            { limite: 15 * uit, tasa: 0.17 },
            { limite: 10 * uit, tasa: 0.20 },
            { limite: Infinity, tasa: 0.30 }
        ];
        let impuesto = 0, restante = baseImponible;
        for (const t of tramos) {
            if (restante <= 0) break;
            const gravado = Math.min(restante, t.limite);
            impuesto += gravado * t.tasa;
            restante -= gravado;
        }
        return impuesto;
    }

    private sueldoBasePorCargo(cargo: string): number {
        const tabla: Record<string, number> = {
            'Gerente General': 8500, 'Gerente': 7000, 'Jefe de Ventas': 5000,
            'Jefe': 4500, 'Contador': 3800, 'Asistente Contable': 2200,
            'Vendedor': 1800, 'Almacenero': 1500, 'Asistente': 1800, 'Auxiliar': 1200
        };
        return tabla[cargo] ?? 1800;
    }

    private empleadosDemo(): Employee[] {
        const hoy = new Date().toISOString();
        return [
            { id: 1, tenantId: 1, codigoEmpleado: 'E001', nombres: 'Carlos Alberto', apellidos: 'Ramos Huanca',    documentoIdentidad: '42345678', fechaIngreso: '2020-01-15', cargo: 'Gerente General', area: 'Dirección',      estado: 'ACTIVO', createdAt: hoy },
            { id: 2, tenantId: 1, codigoEmpleado: 'E002', nombres: 'María Elena',    apellidos: 'Torres Quispe',   documentoIdentidad: '43456789', fechaIngreso: '2021-03-01', cargo: 'Contador',        area: 'Contabilidad',   estado: 'ACTIVO', createdAt: hoy },
            { id: 3, tenantId: 1, codigoEmpleado: 'E003', nombres: 'Juan Miguel',    apellidos: 'López Mamani',    documentoIdentidad: '44567890', fechaIngreso: '2022-06-15', cargo: 'Jefe de Ventas',  area: 'Ventas',         estado: 'ACTIVO', createdAt: hoy },
            { id: 4, tenantId: 1, codigoEmpleado: 'E004', nombres: 'Ana Lucía',      apellidos: 'Flores Condori',  documentoIdentidad: '45678901', fechaIngreso: '2023-01-10', cargo: 'Asistente',       area: 'Administración', estado: 'ACTIVO', createdAt: hoy },
            { id: 5, tenantId: 1, codigoEmpleado: 'E005', nombres: 'Pedro Raúl',     apellidos: 'Vargas Calizaya', documentoIdentidad: '46789012', fechaIngreso: '2023-07-01', cargo: 'Almacenero',      area: 'Logística',      estado: 'ACTIVO', createdAt: hoy }
        ];
    }
}
