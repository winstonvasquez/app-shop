import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import { PageResponse, pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import {
    Training,
    TrainingRequest,
    TrainingParticipation,
    TrainingParticipationRequest,
} from '../models/training.model';

/** Filtros server-side del listado paginado de capacitaciones. Todos opcionales. */
export interface TrainingFiltros {
    page?: number;
    size?: number;
    search?: string;
    estado?: string;
    instructor?: string;
    /** yyyy-MM-dd */
    fechaInicioDesde?: string;
    fechaInicioHasta?: string;
    fechaFinDesde?: string;
    fechaFinHasta?: string;
}

@Injectable({ providedIn: 'root' })
export class TrainingService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.hr}/api/trainings`;

    /** Contenido de la página actual (server-side), lo que se pinta en la tabla. */
    private readonly _trainings = signal<Training[]>([]);
    /** Snapshot completo sin filtros, usado SOLO para las KPI cards del toolbar. */
    private readonly _allTrainings = signal<Training[]>([]);
    private readonly _loading = signal(false);
    private readonly _error = signal<string | null>(null);

    readonly trainings = this._trainings.asReadonly();
    readonly loading = this._loading.asReadonly();
    readonly error = this._error.asReadonly();

    readonly planificadas = computed(() => this._allTrainings().filter(t => t.estado === 'PLANIFICADO').length);
    readonly enCurso = computed(() => this._allTrainings().filter(t => t.estado === 'EN_CURSO').length);
    readonly completadas = computed(() => this._allTrainings().filter(t => t.estado === 'COMPLETADO').length);
    readonly totalHoras = computed(() =>
        this._allTrainings().filter(t => t.estado === 'COMPLETADO').reduce((s, t) => s + (t.duracionHoras || 0), 0)
    );

    /**
     * Instructores distintos vistos en el snapshot completo (sin filtros), para poblar el
     * select del toolbar. No existe `GET /trainings/instructors` en el backend todavía.
     */
    readonly instructorOptions = computed(() => {
        const nombres = new Set<string>();
        for (const t of this._allTrainings()) {
            if (t.instructor) nombres.add(t.instructor);
        }
        return [...nombres].sort().map(n => ({ value: n, label: n }));
    });

    /** Carga server-side paginada con búsqueda, estado, instructor y rangos de fecha inicio/fin. */
    async loadTrainingsPaged(filtros: TrainingFiltros = {}): Promise<{ totalElements: number; totalPages: number }> {
        this._loading.set(true);
        this._error.set(null);
        try {
            const params: Record<string, string> = {
                page: String(filtros.page ?? 0),
                size: String(filtros.size ?? 20),
            };
            if (filtros.search) params['search'] = filtros.search;
            if (filtros.estado) params['estado'] = filtros.estado;
            if (filtros.instructor) params['instructor'] = filtros.instructor;
            if (filtros.fechaInicioDesde) params['fechaInicioDesde'] = filtros.fechaInicioDesde;
            if (filtros.fechaInicioHasta) params['fechaInicioHasta'] = filtros.fechaInicioHasta;
            if (filtros.fechaFinDesde) params['fechaFinDesde'] = filtros.fechaFinDesde;
            if (filtros.fechaFinHasta) params['fechaFinHasta'] = filtros.fechaFinHasta;
            const res = await firstValueFrom(
                this.http.get<PageResponse<Training>>(this.baseUrl, { params })
            );
            this._trainings.set(res.content ?? []);
            return { totalElements: pageTotalElements(res), totalPages: pageTotalPages(res) };
        } catch (error) {
            this._error.set('Error al cargar capacitaciones');
            throw error;
        } finally {
            this._loading.set(false);
        }
    }

    /** Snapshot sin filtros (page grande) para calcular las KPI cards del toolbar. */
    async loadStatsSnapshot(): Promise<void> {
        try {
            const res = await firstValueFrom(
                this.http.get<PageResponse<Training>>(this.baseUrl, { params: { page: '0', size: '10000' } })
            );
            this._allTrainings.set(res.content ?? []);
        } catch {
            // Las KPI cards no son críticas; se ignora el error silenciosamente.
        }
    }

    async createTraining(request: TrainingRequest): Promise<Training> {
        this._loading.set(true);
        try {
            const training = await firstValueFrom(this.http.post<Training>(this.baseUrl, request));
            this._trainings.update(list => [...list, training]);
            return training;
        } finally {
            this._loading.set(false);
        }
    }

    async updateTraining(id: number, request: TrainingRequest): Promise<Training> {
        this._loading.set(true);
        try {
            const training = await firstValueFrom(this.http.put<Training>(`${this.baseUrl}/${id}`, request));
            this._trainings.update(list => list.map(t => t.id === id ? training : t));
            return training;
        } finally {
            this._loading.set(false);
        }
    }

    async startTraining(id: number): Promise<Training> {
        const training = await firstValueFrom(this.http.post<Training>(`${this.baseUrl}/${id}/start`, {}));
        this._trainings.update(list => list.map(t => t.id === id ? training : t));
        return training;
    }

    async completeTraining(id: number): Promise<Training> {
        const training = await firstValueFrom(this.http.post<Training>(`${this.baseUrl}/${id}/complete`, {}));
        this._trainings.update(list => list.map(t => t.id === id ? training : t));
        return training;
    }

    async cancelTraining(id: number): Promise<Training> {
        const training = await firstValueFrom(this.http.post<Training>(`${this.baseUrl}/${id}/cancel`, {}));
        this._trainings.update(list => list.map(t => t.id === id ? training : t));
        return training;
    }

    async getParticipants(trainingId: number): Promise<TrainingParticipation[]> {
        return firstValueFrom(this.http.get<TrainingParticipation[]>(`${this.baseUrl}/${trainingId}/participants`));
    }

    async enrollParticipant(request: TrainingParticipationRequest): Promise<TrainingParticipation> {
        return firstValueFrom(this.http.post<TrainingParticipation>(`${this.baseUrl}/participants`, request));
    }

    async updateParticipation(id: number, request: TrainingParticipationRequest): Promise<TrainingParticipation> {
        return firstValueFrom(this.http.put<TrainingParticipation>(`${this.baseUrl}/participants/${id}`, request));
    }

    async issueCertificate(id: number): Promise<TrainingParticipation> {
        return firstValueFrom(this.http.post<TrainingParticipation>(`${this.baseUrl}/participants/${id}/certificate`, {}));
    }
}
