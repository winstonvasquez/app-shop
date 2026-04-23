import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AsientoService } from '../../services/asiento.service';
import { CuentaService, CuentaContable } from '../../services/cuenta.service';
import { PeriodoService, PeriodoContable } from '../../services/periodo.service';
import { PaginationComponent, PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { ButtonComponent } from '@shared/components';

interface MayorMovimiento {
    fecha: string;
    codigoAsiento: string;
    glosa: string;
    debe: number;
    haber: number;
    saldo: number;
}

@Component({
    selector: 'app-libro-mayor',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DatePipe, DecimalPipe, FormsModule, PaginationComponent, ButtonComponent],
    templateUrl: './libro-mayor.component.html'
})
export class LibroMayorComponent implements OnInit {
    private asientoService = inject(AsientoService);
    private cuentaService = inject(CuentaService);
    private periodoService = inject(PeriodoService);

    cuentas = signal<CuentaContable[]>([]);
    periodos = signal<PeriodoContable[]>([]);
    cuentaSeleccionada = signal<string>('');
    periodoSeleccionado = signal<string>('');
    cuentaInfo = signal<CuentaContable | null>(null);
    movimientos = signal<MayorMovimiento[]>([]);
    cargando = signal(false);
    error = signal<string | null>(null);

    readonly currentPage = signal(0);
    readonly pageSize = signal(20);
    readonly movimientosPaginados = computed(() => {
        const inicio = this.currentPage() * this.pageSize();
        return this.movimientos().slice(inicio, inicio + this.pageSize());
    });
    readonly totalPagesLocal = computed(() => Math.ceil(this.movimientos().length / this.pageSize()) || 1);

    readonly totalDebe = computed(() => this.movimientos().reduce((s, m) => s + m.debe, 0));
    readonly totalHaber = computed(() => this.movimientos().reduce((s, m) => s + m.haber, 0));

    ngOnInit() {
        this.cuentaService.listarTodas().subscribe({
            next: (lista) => this.cuentas.set(lista.filter(c => c.aceptaMovimiento)),
            error: () => {}
        });
        this.periodoService.listar().subscribe({
            next: (lista) => {
                this.periodos.set(lista);
                const abierto = lista.find(p => p.estado === 'ABIERTO');
                if (abierto) this.periodoSeleccionado.set(abierto.id);
            },
            error: () => {}
        });
    }

    cambiarCuenta(id: string) {
        this.cuentaSeleccionada.set(id);
        this.cuentaInfo.set(this.cuentas().find(c => c.id === id) ?? null);
        this.movimientos.set([]);
    }

    cambiarPeriodo(id: string) {
        this.periodoSeleccionado.set(id);
        this.movimientos.set([]);
    }

    onPageChange(event: PaginationChangeEvent) {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
    }

    cargarMayor() {
        const periodoId = this.periodoSeleccionado();
        const cuentaId = this.cuentaSeleccionada();
        if (!periodoId || !cuentaId) return;
        this.currentPage.set(0);
        this.cargando.set(true);
        this.error.set(null);
        this.asientoService.obtenerLibroMayor(periodoId, cuentaId).subscribe({
            next: (data: unknown) => {
                const lista = Array.isArray(data) ? data as MayorMovimiento[] : [];
                this.movimientos.set(lista);
                this.cargando.set(false);
            },
            error: () => {
                this.error.set('Error al cargar el libro mayor');
                this.cargando.set(false);
            }
        });
    }
}
