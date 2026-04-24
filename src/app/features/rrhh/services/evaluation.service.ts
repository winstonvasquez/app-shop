import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import {
    Evaluation,
    EvaluationRequest,
    EvaluationCriteria,
    EvaluationCriteriaRequest,
    Goal,
    GoalRequest,
} from '../models/evaluation.model';

@Injectable({ providedIn: 'root' })
export class EvaluationService {
    private readonly http = inject(HttpClient);
    private readonly evalUrl = `${environment.apiUrls.hr}/api/evaluations`;
    private readonly goalUrl = `${environment.apiUrls.hr}/api/goals`;

    private readonly _evaluations = signal<Evaluation[]>([]);
    private readonly _criteria = signal<EvaluationCriteria[]>([]);
    private readonly _goals = signal<Goal[]>([]);
    private readonly _loading = signal(false);
    private readonly _error = signal<string | null>(null);

    readonly evaluations = this._evaluations.asReadonly();
    readonly criteria = this._criteria.asReadonly();
    readonly goals = this._goals.asReadonly();
    readonly loading = this._loading.asReadonly();
    readonly error = this._error.asReadonly();

    readonly activeCriteria = computed(() => this._criteria().filter(c => c.activo));

    // ── Evaluations ─────────────────────────────────────────────────────────

    async loadEvaluations(): Promise<void> {
        this._loading.set(true);
        this._error.set(null);
        try {
            const data = await firstValueFrom(this.http.get<Evaluation[]>(this.evalUrl));
            this._evaluations.set(data);
        } catch {
            this._error.set('Error al cargar evaluaciones');
        } finally {
            this._loading.set(false);
        }
    }

    async getById(id: number): Promise<Evaluation> {
        return firstValueFrom(this.http.get<Evaluation>(`${this.evalUrl}/${id}`));
    }

    async getByEmployee(employeeId: number): Promise<Evaluation[]> {
        return firstValueFrom(this.http.get<Evaluation[]>(`${this.evalUrl}/employee/${employeeId}`));
    }

    async createEvaluation(request: EvaluationRequest): Promise<Evaluation> {
        this._loading.set(true);
        try {
            const evaluation = await firstValueFrom(this.http.post<Evaluation>(this.evalUrl, request));
            this._evaluations.update(list => [...list, evaluation]);
            return evaluation;
        } finally {
            this._loading.set(false);
        }
    }

    async updateEvaluation(id: number, request: EvaluationRequest): Promise<Evaluation> {
        this._loading.set(true);
        try {
            const evaluation = await firstValueFrom(this.http.put<Evaluation>(`${this.evalUrl}/${id}`, request));
            this._evaluations.update(list => list.map(e => e.id === id ? evaluation : e));
            return evaluation;
        } finally {
            this._loading.set(false);
        }
    }

    async completeEvaluation(id: number): Promise<Evaluation> {
        const evaluation = await firstValueFrom(this.http.post<Evaluation>(`${this.evalUrl}/${id}/complete`, {}));
        this._evaluations.update(list => list.map(e => e.id === id ? evaluation : e));
        return evaluation;
    }

    async approveEvaluation(id: number): Promise<Evaluation> {
        const evaluation = await firstValueFrom(this.http.post<Evaluation>(`${this.evalUrl}/${id}/approve`, {}));
        this._evaluations.update(list => list.map(e => e.id === id ? evaluation : e));
        return evaluation;
    }

    async cancelEvaluation(id: number): Promise<Evaluation> {
        const evaluation = await firstValueFrom(this.http.post<Evaluation>(`${this.evalUrl}/${id}/cancel`, {}));
        this._evaluations.update(list => list.map(e => e.id === id ? evaluation : e));
        return evaluation;
    }

    // ── Criteria ────────────────────────────────────────────────────────────

    async loadCriteria(): Promise<void> {
        try {
            const data = await firstValueFrom(this.http.get<EvaluationCriteria[]>(`${this.evalUrl}/criteria`));
            this._criteria.set(data);
        } catch {
            this._error.set('Error al cargar criterios');
        }
    }

    async createCriteria(request: EvaluationCriteriaRequest): Promise<EvaluationCriteria> {
        const criteria = await firstValueFrom(this.http.post<EvaluationCriteria>(`${this.evalUrl}/criteria`, request));
        this._criteria.update(list => [...list, criteria]);
        return criteria;
    }

    async updateCriteria(id: number, request: EvaluationCriteriaRequest): Promise<EvaluationCriteria> {
        const criteria = await firstValueFrom(this.http.put<EvaluationCriteria>(`${this.evalUrl}/criteria/${id}`, request));
        this._criteria.update(list => list.map(c => c.id === id ? criteria : c));
        return criteria;
    }

    async deactivateCriteria(id: number): Promise<void> {
        await firstValueFrom(this.http.patch<void>(`${this.evalUrl}/criteria/${id}/deactivate`, {}));
        this._criteria.update(list => list.map(c => c.id === id ? { ...c, activo: false } : c));
    }

    // ── Goals ───────────────────────────────────────────────────────────────

    async loadGoals(): Promise<void> {
        this._loading.set(true);
        try {
            const data = await firstValueFrom(this.http.get<Goal[]>(this.goalUrl));
            this._goals.set(data);
        } catch {
            this._error.set('Error al cargar metas');
        } finally {
            this._loading.set(false);
        }
    }

    async getGoalsByEmployee(employeeId: number): Promise<Goal[]> {
        return firstValueFrom(this.http.get<Goal[]>(`${this.goalUrl}/employee/${employeeId}`));
    }

    async createGoal(request: GoalRequest): Promise<Goal> {
        const goal = await firstValueFrom(this.http.post<Goal>(this.goalUrl, request));
        this._goals.update(list => [...list, goal]);
        return goal;
    }

    async updateGoal(id: number, request: GoalRequest): Promise<Goal> {
        const goal = await firstValueFrom(this.http.put<Goal>(`${this.goalUrl}/${id}`, request));
        this._goals.update(list => list.map(g => g.id === id ? goal : g));
        return goal;
    }

    async updateGoalProgress(id: number, porcentaje: number): Promise<Goal> {
        const goal = await firstValueFrom(this.http.patch<Goal>(`${this.goalUrl}/${id}/progress`, null, { params: { porcentaje } }));
        this._goals.update(list => list.map(g => g.id === id ? goal : g));
        return goal;
    }

    async completeGoal(id: number): Promise<Goal> {
        const goal = await firstValueFrom(this.http.post<Goal>(`${this.goalUrl}/${id}/complete`, {}));
        this._goals.update(list => list.map(g => g.id === id ? goal : g));
        return goal;
    }

    async cancelGoal(id: number): Promise<Goal> {
        const goal = await firstValueFrom(this.http.post<Goal>(`${this.goalUrl}/${id}/cancel`, {}));
        this._goals.update(list => list.map(g => g.id === id ? goal : g));
        return goal;
    }
}
