import {
    Component, OnInit, inject, signal,
    ChangeDetectionStrategy
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EmployeeService } from '../../services/employee.service';
import { ContractService } from '../../services/contract.service';
import {
    Employee, EmergencyContact, EmployeeDependent,
    EmployeeDocument, SalaryRecord,
} from '../../models/employee.model';
import { Contract } from '../../models/contract.model';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { ButtonComponent } from '@shared/components';

type TabKey = 'personal' | 'laboral' | 'direccion' | 'educacion' | 'contratos' | 'emergencia' | 'dependientes' | 'documentos' | 'salarios';

@Component({
    selector: 'app-employee-detail',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PageHeaderComponent, AlertComponent, ButtonComponent],
    templateUrl: './employee-detail.component.html',
})
export class EmployeeDetailComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly employeeService = inject(EmployeeService);
    private readonly contractService = inject(ContractService);

    employee           = signal<Employee | null>(null);
    loading            = signal(true);
    error              = signal<string | null>(null);
    activeTab          = signal<TabKey>('personal');

    contractsData      = signal<Contract[]>([]);
    emergencyContacts  = signal<EmergencyContact[]>([]);
    dependentsData     = signal<EmployeeDependent[]>([]);
    documentsData      = signal<EmployeeDocument[]>([]);
    salaryHistory      = signal<SalaryRecord[]>([]);

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin',  url: '/admin' },
        { label: 'RRHH',   url: '/admin/rrhh/dashboard' },
        { label: 'Empleados', url: '/admin/rrhh/employees' },
        { label: 'Detalle' },
    ];

    tabs: { key: TabKey; label: string }[] = [
        { key: 'personal',     label: 'Datos Personales' },
        { key: 'laboral',      label: 'Datos Laborales' },
        { key: 'direccion',    label: 'Dirección' },
        { key: 'educacion',    label: 'Educación' },
        { key: 'contratos',    label: 'Contratos' },
        { key: 'emergencia',   label: 'Emergencia' },
        { key: 'dependientes', label: 'Dependientes' },
        { key: 'documentos',   label: 'Documentos' },
        { key: 'salarios',     label: 'Salarios' },
    ];

    ngOnInit(): void {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        if (!id) {
            this.error.set('ID de empleado no válido');
            this.loading.set(false);
            return;
        }
        this.loadEmployee(id);
    }

    private async loadEmployee(id: number): Promise<void> {
        this.loading.set(true);
        try {
            const emp = await this.employeeService.getEmployeeById(id);
            this.employee.set(emp);

            // Load sub-resources in parallel
            const [contracts, contacts, deps, docs, salary] = await Promise.all([
                this.contractService.loadContractsByEmployee(id),
                this.employeeService.getEmergencyContacts(id),
                this.employeeService.getDependents(id),
                this.employeeService.getDocuments(id),
                this.employeeService.getSalaryHistory(id),
            ]);
            this.contractsData.set(contracts);
            this.emergencyContacts.set(contacts);
            this.dependentsData.set(deps);
            this.documentsData.set(docs);
            this.salaryHistory.set(salary);
        } catch (err) {
            this.error.set((err as Error).message ?? 'Error al cargar empleado');
        } finally {
            this.loading.set(false);
        }
    }

    goBack(): void {
        this.router.navigate(['/admin/rrhh/employees']);
    }
}
