import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AsientoService } from '../../services/asiento.service';
import { PeriodoService, PeriodoContable } from '../../services/periodo.service';
import { ExportService } from '@shared/services/export.service';
import { PaginationComponent, PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { ButtonComponent } from '@shared/components';

interface LibroDiarioLinea {
    fecha: string;
    codigoAsiento: string;
    cuentaCodigo: string;
    cuentaNombre: string;
    descripcion: string;
    debe: number;
    haber: number;
}

@Component({
    selector: 'app-libro-diario',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DatePipe, DecimalPipe, FormsModule, PaginationComponent, ButtonComponent],
    templateUrl: './libro-diario.component.html'
})
export class LibroDiarioComponent implements OnInit {
    private asientoService = inject(AsientoService);
    private periodoService = inject(PeriodoService);
    private exportService = inject(ExportService);

    periodos = signal<PeriodoContable[]>([]);
    periodoSeleccionado = signal<string>('');
    lineas = signal<LibroDiarioLinea[]>([]);
    cargando = signal(false);
    error = signal<string | null>(null);
    readonly fechaDesde = signal('');
    readonly fechaHasta = signal('');

    readonly currentPage = signal(0);
    readonly pageSize = signal(20);
    readonly lineasPaginadas = computed(() => {
        const inicio = this.currentPage() * this.pageSize();
        return this.lineas().slice(inicio, inicio + this.pageSize());
    });
    readonly totalPagesLocal = computed(() => Math.ceil(this.lineas().length / this.pageSize()) || 1);

    readonly totalDebe = computed(() => this.lineas().reduce((s, l) => s + l.debe, 0));
    readonly totalHaber = computed(() => this.lineas().reduce((s, l) => s + l.haber, 0));
    readonly cuadra = computed(() => Math.abs(this.totalDebe() - this.totalHaber()) < 0.01);

    ngOnInit() {
        this.cargarPeriodos();
    }

    private cargarPeriodos() {
        this.periodoService.listar().subscribe({
            next: (lista) => {
                this.periodos.set(lista);
                const abierto = lista.find(p => p.estado === 'ABIERTO');
                if (abierto) {
                    this.periodoSeleccionado.set(abierto.id);
                    this.cargarLibro();
                }
            },
            error: () => this.error.set('No se pudieron cargar los periodos')
        });
    }

    cambiarPeriodo(id: string) {
        this.periodoSeleccionado.set(id);
        if (id) this.cargarLibro();
        else this.lineas.set([]);
    }

    onPageChange(event: PaginationChangeEvent) {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
    }

    cargarLibro() {
        const periodoId = this.periodoSeleccionado();
        if (!periodoId) return;
        this.currentPage.set(0);
        this.cargando.set(true);
        this.error.set(null);
        this.asientoService.obtenerLibroDiario(periodoId, this.fechaDesde(), this.fechaHasta()).subscribe({
            next: (data: unknown) => {
                const lista = Array.isArray(data) ? data as LibroDiarioLinea[] : [];
                this.lineas.set(lista);
                this.cargando.set(false);
            },
            error: () => {
                this.error.set('Error al cargar el libro diario');
                this.cargando.set(false);
            }
        });
    }

    exportarPLE() {
        const periodo = this.periodos().find(p => p.id === this.periodoSeleccionado());
        const periodoStr = periodo ? this.formatPeriodoPLE(periodo.nombre) : '20260300';
        const lines = this.lineas().map((l, i) => {
            const cuo = String(i + 1).padStart(6, '0');
            const fechaFmt = this.formatFechaPLE(l.fecha);
            return [periodoStr, cuo, fechaFmt, l.codigoAsiento,
                    l.cuentaCodigo, l.descripcion,
                    (l.debe ?? 0).toFixed(2), (l.haber ?? 0).toFixed(2)].join('|');
        });
        this.exportService.descargarTxt(lines.join('\r\n'), `LE${periodoStr}030100001100_1_1`);
    }

    exportarCSV() {
        const cabecera = ['Fecha', 'N° Asiento', 'Cta. Código', 'Cta. Nombre', 'Descripción', 'Debe', 'Haber'];
        const filas = this.lineas().map(l => [
            l.fecha, l.codigoAsiento, l.cuentaCodigo, l.cuentaNombre,
            l.descripcion, String(l.debe), String(l.haber)
        ]);
        this.exportService.exportCsv([cabecera, ...filas], 'libro-diario');
    }

    private formatPeriodoPLE(nombre: string): string {
        const meses: Record<string, string> = {
            enero: '01', febrero: '02', marzo: '03', abril: '04',
            mayo: '05', junio: '06', julio: '07', agosto: '08',
            septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12'
        };
        const parts = nombre.toLowerCase().split(' ');
        const mes = meses[parts[0]] ?? '01';
        const anio = parts[1] ?? '2026';
        return `${anio}${mes}00`;
    }

    private formatFechaPLE(fecha: string): string {
        if (!fecha) return '';
        try {
            const d = new Date(fecha);
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            return `${dd}/${mm}/${d.getFullYear()}`;
        } catch { return fecha; }
    }
}
