import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MovimientosFinancierosService } from '../../services/movimientos-financieros.service';
import { FinancialMovement } from '../../models/tesoreria.model';
import { DataTableComponent, TableColumn } from '@shared/ui/tables/data-table/data-table.component';

@Component({
    selector: 'app-flujo-caja',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DecimalPipe, FormsModule, DataTableComponent],
    templateUrl: './flujo-caja.component.html'
})
export class FlujoCajaComponent implements OnInit {
    private movService = inject(MovimientosFinancierosService);

    movimientos = signal<FinancialMovement[]>([]);
    flujoCajaNeto = signal<number>(0);
    cargando = signal(false);

    fechaInicio = '';
    fechaFin = '';

    columns: TableColumn<FinancialMovement>[] = [
        { key: 'fecha', label: 'Fecha',
          render: (row) => row.fecha ? new Date(row.fecha).toLocaleDateString('es-PE') : '-' },
        { key: 'tipoMovimiento', label: 'Tipo', html: true,
          render: (row) => `<span class="${this.badgeMovimiento(row.tipoMovimiento)}">${row.tipoMovimiento}</span>` },
        { key: 'origen', label: 'Origen' },
        { key: 'descripcion', label: 'Descripción',
          render: (row) => row.descripcion ?? '-' },
        { key: 'monto', label: 'Monto', align: 'right',
          render: (row) => {
              const sign = row.tipoMovimiento === 'INGRESO' ? '+' : row.tipoMovimiento === 'EGRESO' ? '-' : '';
              return `${sign}S/ ${(row.monto ?? 0).toFixed(2)}`;
          }
        },
    ];

    ingresos = computed(() =>
        this.movimientos()
            .filter(m => m.tipoMovimiento === 'INGRESO')
            .reduce((s, m) => s + (m.monto ?? 0), 0)
    );

    egresos = computed(() =>
        this.movimientos()
            .filter(m => m.tipoMovimiento === 'EGRESO')
            .reduce((s, m) => s + (m.monto ?? 0), 0)
    );

    ngOnInit(): void {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        this.fechaFin = today.toISOString().split('T')[0];
        this.fechaInicio = firstDay.toISOString().split('T')[0];
        this.loadData();
    }

    loadData(): void {
        this.cargando.set(true);

        this.movService.getFlujoCaja(this.fechaInicio, this.fechaFin).subscribe({
            next: (val) => this.flujoCajaNeto.set(val),
            error: () => {}
        });

        this.movService.getAll(this.fechaInicio, this.fechaFin).subscribe({
            next: (res) => {
                this.movimientos.set(Array.isArray(res) ? res : (res?.content ?? []));
                this.cargando.set(false);
            },
            error: () => this.cargando.set(false)
        });
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
