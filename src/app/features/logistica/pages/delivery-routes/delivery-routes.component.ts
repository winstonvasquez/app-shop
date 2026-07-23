import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DeliveryRouteService } from '../../services/delivery-route.service';
import { DeliveryRoute } from '../../models/delivery-route.model';
import { ButtonComponent } from '@shared/components';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { DataTableComponent, TableColumn, TableAction, PaginationEvent } from '@shared/ui/tables/data-table/data-table.component';
import { NOTIFICATION_DURATION } from '@shared/constants/ui.constants';

@Component({
    selector: 'app-delivery-routes',
    standalone: true,
    imports: [ButtonComponent, AlertComponent, PageHeaderComponent, DataTableComponent],
    templateUrl: './delivery-routes.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeliveryRoutesComponent implements OnInit {
    private readonly routeService = inject(DeliveryRouteService);

    readonly breadcrumbs: Breadcrumb[] = [
        { label: 'Inicio',    url: '/admin/dashboard' },
        { label: 'Logística', url: '/logistica/dashboard' },
        { label: 'Rutas de Entrega' }
    ];

    routes = signal<DeliveryRoute[]>([]);
    loading = signal(false);
    actionId = signal<string | null>(null);
    error = signal<string | null>(null);
    successMsg = signal<string | null>(null);

    currentPage = signal(0);
    pageSize = signal(20);
    totalElements = signal(0);
    totalPages = signal(0);

    readonly columns: TableColumn<DeliveryRoute>[] = [
        {
            key: 'id', label: 'ID', html: true,
            render: r => `<span class="font-mono text-sm" style="color:var(--color-text-muted)">${r.id.slice(0, 8)}…</span>`
        },
        {
            key: 'createdAt', label: 'Fecha Creación',
            render: r => r.createdAt ? new Date(r.createdAt).toLocaleDateString('es-PE') + ' ' + new Date(r.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—'
        },
        { key: 'driverId', label: 'Conductor', render: r => r.driverId ?? '—' },
        {
            key: 'status', label: 'Estado', html: true,
            render: r => `<span class="badge ${this.statusBadgeClass(r.status)}">${this.statusLabel(r.status)}</span>`
        },
        { key: 'stops', label: 'Paradas', align: 'right', render: r => String(r.stops?.length ?? 0) },
        {
            key: 'startedAt', label: 'Iniciado',
            render: r => r.startedAt ? new Date(r.startedAt).toLocaleDateString('es-PE') : '—'
        },
        {
            key: 'completedAt', label: 'Completado',
            render: r => r.completedAt ? new Date(r.completedAt).toLocaleDateString('es-PE') : '—'
        },
    ];

    readonly actions: TableAction<DeliveryRoute>[] = [
        {
            label: 'Iniciar', icon: 'check', class: 'btn-view',
            show: r => r.status === 'PLANNED',
            onClick: r => this.startRoute(r.id)
        },
        {
            label: 'Completar', icon: 'check', class: 'btn-view',
            show: r => r.status === 'IN_PROGRESS',
            onClick: r => this.completeRoute(r.id)
        },
    ];

    ngOnInit(): void {
        this.loadRoutes();
    }

    onPageChange(event: PaginationEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadRoutes();
    }

    loadRoutes(): void {
        this.loading.set(true);
        this.error.set(null);
        this.routeService.list(this.currentPage(), this.pageSize()).subscribe({
            next: (page) => {
                this.routes.set(page.content);
                this.totalElements.set(page.totalElements);
                this.totalPages.set(page.totalPages);
                this.loading.set(false);
            },
            error: () => {
                this.error.set('Error al cargar las rutas de entrega');
                this.loading.set(false);
            }
        });
    }

    startRoute(id: string): void {
        this.actionId.set(id);
        this.routeService.start(id).subscribe({
            next: (updated) => {
                this.routes.update(list => list.map(r => r.id === id ? updated : r));
                this.actionId.set(null);
                this.showSuccess('Ruta iniciada');
            },
            error: () => {
                this.error.set('Error al iniciar la ruta');
                this.actionId.set(null);
            }
        });
    }

    completeRoute(id: string): void {
        this.actionId.set(id);
        this.routeService.complete(id).subscribe({
            next: (updated) => {
                this.routes.update(list => list.map(r => r.id === id ? updated : r));
                this.actionId.set(null);
                this.showSuccess('Ruta completada');
            },
            error: () => {
                this.error.set('Error al completar la ruta');
                this.actionId.set(null);
            }
        });
    }

    private showSuccess(msg: string): void {
        this.successMsg.set(msg);
        setTimeout(() => this.successMsg.set(null), NOTIFICATION_DURATION.medium);
    }

    statusBadgeClass(status: string): string {
        switch (status) {
            case 'PLANNED': return 'badge-neutral';
            case 'IN_PROGRESS': return 'badge-warning';
            case 'COMPLETED': return 'badge-success';
            case 'CANCELLED': return 'badge-error';
            default: return 'badge-neutral';
        }
    }

    statusLabel(status: string): string {
        switch (status) {
            case 'PLANNED': return 'Planificado';
            case 'IN_PROGRESS': return 'En Ruta';
            case 'COMPLETED': return 'Completado';
            case 'CANCELLED': return 'Cancelado';
            default: return status;
        }
    }
}
