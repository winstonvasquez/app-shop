import {
    Component, OnInit, inject, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { richTextMaxLength } from '@core/utils/rich-text.util';
import { SegmentService } from '@features/admin/services/segment.service';
import { PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import {
    DataTableComponent, TableColumn, TableAction, FilterConfig, FilterChangeEvent,
    DateRangeFilterConfig, DateRangeChangeEvent
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, staticFilter, ACTIVO_OPTIONS } from '@shared/ui/tables/data-table/filter-helpers';
import { CatalogService } from '@core/services/catalog.service';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { ButtonComponent, CatalogSelectComponent, RichTextEditorComponent } from '@shared/components';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import {
    SegmentResponse,
    SegmentRequest,
    SEGMENT_COLOR_OPTIONS
} from '@features/admin/models/segment.model';

@Component({
    selector: 'app-segments',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ReactiveFormsModule, DataTableComponent, DrawerComponent, ButtonComponent, CatalogSelectComponent, RichTextEditorComponent],
    templateUrl: './segments.component.html',
    styleUrl: './segments.component.scss'
})
export class SegmentsComponent implements OnInit {
    private readonly segmentService = inject(SegmentService);
    private readonly fb = inject(FormBuilder);
    readonly catalog = inject(CatalogService);

    // Datos
    segments = signal<SegmentResponse[]>([]);
    selectedSegment = signal<SegmentResponse | null>(null);

    // UI
    loading    = signal(false);
    error      = signal<string | null>(null);
    showDrawer = signal(false);
    editMode   = signal(false);
    submitting = signal(false);
    submitError = signal<string | null>(null);

    // Filtros (TODOS server-side — la vista nunca filtra la página cargada)
    searchQuery            = signal('');
    filterActivo           = signal('');
    filterTipoCliente      = signal('');
    filterFechaCreacionDesde = signal<string | undefined>(undefined);
    filterFechaCreacionHasta = signal<string | undefined>(undefined);

    // Filtros del toolbar del data-table. tipoCliente usa el MISMO catálogo que el formulario
    // (CATEGORIA_CLIENTE: VIP/REGULAR/OCASIONAL/MAYORISTA) para que los códigos coincidan con
    // lo que realmente se persiste en SegmentoEntity.tipoCliente.
    readonly filters: FilterConfig[] = [
        catalogFilter(this.catalog, 'CATEGORIA_CLIENTE', 'tipoCliente', 'Tipo de cliente'),
        staticFilter('activo', 'Estado', ACTIVO_OPTIONS),
    ];

    readonly dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fechaCreacion', label: 'Fecha de creación' }
    ];

    // Paginación
    currentPage   = signal(0);
    pageSize      = signal(20);
    totalElements = signal(0);
    totalPages    = signal(0);

    // Computed
    // Columnas del data-table estándar
    columns: TableColumn<SegmentResponse>[] = [
        { key: 'nombre', label: 'Segmento', html: true,
          render: (s) => `<span class="segment-dot" style="background:${s.color};display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:8px;vertical-align:middle"></span><span class="font-medium">${s.nombre}</span>` },
        { key: 'tipoCliente', label: 'Tipo de Cliente', html: true,
          render: (s) => `<span class="badge badge-neutral">${s.tipoCliente}</span>` },
        { key: 'descripcion', label: 'Descripción', html: true, render: (s) => s.descripcion || '—' },
        { key: 'totalClientes', label: 'Clientes', align: 'right',
          render: (s) => String(s.totalClientes ?? 0) },
        { key: 'activo', label: 'Estado', html: true,
          render: (s) => `<span class="badge ${s.activo ? 'badge-success' : 'badge-neutral'}">${s.activo ? 'Activo' : 'Inactivo'}</span>` }
    ];

    actions: TableAction<SegmentResponse>[] = [
        { label: 'Editar', icon: 'edit', class: 'btn-icon-edit', onClick: (row) => this.openEdit(row) },
        { label: 'Eliminar', icon: 'delete', class: 'btn-icon-delete', onClick: (row) => this.onDelete(row) }
    ];

    hasSegments = computed(() => this.segments().length > 0);
    isEmpty     = computed(() => !this.loading() && !this.hasSegments());

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (respeta TODOS los filtros actuales). Ver /users/api/segments/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.users}/api/segments/export`,
        filename: 'segmentos',
        params: () => ({
            search: this.searchQuery() || undefined,
            activo: this.filterActivo() || undefined,
            tipoCliente: this.filterTipoCliente() || undefined,
            fechaDesde: this.filterFechaCreacionDesde(),
            fechaHasta: this.filterFechaCreacionHasta(),
        }),
    };

    // Opciones
    colorOptions        = SEGMENT_COLOR_OPTIONS;

    segmentForm: FormGroup;

    constructor() {
        this.segmentForm = this.fb.group({
            nombre:      ['', [Validators.required, Validators.maxLength(100)]],
            descripcion: ['', [richTextMaxLength(300)]],
            color:       ['#d7132a', [Validators.required]],
            tipoCliente: ['REGULAR', [Validators.required]],
            activo:      [true]
        });
    }

    ngOnInit(): void {
        this.loadSegments();
    }

    loadSegments(): void {
        this.loading.set(true);
        this.error.set(null);

        this.segmentService.getAll({
            page: this.currentPage(),
            size: this.pageSize(),
            search: this.searchQuery() || undefined,
            activo: this.filterActivo() === '' ? undefined : this.filterActivo() === 'true',
            tipoCliente: this.filterTipoCliente() || undefined,
            fechaDesde: this.filterFechaCreacionDesde(),
            fechaHasta: this.filterFechaCreacionHasta()
        }).subscribe({
            next: (res) => {
                this.segments.set(res.content);
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

    onSearch(query: string): void {
        this.searchQuery.set(query);
        this.currentPage.set(0);
        this.loadSegments();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'tipoCliente': this.filterTipoCliente.set(valor); break;
            case 'activo':      this.filterActivo.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadSegments();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field !== 'fechaCreacion') return;
        this.filterFechaCreacionDesde.set(event.from ?? undefined);
        this.filterFechaCreacionHasta.set(event.to ?? undefined);
        this.currentPage.set(0);
        this.loadSegments();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterTipoCliente.set('');
        this.filterActivo.set('');
        this.filterFechaCreacionDesde.set(undefined);
        this.filterFechaCreacionHasta.set(undefined);
        this.currentPage.set(0);
        this.loadSegments();
    }

    onPaginationChange(event: PaginationChangeEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadSegments();
    }

    openCreate(): void {
        this.editMode.set(false);
        this.selectedSegment.set(null);
        this.segmentForm.reset({ color: '#d7132a', tipoCliente: 'REGULAR', activo: true });
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    openEdit(segment: SegmentResponse): void {
        this.editMode.set(true);
        this.selectedSegment.set(segment);
        this.segmentForm.patchValue({
            nombre:      segment.nombre,
            descripcion: segment.descripcion,
            color:       segment.color,
            tipoCliente: segment.tipoCliente,
            activo:      segment.activo
        });
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    closeDrawer(): void {
        this.showDrawer.set(false);
        this.segmentForm.reset();
    }

    onSubmit(): void {
        if (this.segmentForm.invalid) {
            this.segmentForm.markAllAsTouched();
            return;
        }

        this.submitting.set(true);
        this.submitError.set(null);

        const request: SegmentRequest = this.segmentForm.value as SegmentRequest;
        const op = this.editMode()
            ? this.segmentService.update(this.selectedSegment()!.id, request)
            : this.segmentService.create(request);

        op.subscribe({
            next: () => {
                this.submitting.set(false);
                this.closeDrawer();
                this.loadSegments();
            },
            error: (err: Error) => {
                this.submitError.set(err.message);
                this.submitting.set(false);
            }
        });
    }

    onDelete(segment: SegmentResponse): void {
        if (!confirm(`¿Eliminar el segmento "${segment.nombre}"?`)) return;
        this.loading.set(true);
        this.segmentService.delete(segment.id).subscribe({
            next: () => this.loadSegments(),
            error: (err: Error) => {
                this.error.set(err.message);
                this.loading.set(false);
            }
        });
    }

    hasError(controlName: string): boolean {
        const control = this.segmentForm.get(controlName);
        return !!(control && control.invalid && control.touched);
    }

    getErrorMessage(controlName: string): string {
        const control = this.segmentForm.get(controlName);
        if (!control || !control.errors || !control.touched) return '';
        if (control.errors['required'])  return 'Este campo es obligatorio';
        if (control.errors['maxlength']) return `Máximo ${control.errors['maxlength'].requiredLength} caracteres`;
        return 'Campo inválido';
    }
}
