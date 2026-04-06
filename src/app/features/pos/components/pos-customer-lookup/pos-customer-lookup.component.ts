import { Component, ChangeDetectionStrategy, output, signal } from '@angular/core';

export interface PosClient {
    id: number | null;
    tipoDoc: string;
    numDoc: string;
    nombre: string;
    direccion: string;
}

@Component({
    selector: 'app-pos-customer-lookup',
    standalone: true,
    templateUrl: './pos-customer-lookup.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosCustomerLookupComponent {

    readonly clientSelected = output<PosClient>();
    readonly clientCleared = output<void>();

    readonly query = signal('');
    readonly selectedClient = signal<PosClient | null>(null);

    onSearch(value: string): void {
        this.query.set(value);
        // When implementing F10 fully, this would call a backend search
        // and show autocomplete results. For now, simple text-based client entry.
        if (value.length >= 8) {
            // Auto-set as manual entry when doc number is long enough
            const isRuc = value.length === 11;
            const client: PosClient = {
                id: null,
                tipoDoc: isRuc ? 'RUC' : 'DNI',
                numDoc: value,
                nombre: '',
                direccion: '',
            };
            this.selectedClient.set(client);
            this.clientSelected.emit(client);
        }
    }

    clear(): void {
        this.query.set('');
        this.selectedClient.set(null);
        this.clientCleared.emit();
    }

    clearSelection(): void {
        this.selectedClient.set(null);
        this.clientCleared.emit();
    }
}
