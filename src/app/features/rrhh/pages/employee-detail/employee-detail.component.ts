import {
    Component, OnInit, inject, signal,
    ChangeDetectionStrategy
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { EmployeeService } from '../../services/employee.service';
import { ContractService } from '../../services/contract.service';
import { PayrollService } from '../../services/payroll.service';
import { Payroll } from '../../models/payroll.model';
import {
    Employee, EmployeeRequest, Gender,
    EmergencyContact, EmergencyContactRequest, EmergencyContactRelationship,
    EmployeeDependent, DependentRequest, DependentRelationship,
    EmployeeDocument, DocumentRequest, DocumentType,
    SalaryRecord, SalaryRequest,
} from '../../models/employee.model';
import { Contract } from '../../models/contract.model';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { ButtonComponent, CatalogSelectComponent } from '@shared/components';

type TabKey = 'personal' | 'laboral' | 'direccion' | 'educacion' | 'contratos' | 'emergencia' | 'dependientes' | 'documentos' | 'salarios' | 'boletas';

@Component({
    selector: 'app-employee-detail',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PageHeaderComponent, AlertComponent, ButtonComponent, ReactiveFormsModule, CatalogSelectComponent, DecimalPipe],
    templateUrl: './employee-detail.component.html',
})
export class EmployeeDetailComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly fb = inject(FormBuilder);
    private readonly employeeService = inject(EmployeeService);
    private readonly contractService = inject(ContractService);
    private readonly payrollService = inject(PayrollService);

    employee           = signal<Employee | null>(null);
    loading            = signal(true);
    error              = signal<string | null>(null);
    activeTab          = signal<TabKey>('personal');

    contractsData      = signal<Contract[]>([]);
    emergencyContacts  = signal<EmergencyContact[]>([]);
    dependentsData     = signal<EmployeeDependent[]>([]);
    documentsData      = signal<EmployeeDocument[]>([]);
    salaryHistory      = signal<SalaryRecord[]>([]);
    payrollHistory     = signal<Payroll[]>([]);

    // Alta de sueldo (tab Salarios). El motor de planilla toma el Salary con
    // fechaFin==null y mayor fechaInicio → registrar aquí impacta la próxima boleta.
    showSalaryForm     = signal(false);
    savingSalary       = signal(false);
    salaryError        = signal<string | null>(null);
    salaryForm: FormGroup = this.fb.group({
        salarioBase: [null, [Validators.required, Validators.min(0)]],
        fechaInicio: ['', Validators.required],
        moneda: ['PEN'],
        motivo: [''],
    });

    // Edición inline de campos del propio Employee que hoy sólo se pintan (nunca
    // capturados en ningún formulario): nacionalidad/tipoSangre (tab Datos Personales),
    // dirección (tab Dirección) y educación/perfil (tab Educación). Se editan donde se
    // ven en vez de en el drawer de employee-list, que ya tiene bastantes secciones.
    // guardarCamposEmpleado() hace el PUT con merge para no perder el resto del registro.

    showPersonalForm = signal(false);
    savingPersonal   = signal(false);
    personalError    = signal<string | null>(null);
    personalForm: FormGroup = this.fb.group({
        nacionalidad: ['Peruana', Validators.maxLength(50)],
        tipoSangre:   ['', Validators.maxLength(5)],
    });

    showAddressForm = signal(false);
    savingAddress   = signal(false);
    addressError    = signal<string | null>(null);
    addressForm: FormGroup = this.fb.group({
        direccion:       ['', Validators.maxLength(500)],
        distrito:        ['', Validators.maxLength(100)],
        provincia:       ['', Validators.maxLength(100)],
        departamentoGeo: ['', Validators.maxLength(100)],
    });

    showEducationForm = signal(false);
    savingEducation   = signal(false);
    educationError    = signal<string | null>(null);
    educationForm: FormGroup = this.fb.group({
        nivelEducacion: ['', Validators.maxLength(50)],
        profesion:      ['', Validators.maxLength(100)],
        universidad:    ['', Validators.maxLength(200)],
        linkedinUrl:    ['', Validators.maxLength(500)],
    });

    // Alta/edición de contacto de emergencia (tab Emergencia).
    showEmergencyForm         = signal(false);
    editingEmergencyContact   = signal<EmergencyContact | null>(null);
    savingEmergency           = signal(false);
    emergencyError            = signal<string | null>(null);
    emergencyConfirmDeleteId  = signal<number | null>(null);
    emergencyForm: FormGroup = this.fb.group({
        nombreCompleto: ['', Validators.required],
        relacion: ['', Validators.required],
        telefono: ['', Validators.required],
        telefonoAlternativo: [''],
        direccion: [''],
        esPrincipal: [false],
    });
    readonly emergencyRelacionOptions: { value: EmergencyContactRelationship; label: string }[] = [
        { value: 'PADRE', label: 'Padre' },
        { value: 'MADRE', label: 'Madre' },
        { value: 'CONYUGE', label: 'Cónyuge' },
        { value: 'HIJO', label: 'Hijo' },
        { value: 'HIJA', label: 'Hija' },
        { value: 'HERMANO', label: 'Hermano' },
        { value: 'HERMANA', label: 'Hermana' },
        { value: 'OTRO', label: 'Otro' },
    ];

    // Alta/edición de dependiente (tab Dependientes). `esCargaFamiliar` alimenta
    // la asignación familiar del motor de planilla.
    showDependentForm         = signal(false);
    editingDependent          = signal<EmployeeDependent | null>(null);
    savingDependent           = signal(false);
    dependentError            = signal<string | null>(null);
    dependentConfirmDeleteId  = signal<number | null>(null);
    dependentForm: FormGroup = this.fb.group({
        nombreCompleto: ['', Validators.required],
        relacion: ['', Validators.required],
        fechaNacimiento: ['', Validators.required],
        documentoIdentidad: [''],
        genero: [''],
        esBeneficiarioSeguro: [false],
        esCargaFamiliar: [false],
    });
    readonly dependentRelacionOptions: { value: DependentRelationship; label: string }[] = [
        { value: 'CONYUGE', label: 'Cónyuge' },
        { value: 'HIJO', label: 'Hijo' },
        { value: 'HIJA', label: 'Hija' },
        { value: 'PADRE', label: 'Padre' },
        { value: 'MADRE', label: 'Madre' },
        { value: 'HERMANO', label: 'Hermano' },
        { value: 'HERMANA', label: 'Hermana' },
    ];

    // Alta/edición de documento del legajo (tab Documentos).
    showDocumentForm         = signal(false);
    editingDocument          = signal<EmployeeDocument | null>(null);
    savingDocument           = signal(false);
    documentError            = signal<string | null>(null);
    documentConfirmDeleteId  = signal<number | null>(null);
    documentForm: FormGroup = this.fb.group({
        tipoDocumento: ['', Validators.required],
        nombreArchivo: ['', Validators.required],
        descripcion: [''],
        urlArchivo: ['', Validators.required],
        fechaEmision: [''],
        fechaVencimiento: [''],
    });
    readonly documentTipoOptions: { value: DocumentType; label: string }[] = [
        { value: 'CV', label: 'CV' },
        { value: 'CONTRATO', label: 'Contrato' },
        { value: 'CERTIFICADO_TRABAJO', label: 'Certificado de Trabajo' },
        { value: 'CERTIFICADO_ESTUDIOS', label: 'Certificado de Estudios' },
        { value: 'ANTECEDENTES_PENALES', label: 'Antecedentes Penales' },
        { value: 'ANTECEDENTES_POLICIALES', label: 'Antecedentes Policiales' },
        { value: 'CERTIFICADO_SALUD', label: 'Certificado de Salud' },
        { value: 'LICENCIA_CONDUCIR', label: 'Licencia de Conducir' },
        { value: 'CARTA_RECOMENDACION', label: 'Carta de Recomendación' },
        { value: 'TITULO_PROFESIONAL', label: 'Título Profesional' },
        { value: 'GRADO_ACADEMICO', label: 'Grado Académico' },
        { value: 'CERTIFICACION_TECNICA', label: 'Certificación Técnica' },
        { value: 'OTRO', label: 'Otro' },
    ];

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
        { key: 'boletas',      label: 'Boletas' },
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
            const [contracts, contacts, deps, docs, salary, payrolls] = await Promise.all([
                this.contractService.loadContractsByEmployee(id),
                this.employeeService.getEmergencyContacts(id),
                this.employeeService.getDependents(id),
                this.employeeService.getDocuments(id),
                this.employeeService.getSalaryHistory(id),
                this.payrollService.getByEmployee(id).catch(() => [] as Payroll[]),
            ]);
            this.contractsData.set(contracts);
            this.emergencyContacts.set(contacts);
            this.dependentsData.set(deps);
            this.documentsData.set(docs);
            this.salaryHistory.set(salary);
            this.payrollHistory.set(payrolls);
        } catch (err) {
            this.error.set((err as Error).message ?? 'Error al cargar empleado');
        } finally {
            this.loading.set(false);
        }
    }

    goBack(): void {
        this.router.navigate(['/admin/rrhh/employees']);
    }

    verBoleta(payrollId: number): void {
        this.router.navigate(['/admin/rrhh/boleta', payrollId]);
    }

    estadoBadge(estado: string): string {
        switch (estado) {
            case 'GENERADO':  return 'badge-info';
            case 'APROBADO':  return 'badge-warning';
            case 'PAGADO':    return 'badge-success';
            default:          return 'badge-error';
        }
    }

    toggleSalaryForm(): void {
        this.salaryError.set(null);
        this.showSalaryForm.update(v => !v);
    }

    /** Registra un nuevo sueldo base (SalaryRecord abierto) y refresca el historial. */
    async registrarSueldo(): Promise<void> {
        const emp = this.employee();
        if (!emp || this.salaryForm.invalid) {
            this.salaryForm.markAllAsTouched();
            return;
        }
        this.savingSalary.set(true);
        this.salaryError.set(null);
        try {
            const v = this.salaryForm.value;
            const request: SalaryRequest = {
                salarioBase: Number(v.salarioBase),
                fechaInicio: v.fechaInicio,
                moneda: v.moneda || 'PEN',
                motivo: v.motivo || undefined,
            };
            await this.employeeService.createSalaryRecord(emp.id, request);
            const salary = await this.employeeService.getSalaryHistory(emp.id);
            this.salaryHistory.set(salary);
            this.salaryForm.reset({ salarioBase: null, fechaInicio: '', moneda: 'PEN', motivo: '' });
            this.showSalaryForm.set(false);
        } catch {
            this.salaryError.set('No se pudo registrar el sueldo.');
        } finally {
            this.savingSalary.set(false);
        }
    }

    // ── Contactos de Emergencia ──────────────────────────────────────────────

    toggleEmergencyForm(): void {
        this.emergencyError.set(null);
        this.editingEmergencyContact.set(null);
        this.emergencyForm.reset({ esPrincipal: false });
        this.showEmergencyForm.update(v => !v);
    }

    editarContactoEmergencia(ec: EmergencyContact): void {
        this.emergencyError.set(null);
        this.editingEmergencyContact.set(ec);
        this.emergencyForm.reset({
            nombreCompleto: ec.nombreCompleto,
            relacion: ec.relacion,
            telefono: ec.telefono,
            telefonoAlternativo: ec.telefonoAlternativo ?? '',
            direccion: ec.direccion ?? '',
            esPrincipal: ec.esPrincipal,
        });
        this.showEmergencyForm.set(true);
    }

    /** Crea o actualiza (según haya un contacto en edición) y refresca la lista. */
    async guardarContactoEmergencia(): Promise<void> {
        const emp = this.employee();
        if (!emp || this.emergencyForm.invalid) {
            this.emergencyForm.markAllAsTouched();
            return;
        }
        this.savingEmergency.set(true);
        this.emergencyError.set(null);
        try {
            const v = this.emergencyForm.value;
            const request: EmergencyContactRequest = {
                nombreCompleto: v.nombreCompleto,
                relacion: v.relacion,
                telefono: v.telefono,
                telefonoAlternativo: v.telefonoAlternativo || undefined,
                direccion: v.direccion || undefined,
                esPrincipal: v.esPrincipal ?? false,
            };
            const editing = this.editingEmergencyContact();
            if (editing) {
                await this.employeeService.updateEmergencyContact(emp.id, editing.id, request);
            } else {
                await this.employeeService.createEmergencyContact(emp.id, request);
            }
            const contacts = await this.employeeService.getEmergencyContacts(emp.id);
            this.emergencyContacts.set(contacts);
            this.emergencyForm.reset({ esPrincipal: false });
            this.editingEmergencyContact.set(null);
            this.showEmergencyForm.set(false);
        } catch {
            this.emergencyError.set('No se pudo guardar el contacto de emergencia.');
        } finally {
            this.savingEmergency.set(false);
        }
    }

    /** Pide confirmación INLINE en la fila (no bloquea el hilo como window.confirm). */
    askDeleteContactoEmergencia(ec: EmergencyContact): void {
        this.emergencyConfirmDeleteId.set(ec.id);
    }

    cancelDeleteContactoEmergencia(): void {
        this.emergencyConfirmDeleteId.set(null);
    }

    async confirmDeleteContactoEmergencia(ec: EmergencyContact): Promise<void> {
        const emp = this.employee();
        if (!emp) return;
        try {
            await this.employeeService.deleteEmergencyContact(emp.id, ec.id);
            this.emergencyContacts.update(list => list.filter(c => c.id !== ec.id));
        } catch {
            this.emergencyError.set('No se pudo eliminar el contacto de emergencia.');
        } finally {
            this.emergencyConfirmDeleteId.set(null);
        }
    }

    // ── Dependientes ──────────────────────────────────────────────────────────

    toggleDependentForm(): void {
        this.dependentError.set(null);
        this.editingDependent.set(null);
        this.dependentForm.reset({ esBeneficiarioSeguro: false, esCargaFamiliar: false });
        this.showDependentForm.update(v => !v);
    }

    editarDependiente(d: EmployeeDependent): void {
        this.dependentError.set(null);
        this.editingDependent.set(d);
        this.dependentForm.reset({
            nombreCompleto: d.nombreCompleto,
            relacion: d.relacion,
            fechaNacimiento: d.fechaNacimiento,
            documentoIdentidad: d.documentoIdentidad ?? '',
            genero: d.genero ?? '',
            esBeneficiarioSeguro: d.esBeneficiarioSeguro,
            esCargaFamiliar: d.esCargaFamiliar,
        });
        this.showDependentForm.set(true);
    }

    /** Crea o actualiza (según haya un dependiente en edición) y refresca la lista. */
    async guardarDependiente(): Promise<void> {
        const emp = this.employee();
        if (!emp || this.dependentForm.invalid) {
            this.dependentForm.markAllAsTouched();
            return;
        }
        this.savingDependent.set(true);
        this.dependentError.set(null);
        try {
            const v = this.dependentForm.value;
            const request: DependentRequest = {
                nombreCompleto: v.nombreCompleto,
                relacion: v.relacion,
                fechaNacimiento: v.fechaNacimiento,
                documentoIdentidad: v.documentoIdentidad || undefined,
                genero: (v.genero || undefined) as Gender | undefined,
                esBeneficiarioSeguro: v.esBeneficiarioSeguro ?? false,
                esCargaFamiliar: v.esCargaFamiliar ?? false,
            };
            const editing = this.editingDependent();
            if (editing) {
                await this.employeeService.updateDependent(emp.id, editing.id, request);
            } else {
                await this.employeeService.createDependent(emp.id, request);
            }
            const deps = await this.employeeService.getDependents(emp.id);
            this.dependentsData.set(deps);
            this.dependentForm.reset({ esBeneficiarioSeguro: false, esCargaFamiliar: false });
            this.editingDependent.set(null);
            this.showDependentForm.set(false);
        } catch {
            this.dependentError.set('No se pudo guardar el dependiente.');
        } finally {
            this.savingDependent.set(false);
        }
    }

    /** Pide confirmación INLINE en la fila (no bloquea el hilo como window.confirm). */
    askDeleteDependiente(d: EmployeeDependent): void {
        this.dependentConfirmDeleteId.set(d.id);
    }

    cancelDeleteDependiente(): void {
        this.dependentConfirmDeleteId.set(null);
    }

    async confirmDeleteDependiente(d: EmployeeDependent): Promise<void> {
        const emp = this.employee();
        if (!emp) return;
        try {
            await this.employeeService.deleteDependent(emp.id, d.id);
            this.dependentsData.update(list => list.filter(x => x.id !== d.id));
        } catch {
            this.dependentError.set('No se pudo eliminar el dependiente.');
        } finally {
            this.dependentConfirmDeleteId.set(null);
        }
    }

    // ── Documentos del legajo ─────────────────────────────────────────────────

    toggleDocumentForm(): void {
        this.documentError.set(null);
        this.editingDocument.set(null);
        this.documentForm.reset();
        this.showDocumentForm.update(v => !v);
    }

    editarDocumento(doc: EmployeeDocument): void {
        this.documentError.set(null);
        this.editingDocument.set(doc);
        this.documentForm.reset({
            tipoDocumento: doc.tipoDocumento,
            nombreArchivo: doc.nombreArchivo,
            descripcion: doc.descripcion ?? '',
            urlArchivo: doc.urlArchivo,
            fechaEmision: doc.fechaEmision ?? '',
            fechaVencimiento: doc.fechaVencimiento ?? '',
        });
        this.showDocumentForm.set(true);
    }

    /** Crea o actualiza (según haya un documento en edición) y refresca la lista. */
    async guardarDocumento(): Promise<void> {
        const emp = this.employee();
        if (!emp || this.documentForm.invalid) {
            this.documentForm.markAllAsTouched();
            return;
        }
        this.savingDocument.set(true);
        this.documentError.set(null);
        try {
            const v = this.documentForm.value;
            const request: DocumentRequest = {
                tipoDocumento: v.tipoDocumento,
                nombreArchivo: v.nombreArchivo,
                descripcion: v.descripcion || undefined,
                urlArchivo: v.urlArchivo,
                fechaEmision: v.fechaEmision || undefined,
                fechaVencimiento: v.fechaVencimiento || undefined,
            };
            const editing = this.editingDocument();
            if (editing) {
                await this.employeeService.updateDocument(emp.id, editing.id, request);
            } else {
                await this.employeeService.createDocument(emp.id, request);
            }
            const docs = await this.employeeService.getDocuments(emp.id);
            this.documentsData.set(docs);
            this.documentForm.reset();
            this.editingDocument.set(null);
            this.showDocumentForm.set(false);
        } catch {
            this.documentError.set('No se pudo guardar el documento.');
        } finally {
            this.savingDocument.set(false);
        }
    }

    /** Pide confirmación INLINE en la fila (no bloquea el hilo como window.confirm). */
    askDeleteDocumento(doc: EmployeeDocument): void {
        this.documentConfirmDeleteId.set(doc.id);
    }

    cancelDeleteDocumento(): void {
        this.documentConfirmDeleteId.set(null);
    }

    async confirmDeleteDocumento(doc: EmployeeDocument): Promise<void> {
        const emp = this.employee();
        if (!emp) return;
        try {
            await this.employeeService.deleteDocument(emp.id, doc.id);
            this.documentsData.update(list => list.filter(x => x.id !== doc.id));
        } catch {
            this.documentError.set('No se pudo eliminar el documento.');
        } finally {
            this.documentConfirmDeleteId.set(null);
        }
    }

    // ── Edición inline de campos propios del Employee ────────────────────────

    /**
     * PUT /employees/{id} reemplaza el registro completo (EmployeeRequest), así que
     * partimos del empleado actual en memoria y sólo pisamos los campos editados en
     * la mini-sección correspondiente — mismo patrón de merge que employee-list.onSubmit.
     */
    private async guardarCamposEmpleado(cambios: Record<string, unknown>): Promise<void> {
        const emp = this.employee();
        if (!emp) return;
        const request = { ...emp, ...cambios } as unknown as EmployeeRequest;
        const actualizado = await this.employeeService.updateEmployee(emp.id, request);
        this.employee.set(actualizado);
    }

    togglePersonalForm(): void {
        const emp = this.employee();
        this.personalError.set(null);
        this.personalForm.reset({
            nacionalidad: emp?.nacionalidad ?? 'Peruana',
            tipoSangre: emp?.tipoSangre ?? '',
        });
        this.showPersonalForm.update(v => !v);
    }

    async guardarDatosPersonales(): Promise<void> {
        if (this.personalForm.invalid) {
            this.personalForm.markAllAsTouched();
            return;
        }
        this.savingPersonal.set(true);
        this.personalError.set(null);
        try {
            const v = this.personalForm.value;
            await this.guardarCamposEmpleado({
                nacionalidad: v.nacionalidad || undefined,
                tipoSangre: v.tipoSangre || undefined,
            });
            this.showPersonalForm.set(false);
        } catch {
            this.personalError.set('No se pudo actualizar nacionalidad/tipo de sangre.');
        } finally {
            this.savingPersonal.set(false);
        }
    }

    toggleAddressForm(): void {
        const emp = this.employee();
        this.addressError.set(null);
        this.addressForm.reset({
            direccion: emp?.direccion ?? '',
            distrito: emp?.distrito ?? '',
            provincia: emp?.provincia ?? '',
            departamentoGeo: emp?.departamentoGeo ?? '',
        });
        this.showAddressForm.update(v => !v);
    }

    async guardarDireccion(): Promise<void> {
        if (this.addressForm.invalid) {
            this.addressForm.markAllAsTouched();
            return;
        }
        this.savingAddress.set(true);
        this.addressError.set(null);
        try {
            const v = this.addressForm.value;
            await this.guardarCamposEmpleado({
                direccion: v.direccion || undefined,
                distrito: v.distrito || undefined,
                provincia: v.provincia || undefined,
                departamentoGeo: v.departamentoGeo || undefined,
            });
            this.showAddressForm.set(false);
        } catch {
            this.addressError.set('No se pudo actualizar la dirección.');
        } finally {
            this.savingAddress.set(false);
        }
    }

    toggleEducationForm(): void {
        const emp = this.employee();
        this.educationError.set(null);
        this.educationForm.reset({
            nivelEducacion: emp?.nivelEducacion ?? '',
            profesion: emp?.profesion ?? '',
            universidad: emp?.universidad ?? '',
            linkedinUrl: emp?.linkedinUrl ?? '',
        });
        this.showEducationForm.update(v => !v);
    }

    async guardarEducacion(): Promise<void> {
        if (this.educationForm.invalid) {
            this.educationForm.markAllAsTouched();
            return;
        }
        this.savingEducation.set(true);
        this.educationError.set(null);
        try {
            const v = this.educationForm.value;
            await this.guardarCamposEmpleado({
                nivelEducacion: v.nivelEducacion || undefined,
                profesion: v.profesion || undefined,
                universidad: v.universidad || undefined,
                linkedinUrl: v.linkedinUrl || undefined,
            });
            this.showEducationForm.set(false);
        } catch {
            this.educationError.set('No se pudo actualizar la educación/perfil.');
        } finally {
            this.savingEducation.set(false);
        }
    }
}
