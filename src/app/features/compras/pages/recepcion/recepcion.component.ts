import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RecepcionService, RecepcionPage } from '../../services/recepcion.service';
import { Recepcion, RecepcionItem } from '../../models/orden-compra.model';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';
import { PaginationComponent, PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { LoadingSpinnerComponent } from '@shared/ui/feedback/loading-spinner/loading-spinner.component';

@Component({
    selector: 'app-recepcion',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        FormsModule,
        DataTableComponent,
        PaginationComponent,
        DrawerComponent,
        PageHeaderComponent,
        AlertComponent,
        LoadingSpinnerComponent
    ],
    templateUrl: './recepcion.component.html'
})
export class RecepcionComponent implements OnInit {
    private readonly recepcionService = inject(RecepcionService);

    recepciones = signal<Recepcion[]>([]);
    selectedRecepcion = signal<Recepcion | null>(null);

    cargando = signal(false);
    loadingDetail = signal(false);
    error = signal<string | null>(null);

    estadoFiltro = signal('');
    showDetail = signal(false);

    // Pagination
    currentPage = signal(0);
    pageSize = signal(10);
    totalElements = signal(0);
    totalPages = signal(0);

    hasRecepciones = computed(() => this.recepciones().length > 0);
    isEmpty = computed(() => !this.cargando() && !this.hasRecepciones());

    readonly estadoOptions = [
        { value: 'PENDIENTE', label: 'Pendiente' },
        { value: 'CONFORME', label: 'Conforme' },
        { value: 'DIFERENCIA', label: 'Con Diferencia' }
    ];

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: '/admin' },
        { label: 'Compras', url: '/admin/compras/dashboard' },
        { label: 'Recepción Mercadería' }
    ];

    columns: TableColumn<Recepcion>[] = [
        {
            key: 'id', label: 'Recepción', width: '130px',
            render: (row) => `REC-${(row.id ?? '').toString().slice(0, 8).toUpperCase()}`
        },
        {
            key: 'ordenCompraCodigo', label: 'OC Referencia',
            render: (row) => row.ordenCompraCodigo ?? '—'
        },
        {
            key: 'fechaRecepcion', label: 'Fecha',
            render: (row) => row.fechaRecepcion
                ? new Date(row.fechaRecepcion).toLocaleDateString('es-PE') : '—'
        },
        {
            key: 'numeroGuia', label: 'Guía Remisión',
            render: (row) => row.numeroGuia ?? '—'
        },
        {
            key: 'estado', label: 'Estado', html: true,
            render: (row) => `<span class="badge badge-${this.badgeEstado(row.estado)}">${row.estado}</span>`
        }
    ];

    actions: TableAction<Recepcion>[] = [
        {
            label: 'Ver', icon: '👁️', class: 'btn-view',
            onClick: (row) => this.openDetail(row.id!)
        }
    ];

    ngOnInit(): void {
        this.loadRecepciones();
    }

    loadRecepciones(): void {
        this.cargando.set(true);
        this.error.set(null);
        this.recepcionService.getRecepciones(
            this.currentPage(),
            this.pageSize(),
            this.estadoFiltro() || undefined
        ).subscribe({
            next: (res: RecepcionPage) => {
                this.recepciones.set(res.content);
                this.totalElements.set(res.totalElements);
                this.totalPages.set(res.totalPages);
                this.cargando.set(false);
            },
            error: () => {
                this.error.set('No se pudieron cargar las recepciones.');
                this.cargando.set(false);
            }
        });
    }

    onFilterEstado(event: Event): void {
        this.estadoFiltro.set((event.target as HTMLSelectElement).value);
        this.currentPage.set(0);
        this.loadRecepciones();
    }

    onPaginationChange(event: PaginationChangeEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadRecepciones();
    }

    openDetail(id: string): void {
        this.loadingDetail.set(true);
        this.showDetail.set(true);
        this.selectedRecepcion.set(null);
        this.recepcionService.getRecepcionById(id).subscribe({
            next: (rec) => {
                this.selectedRecepcion.set(rec);
                this.loadingDetail.set(false);
            },
            error: (err: Error) => {
                this.error.set(err.message);
                this.loadingDetail.set(false);
                this.showDetail.set(false);
            }
        });
    }

    closeDetail(): void {
        this.showDetail.set(false);
        this.selectedRecepcion.set(null);
    }

    confirmarRecepcion(): void {
        const rec = this.selectedRecepcion();
        if (!rec) return;
        this.loadingDetail.set(true);
        this.recepcionService.confirmarRecepcion(rec.id!).subscribe({
            next: (updated) => {
                this.selectedRecepcion.set(updated);
                this.recepciones.update(list =>
                    list.map(r => r.id === updated.id ? { ...r, estado: updated.estado } : r)
                );
                this.loadingDetail.set(false);
            },
            error: (err: Error) => {
                this.error.set(err.message);
                this.loadingDetail.set(false);
            }
        });
    }

    badgeEstado(estado: string): string {
        const map: Record<string, string> = {
            PENDIENTE: 'warning',
            CONFORME: 'success',
            CON_DIFERENCIAS: 'error',
            DIFERENCIA: 'error',
            COMPLETADA: 'success'
        };
        return map[estado] ?? 'neutral';
    }
}
