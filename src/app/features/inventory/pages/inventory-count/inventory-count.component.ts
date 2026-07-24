import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import {
    FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormArray, FormControl
} from '@angular/forms';
import { InventoryApiService } from '../../services/inventory-api.service';
import { InventoryCount, InventoryCountRequest, InventoryCountStatus } from '../../models/inventory.models';
import { map } from 'rxjs';
import { DataTableComponent, TableColumn, TableAction, PaginationEvent, FilterConfig, FilterChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { ButtonComponent, ServerSearchSelectComponent } from '@shared/components';
import { ProductLookupComponent } from '../../components/product-lookup/product-lookup.component';
import { ProductResponse } from '@core/models/product.model';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { ROUTES } from '@shared/constants/app.constants';
import { CatalogService } from '@core/services/catalog.service';
import { warehouseSelectSource } from '../../components/select-sources';

@Component({
    selector: 'app-inventory-count',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        DataTableComponent, DrawerComponent,
        PageHeaderComponent, AlertComponent,
        FormFieldComponent, DateInputComponent,
        ButtonComponent, ProductLookupComponent, ServerSearchSelectComponent
    ],
    templateUrl: './inventory-count.component.html',
    styleUrl: './inventory-count.component.scss'
})
export class InventoryCountComponent {
    private readonly api = inject(InventoryApiService);
    private readonly fb = inject(FormBuilder);
    private readonly catalog = inject(CatalogService);

    readonly warehouseSource = warehouseSelectSource(this.api);

    counts = signal<InventoryCount[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);
    info = signal<string | null>(null);
    applyingId = signal<number | null>(null);

    currentPage = signal(0);
    pageSize = signal(20);
    totalElements = signal(0);
    totalPages = signal(0);

    filterStatus = signal('');

    showDrawer = signal(false);
    submitting = signal(false);
    submitError = signal<string | null>(null);

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: ROUTES.admin },
        { label: 'Inventario', url: '/admin/inventario/dashboard' },
        { label: 'Inventarios Físicos' }
    ];

    columns: TableColumn<InventoryCount>[] = [
        { key: 'countNumber', label: 'N°', width: '130px',
          render: (r) => r.countNumber ?? String(r.id) },
        { key: 'warehouseName', label: 'Almacén',
          render: (r) => r.warehouseName ?? String(r.warehouseId) },
        { key: 'countDate', label: 'Fecha', sortable: true,
          render: (r) => r.countDate ? new Date(r.countDate).toLocaleDateString('es-PE') : '—' },
        {
            key: 'status', label: 'Estado', html: true,
            render: (r) => {
                const cls: Record<InventoryCountStatus, string> = {
                    EN_PROCESO: 'badge-warning',
                    CERRADO:    'badge-neutral',
                    AJUSTADO:   'badge-success'
                };
                return `<span class="badge ${cls[r.status]}">${this.catalog.label('ESTADO_CONTEO_INVENTARIO', r.status)}</span>`;
            }
        }
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (respeta el filtro de estado actual). Ver /api/inventory/counts/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.inventory}/api/inventory/counts/export`,
        filename: 'inventarios-fisicos',
        params: () => ({ status: this.filterStatus() })
    };

    actions: TableAction<InventoryCount>[] = [
        {
            label: 'Cerrar',
            class: 'btn btn-secondary',
            show: (r) => r.status === 'EN_PROCESO',
            onClick: (r) => this.onCloseCount(r.id)
        },
        {
            label: 'Aplicar ajustes',
            class: 'btn btn-primary',
            show: (r) => r.status === 'CERRADO',
            onClick: (r) => this.onApplyAdjustments(r.id)
        }
    ];

    form: FormGroup = this.fb.nonNullable.group({
        warehouseId: [null as number | null, Validators.required],
        countDate:   ['', Validators.required],
        notes:       [''],
        details:     this.fb.array([this.newDetailRow()])
    });

    get details(): FormArray { return this.form.get('details') as FormArray; }

    newDetailRow(productId: number | null = null, productName = ''): FormGroup {
        return this.fb.nonNullable.group({
            productId:       [productId, Validators.required],
            productName:     [productName],
            countedQuantity: [null as number | null, [Validators.required, Validators.min(0)]],
            notes:           ['']
        });
    }

    /** Agrega una fila prellenada con el producto elegido en el buscador (evita duplicados). */
    onAddProductRow(p: ProductResponse): void {
        if (this.details.controls.some(c => Number(c.get('productId')?.value) === p.id)) return;
        this.details.push(this.newDetailRow(p.id, p.nombre));
    }

    constructor() {
        this.loadCounts();
    }

    loadCounts(): void {
        this.loading.set(true);
        this.api.getInventoryCounts({
            page: this.currentPage(),
            size: this.pageSize(),
            status: this.filterStatus() || undefined
        }).subscribe({
            next: (res) => {
                this.counts.set(res.content);
                this.totalElements.set(pageTotalElements(res));
                this.totalPages.set(pageTotalPages(res));
                this.loading.set(false);
            },
            error: (err: Error) => { this.error.set(err.message); this.loading.set(false); }
        });
    }

    /** Cierra un conteo EN_PROCESO (congela como paso previo al ajuste). */
    onCloseCount(id: number): void {
        if (this.applyingId() !== null) return;
        this.applyingId.set(id);
        this.error.set(null);
        this.info.set(null);
        this.api.closeInventoryCount(id).subscribe({
            next: (c) => {
                this.applyingId.set(null);
                this.info.set(`Conteo ${c.countNumber ?? id} cerrado. Ya podés aplicar los ajustes.`);
                this.loadCounts();
            },
            error: (err: Error) => { this.applyingId.set(null); this.error.set(err.message); }
        });
    }

    /**
     * Aplica los ajustes de un conteo CERRADO: genera los movimientos de ajuste al kardex.
     * El backend valida el estado (solo CERRADO) y es idempotente.
     */
    onApplyAdjustments(id: number): void {
        if (this.applyingId() !== null) return;
        this.applyingId.set(id);
        this.error.set(null);
        this.info.set(null);
        this.api.applyCountAdjustments(id).subscribe({
            next: (c) => {
                this.applyingId.set(null);
                this.info.set(`Conteo ${c.countNumber ?? id} ajustado: el stock fue corregido según las diferencias contadas.`);
                this.loadCounts();
            },
            error: (err: Error) => { this.applyingId.set(null); this.error.set(err.message); }
        });
    }

    readonly estadoFilters: FilterConfig[] = [
        { field: 'estado', label: 'Todos', options: toObservable(this.catalog.options('ESTADO_CONTEO_INVENTARIO')).pipe(
            map(o => o.map(x => ({ value: x.codigo, label: x.valor })))
        ) }
    ];

    onFilterChangeEvent(event: FilterChangeEvent): void {
        if (event.field !== 'estado') return;
        this.filterStatus.set(event.value != null ? String(event.value) : '');
        this.currentPage.set(0);
        this.loadCounts();
    }

    openCreate(): void {
        while (this.details.length > 0) this.details.removeAt(0);
        this.form.reset({ countDate: new Date().toISOString().split('T')[0] });
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    closeDrawer(): void { this.showDrawer.set(false); }
    removeDetail(i: number): void { this.details.removeAt(i); }

    onSubmit(): void {
        if (this.details.length === 0) { this.submitError.set('Agregá al menos un producto al conteo.'); return; }
        if (this.form.invalid) { this.form.markAllAsTouched(); return; }
        this.submitting.set(true);
        const v = this.form.getRawValue();
        const payload: InventoryCountRequest = {
            warehouseId: Number(v.warehouseId),
            countDate:   v.countDate,
            notes:       v.notes || undefined,
            details:     v.details.map((d: { productId: number; countedQuantity: number; notes: string }) => ({
                productId:       Number(d.productId),
                countedQuantity: Number(d.countedQuantity),
                notes:           d.notes || undefined
            }))
        };
        this.api.createInventoryCount(payload).subscribe({
            next: () => { this.submitting.set(false); this.closeDrawer(); this.loadCounts(); },
            error: (err: Error) => { this.submitting.set(false); this.submitError.set(err.message); }
        });
    }

    onPageChange(e: PaginationEvent): void {
        this.currentPage.set(e.page);
        this.pageSize.set(e.size);
        this.loadCounts();
    }

    getDetailCtrl(i: number, name: string): FormControl {
        return this.details.at(i).get(name) as FormControl;
    }

    getCtrl(name: string): FormControl { return this.form.get(name) as FormControl; }
}
