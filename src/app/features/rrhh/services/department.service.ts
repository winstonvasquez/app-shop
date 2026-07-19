import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import { PageResponse, pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { Department, DepartmentRequest } from '../models/department.model';

@Injectable({ providedIn: 'root' })
export class DepartmentService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.hr}/api/departments`;

    private readonly _departments = signal<Department[]>([]);
    private readonly _loading = signal(false);
    private readonly _error = signal<string | null>(null);

    readonly departments = this._departments.asReadonly();
    readonly loading = this._loading.asReadonly();
    readonly error = this._error.asReadonly();

    readonly activeDepartments = computed(() =>
        this._departments().filter(d => d.activo)
    );

    readonly totalDepartments = computed(() => this._departments().length);

    /** Trae TODOS los departamentos sin tocar el signal (para dropdowns de formulario). */
    async fetchAll(): Promise<Department[]> {
        return firstValueFrom(this.http.get<Department[]>(this.baseUrl));
    }

    async loadDepartmentsPaged(page: number, size: number, search?: string, activo?: string):
        Promise<{ totalElements: number; totalPages: number }> {
        this._loading.set(true);
        this._error.set(null);
        try {
            const params: Record<string, string> = { page: String(page), size: String(size) };
            if (search) params['search'] = search;
            if (activo) params['activo'] = activo;
            const res = await firstValueFrom(
                this.http.get<PageResponse<Department>>(`${this.baseUrl}/paged`, { params })
            );
            this._departments.set(res.content ?? []);
            return { totalElements: pageTotalElements(res), totalPages: pageTotalPages(res) };
        } catch (error) {
            this._error.set('Error al cargar departamentos');
            throw error;
        } finally {
            this._loading.set(false);
        }
    }

    async loadDepartments(): Promise<void> {
        this._loading.set(true);
        this._error.set(null);
        try {
            const departments = await firstValueFrom(
                this.http.get<Department[]>(this.baseUrl)
            );
            this._departments.set(departments);
        } catch (error) {
            this._error.set('Error al cargar departamentos');
            throw error;
        } finally {
            this._loading.set(false);
        }
    }

    async loadAllDepartments(): Promise<void> {
        this._loading.set(true);
        this._error.set(null);
        try {
            const departments = await firstValueFrom(
                this.http.get<Department[]>(`${this.baseUrl}/all`)
            );
            this._departments.set(departments);
        } catch (error) {
            this._error.set('Error al cargar departamentos');
            throw error;
        } finally {
            this._loading.set(false);
        }
    }

    async getDepartmentTree(): Promise<Department[]> {
        return firstValueFrom(
            this.http.get<Department[]>(`${this.baseUrl}/tree`)
        );
    }

    async getDepartmentById(id: number): Promise<Department> {
        return firstValueFrom(
            this.http.get<Department>(`${this.baseUrl}/${id}`)
        );
    }

    async createDepartment(request: DepartmentRequest): Promise<Department> {
        this._loading.set(true);
        try {
            const department = await firstValueFrom(
                this.http.post<Department>(this.baseUrl, request)
            );
            this._departments.update(list => [...list, department]);
            return department;
        } finally {
            this._loading.set(false);
        }
    }

    async updateDepartment(id: number, request: DepartmentRequest): Promise<Department> {
        this._loading.set(true);
        try {
            const department = await firstValueFrom(
                this.http.put<Department>(`${this.baseUrl}/${id}`, request)
            );
            this._departments.update(list =>
                list.map(d => d.id === id ? department : d)
            );
            return department;
        } finally {
            this._loading.set(false);
        }
    }

    async deactivateDepartment(id: number): Promise<void> {
        await firstValueFrom(
            this.http.patch<void>(`${this.baseUrl}/${id}/deactivate`, {})
        );
        this._departments.update(list =>
            list.map(d => d.id === id ? { ...d, activo: false } : d)
        );
    }
}
