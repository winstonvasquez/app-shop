import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CatalogService } from '@core/services/catalog.service';
import { AuthService } from '@core/auth/auth.service';
import { RecepcionService, RecepcionPage, CreateRecepcionRequest } from '../../services/recepcion.service';
import { OrdenCompraService } from '../../services/orden-compra.service';
import { ProveedorService, ProveedorFiltroOption, toProveedorOptions } from '../../services/proveedor.service';
import { AlmacenService } from '../../../logistica/services/almacen.service';
import { almacenSelectSource } from '../../../logistica/components/select-sources';
import { ordenCompraSelectSource } from '../../components/select-sources';
import { Recepcion, RecepcionItem } from '../../models/orden-compra.model';
import { DataTableComponent, TableColumn, TableAction, FilterConfig, FilterChangeEvent, PaginationEvent, DateRangeFilterConfig, DateRangeChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { LoadingSpinnerComponent } from '@shared/ui/feedback/loading-spinner/loading-spinner.component';
import { PAGINATION } from '@shared/constants/app.constants';
import { ButtonComponent, ServerSearchSelectComponent, RichTextEditorComponent } from '@shared/components';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';

/** Ítem del form de alta de recepción: precargado desde la OC, `cantidadRecibida` editable por línea. */
export interface RecepcionItemForm {
    ordenItemId: string;
    productoNombre: string;
    cantidadPedida: number;
    cantidadRecibida: number;
}

@Component({
    selector: 'app-recepcion',
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
    ServerSearchSelectComponent,
    RichTextEditorComponent
  ],
    templateUrl: './recepcion.component.html'
})
export class RecepcionComponent implements OnInit {
    private readonly recepcionService = inject(RecepcionService);
    private readonly ordenCompraService = inject(OrdenCompraService);
    private readonly proveedorService = inject(ProveedorService);
    private readonly almacenService = inject(AlmacenService);
    private readonly authService = inject(AuthService);
    private readonly fb = inject(FormBuilder);
    readonly catalog = inject(CatalogService);

    // Data source para <app-server-search-select> de OC y de almacén (drawer de alta)
    readonly ordenCompraSource = ordenCompraSelectSource(this.ordenCompraService);
    readonly almacenSource = almacenSelectSource(this.almacenService, () => this.authService.currentUser()?.activeCompanyId);

    // ── Drawer: alta de recepción ──────────────────
    showCreateForm = signal(false);
    creating = signal(false);
    createError = signal<string | null>(null);
    loadingOrdenItems = signal(false);
    formItems = signal<RecepcionItemForm[]>([]);
    recepcionForm: FormGroup;

    recepciones = signal<Recepcion[]>([]);
    selectedRecepcion = signal<Recepcion | null>(null);

    cargando = signal(false);
    loadingDetail = signal(false);
    error = signal<string | null>(null);
    detailError = signal<string | null>(null);

    // Filtros (TODOS server-side — la vista nunca filtra la página cargada)
    estadoFiltro = signal('');
    filterAlmacenDestino = signal('');
    filterProveedorId = signal('');
    filterTransportista = signal('');
    filterResponsable = signal('');
    filterFechaRecepcionDesde = signal<string | null>(null);
    filterFechaRecepcionHasta = signal<string | null>(null);
    searchQuery = signal('');
    showDetail = signal(false);

    // Pagination
    currentPage = signal(0);
    pageSize = signal<number>(PAGINATION.defaultPageSize);
    totalElements = signal(0);
    totalPages = signal(0);

    hasRecepciones = computed(() => this.recepciones().length > 0);
    isEmpty = computed(() => !this.cargando() && !this.hasRecepciones());

    /** Almacenes para el select de filtro (lista acotada, no requiere server-search). */
    almacenesFiltro = signal<{ id: string; nombre: string }[]>([]);
    /** Proveedores activos para el select de filtro (lista acotada, no requiere server-search). */
    proveedoresFiltro = signal<ProveedorFiltroOption[]>([]);

    // Filtros select del toolbar. Las opciones salen de erp_parameters o de listas propias (fuente única).
    filters: FilterConfig[] = [
        catalogFilter(this.catalog, 'ESTADO_RECEPCION', 'estado', 'Estado'),
        signalFilter('almacenDestino', 'Almacén', this.almacenesFiltro,
            a => ({ value: a.id, label: a.nombre })),
        signalFilter('proveedorId', 'Proveedor', this.proveedoresFiltro,
            p => ({ value: p.id, label: p.razonSocial }))
    ];

    /** Rango de fecha de recepción para el toolbar del data-table. */
    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fechaRecepcion', label: 'Fecha de recepción' }
    ];

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: '/admin' },
        { label: 'Compras', url: '/admin/compras/dashboard' },
        { label: 'Recepción Mercadería' }
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (respeta el filtro de estado actual). Ver /purchases/api/recepciones/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.purchases}/api/recepciones/export`,
        filename: 'recepciones',
        params: () => ({
            q: this.searchQuery() || undefined,
            estado: this.estadoFiltro() || undefined,
            almacenDestino: this.filterAlmacenDestino() || undefined,
            proveedorId: this.filterProveedorId() || undefined,
            transportista: this.filterTransportista() || undefined,
            responsable: this.filterResponsable() || undefined,
            fechaRecepcionDesde: this.filterFechaRecepcionDesde() ?? undefined,
            fechaRecepcionHasta: this.filterFechaRecepcionHasta() ?? undefined
        }),
    };

    columns: TableColumn<Recepcion>[] = [
        {
            key: 'id', label: 'Recepción', width: '130px',
            render: (row) => `REC-${(row.id ?? '').toString().slice(0, 8).toUpperCase()}`
        },
        {
            key: 'ordenCompraCodigo', label: 'OC Referencia',
            render: (row) => row.ordenCompraCodigo ?? '—'
        },
        {
            key: 'fechaRecepcion', label: 'Fecha',
            render: (row) => row.fechaRecepcion
                ? new Date(row.fechaRecepcion).toLocaleDateString('es-PE') : '—'
        },
        {
            key: 'numeroGuia', label: 'Guía Remisión',
            render: (row) => row.numeroGuia ?? '—'
        },
        {
            key: 'estado', label: 'Estado', html: true,
            render: (row) => `<span class="badge badge-${this.badgeEstado(row.estado)}">${this.catalog.label('ESTADO_RECEPCION', row.estado)}</span>`
        }
    ];

    actions: TableAction<Recepcion>[] = [
        {
            label: 'Ver', icon: '👁️', class: 'btn-view',
            onClick: (row) => this.openDetail(row.id!)
        }
    ];

    constructor() {
        this.recepcionForm = this.fb.group({
            ordenCompraId: ['', Validators.required],
            numeroGuia: [''],
            transportista: [''],
            responsable: [''],
            fechaRecepcion: ['', Validators.required],
            almacenDestino: ['', Validators.required],
            observaciones: ['']
        });
    }

    ngOnInit(): void {
        this.loadRecepciones();
        this.loadAlmacenesFiltro();
        this.loadProveedoresFiltro();
        this.recepcionForm.get('ordenCompraId')!.valueChanges.subscribe((id: string | null) => {
            this.onOrdenSeleccionada(id);
        });
    }

    /** Almacenes para el select de filtro del toolbar. */
    private loadAlmacenesFiltro(): void {
        const companyId = this.authService.currentUser()?.activeCompanyId;
        if (!companyId) { this.almacenesFiltro.set([]); return; }
        this.almacenService.getAlmacenes(String(companyId), { size: PAGINATION.maxPageSize }).subscribe({
            next: (res) => this.almacenesFiltro.set(res.content ?? []),
            error: () => this.almacenesFiltro.set([])
        });
    }

    /** Proveedores activos para el select de filtro del toolbar. */
    private loadProveedoresFiltro(): void {
        this.proveedorService.getProveedores({ size: PAGINATION.maxPageSize, estado: 'ACTIVO' }).subscribe({
            next: (res) => this.proveedoresFiltro.set(toProveedorOptions(res.content)),
            error: () => this.proveedoresFiltro.set([])
        });
    }

    loadRecepciones(): void {
        this.cargando.set(true);
        this.error.set(null);
        this.recepcionService.getRecepciones({
            page: this.currentPage(),
            size: this.pageSize(),
            q: this.searchQuery() || undefined,
            estado: this.estadoFiltro() || undefined,
            almacenDestino: this.filterAlmacenDestino() || undefined,
            proveedorId: this.filterProveedorId() || undefined,
            transportista: this.filterTransportista() || undefined,
            responsable: this.filterResponsable() || undefined,
            fechaRecepcionDesde: this.filterFechaRecepcionDesde() || undefined,
            fechaRecepcionHasta: this.filterFechaRecepcionHasta() || undefined
        }).subscribe({
            next: (res: RecepcionPage) => {
                this.recepciones.set(res.content);
                this.totalElements.set(pageTotalElements(res));
                this.totalPages.set(pageTotalPages(res));
                this.cargando.set(false);
            },
            error: () => {
                this.error.set('No se pudieron cargar las recepciones.');
                this.cargando.set(false);
            }
        });
    }

    /** La búsqueda por texto también va al backend (`q`), no filtra la página cargada. */
    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.loadRecepciones();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'estado':          this.estadoFiltro.set(valor); break;
            case 'almacenDestino':  this.filterAlmacenDestino.set(valor); break;
            case 'proveedorId':     this.filterProveedorId.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadRecepciones();
    }

    /** Filtros de texto libre (exact-match en backend): transportista y responsable. */
    onFilterTransportista(valor: string): void {
        this.filterTransportista.set(valor);
        this.currentPage.set(0);
        this.loadRecepciones();
    }

    onFilterResponsable(valor: string): void {
        this.filterResponsable.set(valor);
        this.currentPage.set(0);
        this.loadRecepciones();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field === 'fechaRecepcion') {
            this.filterFechaRecepcionDesde.set(event.from);
            this.filterFechaRecepcionHasta.set(event.to);
            this.currentPage.set(0);
            this.loadRecepciones();
        }
    }

    /** "Limpiar filtros": resetea todo (incluidos los inputs de texto libre) y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.estadoFiltro.set('');
        this.filterAlmacenDestino.set('');
        this.filterProveedorId.set('');
        this.filterTransportista.set('');
        this.filterResponsable.set('');
        this.filterFechaRecepcionDesde.set(null);
        this.filterFechaRecepcionHasta.set(null);
        this.currentPage.set(0);
        this.loadRecepciones();
    }

    onPaginationChange(event: PaginationEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadRecepciones();
    }

    openDetail(id: string): void {
        this.loadingDetail.set(true);
        this.showDetail.set(true);
        this.selectedRecepcion.set(null);
        this.detailError.set(null);
        this.recepcionService.getRecepcionById(id).subscribe({
            next: (rec) => {
                this.selectedRecepcion.set(rec);
                this.loadingDetail.set(false);
            },
            error: (err: Error) => {
                this.detailError.set(err.message ?? 'Error al cargar el detalle.');
                this.loadingDetail.set(false);
            }
        });
    }

    closeDetail(): void {
        this.showDetail.set(false);
        this.selectedRecepcion.set(null);
        this.detailError.set(null);
    }

    confirmarRecepcion(): void {
        const rec = this.selectedRecepcion();
        if (!rec) return;
        this.loadingDetail.set(true);
        this.recepcionService.confirmarRecepcion(rec.id!).subscribe({
            next: (updated) => {
                this.selectedRecepcion.set(updated);
                this.recepciones.update(list =>
                    list.map(r => r.id === updated.id ? { ...r, estado: updated.estado } : r)
                );
                this.loadingDetail.set(false);
            },
            error: (err: Error) => {
                this.error.set(err.message);
                this.loadingDetail.set(false);
            }
        });
    }

    badgeEstado(estado: string): string {
        const map: Record<string, string> = {
            PENDIENTE: 'warning',
            CONFORME: 'success',
            CON_DIFERENCIAS: 'error',
            DIFERENCIA: 'error',
            COMPLETADA: 'success'
        };
        return map[estado] ?? 'neutral';
    }

    // ── Drawer: alta de recepción ──────────────────
    openCreateForm(): void {
        this.recepcionForm.reset({
            ordenCompraId: '',
            numeroGuia: '',
            transportista: '',
            responsable: '',
            fechaRecepcion: '',
            almacenDestino: '',
            observaciones: ''
        });
        this.formItems.set([]);
        this.createError.set(null);
        this.showCreateForm.set(true);
    }

    closeCreateForm(): void {
        this.showCreateForm.set(false);
        this.recepcionForm.reset();
        this.formItems.set([]);
    }

    /** Al elegir la OC en el selector, precarga sus ítems dejando `cantidadRecibida` editable por línea. */
    private onOrdenSeleccionada(ordenCompraId: string | null): void {
        if (!ordenCompraId) {
            this.formItems.set([]);
            return;
        }
        this.loadingOrdenItems.set(true);
        this.ordenCompraService.getOrdenById(ordenCompraId).subscribe({
            next: (orden) => {
                this.formItems.set((orden.items ?? []).map(i => ({
                    ordenItemId: i.id!,
                    productoNombre: i.productoNombre,
                    cantidadPedida: i.cantidad,
                    cantidadRecibida: i.cantidad
                })));
                // Sugiere el almacén destino de la OC si el usuario aún no eligió uno.
                if (!this.recepcionForm.get('almacenDestino')?.value) {
                    this.recepcionForm.patchValue({ almacenDestino: orden.almacenDestino }, { emitEvent: false });
                }
                this.loadingOrdenItems.set(false);
            },
            error: () => {
                this.formItems.set([]);
                this.createError.set('No se pudieron cargar los ítems de la OC seleccionada.');
                this.loadingOrdenItems.set(false);
            }
        });
    }

    updateCantidadRecibida(index: number, value: number): void {
        this.formItems.update(items => {
            const updated = [...items];
            updated[index] = { ...updated[index], cantidadRecibida: value };
            return updated;
        });
    }

    submitCreate(): void {
        if (this.recepcionForm.invalid || this.formItems().length === 0) {
            this.recepcionForm.markAllAsTouched();
            return;
        }
        this.creating.set(true);
        this.createError.set(null);

        const fv = this.recepcionForm.value;
        const payload: CreateRecepcionRequest = {
            ordenCompraId: fv.ordenCompraId ?? '',
            numeroGuia: fv.numeroGuia || undefined,
            transportista: fv.transportista || undefined,
            fechaRecepcion: fv.fechaRecepcion || undefined,
            responsable: fv.responsable || undefined,
            almacenDestino: fv.almacenDestino || undefined,
            observaciones: fv.observaciones || undefined,
            items: this.formItems().map(i => ({ ordenItemId: i.ordenItemId, cantidadRecibida: i.cantidadRecibida }))
        };

        this.recepcionService.createRecepcion(payload).subscribe({
            next: () => {
                this.creating.set(false);
                this.closeCreateForm();
                this.loadRecepciones();
            },
            error: (err: Error) => {
                this.createError.set(err.message ?? 'Error al registrar la recepción.');
                this.creating.set(false);
            }
        });
    }
}

