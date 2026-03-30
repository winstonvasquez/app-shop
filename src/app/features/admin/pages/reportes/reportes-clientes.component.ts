import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { ExportService } from '../../../../shared/services/export.service';

interface Usuario {
    id: number;
    username: string;
    email: string;
    nombre?: string;
    apellido?: string;
    activo: boolean;
    fechaCreacion?: string;
    rol?: string;
}

interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}

@Component({
    selector: 'app-reportes-clientes',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DatePipe, FormsModule],
    templateUrl: './reportes-clientes.component.html',
    styleUrls: ['./reportes-clientes.component.scss'],
})
export class ReportesClientesComponent implements OnInit {
    private readonly http = inject(HttpClient);
    private readonly exportService = inject(ExportService);

    usuarios = signal<Usuario[]>([]);
    cargando = signal(false);
    error = signal<string | null>(null);
    busqueda = '';
    pagina = signal(0);
    totalElements = signal(0);
    totalPages = signal(0);

    activos = computed(() => this.usuarios().filter(u => u.activo).length);
    pages = computed(() => Array.from({ length: Math.min(this.totalPages(), 5) }, (_, i) => i));

    usuariosFiltrados = computed(() => {
        const q = this.busqueda.toLowerCase();
        if (!q) return this.usuarios();
        return this.usuarios().filter(u =>
            u.username?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q) ||
            (u.nombre + ' ' + u.apellido)?.toLowerCase().includes(q)
        );
    });

    ngOnInit() { this.cargar(); }

    cargar() {
        this.cargando.set(true);
        this.error.set(null);
        const url = `${environment.apiUrls.users}/api/users?page=${this.pagina()}&size=20&sort=id,desc`;
        this.http.get<PageResponse<Usuario>>(url).subscribe({
            next: (page) => {
                this.usuarios.set(page.content);
                this.totalElements.set(page.totalElements);
                this.totalPages.set(page.totalPages);
                this.cargando.set(false);
            },
            error: () => {
                this.error.set('No disponible');
                this.cargando.set(false);
            }
        });
    }

    irPagina(p: number) {
        this.pagina.set(p);
        this.cargar();
    }

    imprimir(): void {
        window.print();
    }

    onExportarCsv(): void {
        const cabecera = ['ID', 'Usuario', 'Email', 'Nombre', 'Apellido', 'Estado', 'Fecha Registro'];
        const filas = this.usuarios().map(u => [
            String(u.id),
            u.username ?? '',
            u.email ?? '',
            u.nombre ?? '',
            u.apellido ?? '',
            u.activo ? 'ACTIVO' : 'INACTIVO',
            u.fechaCreacion ?? '',
        ]);
        this.exportService.exportCsv([cabecera, ...filas], `reporte-clientes-${new Date().toISOString().substring(0, 10)}`);
    }

    exportarExcel(): void {
        const cabecera = ['ID', 'Usuario', 'Email', 'Nombre', 'Apellido', 'Estado', 'Fecha Registro'];
        const filas = this.usuarios().map(u => [
            String(u.id),
            u.username ?? '',
            u.email ?? '',
            u.nombre ?? '',
            u.apellido ?? '',
            u.activo ? 'ACTIVO' : 'INACTIVO',
            u.fechaCreacion ?? '',
        ]);
        this.exportService.exportExcel(cabecera, filas, 'reporte-clientes');
    }
}
