import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { CatalogService } from '@core/services/catalog.service';
import { AuthService } from '@core/auth/auth.service';
import { OrdenCompraService } from '../../services/orden-compra.service';
import { ProveedorService, ProveedorFiltroOption, toProveedorOptions } from '../../services/proveedor.service';
import { OrdenCompra } from '../../models/orden-compra.model';
import { DataTableComponent, TableColumn, TableAction, SortEvent, FilterConfig, FilterChangeEvent, PaginationEvent, DateRangeFilterConfig, DateRangeChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { LoadingSpinnerComponent } from '@shared/ui/feedback/loading-spinner/loading-spinner.component';
import { ButtonComponent, CatalogSelectComponent, ServerSearchSelectComponent, RichTextEditorComponent } from '@shared/components';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { SUNAT_RATES, MONEDA, Moneda } from '@shared/constants/sunat.constants';
import { PAGINATION } from '@shared/constants/app.constants';
import { bloquearEnEdicion } from '@shared/utils/form-lock';
import { proveedorSelectSource } from '../../components/select-sources';
import { AlmacenService } from '../../../logistica/services/almacen.service';
import { almacenSelectSource } from '../../../logistica/components/select-sources';
import { ProductLookupComponent } from '../../../inventory/components/product-lookup/product-lookup.component';
import { ProductResponse } from '@core/models/product.model';
import { productIdToUuid } from '../../../inventory/utils/synthetic-uuid.util';
import { mensajeDeErrorHttp } from '@core/utils/http-error.util';
import {
    accionesOrdenCompra, avisoTrasAprobar, claseBadgeEstadoOrden, construirPayloadOrdenCompra, etiquetaEstadoOrden,
    itemsOrdenIncompletos, lineasEdicionOrdenCompra, OcItemForm, valoresEdicionOrdenCompra
} from './ordenes-compra.form';

export type { OcItemForm } from './ordenes-compra.form';

/** Opción de Contrato Marco para el select del formulario de OC (GET /api/contratos?estado=ACTIVO). */
export interface ContratoActivoOption {
    id: string;
    codigo: string;
    proveedorNombre?: string;
}

@Component({
    selector: 'app-ordenes-compra',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    ReactiveFormsModule,
    DataTableComponent,
    DrawerComponent,
    DateInputComponent,
    PageHeaderComponent,
    AlertComponent,
    LoadingSpinnerComponent,
    DatePipe,
    ButtonComponent,
    CatalogSelectComponent,
    ServerSearchSelectComponent,
    ProductLookupComponent,
    RichTextEditorComponent
  ],
    templateUrl: './ordenes-compra.component.html'
})
export class OrdenesCompraComponent implements OnInit {
    private readonly ordenService = inject(OrdenCompraService);
    private readonly proveedorService = inject(ProveedorService);
    private readonly almacenService = inject(AlmacenService);
    private readonly authService = inject(AuthService);
    private readonly http = inject(HttpClient);
    private readonly fb = inject(FormBuilder);
    readonly catalog = inject(CatalogService);

    // Data
    ordenes = signal<OrdenCompra[]>([]);
    selectedOrden = signal<OrdenCompra | null>(null);

    /** Contratos Marco ACTIVOS, para el select opcional del formulario de OC. */
    contratosActivos = signal<ContratoActivoOption[]>([]);

    // Data source para <app-server-search-select> de proveedor y de almacén
    readonly proveedorSource = proveedorSelectSource(this.proveedorService);
    readonly almacenSource = almacenSelectSource(this.almacenService, () => this.authService.currentUser()?.activeCompanyId);

    /** Índice del ítem con el mini-panel de búsqueda de producto abierto (null = cerrado). */
    lookupOpenIndex = signal<number | null>(null);

    // UI state
    loading = signal(false);
    loadingDetail = signal(false);
    error = signal<string | null>(null);
    showForm = signal(false);
    showDetail = signal(false);
    editMode = signal(false);
    submitting = signal(false);
    submitError = signal<string | null>(null);
    /** Aviso informativo de la última acción (p. ej. «Enviada a aprobación»). */
    aviso = signal<string | null>(null);
    /** Error de la última acción del drawer de detalle (el 400 de negocio del backend). */
    avisoError = signal<string | null>(null);
    /** Acciones del drawer de detalle según el estado de la OC abierta. */
    acciones = computed(() => accionesOrdenCompra(this.selectedOrden()?.estado));

    // Items para el formulario
    formItems = signal<OcItemForm[]>([]);

    // Filtros (TODOS server-side — la vista nunca filtra la página cargada)
    filterEstado = signal('');
    filterCondicionPago = signal('');
    filterProveedorId = signal('');
    filterMoneda = signal('');
    filterFechaEmisionDesde = signal<string | null>(null);
    filterFechaEmisionHasta = signal<string | null>(null);
    searchQuery = signal('');

    // Pagination
    currentPage = signal(0);
    pageSize = signal<number>(PAGINATION.defaultPageSize);
    totalElements = signal(0);
    totalPages = signal(0);

    // Sort
    sortField = signal('fechaEmision');
    sortDirection = signal<'asc' | 'desc'>('desc');

    // Computed
    hasOrdenes = computed(() => this.ordenes().length > 0);
    isEmpty = computed(() => !this.loading() && !this.hasOrdenes());

    totales = computed(() => {
        const items = this.formItems();
        const subtotal = items.reduce((acc, i) => acc + (i.cantidad * i.precioUnitario), 0);
        const igv = subtotal * SUNAT_RATES.IGV;
        return { subtotal, igv, total: subtotal + igv };
    });

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: '/admin' },
        { label: 'Compras', url: '/admin/compras/dashboard' },
        { label: 'Órdenes de Compra' }
    ];

    /** Proveedores activos para el select de filtro (lista acotada, no requiere server-search). */
    proveedoresFiltro = signal<ProveedorFiltroOption[]>([]);

    // Filtros select del toolbar. Las opciones salen de erp_parameters (fuente única).
    filters: FilterConfig[] = [
        catalogFilter(this.catalog, 'ESTADO_ORDEN_COMPRA', 'estado', 'Estado'),
        catalogFilter(this.catalog, 'CONDICION_PAGO', 'condicionPago', 'Cond. de pago'),
        catalogFilter(this.catalog, 'MONEDA', 'moneda', 'Moneda'),
        signalFilter('proveedorId', 'Proveedor', this.proveedoresFiltro,
            p => ({ value: p.id, label: p.razonSocial }))
    ];

    /** Rango de fecha de emisión para el toolbar del data-table. */
    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fechaEmision', label: 'Fecha de emisión' }
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (respeta los filtros actuales). Ver /purchases/api/ordenes-compra/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.purchases}/api/ordenes-compra/export`,
        filename: 'ordenes-compra',
        params: () => ({
            q: this.searchQuery(),
            estado: this.filterEstado(),
            condicionPago: this.filterCondicionPago(),
            proveedorId: this.filterProveedorId(),
            moneda: this.filterMoneda(),
            fechaEmisionDesde: this.filterFechaEmisionDesde() ?? undefined,
            fechaEmisionHasta: this.filterFechaEmisionHasta() ?? undefined
        }),
    };

    columns: TableColumn<OrdenCompra>[] = [
        { key: 'codigo', label: 'OC #', sortable: true, width: '130px' },
        {
            key: 'fechaEmision', label: 'Fecha', sortable: true,
            render: (r) => r.fechaEmision ? new Date(r.fechaEmision).toLocaleDateString('es-PE') : '—'
        },
        { key: 'proveedorNombre', label: 'Proveedor', render: (r) => r.proveedorNombre ?? '—' },
        {
            key: 'condicionPago', label: 'Cond. Pago',
            render: (r) => r.condicionPago.replace('_', ' ')
        },
        {
            key: 'total', label: 'Total', align: 'right', sortable: true,
            render: (r) => `S/ ${(r.total ?? 0).toFixed(2)}`
        },
        {
            key: 'estado', label: 'Estado', html: true,
            render: (r) => `<span class="badge badge-${this.badgeEstado(r.estado)}">${this.etiquetaEstado(r.estado)}</span>`
        }
    ];

    actions: TableAction<OrdenCompra>[] = [
        {
            label: 'Ver', icon: '👁️', class: 'btn-view',
            onClick: (row) => this.openDetail(row.id!)
        },
        {
            label: 'Editar', icon: '✏️', class: 'btn-edit',
            show: (row) => row.estado === 'BORRADOR',
            onClick: (row) => this.openEditForm(row)
        }
    ];

    ocForm: FormGroup;

    constructor() {
        this.ocForm = this.fb.group({
            // Correlativo emitido por el backend: se muestra al editar, nunca se edita.
            codigo: [''],
            proveedorId: ['', Validators.required],
            fechaEmision: ['', Validators.required],
            fechaEntregaEstimada: [''],
            condicionPago: ['CONTADO', Validators.required],
            almacenDestino: ['', Validators.required],
            observaciones: [''],
            contratoId: [''],
            moneda: [MONEDA.PEN as Moneda],
            tipoCambio: [null as number | null]
        });
    }

    ngOnInit(): void {
        this.loadOrdenes();
        this.loadContratosActivos();
        this.loadProveedoresFiltro();
    }

    /** Proveedores activos para el select de filtro del toolbar. */
    private loadProveedoresFiltro(): void {
        const params = new HttpParams()
            .set('estado', 'ACTIVO')
            .set('page', '0')
            .set('size', String(PAGINATION.maxPageSize));
        this.http.get<{ content?: { id: string; razonSocial: string }[] }>(
            `${environment.apiUrls.purchases}/api/proveedores`, { params }
        ).subscribe({
            next: (res) => this.proveedoresFiltro.set(toProveedorOptions(res.content)),
            error: () => this.proveedoresFiltro.set([])
        });
    }

    /** Contratos Marco ACTIVOS para el select opcional del form (lista chica, no requiere server-search). */
    private loadContratosActivos(): void {
        const params = new HttpParams()
            .set('estado', 'ACTIVO')
            .set('page', '0')
            .set('size', String(PAGINATION.maxPageSize));
        this.http.get<{ content?: ContratoActivoOption[] }>(
            `${environment.apiUrls.purchases}/api/contratos`, { params }
        ).subscribe({
            next: (res) => this.contratosActivos.set(res.content ?? []),
            error: () => this.contratosActivos.set([])
        });
    }

    /** true si la moneda seleccionada en el form NO es PEN (habilita el campo Tipo de Cambio). */
    monedaDistintaDePEN(): boolean {
        return this.ocForm.get('moneda')?.value !== MONEDA.PEN;
    }

    loadOrdenes(): void {
        this.loading.set(true);
        this.error.set(null);
        this.ordenService.getOrdenes({
            page: this.currentPage(),
            size: this.pageSize(),
            q: this.searchQuery() || undefined,
            estado: this.filterEstado() || undefined,
            condicionPago: this.filterCondicionPago() || undefined,
            proveedorId: this.filterProveedorId() || undefined,
            moneda: this.filterMoneda() || undefined,
            fechaEmisionDesde: this.filterFechaEmisionDesde() || undefined,
            fechaEmisionHasta: this.filterFechaEmisionHasta() || undefined,
            sortField: this.sortField() || undefined,
            sortDirection: this.sortDirection()
        }).subscribe({
            next: (res) => {
                this.ordenes.set(res.content);
                this.totalElements.set(pageTotalElements(res));
                this.totalPages.set(pageTotalPages(res));
                this.loading.set(false);
            },
            error: (err: Error) => {
                this.error.set(err.message);
                this.loading.set(false);
            }
        });
    }

    /** La búsqueda por texto también va al backend (`q`), no filtra la página cargada. */
    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.loadOrdenes();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'estado':        this.filterEstado.set(valor); break;
            case 'condicionPago': this.filterCondicionPago.set(valor); break;
            case 'proveedorId':   this.filterProveedorId.set(valor); break;
            case 'moneda':        this.filterMoneda.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadOrdenes();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterEstado.set('');
        this.filterCondicionPago.set('');
        this.filterProveedorId.set('');
        this.filterMoneda.set('');
        this.filterFechaEmisionDesde.set(null);
        this.filterFechaEmisionHasta.set(null);
        this.currentPage.set(0);
        this.loadOrdenes();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field === 'fechaEmision') {
            this.filterFechaEmisionDesde.set(event.from);
            this.filterFechaEmisionHasta.set(event.to);
            this.currentPage.set(0);
            this.loadOrdenes();
        }
    }

    onSort(event: SortEvent): void {
        this.sortField.set(event.field);
        this.sortDirection.set(event.direction);
        this.currentPage.set(0);
        this.loadOrdenes();
    }

    onPaginationChange(event: PaginationEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadOrdenes();
    }

    // ── Detail drawer ──────────────────────────────
    openDetail(id: string): void {
        this.loadingDetail.set(true);
        this.showDetail.set(true);
        this.aviso.set(null);
        this.avisoError.set(null);
        this.selectedOrden.set(null);
        this.ordenService.getOrdenById(id).subscribe({
            next: (orden) => {
                this.selectedOrden.set(orden);
                this.loadingDetail.set(false);
            },
            error: (err: Error) => {
                this.error.set(err.message);
                this.loadingDetail.set(false);
                this.showDetail.set(false);
            }
        });
    }

    closeDetail(): void {
        this.showDetail.set(false);
        this.selectedOrden.set(null);
    }

    updateEstado(accion: 'APROBADA' | 'ENVIADA' | 'CANCELADA' | 'CERRAR_SALDO'): void {
        const orden = this.selectedOrden();
        if (!orden) return;
        if (accion === 'CANCELADA' && !confirm('¿Cancelar esta orden de compra? Se libera el presupuesto comprometido.')) return;
        if (accion === 'CERRAR_SALDO' && !confirm(
            'Se da por recibida la OC y se libera el presupuesto no recibido. ¿Cerrar el saldo?')) return;
        this.loadingDetail.set(true);
        this.aviso.set(null);
        this.avisoError.set(null);

        const op = accion === 'CANCELADA'
            ? this.ordenService.cancelarOrden(orden.id!)
            : accion === 'CERRAR_SALDO'
                ? this.ordenService.cerrarSaldo(orden.id!)
                : accion === 'ENVIADA'
                    ? this.ordenService.enviarAlProveedor(orden.id!)
                    : this.ordenService.aprobarOrden(orden.id!);

        op.subscribe({
            next: (updated) => {
                this.selectedOrden.set(updated);
                this.ordenes.update(list =>
                    list.map(o => o.id === updated.id ? { ...o, estado: updated.estado } : o)
                );
                if (accion === 'APROBADA') this.aviso.set(avisoTrasAprobar(updated.estado));
                this.loadingDetail.set(false);
            },
            error: (err: HttpErrorResponse) => {
                // En el propio drawer: el alert de página queda tapado por el overlay.
                this.avisoError.set(mensajeDeErrorHttp(err));
                this.loadingDetail.set(false);
            }
        });
    }

    /** Etiqueta visible del estado (PENDIENTE = «En aprobación»). */
    etiquetaEstado(estado: string | null | undefined): string {
        return etiquetaEstadoOrden(estado, this.catalog.label('ESTADO_ORDEN_COMPRA', estado));
    }

    // ── Form drawer ────────────────────────────────
    openCreateForm(): void {
        this.editMode.set(false);
        this.selectedOrden.set(null);
        this.ocForm.reset({
            codigo: '',
            condicionPago: 'CONTADO',
            almacenDestino: '',
            contratoId: '',
            moneda: MONEDA.PEN,
            tipoCambio: null
        });
        bloquearEnEdicion(this.ocForm, ['codigo'], false);
        this.formItems.set([this.emptyItem()]);
        this.lookupOpenIndex.set(null);
        this.submitError.set(null);
        this.showForm.set(true);
    }

    openEditForm(orden: OrdenCompra): void {
        this.editMode.set(true);
        this.selectedOrden.set(orden);
        this.ocForm.patchValue(valoresEdicionOrdenCompra(orden));
        bloquearEnEdicion(this.ocForm, ['codigo'], true);
        this.formItems.set(lineasEdicionOrdenCompra(orden));
        this.lookupOpenIndex.set(null);
        this.submitError.set(null);
        this.showForm.set(true);
    }

    closeForm(): void {
        this.showForm.set(false);
        this.ocForm.reset();
        this.formItems.set([]);
        this.lookupOpenIndex.set(null);
    }

    addItem(): void {
        this.formItems.update(items => [...items, this.emptyItem()]);
    }

    removeItem(index: number): void {
        this.formItems.update(items => items.filter((_, i) => i !== index));
        if (this.lookupOpenIndex() === index) {
            this.lookupOpenIndex.set(null);
        }
    }

    updateItem(index: number, field: keyof OcItemForm, value: string | number): void {
        this.formItems.update(items => {
            const updated = [...items];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    }

    /** Abre/cierra el mini-panel de búsqueda de producto para el ítem `index`. */
    toggleLookup(index: number): void {
        this.lookupOpenIndex.set(this.lookupOpenIndex() === index ? null : index);
    }

    /** Aplica el producto elegido en `<app-product-lookup>` al ítem `index`. */
    onProductoSeleccionado(index: number, product: ProductResponse): void {
        this.updateItem(index, 'productoId', productIdToUuid(product.id));
        this.updateItem(index, 'productoNombre', product.nombre);
        if (!this.formItems()[index].precioUnitario) {
            this.updateItem(index, 'precioUnitario', product.precioBase);
        }
        this.lookupOpenIndex.set(null);
    }

    private emptyItem(): OcItemForm {
        return { productoId: undefined, productoNombre: '', sku: '', cantidad: 1, precioUnitario: 0 };
    }

    onSubmit(): void {
        if (this.ocForm.invalid) {
            this.ocForm.markAllAsTouched();
            return;
        }
        if (this.formItems().length === 0) {
            this.submitError.set('Debe agregar al menos un producto.');
            return;
        }
        if (itemsOrdenIncompletos(this.formItems())) {
            this.submitError.set('Verifique que todos los productos tengan nombre, cantidad y precio.');
            return;
        }

        this.submitting.set(true);
        this.submitError.set(null);

        // getRawValue(): `codigo` está deshabilitado en edición y no aparecería en `.value`.
        // Se descarta dentro de `construirPayloadOrdenCompra`: el correlativo lo emite el backend.
        const payload: Partial<OrdenCompra> = construirPayloadOrdenCompra(
            this.ocForm.getRawValue(),
            this.formItems(),
            this.totales()
        );

        const op = this.editMode()
            ? this.ordenService.updateOrden(this.selectedOrden()!.id!, payload)
            : this.ordenService.createOrden(payload);

        op.subscribe({
            next: () => {
                this.submitting.set(false);
                this.closeForm();
                this.loadOrdenes();
            },
            error: (err: Error) => {
                this.submitError.set(err.message);
                this.submitting.set(false);
            }
        });
    }

    badgeEstado(estado: string): string {
        return claseBadgeEstadoOrden(estado);
    }

    getControl(name: string): FormControl {
        return this.ocForm.get(name) as FormControl;
    }
}
