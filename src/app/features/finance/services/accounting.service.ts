import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import {
    JournalEntry,
    CreateJournalEntryRequest,
    JournalEntryFilters,
    JournalEntryStatus
} from '../models/journal-entry.model';
import { Account } from '../models/account.model';

@Injectable({
    providedIn: 'root'
})
export class AccountingService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrl}/finance/api/finance/v1`;

    private readonly _journalEntries = signal<JournalEntry[]>([]);
    private readonly _accounts = signal<Account[]>([]);
    private readonly _loading = signal(false);
    private readonly _error = signal<string | null>(null);

    readonly journalEntries = this._journalEntries.asReadonly();
    readonly accounts = this._accounts.asReadonly();
    readonly loading = this._loading.asReadonly();
    readonly error = this._error.asReadonly();

    readonly registeredEntries = computed(() =>
        this._journalEntries().filter(e => e.estado === JournalEntryStatus.REGISTRADO)
    );

    readonly draftEntries = computed(() =>
        this._journalEntries().filter(e => e.estado === JournalEntryStatus.BORRADOR)
    );

    async loadJournalEntries(filters?: JournalEntryFilters): Promise<void> {
        this._loading.set(true);
        this._error.set(null);

        try {
            let params = new HttpParams();
            if (filters?.periodo) params = params.set('periodo', filters.periodo);
            if (filters?.fechaDesde) params = params.set('fechaDesde', filters.fechaDesde);
            if (filters?.fechaHasta) params = params.set('fechaHasta', filters.fechaHasta);
            if (filters?.tipoComprobante) params = params.set('tipoComprobante', filters.tipoComprobante);
            if (filters?.estado) params = params.set('estado', filters.estado);

            const entries = await firstValueFrom(
                this.http.get<JournalEntry[]>(`${this.baseUrl}/journal-entries`, { params })
            );

            this._journalEntries.set(entries);
        } catch (error: any) {
            this._error.set(error.message || 'Error al cargar asientos contables');
            throw error;
        } finally {
            this._loading.set(false);
        }
    }

    async getJournalEntry(id: number): Promise<JournalEntry> {
        this._loading.set(true);
        this._error.set(null);

        try {
            const entry = await firstValueFrom(
                this.http.get<JournalEntry>(`${this.baseUrl}/journal-entries/${id}`)
            );
            return entry;
        } catch (error: any) {
            this._error.set(error.message || 'Error al obtener asiento contable');
            throw error;
        } finally {
            this._loading.set(false);
        }
    }

    async createJournalEntry(request: CreateJournalEntryRequest): Promise<JournalEntry> {
        this._loading.set(true);
        this._error.set(null);

        try {
            const entry = await firstValueFrom(
                this.http.post<JournalEntry>(`${this.baseUrl}/journal-entries`, request)
            );

            this._journalEntries.update(entries => [...entries, entry]);
            return entry;
        } catch (error: any) {
            this._error.set(error.message || 'Error al crear asiento contable');
            throw error;
        } finally {
            this._loading.set(false);
        }
    }

    async registerJournalEntry(id: number): Promise<JournalEntry> {
        this._loading.set(true);
        this._error.set(null);

        try {
            const entry = await firstValueFrom(
                this.http.put<JournalEntry>(`${this.baseUrl}/journal-entries/${id}/register`, {})
            );

            this._journalEntries.update(entries =>
                entries.map(e => e.id === id ? entry : e)
            );
            return entry;
        } catch (error: any) {
            this._error.set(error.message || 'Error al registrar asiento contable');
            throw error;
        } finally {
            this._loading.set(false);
        }
    }

    async voidJournalEntry(id: number): Promise<void> {
        this._loading.set(true);
        this._error.set(null);

        try {
            await firstValueFrom(
                this.http.put<void>(`${this.baseUrl}/journal-entries/${id}/void`, {})
            );

            this._journalEntries.update(entries =>
                entries.map(e => e.id === id ? { ...e, estado: JournalEntryStatus.ANULADO } : e)
            );
        } catch (error: any) {
            this._error.set(error.message || 'Error al anular asiento contable');
            throw error;
        } finally {
            this._loading.set(false);
        }
    }

    async loadAccounts(): Promise<void> {
        this._loading.set(true);
        this._error.set(null);

        try {
            const accounts = await firstValueFrom(
                this.http.get<Account[]>(`${this.baseUrl}/accounts`)
            );

            this._accounts.set(accounts);
        } catch (error: any) {
            this._error.set(error.message || 'Error al cargar cuentas contables');
            throw error;
        } finally {
            this._loading.set(false);
        }
    }

    async getAccount(id: number): Promise<Account> {
        this._loading.set(true);
        this._error.set(null);

        try {
            const account = await firstValueFrom(
                this.http.get<Account>(`${this.baseUrl}/accounts/${id}`)
            );
            return account;
        } catch (error: any) {
            this._error.set(error.message || 'Error al obtener cuenta contable');
            throw error;
        } finally {
            this._loading.set(false);
        }
    }

    clearError(): void {
        this._error.set(null);
    }
}
