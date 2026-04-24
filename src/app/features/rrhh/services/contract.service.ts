import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import { Contract, ContractRequest, ContractStatus } from '../models/contract.model';

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
