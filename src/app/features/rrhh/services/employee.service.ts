import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import {
    Employee, EmployeeRequest,
    EmergencyContact, EmergencyContactRequest,
    EmployeeDependent, DependentRequest,
    EmployeeDocument, DocumentRequest,
    SalaryRecord, SalaryRequest,
} from '../models/employee.model';

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
}
