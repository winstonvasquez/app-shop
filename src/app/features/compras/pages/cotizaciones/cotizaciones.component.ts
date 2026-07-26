import {
    Component,
    OnInit,
    inject,
    signal,
    computed,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
} from '@angular/core';
import {
    ReactiveFormsModule,
    FormBuilder,
    FormControl,
    Validators,
    FormArray,
    FormGroup,
    AbstractControl,
    ValidationErrors,
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { CotizacionService } from '../../services/cotizacion.service';
import { ProveedorService } from '../../services/proveedor.service';
import { proveedorSelectSource } from '../../components/select-sources';
import { AuthService } from '@core/auth/auth.service';
import { CatalogService } from '@core/services/catalog.service';
import { PAGINATION } from '@shared/constants/app.constants';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import {
    CotizacionResumen,
    ComparativaDto,
    CrearCotizacionRequest,
    ActualizarCotizacionRequest,
    CotizacionDetalleDto,
} from '../../models/cotizacion.model';
import { ButtonComponent, ServerSearchSelectComponent, ServerSelectOption, ServerSelectId } from '@shared/components';
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
} from '@shared/ui/tables/data-table/data-table.component';
import { ProductLookupComponent } from '../../../inventory/components/product-lookup/product-lookup.component';
import { ProductResponse } from '@core/models/product.model';
import { productIdToUuid } from '../../../inventory/utils/synthetic-uuid.util';

/** Al menos un proveedor seleccionado — `Validators.required` no alcanza para arrays (`[]` no es "vacío" para Angular). */
function proveedoresRequeridosValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value as string[] | null;
    return value && value.length > 0 ? null : { proveedoresRequeridos: true };
}

@Component({
    selector: 'app-cotizaciones',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        RouterModule,
        ButtonComponent,
        ServerSearchSelectComponent,
        DrawerComponent,
        PageHeaderComponent,
        AlertComponent,
        DataTableComponent,
        ProductLookupComponent,
    ],
    templateUrl: './cotizaciones.component.html',
})
export class CotizacionesComponent implements OnInit {
    private readonly cotizacionService = inject(CotizacionService);
    private readonly proveedorService = inject(ProveedorService);
    private readonly authService = inject(AuthService);
    private readonly fb = inject(FormBuilder);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly catalog = inject(CatalogService);

    readonly proveedorSource = proveedorSelectSource(this.proveedorService);
    /** Control standalone (fuera de `cotizacionForm`) para el picker "buscar y agregar" proveedor. */
    proveedorParaAgregar = new FormControl<string | null>(null);
    proveedoresSeleccionados = signal<ServerSelectOption[]>([]);

    /** Índice del ítem con el mini-panel de búsqueda de producto abierto (null = cerrado). */
    lookupOpenIndex = signal<number | null>(null);

    cotizaciones = signal<CotizacionResumen[]>([]);
    selectedCotizacion = signal<CotizacionResumen | null>(null);
    comparativa = signal<ComparativaDto | null>(null);

    loading = signal(false);
    error = signal<string | null>(null);
    showForm = signal(false);
    showComparativa = signal(false);
    submitting = signal(false);
    submitError = signal<string | null>(null);
    actionError = signal<string | null>(null);
    showAdjudicarModal = signal(false);

    /** id de la cotización en edición (null = el drawer/form está en modo "crear"). */
    editingCotizacionId = signal<string | null>(null);
    isEditMode = computed(() => this.editingCotizacionId() !== null);

    showDetalle = signal(false);
    loadingDetalle = signal(false);
    detalleCotizacion = signal<CotizacionDetalleDto | null>(null);

    filterEstado = signal('');
    currentPage = signal(0);
    pageSize = signal<number>(PAGINATION.defaultPageSize);
    totalElements = signal(0);
    totalPages = signal(0);
    searchQuery = signal('');

    hasCotizaciones = computed(() => this.cotizaciones().length > 0);
    isEmpty = computed(() => !this.loading() && !this.hasCotizaciones());

    filteredCotizaciones = computed(() => {
        const q = this.searchQuery().trim().toLowerCase();
        if (!q) return this.cotizaciones();
        return this.cotizaciones().filter(
            (c) => c.codigo.toLowerCase().includes(q) || c.titulo.toLowerCase().includes(q)
        );
    });

    breadcrumbs: Breadcrumb[] = [
        { label: 'Compras', url: '/compras' },
        { label: 'Cotizaciones' },
    ];

    columns: TableColumn<CotizacionResumen>[] = [
        { key: 'codigo', label: 'Código' },
        { key: 'titulo', label: 'Título' },
        {
            key: 'estado',
            label: 'Estado',
            html: true,
            render: (row) => `<span class="${this.getBadgeClass(row.estado)}">${this.catalog.label('ESTADO_COTIZACION', row.estado)}</span>`,
        },
        { key: 'fechaEmision', label: 'Emisión' },
        { key: 'fechaVencimiento', label: 'Vencimiento' },
        { key: 'totalItems', label: 'Items', align: 'center' },
        { key: 'totalProveedores', label: 'Proveedores', align: 'center' },
        {
            key: 'respuestasRecibidas',
            label: 'Respuestas',
            align: 'center',
            html: true,
            render: (row) =>
                `<span class="${row.respuestasRecibidas > 0 ? 'badge badge-success' : 'badge badge-neutral'}">${row.respuestasRecibidas}/${row.totalProveedores}</span>`,
        },
    ];

    actions: TableAction<CotizacionResumen>[] = [
        {
            label: 'Ver detalle',
            icon: 'view',
            onClick: (row) => this.verDetalle(row.id),
        },
        {
            label: 'Editar',
            icon: 'edit',
            onClick: (row) => this.editarCotizacion(row.id),
            show: (row) => row.estado === 'CREADA',
        },
        {
            label: 'Cancelar',
            icon: 'x',
            onClick: (row) => this.cancelarCotizacion(row.id),
            show: (row) => row.estado === 'CREADA',
        },
        {
            label: 'Enviar',
            icon: 'check',
            onClick: (row) => this.enviarCotizacion(row.id),
            show: (row) => row.estado === 'CREADA',
        },
        {
            label: 'Comparativa',
            icon: 'view',
            onClick: (row) => this.verComparativa(row),
            show: (row) => row.estado === 'EN_RESPUESTA',
        },
        {
            label: 'Adjudicar',
            icon: 'check',
            onClick: (row) => this.openAdjudicarModal(row),
            show: (row) => row.estado === 'EN_RESPUESTA',
        },
        {
            label: 'Generar OC',
            icon: 'check',
            onClick: (row) => this.convertirOc(row.id),
            show: (row) => row.estado === 'ADJUDICADA',
        },
    ];

    estadoFilters: FilterConfig[] = [
        {
            field: 'estado',
            label: 'Todos los estados',
            options: toObservable(this.catalog.options('ESTADO_COTIZACION')).pipe(
                map((o) => o.map((x) => ({ value: x.codigo, label: x.valor })))
            ),
        },
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (respeta el filtro de estado actual). Ver /purchases/api/cotizaciones/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.purchases}/api/cotizaciones/export`,
        filename: 'cotizaciones',
        params: () => ({ estado: this.filterEstado() }),
    };

    cotizacionForm = this.fb.group({
        titulo: ['', Validators.required],
        descripcion: [''],
        fechaVencimiento: ['', Validators.required],
        proveedorIds: [[] as string[], proveedoresRequeridosValidator],
        items: this.fb.array([this.createItemGroup()]),
    });

    adjudicarForm = this.fb.group({
        proveedorId: ['', Validators.required],
    });

    get itemsArray(): FormArray {
        return this.cotizacionForm.get('items') as FormArray;
    }

    ngOnInit(): void {
        this.loadCotizaciones();
    }

    loadCotizaciones(): void {
        this.loading.set(true);
        this.error.set(null);
        this.cotizacionService
            .listar(this.currentPage(), this.pageSize(), this.filterEstado() || undefined)
            .subscribe({
                next: (page) => {
                    this.cotizaciones.set(page.content);
                    this.totalElements.set(page.totalElements);
                    this.totalPages.set(page.totalPages);
                    this.loading.set(false);
                    this.cdr.markForCheck();
                },
                error: (err) => {
                    this.error.set('Error al cargar cotizaciones');
                    this.loading.set(false);
                    console.error(err);
                    this.cdr.markForCheck();
                },
            });
    }

    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        if (event.field === 'estado') {
            this.filterEstado.set((event.value as string) ?? '');
            this.currentPage.set(0);
            this.loadCotizaciones();
        }
    }

    onPageChange(event: PaginationEvent): void {
        this.currentPage.set(event.page);
        this.loadCotizaciones();
    }

    openCreateForm(): void {
        this.editingCotizacionId.set(null);
        this.cotizacionForm.reset({ proveedorIds: [] });
        this.proveedoresSeleccionados.set([]);
        this.proveedorParaAgregar.setValue(null);
        while (this.itemsArray.length > 0) this.itemsArray.removeAt(0);
        this.itemsArray.push(this.createItemGroup());
        this.lookupOpenIndex.set(null);
        this.submitError.set(null);
        this.showForm.set(true);
    }

    closeForm(): void {
        this.showForm.set(false);
        this.lookupOpenIndex.set(null);
        this.editingCotizacionId.set(null);
    }

    /** Submit único del drawer de crear/editar: enruta según el modo activo. */
    onSubmitForm(): void {
        if (this.isEditMode()) {
            this.actualizarCotizacion();
        } else {
            this.crearCotizacion();
        }
    }

    addItem(): void {
        this.itemsArray.push(this.createItemGroup());
    }

    removeItem(index: number): void {
        if (this.itemsArray.length > 1) this.itemsArray.removeAt(index);
        if (this.lookupOpenIndex() === index) {
            this.lookupOpenIndex.set(null);
        }
    }

    /** Abre/cierra el mini-panel de búsqueda de producto para el ítem `index`. */
    toggleLookup(index: number): void {
        this.lookupOpenIndex.set(this.lookupOpenIndex() === index ? null : index);
    }

    /** Aplica el producto elegido en `<app-product-lookup>` al ítem `index` (captura `productoId` para que la OC generada al adjudicar no pierda stock). */
    onProductoSeleccionado(index: number, product: ProductResponse): void {
        this.itemsArray.at(index).patchValue({
            productoId: productIdToUuid(product.id),
            productoNombre: product.nombre,
        });
        this.lookupOpenIndex.set(null);
    }

    /** Resuelve el proveedor elegido en el picker standalone y lo agrega al array `proveedorIds`. */
    async agregarProveedor(): Promise<void> {
        const id = this.proveedorParaAgregar.value;
        if (!id) return;
        if (this.proveedoresSeleccionados().some((p) => String(p.id) === id)) {
            this.proveedorParaAgregar.setValue(null);
            return;
        }
        const opt = await this.proveedorSource.resolveOption(id);
        if (opt) {
            this.proveedoresSeleccionados.update((list) => [...list, opt]);
            this.cotizacionForm.patchValue({
                proveedorIds: this.proveedoresSeleccionados().map((p) => String(p.id)),
            });
        }
        this.proveedorParaAgregar.setValue(null);
        this.cdr.markForCheck();
    }

    quitarProveedor(id: ServerSelectId): void {
        this.proveedoresSeleccionados.update((list) => list.filter((p) => p.id !== id));
        this.cotizacionForm.patchValue({
            proveedorIds: this.proveedoresSeleccionados().map((p) => String(p.id)),
        });
    }

    crearCotizacion(): void {
        if (this.cotizacionForm.invalid) return;
        const formValue = this.cotizacionForm.value;

        const request: CrearCotizacionRequest = {
            titulo: formValue.titulo ?? '',
            descripcion: formValue.descripcion ?? undefined,
            fechaVencimiento: formValue.fechaVencimiento ?? '',
            proveedorIds: (formValue.proveedorIds ?? []).filter((id): id is string => !!id),
            items: (formValue.items ?? []).map((i: Record<string, unknown>) => ({
                productoId: (i['productoId'] as string) || undefined,
                productoNombre: i['productoNombre'] as string,
                sku: (i['sku'] as string) || undefined,
                cantidad: Number(i['cantidad']),
                unidadMedida: (i['unidadMedida'] as string) || 'UNIDAD',
                especificaciones: (i['especificaciones'] as string) || undefined,
            })),
        };

        this.submitting.set(true);
        this.submitError.set(null);
        this.cotizacionService.crear(request).subscribe({
            next: () => {
                this.submitting.set(false);
                this.showForm.set(false);
                this.loadCotizaciones();
            },
            error: (err) => {
                this.submitError.set('Error al crear la cotización');
                this.submitting.set(false);
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    /** Solo se llama en modo edición (estado CREADA); ver `onSubmitForm()`. */
    actualizarCotizacion(): void {
        if (this.cotizacionForm.invalid) return;
        const id = this.editingCotizacionId();
        if (!id) return;
        const formValue = this.cotizacionForm.value;

        const request: ActualizarCotizacionRequest = {
            titulo: formValue.titulo ?? '',
            descripcion: formValue.descripcion ?? undefined,
            fechaVencimiento: formValue.fechaVencimiento ?? '',
            items: (formValue.items ?? []).map((i: Record<string, unknown>) => ({
                productoId: (i['productoId'] as string) || undefined,
                productoNombre: i['productoNombre'] as string,
                sku: (i['sku'] as string) || undefined,
                cantidad: Number(i['cantidad']),
                unidadMedida: (i['unidadMedida'] as string) || 'UNIDAD',
                especificaciones: (i['especificaciones'] as string) || undefined,
            })),
        };

        this.submitting.set(true);
        this.submitError.set(null);
        this.cotizacionService.actualizar(id, request).subscribe({
            next: () => {
                this.submitting.set(false);
                this.showForm.set(false);
                this.editingCotizacionId.set(null);
                this.loadCotizaciones();
            },
            error: (err) => {
                this.submitError.set('Error al actualizar la cotización');
                this.submitting.set(false);
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    enviarCotizacion(id: string): void {
        this.cotizacionService.enviar(id).subscribe({
            next: () => this.loadCotizaciones(),
            error: (err) => {
                this.actionError.set('Error al enviar cotización');
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    /** "Ver detalle" — siempre visible; abre el drawer de solo lectura con items + proveedores invitados. */
    verDetalle(id: string): void {
        this.actionError.set(null);
        this.loadingDetalle.set(true);
        this.showDetalle.set(true);
        this.cotizacionService.getById(id).subscribe({
            next: (detalle) => {
                this.detalleCotizacion.set(detalle);
                this.loadingDetalle.set(false);
                this.cdr.markForCheck();
            },
            error: (err) => {
                this.actionError.set('Error al cargar detalle de cotización');
                this.loadingDetalle.set(false);
                this.showDetalle.set(false);
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    closeDetalle(): void {
        this.showDetalle.set(false);
        this.detalleCotizacion.set(null);
    }

    /** "Editar" — solo visible en estado CREADA; carga el detalle y precarga el drawer/form de creación en modo edición. */
    editarCotizacion(id: string): void {
        this.actionError.set(null);
        this.cotizacionService.getById(id).subscribe({
            next: (detalle) => this.openEditForm(detalle),
            error: (err) => {
                this.actionError.set('Error al cargar cotización para editar');
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    private openEditForm(detalle: CotizacionDetalleDto): void {
        this.editingCotizacionId.set(detalle.id);

        this.proveedoresSeleccionados.set(
            detalle.proveedores.map((p) => ({ id: p.proveedorId, label: p.razonSocial }))
        );
        this.proveedorParaAgregar.setValue(null);

        while (this.itemsArray.length > 0) this.itemsArray.removeAt(0);
        detalle.items.forEach(() => this.itemsArray.push(this.createItemGroup()));

        this.cotizacionForm.patchValue({
            titulo: detalle.titulo,
            descripcion: detalle.descripcion ?? '',
            fechaVencimiento: detalle.fechaVencimiento,
            proveedorIds: detalle.proveedores.map((p) => p.proveedorId),
        });

        detalle.items.forEach((item, idx) => {
            this.itemsArray.at(idx).patchValue({
                productoId: item.productoId ?? undefined,
                productoNombre: item.productoNombre,
                sku: item.sku ?? '',
                cantidad: item.cantidad,
                unidadMedida: item.unidadMedida ?? 'UNIDAD',
                especificaciones: item.especificaciones ?? '',
            });
        });

        this.lookupOpenIndex.set(null);
        this.submitError.set(null);
        this.showForm.set(true);
    }

    /** "Cancelar" — solo visible en estado CREADA. */
    cancelarCotizacion(id: string): void {
        if (!confirm('¿Desea cancelar esta cotización? Esta acción no se puede deshacer.')) return;
        this.actionError.set(null);
        this.cotizacionService.cancelar(id).subscribe({
            next: () => this.loadCotizaciones(),
            error: (err) => {
                this.actionError.set('Error al cancelar cotización');
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    verComparativa(cotizacion: CotizacionResumen): void {
        this.selectedCotizacion.set(cotizacion);
        this.actionError.set(null);
        this.cotizacionService.getComparativa(cotizacion.id).subscribe({
            next: (data) => {
                this.comparativa.set(data);
                this.showComparativa.set(true);
                this.cdr.markForCheck();
            },
            error: (err) => {
                this.actionError.set('Error al cargar comparativa');
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    closeComparativa(): void {
        this.showComparativa.set(false);
        this.comparativa.set(null);
    }

    openAdjudicarModal(cotizacion: CotizacionResumen): void {
        this.selectedCotizacion.set(cotizacion);
        this.adjudicarForm.reset();
        this.actionError.set(null);
        this.showAdjudicarModal.set(true);
    }

    closeAdjudicarModal(): void {
        this.showAdjudicarModal.set(false);
    }

    confirmarAdjudicacion(): void {
        if (this.adjudicarForm.invalid) return;
        const cotizacion = this.selectedCotizacion();
        if (!cotizacion) return;

        const proveedorId = this.adjudicarForm.value.proveedorId ?? '';
        this.cotizacionService.adjudicar(cotizacion.id, proveedorId).subscribe({
            next: () => {
                this.showAdjudicarModal.set(false);
                this.loadCotizaciones();
            },
            error: (err) => {
                this.actionError.set('Error al adjudicar cotización');
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    convertirOc(id: string): void {
        if (!confirm('¿Desea convertir esta cotización en una Orden de Compra?')) return;
        this.cotizacionService.convertirOc(id).subscribe({
            next: () => this.loadCotizaciones(),
            error: (err) => {
                this.actionError.set('Error al convertir en OC');
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    /** Wrapper público: el drawer de detalle usa esto para el label legible del estado (`catalog` es privado). */
    estadoLabel(estado: string): string {
        return this.catalog.label('ESTADO_COTIZACION', estado);
    }

    getBadgeClass(estado: string): string {
        switch (estado) {
            case 'CREADA': return 'badge badge-neutral';
            case 'ENVIADA': return 'badge badge-accent';
            case 'EN_RESPUESTA': return 'badge badge-warning';
            case 'ADJUDICADA': return 'badge badge-success';
            case 'CONVERTIDA_OC': return 'badge badge-success';
            case 'CANCELADA': return 'badge badge-error';
            default: return 'badge badge-neutral';
        }
    }

    isMinPrecio(precio: number | null, precios: (number | null)[]): boolean {
        if (precio === null) return false;
        const valid = precios.filter((p): p is number => p !== null);
        return valid.length > 0 && precio === Math.min(...valid);
    }

    private createItemGroup(): FormGroup {
        return this.fb.group({
            productoId: [undefined as string | undefined],
            productoNombre: ['', Validators.required],
            sku: [''],
            cantidad: [1, [Validators.required, Validators.min(1)]],
            unidadMedida: ['UNIDAD'],
            especificaciones: [''],
        });
    }
}

