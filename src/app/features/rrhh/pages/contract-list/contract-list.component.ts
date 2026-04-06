import {
    Component, OnInit, inject, signal, computed,
    ChangeDetectionStrategy
} from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ContractService } from '../../services/contract.service';
import { EmployeeService } from '../../services/employee.service';
import {
    Contract, ContractType, ContractStatus, WorkingDay,
    CONTRACT_TYPE_LABELS, CONTRACT_STATUS_LABELS, WORKING_DAY_LABELS,
} from '../../models/contract.model';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';
import { PaginationComponent, PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';

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
        PageHeaderComponent,
        AlertComponent,
    ],
    templateUrl: './contract-list.component.html',
})
export class ContractListComponent implements OnInit {
    private readonly contractService = inject(ContractService);
    private readonly employeeService = inject(EmployeeService);
    private readonly fb = inject(FormBuilder);

    // ── Data ─────────────────────────────────────────────────────────────────
    readonly loading = this.contractService.loading;
    readonly contracts = this.contractService.contracts;
    readonly employees = this.employeeService.activeEmployees;

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

    // ── Pagination ────────────────────────────────────────────────────────────
    currentPage = signal(0);
    pageSize    = signal(10);

    // ── Computed ──────────────────────────────────────────────────────────────
    readonly expiringCount = computed(() =>
        this.contracts().filter(c => c.expiringSoon).length
    );

    readonly filtered = computed(() => {
        const term   = this.searchQuery().toLowerCase();
        const status = this.filterStatus();
        const type   = this.filterType();
        return this.contracts().filter(c => {
            const matchSearch = !term || c.employeeName?.toLowerCase().includes(term);
            const matchStatus = !status || c.estado === status;
            const matchType   = !type || c.tipoContrato === type;
            return matchSearch && matchStatus && matchType;
        });
    });

    readonly totalElements = computed(() => this.filtered().length);
    readonly totalPages    = computed(() => Math.ceil(this.totalElements() / this.pageSize()) || 1);

    readonly pagedData = computed(() => {
        const start = this.currentPage() * this.pageSize();
        return this.filtered().slice(start, start + this.pageSize());
    });

    // ── Breadcrumbs ───────────────────────────────────────────────────────────
    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin',  url: '/admin' },
        { label: 'RRHH',   url: '/admin/rrhh/dashboard' },
        { label: 'Contratos' },
    ];

    // ── Dropdown options ──────────────────────────────────────────────────────
    contractTypes = Object.entries(CONTRACT_TYPE_LABELS).map(([value, label]) => ({ value, label }));
    workingDays   = Object.entries(WORKING_DAY_LABELS).map(([value, label]) => ({ value, label }));

    // ── Columns ───────────────────────────────────────────────────────────────
    columns: TableColumn<Contract>[] = [
        { key: 'employeeName', label: 'Empleado', sortable: true },
        {
            key: 'tipoContrato', label: 'Tipo', sortable: true,
            render: r => CONTRACT_TYPE_LABELS[r.tipoContrato] ?? r.tipoContrato,
        },
        { key: 'fechaInicio', label: 'Inicio', sortable: true },
        { key: 'fechaFin', label: 'Fin', render: r => r.fechaFin ?? '—' },
        {
            key: 'salarioBase', label: 'Salario', align: 'right',
            render: r => `${r.moneda === 'USD' ? '$' : 'S/'} ${r.salarioBase.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
        },
        {
            key: 'jornadaLaboral', label: 'Jornada',
            render: r => WORKING_DAY_LABELS[r.jornadaLaboral] ?? r.jornadaLaboral,
        },
        {
            key: 'estado', label: 'Estado', html: true,
            render: r => {
                const badge = r.estado === 'ACTIVO' ? 'success'
                    : r.estado === 'FINALIZADO' ? 'neutral'
                    : r.estado === 'RENOVADO' ? 'accent'
                    : 'warning';
                const extra = r.expiringSoon ? ' <span class="badge badge-warning" style="margin-left:4px">Por vencer</span>' : '';
                return `<span class="badge badge-${badge}">${CONTRACT_STATUS_LABELS[r.estado]}</span>${extra}`;
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
        moneda:              ['PEN'],
        jornadaLaboral:      [null as WorkingDay | null, Validators.required],
        horasSemanales:      [48, [Validators.required, Validators.min(1), Validators.max(60)]],
        periodoPruebaMeses:  [null as number | null],
        documentoContratoUrl: [''],
    });

    readonly terminateMotivo = new FormControl('', Validators.required);

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    ngOnInit(): void {
        Promise.all([
            this.contractService.loadContracts(),
            this.employeeService.loadEmployees(),
        ]).catch(err => {
            this.error.set((err as Error).message ?? 'Error al cargar datos');
        });
    }

    // ── Filter handlers ───────────────────────────────────────────────────────
    onSearch(event: Event): void {
        this.searchQuery.set((event.target as HTMLInputElement).value);
        this.currentPage.set(0);
    }

    onFilterStatus(event: Event): void {
        this.filterStatus.set((event.target as HTMLSelectElement).value);
        this.currentPage.set(0);
    }

    onFilterType(event: Event): void {
        this.filterType.set((event.target as HTMLSelectElement).value);
        this.currentPage.set(0);
    }

    onPaginationChange(event: PaginationChangeEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
    }

    // ── Modal handlers ────────────────────────────────────────────────────────
    openCreateModal(): void {
        this.editMode.set(false);
        this.selectedContract.set(null);
        this.contractForm.reset({ moneda: 'PEN', horasSemanales: 48 });
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
                moneda: val.moneda ?? 'PEN',
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
