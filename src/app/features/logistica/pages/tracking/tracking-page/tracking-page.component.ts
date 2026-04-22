import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ShipmentService, TrackingInfoResponse, ShipmentResponse } from '../../../services/shipment.service';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';

@Component({
    selector: 'app-tracking-page',
    standalone: true,
    imports: [DatePipe, ReactiveFormsModule, DataTableComponent, PageHeaderComponent],
    templateUrl: './tracking-page.component.html',
    styleUrls: ['./tracking-page.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TrackingPageComponent {
    private readonly shipmentService = inject(ShipmentService);
    private readonly fb = inject(FormBuilder);

    breadcrumbs: Breadcrumb[] = [
        { label: 'Inicio',    url: '/admin/dashboard' },
        { label: 'Logística', url: '/logistica/dashboard' },
        { label: 'Tracking' }
    ];

    columns: TableColumn<ShipmentResponse>[] = [
        { key: 'trackingNumber', label: 'Tracking' },
        { key: 'originAddress', label: 'Origen', render: (row) => row.originAddress || '-' },
        { key: 'destinationAddress', label: 'Destino', render: (row) => row.destinationAddress || '-' },
        { key: 'status', label: 'Estado', html: true,
          render: (row) => `<span class="${this.statusBadge(row.status)}">${row.status}</span>` },
        { key: 'createdAt', label: 'Creado',
          render: (row) => row.createdAt
            ? new Date(row.createdAt).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
            : '-' },
    ];

    envioActions: TableAction<ShipmentResponse>[] = [
        {
            label: 'Ver tracking', icon: '📍', class: 'btn-view',
            onClick: (row) => this.rastrearDesdeTabla(row.trackingNumber)
        }
    ];

    searchForm = this.fb.group({
        trackingInput: ['']
    });

    readonly trackingInfo  = signal<TrackingInfoResponse | null>(null);
    readonly envios        = signal<ShipmentResponse[]>([]);
    readonly buscando      = signal(false);
    readonly loadingEnvios = signal(false);
    readonly errorMsg      = signal('');

    constructor() {
        this.cargarEnvios();
    }

    cargarEnvios() {
        this.loadingEnvios.set(true);
        this.shipmentService.getShipments().subscribe({
            next: (data) => {
                this.envios.set(data);
                this.loadingEnvios.set(false);
            },
            error: () => {
                this.envios.set([]);
                this.loadingEnvios.set(false);
            }
        });
    }

    buscarTracking() {
        const numero = (this.searchForm.value.trackingInput ?? '').trim();
        if (!numero) return;
        this.buscando.set(true);
        this.errorMsg.set('');
        this.trackingInfo.set(null);
        this.shipmentService.trackShipment(numero).subscribe({
            next: (info) => {
                this.trackingInfo.set(info);
                this.buscando.set(false);
            },
            error: () => {
                this.errorMsg.set('No se encontró información para el número de guía ingresado.');
                this.buscando.set(false);
            }
        });
    }

    rastrearDesdeTabla(trackingNumber: string) {
        this.searchForm.patchValue({ trackingInput: trackingNumber });
        this.buscarTracking();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    statusBadge(status: string): string {
        const map: Record<string, string> = {
            CREATED: 'badge badge-accent',
            PICKED_UP: 'badge badge-accent',
            IN_TRANSIT: 'badge badge-warning',
            OUT_FOR_DELIVERY: 'badge badge-warning',
            DELIVERED: 'badge badge-success',
            FAILED: 'badge badge-error',
            RETURNED: 'badge badge-neutral'
        };
        return map[status] ?? 'badge badge-neutral';
    }
}
