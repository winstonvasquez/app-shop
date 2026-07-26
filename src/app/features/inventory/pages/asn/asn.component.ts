import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import {
    InventoryApiService, Asn, CreateAsnLineRequest, ReceiveAsnLine
} from '../../services/inventory-api.service';
import { Warehouse } from '../../models/inventory.models';
import { DataTableComponent, TableColumn, TableAction, PaginationEvent } from '@shared/ui/tables/data-table/data-table.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { ButtonComponent, CatalogSelectComponent, ServerSearchSelectComponent } from '@shared/components';
import { ProductLookupComponent } from '../../components/product-lookup/product-lookup.component';
import { ProductResponse } from '@core/models/product.model';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { ROUTES } from '@shared/constants/app.constants';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import { warehouseSelectSource } from '../../components/select-sources';

/** Línea en construcción dentro del drawer de creación. */
interface AsnLineDraft {
    productId: number;
    productName: string;
    sku?: string;
    expectedQuantity: number;
    unitCost?: number;
}

type AsnRow = Asn & { warehouseName: string };

@Component({
    selector: 'app-asn',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule, FormsModule, DataTableComponent, DrawerComponent,
        PageHeaderComponent, AlertComponent, FormFieldComponent, DateInputComponent,
        ButtonComponent, ProductLookupComponent, CatalogSelectComponent, ServerSearchSelectComponent
    ],
    template: `
        <div class="page-container">
            <app-page-header
                title="Recepción (ASN)"
                subtitle="Anuncia entregas esperadas y recíbelas confirmando cantidades reales. Las diferencias quedan registradas (CONFORME / CON DIFERENCIAS) y solo lo recibido impacta el kardex."
                [breadcrumbs]="breadcrumbs">
                <div actions>
                    <app-button icon="plus" label="Nuevo ASN" variant="primary" (click)="openCreate()" />
                </div>
            </app-page-header>

            <div class="filters-bar">
                <div class="filter-field">
                    <label class="input-label">Estado</label>
                    <app-catalog-select tabla="ESTADO_ASN" style="min-width:200px"
                        [ngModel]="filterStatus()"
                        (ngModelChange)="onFilterStatus($event)"
                        placeholder="Todos">
                    </app-catalog-select>
                </div>
            </div>

            @if (error()) {
                <app-alert type="error" [message]="error()!" [dismissible]="true" (dismiss)="error.set(null)" />
            }
            @if (info()) {
                <app-alert type="success" [message]="info()!" [dismissible]="true" (dismiss)="info.set(null)" />
            }

            <app-data-table
                [data]="rows()"
                [columns]="columns"
                [loading]="loading()"
                [actions]="actions"
                [currentPage]="currentPage()"
                [pageSize]="pageSize()"
                [totalElements]="totalElements()"
                [totalPages]="totalPages()"
                [exportConfig]="exportConfig"
                (pageChange)="onPageChange($event)">
            </app-data-table>
        </div>

        <!-- Drawer: crear ASN -->
        <app-drawer [isOpen]="showCreate()" title="Nuevo ASN" size="lg" side="right" [hasFooter]="true"
                    (closed)="closeCreate()">
            <form [formGroup]="form">
                @if (createError()) {
                    <app-alert type="error" [message]="createError()!" [dismissible]="true" (dismiss)="createError.set(null)" />
                }
                <div class="drawer-form-grid">
                    <app-form-field label="Proveedor" [control]="getCtrl('supplierName')" type="text"
                        placeholder="Nombre del proveedor" />
                    <app-form-field label="Documento referencia" [control]="getCtrl('referenceDocument')" type="text"
                        placeholder="Ej: OC-001 / guía" />
                    <div>
                        <label class="input-label">Almacén destino <span class="text-error">*</span></label>
                        <app-server-search-select [dataSource]="warehouseSource" formControlName="warehouseId"
                            placeholder="Buscar almacén…" />
                    </div>
                    <div>
                        <app-date-input label="Fecha esperada" formControlName="expectedDate" />
                    </div>
                    <div class="col-span-2">
                        <app-form-field label="Notas" [control]="getCtrl('notes')" type="text"
                            placeholder="Observaciones" />
                    </div>
                </div>

                <div class="items-section">
                    <div class="items-header">
                        <span class="input-label">Productos esperados <span class="text-error">*</span></span>
                    </div>
                    <app-product-lookup placeholder="Buscar producto para agregar al ASN"
                        (selected)="onAddLine($event)" />

                    @if (createLines().length) {
                        <table class="table" style="margin-top:0.75rem;width:100%">
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th style="width:120px">Cant. esperada</th>
                                    <th style="width:120px">Costo unit.</th>
                                    <th style="width:40px"></th>
                                </tr>
                            </thead>
                            <tbody>
                                @for (l of createLines(); track l.productId; let i = $index) {
                                    <tr>
                                        <td>{{ l.productName }} <span class="text-subtle" style="font-size:0.72rem">#{{ l.productId }}</span></td>
                                        <td><input class="form-input" type="number" min="0.0001" step="any"
                                            [value]="l.expectedQuantity" (input)="onLineQty(i, $any($event.target).value)" /></td>
                                        <td><input class="form-input" type="number" min="0" step="any"
                                            [value]="l.unitCost ?? null" (input)="onLineCost(i, $any($event.target).value)" /></td>
                                        <td><app-button [iconOnly]="true" icon="x" variant="danger" size="sm"
                                            ariaLabel="Quitar" label="Quitar" (click)="removeLine(i)" /></td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    } @else {
                        <p class="text-subtle text-xs" style="margin-top:0.5rem">Agregá al menos un producto esperado.</p>
                    }
                </div>
            </form>

            <div slot="footer">
                <app-button icon="x" label="Cancelar" variant="secondary" (click)="closeCreate()" />
                <app-button icon="check" label="Crear ASN" variant="primary"
                    [loading]="submittingCreate()" [disabled]="form.invalid || createLines().length === 0"
                    (click)="submitCreate()" />
            </div>
        </app-drawer>

        <!-- Drawer: recibir ASN -->
        <app-drawer [isOpen]="showReceive()" [title]="receiveTitle()" size="lg" side="right" [hasFooter]="true"
                    (closed)="closeReceive()">
            @if (receiveTarget(); as asn) {
                @if (receiveError()) {
                    <app-alert type="error" [message]="receiveError()!" [dismissible]="true" (dismiss)="receiveError.set(null)" />
                }
                <p class="text-subtle" style="font-size:0.85rem;margin-bottom:0.75rem">
                    Confirmá las cantidades efectivamente recibidas. Por defecto se asume lo esperado.
                </p>
                <table class="table" style="width:100%">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th style="width:110px">Esperado</th>
                            <th style="width:130px">Recibido</th>
                        </tr>
                    </thead>
                    <tbody>
                        @for (l of asn.lines; track l.id) {
                            <tr>
                                <td>{{ l.productName || ('Producto #' + l.productId) }}</td>
                                <td>{{ l.expectedQuantity }}</td>
                                <td><input class="form-input" type="number" min="0" step="any"
                                    [value]="receiveQty()[l.id] ?? l.expectedQuantity"
                                    (input)="onReceiveQty(l.id, $any($event.target).value)" /></td>
                            </tr>
                        }
                    </tbody>
                </table>
            }
            <div slot="footer">
                <app-button icon="x" label="Cancelar" variant="secondary" (click)="closeReceive()" />
                <app-button icon="check" label="Confirmar recepción" variant="primary"
                    [loading]="submittingReceive()" (click)="submitReceive()" />
            </div>
        </app-drawer>
    `
})
export class AsnComponent {
    private readonly api = inject(InventoryApiService);
    private readonly fb = inject(FormBuilder);

    readonly warehouseSource = warehouseSelectSource(this.api);

    asns = signal<Asn[]>([]);
    warehouses = signal<Warehouse[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);
    info = signal<string | null>(null);

    currentPage = signal(0);
    pageSize = signal(20);
    totalElements = signal(0);
    totalPages = signal(0);
    filterStatus = signal('');

    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.inventory}/api/inventory/asn/export`,
        filename: 'asn',
        params: () => ({ status: this.filterStatus() || undefined })
    };

    // create
    showCreate = signal(false);
    createLines = signal<AsnLineDraft[]>([]);
    submittingCreate = signal(false);
    createError = signal<string | null>(null);

    // receive
    showReceive = signal(false);
    receiveTarget = signal<Asn | null>(null);
    receiveQty = signal<Record<number, number>>({});
    submittingReceive = signal(false);
    receiveError = signal<string | null>(null);

    readonly receiveTitle = computed(() => {
        const a = this.receiveTarget();
        return a ? `Recibir ${a.asnNumber}` : 'Recibir ASN';
    });

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: ROUTES.admin },
        { label: 'Inventario', url: '/admin/inventario/dashboard' },
        { label: 'Recepción (ASN)' }
    ];

    readonly statusLabels: Record<string, string> = {
        PENDIENTE: 'Pendiente',
        CONFORME: 'Conforme',
        CON_DIFERENCIAS: 'Con diferencias'
    };

    /** Filas enriquecidas con el nombre del almacén (reactivo a warehouses). */
    readonly rows = computed<AsnRow[]>(() => {
        const whs = this.warehouses();
        return this.asns().map(a => ({
            ...a,
            warehouseName: whs.find(w => w.id === a.warehouseId)?.name ?? String(a.warehouseId)
        }));
    });

    columns: TableColumn<AsnRow>[] = [
        { key: 'asnNumber', label: 'N°', width: '130px', render: (r) => r.asnNumber },
        { key: 'supplierName', label: 'Proveedor', render: (r) => r.supplierName ?? '—' },
        { key: 'warehouseName', label: 'Almacén', render: (r) => r.warehouseName },
        { key: 'expectedDate', label: 'Fecha esperada',
          render: (r) => r.expectedDate ? new Date(r.expectedDate).toLocaleDateString('es-PE') : '—' },
        {
            key: 'status', label: 'Estado', html: true,
            render: (r) => {
                const cls = r.status === 'CONFORME' ? 'badge-success'
                    : r.status === 'CON_DIFERENCIAS' ? 'badge-error' : 'badge-warning';
                return `<span class="badge ${cls}">${this.statusLabels[r.status] ?? r.status}</span>`;
            }
        }
    ];

    actions: TableAction<AsnRow>[] = [
        {
            label: 'Recibir', class: 'btn btn-primary',
            show: (r) => r.status === 'PENDIENTE',
            onClick: (r) => this.openReceive(r)
        }
    ];

    form: FormGroup = this.fb.nonNullable.group({
        supplierName:      [''],
        referenceDocument: [''],
        warehouseId:       [null as number | null, Validators.required],
        expectedDate:      [''],
        notes:             ['']
    });

    constructor() {
        this.loadWarehouses();
        this.load();
    }

    loadWarehouses(): void {
        this.api.getWarehouses().subscribe({ next: (d) => this.warehouses.set(d) });
    }

    load(): void {
        this.loading.set(true);
        this.api.getAsnList({
            status: this.filterStatus() || undefined,
            page: this.currentPage(),
            size: this.pageSize()
        }).subscribe({
            next: (res) => {
                this.asns.set(res.content);
                this.totalElements.set(pageTotalElements(res));
                this.totalPages.set(pageTotalPages(res));
                this.loading.set(false);
            },
            error: (err: Error) => { this.error.set(err.message); this.loading.set(false); }
        });
    }

    onFilterStatus(value: string): void {
        this.filterStatus.set(value);
        this.currentPage.set(0);
        this.load();
    }

    onPageChange(e: PaginationEvent): void {
        this.currentPage.set(e.page);
        this.pageSize.set(e.size);
        this.load();
    }

    // ── crear ──────────────────────────────────────────
    openCreate(): void {
        this.form.reset();
        this.createLines.set([]);
        this.createError.set(null);
        this.showCreate.set(true);
    }
    closeCreate(): void { this.showCreate.set(false); }

    onAddLine(p: ProductResponse): void {
        if (this.createLines().some(l => l.productId === p.id)) return;
        this.createLines.update(ls => [...ls, {
            productId: p.id, productName: p.nombre, expectedQuantity: 1
        }]);
    }
    onLineQty(i: number, value: string): void {
        const n = Number(value);
        this.createLines.update(ls => ls.map((l, idx) => idx === i ? { ...l, expectedQuantity: n } : l));
    }
    onLineCost(i: number, value: string): void {
        const n = value === '' ? undefined : Number(value);
        this.createLines.update(ls => ls.map((l, idx) => idx === i ? { ...l, unitCost: n } : l));
    }
    removeLine(i: number): void {
        this.createLines.update(ls => ls.filter((_, idx) => idx !== i));
    }

    submitCreate(): void {
        // Guard de doble-submit: ignora clicks re-entrantes mientras la petición está en curso
        // (además del disabled del botón vía [loading]="submittingCreate()", defensa explícita aquí).
        if (this.submittingCreate()) return;
        if (this.form.invalid || this.createLines().length === 0) { this.form.markAllAsTouched(); return; }
        const v = this.form.getRawValue();
        const lines: CreateAsnLineRequest[] = this.createLines().map(l => ({
            productId: l.productId,
            productName: l.productName,
            expectedQuantity: Number(l.expectedQuantity),
            unitCost: l.unitCost != null ? Number(l.unitCost) : undefined
        }));
        this.submittingCreate.set(true);
        this.api.createAsn({
            supplierName: v.supplierName || undefined,
            referenceDocument: v.referenceDocument || undefined,
            warehouseId: Number(v.warehouseId),
            expectedDate: v.expectedDate || undefined,
            notes: v.notes || undefined,
            lines
        }).subscribe({
            next: (asn) => {
                this.submittingCreate.set(false);
                this.closeCreate();
                this.info.set(`ASN ${asn.asnNumber} creado.`);
                this.load();
            },
            error: (err: Error) => { this.submittingCreate.set(false); this.createError.set(err.message); }
        });
    }

    // ── recibir ────────────────────────────────────────
    openReceive(asn: Asn): void {
        this.receiveTarget.set(asn);
        const init: Record<number, number> = {};
        for (const l of asn.lines) { init[l.id] = l.expectedQuantity; }
        this.receiveQty.set(init);
        this.receiveError.set(null);
        this.showReceive.set(true);
    }
    closeReceive(): void { this.showReceive.set(false); this.receiveTarget.set(null); }

    onReceiveQty(lineId: number, value: string): void {
        const n = Number(value);
        this.receiveQty.update(q => ({ ...q, [lineId]: n }));
    }

    submitReceive(): void {
        const asn = this.receiveTarget();
        if (!asn) return;
        const q = this.receiveQty();
        const lines: ReceiveAsnLine[] = asn.lines.map(l => ({
            lineId: l.id,
            receivedQuantity: q[l.id] ?? l.expectedQuantity
        }));
        this.submittingReceive.set(true);
        this.api.receiveAsn(asn.id, { lines }).subscribe({
            next: (updated) => {
                this.submittingReceive.set(false);
                this.closeReceive();
                this.info.set(`ASN ${updated.asnNumber} recibido: ${this.statusLabels[updated.status] ?? updated.status}.`);
                this.load();
            },
            error: (err: Error) => { this.submittingReceive.set(false); this.receiveError.set(err.message); }
        });
    }

    getCtrl(name: string): FormControl { return this.form.get(name) as FormControl; }
}
