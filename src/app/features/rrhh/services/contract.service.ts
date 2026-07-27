import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import { PageResponse, pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { Contract, ContractRequest, ContractStatus } from '../models/contract.model';

/** Filtros server-side del listado paginado de contratos. Todos opcionales. */
export interface ContractFiltros {
    page?: number;
    size?: number;
    search?: string;
    status?: string;
    type?: string;
    jornadaLaboral?: string;
    moneda?: string;
    employeeId?: number | null;
    departmentId?: number | null;
    /** yyyy-MM-dd */
    fechaInicioDesde?: string;
    fechaInicioHasta?: string;
    fechaFinDesde?: string;
    fechaFinHasta?: string;
}

@Injectable({ providedIn: 'root' })
export class ContractService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.hr}/api/contracts`;

    private readonly _contracts = signal<Contract[]>([]);
    private readonly _loading = signal(false);
    private readonly _error = signal<string | null>(null);

    readonly contracts = this._contracts.asReadonly();
    readonly loading = this._loading.asReadonly();
    readonly error = this._error.asReadonly();

    readonly activeContracts = computed(() =>
        this._contracts().filter(c => c.estado === 'ACTIVO')
    );

    readonly expiringContracts = computed(() =>
        this._contracts().filter(c => c.expiringSoon)
    );

    readonly totalContracts = computed(() => this._contracts().length);

    /**
     * Carga server-side paginada con TODOS los filtros avanzados (search, estado, tipo, jornada
     * laboral, moneda, empleado, departamento y rangos de fecha de inicio/fin). Todos opcionales.
     */
    async loadContractsPaged(filtros: ContractFiltros = {}): Promise<{ totalElements: number; totalPages: number }> {
        this._loading.set(true);
        this._error.set(null);
        try {
            const params: Record<string, string> = {
                page: String(filtros.page ?? 0),
                size: String(filtros.size ?? 20),
            };
            if (filtros.search) params['search'] = filtros.search;
            if (filtros.status) params['status'] = filtros.status;
            if (filtros.type) params['type'] = filtros.type;
            if (filtros.jornadaLaboral) params['jornadaLaboral'] = filtros.jornadaLaboral;
            if (filtros.moneda) params['moneda'] = filtros.moneda;
            if (filtros.employeeId != null) params['employeeId'] = String(filtros.employeeId);
            if (filtros.departmentId != null) params['departmentId'] = String(filtros.departmentId);
            if (filtros.fechaInicioDesde) params['fechaInicioDesde'] = filtros.fechaInicioDesde;
            if (filtros.fechaInicioHasta) params['fechaInicioHasta'] = filtros.fechaInicioHasta;
            if (filtros.fechaFinDesde) params['fechaFinDesde'] = filtros.fechaFinDesde;
            if (filtros.fechaFinHasta) params['fechaFinHasta'] = filtros.fechaFinHasta;
            const res = await firstValueFrom(
                this.http.get<PageResponse<Contract>>(`${this.baseUrl}/paged`, { params })
            );
            this._contracts.set(res.content ?? []);
            return { totalElements: pageTotalElements(res), totalPages: pageTotalPages(res) };
        } catch (error) {
            this._error.set('Error al cargar contratos');
            throw error;
        } finally {
            this._loading.set(false);
        }
    }

    async loadContracts(): Promise<void> {
        this._loading.set(true);
        this._error.set(null);
        try {
            const contracts = await firstValueFrom(
                this.http.get<Contract[]>(this.baseUrl)
            );
            this._contracts.set(contracts);
        } catch (error) {
            this._error.set('Error al cargar contratos');
            throw error;
        } finally {
            this._loading.set(false);
        }
    }

    async loadContractsByEmployee(employeeId: number): Promise<Contract[]> {
        return firstValueFrom(
            this.http.get<Contract[]>(`${this.baseUrl}/employee/${employeeId}`)
        );
    }

    async loadContractsByStatus(status: ContractStatus): Promise<Contract[]> {
        return firstValueFrom(
            this.http.get<Contract[]>(`${this.baseUrl}/status/${status}`)
        );
    }

    async loadExpiringContracts(days: number = 30): Promise<Contract[]> {
        return firstValueFrom(
            this.http.get<Contract[]>(`${this.baseUrl}/expiring`, { params: { days } })
        );
    }

    async createContract(request: ContractRequest): Promise<Contract> {
        this._loading.set(true);
        try {
            const contract = await firstValueFrom(
                this.http.post<Contract>(this.baseUrl, request)
            );
            this._contracts.update(list => [...list, contract]);
            return contract;
        } finally {
            this._loading.set(false);
        }
    }

    async updateContract(id: number, request: ContractRequest): Promise<Contract> {
        this._loading.set(true);
        try {
            const contract = await firstValueFrom(
                this.http.put<Contract>(`${this.baseUrl}/${id}`, request)
            );
            this._contracts.update(list =>
                list.map(c => c.id === id ? contract : c)
            );
            return contract;
        } finally {
            this._loading.set(false);
        }
    }

    async terminateContract(id: number, motivoFin: string): Promise<Contract> {
        const contract = await firstValueFrom(
            this.http.patch<Contract>(`${this.baseUrl}/${id}/terminate`, { motivoFin })
        );
        this._contracts.update(list =>
            list.map(c => c.id === id ? contract : c)
        );
        return contract;
    }

    async renewContract(id: number, request: ContractRequest): Promise<Contract> {
        this._loading.set(true);
        try {
            const contract = await firstValueFrom(
                this.http.post<Contract>(`${this.baseUrl}/${id}/renew`, request)
            );
            // The old contract gets marked RENOVADO server-side; reload to get fresh state
            await this.loadContracts();
            return contract;
        } finally {
            this._loading.set(false);
        }
    }
}
