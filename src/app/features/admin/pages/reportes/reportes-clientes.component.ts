import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';

import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { BackendExportService } from '@shared/services/backend-export.service';
import { ButtonComponent } from '@shared/components';

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
    imports: [DatePipe, ButtonComponent],
    templateUrl: './reportes-clientes.component.html',
    styleUrls: ['./reportes-clientes.component.scss'],
})
export class ReportesClientesComponent implements OnInit {
    private readonly http = inject(HttpClient);
    private readonly backendExportService = inject(BackendExportService);
    private readonly destroyRef = inject(DestroyRef);

    usuarios = signal<Usuario[]>([]);
    cargando = signal(false);
    error = signal<string | null>(null);
    pagina = signal(0);
    totalElements = signal(0);
    totalPages = signal(0);

    private busquedaSignal = signal('');

    onSearchTerm(term: string): void {
        this.busquedaSignal.set(term);
    }

    activos = computed(() => this.usuarios().filter(u => u.activo).length);
    pages = computed(() => Array.from({ length: Math.min(this.totalPages(), 5) }, (_, i) => i));

    usuariosFiltrados = computed(() => {
        const q = this.busquedaSignal().toLowerCase();
        if (!q) return this.usuarios();
        return this.usuarios().filter(u =>
            u.username?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q) ||
            (u.nombre + ' ' + u.apellido)?.toLowerCase().includes(q)
        );
    });

    ngOnInit() {
        this.cargar();
    }

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
        this.backendExportService.download({
            url: `${environment.apiUrls.users}/api/users/report/export`,
            filename: `reporte-clientes-${new Date().toISOString().substring(0, 10)}`,
        }, 'csv');
    }

    exportarExcel(): void {
        this.backendExportService.download({
            url: `${environment.apiUrls.users}/api/users/report/export`,
            filename: 'reporte-clientes',
        }, 'xlsx');
    }
}
