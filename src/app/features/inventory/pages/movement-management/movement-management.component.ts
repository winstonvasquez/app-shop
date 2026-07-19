import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { InventoryApiService, PutawaySuggestion } from '../../services/inventory-api.service';
import {
    InventoryMovement, InventoryMovementRequest, InventoryMovementType, Warehouse
} from '../../models/inventory.models';
import { of, map } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { DataTableComponent, TableColumn, PaginationEvent, FilterConfig, FilterChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { ButtonComponent } from '@shared/components';
import { ProductLookupComponent } from '../../components/product-lookup/product-lookup.component';
import { ProductResponse } from '@core/models/product.model';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';

@Component({
    selector: 'app-movement-management',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        DataTableComponent, DrawerComponent,
        PageHeaderComponent, AlertComponent,
        FormFieldComponent, DateInputComponent,
        ButtonComponent, ProductLookupComponent
    ],
    templateUrl: './movement-management.component.html'
})
export class MovementManagementComponent {
    private readonly api = inject(InventoryApiService);
    private readonly fb = inject(FormBuilder);

    movements = signal<InventoryMovement[]>([]);
    warehouses = signal<Warehouse[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);

    currentPage = signal(0);
    pageSize = signal(20);
    totalElements = signal(0);
    totalPages = signal(0);

    filterWarehouseId = signal<number | undefined>(undefined);
    filterType = signal<string>('');
    filterDateFrom = signal<string>('');
    filterDateTo = signal<string>('');

    showDrawer = signal(false);
    submitting = signal(false);
    submitError = signal<string | null>(null);

    /** Nombre del producto elegido vía buscador (el form solo guarda el productId). */
    selectedProductName = signal<string | null>(null);

    /** Estado de putaway (sugerencia de ubicación para entradas). */
    movementTypeValue = signal<string>('');
    readonly isEntrada = computed(() => this.movementTypeValue().startsWith('ENTRADA'));
    putawaySuggestions = signal<PutawaySuggestion[]>([]);
    loadingPutaway = signal(false);
    putawaySearched = signal(false);
    selectedLocationLabel = signal<string | null>(null);

    readonly movementTypes: InventoryMovementType[] = [
        'ENTRADA_COMPRA', 'ENTRADA_DEVOLUCION', 'ENTRADA_AJUSTE',
        'ENTRADA_TRANSFERENCIA', 'ENTRADA_PRODUCCION',
        'SALIDA_VENTA', 'SALIDA_DEVOLUCION', 'SALIDA_AJUSTE',
        'SALIDA_TRANSFERENCIA', 'SALIDA_CONSUMO', 'SALIDA_MERMA'
    ];

    readonly movementTypeLabels: Record<InventoryMovementType, string> = {
        ENTRADA_COMPRA:        'Entrada — Compra',
        ENTRADA_DEVOLUCION:    'Entrada — Devolución',
        ENTRADA_AJUSTE:        'Entrada — Ajuste',
        ENTRADA_TRANSFERENCIA: 'Entrada — Transferencia',
        ENTRADA_PRODUCCION:    'Entrada — Producción',
        SALIDA_VENTA:          'Salida — Venta',
        SALIDA_DEVOLUCION:     'Salida — Devolución',
        SALIDA_AJUSTE:         'Salida — Ajuste',
        SALIDA_TRANSFERENCIA:  'Salida — Transferencia',
        SALIDA_CONSUMO:        'Salida — Consumo',
        SALIDA_MERMA:          'Salida — Merma'
    };

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: '/admin' },
        { label: 'Inventario', url: '/admin/inventario/dashboard' },
        { label: 'Movimientos' }
    ];

    columns: TableColumn<InventoryMovement>[] = [
        { key: 'movementNumber', label: 'N°', width: '120px',
          render: (r) => r.movementNumber ?? String(r.id) },
        { key: 'movementDate', label: 'Fecha', sortable: true,
          render: (r) => new Date(r.movementDate).toLocaleDateString('es-PE') },
        {
            key: 'movementType', label: 'Tipo', html: true,
            render: (r) => {
                const isEntry = r.movementType.startsWith('ENTRADA');
                const cls = isEntry ? 'badge-success' : 'badge-error';
                const label = this.movementTypeLabels[r.movementType] ?? r.movementType;
                return `<span class="badge ${cls}">${label}</span>`;
            }
        },
        { key: 'productId', label: 'Producto',
          render: (r) => r.productName ?? `ID ${r.productId}` },
        { key: 'warehouseName', label: 'Almacén',
          render: (r) => r.warehouseName ?? String(r.warehouseId) },
        { key: 'quantity', label: 'Cantidad', align: 'right', sortable: true,
          render: (r) => r.quantity.toLocaleString('es-PE') },
        { key: 'balanceAfter', label: 'Saldo', align: 'right',
          render: (r) => r.balanceAfter != null ? r.balanceAfter.toLocaleString('es-PE') : '—' }
    ];

    form: FormGroup = this.fb.nonNullable.group({
        productId:       [null as number | null, Validators.required],
        warehouseId:     [null as number | null, Validators.required],
        movementType:    ['' as string, Validators.required],
        quantity:        [null as number | null, [Validators.required, Validators.min(0.001)]],
        unitCost:        [null as number | null],
        movementDate:    ['', Validators.required],
        reason:          [''],
        referenceType:   [''],
        referenceNumber: [''],
        locationId:      [null as number | null]
    });

    constructor() {
        this.loadWarehouses();
        this.loadMovements();
        // Reaccionar al tipo de movimiento: putaway solo aplica a entradas.
        this.form.get('movementType')!.valueChanges
            .pipe(takeUntilDestroyed())
            .subscribe((v) => {
                this.movementTypeValue.set((v as string) ?? '');
                this.resetPutaway();
            });
    }

    loadWarehouses(): void {
        this.api.getWarehouses().subscribe({ next: (d) => this.warehouses.set(d) });
    }

    loadMovements(): void {
        this.loading.set(true);
        this.api.getMovements({
            page: this.currentPage(),
            size: this.pageSize(),
            warehouseId:  this.filterWarehouseId(),
            movementType: this.filterType() || undefined,
            dateFrom:     this.filterDateFrom() || undefined,
            dateTo:       this.filterDateTo() || undefined
        }).subscribe({
            next: (res) => {
                this.movements.set(res.content);
                this.totalElements.set(pageTotalElements(res));
                this.totalPages.set(pageTotalPages(res));
                this.loading.set(false);
            },
            error: (err: Error) => { this.error.set(err.message); this.loading.set(false); }
        });
    }

    // Filtros del toolbar: almacén dinámico (BD) + tipo de movimiento
    readonly toolbarFilters: FilterConfig[] = [
        { field: 'warehouse', label: 'Todos los almacenes', options: toObservable(this.warehouses).pipe(
            map(list => list.map(w => ({ value: w.id, label: w.name }))) ) },
        { field: 'tipo', label: 'Todos los tipos',
          options: of(this.movementTypes.map(t => ({ value: t, label: this.movementTypeLabels[t] }))) }
    ];

    onFilterChangeEvent(event: FilterChangeEvent): void {
        if (event.field === 'warehouse') {
            this.filterWarehouseId.set(event.value != null ? Number(event.value) : undefined);
        } else if (event.field === 'tipo') {
            this.filterType.set(event.value != null ? String(event.value) : '');
        } else { return; }
        this.currentPage.set(0);
        this.loadMovements();
    }

    onFilterDate(key: 'from' | 'to', event: Event): void {
        const val = (event.target as HTMLInputElement).value;
        if (key === 'from') this.filterDateFrom.set(val);
        else this.filterDateTo.set(val);
        this.currentPage.set(0);
        this.loadMovements();
    }

    openCreate(): void {
        this.form.reset({ movementDate: new Date().toISOString().split('T')[0] });
        this.selectedProductName.set(null);
        this.movementTypeValue.set('');
        this.resetPutaway();
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    closeDrawer(): void { this.showDrawer.set(false); }

    /** El usuario eligió un producto del buscador → llena el productId y muestra el nombre. */
    onProductSelected(p: ProductResponse): void {
        this.getCtrl('productId').setValue(p.id);
        this.selectedProductName.set(p.nombre);
        this.resetPutaway();
    }

    clearProduct(): void {
        this.getCtrl('productId').setValue(null);
        this.selectedProductName.set(null);
        this.resetPutaway();
    }

    /** Pide al backend las mejores ubicaciones para guardar el producto en el almacén elegido. */
    suggestPutaway(): void {
        const wid = Number(this.getCtrl('warehouseId').value);
        const pid = Number(this.getCtrl('productId').value);
        if (!wid || !pid) return;
        const qtyRaw = this.getCtrl('quantity').value;
        this.loadingPutaway.set(true);
        this.putawaySearched.set(false);
        this.api.getPutawaySuggestions(wid, pid, qtyRaw != null ? Number(qtyRaw) : undefined).subscribe({
            next: (res) => {
                this.putawaySuggestions.set(res.sugerencias);
                this.loadingPutaway.set(false);
                this.putawaySearched.set(true);
            },
            error: () => {
                this.putawaySuggestions.set([]);
                this.loadingPutaway.set(false);
                this.putawaySearched.set(true);
            }
        });
    }

    pickLocation(s: PutawaySuggestion): void {
        this.getCtrl('locationId').setValue(s.locationId);
        this.selectedLocationLabel.set(`${s.code} — ${s.ubicacion}`);
        this.putawaySuggestions.set([]);
    }

    clearLocation(): void {
        this.getCtrl('locationId').setValue(null);
        this.selectedLocationLabel.set(null);
        this.putawaySearched.set(false);
    }

    private resetPutaway(): void {
        this.putawaySuggestions.set([]);
        this.selectedLocationLabel.set(null);
        this.putawaySearched.set(false);
        this.getCtrl('locationId').setValue(null);
    }

    onSubmit(): void {
        if (this.form.invalid) { this.form.markAllAsTouched(); return; }
        this.submitting.set(true);
        const v = this.form.getRawValue();
        const payload: InventoryMovementRequest = {
            productId:       Number(v.productId),
            warehouseId:     Number(v.warehouseId),
            movementType:    v.movementType as InventoryMovementType,
            quantity:        Number(v.quantity),
            unitCost:        v.unitCost != null ? Number(v.unitCost) : undefined,
            movementDate:    v.movementDate,
            reason:          v.reason || undefined,
            referenceType:   v.referenceType || undefined,
            referenceNumber: v.referenceNumber || undefined,
            locationId:      v.locationId != null ? Number(v.locationId) : undefined
        };
        this.api.createMovement(payload).subscribe({
            next: () => { this.submitting.set(false); this.closeDrawer(); this.loadMovements(); },
            error: (err: Error) => { this.submitting.set(false); this.submitError.set(err.message); }
        });
    }

    onPageChange(e: PaginationEvent): void {
        this.currentPage.set(e.page);
        this.pageSize.set(e.size);
        this.loadMovements();
    }

    getCtrl(name: string): FormControl { return this.form.get(name) as FormControl; }
}
