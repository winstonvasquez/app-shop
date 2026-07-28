import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import {
    DataTableComponent, TableColumn, TableAction, FilterConfig, FilterChangeEvent,
    DateRangeFilterConfig, DateRangeChangeEvent, PaginationEvent, SortEvent
} from '@shared/ui/tables/data-table/data-table.component';
import { observableFilter, staticFilter, ACTIVO_OPTIONS } from '@shared/ui/tables/data-table/filter-helpers';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { AdminFormSectionComponent } from '@shared/ui/forms/admin-form-section/admin-form-section.component';
import { AdminFormLayoutComponent } from '@shared/ui/forms/admin-form-layout/admin-form-layout.component';
import { ButtonComponent } from '@shared/components';
import { AlertComponent } from '@shared/ui';
import { PromotionsService, Promocion } from '../../services/promotions.service';
import { VentasParametrosService, SelectOption } from '../../services/ventas-parametros.service';
import { CURRENCY_DISPLAY } from '@shared/constants/sunat.constants';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { bloquearEnEdicion, bloquearSiempre } from '@shared/utils/form-lock';

type EstadoPromocion = 'ACTIVA' | 'INACTIVA' | 'VENCIDA';

interface PromocionVM extends Promocion {
    estado: EstadoPromocion;
}

/** 'estado' es un valor DERIVADO en el backend (no una columna) -> staticFilter con los códigos
 *  exactos que acepta PromocionQueryService.findAllPaged, NO catalogFilter (el catálogo
 *  ESTADO_PROMOCION de erp_parameters tiene otros códigos: PROGRAMADA/AGOTADA, sin INACTIVA). */
const ESTADO_PROMOCION_OPTIONS = [
    { value: 'ACTIVA', label: 'Activa' },
    { value: 'INACTIVA', label: 'Inactiva' },
    { value: 'VENCIDA', label: 'Vencida' },
] as const;

/** PromocionEntity.SubtipoPromocion — enum Java sin catálogo seedeado en erp_parameters. */
const SUBTIPO_PROMOCION_OPTIONS = [
    { value: 'FLASH_SALE', label: 'Flash Sale' },
    { value: 'BUNDLE', label: 'Bundle' },
    { value: 'TIERED', label: 'Por niveles' },
    { value: 'BUY_X_GET_Y', label: 'Compra X lleva Y' },
] as const;

@Component({
    selector: 'app-promotions',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        DrawerComponent,
        DataTableComponent,
        DateInputComponent,
        FormFieldComponent,
        AdminFormSectionComponent,
        AdminFormLayoutComponent,
        ButtonComponent,
        AlertComponent,
    ],
    templateUrl: './promotions.component.html',
})
export class PromotionsComponent implements OnInit {
    private readonly service    = inject(PromotionsService);
    private readonly parametros = inject(VentasParametrosService);
    private readonly fb         = inject(FormBuilder);

    promociones  = signal<PromocionVM[]>([]);
    cargando     = signal(false);
    showModal    = signal(false);
    guardando    = signal(false);
    editMode     = signal(false);
    editId       = signal<number | null>(null);
    submitError  = signal('');
    listError    = signal<string | null>(null);

    // Filtros (TODOS server-side — la vista nunca filtra la página cargada)
    searchQuery            = signal('');
    filterEstado           = signal('');
    filterTipo             = signal('');
    filterAlcance          = signal('');
    filterSubtipo          = signal('');
    filterActivo           = signal('');
    filterFechaInicioDesde = signal<string | undefined>(undefined);
    filterFechaInicioHasta = signal<string | undefined>(undefined);
    filterFechaFinDesde    = signal<string | undefined>(undefined);
    filterFechaFinHasta    = signal<string | undefined>(undefined);

    // Paginación
    currentPage   = signal(0);
    pageSize      = signal(20);
    totalElements = signal(0);
    totalPages    = signal(0);

    // Sort
    sortField     = signal('fechaInicio');
    sortDirection = signal<'asc' | 'desc'>('desc');

    tipoOptions    = signal<SelectOption[]>([]);
    alcanceOptions = signal<SelectOption[]>([]);

    // Filtros del toolbar del data-table. 'estado' es DERIVADO -> staticFilter con códigos exactos
    // (ver comentario de ESTADO_PROMOCION_OPTIONS). 'tipo'/'alcance' reutilizan las mismas opciones
    // que el formulario (parámetros de ventas, con fallback local si el backend no responde).
    readonly filters: FilterConfig[] = [
        staticFilter('estado', 'Estado', ESTADO_PROMOCION_OPTIONS),
        observableFilter('tipo', 'Tipo de descuento', this.parametros.getTiposPromocion()),
        observableFilter('alcance', 'Alcance', this.parametros.getAlcancesPromocion()),
        staticFilter('subtipo', 'Subtipo', SUBTIPO_PROMOCION_OPTIONS),
        staticFilter('activo', 'Activa/Inactiva', ACTIVO_OPTIONS),
    ];

    readonly dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fechaInicio', label: 'Fecha de inicio' },
        { field: 'fechaFin', label: 'Fecha de fin (vencimiento)' },
    ];

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'estado':  this.filterEstado.set(valor); break;
            case 'tipo':    this.filterTipo.set(valor); break;
            case 'alcance': this.filterAlcance.set(valor); break;
            case 'subtipo': this.filterSubtipo.set(valor); break;
            case 'activo':  this.filterActivo.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.cargar();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        switch (event.field) {
            case 'fechaInicio':
                this.filterFechaInicioDesde.set(event.from ?? undefined);
                this.filterFechaInicioHasta.set(event.to ?? undefined);
                break;
            case 'fechaFin':
                this.filterFechaFinDesde.set(event.from ?? undefined);
                this.filterFechaFinHasta.set(event.to ?? undefined);
                break;
            default: return;
        }
        this.currentPage.set(0);
        this.cargar();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterEstado.set('');
        this.filterTipo.set('');
        this.filterAlcance.set('');
        this.filterSubtipo.set('');
        this.filterActivo.set('');
        this.filterFechaInicioDesde.set(undefined);
        this.filterFechaInicioHasta.set(undefined);
        this.filterFechaFinDesde.set(undefined);
        this.filterFechaFinHasta.set(undefined);
        this.currentPage.set(0);
        this.cargar();
    }

    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.cargar();
    }

    onPageChange(event: PaginationEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.cargar();
    }

    onSort(event: SortEvent): void {
        this.sortField.set(event.field);
        this.sortDirection.set(event.direction);
        this.currentPage.set(0);
        this.cargar();
    }

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (respeta TODOS los filtros actuales). Ver /sales/api/v1/promociones/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.sales}/api/v1/promociones/export`,
        filename: 'promociones',
        params: () => ({
            search: this.searchQuery() || undefined,
            estado: this.filterEstado() || undefined,
            tipo: this.filterTipo() || undefined,
            alcance: this.filterAlcance() || undefined,
            subtipo: this.filterSubtipo() || undefined,
            activo: this.filterActivo() || undefined,
            fechaInicioDesde: this.filterFechaInicioDesde(),
            fechaInicioHasta: this.filterFechaInicioHasta(),
            fechaFinDesde: this.filterFechaFinDesde(),
            fechaFinHasta: this.filterFechaFinHasta(),
        }),
    };

    form = this.fb.group({
        nombre:       ['', Validators.required],
        descripcion:  [''],
        tipo:         ['PORCENTAJE' as Promocion['tipo'], Validators.required],
        valor:        [0, [Validators.required, Validators.min(0)]],
        alcance:      ['CARRITO' as Promocion['alcance'], Validators.required],
        codigoCupon:  [''],
        limiteUsos:   [null as number | null],
        fechaInicio:  [new Date().toISOString().split('T')[0], Validators.required],
        fechaFin:     ['', Validators.required],
        activo:       [true],
        // DERIVADOS (nunca se envían): usosActuales lo lleva el backend y estado se
        // calcula desde activo + fechaFin. Se muestran bloqueados para poder leerlos.
        usosActuales: [0],
        estado:       ['ACTIVA' as EstadoPromocion],
    });

    /** El código de cupón ya circula entre los clientes: cambiarlo invalida los repartidos. */
    private static readonly CAMPOS_BLOQUEADOS = ['codigoCupon'] as const;

    /** Valores derivados/calculados: nunca editables, ni al crear ni al editar. */
    private static readonly CAMPOS_CALCULADOS = ['usosActuales', 'estado'] as const;

    columns: TableColumn<PromocionVM>[] = [
        { key: 'nombre',    label: 'Nombre' },
        { key: 'tipo',      label: 'Tipo', html: true,
          render: (row) => `<span class="badge badge-neutral">${row.tipo === 'PORCENTAJE' ? '%' : CURRENCY_DISPLAY.SYMBOL_PEN}</span> ${row.tipo.replace('_', ' ')}` },
        { key: 'valor',     label: 'Valor', align: 'right',
          render: (row) => row.tipo === 'PORCENTAJE'
            ? `${row.valor}%`
            : `${CURRENCY_DISPLAY.SYMBOL_PEN} ${row.valor.toFixed(2)}` },
        { key: 'fechaInicio', label: 'Vigencia',
          render: (row) => `${new Date(row.fechaInicio).toLocaleDateString('es-PE')} — ${new Date(row.fechaFin).toLocaleDateString('es-PE')}` },
        { key: 'usosActuales', label: 'Usos',
          render: (row) => row.limiteUsos
            ? `${row.usosActuales} / ${row.limiteUsos}`
            : `${row.usosActuales}` },
        { key: 'estado',    label: 'Estado', html: true,
          render: (row) => `<span class="badge ${this.parametros.getBadgeEstadoPromocion(row.estado)}">${row.estado}</span>` },
    ];

    actions: TableAction<PromocionVM>[] = [
        { label: 'Editar',     icon: '✏️', class: 'btn-view',
          onClick: (row) => this.abrirEditar(row) },
        { label: 'Desactivar', icon: '⊘', class: 'btn-view',
          show: (row) => row.activo && row.estado !== 'VENCIDA',
          onClick: (row) => this.toggleActivo(row) },
    ];

    /**
     * KPIs de cabecera: se calculan sobre una muestra amplia SIN paginar (independiente de la
     * página actual de la tabla) porque el backend todavía no expone un endpoint /stats agregado
     * (ver ficha frontend-admin-ventas.md, notas de promotions). No es el mismo anti-patrón de
     * "filtrar en la vista": aquí no se filtra nada, solo se resume para las 3 tarjetas de cabecera.
     */
    private readonly statsPromociones = signal<PromocionVM[]>([]);

    totalActivas    = computed(() => this.statsPromociones().filter(p => p.estado === 'ACTIVA').length);
    proximasAVencer = computed(() => {
        const en7dias = new Date();
        en7dias.setDate(en7dias.getDate() + 7);
        return this.statsPromociones().filter(p => {
            const fin = new Date(p.fechaFin);
            return p.estado === 'ACTIVA' && fin <= en7dias;
        }).length;
    });
    totalVencidas   = computed(() => this.statsPromociones().filter(p => p.estado === 'VENCIDA').length);

    tipoDescuento = toSignal(this.form.controls.tipo.valueChanges, { initialValue: this.form.controls.tipo.value });

    /** Label dinámico para el campo valor según tipo de descuento seleccionado. */
    valorLabel = computed(() => {
        const tipo = this.tipoDescuento();
        return tipo === 'PORCENTAJE' ? 'Valor (%)' : `Valor (${CURRENCY_DISPLAY.SYMBOL_PEN})`;
    });

    ngOnInit(): void {
        this.cargar();
        this.cargarStats();
        this.parametros.getTiposPromocion().subscribe(opts => this.tipoOptions.set(opts));
        this.parametros.getAlcancesPromocion().subscribe(opts => this.alcanceOptions.set(opts));
    }

    cargar(): void {
        this.cargando.set(true);
        this.service.getAll({
            page: this.currentPage(),
            size: this.pageSize(),
            sortField: this.sortField() || undefined,
            sortDirection: this.sortDirection(),
            search: this.searchQuery() || undefined,
            tipo: this.filterTipo() || undefined,
            alcance: this.filterAlcance() || undefined,
            subtipo: this.filterSubtipo() || undefined,
            activo: this.filterActivo() === '' ? undefined : this.filterActivo() === 'true',
            estado: this.filterEstado() || undefined,
            fechaInicioDesde: this.filterFechaInicioDesde(),
            fechaInicioHasta: this.filterFechaInicioHasta(),
            fechaFinDesde: this.filterFechaFinDesde(),
            fechaFinHasta: this.filterFechaFinHasta(),
        }).subscribe({
            next: (res) => {
                this.promociones.set(res.content.map(p => ({ ...p, estado: this.calcularEstado(p) })));
                this.totalElements.set(pageTotalElements(res));
                this.totalPages.set(pageTotalPages(res));
                this.cargando.set(false);
            },
            error: () => {
                this.promociones.set([]);
                this.cargando.set(false);
            }
        });
    }

    /** Trae una muestra amplia SIN filtros para las tarjetas KPI de cabecera (ver statsPromociones). */
    private cargarStats(): void {
        this.service.getAll({ page: 0, size: 1000 }).subscribe({
            next: (res) => this.statsPromociones.set(res.content.map(p => ({ ...p, estado: this.calcularEstado(p) }))),
            error: () => this.statsPromociones.set([])
        });
    }

    abrirNueva(): void {
        this.resetForm();
        bloquearEnEdicion(this.form, PromotionsComponent.CAMPOS_BLOQUEADOS, false);
        bloquearSiempre(this.form, PromotionsComponent.CAMPOS_CALCULADOS);
        this.editMode.set(false);
        this.editId.set(null);
        this.submitError.set('');
        this.showModal.set(true);
    }

    abrirEditar(row: PromocionVM): void {
        this.form.setValue({
            nombre:      row.nombre,
            descripcion: row.descripcion ?? '',
            tipo:        row.tipo,
            valor:       row.valor,
            alcance:     row.alcance,
            codigoCupon: row.codigoCupon ?? '',
            limiteUsos:  row.limiteUsos ?? null,
            fechaInicio: row.fechaInicio,
            fechaFin:    row.fechaFin,
            activo:      row.activo,
            usosActuales: row.usosActuales ?? 0,
            estado:      row.estado,
        });
        bloquearEnEdicion(this.form, PromotionsComponent.CAMPOS_BLOQUEADOS, true);
        bloquearSiempre(this.form, PromotionsComponent.CAMPOS_CALCULADOS);
        this.form.markAsPristine();
        this.editMode.set(true);
        this.editId.set(row.id ?? null);
        this.submitError.set('');
        this.showModal.set(true);
    }

    err(field: string): string {
        const c = this.form.get(field);
        if (!c || c.pristine || c.valid) return '';
        if (c.hasError('required')) return 'Campo requerido';
        if (c.hasError('min'))      return `Valor mínimo: ${c.getError('min').min}`;
        return 'Campo inválido';
    }

    onSubmit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const v = this.form.getRawValue();

        const dto: Omit<Promocion, 'id' | 'usosActuales'> = {
            nombre:      v.nombre!,
            descripcion: v.descripcion || undefined,
            tipo:        v.tipo as Promocion['tipo'],
            valor:       v.valor!,
            alcance:     v.alcance as Promocion['alcance'],
            codigoCupon: v.codigoCupon || undefined,
            limiteUsos:  v.limiteUsos ?? undefined,
            fechaInicio: v.fechaInicio!,
            fechaFin:    v.fechaFin!,
            activo:      v.activo ?? true,
        };

        this.guardando.set(true);
        this.submitError.set('');

        if (this.editMode() && this.editId() !== null) {
            this.service.update(this.editId()!, dto).subscribe({
                next: () => {
                    this.guardando.set(false);
                    this.cerrarModal();
                    this.cargar();
                    this.cargarStats();
                },
                error: (err: Error) => {
                    this.submitError.set(err.message);
                    this.guardando.set(false);
                }
            });
        } else {
            this.service.create(dto).subscribe({
                next: () => {
                    this.guardando.set(false);
                    this.cerrarModal();
                    this.currentPage.set(0);
                    this.cargar();
                    this.cargarStats();
                },
                error: (err: Error) => {
                    this.submitError.set(err.message);
                    this.guardando.set(false);
                }
            });
        }
    }

    toggleActivo(row: PromocionVM): void {
        this.listError.set(null);
        this.service.update(row.id!, { activo: !row.activo }).subscribe({
            next: () => {
                this.cargar();
                this.cargarStats();
            },
            error: (err: Error) => this.listError.set(err.message)
        });
    }

    cerrarModal(): void {
        this.showModal.set(false);
        this.resetForm();
    }

    private calcularEstado(p: Omit<Promocion, 'id'>): EstadoPromocion {
        if (!p.activo) return 'INACTIVA';
        if (p.fechaFin && new Date(p.fechaFin) < new Date()) return 'VENCIDA';
        return 'ACTIVA';
    }

    private resetForm(): void {
        this.form.reset({
            nombre:      '',
            descripcion: '',
            tipo:        'PORCENTAJE',
            valor:       0,
            alcance:     'CARRITO',
            codigoCupon: '',
            limiteUsos:  null,
            fechaInicio: new Date().toISOString().split('T')[0],
            fechaFin:    '',
            activo:      true,
            usosActuales: 0,
            estado:      'ACTIVA',
        });
        this.form.markAsPristine();
    }
}
