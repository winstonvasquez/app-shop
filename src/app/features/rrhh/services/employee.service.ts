import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import { PageResponse, pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import {
    Employee, EmployeeRequest,
    EmergencyContact, EmergencyContactRequest,
    EmployeeDependent, DependentRequest,
    EmployeeDocument, DocumentRequest,
    SalaryRecord, SalaryRequest,
} from '../models/employee.model';

/** Filtros server-side del listado paginado de empleados. Todos opcionales. */
export interface EmployeeFiltros {
    page?: number;
    size?: number;
    search?: string;
    status?: string;
    departmentId?: number | null;
    positionId?: number | null;
    supervisorId?: number | null;
    tipoDocumento?: string;
    sistemaPrevisional?: string;
    afpNombre?: string;
    genero?: string;
    estadoCivil?: string;
    /** Tipo de contrato VIGENTE del empleado (join a Contract en el backend). */
    tipoContrato?: string;
    /** yyyy-MM-dd */
    fechaIngresoDesde?: string;
    fechaIngresoHasta?: string;
    fechaSalidaDesde?: string;
    fechaSalidaHasta?: string;
    fechaNacimientoDesde?: string;
    fechaNacimientoHasta?: string;
}

@Injectable({ providedIn: 'root' })
export class EmployeeService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.hr}/api/employees`;

    private readonly _employees = signal<Employee[]>([]);
    private readonly _loading = signal(false);
    private readonly _error = signal<string | null>(null);

    readonly employees = this._employees.asReadonly();
    readonly loading = this._loading.asReadonly();
    readonly error = this._error.asReadonly();

    readonly activeEmployees = computed(() =>
        this._employees().filter(e => e.estado === 'ACTIVO')
    );

    readonly totalEmployees = computed(() => this._employees().length);

    // ── Employee CRUD ─────────────────────────────────────────────────────────

    async loadEmployees(): Promise<void> {
        this._loading.set(true);
        this._error.set(null);
        try {
            const employees = await firstValueFrom(
                this.http.get<Employee[]>(this.baseUrl)
            );
            this._employees.set(employees);
        } catch (error) {
            this._error.set('Error al cargar empleados');
            throw error;
        } finally {
            this._loading.set(false);
        }
    }

    /**
     * Carga server-side paginada con TODOS los filtros avanzados (search, estado, departamento,
     * puesto, supervisor, tipo de documento, sistema previsional, AFP, género, estado civil y
     * rangos de fecha de ingreso/salida/nacimiento). Todos opcionales. Devuelve totales de página.
     */
    async loadEmployeesPaged(filtros: EmployeeFiltros = {}): Promise<{ totalElements: number; totalPages: number }> {
        this._loading.set(true);
        this._error.set(null);
        try {
            const params: Record<string, string> = {
                page: String(filtros.page ?? 0),
                size: String(filtros.size ?? 20),
            };
            if (filtros.search) params['search'] = filtros.search;
            if (filtros.status) params['status'] = filtros.status;
            if (filtros.departmentId != null) params['departmentId'] = String(filtros.departmentId);
            if (filtros.positionId != null) params['positionId'] = String(filtros.positionId);
            if (filtros.supervisorId != null) params['supervisorId'] = String(filtros.supervisorId);
            if (filtros.tipoDocumento) params['tipoDocumento'] = filtros.tipoDocumento;
            if (filtros.sistemaPrevisional) params['sistemaPrevisional'] = filtros.sistemaPrevisional;
            if (filtros.afpNombre) params['AFP'] = filtros.afpNombre;
            if (filtros.genero) params['genero'] = filtros.genero;
            if (filtros.estadoCivil) params['estadoCivil'] = filtros.estadoCivil;
            if (filtros.tipoContrato) params['tipoContrato'] = filtros.tipoContrato;
            if (filtros.fechaIngresoDesde) params['fechaIngresoDesde'] = filtros.fechaIngresoDesde;
            if (filtros.fechaIngresoHasta) params['fechaIngresoHasta'] = filtros.fechaIngresoHasta;
            if (filtros.fechaSalidaDesde) params['fechaSalidaDesde'] = filtros.fechaSalidaDesde;
            if (filtros.fechaSalidaHasta) params['fechaSalidaHasta'] = filtros.fechaSalidaHasta;
            if (filtros.fechaNacimientoDesde) params['fechaNacimientoDesde'] = filtros.fechaNacimientoDesde;
            if (filtros.fechaNacimientoHasta) params['fechaNacimientoHasta'] = filtros.fechaNacimientoHasta;
            const res = await firstValueFrom(
                this.http.get<PageResponse<Employee>>(`${this.baseUrl}/paged`, { params })
            );
            this._employees.set(res.content ?? []);
            return { totalElements: pageTotalElements(res), totalPages: pageTotalPages(res) };
        } catch (error) {
            this._error.set('Error al cargar empleados');
            throw error;
        } finally {
            this._loading.set(false);
        }
    }

    /**
     * Página server-side SIN mutar el estado compartido (`_employees`).
     * Pensado para el search-select: cada consulta es independiente del listado.
     */
    async searchPage(page: number, size: number, search?: string, sort?: string):
        Promise<PageResponse<Employee>> {
        const params: Record<string, string> = { page: String(page), size: String(size) };
        if (search) params['search'] = search;
        if (sort) params['sort'] = sort;
        return firstValueFrom(
            this.http.get<PageResponse<Employee>>(`${this.baseUrl}/paged`, { params })
        );
    }

    async getEmployeeById(id: number): Promise<Employee> {
        return firstValueFrom(
            this.http.get<Employee>(`${this.baseUrl}/${id}`)
        );
    }

    async createEmployee(request: EmployeeRequest): Promise<Employee> {
        this._loading.set(true);
        try {
            const employee = await firstValueFrom(
                this.http.post<Employee>(this.baseUrl, request)
            );
            this._employees.update(list => [...list, employee]);
            return employee;
        } finally {
            this._loading.set(false);
        }
    }

    async updateEmployee(id: number, request: EmployeeRequest): Promise<Employee> {
        this._loading.set(true);
        try {
            const employee = await firstValueFrom(
                this.http.put<Employee>(`${this.baseUrl}/${id}`, request)
            );
            this._employees.update(list =>
                list.map(e => e.id === id ? employee : e)
            );
            return employee;
        } finally {
            this._loading.set(false);
        }
    }

    async deactivateEmployee(id: number): Promise<void> {
        await firstValueFrom(
            this.http.patch<void>(`${this.baseUrl}/${id}/deactivate`, {})
        );
        this._employees.update(list =>
            list.map(e => e.id === id ? { ...e, estado: 'INACTIVO' as const } : e)
        );
    }

    async deleteEmployee(id: number): Promise<void> {
        await firstValueFrom(
            this.http.delete<void>(`${this.baseUrl}/${id}`)
        );
        this._employees.update(list => list.filter(e => e.id !== id));
    }

    async searchEmployees(term: string): Promise<Employee[]> {
        return firstValueFrom(
            this.http.get<Employee[]>(`${this.baseUrl}/search`, { params: { term } })
        );
    }

    // ── Emergency Contacts ────────────────────────────────────────────────────

    async getEmergencyContacts(employeeId: number): Promise<EmergencyContact[]> {
        return firstValueFrom(
            this.http.get<EmergencyContact[]>(`${this.baseUrl}/${employeeId}/emergency-contacts`)
        );
    }

    async createEmergencyContact(employeeId: number, request: EmergencyContactRequest): Promise<EmergencyContact> {
        return firstValueFrom(
            this.http.post<EmergencyContact>(`${this.baseUrl}/${employeeId}/emergency-contacts`, request)
        );
    }

    async updateEmergencyContact(employeeId: number, id: number, request: EmergencyContactRequest): Promise<EmergencyContact> {
        return firstValueFrom(
            this.http.put<EmergencyContact>(`${this.baseUrl}/${employeeId}/emergency-contacts/${id}`, request)
        );
    }

    async deleteEmergencyContact(employeeId: number, id: number): Promise<void> {
        return firstValueFrom(
            this.http.delete<void>(`${this.baseUrl}/${employeeId}/emergency-contacts/${id}`)
        );
    }

    // ── Dependents ────────────────────────────────────────────────────────────

    async getDependents(employeeId: number): Promise<EmployeeDependent[]> {
        return firstValueFrom(
            this.http.get<EmployeeDependent[]>(`${this.baseUrl}/${employeeId}/dependents`)
        );
    }

    async createDependent(employeeId: number, request: DependentRequest): Promise<EmployeeDependent> {
        return firstValueFrom(
            this.http.post<EmployeeDependent>(`${this.baseUrl}/${employeeId}/dependents`, request)
        );
    }

    async updateDependent(employeeId: number, id: number, request: DependentRequest): Promise<EmployeeDependent> {
        return firstValueFrom(
            this.http.put<EmployeeDependent>(`${this.baseUrl}/${employeeId}/dependents/${id}`, request)
        );
    }

    async deleteDependent(employeeId: number, id: number): Promise<void> {
        return firstValueFrom(
            this.http.delete<void>(`${this.baseUrl}/${employeeId}/dependents/${id}`)
        );
    }

    // ── Documents ─────────────────────────────────────────────────────────────

    async getDocuments(employeeId: number): Promise<EmployeeDocument[]> {
        return firstValueFrom(
            this.http.get<EmployeeDocument[]>(`${this.baseUrl}/${employeeId}/documents`)
        );
    }

    async createDocument(employeeId: number, request: DocumentRequest): Promise<EmployeeDocument> {
        return firstValueFrom(
            this.http.post<EmployeeDocument>(`${this.baseUrl}/${employeeId}/documents`, request)
        );
    }

    async updateDocument(employeeId: number, id: number, request: DocumentRequest): Promise<EmployeeDocument> {
        return firstValueFrom(
            this.http.put<EmployeeDocument>(`${this.baseUrl}/${employeeId}/documents/${id}`, request)
        );
    }

    async deleteDocument(employeeId: number, id: number): Promise<void> {
        return firstValueFrom(
            this.http.delete<void>(`${this.baseUrl}/${employeeId}/documents/${id}`)
        );
    }

    // ── Salary History ────────────────────────────────────────────────────────

    async getSalaryHistory(employeeId: number): Promise<SalaryRecord[]> {
        return firstValueFrom(
            this.http.get<SalaryRecord[]>(`${this.baseUrl}/${employeeId}/salary-history`)
        );
    }

    async createSalaryRecord(employeeId: number, request: SalaryRequest): Promise<SalaryRecord> {
        return firstValueFrom(
            this.http.post<SalaryRecord>(`${this.baseUrl}/${employeeId}/salary-history`, request)
        );
    }

    /**
     * Sube la foto del empleado; el backend la guarda como binario en la base de
     * datos y devuelve el empleado con la URL del binario servido.
     */
    async subirFoto(id: number, archivo: File): Promise<Employee> {
        const formData = new FormData();
        formData.append('file', archivo);
        return firstValueFrom(this.http.post<Employee>(`${this.baseUrl}/${id}/foto`, formData));
    }

    /**
     * Elimina la foto del empleado: el backend borra el binario y sus metadatos.
     */
    async eliminarFoto(id: number): Promise<Employee> {
        return firstValueFrom(this.http.delete<Employee>(`${this.baseUrl}/${id}/foto`));
    }
}
