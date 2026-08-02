import {
    Component,
    OnInit,
    inject,
    signal,
    computed,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormGroup } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { DevolucionService } from '../../services/devolucion.service';
import { CrearDevolucionRequest, Devolucion } from '../../models/devolucion.model';
import { OrdenCompraService } from '../../services/orden-compra.service';
import { RecepcionService } from '../../services/recepcion.service';
import { ordenCompraSelectSource } from '../../components/select-sources';
import { OrdenCompraItem, Recepcion } from '../../models/orden-compra.model';
import { PAGINATION } from '@shared/constants/app.constants';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { ButtonComponent, CatalogSelectComponent, ServerSearchSelectComponent, RichTextEditorComponent } from '@shared/components';
import { CatalogService } from '@core/services/catalog.service';
import {
    DataTableComponent,
    TableColumn,
    TableAction,
    PaginationEvent,
    FilterConfig,
    FilterChangeEvent,
    DateRangeFilterConfig,
    DateRangeChangeEvent,
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { ProveedorService, ProveedorFiltroOption, toProveedorOptions } from '../../services/proveedor.service';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';

@Component({
    selector: 'app-devoluciones',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        RouterModule,
        DrawerComponent,
        PageHeaderComponent,
        AlertComponent,
        ButtonComponent,
        DataTableComponent,
        CatalogSelectComponent,
        ServerSearchSelectComponent,
        RichTextEditorComponent,
    ],
    templateUrl: './devoluciones.component.html',
})
export class DevolucionesComponent implements OnInit {
    private readonly devolucionService = inject(DevolucionService);
    private readonly proveedorService = inject(ProveedorService);
    private readonly ordenCompraService = inject(OrdenCompraService);
    private readonly recepcionService = inject(RecepcionService);
    private readonly fb = inject(FormBuilder);
    private readonly cdr = inject(ChangeDetectorRef);
    readonly catalog = inject(CatalogService);

    // Data source para <app-server-search-select> de OC en el drawer de alta
    readonly ordenCompraSource = ordenCompraSelectSource(this.ordenCompraService);
    /** Ítems de la OC seleccionada, para resolver `ordenItemId` sin UUIDs a mano. */
    itemsOrdenSeleccionada = signal<OrdenCompraItem[]>([]);
    /** Recepciones de la OC seleccionada, para resolver `recepcionId` sin UUIDs a mano. */
    recepcionesOrdenSeleccionada = signal<Recepcion[]>([]);
    loadingDatosOrden = signal(false);

    devoluciones = signal<Devolucion[]>([]);
    selected = signal<Devolucion | null>(null);

    loading = signal(false);
    error = signal<string | null>(null);
    showForm = signal(false);
    showDetail = signal(false);
    showRechazarModal = signal(false);
    submitting = signal(false);
    submitError = signal<string | null>(null);
    actionError = signal<string | null>(null);

    filterEstado = signal('');
    filterTipo = signal('');
    currentPage = signal(0);
    pageSize = signal<number>(PAGINATION.defaultPageSize);
    totalElements = signal(0);
    totalPages = signal(0);
    searchQuery = signal('');

    hasItems = computed(() => this.devoluciones().length > 0);
    isEmpty = computed(() => !this.loading() && !this.hasItems());

    // Filtros adicionales (server-side, igual que estado/tipo)
    filterMotivo = signal('');
    filterProveedorId = signal('');
    filterCreatedAtDesde = signal<string | null>(null);
    filterCreatedAtHasta = signal<string | null>(null);

    breadcrumbs: Breadcrumb[] = [
        { label: 'Compras', url: '/compras' },
        { label: 'Devoluciones' },
    ];

    columns: TableColumn<Devolucion>[] = [
        { key: 'codigo', label: 'Código' },
        { key: 'ordenCompraCodigo', label: 'OC' },
        { key: 'proveedorNombre', label: 'Proveedor' },
        { key: 'motivo', label: 'Motivo', render: (row) => this.catalog.label('MOTIVO_DEVOLUCION_COMPRA', row.motivo) },
        { key: 'tipo', label: 'Tipo' },
        {
            key: 'estado',
            label: 'Estado',
            html: true,
            render: (row) => `<span class="${this.getBadge(row.estado)}">${this.catalog.label('ESTADO_DEVOLUCION_COMPRA', row.estado)}</span>`,
        },
    ];

    actions: TableAction<Devolucion>[] = [
        { label: 'Ver', icon: 'view', onClick: (row) => this.openDetail(row) },
    ];

    /** Proveedores activos para el select de filtro del toolbar. */
    proveedoresFiltro = signal<ProveedorFiltroOption[]>([]);

    // Filtros select del toolbar. Las opciones salen de erp_parameters (fuente única).
    estadoFilters: FilterConfig[] = [
        catalogFilter(this.catalog, 'ESTADO_DEVOLUCION_COMPRA', 'estado', 'Estado'),
        catalogFilter(this.catalog, 'TIPO_DEVOLUCION', 'tipo', 'Tipo'),
        catalogFilter(this.catalog, 'MOTIVO_DEVOLUCION_COMPRA', 'motivo', 'Motivo'),
        signalFilter('proveedorId', 'Proveedor', this.proveedoresFiltro,
            p => ({ value: p.id, label: p.razonSocial })),
    ];

    /** Rango de fecha de registro de la devolución. */
    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'createdAt', label: 'Fecha de registro' }
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * respetando TODOS los filtros vigentes. Ver /purchases/api/devoluciones/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.purchases}/api/devoluciones/export`,
        filename: 'devoluciones',
        params: () => ({
            q: this.searchQuery() || undefined,
            estado: this.filterEstado() || undefined,
            tipo: this.filterTipo() || undefined,
            motivo: this.filterMotivo() || undefined,
            proveedorId: this.filterProveedorId() || undefined,
            createdAtDesde: this.filterCreatedAtDesde() ?? undefined,
            createdAtHasta: this.filterCreatedAtHasta() ?? undefined,
        }),
    };

    devolucionForm = this.fb.group({
        ordenCompraId: ['', Validators.required],
        recepcionId: [''],
        motivo: ['PRODUCTO_DEFECTUOSO', Validators.required],
        tipo: ['DEVOLUCION'],
        observaciones: [''],
        items: this.fb.array([this.createItemGroup()]),
    });

    rechazarForm = this.fb.group({
        motivo: ['', Validators.required],
    });

    get itemsArray(): FormArray { return this.devolucionForm.get('items') as FormArray; }

    ngOnInit(): void {
        this.loadDevoluciones();
        this.loadProveedoresFiltro();
        // Arranca deshabilitado: sin OC elegida no hay recepciones que ofrecer.
        this.devolucionForm.get('recepcionId')!.disable({ emitEvent: false });
        this.devolucionForm.get('ordenCompraId')!.valueChanges.subscribe((id: string | null) => {
            this.onOrdenSeleccionada(id);
        });
    }

    /**
     * Al elegir la OC en el selector, precarga sus ítems (para `ordenItemId`) y
     * sus recepciones (para `recepcionId`) sin que el usuario teclee UUIDs a mano.
     */
    private onOrdenSeleccionada(ordenCompraId: string | null): void {
        // La recepción vinculada depende de la OC elegida: si cambia la OC, se limpia.
        this.devolucionForm.patchValue({ recepcionId: '' }, { emitEvent: false });
        this.devolucionForm.get('recepcionId')!.disable({ emitEvent: false });
        if (!ordenCompraId) {
            this.itemsOrdenSeleccionada.set([]);
            this.recepcionesOrdenSeleccionada.set([]);
            this.syncOrdenItemIdControls();
            return;
        }
        this.loadingDatosOrden.set(true);
        this.ordenCompraService.getOrdenById(ordenCompraId).subscribe({
            next: (orden) => {
                this.itemsOrdenSeleccionada.set(orden.items ?? []);
                this.syncOrdenItemIdControls();
                this.cdr.markForCheck();
            },
            error: () => {
                this.itemsOrdenSeleccionada.set([]);
                this.syncOrdenItemIdControls();
                this.cdr.markForCheck();
            }
        });
        this.recepcionService.getRecepcionesByOrden(ordenCompraId).subscribe({
            next: (recepciones) => {
                this.recepcionesOrdenSeleccionada.set(recepciones ?? []);
                this.syncRecepcionIdControl();
                this.loadingDatosOrden.set(false);
                this.cdr.markForCheck();
            },
            error: () => {
                this.recepcionesOrdenSeleccionada.set([]);
                this.syncRecepcionIdControl();
                this.loadingDatosOrden.set(false);
                this.cdr.markForCheck();
            }
        });
    }

    /**
     * `[disabled]` sobre `formControlName` NO deshabilita el control (Angular solo
     * emite un `console.warn`, ver `@angular/forms`) — el enable/disable real de
     * `recepcionId` se hace aquí, imperativamente, según haya o no recepciones
     * disponibles para la OC elegida.
     */
    private syncRecepcionIdControl(): void {
        const ctrl = this.devolucionForm.get('recepcionId')!;
        if (this.recepcionesOrdenSeleccionada().length === 0) {
            if (ctrl.enabled) ctrl.disable({ emitEvent: false });
        } else if (ctrl.disabled) {
            ctrl.enable({ emitEvent: false });
        }
    }

    /** Mismo mecanismo que `syncRecepcionIdControl`, pero para `ordenItemId` de cada ítem del array. */
    private syncOrdenItemIdControls(): void {
        const disabled = this.itemsOrdenSeleccionada().length === 0;
        this.itemsArray.controls.forEach((c) => {
            const ctrl = (c as FormGroup).get('ordenItemId');
            if (!ctrl) return;
            if (disabled && ctrl.enabled) ctrl.disable({ emitEvent: false });
            else if (!disabled && ctrl.disabled) ctrl.enable({ emitEvent: false });
        });
    }

    /** Al elegir un ítem de la OC en el ítem `index` del form, precarga producto/SKU. */
    onOrdenItemSeleccionado(index: number, ordenItemId: string): void {
        const item = this.itemsOrdenSeleccionada().find(i => i.id === ordenItemId);
        const group = this.itemsArray.at(index) as FormGroup;
        group.patchValue({
            ordenItemId,
            productoNombre: item?.productoNombre ?? group.value.productoNombre,
            sku: item?.sku ?? group.value.sku,
        });
    }

    /** Proveedores activos para el select de filtro del toolbar. */
    private loadProveedoresFiltro(): void {
        this.proveedorService.getProveedores({ size: PAGINATION.maxPageSize, estado: 'ACTIVO' }).subscribe({
            next: (res) => this.proveedoresFiltro.set(toProveedorOptions(res.content)),
            error: () => this.proveedoresFiltro.set([])
        });
    }

    loadDevoluciones(): void {
        this.loading.set(true);
        this.error.set(null);
        this.devolucionService.listar({
            page: this.currentPage(),
            size: this.pageSize(),
            q: this.searchQuery() || undefined,
            estado: this.filterEstado() || undefined,
            tipo: this.filterTipo() || undefined,
            motivo: this.filterMotivo() || undefined,
            proveedorId: this.filterProveedorId() || undefined,
            createdAtDesde: this.filterCreatedAtDesde() || undefined,
            createdAtHasta: this.filterCreatedAtHasta() || undefined
        }).subscribe({
            next: (page) => {
                this.devoluciones.set(page.content);
                this.totalElements.set(page.totalElements);
                this.totalPages.set(page.totalPages);
                this.loading.set(false);
                this.cdr.markForCheck();
            },
            error: (err) => {
                this.error.set('Error al cargar devoluciones');
                this.loading.set(false);
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    /** La búsqueda por texto va al backend (`q`), no filtra la página cargada. */
    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.loadDevoluciones();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'estado':      this.filterEstado.set(valor); break;
            case 'tipo':        this.filterTipo.set(valor); break;
            case 'motivo':      this.filterMotivo.set(valor); break;
            case 'proveedorId': this.filterProveedorId.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadDevoluciones();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field !== 'createdAt') return;
        this.filterCreatedAtDesde.set(event.from);
        this.filterCreatedAtHasta.set(event.to);
        this.currentPage.set(0);
        this.loadDevoluciones();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterEstado.set('');
        this.filterTipo.set('');
        this.filterMotivo.set('');
        this.filterProveedorId.set('');
        this.filterCreatedAtDesde.set(null);
        this.filterCreatedAtHasta.set(null);
        this.currentPage.set(0);
        this.loadDevoluciones();
    }

    onPageChange(event: PaginationEvent): void {
        this.currentPage.set(event.page);
        this.loadDevoluciones();
    }

    openCreateForm(): void {
        this.devolucionForm.reset({ motivo: 'PRODUCTO_DEFECTUOSO', tipo: 'DEVOLUCION' });
        while (this.itemsArray.length > 0) this.itemsArray.removeAt(0);
        this.itemsArray.push(this.createItemGroup());
        this.submitError.set(null);
        this.showForm.set(true);
    }

    closeForm(): void { this.showForm.set(false); }

    openDetail(dev: Devolucion): void {
        this.selected.set(dev);
        this.actionError.set(null);
        this.showDetail.set(true);
    }

    closeDetail(): void { this.showDetail.set(false); this.selected.set(null); }

    addItem(): void { this.itemsArray.push(this.createItemGroup()); }

    removeItem(i: number): void { if (this.itemsArray.length > 1) this.itemsArray.removeAt(i); }

    crearDevolucion(): void {
        if (this.devolucionForm.invalid) return;
        const fv = this.devolucionForm.value;

        const request: CrearDevolucionRequest = {
            ordenCompraId: fv.ordenCompraId ?? '',
            recepcionId: fv.recepcionId || undefined,
            motivo: fv.motivo ?? '',
            tipo: fv.tipo ?? 'DEVOLUCION',
            observaciones: fv.observaciones || undefined,
            items: (fv.items ?? []).map((i: Record<string, unknown>) => ({
                ordenItemId: (i['ordenItemId'] as string) || undefined,
                productoNombre: i['productoNombre'] as string,
                sku: (i['sku'] as string) || undefined,
                cantidad: Number(i['cantidad']),
                motivoItem: (i['motivoItem'] as string) || undefined,
            })),
        };

        this.submitting.set(true);
        this.submitError.set(null);
        this.devolucionService.crear(request).subscribe({
            next: () => {
                this.submitting.set(false);
                this.showForm.set(false);
                this.loadDevoluciones();
            },
            error: (err) => {
                this.submitError.set('Error al crear devolución');
                this.submitting.set(false);
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    cambiarEstado(action: 'enviar' | 'aceptar' | 'completar'): void {
        const dev = this.selected();
        if (!dev?.id) return;
        const obs = action === 'enviar' ? this.devolucionService.enviar(dev.id)
            : action === 'aceptar' ? this.devolucionService.aceptar(dev.id)
            : this.devolucionService.completar(dev.id);

        obs.subscribe({
            next: () => { this.closeDetail(); this.loadDevoluciones(); },
            error: (err) => {
                this.actionError.set('Error al cambiar estado');
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    abrirRechazarModal(): void {
        this.rechazarForm.reset();
        this.actionError.set(null);
        this.showRechazarModal.set(true);
    }

    cerrarRechazarModal(): void {
        this.showRechazarModal.set(false);
    }

    confirmarRechazo(): void {
        if (this.rechazarForm.invalid) return;
        const dev = this.selected();
        if (!dev?.id) return;
        const motivo = this.rechazarForm.value.motivo ?? '';

        this.devolucionService.rechazar(dev.id, motivo).subscribe({
            next: () => {
                this.showRechazarModal.set(false);
                this.closeDetail();
                this.loadDevoluciones();
            },
            error: (err) => {
                this.actionError.set('Error al rechazar devolución');
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    getBadge(estado: string | undefined): string {
        switch (estado) {
            case 'BORRADOR': return 'badge badge-neutral';
            case 'ENVIADA': return 'badge badge-accent';
            case 'ACEPTADA': return 'badge badge-warning';
            case 'COMPLETADA': return 'badge badge-success';
            case 'RECHAZADA': return 'badge badge-error';
            default: return 'badge badge-neutral';
        }
    }

    private createItemGroup(): FormGroup {
        const group = this.fb.group({
            ordenItemId: [''],
            productoNombre: ['', Validators.required],
            sku: [''],
            cantidad: [1, [Validators.required, Validators.min(1)]],
            motivoItem: [''],
        });
        // Sin OC elegida (o sin ítems) el selector de ítem-OC arranca deshabilitado.
        if (this.itemsOrdenSeleccionada().length === 0) group.get('ordenItemId')!.disable({ emitEvent: false });
        return group;
    }
}
