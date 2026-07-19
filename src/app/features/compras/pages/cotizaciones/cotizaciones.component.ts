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
import { of } from 'rxjs';
import { CotizacionService } from '../../services/cotizacion.service';
import { AuthService } from '@core/auth/auth.service';
import {
    CotizacionResumen,
    ComparativaDto,
    CrearCotizacionRequest,
} from '../../models/cotizacion.model';
import { ButtonComponent } from '@shared/components';
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

@Component({
    selector: 'app-cotizaciones',
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
    ],
    templateUrl: './cotizaciones.component.html',
})
export class CotizacionesComponent implements OnInit {
    private readonly cotizacionService = inject(CotizacionService);
    private readonly authService = inject(AuthService);
    private readonly fb = inject(FormBuilder);
    private readonly cdr = inject(ChangeDetectorRef);

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

    filterEstado = signal('');
    currentPage = signal(0);
    pageSize = signal(10);
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

    estadoOptions = [
        { value: 'CREADA', label: 'Creada' },
        { value: 'ENVIADA', label: 'Enviada' },
        { value: 'EN_RESPUESTA', label: 'En Respuesta' },
        { value: 'ADJUDICADA', label: 'Adjudicada' },
        { value: 'CONVERTIDA_OC', label: 'Convertida en OC' },
        { value: 'CANCELADA', label: 'Cancelada' },
    ];

    columns: TableColumn<CotizacionResumen>[] = [
        { key: 'codigo', label: 'Código' },
        { key: 'titulo', label: 'Título' },
        {
            key: 'estado',
            label: 'Estado',
            html: true,
            render: (row) => `<span class="${this.getBadgeClass(row.estado)}">${this.getEstadoLabel(row.estado)}</span>`,
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
            options: of(this.estadoOptions.map((o) => ({ value: o.value, label: o.label }))),
        },
    ];

    cotizacionForm = this.fb.group({
        titulo: ['', Validators.required],
        descripcion: [''],
        fechaVencimiento: ['', Validators.required],
        proveedorIds: [[] as string[]],
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
        this.cotizacionForm.reset();
        while (this.itemsArray.length > 0) this.itemsArray.removeAt(0);
        this.itemsArray.push(this.createItemGroup());
        this.submitError.set(null);
        this.showForm.set(true);
    }

    closeForm(): void {
        this.showForm.set(false);
    }

    addItem(): void {
        this.itemsArray.push(this.createItemGroup());
    }

    removeItem(index: number): void {
        if (this.itemsArray.length > 1) this.itemsArray.removeAt(index);
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

    getEstadoLabel(estado: string): string {
        return this.estadoOptions.find((o) => o.value === estado)?.label ?? estado;
    }

    isMinPrecio(precio: number | null, precios: (number | null)[]): boolean {
        if (precio === null) return false;
        const valid = precios.filter((p): p is number => p !== null);
        return valid.length > 0 && precio === Math.min(...valid);
    }

    private createItemGroup(): FormGroup {
        return this.fb.group({
            productoNombre: ['', Validators.required],
            sku: [''],
            cantidad: [1, [Validators.required, Validators.min(1)]],
            unidadMedida: ['UNIDAD'],
            especificaciones: [''],
        });
    }
}
