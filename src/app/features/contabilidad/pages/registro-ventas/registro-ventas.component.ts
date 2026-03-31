import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { PeriodoService, PeriodoContable } from '../../services/periodo.service';
import { ExportService } from '@shared/services/export.service';
import { environment } from '@env/environment';
import { PaginationComponent, PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';

interface VentaPLE {
    id: string | number;
    fecha: string;
    tipoComprobante: string;
    serie: string;
    numero: string;
    rucCliente: string;
    razonSocial: string;
    baseImponible: number;
    igv: number;
    total: number;
    estado: string;
}

@Component({
    selector: 'app-registro-ventas',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DatePipe, DecimalPipe, FormsModule, PaginationComponent],
    templateUrl: './registro-ventas.component.html'
})
export class RegistroVentasComponent implements OnInit {
    private http = inject(HttpClient);
    private periodoService = inject(PeriodoService);
    private exportService = inject(ExportService);

    periodos = signal<PeriodoContable[]>([]);
    periodoSeleccionado = signal<string>('');
    ventas = signal<VentaPLE[]>([]);
    cargando = signal(false);
    error = signal<string | null>(null);
    readonly fechaDesde = signal('');
    readonly fechaHasta = signal('');

    readonly currentPage = signal(0);
    readonly pageSize = signal(20);
    readonly ventasPaginadas = computed(() => {
        const inicio = this.currentPage() * this.pageSize();
        return this.ventas().slice(inicio, inicio + this.pageSize());
    });
    readonly totalPagesLocal = computed(() => Math.ceil(this.ventas().length / this.pageSize()) || 1);

    readonly totalBase = computed(() =>
        this.ventas().filter(v => v.estado !== 'ANULADO').reduce((s, v) => s + v.baseImponible, 0)
    );
    readonly totalIgv = computed(() =>
        this.ventas().filter(v => v.estado !== 'ANULADO').reduce((s, v) => s + v.igv, 0)
    );
    readonly totalVentas = computed(() =>
        this.ventas().filter(v => v.estado !== 'ANULADO').reduce((s, v) => s + v.total, 0)
    );

    ngOnInit() {
        this.periodoService.listar().subscribe({
            next: (lista) => {
                this.periodos.set(lista);
                const abierto = lista.find(p => p.estado === 'ABIERTO');
                if (abierto) {
                    this.periodoSeleccionado.set(abierto.id);
                    this.cargar();
                }
            },
            error: () => {}
        });
    }

    cambiarPeriodo(id: string) {
        this.periodoSeleccionado.set(id);
        this.ventas.set([]);
    }

    // PLE Libro 14 — formato SUNAT pipe-delimited
    exportarPLE() {
        const periodo = this.periodos().find(p => p.id === this.periodoSeleccionado());
        const periodoStr = periodo ? this.formatPeriodoPLE(periodo.nombre) : '20260300';
        const lines = this.ventas().map((v, i) => {
            const cuo = String(i + 1).padStart(6, '0');
            const correlativo = 'M' + String(i + 1).padStart(3, '0');
            const tipoCpe = v.tipoComprobante === 'FACTURA' ? '01' : v.tipoComprobante === 'BOLETA' ? '03' : '00';
            const fechaFmt = this.formatFechaPLE(v.fecha);
            const tipoDocliente = (v.rucCliente ?? '').length === 11 ? '6' : '1';
            const base = (v.baseImponible ?? 0).toFixed(2);
            const igv = (v.igv ?? 0).toFixed(2);
            const total = (v.total ?? 0).toFixed(2);
            const estado = v.estado === 'ANULADO' ? '8' : '1';
            return [periodoStr, cuo, correlativo, tipoCpe, v.serie ?? '', v.numero ?? '',
                    fechaFmt, '', tipoDocliente, v.rucCliente ?? '', v.razonSocial ?? '',
                    '0.00', base, '0.00', igv, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00',
                    total, '1.000', '', '', '', '', estado, ''].join('|');
        });
        this.exportService.descargarTxt(lines.join('\r\n'), `LE${periodoStr}140100001100_1_1`);
    }

    exportarCSV() {
        const cabecera = ['Fecha', 'Tipo', 'Serie', 'Número', 'RUC/DNI', 'Cliente', 'Base Imp.', 'IGV', 'Total', 'Estado'];
        const filas = this.ventas().map(v => [
            v.fecha, v.tipoComprobante, v.serie, v.numero,
            v.rucCliente, v.razonSocial,
            String(v.baseImponible), String(v.igv), String(v.total), v.estado
        ]);
        this.exportService.exportCsv([cabecera, ...filas], 'registro-ventas');
    }

    onPageChange(event: PaginationChangeEvent) {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
    }

    cargar() {
        if (!this.periodoSeleccionado()) return;
        this.currentPage.set(0);
        this.cargando.set(true);
        this.error.set(null);
        let params = new HttpParams().set('periodoId', this.periodoSeleccionado()).set('size', '200');
        if (this.fechaDesde()) params = params.set('fechaDesde', this.fechaDesde());
        if (this.fechaHasta()) params = params.set('fechaHasta', this.fechaHasta());
        this.http.get<unknown>(`${environment.apiUrls.sales}/api/ventas/registro-ple`, { params }).subscribe({
            next: (data) => {
                const lista = Array.isArray(data) ? data as VentaPLE[]
                    : (data as { content?: VentaPLE[] })?.content ?? [];
                this.ventas.set(lista);
                this.cargando.set(false);
            },
            error: () => {
                this.error.set('Registro de ventas PLE no disponible en este periodo');
                this.cargando.set(false);
            }
        });
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
