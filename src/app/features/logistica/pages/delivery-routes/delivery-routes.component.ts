import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DeliveryRouteService } from '../../services/delivery-route.service';
import { DeliveryRoute } from '../../models/delivery-route.model';
import { ButtonComponent } from '@shared/components';

@Component({
    selector: 'app-delivery-routes',
    standalone: true,
    imports: [DatePipe, ButtonComponent],
    templateUrl: './delivery-routes.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeliveryRoutesComponent implements OnInit {
    private readonly routeService = inject(DeliveryRouteService);

    routes = signal<DeliveryRoute[]>([]);
    loading = signal(false);
    actionId = signal<string | null>(null);
    error = signal<string | null>(null);
    successMsg = signal<string | null>(null);

    ngOnInit(): void {
        this.loadRoutes();
    }

    loadRoutes(): void {
        this.loading.set(true);
        this.error.set(null);
        this.routeService.list().subscribe({
            next: (page) => {
                this.routes.set(page.content);
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
        setTimeout(() => this.successMsg.set(null), 3000);
    }

    statusClass(status: string): string {
        switch (status) {
            case 'PLANNED': return 'bg-surface-raised text-subtle';
            case 'IN_PROGRESS': return 'bg-warning/10 text-warning';
            case 'COMPLETED': return 'bg-success/10 text-success';
            case 'CANCELLED': return 'bg-error/10 text-error';
            default: return 'bg-surface-raised text-subtle';
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

    totalDistance(route: DeliveryRoute): number {
        return route.stops?.length ?? 0;
    }
}
