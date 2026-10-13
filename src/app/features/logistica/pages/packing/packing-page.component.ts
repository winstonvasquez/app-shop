import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { PackingService } from '../../services/packing.service';
import { PackingOrder, PackingOrderStatus } from '../../models/packing.model';
import { PickingOrder } from '../../models/picking.model';
import { ButtonComponent } from '@shared/components';
import { DataTableComponent, TableAction, TableColumn, FilterConfig, FilterChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { mensajeDeErrorHttp } from '@core/utils/http-error.util';
import { armarPackingBody, PackingFormValue } from './packing-page.form';

const ESTADOS: Record<PackingOrderStatus, { label: string; badge: string }> = {
    PENDING_PACKING: { label: 'Pendiente de empaque', badge: 'badge-neutral' },
    PACKING:         { label: 'Empacando',            badge: 'badge-warning' },
    PACKED:          { label: 'Empacado',             badge: 'badge-accent' },
    READY_TO_SHIP:   { label: 'Listo para despachar', badge: 'badge-success' },
    CANCELLED:       { label: 'Cancelado',            badge: 'badge-error' },
};

@Component({
    selector: 'app-packing-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ReactiveFormsModule, ButtonComponent, DataTableComponent, DrawerComponent, AlertComponent, PageHeaderComponent],
    templateUrl: './packing-page.component.html'
})
export class PackingPageComponent implements OnInit {
    private readonly service = inject(PackingService);
    private readonly fb = inject(FormBuilder);

    orders       = signal<PackingOrder[]>([]);
    pickedOrders = signal<PickingOrder[]>([]);
    loading      = signal(false);
    error        = signal<string | null>(null);
    info         = signal<string | null>(null);
    showForm     = signal(false);
    submitting   = signal(false);
    submitError  = signal<string | null>(null);
    filterStatus = signal<PackingOrderStatus | ''>('');

    breadcrumbs: Breadcrumb[] = [
        { label: 'Inicio',    url: '/admin/dashboard' },
        { label: 'Logística', url: '/logistica/dashboard' },
        { label: 'Packing' }
    ];

    readonly filters: FilterConfig[] = [{
        field: 'status', label: 'Estado',
        options: of(Object.entries(ESTADOS).map(([value, e]) => ({ value, label: e.label })))
    }];

    columns: TableColumn<PackingOrder>[] = [
        { key: 'id', label: 'Orden de packing', render: (r) => r.id.slice(0, 8) },
        { key: 'pickingOrderId', label: 'Orden de picking', render: (r) => r.pickingOrderId.slice(0, 8) },
        { key: 'packageType', label: 'Tipo de bulto', render: (r) => r.packageType || '—' },
        { key: 'weight', label: 'Peso (kg)', render: (r) => r.weight != null ? String(r.weight) : '—' },
        { key: 'status', label: 'Estado', html: true,
          render: (r) => `<span class="badge ${ESTADOS[r.status]?.badge ?? 'badge-neutral'}">${ESTADOS[r.status]?.label ?? r.status}</span>` },
        { key: 'createdAt', label: 'Registrado', render: (r) => new Date(r.createdAt).toLocaleDateString('es-PE') }
    ];

    // PENDING_PACKING/PACKING -> complete (PACKED) -> ready-to-ship (READY_TO_SHIP).
    actions: TableAction<PackingOrder>[] = [
        {
            label: 'Completar empaque', icon: '📦', class: 'btn-view',
            show: (r) => r.status === 'PENDING_PACKING' || r.status === 'PACKING',
            onClick: (r) => this.run(this.service.completeOrder(r.id), 'Empaque completado.')
        },
        {
            label: 'Listo para despachar', icon: '🚚', class: 'btn-primary',
            show: (r) => r.status === 'PACKED',
            onClick: (r) => this.run(this.service.markReadyToShip(r.id), 'Orden lista para despachar.')
        }
    ];

    form = this.fb.nonNullable.group({
        pickingOrderId: ['', Validators.required],
        packageType:    [''],
        weight:         [null as number | null, Validators.min(0.001)],
        length:         [null as number | null, Validators.min(0.001)],
        width:          [null as number | null, Validators.min(0.001)],
        height:         [null as number | null, Validators.min(0.001)],
        notes:          ['']
    });

    ngOnInit(): void { this.load(); }

    load(): void {
        this.loading.set(true);
        this.error.set(null);
        const status = this.filterStatus();
        (status ? this.service.getByStatus(status) : this.service.getAll()).subscribe({
            next: (res) => { this.orders.set(res); this.loading.set(false); },
            error: (e: HttpErrorResponse) => { this.error.set(mensajeDeErrorHttp(e)); this.loading.set(false); }
        });
    }

    onFilterChange(ev: FilterChangeEvent): void {
        if (ev.field !== 'status') return;
        this.filterStatus.set(ev.value ? (String(ev.value) as PackingOrderStatus) : '');
        this.load();
    }

    onFiltersClear(): void {
        this.filterStatus.set('');
        this.load();
    }

    openCreate(): void {
        this.form.reset();
        this.submitError.set(null);
        this.service.getPickedOrders().subscribe({
            next: (res) => this.pickedOrders.set(res),
            error: (e: HttpErrorResponse) => { this.pickedOrders.set([]); this.submitError.set(mensajeDeErrorHttp(e)); }
        });
        this.showForm.set(true);
    }

    closeForm(): void { this.showForm.set(false); }

    onSubmit(): void {
        if (this.form.invalid) { this.form.markAllAsTouched(); return; }
        this.submitting.set(true);
        this.submitError.set(null);
        this.service.create(armarPackingBody(this.form.getRawValue() as PackingFormValue)).subscribe({
            next: () => { this.submitting.set(false); this.closeForm(); this.info.set('Orden de packing creada.'); this.load(); },
            error: (e: HttpErrorResponse) => { this.submitting.set(false); this.submitError.set(mensajeDeErrorHttp(e)); }
        });
    }

    private run(obs: Observable<PackingOrder>, ok: string): void {
        this.error.set(null);
        obs.subscribe({
            next: () => { this.info.set(ok); this.load(); },
            error: (e: HttpErrorResponse) => this.error.set(mensajeDeErrorHttp(e))
        });
    }
}
