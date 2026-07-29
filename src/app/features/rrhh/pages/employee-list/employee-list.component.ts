import {
    Component, OnInit, inject, signal, computed,
    ChangeDetectionStrategy
} from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { EmployeeService } from '../../services/employee.service';
import { DepartmentService } from '../../services/department.service';
import { PositionService } from '../../services/position.service';
import { Employee, EmployeeRequest } from '../../models/employee.model';
import { ButtonComponent, CatalogSelectComponent, ServerSearchSelectComponent } from '@shared/components';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { ModalComponent } from '@shared/components/modal/modal.component';
import { ImageUploadComponent } from '@shared/ui/forms/image-upload/image-upload.component';
import { employeeSelectSource, departmentSelectSource, positionSelectSource, usuarioSelectSource } from '../../components/select-sources';
import { UserService } from '@features/admin/services/user.service';
import { DataTableComponent, TableColumn, TableAction, FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import { PAGINATION } from '@shared/constants/app.constants';
import { PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { AdminFormSectionComponent } from '@shared/ui/forms/admin-form-section/admin-form-section.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { Router } from '@angular/router';
import { CatalogService } from '@core/services/catalog.service';
import { bloquearEnEdicion } from '@shared/utils/form-lock';

@Component({
    selector: 'app-employee-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        ButtonComponent,
        DrawerComponent,
        ModalComponent,
        DataTableComponent,
        FormFieldComponent,
        AdminFormSectionComponent,
        PageHeaderComponent,
        AlertComponent,
        DateInputComponent,
        CatalogSelectComponent,
        ServerSearchSelectComponent,
        ImageUploadComponent,
    ],
    templateUrl: './employee-list.component.html',
})
export class EmployeeListComponent implements OnInit {
    private readonly employeeService = inject(EmployeeService);
    private readonly departmentService = inject(DepartmentService);
    private readonly positionService = inject(PositionService);
    private readonly fb = inject(FormBuilder);
    private readonly router = inject(Router);
    private readonly catalog = inject(CatalogService);

    // ── Server search-select sources ──────────────────────────────────────────
    readonly departmentSource = departmentSelectSource(this.departmentService);
    readonly positionSource   = positionSelectSource(this.positionService);
    readonly supervisorSource = employeeSelectSource(this.employeeService);

    // Se mantiene para el filtro de departamento del toolbar del data-table.
    readonly departments = this.departmentService.activeDepartments;

    // Listas para los selects de filtro "Puesto" y "Supervisor" del toolbar (carga eager, no search-select).
    positionsFiltro = signal<{ id: number; nombre: string }[]>([]);
    supervisoresFiltro = signal<{ id: number; nombres: string; apellidos: string }[]>([]);

    // ── Data ─────────────────────────────────────────────────────────────────
    readonly loading   = this.employeeService.loading;
    readonly employees = this.employeeService.employees;

    // ── UI state ──────────────────────────────────────────────────────────────
    error            = signal<string | null>(null);
    showModal        = signal(false);
    editMode         = signal(false);
    submitting       = signal(false);
    submitError      = signal<string | null>(null);
    selectedEmployee = signal<Employee | null>(null);

    // ── Filters (TODOS server-side — la vista nunca filtra la página cargada) ──
    searchQuery  = signal('');
    filterEstado = signal('');
    filterDepartmentId = signal<number | null>(null);
    filterPositionId = signal<number | null>(null);
    filterSupervisorId = signal<number | null>(null);
    filterTipoDocumento = signal('');
    filterSistemaPrevisional = signal('');
    filterAfpNombre = signal('');
    filterGenero = signal('');
    filterEstadoCivil = signal('');
    filterFechaIngresoDesde = signal<string | undefined>(undefined);
    filterFechaIngresoHasta = signal<string | undefined>(undefined);
    filterFechaSalidaDesde = signal<string | undefined>(undefined);
    filterFechaSalidaHasta = signal<string | undefined>(undefined);
    filterFechaNacimientoDesde = signal<string | undefined>(undefined);
    filterFechaNacimientoHasta = signal<string | undefined>(undefined);

    // Filtros select del toolbar. Las opciones salen de erp_parameters (fuente única)
    // o de listas dinámicas ya cargadas (departamentos, puestos, supervisores).
    filters: FilterConfig[] = [
        catalogFilter(this.catalog, 'ESTADO_EMPLEADO', 'estado', 'Estado'),
        signalFilter('departmentId', 'Departamento', this.departments,
            d => ({ value: d.id, label: d.nombre })),
        signalFilter('positionId', 'Puesto', this.positionsFiltro,
            p => ({ value: p.id, label: p.nombre })),
        signalFilter('supervisorId', 'Supervisor', this.supervisoresFiltro,
            e => ({ value: e.id, label: `${e.nombres} ${e.apellidos}` })),
        catalogFilter(this.catalog, 'TIPO_DOCUMENTO_IDENTIDAD', 'tipoDocumento', 'Tipo de documento'),
        catalogFilter(this.catalog, 'SISTEMA_PREVISIONAL', 'sistemaPrevisional', 'Sistema previsional'),
        catalogFilter(this.catalog, 'AFP', 'AFP', 'AFP'),
        catalogFilter(this.catalog, 'GENERO', 'genero', 'Género'),
        catalogFilter(this.catalog, 'ESTADO_CIVIL', 'estadoCivil', 'Estado civil'),
    ];

    readonly dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fechaIngreso', label: 'Fecha de ingreso' },
        { field: 'fechaSalida', label: 'Fecha de cese' },
        { field: 'fechaNacimiento', label: 'Fecha de nacimiento' },
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (respeta TODOS los filtros actuales). Ver /hr/api/employees/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.hr}/api/employees/export`,
        filename: 'empleados',
        params: () => ({
            search: this.searchQuery(),
            status: this.filterEstado(),
            departmentId: this.filterDepartmentId() ?? undefined,
            positionId: this.filterPositionId() ?? undefined,
            supervisorId: this.filterSupervisorId() ?? undefined,
            tipoDocumento: this.filterTipoDocumento(),
            sistemaPrevisional: this.filterSistemaPrevisional(),
            afpNombre: this.filterAfpNombre(),
            genero: this.filterGenero(),
            estadoCivil: this.filterEstadoCivil(),
            fechaIngresoDesde: this.filterFechaIngresoDesde(),
            fechaIngresoHasta: this.filterFechaIngresoHasta(),
            fechaSalidaDesde: this.filterFechaSalidaDesde(),
            fechaSalidaHasta: this.filterFechaSalidaHasta(),
            fechaNacimientoDesde: this.filterFechaNacimientoDesde(),
            fechaNacimientoHasta: this.filterFechaNacimientoHasta(),
        }),
    };

    // ── Pagination (server-side) ──────────────────────────────────────────────
    currentPage   = signal(0);
    pageSize      = signal(20);
    totalElements = signal(0);
    totalPages    = signal(0);

    // ── Breadcrumbs ───────────────────────────────────────────────────────────
    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin',  url: '/admin' },
        { label: 'RRHH',   url: '/admin/rrhh/dashboard' },
        { label: 'Empleados' },
    ];

    // ── Columns ───────────────────────────────────────────────────────────────
    columns: TableColumn<Employee>[] = [
        {
            key: 'codigoEmpleado', label: 'Código', sortable: true, width: '100px',
            html: true, render: r => `<span class="font-mono text-sm">${r.codigoEmpleado}</span>`
        },
        {
            key: 'nombres', label: 'Nombre Completo', sortable: true,
            render: r => `${r.nombres} ${r.apellidos}`
        },
        { key: 'documentoIdentidad', label: 'DNI/Doc', width: '110px' },
        { key: 'departmentName', label: 'Departamento', render: r => r.departmentName ?? r.area ?? '—' },
        { key: 'positionName',   label: 'Puesto',       render: r => r.positionName ?? r.cargo ?? '—' },
        {
            key: 'estado', label: 'Estado', html: true,
            render: r => `<span class="badge badge-${this.badgeEstado(r.estado)}">${this.catalog.label('ESTADO_EMPLEADO', r.estado)}</span>`
        },
    ];

    actions: TableAction<Employee>[] = [
        {
            label: 'Ver', icon: '👁', class: 'btn-view',
            onClick: row => this.router.navigate(['/admin/rrhh/employees', row.id, 'detail']),
        },
        {
            label: 'Editar', icon: '✏️', class: 'btn-view',
            onClick: row => this.openEditModal(row),
        },
        {
            label: 'Desactivar', icon: '🚫', class: 'btn-delete',
            show: row => row.estado === 'ACTIVO',
            onClick: row => this.onDeactivate(row),
        },
    ];

    // ── Form ──────────────────────────────────────────────────────────────────
    /** Foto elegida en el drawer, pendiente de subir tras guardar. */
    readonly fotoSeleccionada = signal<File | null>(null);
    /** URL de la foto ya guardada del empleado en edición. */
    readonly fotoActual = computed(() => this.selectedEmployee()?.fotoUrl ?? null);

    /** Usuarios del sistema para vincular la cuenta de acceso del empleado. */
    readonly usuarioSource = usuarioSelectSource(inject(UserService));


    readonly employeeForm = this.fb.group({
        codigoEmpleado:     ['', [Validators.required, Validators.maxLength(20)]],
        nombres:            ['', [Validators.required, Validators.maxLength(100)]],
        apellidos:          ['', [Validators.required, Validators.maxLength(100)]],
        documentoIdentidad: ['', [Validators.required, Validators.maxLength(20)]],
        // Filtros server-side del listado (ver EmployeeFiltros): sin captura aquí eran
        // filtros muertos que nunca encontraban nada. Los cuatro son obligatorios en PLAME.
        tipoDocumento:      ['DNI'],
        fechaNacimiento:    [''],
        genero:             [''],
        estadoCivil:        [''],
        fechaIngreso:       ['', Validators.required],
        cargo:              [''],
        area:               [''],
        email:              ['', Validators.email],
        telefono:           [''],
        estado:             ['ACTIVO'],
        departmentId:       [null as number | null],
        positionId:         [null as number | null],
        supervisorId:       [null as number | null],
        userId:             [null as number | null],
        // Previsional: sistemaPrevisional guarda el código exacto ("ONP"/"AFP") que
        // lee PayrollCommandService.calcularPlanillaPeruana; afpNombre el código AFP
        // ("INTEGRA"/"PRIMA"/"PROFUTURO"/"HABITAT") con el que arma "AFP - <nombre>".
        sistemaPrevisional: ['ONP'],
        afpNombre:          [''],
        // Cese: correcciones desde el propio drawer (la captura inicial ocurre en el
        // diálogo de "Desactivar", ver deactivateForm más abajo).
        fechaSalida:        [''],
        motivoSalida:       ['', Validators.maxLength(500)],
    });

    // ── Desactivar (captura fecha y motivo de cese, que el PATCH /deactivate del
    // backend no acepta — ver confirmDeactivate) ──────────────────────────────
    readonly showDeactivateModal  = signal(false);
    readonly deactivatingEmployee = signal<Employee | null>(null);
    readonly deactivateSubmitting = signal(false);
    readonly deactivateError      = signal<string | null>(null);

    readonly deactivateForm = this.fb.group({
        fechaSalida:  ['', Validators.required],
        motivoSalida: ['', Validators.maxLength(500)],
    });

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    ngOnInit(): void {
        this.departmentService.loadDepartments().catch(() => { /* dropdown depto opcional */ });
        this.loadPositionsFiltro();
        this.loadSupervisoresFiltro();
        this.loadPage();

        // app-catalog-select no expone (change) nativo del <select>; el control
        // reactivo sigue notificando via valueChanges (mismo patrón que customer-form).
        // Si el empleado deja de estar en AFP, se limpia afpNombre para no arrastrar
        // un código de AFP obsoleto que ya no corresponde al sistema previsional elegido.
        this.employeeForm.get('sistemaPrevisional')!.valueChanges.subscribe((value: string | null) => {
            if (value !== 'AFP') {
                this.employeeForm.get('afpNombre')?.setValue('', { emitEvent: false });
            }
        });
    }

    /** Puestos para el select de filtro del toolbar (lista acotada, no requiere server-search). */
    private loadPositionsFiltro(): void {
        this.positionService.searchPage(0, PAGINATION.maxPageSize)
            .then(res => this.positionsFiltro.set(res.content ?? []))
            .catch(() => this.positionsFiltro.set([]));
    }

    /** Supervisores (empleados) para el select de filtro del toolbar. */
    private loadSupervisoresFiltro(): void {
        this.employeeService.searchPage(0, PAGINATION.maxPageSize)
            .then(res => this.supervisoresFiltro.set(res.content ?? []))
            .catch(() => this.supervisoresFiltro.set([]));
    }

    /** Carga la página actual server-side (search + TODOS los filtros avanzados + 20/pág). */
    private loadPage(): void {
        this.employeeService.loadEmployeesPaged({
            page: this.currentPage(),
            size: this.pageSize(),
            search: this.searchQuery() || undefined,
            status: this.filterEstado() || undefined,
            departmentId: this.filterDepartmentId(),
            positionId: this.filterPositionId(),
            supervisorId: this.filterSupervisorId(),
            tipoDocumento: this.filterTipoDocumento() || undefined,
            sistemaPrevisional: this.filterSistemaPrevisional() || undefined,
            afpNombre: this.filterAfpNombre() || undefined,
            genero: this.filterGenero() || undefined,
            estadoCivil: this.filterEstadoCivil() || undefined,
            fechaIngresoDesde: this.filterFechaIngresoDesde(),
            fechaIngresoHasta: this.filterFechaIngresoHasta(),
            fechaSalidaDesde: this.filterFechaSalidaDesde(),
            fechaSalidaHasta: this.filterFechaSalidaHasta(),
            fechaNacimientoDesde: this.filterFechaNacimientoDesde(),
            fechaNacimientoHasta: this.filterFechaNacimientoHasta(),
        }).then(res => {
            this.totalElements.set(res.totalElements);
            this.totalPages.set(res.totalPages);
        }).catch(err => {
            this.error.set((err as Error).message ?? 'Error al cargar empleados');
        });
    }

    // ── Handlers ─────────────────────────────────────────────────────────────
    /** La búsqueda por texto también va al backend, no filtra la página cargada. */
    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.loadPage();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'estado':             this.filterEstado.set(valor); break;
            case 'departmentId':       this.filterDepartmentId.set(event.value != null ? Number(event.value) : null); break;
            case 'positionId':         this.filterPositionId.set(event.value != null ? Number(event.value) : null); break;
            case 'supervisorId':       this.filterSupervisorId.set(event.value != null ? Number(event.value) : null); break;
            case 'tipoDocumento':      this.filterTipoDocumento.set(valor); break;
            case 'sistemaPrevisional': this.filterSistemaPrevisional.set(valor); break;
            case 'AFP':          this.filterAfpNombre.set(valor); break;
            case 'genero':             this.filterGenero.set(valor); break;
            case 'estadoCivil':        this.filterEstadoCivil.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadPage();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        switch (event.field) {
            case 'fechaIngreso':
                this.filterFechaIngresoDesde.set(event.from ?? undefined);
                this.filterFechaIngresoHasta.set(event.to ?? undefined);
                break;
            case 'fechaSalida':
                this.filterFechaSalidaDesde.set(event.from ?? undefined);
                this.filterFechaSalidaHasta.set(event.to ?? undefined);
                break;
            case 'fechaNacimiento':
                this.filterFechaNacimientoDesde.set(event.from ?? undefined);
                this.filterFechaNacimientoHasta.set(event.to ?? undefined);
                break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadPage();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterEstado.set('');
        this.filterDepartmentId.set(null);
        this.filterPositionId.set(null);
        this.filterSupervisorId.set(null);
        this.filterTipoDocumento.set('');
        this.filterSistemaPrevisional.set('');
        this.filterAfpNombre.set('');
        this.filterGenero.set('');
        this.filterEstadoCivil.set('');
        this.filterFechaIngresoDesde.set(undefined);
        this.filterFechaIngresoHasta.set(undefined);
        this.filterFechaSalidaDesde.set(undefined);
        this.filterFechaSalidaHasta.set(undefined);
        this.filterFechaNacimientoDesde.set(undefined);
        this.filterFechaNacimientoHasta.set(undefined);
        this.currentPage.set(0);
        this.loadPage();
    }

    onPaginationChange(event: PaginationChangeEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadPage();
    }

    /**
     * Campos que identifican al empleado: una vez guardados se referencian desde
     * boletas, contratos y asistencias, así que se muestran bloqueados en edición.
     * tipoDocumento sigue la misma regla que documentoIdentidad: cambiar el tipo de
     * documento sin cambiar el número dejaría la identidad inconsistente.
     */
    private static readonly CAMPOS_BLOQUEADOS = ['codigoEmpleado', 'documentoIdentidad', 'tipoDocumento'];

    openCreateModal(): void {
        this.editMode.set(false);
        this.selectedEmployee.set(null);
        this.employeeForm.reset({ estado: 'ACTIVO', sistemaPrevisional: 'ONP', afpNombre: '' });
        bloquearEnEdicion(this.employeeForm, EmployeeListComponent.CAMPOS_BLOQUEADOS, false);
        this.submitError.set(null);
        this.showModal.set(true);
    }

    openEditModal(employee: Employee): void {
        this.editMode.set(true);
        this.selectedEmployee.set(employee);
        this.employeeForm.patchValue({
            codigoEmpleado:     employee.codigoEmpleado,
            nombres:            employee.nombres,
            apellidos:          employee.apellidos,
            documentoIdentidad: employee.documentoIdentidad,
            tipoDocumento:      employee.tipoDocumento   ?? 'DNI',
            fechaNacimiento:    employee.fechaNacimiento ?? '',
            genero:             employee.genero          ?? '',
            estadoCivil:        employee.estadoCivil     ?? '',
            fechaIngreso:       employee.fechaIngreso,
            cargo:              employee.cargo     ?? '',
            area:               employee.area      ?? '',
            email:              employee.email     ?? '',
            telefono:           employee.telefono  ?? '',
            estado:             employee.estado,
            departmentId:       employee.departmentId ?? null,
            positionId:         employee.positionId   ?? null,
            supervisorId:       employee.supervisorId ?? null,
            userId:             employee.userId ?? null,
            sistemaPrevisional: employee.sistemaPrevisional ?? 'ONP',
            afpNombre:          employee.afpNombre ?? '',
            fechaSalida:        employee.fechaSalida ?? '',
            motivoSalida:       employee.motivoSalida ?? '',
        });
        bloquearEnEdicion(this.employeeForm, EmployeeListComponent.CAMPOS_BLOQUEADOS, true);
        this.submitError.set(null);
        this.showModal.set(true);
    }

    closeModal(): void {
        this.showModal.set(false);
        this.employeeForm.reset();
    }

    async onSubmit(): Promise<void> {
        if (this.employeeForm.invalid) {
            this.employeeForm.markAllAsTouched();
            return;
        }
        this.submitting.set(true);
        this.submitError.set(null);
        try {
            // getRawValue(): los controles bloqueados (código/documento) NO salen en
            // .value y se enviarían como null, borrando datos en el PUT.
            const val = this.employeeForm.getRawValue() as Record<string, unknown>;
            // genero/estadoCivil son enums del backend (Employee.Gender/MaritalStatus): '' es
            // el valor por defecto del control sin elegir, pero Jackson NO lo coacciona a null
            // en un campo enum → 400 InvalidFormatException. Mismo patrón que
            // employee-detail.component.ts (`v.genero || undefined`).
            if (val['genero'] === '') val['genero'] = undefined;
            if (val['estadoCivil'] === '') val['estadoCivil'] = undefined;
            const original = this.selectedEmployee();
            let empleadoId: number | undefined;
            if (this.editMode() && original) {
                // PUT = reemplazo completo: mergeamos los campos del empleado original
                // (género, dirección, educación, AFP, departamento/puesto/supervisor, etc.)
                // con los editados en el form, para que el backend NO los sobrescriba a null.
                const request = { ...original, ...val } as unknown as EmployeeRequest;
                await this.employeeService.updateEmployee(original.id, request);
                empleadoId = original.id;
            } else {
                const creado = await this.employeeService.createEmployee(val as never);
                empleadoId = (creado as Employee | undefined)?.id;
            }

            // La foto se sube después: el POST multipart necesita el id del empleado.
            const foto = this.fotoSeleccionada();
            if (foto && empleadoId) {
                await this.employeeService.subirFoto(empleadoId, foto);
            }
            this.fotoSeleccionada.set(null);
            this.closeModal();
            this.loadPage();
        } catch (err) {
            this.submitError.set((err as Error).message ?? 'Error al guardar empleado');
        } finally {
            this.submitting.set(false);
        }
    }

    /** Quita la foto actual del empleado (el backend borra el binario y sus metadatos). */
    async onQuitarFoto(): Promise<void> {
        this.fotoSeleccionada.set(null);
        const actual = this.selectedEmployee();
        if (!this.editMode() || !actual) return;
        try {
            const actualizado = await this.employeeService.eliminarFoto(actual.id);
            // Refresca el empleado en edición para que `fotoActual` deje de apuntar al binario.
            this.selectedEmployee.set(actualizado ?? { ...actual, fotoUrl: undefined });
        } catch {
            this.submitError.set('No se pudo eliminar la foto.');
        }
    }

    /**
     * Abre el diálogo de desactivación: pide fecha y motivo de cese ANTES de
     * desactivar, que es cuando el dato realmente existe (después nadie vuelve
     * a completarlo). Reemplaza el confirm() nativo previo, que desactivaba sin
     * capturar nada.
     */
    onDeactivate(employee: Employee): void {
        this.deactivatingEmployee.set(employee);
        this.deactivateForm.reset({ fechaSalida: this.todayIso(), motivoSalida: '' });
        this.deactivateError.set(null);
        this.showDeactivateModal.set(true);
    }

    closeDeactivateModal(): void {
        this.showDeactivateModal.set(false);
        this.deactivatingEmployee.set(null);
        this.deactivateForm.reset();
    }

    /**
     * Confirma la desactivación. Usa PUT /employees/{id} (updateEmployee) en vez del
     * PATCH /employees/{id}/deactivate: ese endpoint dedicado solo escribe
     * estado=INACTIVO en el backend (EmployeeCommandService.deactivateEmployee) y NO
     * acepta fechaSalida/motivoSalida — y esta tarea es solo-frontend, no se puede
     * tocar el Java para ampliarlo. El PUT sí acepta ambos campos y hace merge parcial
     * (EmployeeMapper.updateEntity conserva el resto de campos del empleado original).
     */
    async confirmDeactivate(): Promise<void> {
        const employee = this.deactivatingEmployee();
        if (!employee) return;
        if (this.deactivateForm.invalid) {
            this.deactivateForm.markAllAsTouched();
            return;
        }
        this.deactivateSubmitting.set(true);
        this.deactivateError.set(null);
        try {
            const { fechaSalida, motivoSalida } = this.deactivateForm.getRawValue();
            const request = {
                ...employee,
                estado: 'INACTIVO',
                fechaSalida,
                motivoSalida,
            } as unknown as EmployeeRequest;
            await this.employeeService.updateEmployee(employee.id, request);
            this.closeDeactivateModal();
            this.loadPage();
        } catch (err) {
            this.deactivateError.set((err as Error).message ?? 'Error al desactivar empleado');
        } finally {
            this.deactivateSubmitting.set(false);
        }
    }

    /** Fecha de hoy en formato yyyy-MM-dd, el que espera app-date-input/LocalDate. */
    private todayIso(): string {
        return new Date().toISOString().slice(0, 10);
    }

    getControl(name: string): FormControl {
        return this.employeeForm.get(name) as FormControl;
    }

    getDeactivateControl(name: string): FormControl {
        return this.deactivateForm.get(name) as FormControl;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    badgeEstado(estado: string): string {
        const map: Record<string, string> = {
            ACTIVO:    'success',
            INACTIVO:  'neutral',
            SUSPENDIDO:'warning',
            CESADO:    'error',
        };
        return map[estado] ?? 'neutral';
    }
}

