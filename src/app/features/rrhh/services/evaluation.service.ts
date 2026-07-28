import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import { PageResponse, pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import {
    Evaluation,
    EvaluationRequest,
    EvaluationCriteria,
    EvaluationCriteriaRequest,
    Goal,
    GoalRequest,
} from '../models/evaluation.model';

export interface EvaluationListParams {
    page?: number;
    size?: number;
    search?: string;
    estado?: string;
    tipo?: string;
    employeeId?: number | null;
    evaluadorId?: number | null;
    departmentId?: number | null;
    periodo?: string;
    fechaEvaluacionDesde?: string;
    fechaEvaluacionHasta?: string;
    proximaRevisionDesde?: string;
    proximaRevisionHasta?: string;
}

/** Filtros server-side del listado paginado de criterios de evaluación. Todos opcionales. */
export interface CriteriaFiltros {
    page?: number;
    size?: number;
    search?: string;
    activo?: string;
}

/** Filtros server-side del listado paginado de metas. Todos opcionales. */
export interface GoalFiltros {
    page?: number;
    size?: number;
    search?: string;
    estado?: string;
    prioridad?: string;
    employeeId?: number | null;
    asignadoPorId?: number | null;
    departmentId?: number | null;
    /** yyyy-MM-dd */
    fechaInicioDesde?: string;
    fechaInicioHasta?: string;
    fechaFinDesde?: string;
    fechaFinHasta?: string;
}

@Injectable({ providedIn: 'root' })
export class EvaluationService {
    private readonly http = inject(HttpClient);
    private readonly evalUrl = `${environment.apiUrls.hr}/api/evaluations`;
    private readonly goalUrl = `${environment.apiUrls.hr}/api/goals`;

    /** Contenido de la página actual (server-side), lo que se pinta en la tabla. */
    private readonly _evaluations = signal<Evaluation[]>([]);
    /** Snapshot completo sin filtros, usado SOLO para las KPI cards del toolbar. */
    private readonly _allEvaluations = signal<Evaluation[]>([]);
    private readonly _criteria = signal<EvaluationCriteria[]>([]);
    private readonly _goals = signal<Goal[]>([]);
    private readonly _loading = signal(false);
    private readonly _error = signal<string | null>(null);
    private readonly _totalElements = signal(0);
    private readonly _totalPages = signal(0);
    /** Paginación server-side del listado de criterios (independiente de la de evaluaciones). */
    private readonly _criteriaTotalElements = signal(0);
    private readonly _criteriaTotalPages = signal(0);
    /** Paginación server-side del listado de metas. */
    private readonly _goalsTotalElements = signal(0);
    private readonly _goalsTotalPages = signal(0);
    /** Snapshot completo sin filtros, usado SOLO para las KPI cards de metas. */
    private readonly _allGoals = signal<Goal[]>([]);

    readonly evaluations = this._evaluations.asReadonly();
    readonly criteria = this._criteria.asReadonly();
    readonly goals = this._goals.asReadonly();
    readonly loading = this._loading.asReadonly();
    readonly error = this._error.asReadonly();
    readonly totalElements = this._totalElements.asReadonly();
    readonly totalPages = this._totalPages.asReadonly();
    readonly criteriaTotalElements = this._criteriaTotalElements.asReadonly();
    readonly criteriaTotalPages = this._criteriaTotalPages.asReadonly();
    readonly goalsTotalElements = this._goalsTotalElements.asReadonly();
    readonly goalsTotalPages = this._goalsTotalPages.asReadonly();

    /** KPIs sobre el dataset COMPLETO de metas (no la página visible). */
    readonly metasEnProgreso = computed(() => this._allGoals().filter(g => g.estado === 'EN_PROGRESO').length);
    readonly metasCompletadas = computed(() => this._allGoals().filter(g => g.estado === 'COMPLETADO').length);
    readonly metasRetrasadas = computed(() => this._allGoals().filter(g => g.estado === 'RETRASADO').length);
    readonly metasTotal = computed(() => this._allGoals().length);

    readonly activeCriteria = computed(() => this._criteria().filter(c => c.activo));

    /** KPIs sobre el dataset COMPLETO (no la página visible). */
    readonly borradores = computed(() => this._allEvaluations().filter(e => e.estado === 'BORRADOR').length);
    readonly completadas = computed(() => this._allEvaluations().filter(e => e.estado === 'COMPLETADA' || e.estado === 'APROBADA').length);

    // ── Evaluations ─────────────────────────────────────────────────────────

    async loadEvaluations(params?: EvaluationListParams): Promise<void> {
        this._loading.set(true);
        this._error.set(null);
        let httpParams = new HttpParams();
        if (params?.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
        if (params?.size !== undefined) httpParams = httpParams.set('size', params.size.toString());
        if (params?.search) httpParams = httpParams.set('search', params.search);
        if (params?.estado) httpParams = httpParams.set('estado', params.estado);
        if (params?.tipo) httpParams = httpParams.set('tipo', params.tipo);
        if (params?.employeeId != null) httpParams = httpParams.set('employeeId', String(params.employeeId));
        if (params?.evaluadorId != null) httpParams = httpParams.set('evaluadorId', String(params.evaluadorId));
        if (params?.departmentId != null) httpParams = httpParams.set('departmentId', String(params.departmentId));
        if (params?.periodo) httpParams = httpParams.set('periodo', params.periodo);
        if (params?.fechaEvaluacionDesde) httpParams = httpParams.set('fechaEvaluacionDesde', params.fechaEvaluacionDesde);
        if (params?.fechaEvaluacionHasta) httpParams = httpParams.set('fechaEvaluacionHasta', params.fechaEvaluacionHasta);
        if (params?.proximaRevisionDesde) httpParams = httpParams.set('proximaRevisionDesde', params.proximaRevisionDesde);
        if (params?.proximaRevisionHasta) httpParams = httpParams.set('proximaRevisionHasta', params.proximaRevisionHasta);
        try {
            const res = await firstValueFrom(
                this.http.get<PageResponse<Evaluation>>(this.evalUrl, { params: httpParams })
            );
            this._evaluations.set(res.content);
            this._totalElements.set(pageTotalElements(res));
            this._totalPages.set(pageTotalPages(res));
        } catch {
            this._error.set('Error al cargar evaluaciones');
            this._evaluations.set([]);
            this._totalElements.set(0);
            this._totalPages.set(0);
        } finally {
            this._loading.set(false);
        }
    }

    /** Snapshot sin filtros (page grande) para calcular las KPI cards del toolbar. */
    async loadStatsSnapshot(): Promise<void> {
        try {
            const res = await firstValueFrom(
                this.http.get<PageResponse<Evaluation>>(this.evalUrl, { params: { page: '0', size: '10000' } })
            );
            this._allEvaluations.set(res.content ?? []);
        } catch {
            // Las KPI cards no son críticas; se ignora el error silenciosamente.
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

    /**
     * Listado paginado server-side de criterios (`GET /hr/api/evaluations/criteria/paged`)
     * con búsqueda por texto y filtro de activo. Reemplaza el filtrado client-side.
     */
    async loadCriteriaPaged(filtros: CriteriaFiltros = {}): Promise<void> {
        this._loading.set(true);
        try {
            const params: Record<string, string> = {
                page: String(filtros.page ?? 0),
                size: String(filtros.size ?? 20),
            };
            if (filtros.search) params['search'] = filtros.search;
            if (filtros.activo) params['activo'] = filtros.activo;
            const res = await firstValueFrom(
                this.http.get<PageResponse<EvaluationCriteria>>(`${this.evalUrl}/criteria/paged`, { params })
            );
            this._criteria.set(res.content ?? []);
            this._criteriaTotalElements.set(pageTotalElements(res));
            this._criteriaTotalPages.set(pageTotalPages(res));
        } catch {
            this._error.set('Error al cargar criterios');
            this._criteria.set([]);
            this._criteriaTotalElements.set(0);
            this._criteriaTotalPages.set(0);
        } finally {
            this._loading.set(false);
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

    async activateCriteria(id: number): Promise<void> {
        await firstValueFrom(this.http.patch<void>(`${this.evalUrl}/criteria/${id}/activate`, {}));
        this._criteria.update(list => list.map(c => c.id === id ? { ...c, activo: true } : c));
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

    /**
     * Listado paginado server-side (`GET /hr/api/goals/paged`) con búsqueda, estado, prioridad,
     * empleado, asignador, departamento y rangos de fecha inicio/fin. Reemplaza el filtrado
     * y la paginación client-side.
     */
    async loadGoalsPaged(filtros: GoalFiltros = {}): Promise<void> {
        this._loading.set(true);
        this._error.set(null);
        try {
            const params: Record<string, string> = {
                page: String(filtros.page ?? 0),
                size: String(filtros.size ?? 10),
            };
            if (filtros.search) params['search'] = filtros.search;
            if (filtros.estado) params['estado'] = filtros.estado;
            if (filtros.prioridad) params['prioridad'] = filtros.prioridad;
            if (filtros.employeeId != null) params['employeeId'] = String(filtros.employeeId);
            if (filtros.asignadoPorId != null) params['asignadoPorId'] = String(filtros.asignadoPorId);
            if (filtros.departmentId != null) params['departmentId'] = String(filtros.departmentId);
            if (filtros.fechaInicioDesde) params['fechaInicioDesde'] = filtros.fechaInicioDesde;
            if (filtros.fechaInicioHasta) params['fechaInicioHasta'] = filtros.fechaInicioHasta;
            if (filtros.fechaFinDesde) params['fechaFinDesde'] = filtros.fechaFinDesde;
            if (filtros.fechaFinHasta) params['fechaFinHasta'] = filtros.fechaFinHasta;
            const res = await firstValueFrom(
                this.http.get<PageResponse<Goal>>(`${this.goalUrl}/paged`, { params })
            );
            this._goals.set(res.content ?? []);
            this._goalsTotalElements.set(pageTotalElements(res));
            this._goalsTotalPages.set(pageTotalPages(res));
        } catch {
            this._error.set('Error al cargar metas');
            this._goals.set([]);
            this._goalsTotalElements.set(0);
            this._goalsTotalPages.set(0);
        } finally {
            this._loading.set(false);
        }
    }

    /** Snapshot sin filtros (page grande) para calcular las KPI cards de metas. */
    async loadGoalsStatsSnapshot(): Promise<void> {
        try {
            const res = await firstValueFrom(
                this.http.get<PageResponse<Goal>>(`${this.goalUrl}/paged`, { params: { page: '0', size: '10000' } })
            );
            this._allGoals.set(res.content ?? []);
        } catch {
            // Las KPI cards no son críticas; se ignora el error silenciosamente.
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
