import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PayrollService } from '../../services/payroll.service';
import { EmployeeService } from '../../services/employee.service';
import { DepartmentService } from '../../services/department.service';
import { Department } from '../../models/department.model';
import { Payroll, PayrollRequest, PayrollStatus } from '../../models/payroll.model';
import { CatalogService } from '@core/services/catalog.service';
import {
    DataTableComponent, TableColumn, TableAction, FilterConfig, FilterChangeEvent,
    DateRangeFilterConfig, DateRangeChangeEvent,
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import { PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { AdminFormSectionComponent } from '@shared/ui/forms/admin-form-section/admin-form-section.component';
import { ServerSearchSelectComponent } from '@shared/components';
import { employeeSelectSource } from '../../components/select-sources';

/**
 * Planilla del periodo — orquesta el motor de nómina del backend (microshopusers).
 * NO calcula nada en el cliente: genera (POST /run), lista lo persistido (GET /period)
 * y transiciona estados (GENERADO → APROBADO → PAGADO). Cada fila abre su boleta real
 * por payrollId → la boleta tiene procedencia trazable.
 *
 * Debajo de esa tarjeta de generación (que NO se toca) se suma un listado completo de
 * boletas (GET /paged) con filtros avanzados, exportación server-side y paginación —
 * responde preguntas del tipo "todas las boletas PENDIENTES del departamento X",
 * imposibles de resolver solo con la vista por periodo.
 */
@Component({
    selector: 'app-payroll',
    standalone: true,
    imports: [
        DecimalPipe, DatePipe, FormsModule, ReactiveFormsModule, DataTableComponent,
        DrawerComponent, FormFieldComponent, AdminFormSectionComponent, ServerSearchSelectComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './payroll.component.html',
})
export class PayrollComponent implements OnInit {
    private readonly payrollService = inject(PayrollService);
    private readonly employeeService = inject(EmployeeService);
    private readonly departmentService = inject(DepartmentService);
    private readonly fb = inject(FormBuilder);
    readonly catalog = inject(CatalogService);
    private readonly router = inject(Router);

    /** Fuente server-side del select de empleado del drawer de boleta individual. */
    readonly employeeSource = employeeSelectSource(this.employeeService);

    readonly planillas = this.payrollService.payrolls;
    readonly cargando = this.payrollService.loading;
    readonly accionando = signal(false);
    readonly mensaje = signal<string | null>(null);
    readonly error = signal<string | null>(null);

    periodo = new Date().toISOString().substring(0, 7);
    readonly mesMaximo = new Date().toISOString().substring(0, 7);

    private readonly ingresos = (p: Payroll) =>
        (p.sueldoBase || 0) + (p.bonos || 0) + (p.montoHorasExtras || 0) + (p.asignacionFamiliar || 0);
    bruto = (p: Payroll) => this.ingresos(p);
    descuentos = (p: Payroll) => (p.descuentos || 0) + (p.montoAfpOnp || 0) + (p.rentaQuinta || 0);

    totalSueldoBase = computed(() => this.planillas().reduce((s, p) => s + (p.sueldoBase || 0), 0));
    totalBruto      = computed(() => this.planillas().reduce((s, p) => s + this.ingresos(p), 0));
    totalDescuentos = computed(() => this.planillas().reduce((s, p) => s + this.descuentos(p), 0));
    totalNeto       = computed(() => this.planillas().reduce((s, p) => s + (p.neto || 0), 0));
    totalEssalud    = computed(() => this.planillas().reduce((s, p) => s + (p.essalud || 0), 0));

    // ── Listado completo de boletas (server-side, TODOS los periodos) ─────────

    readonly boletas        = this.payrollService.payrollsPaged;
    readonly boletasLoading = this.payrollService.pagedLoading;
    readonly boletasError   = signal<string | null>(null);

    /** Empleados para el select de filtro del toolbar (activos, ya cargados por EmployeeService). */
    readonly employeesFiltro = this.employeeService.activeEmployees;
    /** Departamentos para el select de filtro del toolbar (lista acotada, no requiere server-search). */
    readonly departamentosFiltro = signal<Department[]>([]);

    /**
     * Periodo del listado (input mes, NO select): el backend hace matching EXACTO
     * ("p.periodo = :periodo") y el periodo es un valor libre "YYYY-MM" que crece
     * cada mes con cada corrida — no hay un catálogo finito de periodos que ofrecer
     * en un `<select>` (a diferencia de estado/AFP/departamento). Se deja fuera del
     * array `filters` del data-table (que solo renderiza selects) y se resuelve con
     * el mismo control nativo `<input type="month">` que ya usa la tarjeta de arriba.
     * Es un campo plano (no signal) para el two-way binding [(ngModel)], igual que `periodo`.
     */
    periodoLista = '';

    // ── Filtros del listado (server-side) ──────────────────────────────────────
    filterEstado       = signal('');
    filterEmployeeId   = signal('');
    filterDepartmentId = signal('');
    filterAfpOnp       = signal('');
    filterFechaPagoDesde = signal<string | null>(null);
    filterFechaPagoHasta = signal<string | null>(null);
    searchQuery = signal('');

    /**
     * Opciones del filtro `afpOnp`: el backend guarda el valor COMPUESTO exacto que
     * arma PayrollCommandService al generar la boleta: "ONP" o "AFP - <Nombre>"
     * (columna `afp_onp`, matching exacto `p.afpOnp = :afpOnp`, no LIKE). No existe
     * un catálogo con ese formato compuesto en erp_parameters, así que se arma en
     * cliente a partir del catálogo `AFP` (fuente única de los nombres de AFP) más
     * la opción fija "ONP" (que no tiene AFP asociada y por eso no vive en ese catálogo).
     */
    readonly afpOnpOptions = computed(() => {
        const afps = this.catalog.options('AFP')();
        return [
            { value: 'ONP', label: 'ONP' },
            ...afps.map(a => ({ value: `AFP - ${a.valor}`, label: `AFP - ${a.valor}` })),
        ];
    });

    filters: FilterConfig[] = [
        catalogFilter(this.catalog, 'ESTADO_PLANILLA', 'estado', 'Estado'),
        signalFilter('employeeId', 'Empleado', this.employeesFiltro,
            e => ({ value: e.id, label: `${e.nombres} ${e.apellidos}` })),
        signalFilter('departmentId', 'Departamento', this.departamentosFiltro,
            d => ({ value: d.id, label: d.nombre })),
        signalFilter('afpOnp', 'Sistema previsional', this.afpOnpOptions, o => o),
    ];

    /** Rango de fecha de pago para el toolbar del data-table. */
    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fechaPago', label: 'Fecha de pago' },
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (respeta todos los filtros vigentes, incluido el periodo). Ver /hr/api/payroll/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.hr}/api/payroll/export`,
        filename: 'planillas',
        params: () => ({
            periodo: this.periodoLista || undefined,
            search: this.searchQuery(),
            estado: this.filterEstado(),
            employeeId: this.filterEmployeeId(),
            departmentId: this.filterDepartmentId(),
            afpOnp: this.filterAfpOnp(),
            fechaPagoDesde: this.filterFechaPagoDesde() ?? undefined,
            fechaPagoHasta: this.filterFechaPagoHasta() ?? undefined,
        }),
    };

    // ── Paginación (server-side) ────────────────────────────────────────────────
    currentPage   = signal(0);
    pageSize      = signal(20);
    totalElements = signal(0);
    totalPages    = signal(0);

    boletasColumns: TableColumn<Payroll>[] = [
        { key: 'employeeName', label: 'Empleado', render: r => r.employeeName || `Empleado #${r.employeeId}` },
        { key: 'periodo', label: 'Periodo', render: r => this.formatPeriodo(r.periodo) },
        { key: 'afpOnp', label: 'Previsional', render: r => r.afpOnp || '—' },
        { key: 'sueldoBase', label: 'S. Base', align: 'right', render: r => `S/ ${r.sueldoBase.toFixed(2)}` },
        { key: 'neto', label: 'Neto', align: 'right', render: r => `S/ ${r.neto.toFixed(2)}` },
        {
            key: 'estado', label: 'Estado', html: true,
            render: r => `<span class="badge ${this.estadoBadge(r.estado)}">${this.catalog.label('ESTADO_PLANILLA', r.estado) || r.estado}</span>`
        },
        {
            key: 'fechaPago', label: 'Fecha de pago',
            render: r => r.fechaPago ? new Date(r.fechaPago + 'T00:00').toLocaleDateString('es-PE') : '—'
        },
    ];

    boletasActions: TableAction<Payroll>[] = [
        { label: 'Ver boleta', icon: 'view', onClick: row => this.verBoleta(row.id) },
        {
            label: 'Corregir', icon: 'edit',
            // Solo GENERADO: PayrollCommandService.updatePayroll rechaza cualquier otro estado
            // con payroll.estado.invalido (400). Sin esta guarda el boton abria el drawer sobre
            // una boleta APROBADA/PAGADA/CANCELADA y solo podia fallar al guardar.
            show: row => row.estado === 'GENERADO',
            onClick: row => this.openCorregirBoleta(row),
        },
    ];

    // ── Drawer "Nueva boleta / corregir" ────────────────────────────────────────
    // Alta: POST /hr/api/payroll — crea la boleta de un empleado que la corrida por periodo
    // no generó (ej. ingresó a mitad de mes). Si YA existe boleta para ese empleado y periodo,
    // el backend responde 409 (Conflict), mostrado tal cual en boletaSubmitError.
    // Corregir: PUT /hr/api/payroll/{id} — sobrescribe una boleta YA persistida (mismo cálculo
    // previsional AFP/ONP/EsSalud/Renta 5ta que el alta). Solo permitido si la boleta sigue
    // GENERADO; APROBADA/PAGADA/CANCELADA responden 400 (ya disparó pago/asiento contable).
    readonly showBoletaDrawer   = signal(false);
    readonly boletaSubmitting   = signal(false);
    readonly boletaSubmitError  = signal<string | null>(null);
    /** Boleta de origen cuando se abre desde "Corregir" (null = alta nueva). Solo para el título/aviso. */
    readonly boletaCorrigiendo  = signal<Payroll | null>(null);

    readonly boletaForm = this.fb.group({
        employeeId: [null as number | null, Validators.required],
        periodo: ['', [Validators.required, Validators.pattern(/^\d{4}-\d{2}$/)]],
        sueldoBase: [null as number | null, [Validators.required, Validators.min(0.01)]],
        bonos: [null as number | null, [Validators.min(0)]],
        descuentos: [null as number | null, [Validators.min(0)]],
        asignacionFamiliar: [null as number | null, [Validators.min(0)]],
        montoHorasExtras: [null as number | null, [Validators.min(0)]],
        diasTrabajados: [30 as number | null, [Validators.min(0)]],
    });

    getBoletaControl(name: string): FormControl {
        return this.boletaForm.get(name) as FormControl;
    }

    /** Alta: boleta nueva para un empleado sin planilla registrada en el periodo elegido. */
    openNuevaBoleta(): void {
        this.boletaCorrigiendo.set(null);
        this.boletaSubmitError.set(null);
        this.boletaForm.reset({ periodo: this.periodoLista || this.periodo, diasTrabajados: 30 });
        this.showBoletaDrawer.set(true);
    }

    /** Corregir: precarga los valores de una boleta ya persistida como punto de partida. */
    openCorregirBoleta(p: Payroll): void {
        this.boletaCorrigiendo.set(p);
        this.boletaSubmitError.set(null);
        this.boletaForm.reset({
            employeeId: p.employeeId,
            periodo: p.periodo,
            sueldoBase: p.sueldoBase,
            bonos: p.bonos ?? null,
            descuentos: p.descuentos ?? null,
            asignacionFamiliar: p.asignacionFamiliar ?? null,
            montoHorasExtras: p.montoHorasExtras ?? null,
            diasTrabajados: p.diasTrabajados ?? 30,
        });
        this.showBoletaDrawer.set(true);
    }

    closeBoletaDrawer(): void {
        this.showBoletaDrawer.set(false);
        this.boletaCorrigiendo.set(null);
        this.boletaForm.reset();
    }

    async guardarBoleta(): Promise<void> {
        if (this.boletaForm.invalid) {
            this.boletaForm.markAllAsTouched();
            return;
        }
        this.boletaSubmitting.set(true);
        this.boletaSubmitError.set(null);
        try {
            const val = this.boletaForm.getRawValue();
            const request: PayrollRequest = {
                employeeId: val.employeeId!,
                periodo: val.periodo!,
                sueldoBase: val.sueldoBase!,
                bonos: val.bonos ?? undefined,
                descuentos: val.descuentos ?? undefined,
                asignacionFamiliar: val.asignacionFamiliar ?? undefined,
                montoHorasExtras: val.montoHorasExtras ?? undefined,
                diasTrabajados: val.diasTrabajados ?? undefined,
            };
            const boletaOrigen = this.boletaCorrigiendo();
            if (boletaOrigen) {
                await this.payrollService.updatePayroll(boletaOrigen.id, request);
            } else {
                await this.payrollService.createPayroll(request);
            }
            const periodoCreado = request.periodo;
            this.closeBoletaDrawer();
            // Refresca la tarjeta de periodo SOLO si coincide con la boleta creada; el
            // listado completo (paginado) siempre se refresca porque no está acotado a un periodo.
            if (periodoCreado === this.periodo) {
                await this.cargarPeriodo();
            }
            this.loadBoletasPage();
        } catch (err) {
            this.boletaSubmitError.set((err as Error).message ?? 'No se pudo guardar la boleta.');
        } finally {
            this.boletaSubmitting.set(false);
        }
    }

    async ngOnInit(): Promise<void> {
        await this.cargarPeriodo();
        this.employeeService.loadEmployees().catch(() => { /* opciones del filtro de empleado */ });
        this.loadDepartamentosFiltro();
        this.loadBoletasPage();
    }

    /** Departamentos para el select de filtro (no muta el estado compartido de DepartmentService). */
    private loadDepartamentosFiltro(): void {
        this.departmentService.fetchAll()
            .then(list => this.departamentosFiltro.set(list ?? []))
            .catch(() => this.departamentosFiltro.set([]));
    }

    /** Carga la página actual del listado completo, con TODOS los filtros vigentes. */
    private loadBoletasPage(): void {
        this.boletasError.set(null);
        this.payrollService.loadPayrollPaged({
            page: this.currentPage(),
            size: this.pageSize(),
            periodo: this.periodoLista || undefined,
            search: this.searchQuery() || undefined,
            estado: this.filterEstado() || undefined,
            employeeId: this.filterEmployeeId() ? Number(this.filterEmployeeId()) : undefined,
            departmentId: this.filterDepartmentId() ? Number(this.filterDepartmentId()) : undefined,
            afpOnp: this.filterAfpOnp() || undefined,
            fechaPagoDesde: this.filterFechaPagoDesde() || undefined,
            fechaPagoHasta: this.filterFechaPagoHasta() || undefined,
        }).then(res => {
            this.totalElements.set(res.totalElements);
            this.totalPages.set(res.totalPages);
        }).catch(err => {
            this.boletasError.set((err as Error).message ?? 'Error al cargar el listado de boletas');
        });
    }

    // ── Handlers del listado (toolbar del data-table) ───────────────────────────
    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.loadBoletasPage();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'estado':       this.filterEstado.set(valor); break;
            case 'employeeId':   this.filterEmployeeId.set(valor); break;
            case 'departmentId': this.filterDepartmentId.set(valor); break;
            case 'afpOnp':       this.filterAfpOnp.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadBoletasPage();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field !== 'fechaPago') return;
        this.filterFechaPagoDesde.set(event.from);
        this.filterFechaPagoHasta.set(event.to);
        this.currentPage.set(0);
        this.loadBoletasPage();
    }

    /** "Limpiar filtros": resetea todo (incluido el periodo) y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterEstado.set('');
        this.filterEmployeeId.set('');
        this.filterDepartmentId.set('');
        this.filterAfpOnp.set('');
        this.filterFechaPagoDesde.set(null);
        this.filterFechaPagoHasta.set(null);
        this.periodoLista = '';
        this.currentPage.set(0);
        this.loadBoletasPage();
    }

    onPaginationChange(event: PaginationChangeEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadBoletasPage();
    }

    onPeriodoListaChange(): void {
        this.currentPage.set(0);
        this.loadBoletasPage();
    }

    /** Etiqueta legible de un periodo "YYYY-MM" (ej. "Julio 2026"). */
    private formatPeriodo(periodo: string): string {
        const [anio, mes] = periodo.split('-');
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const idx = parseInt(mes, 10) - 1;
        return `${meses[idx] ?? mes} ${anio}`;
    }

    // ── Tarjeta de generación por periodo (SIN cambios de comportamiento) ───────

    /** Lista las planillas persistidas del periodo seleccionado. */
    async cargarPeriodo(): Promise<void> {
        this.error.set(null);
        this.mensaje.set(null);
        try {
            await this.payrollService.getByPeriod(this.periodo);
        } catch {
            this.error.set('No se pudieron cargar las planillas del periodo.');
        }
    }

    /** Genera (persiste) las boletas faltantes del periodo y refresca la lista. */
    async generarPlanilla(): Promise<void> {
        this.error.set(null);
        this.mensaje.set(null);
        try {
            const nuevas = await this.payrollService.generatePayrollForPeriod(this.periodo);
            await this.payrollService.getByPeriod(this.periodo);
            this.mensaje.set(nuevas.length > 0
                ? `Se generaron ${nuevas.length} boleta(s) nueva(s) para ${this.periodoLabel()}.`
                : `Todas las boletas de ${this.periodoLabel()} ya estaban generadas.`);
        } catch {
            this.error.set('No se pudo generar la planilla. Verifique que existan empleados activos.');
        }
    }

    async aprobar(p: Payroll): Promise<void> {
        this.accionando.set(true);
        this.error.set(null);
        try {
            await this.payrollService.approvePayroll(p.id);
            this.mensaje.set(`Boleta de ${p.employeeName ?? ('#' + p.employeeId)} aprobada — se disparó el pago en tesorería y el asiento contable.`);
        } catch {
            this.error.set('No se pudo aprobar la boleta.');
        } finally {
            this.accionando.set(false);
        }
    }

    async pagar(p: Payroll): Promise<void> {
        this.accionando.set(true);
        this.error.set(null);
        try {
            await this.payrollService.markAsPaid(p.id);
            this.mensaje.set(`Boleta de ${p.employeeName ?? ('#' + p.employeeId)} marcada como pagada.`);
        } catch {
            this.error.set('No se pudo marcar como pagada.');
        } finally {
            this.accionando.set(false);
        }
    }

    verBoleta(payrollId: number): void {
        this.router.navigate(['/admin/rrhh/boleta', payrollId]);
    }

    estadoBadge(estado: PayrollStatus): string {
        switch (estado) {
            case 'GENERADO':  return 'badge-info';
            case 'APROBADO':  return 'badge-warning';
            case 'PAGADO':    return 'badge-success';
            case 'CANCELADO': return 'badge-error';
        }
    }

    periodoLabel(): string {
        return this.formatPeriodo(this.periodo);
    }
}
