import {
    Component, OnInit, inject, signal, computed,
    ChangeDetectionStrategy
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ContractService } from '../../services/contract.service';
import { EmployeeService } from '../../services/employee.service';
import {
    Contract, ContractType, ContractStatus, WorkingDay,
} from '../../models/contract.model';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn, TableAction, FilterConfig, FilterChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import { PaginationComponent, PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { AdminFormSectionComponent } from '@shared/ui/forms/admin-form-section/admin-form-section.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { ButtonComponent, CatalogSelectComponent, ServerSearchSelectComponent } from '@shared/components';
import { employeeSelectSource } from '../../components/select-sources';
import { MONEDA, CURRENCY_DISPLAY } from '@shared/constants/sunat.constants';
import { CatalogService } from '@core/services/catalog.service';

@Component({
    selector: 'app-contract-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        DrawerComponent,
        DataTableComponent,
        PaginationComponent,
        FormFieldComponent,
        AdminFormSectionComponent,
        PageHeaderComponent,
        AlertComponent,
        ButtonComponent,
        CatalogSelectComponent,
        ServerSearchSelectComponent,
    ],
    templateUrl: './contract-list.component.html',
})
export class ContractListComponent implements OnInit {
    private readonly contractService = inject(ContractService);
    private readonly employeeService = inject(EmployeeService);
    private readonly fb = inject(FormBuilder);
    private readonly catalog = inject(CatalogService);

    // ── Data ─────────────────────────────────────────────────────────────────
    readonly loading = this.contractService.loading;
    readonly contracts = this.contractService.contracts;
    /** Fuente server-side del search-select de empleado (últimos registrados + búsqueda paginada). */
    readonly employeeSource = employeeSelectSource(this.employeeService);

    // ── UI state ──────────────────────────────────────────────────────────────
    error              = signal<string | null>(null);
    showModal          = signal(false);
    showTerminateModal = signal(false);
    editMode           = signal(false);
    submitting         = signal(false);
    submitError        = signal<string | null>(null);
    selectedContract   = signal<Contract | null>(null);

    // ── Filters ───────────────────────────────────────────────────────────────
    searchQuery  = signal('');
    filterStatus = signal('');
    filterType   = signal('');

    // Filtros (estado + tipo) para el toolbar del data-table
    contratoFilters: FilterConfig[] = [
        {
            field: 'status', label: 'Todos los estados',
            options: toObservable(this.catalog.options('ESTADO_CONTRATO_LABORAL')).pipe(
                map(o => o.map(x => ({ value: x.codigo, label: x.valor })))
            ),
        },
        {
            field: 'type', label: 'Todos los tipos',
            options: toObservable(this.catalog.options('TIPO_CONTRATO')).pipe(
                map(o => o.map(x => ({ value: x.codigo, label: x.valor })))
            ),
        },
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (respeta los filtros actuales search + estado + tipo). Ver /hr/api/contracts/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.hr}/api/contracts/export`,
        filename: 'contratos',
        params: () => ({ search: this.searchQuery(), status: this.filterStatus(), type: this.filterType() }),
    };

    // ── Pagination ────────────────────────────────────────────────────────────
    currentPage = signal(0);
    pageSize    = signal(20);

    // ── Computed / server-side pagination ─────────────────────────────────────
    // Nota: expiringCount refleja los contratos por vencer de la página actual.
    readonly expiringCount = computed(() =>
        this.contracts().filter(c => c.expiringSoon).length
    );

    totalElements = signal(0);
    totalPages    = signal(0);

    // ── Breadcrumbs ───────────────────────────────────────────────────────────
    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin',  url: '/admin' },
        { label: 'RRHH',   url: '/admin/rrhh/dashboard' },
        { label: 'Contratos' },
    ];

    // ── Columns ───────────────────────────────────────────────────────────────
    columns: TableColumn<Contract>[] = [
        { key: 'employeeName', label: 'Empleado', sortable: true },
        {
            key: 'tipoContrato', label: 'Tipo', sortable: true,
            render: r => this.catalog.labelFn('TIPO_CONTRATO')(r.tipoContrato),
        },
        { key: 'fechaInicio', label: 'Inicio', sortable: true },
        { key: 'fechaFin', label: 'Fin', render: r => r.fechaFin ?? '—' },
        {
            key: 'salarioBase', label: 'Salario', align: 'right',
            render: r => `${r.moneda === MONEDA.USD ? CURRENCY_DISPLAY.SYMBOL_USD : CURRENCY_DISPLAY.SYMBOL_PEN} ${r.salarioBase.toLocaleString(CURRENCY_DISPLAY.LOCALE, { minimumFractionDigits: 2 })}`,
        },
        {
            key: 'jornadaLaboral', label: 'Jornada',
            render: r => this.catalog.labelFn('JORNADA_LABORAL')(r.jornadaLaboral),
        },
        {
            key: 'estado', label: 'Estado', html: true,
            render: r => {
                const badge = r.estado === 'ACTIVO' ? 'success'
                    : r.estado === 'FINALIZADO' ? 'neutral'
                    : r.estado === 'RENOVADO' ? 'accent'
                    : 'warning';
                const extra = r.expiringSoon ? ' <span class="badge badge-warning" style="margin-left:4px">Por vencer</span>' : '';
                return `<span class="badge badge-${badge}">${this.catalog.label('ESTADO_CONTRATO_LABORAL', r.estado)}</span>${extra}`;
            },
        },
    ];

    actions: TableAction<Contract>[] = [
        {
            label: 'Editar', icon: '✏️', class: 'btn-view',
            show: row => row.estado === 'ACTIVO' || row.estado === 'SUSPENDIDO',
            onClick: row => this.openEditModal(row),
        },
        {
            label: 'Finalizar', icon: '🛑', class: 'btn-delete',
            show: row => row.estado === 'ACTIVO',
            onClick: row => this.openTerminateModal(row),
        },
        {
            label: 'Renovar', icon: '🔄', class: 'btn-view',
            show: row => row.estado === 'ACTIVO',
            onClick: row => this.openRenewModal(row),
        },
    ];

    // ── Form ──────────────────────────────────────────────────────────────────
    readonly contractForm = this.fb.group({
        employeeId:          [null as number | null, Validators.required],
        tipoContrato:        [null as ContractType | null, Validators.required],
        fechaInicio:         ['', Validators.required],
        fechaFin:            [''],
        salarioBase:         [null as number | null, [Validators.required, Validators.min(0)]],
        moneda:              [MONEDA.PEN as string],
        jornadaLaboral:      [null as WorkingDay | null, Validators.required],
        horasSemanales:      [48, [Validators.required, Validators.min(1), Validators.max(60)]],
        periodoPruebaMeses:  [null as number | null],
        documentoContratoUrl: [''],
    });

    readonly terminateMotivo = new FormControl('', Validators.required);

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    ngOnInit(): void {
        // El select de empleado carga sus opciones bajo demanda (server-side).
        this.loadPage();
    }

    /** Carga la página actual server-side (search + estado + tipo + 20/pág). */
    private loadPage(): void {
        this.contractService.loadContractsPaged(
            this.currentPage(),
            this.pageSize(),
            this.searchQuery() || undefined,
            this.filterStatus() || undefined,
            this.filterType() || undefined
        ).then(res => {
            this.totalElements.set(res.totalElements);
            this.totalPages.set(res.totalPages);
        }).catch(err => {
            this.error.set((err as Error).message ?? 'Error al cargar contratos');
        });
    }

    // ── Filter handlers ───────────────────────────────────────────────────────
    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.loadPage();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const value = event.value != null ? String(event.value) : '';
        if (event.field === 'status') this.filterStatus.set(value);
        else if (event.field === 'type') this.filterType.set(value);
        this.currentPage.set(0);
        this.loadPage();
    }

    onPaginationChange(event: PaginationChangeEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadPage();
    }

    // ── Modal handlers ────────────────────────────────────────────────────────
    openCreateModal(): void {
        this.editMode.set(false);
        this.selectedContract.set(null);
        this.contractForm.reset({ moneda: MONEDA.PEN as string, horasSemanales: 48 });
        this.contractForm.get('employeeId')!.enable();
        this.submitError.set(null);
        this.showModal.set(true);
    }

    openEditModal(contract: Contract): void {
        this.editMode.set(true);
        this.selectedContract.set(contract);
        this.contractForm.patchValue({
            employeeId:          contract.employeeId,
            tipoContrato:        contract.tipoContrato,
            fechaInicio:         contract.fechaInicio,
            fechaFin:            contract.fechaFin ?? '',
            salarioBase:         contract.salarioBase,
            moneda:              contract.moneda,
            jornadaLaboral:      contract.jornadaLaboral,
            horasSemanales:      contract.horasSemanales,
            periodoPruebaMeses:  contract.periodoPruebaMeses ?? null,
            documentoContratoUrl: contract.documentoContratoUrl ?? '',
        });
        this.contractForm.get('employeeId')!.disable();
        this.submitError.set(null);
        this.showModal.set(true);
    }

    openRenewModal(contract: Contract): void {
        this.editMode.set(false);
        this.selectedContract.set(contract);
        this.contractForm.reset({
            employeeId:     contract.employeeId,
            tipoContrato:   contract.tipoContrato,
            moneda:         contract.moneda,
            jornadaLaboral: contract.jornadaLaboral,
            horasSemanales: contract.horasSemanales,
            salarioBase:    contract.salarioBase,
        });
        this.contractForm.get('employeeId')!.disable();
        this.submitError.set(null);
        this.showModal.set(true);
    }

    openTerminateModal(contract: Contract): void {
        this.selectedContract.set(contract);
        this.terminateMotivo.reset();
        this.showTerminateModal.set(true);
    }

    closeModal(): void {
        this.showModal.set(false);
        this.contractForm.reset();
    }

    closeTerminateModal(): void {
        this.showTerminateModal.set(false);
        this.selectedContract.set(null);
    }

    // ── Submit ────────────────────────────────────────────────────────────────
    async onSubmit(): Promise<void> {
        if (this.contractForm.invalid) {
            this.contractForm.markAllAsTouched();
            return;
        }
        this.submitting.set(true);
        this.submitError.set(null);
        try {
            const val = this.contractForm.getRawValue();
            const request = {
                employeeId: val.employeeId!,
                tipoContrato: val.tipoContrato!,
                fechaInicio: val.fechaInicio!,
                fechaFin: val.fechaFin || undefined,
                salarioBase: val.salarioBase!,
                moneda: val.moneda ?? MONEDA.PEN,
                jornadaLaboral: val.jornadaLaboral!,
                horasSemanales: val.horasSemanales!,
                periodoPruebaMeses: val.periodoPruebaMeses ?? undefined,
                documentoContratoUrl: val.documentoContratoUrl || undefined,
            };
            const sel = this.selectedContract();
            if (this.editMode() && sel) {
                await this.contractService.updateContract(sel.id, request);
            } else if (sel && !this.editMode()) {
                // Renew: selectedContract is set but editMode is false
                await this.contractService.renewContract(sel.id, request);
            } else {
                await this.contractService.createContract(request);
            }
            this.closeModal();
            this.loadPage();
        } catch (err) {
            this.submitError.set((err as Error).message ?? 'Error al guardar contrato');
        } finally {
            this.submitting.set(false);
        }
    }

    async onTerminate(): Promise<void> {
        const sel = this.selectedContract();
        if (!sel || this.terminateMotivo.invalid) {
            this.terminateMotivo.markAsTouched();
            return;
        }
        this.submitting.set(true);
        try {
            await this.contractService.terminateContract(sel.id, this.terminateMotivo.value!);
            this.closeTerminateModal();
            this.loadPage();
        } catch (err) {
            this.error.set((err as Error).message ?? 'Error al finalizar contrato');
        } finally {
            this.submitting.set(false);
        }
    }

    getControl(name: string): FormControl {
        return this.contractForm.get(name) as FormControl;
    }
}

