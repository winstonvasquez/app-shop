import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import {
    InvoiceReceivable,
    Customer,
    Payment,
    CreatePaymentRequest,
    InvoiceFilters,
    InvoiceStatus
} from '../models/invoice.model';

@Injectable({
    providedIn: 'root'
})
export class InvoiceService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrl}/finance/api/finance/v1`;

    private readonly _invoices = signal<InvoiceReceivable[]>([]);
    private readonly _customers = signal<Customer[]>([]);
    private readonly _payments = signal<Payment[]>([]);
    private readonly _loading = signal(false);
    private readonly _error = signal<string | null>(null);

    readonly invoices = this._invoices.asReadonly();
    readonly customers = this._customers.asReadonly();
    readonly payments = this._payments.asReadonly();
    readonly loading = this._loading.asReadonly();
    readonly error = this._error.asReadonly();

    readonly pendingInvoices = computed(() =>
        this._invoices().filter(i => i.estado === InvoiceStatus.PENDIENTE)
    );

    readonly overdueInvoices = computed(() =>
        this._invoices().filter(i => i.estado === InvoiceStatus.VENCIDA)
    );

    readonly totalPending = computed(() =>
        this.pendingInvoices().reduce((sum, inv) => sum + inv.saldoPendiente, 0)
    );

    async loadInvoices(filters?: InvoiceFilters): Promise<void> {
        this._loading.set(true);
        this._error.set(null);

        try {
            let params = new HttpParams();
            if (filters?.clienteId) params = params.set('clienteId', filters.clienteId.toString());
            if (filters?.estado) params = params.set('estado', filters.estado);
            if (filters?.fechaDesde) params = params.set('fechaDesde', filters.fechaDesde);
            if (filters?.fechaHasta) params = params.set('fechaHasta', filters.fechaHasta);
            if (filters?.vencidas !== undefined) params = params.set('vencidas', filters.vencidas.toString());

            const invoices = await firstValueFrom(
                this.http.get<InvoiceReceivable[]>(`${this.baseUrl}/invoices/receivable`, { params })
            );

            this._invoices.set(invoices);
        } catch (error: any) {
            this._error.set(error.message || 'Error al cargar facturas por cobrar');
            throw error;
        } finally {
            this._loading.set(false);
        }
    }

    async getInvoice(id: number): Promise<InvoiceReceivable> {
        this._loading.set(true);
        this._error.set(null);

        try {
            const invoice = await firstValueFrom(
                this.http.get<InvoiceReceivable>(`${this.baseUrl}/invoices/receivable/${id}`)
            );
            return invoice;
        } catch (error: any) {
            this._error.set(error.message || 'Error al obtener factura');
            throw error;
        } finally {
            this._loading.set(false);
        }
    }

    async loadCustomers(): Promise<void> {
        this._loading.set(true);
        this._error.set(null);

        try {
            const customers = await firstValueFrom(
                this.http.get<Customer[]>(`${this.baseUrl}/customers`)
            );

            this._customers.set(customers);
        } catch (error: any) {
            this._error.set(error.message || 'Error al cargar clientes');
            throw error;
        } finally {
            this._loading.set(false);
        }
    }

    async registerPayment(request: CreatePaymentRequest): Promise<Payment> {
        this._loading.set(true);
        this._error.set(null);

        try {
            const payment = await firstValueFrom(
                this.http.post<Payment>(`${this.baseUrl}/payments/collections`, request)
            );

            this._payments.update(payments => [...payments, payment]);

            // Actualizar saldos de facturas
            await this.loadInvoices();

            return payment;
        } catch (error: any) {
            this._error.set(error.message || 'Error al registrar cobro');
            throw error;
        } finally {
            this._loading.set(false);
        }
    }

    async loadPayments(): Promise<void> {
        this._loading.set(true);
        this._error.set(null);

        try {
            const payments = await firstValueFrom(
                this.http.get<Payment[]>(`${this.baseUrl}/payments/collections`)
            );

            this._payments.set(payments);
        } catch (error: any) {
            this._error.set(error.message || 'Error al cargar cobros');
            throw error;
        } finally {
            this._loading.set(false);
        }
    }

    clearError(): void {
        this._error.set(null);
    }
}
