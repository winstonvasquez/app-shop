import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
    FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormArray, FormControl
} from '@angular/forms';
import { InventoryApiService } from '../../services/inventory-api.service';
import { InventoryTransfer, InventoryTransferRequest, InventoryTransferStatus, Warehouse } from '../../models/inventory.models';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { ROUTES } from '@shared/constants/app.constants';
import {
    DataTableComponent, TableColumn, TableAction, PaginationEvent, FilterConfig, FilterChangeEvent,
    DateRangeFilterConfig, DateRangeChangeEvent
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { ButtonComponent, ServerSearchSelectComponent } from '@shared/components';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import { CatalogService } from '@core/services/catalog.service';
import { warehouseSelectSource } from '../../components/select-sources';
import { ProductLookupComponent } from '../../components/product-lookup/product-lookup.component';
import { ProductResponse } from '@core/models/product.model';

@Component({
    selector: 'app-transfer-management',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        DataTableComponent, DrawerComponent,
        PageHeaderComponent, AlertComponent,
        FormFieldComponent, DateInputComponent,
        ButtonComponent, ServerSearchSelectComponent, ProductLookupComponent
    ],
    templateUrl: './transfer-management.component.html',
    styleUrl: './transfer-management.component.scss'
})
export class TransferManagementComponent {
    private readonly api = inject(InventoryApiService);
    private readonly fb = inject(FormBuilder);
    readonly catalog = inject(CatalogService);

    transfers = signal<InventoryTransfer[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);

    currentPage = signal(0);
    pageSize = signal(20);
    totalElements = signal(0);
    totalPages = signal(0);

    // Filtros (TODOS server-side — la vista nunca filtra la página cargada)
    filterStatus = signal('');
    filterSourceWarehouseId = signal('');
    filterDestinationWarehouseId = signal('');
    filterRequestDateDesde = signal<string | null>(null);
    filterRequestDateHasta = signal<string | null>(null);
    filterSentDateDesde = signal<string | null>(null);
    filterSentDateHasta = signal<string | null>(null);
    filterReceivedDateDesde = signal<string | null>(null);
    filterReceivedDateHasta = signal<string | null>(null);
    searchQuery = signal('');

    /** Almacenes para los selects de filtro (origen/destino) del toolbar. */
    warehousesFiltro = signal<Warehouse[]>([]);

    /** Fuente server-side del search-select de almacén (origen y destino comparten el mismo dataSource). */
    readonly warehouseSource = warehouseSelectSource(this.api);

    // Filtros select del toolbar. Las opciones de estado salen de erp_parameters (fuente única).
    filters: FilterConfig[] = [
        catalogFilter(this.catalog, 'ESTADO_TRANSFERENCIA_INVENTARIO', 'status', 'Todos los estados'),
        signalFilter('sourceWarehouseId', 'Almacén origen', this.warehousesFiltro,
            w => ({ value: w.id, label: w.name })),
        signalFilter('destinationWarehouseId', 'Almacén destino', this.warehousesFiltro,
            w => ({ value: w.id, label: w.name }))
    ];

    /** Rangos de fecha para el toolbar del data-table. */
    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'requestDate', label: 'Fecha de solicitud' },
        { field: 'sentDate', label: 'Fecha de envío' },
        { field: 'receivedDate', label: 'Fecha de recepción' }
    ];

    showDrawer = signal(false);
    submitting = signal(false);
    submitError = signal<string | null>(null);

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: ROUTES.admin },
        { label: 'Inventario', url: '/admin/inventario/dashboard' },
        { label: 'Transferencias' }
    ];

    columns: TableColumn<InventoryTransfer>[] = [
        { key: 'transferNumber', label: 'N°', width: '130px',
          render: (r) => r.transferNumber ?? String(r.id) },
        { key: 'requestDate', label: 'Fecha', sortable: true,
          render: (r) => r.requestDate ? new Date(r.requestDate).toLocaleDateString('es-PE') : '—' },
        { key: 'sourceWarehouseName', label: 'Origen',
          render: (r) => r.sourceWarehouseName ?? String(r.sourceWarehouseId) },
        { key: 'destinationWarehouseName', label: 'Destino',
          render: (r) => r.destinationWarehouseName ?? String(r.destinationWarehouseId) },
        {
            key: 'status', label: 'Estado', html: true,
            render: (r) => {
                const cls: Record<InventoryTransferStatus, string> = {
                    PENDIENTE: 'badge-warning',
                    ENVIADA:   'badge-accent',
                    RECIBIDA:  'badge-success',
                    CANCELADA: 'badge-error'
                };
                return `<span class="badge ${cls[r.status] ?? 'badge-neutral'}">${this.catalog.label('ESTADO_TRANSFERENCIA_INVENTARIO', r.status)}</span>`;
            }
        }
    ];

    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.inventory}/api/transfers/export`,
        filename: 'transferencias',
        params: () => ({
            q: this.searchQuery() || undefined,
            status: this.filterStatus() || undefined,
            sourceWarehouseId: this.filterSourceWarehouseId() || undefined,
            destinationWarehouseId: this.filterDestinationWarehouseId() || undefined,
            requestDateDesde: this.filterRequestDateDesde() ?? undefined,
            requestDateHasta: this.filterRequestDateHasta() ?? undefined,
            sentDateDesde: this.filterSentDateDesde() ?? undefined,
            sentDateHasta: this.filterSentDateHasta() ?? undefined,
            receivedDateDesde: this.filterReceivedDateDesde() ?? undefined,
            receivedDateHasta: this.filterReceivedDateHasta() ?? undefined
        })
    };

    actions: TableAction<InventoryTransfer>[] = [
        {
            label: 'Enviar',
            class: 'btn btn-secondary',
            show: (r) => r.status === 'PENDIENTE',
            onClick: (r) => this.onSend(r.id)
        },
        {
            label: 'Recibir',
            class: 'btn btn-primary',
            show: (r) => r.status === 'ENVIADA',
            onClick: (r) => this.onReceive(r.id)
        },
        {
            label: 'Cancelar',
            class: 'btn btn-danger',
            show: (r) => r.status === 'PENDIENTE' || r.status === 'ENVIADA',
            onClick: (r) => this.onCancel(r.id)
        }
    ];

    form: FormGroup = this.fb.nonNullable.group({
        sourceWarehouseId:      [null as number | null, Validators.required],
        destinationWarehouseId: [null as number | null, Validators.required],
        requestDate:            ['', Validators.required],
        notes:                  [''],
        details:                this.fb.array([this.newDetailRow()])
    });

    get details(): FormArray { return this.form.get('details') as FormArray; }

    newDetailRow(productId: number | null = null, productName = ''): FormGroup {
        return this.fb.nonNullable.group({
            productId:         [productId, Validators.required],
            productName:       [productName],
            requestedQuantity: [null as number | null, [Validators.required, Validators.min(1)]],
            notes:             ['']
        });
    }

    /** Agrega una fila prellenada con el producto elegido en el buscador (evita duplicados). */
    onAddProductRow(p: ProductResponse): void {
        if (this.details.controls.some(c => Number(c.get('productId')?.value) === p.id)) return;
        this.details.push(this.newDetailRow(p.id, p.nombre));
    }

    constructor() {
        this.loadWarehousesFiltro();
        this.loadTransfers();
    }

    /** Almacenes para los selects de filtro origen/destino del toolbar. */
    private loadWarehousesFiltro(): void {
        this.api.getWarehouses().subscribe({
            next: (whs) => this.warehousesFiltro.set(whs),
            error: () => this.warehousesFiltro.set([])
        });
    }

    loadTransfers(): void {
        this.loading.set(true);
        this.api.getTransfers({
            page: this.currentPage(),
            size: this.pageSize(),
            q: this.searchQuery() || undefined,
            status: this.filterStatus() || undefined,
            sourceWarehouseId: this.filterSourceWarehouseId() ? Number(this.filterSourceWarehouseId()) : undefined,
            destinationWarehouseId: this.filterDestinationWarehouseId() ? Number(this.filterDestinationWarehouseId()) : undefined,
            requestDateDesde: this.filterRequestDateDesde() || undefined,
            requestDateHasta: this.filterRequestDateHasta() || undefined,
            sentDateDesde: this.filterSentDateDesde() || undefined,
            sentDateHasta: this.filterSentDateHasta() || undefined,
            receivedDateDesde: this.filterReceivedDateDesde() || undefined,
            receivedDateHasta: this.filterReceivedDateHasta() || undefined
        }).subscribe({
            next: (res) => {
                this.transfers.set(res.content);
                this.totalElements.set(pageTotalElements(res));
                this.totalPages.set(pageTotalPages(res));
                this.loading.set(false);
            },
            error: (err: Error) => { this.error.set(err.message); this.loading.set(false); }
        });
    }

    /** La búsqueda por texto también va al backend (`q`), no filtra la página cargada. */
    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.loadTransfers();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'status':                  this.filterStatus.set(valor); break;
            case 'sourceWarehouseId':       this.filterSourceWarehouseId.set(valor); break;
            case 'destinationWarehouseId':  this.filterDestinationWarehouseId.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadTransfers();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        switch (event.field) {
            case 'requestDate':
                this.filterRequestDateDesde.set(event.from);
                this.filterRequestDateHasta.set(event.to);
                break;
            case 'sentDate':
                this.filterSentDateDesde.set(event.from);
                this.filterSentDateHasta.set(event.to);
                break;
            case 'receivedDate':
                this.filterReceivedDateDesde.set(event.from);
                this.filterReceivedDateHasta.set(event.to);
                break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadTransfers();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterStatus.set('');
        this.filterSourceWarehouseId.set('');
        this.filterDestinationWarehouseId.set('');
        this.filterRequestDateDesde.set(null);
        this.filterRequestDateHasta.set(null);
        this.filterSentDateDesde.set(null);
        this.filterSentDateHasta.set(null);
        this.filterReceivedDateDesde.set(null);
        this.filterReceivedDateHasta.set(null);
        this.currentPage.set(0);
        this.loadTransfers();
    }

    openCreate(): void {
        while (this.details.length > 0) this.details.removeAt(0);
        this.form.reset({ requestDate: new Date().toISOString().split('T')[0] });
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    closeDrawer(): void { this.showDrawer.set(false); }
    removeDetail(i: number): void { this.details.removeAt(i); }

    onSubmit(): void {
        if (this.submitting()) return;
        if (this.details.length === 0) { this.submitError.set('Agregá al menos un producto a la transferencia.'); return; }
        if (this.form.invalid) { this.form.markAllAsTouched(); return; }
        this.submitting.set(true);
        const v = this.form.getRawValue();
        const payload: InventoryTransferRequest = {
            sourceWarehouseId:      Number(v.sourceWarehouseId),
            destinationWarehouseId: Number(v.destinationWarehouseId),
            requestDate:            v.requestDate,
            notes:                  v.notes || undefined,
            details:                v.details.map((d: { productId: number; requestedQuantity: number; notes: string }) => ({
                productId:         Number(d.productId),
                requestedQuantity: Number(d.requestedQuantity),
                notes:             d.notes || undefined
            }))
        };
        this.api.createTransfer(payload).subscribe({
            next: () => { this.submitting.set(false); this.closeDrawer(); this.loadTransfers(); },
            error: (err: Error) => { this.submitting.set(false); this.submitError.set(err.message); }
        });
    }

    onSend(id: number): void {
        if (!confirm('¿Marcar como ENVIADA esta transferencia?')) return;
        this.api.sendTransfer(id).subscribe({
            next: () => this.loadTransfers(),
            error: (err: Error) => this.error.set(err.message)
        });
    }

    onReceive(id: number): void {
        if (!confirm('¿Confirmar recepción de esta transferencia?')) return;
        this.api.receiveTransfer(id).subscribe({
            next: () => this.loadTransfers(),
            error: (err: Error) => this.error.set(err.message)
        });
    }

    onCancel(id: number): void {
        if (!confirm('¿Cancelar esta transferencia? Si ya fue enviada, se revertirá el stock descontado del almacén origen.')) return;
        const motivo = prompt('Motivo de cancelación (opcional):') ?? undefined;
        this.api.cancelTransfer(id, motivo || undefined).subscribe({
            next: () => this.loadTransfers(),
            error: (err: Error) => this.error.set(err.message)
        });
    }

    onPageChange(e: PaginationEvent): void {
        this.currentPage.set(e.page);
        this.pageSize.set(e.size);
        this.loadTransfers();
    }

    getDetailCtrl(i: number, name: string): FormControl {
        return this.details.at(i).get(name) as FormControl;
    }

    getCtrl(name: string): FormControl { return this.form.get(name) as FormControl; }
}
