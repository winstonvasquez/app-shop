import { Component, ChangeDetectionStrategy, inject, input, output, signal } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CustomerService } from '@features/admin/services/customer.service';
import { CustomerResponse } from '@features/admin/models/customer.model';

export interface PosClient {
    id: number | null;
    tipoDoc: string;
    numDoc: string;
    nombre: string;
    direccion: string;
}

function toPosClient(c: CustomerResponse): PosClient {
    return {
        id: c.id,
        tipoDoc: c.tipoDocumento,
        numDoc: c.numeroDocumento,
        nombre: c.nombreCompleto,
        direccion: '',
    };
}

@Component({
    selector: 'app-pos-customer-lookup',
    standalone: true,
    templateUrl: './pos-customer-lookup.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosCustomerLookupComponent {
    private readonly customerService = inject(CustomerService);

    readonly companyId = input.required<number>();

    readonly clientSelected = output<PosClient>();
    readonly clientCleared = output<void>();

    readonly query = signal('');
    readonly selectedClient = signal<PosClient | null>(null);
    readonly buscando = signal(false);
    readonly resultados = signal<CustomerResponse[]>([]);
    readonly notFound = signal(false);

    private readonly search$ = new Subject<string>();

    constructor() {
        this.search$.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            switchMap(q => {
                this.buscando.set(true);
                this.notFound.set(false);
                const soloDigitos = /^\d+$/.test(q);
                if (soloDigitos && (q.length === 8 || q.length === 11)) {
                    return this.customerService.findByDocumento(this.companyId(), q);
                }
                return this.customerService.getAll(this.companyId(), 0, 10, 'nombres,asc', q);
            }),
            takeUntilDestroyed(),
        ).subscribe(result => {
            this.buscando.set(false);
            if (result === null) {
                this.resultados.set([]);
                this.notFound.set(true);
            } else if (Array.isArray((result as { content?: CustomerResponse[] }).content)) {
                this.resultados.set((result as { content: CustomerResponse[] }).content);
                this.notFound.set(false);
            } else {
                // Match único por documento
                const cliente = result as CustomerResponse;
                this.resultados.set([]);
                this.seleccionar(cliente);
            }
        });
    }

    onSearch(value: string): void {
        this.query.set(value);
        this.resultados.set([]);
        this.notFound.set(false);
        if (value.trim().length < 2) return;
        this.search$.next(value.trim());
    }

    seleccionar(cliente: CustomerResponse): void {
        const client = toPosClient(cliente);
        this.selectedClient.set(client);
        this.resultados.set([]);
        this.notFound.set(false);
        this.clientSelected.emit(client);
    }

    crearRapido(): void {
        const q = this.query().trim();
        const esRuc = q.length === 11;
        this.customerService.create({
            companyId: this.companyId(),
            tipoCliente: esRuc ? 'PERSONA_JURIDICA' : 'PERSONA_NATURAL',
            tipoDocumento: esRuc ? 'RUC' : 'DNI',
            numeroDocumento: q,
            nombres: esRuc ? 'Cliente' : 'Cliente',
        }).subscribe({
            next: (cliente) => this.seleccionar(cliente),
            error: () => this.notFound.set(true),
        });
    }

    clear(): void {
        this.query.set('');
        this.selectedClient.set(null);
        this.resultados.set([]);
        this.notFound.set(false);
        this.clientCleared.emit();
    }

    clearSelection(): void {
        this.selectedClient.set(null);
        this.clientCleared.emit();
    }
}
