import {
    Component, input, output, signal, ChangeDetectionStrategy,
    inject, ElementRef, HostListener, OnInit,
} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { Router, RouterLink } from '@angular/router';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';

import { DsWordmarkComponent } from '../ds-wordmark/ds-wordmark.component';
import { DsCategoryNavComponent, DsCategory } from '../ds-category-nav/ds-category-nav.component';
import { SearchService } from '@shared/services/search.service';
import { ProductsApiService } from '@features/products/services/products-api.service';
import { UrlEncryptionService } from '@core/services/url-encryption.service';
import { ProductResponse } from '@core/models/product.model';

/**
 * Shop Header — header Amazon-style del DS Confianza.
 * Wordmark + search (con dropdown sugerencias + scope + botón) + user + cart
 * + CategoryNav embebido. Port 1:1 de chrome.jsx → function Header().
 *
 * Inyecta SearchService + ProductsApiService para el dropdown autocomplete
 * (debounce 400ms → top 8 productos). Click outside cierra el dropdown.
 */
@Component({
    selector: 'ds-shop-header',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [LucideAngularModule, RouterLink, DsWordmarkComponent, DsCategoryNavComponent],
    template: `
        <header class="hdr">
            <div class="row">
                <a routerLink="/" class="brand-link" aria-label="Inicio">
                    <ds-wordmark [inverted]="true" [size]="24"/>
                </a>

                <form class="search" (submit)="onSubmitSearch($event)">
                    <select class="scope" [value]="scope()" (change)="onScopeChange($event)">
                        @for (s of scopes(); track s.value) {
                            <option [value]="s.value">{{ s.label }}</option>
                        }
                    </select>
                    <input
                        type="search"
                        [value]="liveQuery()"
                        (input)="onQueryInput($event)"
                        (focus)="onFocus()"
                        [placeholder]="placeholder()"
                        class="input"
                        autocomplete="off"/>
                    @if (liveQuery()) {
                        <button type="button" class="clear" (click)="clearQuery()" aria-label="Limpiar">
                            <lucide-icon name="x" [size]="16"/>
                        </button>
                    }
                    <button type="submit" class="btn" aria-label="Buscar">
                        <lucide-icon name="search" [size]="20"/>
                    </button>

                    <!-- Dropdown sugerencias -->
                    @if (dropdownOpen() && (liveQuery() || recentSearches().length || popularSearches.length)) {
                        <div class="dropdown" (click)="$event.stopPropagation()">
                            @if (liveQuery()) {
                                @if (isSearching()) {
                                    <div class="hint">Buscando "{{ liveQuery() }}"...</div>
                                } @else if (searchResults().length > 0) {
                                    <h4 class="head">Productos</h4>
                                    <div class="results">
                                        @for (p of searchResults(); track p.id) {
                                            <button type="button" class="result"
                                                    (click)="goToProduct(p.id)">
                                                @if (p.imagenes?.[0]?.url) {
                                                    <img [src]="p.imagenes![0].url" [alt]="p.nombre"/>
                                                } @else {
                                                    <span class="thumb-fallback">{{ p.nombre.charAt(0) }}</span>
                                                }
                                                <span class="info">
                                                    <span class="name">{{ p.nombre }}</span>
                                                    <span class="price">S/ {{ p.precioBase }}</span>
                                                </span>
                                            </button>
                                        }
                                    </div>
                                } @else {
                                    <div class="hint">Sin resultados para "{{ liveQuery() }}"</div>
                                }
                            } @else {
                                @if (recentSearches().length > 0) {
                                    <div class="head-row">
                                        <h4 class="head">Búsquedas recientes</h4>
                                        <button type="button" class="clear-recent"
                                                (click)="clearRecent()">Limpiar</button>
                                    </div>
                                    <div class="chips">
                                        @for (r of recentSearches(); track r) {
                                            <button type="button" class="chip"
                                                    (click)="executeSearch(r)">{{ r }}</button>
                                        }
                                    </div>
                                }
                                @if (popularSearches.length > 0) {
                                    <h4 class="head">Populares</h4>
                                    <div class="chips">
                                        @for (p of popularSearches; track p.title) {
                                            <button type="button" class="chip"
                                                    (click)="executeSearch(p.title)">
                                                @if (p.icon) { <span>{{ p.icon }}</span> }
                                                {{ p.title }}
                                            </button>
                                        }
                                    </div>
                                }
                            }
                        </div>
                    }
                </form>

                <div class="actions">
                    <button class="user" (click)="userClick.emit()" type="button">
                        <lucide-icon name="user" [size]="22"/>
                        <span class="user-text">
                            <span class="small">{{ isAuthenticated() ? 'Hola,' : 'Hola, ingresa' }}</span>
                            <strong>{{ isAuthenticated() ? userName() : 'Cuenta y pedidos' }}</strong>
                        </span>
                    </button>
                    <button class="cart" (click)="cartClick.emit()" aria-label="Carrito" type="button">
                        <lucide-icon name="shopping-cart" [size]="22"/>
                        @if (cartCount() > 0) {
                            <span class="count">{{ cartCount() > 99 ? '99+' : cartCount() }}</span>
                        }
                    </button>
                </div>
            </div>

            <ds-category-nav
                [items]="categories()"
                (selectItem)="categorySelect.emit($event)"
                (openMenu)="openCategoryMenu.emit()"
                (hoverMenu)="hoverCategoryMenu.emit()"/>
        </header>
    `,
    styles: [`
        :host { display: block; }
        .hdr {
            background: var(--c-headerBg);
            color: var(--c-headerFg);
            font-family: var(--f-sans);
        }
        .row {
            width: 90%; margin: 0 auto;
            padding: 14px 0;
            display: flex; align-items: center; gap: 24px;
        }
        .brand-link {
            display: inline-flex; align-items: center;
            text-decoration: none; color: inherit;
        }
        .search {
            flex: 1; display: flex; align-items: stretch;
            position: relative;
            height: 44px; background: #fff;
            border-radius: var(--r-md);
            border: 2px solid var(--c-accent);
            transition: box-shadow 120ms;
        }
        .search:focus-within { box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-accent) 35%, transparent); }
        .scope {
            border: none; background: var(--c-surface2);
            padding: 0 12px; font-size: 13px; color: var(--c-text);
            border-right: 1px solid var(--c-border);
            outline: none; cursor: pointer;
            font-family: inherit;
            border-top-left-radius: calc(var(--r-md) - 2px);
            border-bottom-left-radius: calc(var(--r-md) - 2px);
        }
        .input {
            flex: 1; border: none; outline: none;
            padding: 0 14px; font-size: 14px; color: var(--c-text);
            min-width: 0; background: transparent;
            font-family: inherit;
        }
        .clear {
            background: none; border: none; cursor: pointer;
            padding: 0 8px; color: var(--c-muted);
            display: inline-flex; align-items: center;
        }
        .clear:hover { color: var(--c-text); }
        .btn {
            background: var(--c-accent); border: none;
            padding: 0 20px; cursor: pointer;
            color: var(--c-onAccent, #1a1a1a);
            display: inline-flex; align-items: center; justify-content: center;
            transition: filter 120ms;
            border-top-right-radius: calc(var(--r-md) - 2px);
            border-bottom-right-radius: calc(var(--r-md) - 2px);
        }
        .btn:hover { filter: brightness(1.06); }

        /* Dropdown sugerencias */
        .dropdown {
            position: absolute; top: calc(100% + 6px); left: 0; right: 0;
            background: var(--c-surface);
            color: var(--c-text);
            border: 1px solid var(--c-border);
            border-radius: var(--r-lg);
            box-shadow: var(--s-lg);
            padding: 16px;
            z-index: 50;
            max-height: 480px; overflow-y: auto;
        }
        .dropdown .head {
            font-size: 12px; font-weight: 700;
            text-transform: uppercase; letter-spacing: .06em;
            color: var(--c-muted);
            margin: 0 0 10px;
        }
        .dropdown .head-row {
            display: flex; align-items: center; justify-content: space-between;
            margin-bottom: 10px;
        }
        .dropdown .head-row .head { margin: 0; }
        .clear-recent {
            background: none; border: none; cursor: pointer;
            font-size: 11px; color: var(--c-brand);
            font-family: inherit;
        }
        .clear-recent:hover { text-decoration: underline; }

        .hint {
            padding: 12px; text-align: center;
            color: var(--c-muted); font-size: 13px;
        }

        .results {
            display: flex; flex-direction: column; gap: 4px;
            margin-bottom: 12px;
        }
        .result {
            display: flex; align-items: center; gap: 12px;
            padding: 8px; border: none; background: none;
            border-radius: var(--r-sm); cursor: pointer;
            font-family: inherit; text-align: left; width: 100%;
            transition: background 120ms;
        }
        .result:hover { background: var(--c-surface2); }
        .result img {
            width: 40px; height: 40px; object-fit: cover;
            border-radius: var(--r-sm); flex-shrink: 0;
        }
        .thumb-fallback {
            width: 40px; height: 40px;
            background: var(--c-surface2); color: var(--c-muted);
            display: inline-flex; align-items: center; justify-content: center;
            border-radius: var(--r-sm); font-weight: 700; flex-shrink: 0;
        }
        .result .info {
            display: flex; flex-direction: column; min-width: 0; flex: 1;
        }
        .result .name {
            font-size: 13px; color: var(--c-text);
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .result .price {
            font-size: 12px; font-weight: 700; color: var(--c-brand);
        }

        .chips {
            display: flex; flex-wrap: wrap; gap: 6px;
            margin-bottom: 12px;
        }
        .chip {
            background: var(--c-surface2); border: none;
            padding: 6px 12px; border-radius: var(--r-full);
            font-size: 12px; color: var(--c-text);
            cursor: pointer; font-family: inherit;
            display: inline-flex; align-items: center; gap: 4px;
            transition: background 120ms;
        }
        .chip:hover { background: var(--c-border); }

        .actions {
            display: flex; align-items: center; gap: 20px;
            color: var(--c-headerFg);
        }
        .user {
            background: none; border: none; color: inherit;
            display: flex; align-items: center; gap: 8px;
            cursor: pointer; font-family: inherit;
            padding: 4px 8px; border-radius: var(--r-sm);
            transition: background 120ms;
        }
        .user:hover { background: rgba(255, 255, 255, .08); }
        .user-text {
            display: flex; flex-direction: column; align-items: flex-start;
            line-height: 1.2; font-size: 12px;
        }
        .user-text .small { opacity: .8; }
        .user-text strong { font-size: 13px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cart {
            background: none; border: none; color: inherit;
            position: relative; cursor: pointer;
            display: inline-flex; align-items: center; gap: 6px;
            padding: 4px 8px; border-radius: var(--r-sm);
            transition: background 120ms;
        }
        .cart:hover { background: rgba(255, 255, 255, .08); }
        .count {
            position: absolute; top: -2px; right: -4px;
            min-width: 18px; height: 18px; padding: 0 5px;
            background: var(--c-accent); color: var(--c-onAccent, #1a1a1a);
            font-size: 11px; font-weight: 800;
            border-radius: 999px;
            display: inline-flex; align-items: center; justify-content: center;
        }

        @media (max-width: 768px) {
            .row { gap: 12px; padding: 12px 16px; }
            .user-text { display: none; }
            .scope { display: none; }
        }
    `],
})
export class DsShopHeaderComponent implements OnInit {
    cartCount = input<number>(0);
    query = input<string>('');
    placeholder = input<string>('Buscar productos, marcas y categorías…');
    categories = input<DsCategory[]>([]);
    isAuthenticated = input<boolean>(false);
    userName = input<string>('');
    scopes = input<{ value: string; label: string }[]>([
        { value: 'all',  label: 'Todo' },
        { value: 'tech', label: 'Tecnología' },
        { value: 'home', label: 'Hogar' },
    ]);

    private searchSvc = inject(SearchService);
    private productsApi = inject(ProductsApiService);
    private router = inject(Router);
    private urlEnc = inject(UrlEncryptionService);
    private host = inject(ElementRef);

    /** Estado interno del scope/query — el wrapper escucha vía outputs. */
    protected readonly scope = signal<string>('all');
    protected readonly liveQuery = signal<string>('');

    /** Dropdown sugerencias */
    protected readonly dropdownOpen = signal<boolean>(false);
    protected readonly isSearching = signal<boolean>(false);
    protected readonly searchResults = signal<ProductResponse[]>([]);
    protected readonly recentSearches = this.searchSvc.recentSearches;
    protected readonly popularSearches = this.searchSvc.popularSearches;

    private readonly searchSubject = new Subject<string>();

    userClick   = output<void>();
    cartClick   = output<void>();
    search      = output<{ query: string; scope: string }>();
    categorySelect = output<DsCategory>();
    openCategoryMenu  = output<void>();
    hoverCategoryMenu = output<void>();

    ngOnInit(): void {
        // Sync inicial del query con el SearchService (URL/recent state)
        const prev = this.searchSvc.searchQuery();
        if (prev) this.liveQuery.set(prev);

        this.searchSubject.pipe(
            debounceTime(400),
            distinctUntilChanged(),
            switchMap(q => {
                if (!q.trim()) {
                    this.searchResults.set([]);
                    return of(null);
                }
                this.isSearching.set(true);
                return this.productsApi.getProducts({ page: 0, size: 8 }, q).pipe(
                    catchError(() => of({ content: [] as ProductResponse[] })),
                );
            }),
        ).subscribe(res => {
            this.isSearching.set(false);
            if (res && 'content' in res) this.searchResults.set(res.content);
        });
    }

    @HostListener('document:click', ['$event.target'])
    onDocumentClick(target: EventTarget | null): void {
        if (!this.host.nativeElement.contains(target as Node)) {
            this.dropdownOpen.set(false);
        }
    }

    protected onFocus(): void {
        this.dropdownOpen.set(true);
    }

    protected onSubmitSearch(e: Event): void {
        e.preventDefault();
        this.executeSearch(this.liveQuery() || this.query());
    }

    protected executeSearch(term: string): void {
        const q = (term || '').trim();
        if (!q) return;
        this.searchSvc.setSearchQuery(q);
        this.liveQuery.set(q);
        this.dropdownOpen.set(false);
        this.search.emit({ query: q, scope: this.scope() });
        this.router.navigate(['/products'], { queryParams: { search: q } });
    }

    protected onScopeChange(e: Event): void {
        this.scope.set((e.target as HTMLSelectElement).value);
    }

    protected onQueryInput(e: Event): void {
        const v = (e.target as HTMLInputElement).value;
        this.liveQuery.set(v);
        this.searchSubject.next(v);
        this.dropdownOpen.set(true);
    }

    protected clearQuery(): void {
        this.liveQuery.set('');
        this.searchResults.set([]);
        this.searchSvc.setSearchQuery('');
    }

    protected goToProduct(productId: number): void {
        this.dropdownOpen.set(false);
        const id = this.urlEnc.encrypt(productId);
        this.router.navigate(['/products', id]);
    }

    protected clearRecent(): void {
        this.searchSvc.clearRecentSearches();
    }
}
