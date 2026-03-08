import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import { Employee, EmployeeRequest } from '../models/employee.model';

@Injectable({ providedIn: 'root' })
export class EmployeeService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrl}/hr/api/employees`;

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
}
