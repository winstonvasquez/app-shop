import { Component, ChangeDetectionStrategy, inject, input, output, signal } from '@angular/core';
import { EMPTY, Observable, Subject, catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CustomerService } from '@features/admin/services/customer.service';
import { CustomerResponse } from '@features/admin/models/customer.model';
import { construirClienteRapido } from './pos-customer-lookup.form';

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
    readonly errorBusqueda = signal<string | null>(null);
    readonly creando = signal(false);
    readonly nombreNuevo = signal('');

    private readonly search$ = new Subject<string>();

    constructor() {
        this.search$.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            switchMap(q => {
                this.buscando.set(true);
                this.notFound.set(false);
                this.errorBusqueda.set(null);
                const soloDigitos = /^\d+$/.test(q);
                const consulta: Observable<unknown> = soloDigitos && (q.length === 8 || q.length === 11)
                    ? this.customerService.findByDocumento(this.companyId(), q)
                    : this.customerService.getAll(this.companyId(), 0, 10, 'nombres,asc', q);
                // El catchError va DENTRO del switchMap: afuera, un error mataría el stream hasta recargar.
                return consulta.pipe(catchError((e: unknown) => {
                    this.buscando.set(false);
                    this.errorBusqueda.set(e instanceof Error ? e.message : 'No se pudo buscar el cliente');
                    return EMPTY;
                }));
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
        this.errorBusqueda.set(null);
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
        const request = construirClienteRapido(this.companyId(), this.query().trim(), this.nombreNuevo());
        if (!request) return;
        this.creando.set(true);
        this.errorBusqueda.set(null);
        this.customerService.create(request).subscribe({
            next: (cliente) => {
                this.creando.set(false);
                this.nombreNuevo.set('');
                this.seleccionar(cliente);
            },
            error: (e: unknown) => {
                this.creando.set(false);
                this.errorBusqueda.set(e instanceof Error ? e.message : 'No se pudo crear el cliente');
            },
        });
    }

    clear(): void {
        this.query.set('');
        this.nombreNuevo.set('');
        this.selectedClient.set(null);
        this.resultados.set([]);
        this.notFound.set(false);
        this.errorBusqueda.set(null);
        this.clientCleared.emit();
    }

    clearSelection(): void {
        this.selectedClient.set(null);
        this.clientCleared.emit();
    }
}
