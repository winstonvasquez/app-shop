import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { ExportService } from '../../../../shared/services/export.service';

interface EmpleadoReporte {
    id: number;
    codigoEmpleado: string;
    nombres: string;
    apellidos: string;
    documentoIdentidad: string;
    cargo?: string;
    area?: string;
    email?: string;
    estado: string;
    fechaIngreso: string;
}

interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}

@Component({
    selector: 'app-reportes-rrhh',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DatePipe, FormsModule],
    templateUrl: './reportes-rrhh.component.html',
    styleUrls: ['./reportes-rrhh.component.scss'],
})
export class ReportesRrhhComponent implements OnInit {
    private readonly http = inject(HttpClient);
    private readonly exportService = inject(ExportService);

    empleados = signal<EmpleadoReporte[]>([]);
    cargando = signal(false);
    error = signal<string | null>(null);
    busqueda = '';
    filtroArea = '';

    totalActivos = computed(() => this.empleados().filter(e => e.estado === 'ACTIVO').length);
    totalInactivos = computed(() => this.empleados().filter(e => e.estado !== 'ACTIVO').length);
    areasDistintas = computed(() => new Set(this.empleados().map(e => e.area).filter(Boolean)).size);

    areasUnicas = computed(() => {
        const set = new Set<string>();
        for (const e of this.empleados()) {
            if (e.area) set.add(e.area);
        }
        return Array.from(set).sort();
    });

    empleadosFiltrados = computed(() => {
        let lista = this.empleados();
        const q = this.busqueda.toLowerCase();
        if (q) {
            lista = lista.filter(e =>
                e.nombres?.toLowerCase().includes(q) ||
                e.apellidos?.toLowerCase().includes(q) ||
                e.codigoEmpleado?.toLowerCase().includes(q) ||
                e.area?.toLowerCase().includes(q)
            );
        }
        if (this.filtroArea) {
            lista = lista.filter(e => e.area === this.filtroArea);
        }
        return lista;
    });

    ngOnInit() { this.cargar(); }

    cargar() {
        this.cargando.set(true);
        this.error.set(null);
        const url = `${environment.apiUrls.hr}/hr/api/employees?size=100&estado=ACTIVO`;
        this.http.get<PageResponse<EmpleadoReporte>>(url).subscribe({
            next: (page) => {
                this.empleados.set(page.content);
                this.cargando.set(false);
            },
            error: () => {
                this.error.set('No disponible');
                this.cargando.set(false);
            }
        });
    }

    imprimir(): void {
        window.print();
    }

    onExportarCsv(): void {
        const cabecera = ['Codigo', 'Nombres', 'Apellidos', 'DNI', 'Cargo', 'Area', 'Estado', 'Fecha Ingreso'];
        const filas = this.empleados().map(e => [
            e.codigoEmpleado ?? '',
            e.nombres ?? '',
            e.apellidos ?? '',
            e.documentoIdentidad ?? '',
            e.cargo ?? '',
            e.area ?? '',
            e.estado ?? '',
            e.fechaIngreso ?? '',
        ]);
        this.exportService.exportCsv([cabecera, ...filas], `reporte-rrhh-${new Date().toISOString().substring(0, 10)}`);
    }

    exportarExcel(): void {
        const cabecera = ['Codigo', 'Nombres', 'Apellidos', 'DNI', 'Cargo', 'Area', 'Estado', 'Fecha Ingreso'];
        const filas = this.empleados().map(e => [
            e.codigoEmpleado ?? '',
            e.nombres ?? '',
            e.apellidos ?? '',
            e.documentoIdentidad ?? '',
            e.cargo ?? '',
            e.area ?? '',
            e.estado ?? '',
            e.fechaIngreso ?? '',
        ]);
        this.exportService.exportExcel(cabecera, filas, 'reporte-rrhh');
    }
}
