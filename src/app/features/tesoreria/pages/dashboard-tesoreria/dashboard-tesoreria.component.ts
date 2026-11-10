import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CajasService } from '../../services/cajas.service';
import { PagosService } from '../../services/pagos.service';
import { MovimientosFinancierosService, FlujoCaja } from '../../services/movimientos-financieros.service';
import { CuentasBancariasService } from '../../services/cuentas-bancarias.service';
import { CashRegister, Payment, FinancialMovement, BankAccount } from '../../models/tesoreria.model';
import { ButtonComponent } from '@shared/components';
import { MONEDA } from '@shared/constants/sunat.constants';
import { hoyLocalISO } from '@core/utils/local-datetime.util';
import { pageTotalElements } from '@core/models/pagination.model';
import { simboloMoneda, sumarPorMoneda } from './dashboard-tesoreria.params';

@Component({
    selector: 'app-dashboard-tesoreria',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DecimalPipe, DatePipe, RouterLink, ButtonComponent],
    templateUrl: './dashboard-tesoreria.component.html'
})
export class DashboardTesoreriaComponent implements OnInit {
    private cajasService = inject(CajasService);
    private pagosService = inject(PagosService);
    private movimientosService = inject(MovimientosFinancierosService);
    private cuentasService = inject(CuentasBancariasService);

    readonly simbolo = simboloMoneda;

    cargando = signal(false);
    error = signal<string | null>(null);
    cajas = signal<CashRegister[]>([]);
    cuentas = signal<BankAccount[]>([]);
    pagosRecientes = signal<Payment[]>([]);
    /** Total REAL de pagos PENDING (consulta propia, no un conteo sobre la página de recientes). */
    pagosPendientes = signal(0);
    movimientos = signal<FinancialMovement[]>([]);
    /** Totales de HOY por moneda, calculados por el backend (flujo-caja), no sumando una página. */
    flujosHoy = signal<FlujoCaja[]>([]);
    readonly hoy = new Date();

    cajasAbiertas  = computed(() => this.cajas().filter(c => c.estado === 'ABIERTA').length);
    totalCajas     = computed(() => this.cajas().length);
    saldoCajas = computed(() => sumarPorMoneda(
        this.cajas().filter(c => c.estado === 'ABIERTA').map(c => ({ moneda: c.moneda, monto: c.saldoActual ?? 0 }))
    ));
    saldoBancos = computed(() => sumarPorMoneda(
        this.cuentas().filter(c => c.estado === 'ACTIVA').map(c => ({ moneda: c.moneda, monto: c.saldoActual ?? 0 }))
    ));
    ingresosHoy = computed(() => this.lineasHoy('totalIngresos'));
    egresosHoy  = computed(() => this.lineasHoy('totalEgresos'));

    /** PEN siempre; USD sólo si hubo movimiento ese día. */
    private lineasHoy(campo: 'totalIngresos' | 'totalEgresos') {
        return this.flujosHoy()
            .filter(f => f.moneda === MONEDA.PEN || f.totalIngresos > 0 || f.totalEgresos > 0)
            .map(f => ({ moneda: f.moneda, monto: f[campo] ?? 0 }));
    }

    ngOnInit(): void { this.cargar(); }

    cargar(): void {
        this.cargando.set(true);
        this.error.set(null);
        const hoy = hoyLocalISO();
        forkJoin({
            cajas: this.cajasService.getAll({ page: 0, size: 50 }),
            pagos: this.pagosService.getAll(0, 10),
            pendientes: this.pagosService.getAll(0, 1, { estado: 'PENDING' }),
            cuentas: this.cuentasService.getAll({ page: 0, size: 100, estado: 'ACTIVA' }),
            movimientos: this.movimientosService.getAll({ page: 0, size: 20 }),
            pen: this.movimientosService.getFlujoCaja(hoy, hoy, MONEDA.PEN),
            usd: this.movimientosService.getFlujoCaja(hoy, hoy, MONEDA.USD)
        }).subscribe({
            next: ({ cajas, pagos, pendientes, cuentas, movimientos, pen, usd }) => {
                // `CajasService.getAll` declara `Page<CashRegister>`; pagos y movimientos sí
                // pueden llegar como array plano, y por eso solo esos dos se normalizan.
                this.cajas.set(cajas.content);
                this.pagosRecientes.set(Array.isArray(pagos) ? pagos : (pagos?.content ?? []));
                this.movimientos.set(Array.isArray(movimientos) ? movimientos : (movimientos?.content ?? []));
                this.pagosPendientes.set(Array.isArray(pendientes)
                    ? pendientes.filter(p => p.estado === 'PENDING').length : pageTotalElements(pendientes));
                this.cuentas.set(Array.isArray(cuentas) ? cuentas : (cuentas?.content ?? []));
                this.flujosHoy.set([pen, usd]);
                this.cargando.set(false);
            },
            error: () => { this.error.set('No disponible'); this.cargando.set(false); }
        });
    }

    badgePago(estado: string): string {
        const map: Record<string, string> = {
            PENDING: 'badge badge-warning', APPROVED: 'badge badge-accent',
            PAID: 'badge badge-success', REJECTED: 'badge badge-error'
        };
        return map[estado] ?? 'badge badge-neutral';
    }

    badgeMovimiento(tipo: string): string {
        const map: Record<string, string> = {
            INGRESO: 'badge badge-success', EGRESO: 'badge badge-warning',
            TRANSFERENCIA: 'badge badge-accent'
        };
        return map[tipo] ?? 'badge badge-neutral';
    }
}
