import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ConfiguracionRemunerativa, ConfiguracionRemunerativaService, CONFIG_DEFAULT } from '../../services/configuracion-remunerativa.service';

/** Tipos de AFP disponibles en Perú */
type AFP = 'INTEGRA' | 'PRIMA' | 'PROFUTURO' | 'HABITAT';

interface DatosEmpresa {
    razonSocial: string;
    ruc: string;
    direccion: string;
    distrito: string;
    ciudad: string;
}

interface DatosEmpleado {
    id: number;
    codigo: string;
    nombre: string;
    cargo: string;
    area: string;
    dni: string;
    fechaIngreso: string;
    sistemaPrevisional: 'AFP' | 'ONP';
    afp: AFP;
    asignacionFamiliar: boolean;
    sueldoBase: number;
    otrosBonos: number;
}

interface LineaBoleta {
    sueldoBase: number;
    asignacionFamiliar: boolean;
    otrosBonos: number;
    sistemaPrevisional: 'AFP' | 'ONP';
    afp: AFP;
    remuneracionBasica: number;
    totalBruto: number;
    afpJubilacion: number;
    afpSeguroInvalidez: number;
    afpComision: number;
    descuentoAfp: number;
    descuentoOnp: number;
    descuentoRenta5ta: number;
    totalDescuentos: number;
    netoAPagar: number;
    aporteEssalud: number;
}

const EMPRESA_DEMO: DatosEmpresa = {
    razonSocial: 'MICROSHOP PERU S.A.C.',
    ruc: '20601234567',
    direccion: 'Av. Javier Prado Este 1234',
    distrito: 'San Isidro',
    ciudad: 'Lima'
};

const SUELDOS_POR_CARGO: Record<string, number> = {
    'Gerente General': 8500, 'Gerente': 7000, 'Jefe de Ventas': 5000,
    'Jefe': 4500, 'Contador': 3800, 'Asistente Contable': 2200,
    'Vendedor': 1800, 'Almacenero': 1500, 'Asistente': 1800, 'Auxiliar': 1200
};

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
        .boleta-wrapper {
            padding: var(--space-lg);
            min-height: 100vh;
            background: var(--color-background);
        }
        .boleta-container {
            max-width: 860px;
            margin: 0 auto;
            background: var(--color-surface-raised);
            border: 1px solid var(--color-border);
            border-radius: 4px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.4);
            font-size: 0.875rem;
            color: var(--color-text-on);
        }
        .boleta-header {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 16px;
            align-items: start;
            padding: 20px 24px;
            border-bottom: 2px solid var(--color-primary);
        }
        .empresa-nombre {
            font-size: 1.1rem;
            font-weight: 700;
            color: var(--color-primary);
            margin-bottom: 4px;
        }
        .empresa-detalle {
            font-size: 0.8rem;
            color: var(--color-text-muted);
            line-height: 1.5;
        }
        .boleta-titulo {
            text-align: right;
        }
        .boleta-titulo h2 {
            font-size: 1rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 4px;
        }
        .boleta-titulo .numero {
            font-size: 0.78rem;
            color: var(--color-text-muted);
        }
        .seccion {
            padding: 14px 24px;
            border-bottom: 1px solid var(--color-border);
        }
        .seccion-titulo {
            font-size: 0.72rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--color-text-muted);
            margin-bottom: 10px;
        }
        .datos-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 6px 24px;
        }
        .dato-fila {
            display: flex;
            gap: 8px;
            font-size: 0.82rem;
        }
        .dato-label {
            color: var(--color-text-muted);
            min-width: 110px;
            flex-shrink: 0;
        }
        .dato-valor {
            font-weight: 600;
        }
        .conceptos-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0;
        }
        .conceptos-col {
            padding: 14px 24px;
        }
        .conceptos-col:first-child {
            border-right: 1px solid var(--color-border);
        }
        .col-titulo {
            font-size: 0.72rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 10px;
            padding-bottom: 6px;
            border-bottom: 1px solid var(--color-border);
        }
        .concepto-fila {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 3px 0;
            font-size: 0.82rem;
        }
        .concepto-fila.subtotal {
            border-top: 1px solid var(--color-border);
            margin-top: 8px;
            padding-top: 6px;
            font-weight: 700;
        }
        .monto {
            font-family: 'Courier New', monospace;
            font-size: 0.82rem;
            min-width: 80px;
            text-align: right;
        }
        .monto-ingreso { color: var(--color-success); }
        .monto-descuento { color: var(--color-warning); }
        .totales-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 24px;
            background: color-mix(in oklch, var(--color-success) 10%, var(--color-surface-raised));
            border-top: 2px solid var(--color-success);
            border-bottom: 1px solid var(--color-border);
        }
        .neto-label {
            font-size: 0.9rem;
            font-weight: 700;
            text-transform: uppercase;
        }
        .neto-monto {
            font-size: 1.4rem;
            font-weight: 700;
            color: var(--color-success);
            font-family: 'Courier New', monospace;
        }
        .essalud-nota {
            font-size: 0.78rem;
            color: var(--color-text-muted);
        }
        .firmas-seccion {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            padding: 24px 24px 20px;
        }
        .firma-item {
            text-align: center;
        }
        .firma-linea {
            border-top: 1px solid var(--color-border);
            margin-bottom: 6px;
            padding-top: 6px;
        }
        .firma-label {
            font-size: 0.78rem;
            color: var(--color-text-muted);
        }
        .acciones-bar {
            display: flex;
            gap: 12px;
            margin-bottom: var(--space-md);
        }
    `],
    template: `
    <style>
      @media print {
        .no-print { display: none !important; }
        .boleta-wrapper { padding: 0; background: white; }
        .boleta-container { max-width: 100%; box-shadow: none; }
      }
    </style>

    <div class="boleta-wrapper">
      <!-- Acciones -->
      <div class="acciones-bar no-print">
        <button class="btn btn-secondary" (click)="volver()">
          ← Volver
        </button>
        <button class="btn btn-primary" (click)="imprimir()">
          Imprimir Boleta
        </button>
      </div>

      <!-- Boleta -->
      <div class="boleta-container">

        <!-- Encabezado empresa / título -->
        <div class="boleta-header">
          <div>
            <div class="empresa-nombre">{{ empresa.razonSocial }}</div>
            <div class="empresa-detalle">
              RUC: {{ empresa.ruc }}<br>
              {{ empresa.direccion }}, {{ empresa.distrito }} — {{ empresa.ciudad }}
            </div>
          </div>
          <div class="boleta-titulo">
            <h2>Boleta de Pago</h2>
            <div class="numero">Período: {{ periodoLabel() }}</div>
            <div class="numero">N° B-{{ periodo().replace('-','') }}-{{ empleado().id.toString().padStart(4,'0') }}</div>
          </div>
        </div>

        <!-- Datos del trabajador -->
        <div class="seccion">
          <div class="seccion-titulo">Datos del Trabajador</div>
          <div class="datos-grid">
            <div class="dato-fila">
              <span class="dato-label">Apellidos y Nombres:</span>
              <span class="dato-valor">{{ empleado().nombre }}</span>
            </div>
            <div class="dato-fila">
              <span class="dato-label">Código:</span>
              <span class="dato-valor">{{ empleado().codigo }}</span>
            </div>
            <div class="dato-fila">
              <span class="dato-label">Cargo:</span>
              <span class="dato-valor">{{ empleado().cargo }}</span>
            </div>
            <div class="dato-fila">
              <span class="dato-label">Área:</span>
              <span class="dato-valor">{{ empleado().area }}</span>
            </div>
            <div class="dato-fila">
              <span class="dato-label">DNI:</span>
              <span class="dato-valor">{{ empleado().dni }}</span>
            </div>
            <div class="dato-fila">
              <span class="dato-label">Fecha Ingreso:</span>
              <span class="dato-valor">{{ empleado().fechaIngreso | date:'dd/MM/yyyy' }}</span>
            </div>
            <div class="dato-fila">
              <span class="dato-label">Sistema Previsional:</span>
              <span class="dato-valor">{{ empleado().sistemaPrevisional }}</span>
            </div>
            @if (empleado().sistemaPrevisional === 'AFP') {
              <div class="dato-fila">
                <span class="dato-label">AFP:</span>
                <span class="dato-valor">{{ empleado().afp }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Ingresos y Descuentos -->
        <div class="conceptos-grid" style="border-bottom: 1px solid var(--color-border)">
          <!-- Ingresos -->
          <div class="conceptos-col">
            <div class="col-titulo" style="color: var(--color-success)">Ingresos</div>

            <div class="concepto-fila">
              <span>Sueldo Básico</span>
              <span class="monto monto-ingreso">{{ linea().sueldoBase | number:'1.2-2' }}</span>
            </div>

            @if (linea().asignacionFamiliar) {
              <div class="concepto-fila">
                <span>Asignación Familiar</span>
                <span class="monto monto-ingreso">102.00</span>
              </div>
            }

            @if (linea().otrosBonos > 0) {
              <div class="concepto-fila">
                <span>Otros Bonos</span>
                <span class="monto monto-ingreso">{{ linea().otrosBonos | number:'1.2-2' }}</span>
              </div>
            }

            <div class="concepto-fila subtotal">
              <span>TOTAL INGRESOS</span>
              <span class="monto monto-ingreso">{{ linea().totalBruto | number:'1.2-2' }}</span>
            </div>
          </div>

          <!-- Descuentos -->
          <div class="conceptos-col">
            <div class="col-titulo" style="color: var(--color-warning)">Descuentos</div>

            @if (linea().sistemaPrevisional === 'AFP') {
              <div class="concepto-fila">
                <span>AFP Jubilación (10%)</span>
                <span class="monto monto-descuento">{{ linea().afpJubilacion | number:'1.2-2' }}</span>
              </div>
              <div class="concepto-fila">
                <span>AFP Seg. Invalidez</span>
                <span class="monto monto-descuento">{{ linea().afpSeguroInvalidez | number:'1.2-2' }}</span>
              </div>
              <div class="concepto-fila">
                <span>AFP Comisión</span>
                <span class="monto monto-descuento">{{ linea().afpComision | number:'1.2-2' }}</span>
              </div>
            } @else {
              <div class="concepto-fila">
                <span>ONP (13%)</span>
                <span class="monto monto-descuento">{{ linea().descuentoOnp | number:'1.2-2' }}</span>
              </div>
            }

            @if (linea().descuentoRenta5ta > 0) {
              <div class="concepto-fila">
                <span>Renta 5ta Categoría</span>
                <span class="monto monto-descuento">{{ linea().descuentoRenta5ta | number:'1.2-2' }}</span>
              </div>
            }

            <div class="concepto-fila subtotal">
              <span>TOTAL DESCUENTOS</span>
              <span class="monto monto-descuento">{{ linea().totalDescuentos | number:'1.2-2' }}</span>
            </div>
          </div>
        </div>

        <!-- Neto a pagar -->
        <div class="totales-bar">
          <div>
            <div class="neto-label">Neto a Pagar</div>
            <div class="essalud-nota">
              Aporte ESSALUD empleador (9%): S/ {{ linea().aporteEssalud | number:'1.2-2' }} — no descuenta al trabajador
            </div>
          </div>
          <div class="neto-monto">S/ {{ linea().netoAPagar | number:'1.2-2' }}</div>
        </div>

        <!-- Firmas -->
        <div class="firmas-seccion">
          <div class="firma-item">
            <div style="height: 40px"></div>
            <div class="firma-linea"></div>
            <div class="firma-label">Firma del Trabajador</div>
          </div>
          <div class="firma-item">
            <div style="height: 40px"></div>
            <div class="firma-linea"></div>
            <div class="firma-label">Firma del Empleador</div>
          </div>
        </div>

      </div>
    </div>
  `
})
export class BoletaPagoComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly configuracionService = inject(ConfiguracionRemunerativaService);

    readonly empresa: DatosEmpresa = EMPRESA_DEMO;

    periodo = signal<string>(new Date().toISOString().substring(0, 7));
    empleado = signal<DatosEmpleado>(this.empleadoDemo());
    linea = signal<LineaBoleta>(this.calcularBoleta(this.empleadoDemo()));
    private config: ConfiguracionRemunerativa = CONFIG_DEFAULT;

    periodoLabel() {
        const [anio, mes] = this.periodo().split('-');
        const meses = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        return `${meses[parseInt(mes, 10) - 1]} ${anio}`;
    }

    async ngOnInit(): Promise<void> {
        // Cargar configuración desde el backend (con fallback automático si falla)
        this.config = await this.configuracionService.getConfiguracion();

        this.route.queryParams.subscribe(params => {
            const empleadoId = params['empleadoId'] ? parseInt(params['empleadoId'], 10) : null;
            const periodoParam = params['periodo'] ?? new Date().toISOString().substring(0, 7);

            this.periodo.set(periodoParam);

            // Sin backend aún: usar demo o demo con ID recibido
            const emp = this.empleadoDemo(empleadoId ?? undefined);
            this.empleado.set(emp);
            this.linea.set(this.calcularBoleta(emp));
        });
    }

    imprimir(): void {
        window.print();
    }

    volver(): void {
        history.back();
    }

    private empleadoDemo(id?: number): DatosEmpleado {
        const demos: Record<number, DatosEmpleado> = {
            1: { id: 1, codigo: 'E001', nombre: 'Ramos Huanca, Carlos Alberto',   cargo: 'Gerente General', area: 'Dirección',      dni: '42345678', fechaIngreso: '2020-01-15', sistemaPrevisional: 'AFP', afp: 'INTEGRA',   asignacionFamiliar: true, sueldoBase: SUELDOS_POR_CARGO['Gerente General'], otrosBonos: 0 },
            2: { id: 2, codigo: 'E002', nombre: 'Torres Quispe, María Elena',     cargo: 'Contador',        area: 'Contabilidad',   dni: '43456789', fechaIngreso: '2021-03-01', sistemaPrevisional: 'AFP', afp: 'PRIMA',     asignacionFamiliar: true, sueldoBase: SUELDOS_POR_CARGO['Contador'],        otrosBonos: 0 },
            3: { id: 3, codigo: 'E003', nombre: 'López Mamani, Juan Miguel',      cargo: 'Jefe de Ventas',  area: 'Ventas',         dni: '44567890', fechaIngreso: '2022-06-15', sistemaPrevisional: 'AFP', afp: 'INTEGRA',   asignacionFamiliar: true, sueldoBase: SUELDOS_POR_CARGO['Jefe de Ventas'],  otrosBonos: 0 },
            4: { id: 4, codigo: 'E004', nombre: 'Flores Condori, Ana Lucía',      cargo: 'Asistente',       area: 'Administración', dni: '45678901', fechaIngreso: '2023-01-10', sistemaPrevisional: 'ONP', afp: 'INTEGRA',   asignacionFamiliar: false, sueldoBase: SUELDOS_POR_CARGO['Asistente'],       otrosBonos: 0 },
            5: { id: 5, codigo: 'E005', nombre: 'Vargas Calizaya, Pedro Raúl',    cargo: 'Almacenero',      area: 'Logística',      dni: '46789012', fechaIngreso: '2023-07-01', sistemaPrevisional: 'AFP', afp: 'HABITAT',   asignacionFamiliar: true, sueldoBase: SUELDOS_POR_CARGO['Almacenero'],      otrosBonos: 0 },
        };
        return demos[id ?? 1] ?? demos[1];
    }

    private calcularBoleta(emp: DatosEmpleado): LineaBoleta {
        const cfg = this.config;
        const remuneracionBasica = emp.sueldoBase + (emp.asignacionFamiliar ? cfg.asignacionFamiliar : 0);
        const totalBruto = remuneracionBasica + emp.otrosBonos;

        const afpMap: Record<AFP, typeof cfg.integra> = {
            INTEGRA: cfg.integra, PRIMA: cfg.prima,
            PROFUTURO: cfg.profuturo, HABITAT: cfg.habitat
        };
        const tasas = afpMap[emp.afp];

        let afpJubilacion = 0;
        let afpSeguroInvalidez = 0;
        let afpComision = 0;
        let descuentoAfp = 0;
        let descuentoOnp = 0;

        if (emp.sistemaPrevisional === 'AFP') {
            afpJubilacion      = remuneracionBasica * tasas.jubilacion;
            afpSeguroInvalidez = remuneracionBasica * tasas.seguroInvalidez;
            afpComision        = remuneracionBasica * tasas.comision;
            descuentoAfp       = afpJubilacion + afpSeguroInvalidez + afpComision;
        } else {
            descuentoOnp = remuneracionBasica * cfg.onpTasa;
        }

        const descuentoRenta5ta = this.calcularRenta5ta(totalBruto * 14) / 12;
        const totalDescuentos = descuentoAfp + descuentoOnp + descuentoRenta5ta;
        const netoAPagar = totalBruto - totalDescuentos;
        const aporteEssalud = remuneracionBasica * cfg.essaludTasa;

        return {
            sueldoBase: emp.sueldoBase,
            asignacionFamiliar: emp.asignacionFamiliar,
            otrosBonos: emp.otrosBonos,
            sistemaPrevisional: emp.sistemaPrevisional,
            afp: emp.afp,
            remuneracionBasica,
            totalBruto,
            afpJubilacion,
            afpSeguroInvalidez,
            afpComision,
            descuentoAfp,
            descuentoOnp,
            descuentoRenta5ta,
            totalDescuentos,
            netoAPagar,
            aporteEssalud
        };
    }

    /**
     * Renta 5ta — escala progresiva SUNAT
     * Exoneración: primeras 7 UIT del ingreso neto anual
     * Tramos: hasta 5 UIT → 8%; 5–20 → 14%; 20–35 → 17%; 35–45 → 20%; +45 → 30%
     * Usa la UIT dinámica cargada desde el backend (fallback: 5150).
     */
    private calcularRenta5ta(ingresoAnual: number): number {
        const uit = this.config.uit;
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
}
