import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService, DashboardCompras } from '../../services/dashboard.service';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';

@Component({
    selector: 'app-dashboard-compras',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, RouterLink, PageHeaderComponent],
    templateUrl: './dashboard-compras.component.html'
})
export class DashboardComprasComponent implements OnInit {
    private readonly dashboardService = inject(DashboardService);

    dashboard = signal<DashboardCompras | null>(null);
    loading = signal(false);
    readonly Math = Math;

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: '/admin' },
        { label: 'Compras' }
    ];

    get currentMonth(): string {
        const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
            'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        return `${months[new Date().getMonth()]} ${new Date().getFullYear()}`;
    }

    ngOnInit(): void {
        this.loadDashboard();
    }

    loadDashboard(): void {
        this.loading.set(true);
        this.dashboardService.getDashboardCompras().subscribe({
            next: (data) => {
                this.dashboard.set(data);
                this.loading.set(false);
            },
            error: () => {
                this.dashboard.set({
                    totalComprasMes: 0, ocEmitidas: 0, ocPendientes: 0,
                    ocAprobadas: 0, ocRecibidas: 0, totalProveedores: 0,
                    proveedoresNuevos: 0, comprasTrimestre: 0,
                    topProveedores: [], ultimasOC: []
                });
                this.loading.set(false);
            }
        });
    }

    badgeEstado(estado: string): string {
        const map: Record<string, string> = {
            APROBADA: 'success', PENDIENTE: 'warning', RECIBIDA: 'success',
            BORRADOR: 'neutral', ENVIADA: 'accent', CANCELADA: 'error'
        };
        return map[estado] ?? 'neutral';
    }
}
