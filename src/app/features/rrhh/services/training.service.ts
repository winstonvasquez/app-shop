import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import {
    Training,
    TrainingRequest,
    TrainingParticipation,
    TrainingParticipationRequest,
} from '../models/training.model';

@Injectable({ providedIn: 'root' })
export class TrainingService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.hr}/api/trainings`;

    private readonly _trainings = signal<Training[]>([]);
    private readonly _loading = signal(false);
    private readonly _error = signal<string | null>(null);

    readonly trainings = this._trainings.asReadonly();
    readonly loading = this._loading.asReadonly();
    readonly error = this._error.asReadonly();

    readonly planificadas = computed(() => this._trainings().filter(t => t.estado === 'PLANIFICADO').length);
    readonly enCurso = computed(() => this._trainings().filter(t => t.estado === 'EN_CURSO').length);
    readonly completadas = computed(() => this._trainings().filter(t => t.estado === 'COMPLETADO').length);
    readonly totalHoras = computed(() =>
        this._trainings().filter(t => t.estado === 'COMPLETADO').reduce((s, t) => s + (t.duracionHoras || 0), 0)
    );

    async loadTrainings(): Promise<void> {
        this._loading.set(true);
        this._error.set(null);
        try {
            const data = await firstValueFrom(this.http.get<Training[]>(this.baseUrl));
            this._trainings.set(data);
        } catch {
            this._error.set('Error al cargar capacitaciones');
        } finally {
            this._loading.set(false);
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
