import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CajasService } from '../../services/cajas.service';
import { PagosService } from '../../services/pagos.service';
import { MovimientosFinancierosService } from '../../services/movimientos-financieros.service';
import { CashRegister, Payment, FinancialMovement } from '../../models/tesoreria.model';

@Component({
    selector: 'app-dashboard-tesoreria',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DecimalPipe, DatePipe, RouterLink],
    templateUrl: './dashboard-tesoreria.component.html'
})
export class DashboardTesoreriaComponent implements OnInit {
    private cajasService = inject(CajasService);
    private pagosService = inject(PagosService);
    private movimientosService = inject(MovimientosFinancierosService);

    cargando = signal(false);
    error = signal<string | null>(null);
    cajas = signal<CashRegister[]>([]);
    pagosRecientes = signal<Payment[]>([]);
    movimientos = signal<FinancialMovement[]>([]);
    readonly hoy = new Date();

    cajasAbiertas = computed(() => this.cajas().filter(c => c.estado === 'ABIERTA').length);
    totalCajas = computed(() => this.cajas().length);
    saldoTotalCajas = computed(() =>
        this.cajas().filter(c => c.estado === 'ABIERTA').reduce((s, c) => s + (c.saldoActual ?? 0), 0)
    );
    pagosPendientes = computed(() => this.pagosRecientes().filter(p => p.estado === 'PENDING').length);
    ingresosHoy = computed(() => {
        const hoy = this.hoy.toISOString().split('T')[0];
        return this.movimientos()
            .filter(m => m.tipoMovimiento === 'INGRESO' && m.fecha?.startsWith(hoy))
            .reduce((s, m) => s + (m.monto ?? 0), 0);
    });
    egresosHoy = computed(() => {
        const hoy = this.hoy.toISOString().split('T')[0];
        return this.movimientos()
            .filter(m => m.tipoMovimiento === 'EGRESO' && m.fecha?.startsWith(hoy))
            .reduce((s, m) => s + (m.monto ?? 0), 0);
    });

    ngOnInit(): void { this.cargar(); }

    cargar(): void {
        this.cargando.set(true);
        this.error.set(null);

        forkJoin({
            cajas: this.cajasService.getAll(0, 50),
            pagos: this.pagosService.getAll(0, 10),
            movimientos: this.movimientosService.getAll(undefined, undefined, 0, 20)
        }).subscribe({
            next: ({ cajas, pagos, movimientos }) => {
                this.cajas.set(Array.isArray(cajas) ? cajas : (cajas?.content ?? []));
                this.pagosRecientes.set(Array.isArray(pagos) ? pagos : (pagos?.content ?? []));
                this.movimientos.set(Array.isArray(movimientos) ? movimientos : (movimientos?.content ?? []));
                this.cargando.set(false);
            },
            error: () => {
                this.error.set('No disponible');
                this.cargando.set(false);
            }
        });
    }

    badgePago(estado: string): string {
        const map: Record<string, string> = {
            PENDING: 'badge badge-warning',
            APPROVED: 'badge badge-accent',
            PAID: 'badge badge-success',
            REJECTED: 'badge badge-error'
        };
        return map[estado] ?? 'badge badge-neutral';
    }

    badgeMovimiento(tipo: string): string {
        const map: Record<string, string> = {
            INGRESO: 'badge badge-success',
            EGRESO: 'badge badge-warning',
            TRANSFERENCIA: 'badge badge-accent'
        };
        return map[tipo] ?? 'badge badge-neutral';
    }
}
