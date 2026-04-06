import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import { Position, PositionRequest } from '../models/position.model';

@Injectable({ providedIn: 'root' })
export class PositionService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.hr}/api/positions`;

    private readonly _positions = signal<Position[]>([]);
    private readonly _loading = signal(false);
    private readonly _error = signal<string | null>(null);

    readonly positions = this._positions.asReadonly();
    readonly loading = this._loading.asReadonly();
    readonly error = this._error.asReadonly();

    readonly activePositions = computed(() =>
        this._positions().filter(p => p.activo)
    );

    readonly totalPositions = computed(() => this._positions().length);

    async loadPositions(): Promise<void> {
        this._loading.set(true);
        this._error.set(null);
        try {
            const positions = await firstValueFrom(
                this.http.get<Position[]>(this.baseUrl)
            );
            this._positions.set(positions);
        } catch (error) {
            this._error.set('Error al cargar puestos');
            throw error;
        } finally {
            this._loading.set(false);
        }
    }

    async loadAllPositions(): Promise<void> {
        this._loading.set(true);
        this._error.set(null);
        try {
            const positions = await firstValueFrom(
                this.http.get<Position[]>(`${this.baseUrl}/all`)
            );
            this._positions.set(positions);
        } catch (error) {
            this._error.set('Error al cargar puestos');
            throw error;
        } finally {
            this._loading.set(false);
        }
    }

    async getPositionsByDepartment(departmentId: number): Promise<Position[]> {
        return firstValueFrom(
            this.http.get<Position[]>(`${this.baseUrl}/department/${departmentId}`)
        );
    }

    async createPosition(request: PositionRequest): Promise<Position> {
        this._loading.set(true);
        try {
            const position = await firstValueFrom(
                this.http.post<Position>(this.baseUrl, request)
            );
            this._positions.update(list => [...list, position]);
            return position;
        } finally {
            this._loading.set(false);
        }
    }

    async updatePosition(id: number, request: PositionRequest): Promise<Position> {
        this._loading.set(true);
        try {
            const position = await firstValueFrom(
                this.http.put<Position>(`${this.baseUrl}/${id}`, request)
            );
            this._positions.update(list =>
                list.map(p => p.id === id ? position : p)
            );
            return position;
        } finally {
            this._loading.set(false);
        }
    }

    async deactivatePosition(id: number): Promise<void> {
        await firstValueFrom(
            this.http.patch<void>(`${this.baseUrl}/${id}/deactivate`, {})
        );
        this._positions.update(list =>
            list.map(p => p.id === id ? { ...p, activo: false } : p)
        );
    }
}
