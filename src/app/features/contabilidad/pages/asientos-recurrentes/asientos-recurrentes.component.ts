import {
    Component,
    inject,
    signal,
    computed,
    OnInit,
    ChangeDetectionStrategy,
} from '@angular/core';
import {
    AbstractControl,
    FormArray,
    FormBuilder,
    FormGroup,
    ReactiveFormsModule,
    ValidationErrors,
    ValidatorFn,
    Validators,
} from '@angular/forms';
import { ButtonComponent, CatalogSelectComponent } from '@shared/components';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { AdminFormSectionComponent } from '@shared/ui/forms/admin-form-section/admin-form-section.component';
import { AdminFormLayoutComponent } from '@shared/ui/forms/admin-form-layout/admin-form-layout.component';
import {
    DataTableComponent, TableColumn, TableAction, PaginationEvent,
    FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent,
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, staticFilter, ACTIVO_OPTIONS } from '@shared/ui/tables/data-table/filter-helpers';
import { CatalogService } from '@core/services/catalog.service';
import {
    AsientoRecurrenteService,
    AsientoRecurrente,
    AsientoRecurrenteRequest,
    RecurringLineItem,
} from '../../services/asiento-recurrente.service';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { environment } from '@env/environment';

@Component({
    selector: 'app-asientos-recurrentes',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        ButtonComponent,
        CatalogSelectComponent,
        DrawerComponent,
        FormFieldComponent,
        AdminFormSectionComponent,
        AdminFormLayoutComponent,
        DataTableComponent,
    ],
    templateUrl: './asientos-recurrentes.component.html',
})
export class AsientosRecurrentesComponent implements OnInit {
    private service = inject(AsientoRecurrenteService);
    private fb = inject(FormBuilder);
    readonly catalog = inject(CatalogService);

    recurrentes = signal<AsientoRecurrente[]>([]);
    cargando = signal(false);
    guardando = signal(false);
    error = signal('');
    submitError = signal('');

    mostrarForm = signal(false);
    readonly editandoId = signal<string | null>(null);

    readonly frecuenciaLabel = (f: string) => this.catalog.label('FRECUENCIA_RECURRENCIA', f);

    // ── Tabla — TODOS los filtros son server-side, la vista nunca filtra la página cargada ────
    readonly searchQuery = signal('');
    readonly currentPage = signal(0);
    readonly pageSize = signal(20);
    readonly totalElements = signal(0);
    readonly totalPages = signal(0);

    readonly filterFrecuencia = signal('');
    /** '' = todos, 'true' = activos, 'false' = inactivos (ver ACTIVO_OPTIONS). */
    readonly filterActivo = signal('');
    readonly filterNextExecutionDesde = signal<string | null>(null);
    readonly filterNextExecutionHasta = signal<string | null>(null);
    readonly filterLastExecutionDesde = signal<string | null>(null);
    readonly filterLastExecutionHasta = signal<string | null>(null);
    readonly filterVigenciaDesde = signal<string | null>(null);
    readonly filterVigenciaHasta = signal<string | null>(null);

    /**
     * Filtros select del toolbar. `activo` usa `staticFilter` (no `ESTADO_ACTIVO_INACTIVO`,
     * cuyos códigos ACTIVO/INACTIVO son para columnas String): la columna `active` es boolean
     * y el backend espera `true`/`false` literal — ver AsientoRecurrenteController.list.
     */
    filters: FilterConfig[] = [
        catalogFilter(this.catalog, 'FRECUENCIA_RECURRENCIA', 'frecuencia', 'Frecuencia'),
        staticFilter('activo', 'Estado', ACTIVO_OPTIONS),
    ];

    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'nextExecution', label: 'Próxima ejecución' },
        { field: 'lastExecution', label: 'Última ejecución' },
        { field: 'vigencia', label: 'Vigencia (inicio/fin)' },
    ];

    readonly columns: TableColumn<AsientoRecurrente>[] = [
        {
            key: 'name', label: 'Nombre', html: true,
            render: r => `<div class="font-medium text-on">${r.name}</div>${r.description ? `<div class="text-muted text-sm">${r.description}</div>` : ''}`
        },
        { key: 'frequency', label: 'Frecuencia', render: r => this.frecuenciaLabel(r.frequency) },
        { key: 'executionDay', label: 'Día ejecución', render: r => `Día ${r.executionDay}` },
        {
            key: 'nextExecution', label: 'Próxima ejecución',
            render: r => r.nextExecution ? new Date(r.nextExecution).toLocaleDateString('es-PE') : '—'
        },
        {
            key: 'lastExecution', label: 'Última ejecución',
            render: r => r.lastExecution ? new Date(r.lastExecution).toLocaleDateString('es-PE') : '—'
        },
        {
            key: 'active', label: 'Estado', html: true,
            render: r => r.active
                ? '<span class="badge badge-success">Activo</span>'
                : '<span class="badge badge-neutral">Inactivo</span>'
        },
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios,
     * respetando los mismos filtros vigentes en la búsqueda.
     * Ver /finance/api/v1/contabilidad/asientos-recurrentes/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.accounting}/api/v1/contabilidad/asientos-recurrentes/export`,
        filename: 'asientos-recurrentes',
        params: () => ({
            q: this.searchQuery(),
            frecuencia: this.filterFrecuencia(),
            activo: this.filterActivo(),
            nextExecutionDesde: this.filterNextExecutionDesde() ?? undefined,
            nextExecutionHasta: this.filterNextExecutionHasta() ?? undefined,
            lastExecutionDesde: this.filterLastExecutionDesde() ?? undefined,
            lastExecutionHasta: this.filterLastExecutionHasta() ?? undefined,
            vigenciaDesde: this.filterVigenciaDesde() ?? undefined,
            vigenciaHasta: this.filterVigenciaHasta() ?? undefined,
        }),
    };

    readonly actions: TableAction<AsientoRecurrente>[] = [
        {
            label: 'Editar', icon: 'edit', class: 'btn-view',
            onClick: r => this.abrirEditar(r)
        },
        {
            label: 'Ejecutar ahora', icon: 'check', class: 'btn-view',
            show: r => r.active,
            onClick: r => this.ejecutarAhora(r.id)
        },
        {
            label: 'Desactivar', icon: 'x', class: 'btn-view',
            show: r => r.active,
            onClick: r => this.desactivar(r.id)
        },
        {
            label: 'Activar', icon: 'check', class: 'btn-view',
            show: r => !r.active,
            onClick: r => this.activar(r.id)
        },
    ];

    // ── Reactive Form ────────────────────────────────────────────────────────
    form = this.fb.group({
        nombre: ['', [Validators.required, Validators.minLength(3)]],
        descripcion: [''],
        frecuencia: ['MENSUAL', Validators.required],
        diaEjecucion: [1, [Validators.required, Validators.min(1), Validators.max(31)]],
        fechaInicio: ['', Validators.required],
        fechaFin: [''],
        glosa: ['', Validators.required],
        lineas: this.fb.array<FormGroup>([], { validators: this.balanceValidator() }),
    });

    get lineasArray(): FormArray {
        return this.form.get('lineas') as FormArray;
    }

    // ── Computed para balance ────────────────────────────────────────────────
    balanceError = computed(() => {
        // Forzar dependencia en el valor del form (signal de cambios)
        const _ = this.form.get('lineas')?.errors;
        return this.form.hasError('notBalanced');
    });

    balanceDiff = computed((): string => {
        const err = this.form.getError('notBalanced') as { debe: number; haber: number } | null;
        return err ? Math.abs(err.debe - err.haber).toFixed(2) : '0.00';
    });

    ngOnInit(): void {
        this.cargar();
    }

    cargar(): void {
        this.cargando.set(true);
        this.error.set('');
        this.service.buscarPaginado({
            page: this.currentPage(),
            size: this.pageSize(),
            q: this.searchQuery() || undefined,
            frecuencia: this.filterFrecuencia() || undefined,
            activo: this.filterActivo() ? this.filterActivo() === 'true' : undefined,
            nextExecutionDesde: this.filterNextExecutionDesde() || undefined,
            nextExecutionHasta: this.filterNextExecutionHasta() || undefined,
            lastExecutionDesde: this.filterLastExecutionDesde() || undefined,
            lastExecutionHasta: this.filterLastExecutionHasta() || undefined,
            vigenciaDesde: this.filterVigenciaDesde() || undefined,
            vigenciaHasta: this.filterVigenciaHasta() || undefined,
        }).subscribe({
            next: res => {
                this.recurrentes.set(res.content ?? []);
                this.totalElements.set(pageTotalElements(res));
                this.totalPages.set(pageTotalPages(res));
                this.cargando.set(false);
            },
            error: () => {
                this.error.set('No se pudo cargar la lista de asientos recurrentes.');
                this.cargando.set(false);
            },
        });
    }

    /** La búsqueda por texto también va al backend (`q`), no filtra la página cargada. */
    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.cargar();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'frecuencia': this.filterFrecuencia.set(valor); break;
            case 'activo':     this.filterActivo.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.cargar();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        switch (event.field) {
            case 'nextExecution':
                this.filterNextExecutionDesde.set(event.from);
                this.filterNextExecutionHasta.set(event.to);
                break;
            case 'lastExecution':
                this.filterLastExecutionDesde.set(event.from);
                this.filterLastExecutionHasta.set(event.to);
                break;
            case 'vigencia':
                this.filterVigenciaDesde.set(event.from);
                this.filterVigenciaHasta.set(event.to);
                break;
            default: return;
        }
        this.currentPage.set(0);
        this.cargar();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterFrecuencia.set('');
        this.filterActivo.set('');
        this.filterNextExecutionDesde.set(null);
        this.filterNextExecutionHasta.set(null);
        this.filterLastExecutionDesde.set(null);
        this.filterLastExecutionHasta.set(null);
        this.filterVigenciaDesde.set(null);
        this.filterVigenciaHasta.set(null);
        this.currentPage.set(0);
        this.cargar();
    }

    onPageChange(event: PaginationEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.cargar();
    }

    abrirForm(): void {
        this.editandoId.set(null);
        this.resetForm();
        this.mostrarForm.set(true);
    }

    /** Precarga el form con la plantilla existente. nextExecution/lastExecution NO se editan (calculados). */
    abrirEditar(r: AsientoRecurrente): void {
        this.editandoId.set(r.id);
        this.form.reset({
            nombre: r.name,
            descripcion: r.description ?? '',
            frecuencia: r.frequency,
            diaEjecucion: r.executionDay,
            fechaInicio: r.startDate,
            fechaFin: r.endDate ?? '',
            glosa: r.templateGloss,
        });
        while (this.lineasArray.length > 0) {
            this.lineasArray.removeAt(0);
        }
        for (const linea of r.templateLines) {
            this.lineasArray.push(
                this.fb.group({
                    accountCode: [linea.accountCode, Validators.required],
                    movementType: [linea.movementType, Validators.required],
                    amount: [linea.amount, [Validators.required, Validators.min(0.01)]],
                }),
            );
        }
        this.submitError.set('');
        this.mostrarForm.set(true);
    }

    cerrarForm(): void {
        this.mostrarForm.set(false);
    }

    addLinea(): void {
        this.lineasArray.push(
            this.fb.group({
                accountCode: ['', Validators.required],
                movementType: ['DEBE', Validators.required],
                amount: [0, [Validators.required, Validators.min(0.01)]],
            }),
        );
    }

    removeLinea(i: number): void {
        this.lineasArray.removeAt(i);
    }

    onSubmit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        if (this.lineasArray.length < 2) {
            return;
        }

        const v = this.form.getRawValue();

        const templateLines: RecurringLineItem[] = this.lineasArray.controls.map(ctrl => ({
            accountCode: ctrl.get('accountCode')!.value as string,
            movementType: ctrl.get('movementType')!.value as 'DEBE' | 'HABER',
            amount: Number(ctrl.get('amount')!.value),
        }));

        const request: AsientoRecurrenteRequest = {
            name: v.nombre ?? '',
            description: v.descripcion ?? '',
            frequency: v.frecuencia ?? 'MENSUAL',
            executionDay: Number(v.diaEjecucion ?? 1),
            startDate: v.fechaInicio ?? '',
            endDate: v.fechaFin || null,
            templateGloss: v.glosa ?? '',
            templateLines,
        };

        const id = this.editandoId();
        this.guardando.set(true);
        this.submitError.set('');
        const obs = id ? this.service.actualizar(id, request) : this.service.crear(request);
        obs.subscribe({
            next: () => {
                this.guardando.set(false);
                this.mostrarForm.set(false);
                this.cargar();
            },
            error: () => {
                this.submitError.set(id
                    ? 'No se pudo actualizar el asiento recurrente.'
                    : 'No se pudo guardar el asiento recurrente.');
                this.guardando.set(false);
            },
        });
    }

    ejecutarAhora(id: string): void {
        this.service.ejecutarAhora(id).subscribe({
            next: actualizado => {
                this.recurrentes.update(ls => ls.map(r => r.id === id ? actualizado : r));
            },
        });
    }

    activar(id: string): void {
        this.service.activar(id).subscribe({
            next: () => this.cargar(),
            error: () => {
                this.error.set('No se pudo reactivar el asiento recurrente.');
            },
        });
    }

    desactivar(id: string): void {
        this.service.desactivar(id).subscribe({
            next: () => this.cargar(),
        });
    }

    // ── Helpers de error ─────────────────────────────────────────────────────
    err(field: string): string {
        const c = this.form.get(field);
        if (!c || c.pristine || c.valid) return '';
        if (c.hasError('required')) return 'Campo requerido';
        if (c.hasError('minlength')) {
            return `Mínimo ${(c.getError('minlength') as { requiredLength: number }).requiredLength} caracteres`;
        }
        if (c.hasError('min')) return `Valor mínimo: ${(c.getError('min') as { min: number }).min}`;
        if (c.hasError('max')) return `Valor máximo: ${(c.getError('max') as { max: number }).max}`;
        return 'Campo inválido';
    }

    errLinea(i: number, field: string): string {
        const ctrl = this.lineasArray.at(i)?.get(field);
        if (!ctrl || ctrl.pristine || ctrl.valid) return '';
        if (ctrl.hasError('required')) return 'Campo requerido';
        if (ctrl.hasError('min')) return 'Monto mínimo: 0.01';
        return 'Campo inválido';
    }

    // ── Validador de balance ─────────────────────────────────────────────────
    private balanceValidator(): ValidatorFn {
        return (array: AbstractControl): ValidationErrors | null => {
            const fa = array as FormArray;
            if (fa.length === 0) return null;
            const lineas = fa.controls.map(c => c.value as { movementType: string; amount: number });
            const debe = lineas
                .filter(l => l.movementType === 'DEBE')
                .reduce((sum, l) => sum + Number(l.amount || 0), 0);
            const haber = lineas
                .filter(l => l.movementType === 'HABER')
                .reduce((sum, l) => sum + Number(l.amount || 0), 0);
            return Math.abs(debe - haber) < 0.01 ? null : { notBalanced: { debe, haber } };
        };
    }

    private resetForm(): void {
        this.form.reset({
            nombre: '',
            descripcion: '',
            frecuencia: 'MENSUAL',
            diaEjecucion: 1,
            fechaInicio: '',
            fechaFin: '',
            glosa: '',
        });
        // Limpiar FormArray
        while (this.lineasArray.length > 0) {
            this.lineasArray.removeAt(0);
        }
        // Insertar dos líneas iniciales
        this.addLinea();
        this.addLinea();
        // Segunda línea con HABER
        this.lineasArray.at(1).get('movementType')?.setValue('HABER');
        this.submitError.set('');
    }
}
