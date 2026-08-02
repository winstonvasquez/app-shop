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
import { FacturaProveedorService } from '../../services/factura-proveedor.service';
import { ProveedorService, ProveedorFiltroOption, toProveedorOptions } from '../../services/proveedor.service';
import { OrdenCompraService } from '../../services/orden-compra.service';
import { ordenCompraSelectSource } from '../../components/select-sources';
import { OrdenCompraItem } from '../../models/orden-compra.model';
import { catalogFilter, signalFilter, staticFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { FacturaProveedor, RegistrarFacturaRequest, CpeParsedInvoice } from '../../models/factura-proveedor.model';
import { ButtonComponent, CatalogSelectComponent, ServerSearchSelectComponent, RichTextEditorComponent } from '@shared/components';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
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
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import { MONEDA } from '@shared/constants/sunat.constants';
import { PAGINATION } from '@shared/constants/app.constants';
import { CatalogService } from '@core/services/catalog.service';

@Component({
    selector: 'app-facturas-proveedor',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        RouterModule,
        ButtonComponent,
        DrawerComponent,
        PageHeaderComponent,
        AlertComponent,
        DataTableComponent,
        CatalogSelectComponent,
        ServerSearchSelectComponent,
        RichTextEditorComponent,
    ],
    templateUrl: './facturas-proveedor.component.html',
})
export class FacturasProveedorComponent implements OnInit {
    private readonly facturaService = inject(FacturaProveedorService);
    private readonly proveedorService = inject(ProveedorService);
    private readonly ordenCompraService = inject(OrdenCompraService);
    private readonly fb = inject(FormBuilder);
    private readonly cdr = inject(ChangeDetectorRef);
    readonly catalog = inject(CatalogService);

    // Data source para <app-server-search-select> de OC en el drawer de alta
    readonly ordenCompraSource = ordenCompraSelectSource(this.ordenCompraService);
    /** Ítems de la OC seleccionada, para resolver `ordenItemId` sin UUIDs a mano. */
    itemsOrdenSeleccionada = signal<OrdenCompraItem[]>([]);
    loadingItemsOrden = signal(false);

    facturas = signal<FacturaProveedor[]>([]);
    selectedFactura = signal<FacturaProveedor | null>(null);

    loading = signal(false);
    error = signal<string | null>(null);
    showForm = signal(false);
    showDetail = signal(false);
    submitting = signal(false);
    submitError = signal<string | null>(null);
    actionError = signal<string | null>(null);

    filterEstado = signal('');
    filterTipoDocumento = signal('');
    filterFechaEmisionDesde = signal<string | null>(null);
    filterFechaEmisionHasta = signal<string | null>(null);
    currentPage = signal(0);
    pageSize = signal<number>(PAGINATION.defaultPageSize);
    totalElements = signal(0);
    totalPages = signal(0);
    searchQuery = signal('');

    hasFacturas = computed(() => this.facturas().length > 0);
    isEmpty = computed(() => !this.loading() && !this.hasFacturas());

    // Filtros adicionales (todos server-side)
    filterResultadoMatch = signal('');
    filterEstadoSunat = signal('');
    filterMoneda = signal('');
    filterProveedorId = signal('');
    filterConDetraccion = signal('');
    filterFechaVencimientoDesde = signal<string | null>(null);
    filterFechaVencimientoHasta = signal<string | null>(null);

    /** Proveedores activos para el select de filtro del toolbar. */
    proveedoresFiltro = signal<ProveedorFiltroOption[]>([]);

    breadcrumbs: Breadcrumb[] = [
        { label: 'Compras', url: '/compras' },
        { label: 'Facturas Proveedor' },
    ];

    columns: TableColumn<FacturaProveedor>[] = [
        { key: 'proveedorNombre', label: 'Proveedor' },
        { key: 'factura', label: 'Factura', render: (row) => `${row.serie}-${row.numero}` },
        { key: 'ordenCompraCodigo', label: 'OC' },
        { key: 'fechaEmision', label: 'Fecha' },
        { key: 'total', label: 'Total', align: 'right', render: (row) => `S/ ${row.total.toFixed(2)}` },
        {
            key: 'estado',
            label: 'Estado',
            html: true,
            render: (row) => `<span class="${this.getEstadoBadge(row.estado)}">${this.catalog.label('ESTADO_FACTURA_PROVEEDOR', row.estado)}</span>`,
        },
        {
            key: 'resultadoMatch',
            label: '3-Way Match',
            html: true,
            render: (row) =>
                `<span class="${this.getMatchBadge(row.resultadoMatch)}">${this.catalog.label('RESULTADO_MATCH_3VIA', row.resultadoMatch)}</span>`,
        },
        {
            key: 'estadoSunat',
            label: 'Estado SUNAT',
            html: true,
            render: (row) => row.estadoSunat
                ? `<span class="${this.getSunatBadge(row.estadoSunat)}">${this.catalog.label('ESTADO_VALIDACION_SUNAT', row.estadoSunat)}</span>`
                : '—',
        },
    ];

    actions: TableAction<FacturaProveedor>[] = [
        { label: 'Ver', icon: 'view', onClick: (row) => this.openDetail(row) },
    ];

    // Filtros select del toolbar. Las opciones salen de erp_parameters (fuente unica).
    estadoFilters: FilterConfig[] = [
        catalogFilter(this.catalog, 'ESTADO_FACTURA_PROVEEDOR', 'estado', 'Estado'),
        catalogFilter(this.catalog, 'TIPO_COMPROBANTE', 'tipoDocumento', 'Tipo'),
        catalogFilter(this.catalog, 'RESULTADO_MATCH_3VIA', 'resultadoMatch', 'Match 3 vias'),
        catalogFilter(this.catalog, 'ESTADO_VALIDACION_SUNAT', 'estadoSunat', 'Estado SUNAT'),
        catalogFilter(this.catalog, 'MONEDA', 'moneda', 'Moneda'),
        signalFilter('proveedorId', 'Proveedor', this.proveedoresFiltro,
            p => ({ value: p.id, label: p.razonSocial })),
        staticFilter('conDetraccion', 'Detraccion', [
            { value: 'true', label: 'Con detraccion' },
            { value: 'false', label: 'Sin detraccion' },
        ]),
    ];

    /** Rango de fecha de emisión para el toolbar del data-table. */
    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fechaEmision', label: 'Fecha de emisión' },
        { field: 'fechaVencimiento', label: 'Vencimiento' }
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (respeta el filtro de estado actual). Ver /api/facturas-proveedor/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.purchases}/api/facturas-proveedor/export`,
        filename: 'facturas-proveedor',
        params: () => ({
            q: this.searchQuery() || undefined,
            estado: this.filterEstado() || undefined,
            tipoDocumento: this.filterTipoDocumento() || undefined,
            resultadoMatch: this.filterResultadoMatch() || undefined,
            estadoSunat: this.filterEstadoSunat() || undefined,
            moneda: this.filterMoneda() || undefined,
            proveedorId: this.filterProveedorId() || undefined,
            conDetraccion: this.filterConDetraccion() || undefined,
            fechaEmisionDesde: this.filterFechaEmisionDesde() ?? undefined,
            fechaEmisionHasta: this.filterFechaEmisionHasta() ?? undefined,
            fechaVencimientoDesde: this.filterFechaVencimientoDesde() ?? undefined,
            fechaVencimientoHasta: this.filterFechaVencimientoHasta() ?? undefined
        }),
    };

    facturaForm = this.fb.group({
        ordenCompraId: ['', Validators.required],
        serie: ['', Validators.required],
        numero: ['', Validators.required],
        tipoDocumento: ['FACTURA'],
        fechaEmision: ['', Validators.required],
        fechaVencimiento: [''],
        moneda: [MONEDA.PEN],
        observaciones: [''],
        items: this.fb.array([this.createItemGroup()]),
    });

    rechazarForm = this.fb.group({
        motivo: ['', Validators.required],
    });

    showRechazarModal = signal(false);
    validandoSunatId = signal<string | null>(null);
    importingCpe = signal(false);
    cpeImportMessage = signal<string | null>(null);

    get itemsArray(): FormArray {
        return this.facturaForm.get('items') as FormArray;
    }

    ngOnInit(): void {
        this.loadFacturas();
        this.loadProveedoresFiltro();
        this.facturaForm.get('ordenCompraId')!.valueChanges.subscribe((id: string | null) => {
            this.onOrdenSeleccionada(id);
        });
    }

    /** Al elegir la OC en el selector, precarga sus ítems para resolver `ordenItemId` sin UUIDs a mano. */
    private onOrdenSeleccionada(ordenCompraId: string | null): void {
        if (!ordenCompraId) {
            this.itemsOrdenSeleccionada.set([]);
            this.syncOrdenItemIdControls();
            return;
        }
        this.loadingItemsOrden.set(true);
        this.ordenCompraService.getOrdenById(ordenCompraId).subscribe({
            next: (orden) => {
                this.itemsOrdenSeleccionada.set(orden.items ?? []);
                this.syncOrdenItemIdControls();
                this.loadingItemsOrden.set(false);
                this.cdr.markForCheck();
            },
            error: () => {
                this.itemsOrdenSeleccionada.set([]);
                this.syncOrdenItemIdControls();
                this.loadingItemsOrden.set(false);
                this.cdr.markForCheck();
            }
        });
    }

    /**
     * `[disabled]` sobre `formControlName` NO deshabilita el control (Angular solo
     * emite un `console.warn`, ver `@angular/forms`) — por eso el enable/disable real
     * del selector de ítem de OC se hace aquí, imperativamente, cada vez que cambian
     * los ítems disponibles de la OC elegida.
     */
    private syncOrdenItemIdControls(): void {
        const disabled = this.itemsOrdenSeleccionada().length === 0;
        this.itemsArray.controls.forEach((c) => {
            const ctrl = (c as FormGroup).get('ordenItemId');
            if (!ctrl) return;
            if (disabled && ctrl.enabled) ctrl.disable({ emitEvent: false });
            else if (!disabled && ctrl.disabled) ctrl.enable({ emitEvent: false });
        });
    }

    /** Al elegir un ítem de la OC en el ítem `index` del form, precarga producto/SKU/precio. */
    onOrdenItemSeleccionado(index: number, ordenItemId: string): void {
        const item = this.itemsOrdenSeleccionada().find(i => i.id === ordenItemId);
        const group = this.itemsArray.at(index) as FormGroup;
        group.patchValue({
            ordenItemId,
            productoNombre: item?.productoNombre ?? group.value.productoNombre,
            sku: item?.sku ?? group.value.sku,
            precioUnitario: item?.precioUnitario ?? group.value.precioUnitario,
        });
    }

    /** Proveedores activos para el select de filtro del toolbar. */
    private loadProveedoresFiltro(): void {
        this.proveedorService.getProveedores({ size: PAGINATION.maxPageSize, estado: 'ACTIVO' }).subscribe({
            next: (res) => this.proveedoresFiltro.set(toProveedorOptions(res.content)),
            error: () => this.proveedoresFiltro.set([])
        });
    }

    loadFacturas(): void {
        this.loading.set(true);
        this.error.set(null);
        this.facturaService.listar({
            page: this.currentPage(),
            size: this.pageSize(),
            q: this.searchQuery() || undefined,
            estado: this.filterEstado() || undefined,
            tipoDocumento: this.filterTipoDocumento() || undefined,
            resultadoMatch: this.filterResultadoMatch() || undefined,
            estadoSunat: this.filterEstadoSunat() || undefined,
            moneda: this.filterMoneda() || undefined,
            proveedorId: this.filterProveedorId() || undefined,
            conDetraccion: this.filterConDetraccion() || undefined,
            fechaEmisionDesde: this.filterFechaEmisionDesde() || undefined,
            fechaEmisionHasta: this.filterFechaEmisionHasta() || undefined,
            fechaVencimientoDesde: this.filterFechaVencimientoDesde() || undefined,
            fechaVencimientoHasta: this.filterFechaVencimientoHasta() || undefined
        }).subscribe({
            next: (page) => {
                this.facturas.set(page.content);
                this.totalElements.set(page.totalElements);
                this.totalPages.set(page.totalPages);
                this.loading.set(false);
                this.cdr.markForCheck();
            },
            error: (err) => {
                this.error.set('Error al cargar facturas');
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
        this.loadFacturas();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'estado':         this.filterEstado.set(valor); break;
            case 'tipoDocumento':  this.filterTipoDocumento.set(valor); break;
            case 'resultadoMatch': this.filterResultadoMatch.set(valor); break;
            case 'estadoSunat':    this.filterEstadoSunat.set(valor); break;
            case 'moneda':         this.filterMoneda.set(valor); break;
            case 'proveedorId':    this.filterProveedorId.set(valor); break;
            case 'conDetraccion':  this.filterConDetraccion.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadFacturas();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field === 'fechaEmision') {
            this.filterFechaEmisionDesde.set(event.from);
            this.filterFechaEmisionHasta.set(event.to);
        } else if (event.field === 'fechaVencimiento') {
            this.filterFechaVencimientoDesde.set(event.from);
            this.filterFechaVencimientoHasta.set(event.to);
        } else {
            return;
        }
        this.currentPage.set(0);
        this.loadFacturas();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterEstado.set('');
        this.filterTipoDocumento.set('');
        this.filterResultadoMatch.set('');
        this.filterEstadoSunat.set('');
        this.filterMoneda.set('');
        this.filterProveedorId.set('');
        this.filterConDetraccion.set('');
        this.filterFechaEmisionDesde.set(null);
        this.filterFechaEmisionHasta.set(null);
        this.filterFechaVencimientoDesde.set(null);
        this.filterFechaVencimientoHasta.set(null);
        this.currentPage.set(0);
        this.loadFacturas();
    }

    onPageChange(event: PaginationEvent): void {
        this.currentPage.set(event.page);
        this.loadFacturas();
    }

    openCreateForm(): void {
        this.facturaForm.reset({ tipoDocumento: 'FACTURA', moneda: MONEDA.PEN });
        while (this.itemsArray.length > 0) this.itemsArray.removeAt(0);
        this.itemsArray.push(this.createItemGroup());
        this.submitError.set(null);
        this.cpeImportMessage.set(null);
        this.showForm.set(true);
    }

    closeForm(): void {
        this.showForm.set(false);
        this.cpeImportMessage.set(null);
    }

    /**
     * Importa un XML de CPE (UBL 2.1) del proveedor y precarga `facturaForm`
     * con los datos extraídos por el backend (serie/número/fecha/items...).
     */
    importarCpe(file: File | null | undefined): void {
        if (!file) {
            this.submitError.set('Seleccione un archivo XML para importar');
            return;
        }
        this.importingCpe.set(true);
        this.submitError.set(null);
        this.cpeImportMessage.set(null);
        this.facturaService.parseCpe(file).subscribe({
            next: (parsed) => {
                this.aplicarCpeParseado(parsed);
                this.importingCpe.set(false);
                this.cpeImportMessage.set('Factura precargada desde XML, revise y confirme.');
                this.cdr.markForCheck();
            },
            error: (err) => {
                this.submitError.set('No se pudo leer el XML: verifique que sea un CPE UBL 2.1 válido');
                this.importingCpe.set(false);
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    private aplicarCpeParseado(parsed: CpeParsedInvoice): void {
        this.facturaForm.patchValue({
            serie: parsed.serie,
            numero: parsed.numero,
            tipoDocumento: parsed.tipoDocumento,
            fechaEmision: this.toDateInputValue(parsed.fechaEmision),
            // El control se infirió como literal `'PEN'` desde el default del form; el backend
            // puede devolver cualquier código ISO 4217 soportado (ver MONEDA.PEN/USD).
            moneda: parsed.moneda as unknown as typeof MONEDA.PEN,
        });

        while (this.itemsArray.length > 0) this.itemsArray.removeAt(0);
        if (parsed.items.length > 0) {
            for (const item of parsed.items) {
                this.itemsArray.push(
                    this.fb.group({
                        ordenItemId: [''],
                        productoNombre: [item.descripcion, Validators.required],
                        sku: [item.sku ?? ''],
                        cantidad: [item.cantidad, [Validators.required, Validators.min(1)]],
                        precioUnitario: [item.precioUnitario, [Validators.required, Validators.min(0)]],
                    })
                );
            }
        } else {
            this.itemsArray.push(this.createItemGroup());
        }
        this.syncOrdenItemIdControls();
    }

    /** Normaliza `fechaEmision` (LocalDate ISO o datetime) al formato `yyyy-MM-dd` del `<input type="date">`. */
    private toDateInputValue(fecha: string): string {
        return fecha && fecha.length >= 10 ? fecha.substring(0, 10) : fecha;
    }

    openDetail(factura: FacturaProveedor): void {
        this.selectedFactura.set(factura);
        this.actionError.set(null);
        this.showDetail.set(true);
    }

    closeDetail(): void {
        this.showDetail.set(false);
        this.selectedFactura.set(null);
    }

    addItem(): void {
        this.itemsArray.push(this.createItemGroup());
    }

    removeItem(i: number): void {
        if (this.itemsArray.length > 1) this.itemsArray.removeAt(i);
    }

    registrarFactura(): void {
        if (this.facturaForm.invalid) return;
        const fv = this.facturaForm.value;

        const request: RegistrarFacturaRequest = {
            ordenCompraId: fv.ordenCompraId ?? '',
            serie: fv.serie ?? '',
            numero: fv.numero ?? '',
            tipoDocumento: fv.tipoDocumento ?? 'FACTURA',
            fechaEmision: fv.fechaEmision ?? '',
            fechaVencimiento: fv.fechaVencimiento || undefined,
            moneda: fv.moneda ?? MONEDA.PEN,
            observaciones: fv.observaciones || undefined,
            items: (fv.items ?? []).map((i: Record<string, unknown>) => ({
                ordenItemId: (i['ordenItemId'] as string) || undefined,
                productoNombre: i['productoNombre'] as string,
                sku: (i['sku'] as string) || undefined,
                cantidad: Number(i['cantidad']),
                precioUnitario: Number(i['precioUnitario']),
            })),
        };

        this.submitting.set(true);
        this.submitError.set(null);
        this.facturaService.registrar(request).subscribe({
            next: () => {
                this.submitting.set(false);
                this.showForm.set(false);
                this.loadFacturas();
            },
            error: (err) => {
                this.submitError.set('Error al registrar factura');
                this.submitting.set(false);
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    aprobarFactura(id: string): void {
        this.facturaService.aprobar(id).subscribe({
            next: () => {
                this.closeDetail();
                this.loadFacturas();
            },
            error: (err) => {
                this.actionError.set('Error al aprobar factura');
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    openRechazarModal(): void {
        this.rechazarForm.reset();
        this.showRechazarModal.set(true);
    }

    closeRechazarModal(): void {
        this.showRechazarModal.set(false);
    }

    confirmarRechazo(): void {
        if (this.rechazarForm.invalid) return;
        const factura = this.selectedFactura();
        if (!factura?.id) return;
        const motivo = this.rechazarForm.value.motivo ?? '';
        this.facturaService.rechazar(factura.id, motivo).subscribe({
            next: () => {
                this.showRechazarModal.set(false);
                this.closeDetail();
                this.loadFacturas();
            },
            error: (err) => {
                this.actionError.set('Error al rechazar factura');
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    getEstadoBadge(estado: string): string {
        switch (estado) {
            case 'PENDIENTE': return 'badge badge-warning';
            case 'APROBADA': return 'badge badge-success';
            case 'RECHAZADA': return 'badge badge-error';
            default: return 'badge badge-neutral';
        }
    }

    getMatchBadge(match: string | undefined): string {
        if (!match) return 'badge badge-neutral';
        return match === 'OK_TOTAL' ? 'badge badge-success'
            : match === 'OK_PARCIAL' ? 'badge badge-warning'
            : 'badge badge-error';
    }

    getSunatBadge(estadoSunat: string | undefined): string {
        if (!estadoSunat) return 'badge badge-neutral';
        return estadoSunat === 'ACEPTADA' ? 'badge badge-success'
            : estadoSunat === 'RECHAZADA' ? 'badge badge-error'
            : 'badge badge-warning';
    }

    validarSunat(id: string): void {
        this.validandoSunatId.set(id);
        this.facturaService.validarSunat(id).subscribe({
            next: () => {
                this.validandoSunatId.set(null);
                this.loadFacturas();
                if (this.selectedFactura()?.id === id) this.closeDetail();
            },
            error: () => {
                this.validandoSunatId.set(null);
                this.actionError.set('Error al validar con SUNAT');
                this.cdr.markForCheck();
            }
        });
    }

    private createItemGroup(): FormGroup {
        const group = this.fb.group({
            ordenItemId: [''],
            productoNombre: ['', Validators.required],
            sku: [''],
            cantidad: [1, [Validators.required, Validators.min(1)]],
            precioUnitario: [0, [Validators.required, Validators.min(0)]],
        });
        // Sin OC elegida (o sin ítems) el selector de ítem-OC arranca deshabilitado.
        if (this.itemsOrdenSeleccionada().length === 0) group.get('ordenItemId')!.disable({ emitEvent: false });
        return group;
    }
}
