import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { EnvioService } from '../../services/envio.service';
import { TransportistaService } from '../../services/transportista.service';
import { Envio, EnvioStatus, TrackingEvent } from '../../models/envio.model';
import { Transportista } from '../../models/transportista.model';
import { AuthService } from '../../../../core/auth/auth.service';
import { ButtonComponent } from '@shared/components';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { LoadingSpinnerComponent } from '@shared/ui/feedback/loading-spinner/loading-spinner.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';

const STATUS_MAP: Record<EnvioStatus, string> = {
    PENDING_DISPATCH:  'Pendiente despacho',
    DISPATCHED:        'Despachado',
    IN_TRANSIT:        'En tránsito',
    OUT_FOR_DELIVERY:  'En reparto',
    DELIVERED:         'Entregado',
    FAILED:            'Fallido',
    RETURNED:          'Devuelto'
};

@Component({
    selector: 'app-envios-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    FormsModule,
    ReactiveFormsModule,
    ButtonComponent,
    DataTableComponent,
    DrawerComponent,
    DateInputComponent,
    AlertComponent,
    LoadingSpinnerComponent,
    PageHeaderComponent,
    DatePipe
  ],
    templateUrl: './envios-page.component.html'
})
export class EnviosPageComponent implements OnInit {
    private readonly envioService        = inject(EnvioService);
    private readonly transportistaService = inject(TransportistaService);
    private readonly authService         = inject(AuthService);
    private readonly fb                  = inject(FormBuilder);

    // Data
    envios         = signal<Envio[]>([]);
    transportistas = signal<Transportista[]>([]);
    selected       = signal<Envio | null>(null);

    // UI state
    loading        = signal(false);
    loadingDetail  = signal(false);
    error          = signal<string | null>(null);
    showForm       = signal(false);
    showDetail     = signal(false);
    submitting     = signal(false);
    submitError    = signal<string | null>(null);

    // Filters
    filterStatus = '';

    // Pagination
    currentPage   = signal(0);
    pageSize      = signal(10);
    totalElements = signal(0);
    totalPages    = signal(0);

    readonly statusOptions: { value: EnvioStatus; label: string }[] = [
        { value: 'PENDING_DISPATCH', label: 'Pendiente despacho' },
        { value: 'DISPATCHED',       label: 'Despachado' },
        { value: 'IN_TRANSIT',       label: 'En tránsito' },
        { value: 'OUT_FOR_DELIVERY', label: 'En reparto' },
        { value: 'DELIVERED',        label: 'Entregado' },
        { value: 'FAILED',           label: 'Fallido' },
        { value: 'RETURNED',         label: 'Devuelto' }
    ];

    breadcrumbs: Breadcrumb[] = [
        { label: 'Inicio',    url: '/admin/dashboard' },
        { label: 'Logística', url: '/logistica/dashboard' },
        { label: 'Envíos' }
    ];

    columns: TableColumn<Envio>[] = [
        { key: 'trackingNumber', label: 'N° Tracking' },
        { key: 'recipientName',  label: 'Destinatario' },
        { key: 'shippingAddress', label: 'Dirección destino',
          render: (r) => r.shippingAddress.length > 45 ? r.shippingAddress.slice(0, 45) + '…' : r.shippingAddress },
        { key: 'carrierNombre',  label: 'Transportista', render: (r) => r.carrierNombre || '—' },
        { key: 'estimatedDeliveryDate', label: 'Entrega estimada',
          render: (r) => r.estimatedDeliveryDate
            ? new Date(r.estimatedDeliveryDate).toLocaleDateString('es-PE') : '—' },
        { key: 'status', label: 'Estado', html: true,
          render: (r) => `<span class="badge ${this.badgeStatus(r.status)}">${STATUS_MAP[r.status] ?? r.status}</span>` },
        { key: 'createdAt', label: 'Registrado',
          render: (r) => new Date(r.createdAt).toLocaleDateString('es-PE') }
    ];

    actions: TableAction<Envio>[] = [
        {
            label: 'Ver detalle', icon: '👁️', class: 'btn-view',
            onClick: (row) => this.openDetail(row)
        }
    ];

    form: FormGroup;

    constructor() {
        this.form = this.fb.group({
            carrierId:             ['', Validators.required],
            shippingAddress:       ['', Validators.required],
            recipientName:         ['', Validators.required],
            recipientPhone:        [''],
            recipientEmail:        ['', Validators.email],
            shippingCost:          [null],
            estimatedDeliveryDate: [''],
            notes:                 ['']
        });
    }

    private get companyId(): string {
        return String(this.authService.currentUser()?.activeCompanyId ?? 1);
    }

    ngOnInit() {
        this.loadTransportistas();
        this.loadEnvios();
    }

    loadTransportistas() {
        this.transportistaService.getTransportistas(this.companyId, 0, 100).subscribe({
            next: (res) => this.transportistas.set(res.content),
            error: () => this.transportistas.set([])
        });
    }

    loadEnvios() {
        this.loading.set(true);
        this.error.set(null);
        this.envioService.getEnvios(
            this.companyId, this.currentPage(), this.pageSize(),
            this.filterStatus || undefined
        ).subscribe({
            next: (res) => {
                this.envios.set(res.content);
                this.totalElements.set(pageTotalElements(res));
                this.totalPages.set(pageTotalPages(res));
                this.loading.set(false);
            },
            error: (err: Error) => {
                this.error.set(err.message ?? 'Error al cargar envíos.');
                this.loading.set(false);
            }
        });
    }

    onFilterStatus(event: Event) {
        this.filterStatus = (event.target as HTMLSelectElement).value;
        this.currentPage.set(0);
        this.loadEnvios();
    }

    onPaginationChange(event: PaginationChangeEvent) {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadEnvios();
    }

    // ── Detalle ───────────────────────────────────────────
    openDetail(envio: Envio) {
        this.loadingDetail.set(true);
        this.showDetail.set(true);
        this.selected.set(envio);
        this.envioService.getById(envio.id, this.companyId).subscribe({
            next: (res) => {
                this.selected.set(res);
                this.loadingDetail.set(false);
            },
            error: () => this.loadingDetail.set(false)
        });
    }

    closeDetail() {
        this.showDetail.set(false);
        this.selected.set(null);
    }

    // ── Formulario ────────────────────────────────────────
    openCreateForm() {
        this.form.reset();
        this.submitError.set(null);
        this.showForm.set(true);
    }

    closeForm() {
        this.showForm.set(false);
        this.form.reset();
    }

    onSubmit() {
        if (this.form.invalid) { this.form.markAllAsTouched(); return; }
        this.submitting.set(true);
        this.submitError.set(null);

        this.envioService.create({
            ...this.form.value,
            tenantId:  this.companyId,
            companyId: this.companyId
        }).subscribe({
            next: () => {
                this.submitting.set(false);
                this.closeForm();
                this.loadEnvios();
            },
            error: (err: Error) => {
                this.submitError.set(err.message ?? 'Error al crear envío.');
                this.submitting.set(false);
            }
        });
    }

    badgeStatus(status: EnvioStatus): string {
        const map: Record<EnvioStatus, string> = {
            PENDING_DISPATCH: 'badge-neutral',
            DISPATCHED:       'badge-accent',
            IN_TRANSIT:       'badge-warning',
            OUT_FOR_DELIVERY: 'badge-warning',
            DELIVERED:        'badge-success',
            FAILED:           'badge-error',
            RETURNED:         'badge-neutral'
        };
        return map[status] ?? 'badge-neutral';
    }

    readonly statusMapLabel = STATUS_MAP;
}
