import { ChangeDetectionStrategy, Component, inject, signal, output, input } from '@angular/core';
import { ProductsApiService } from '@features/products/services/products-api.service';
import { ProductResponse } from '@core/models/product.model';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { ButtonComponent } from '@shared/components';

@Component({
    selector: 'app-product-lookup',
    standalone: true,
    imports: [AlertComponent, ButtonComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="card card-body space-y-3">
            <div class="flex flex-col gap-2 md:flex-row md:items-end">
                <div class="flex-1">
                    <label class="input-label">Buscar producto</label>
                    <input
                        class="form-input mt-1"
                        [placeholder]="placeholder()"
                        [value]="query()"
                        (input)="query.set($any($event.target).value)"
                    />
                </div>
                <app-button
                    variant="secondary"
                    [label]="loading() ? 'Buscando...' : 'Buscar'"
                    [loading]="loading()"
                    [disabled]="loading()"
                    (click)="search()"
                />
            </div>

            @if (error()) {
                <app-alert type="error" [message]="error()!" [dismissible]="true" (dismiss)="error.set(null)" />
            }

            @if (results().length) {
                <div class="space-y-2">
                    @for (product of results(); track product.id) {
                        <button
                            type="button"
                            class="w-full rounded-lg border border-border-subtle px-3 py-2 text-left text-xs hover:bg-surface-raised"
                            (click)="selectProduct(product)"
                        >
                            <div class="font-semibold text-on">{{ product.nombre }}</div>
                            <div class="text-subtle">ID {{ product.id }} · S/ {{ product.precioBase }}</div>
                        </button>
                    }
                </div>
            } @else {
                <p class="text-xs text-subtle">Sin resultados.</p>
            }
        </div>
    `
})
export class ProductLookupComponent {
    private readonly api = inject(ProductsApiService);

    placeholder = input('Buscar por nombre o SKU');
    selected = output<ProductResponse>();

    query = signal('');
    results = signal<ProductResponse[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);

    search(): void {
        const term = this.query().trim();
        if (!term) {
            this.results.set([]);
            return;
        }
        this.loading.set(true);
        this.error.set(null);
        this.api.getProducts({ page: 0, size: 8 }, term).subscribe({
            next: (response) => {
                this.results.set(response.content);
                this.loading.set(false);
            },
            error: (err: Error) => {
                this.error.set(err.message);
                this.loading.set(false);
            }
        });
    }

    selectProduct(product: ProductResponse): void {
        this.selected.emit(product);
    }
}
