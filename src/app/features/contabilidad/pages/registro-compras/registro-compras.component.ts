import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { PeriodoService, PeriodoContable } from '../../services/periodo.service';
import { OrdenCompraService } from '../../../compras/services/orden-compra.service';
import { PleService } from '../../services/ple.service';
import { OrdenCompra } from '../../../compras/models/orden-compra.model';
import { ExportService } from '@shared/services/export.service';
import { DataTableComponent, TableColumn } from '@shared/ui/tables/data-table/data-table.component';
import { ButtonComponent } from '@shared/components';

@Component({
    selector: 'app-registro-compras',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DecimalPipe, ReactiveFormsModule, DataTableComponent, ButtonComponent],
    templateUrl: './registro-compras.component.html'
})
export class RegistroComprasComponent implements OnInit {
    private periodoService = inject(PeriodoService);
    private ordenCompraService = inject(OrdenCompraService);
    private exportService = inject(ExportService);
    private pleService = inject(PleService);
    private fb = inject(FormBuilder);

    filterForm = this.fb.group({
        estadoFiltro: [''],
        rucEmpresa: [''],
    });

    periodos = signal<PeriodoContable[]>([]);
    periodoSeleccionado = signal<string>('');
    ordenes = signal<OrdenCompra[]>([]);
    cargando = signal(false);
    error = signal<string | null>(null);
    readonly descargandoPLE = signal(false);

    readonly estadoOptions = [
        { value: 'APROBADA',  label: 'Aprobadas' },
        { value: 'PENDIENTE', label: 'Pendientes' },
        { value: 'RECIBIDA',  label: 'Recibidas' },
        { value: 'CANCELADA', label: 'Canceladas' },
    ];

    columns: TableColumn<OrdenCompra>[] = [
        { key: 'codigo', label: 'Código' },
        { key: 'fechaEmision', label: 'Fecha',
          render: (row) => row.fechaEmision
            ? new Date(row.fechaEmision).toLocaleDateString('es-PE') : '-' },
        { key: 'proveedorNombre', label: 'Proveedor',
          render: (row) => (row.proveedorNombre ?? String(row.proveedorId ?? '')) },
        { key: 'subtotal', label: 'Subtotal', align: 'right',
          render: (row) => `S/ ${(row.subtotal ?? 0).toFixed(2)}` },
        { key: 'igv', label: 'IGV', align: 'right',
          render: (row) => `S/ ${(row.igv ?? 0).toFixed(2)}` },
        { key: 'total', label: 'Total', align: 'right',
          render: (row) => `S/ ${(row.total ?? 0).toFixed(2)}` },
        { key: 'estado', label: 'Estado', html: true,
          render: (row) => `<span class="${this.badgeEstado(row.estado)}">${row.estado}</span>` },
    ];

    readonly ordenesActivas = computed(() => this.ordenes().filter(o => o.estado !== 'CANCELADA'));
    readonly totalBase = computed(() => this.ordenesActivas().reduce((s, o) => s + (o.subtotal ?? 0), 0));
    readonly totalIgv = computed(() => this.ordenesActivas().reduce((s, o) => s + (o.igv ?? 0), 0));
    readonly totalCompras = computed(() => this.ordenesActivas().reduce((s, o) => s + (o.total ?? 0), 0));

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
        this.ordenes.set([]);
    }

    cargar() {
        if (!this.periodoSeleccionado()) return;
        this.cargando.set(true);
        this.error.set(null);
        const estadoFiltro = this.filterForm.value.estadoFiltro || undefined;
        this.ordenCompraService.getOrdenes(0, 200, estadoFiltro).subscribe({
            next: (page) => {
                this.ordenes.set(page.content ?? []);
                this.cargando.set(false);
            },
            error: () => {
                this.error.set('Error al cargar las órdenes de compra');
                this.cargando.set(false);
            }
        });
    }

    badgeEstado(estado: string): string {
        const map: Record<string, string> = {
            'APROBADA': 'badge-success',
            'RECIBIDA': 'badge-accent',
            'PENDIENTE': 'badge-warning',
            'CANCELADA': 'badge-error'
        };
        return `badge ${map[estado] ?? 'badge-neutral'}`;
    }

    descargarPLE08() {
        const periodoId = this.periodoSeleccionado();
        const ruc = this.filterForm.value.rucEmpresa ?? '';
        if (!periodoId || ruc.length !== 11) return;
        this.descargandoPLE.set(true);
        this.pleService.descargarLibro08(periodoId, ruc).subscribe({
            next: resp => {
                const blob = resp.body!;
                const cd = resp.headers.get('Content-Disposition') ?? '';
                const filename = cd.match(/filename="?([^"]+)"?/)?.[1] ?? `PLE-08-${periodoId}.txt`;
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = filename; a.click();
                URL.revokeObjectURL(url);
                this.descargandoPLE.set(false);
            },
            error: () => this.descargandoPLE.set(false),
        });
    }

    // PLE Libro 8 — formato SUNAT pipe-delimited (generación local)
    exportarPLE() {
        const periodo = this.periodos().find(p => p.id === this.periodoSeleccionado());
        const periodoStr = periodo ? this.formatPeriodoPLE(periodo.nombre) : '20260300';
        const lines = this.ordenes().map((o, i) => {
            const cuo = String(i + 1).padStart(6, '0');
            const fechaFmt = this.formatFechaPLE(o.fechaEmision);
            const tipoCpe = '01';
            const serie = o.codigo?.split('-')[0] ?? 'F001';
            const numero = o.codigo?.split('-').slice(1).join('') ?? String(i + 1).padStart(8, '0');
            const base = (o.subtotal ?? 0).toFixed(2);
            const igv = (o.igv ?? 0).toFixed(2);
            const total = (o.total ?? 0).toFixed(2);
            const proveedor = o.proveedorNombre ?? String(o.proveedorId ?? '');
            const estado = o.estado === 'CANCELADA' ? '8' : '1';
            return [periodoStr, cuo, fechaFmt, '', tipoCpe, serie, numero,
                    '6', '', proveedor,
                    base, igv, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00',
                    total, 'PEN', '1.000', '', '', '', '0', '0.00', '0.00',
                    estado, '0', '0'].join('|');
        });
        this.exportService.descargarTxt(lines.join('\r\n'), `LE${periodoStr}080100001100_1_1`);
    }

    exportarCSV() {
        const cabecera = ['Código', 'Fecha', 'Proveedor', 'Subtotal', 'IGV', 'Total', 'Estado'];
        const filas = this.ordenes().map(o => [
            o.codigo, o.fechaEmision,
            o.proveedorNombre ?? String(o.proveedorId ?? ''),
            String(o.subtotal ?? 0), String(o.igv ?? 0), String(o.total ?? 0), o.estado
        ]);
        this.exportService.exportCsv([cabecera, ...filas], 'registro-compras');
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
