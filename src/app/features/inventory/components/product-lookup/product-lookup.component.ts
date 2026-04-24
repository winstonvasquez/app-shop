import { ChangeDetectionStrategy, Component, inject, signal, output, input } from '@angular/core';
import { ProductsApiService } from '@features/products/services/products-api.service';
import { ProductResponse } from '@core/models/product.model';

@Component({
    selector: 'app-product-lookup',
    standalone: true,
    imports: [],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="rounded-xl border border-border-subtle bg-surface p-4 shadow-sm space-y-3">
            <div class="flex flex-col gap-2 md:flex-row md:items-end">
                <div class="flex-1">
                    <label class="text-xs font-semibold uppercase text-subtle">Buscar producto</label>
                    <input
                        class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm"
                        [placeholder]="placeholder()"
                        [value]="query()"
                        (input)="query.set($any($event.target).value)"
                    />
                </div>
                <button
                    type="button"
                    class="rounded-full border border-border px-4 py-2 text-xs font-semibold text-on hover:bg-surface-raised"
                    (click)="search()"
                    [disabled]="loading()"
                >
                    {{ loading() ? 'Buscando...' : 'Buscar' }}
                </button>
            </div>

            @if (error()) {
                <div class="rounded-lg border border-error/30 bg-error/10 p-3 text-xs text-error-hover">{{ error() }}</div>
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
                <p class="text-xs text-gray-400">Sin resultados.</p>
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
