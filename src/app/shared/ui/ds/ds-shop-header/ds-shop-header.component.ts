import { Component, input, output, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { RouterLink } from '@angular/router';
import { DsWordmarkComponent } from '../ds-wordmark/ds-wordmark.component';
import { DsCategoryNavComponent, DsCategory } from '../ds-category-nav/ds-category-nav.component';

/**
 * Shop Header — header Amazon-style del DS Confianza.
 * Wordmark + search (con dropdown de scope + botón naranja) + user + cart
 * + CategoryNav embebido. Port 1:1 de chrome.jsx → function Header().
 *
 * Es presentational: emite eventos hacia el wrapper que conecta servicios.
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
                        [value]="query()"
                        (input)="onQueryInput($event)"
                        [placeholder]="placeholder()"
                        class="input"
                        autocomplete="off"/>
                    <button type="submit" class="btn" aria-label="Buscar">
                        <lucide-icon name="search" [size]="20"/>
                    </button>
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
                (openMenu)="openCategoryMenu.emit()"/>
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
            max-width: 1280px; margin: 0 auto;
            padding: 14px 24px;
            display: flex; align-items: center; gap: 24px;
        }
        .brand-link {
            display: inline-flex; align-items: center;
            text-decoration: none; color: inherit;
        }
        .search {
            flex: 1; display: flex; align-items: stretch;
            height: 44px; background: #fff;
            border-radius: var(--r-md); overflow: hidden;
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
        }
        .input {
            flex: 1; border: none; outline: none;
            padding: 0 14px; font-size: 14px; color: var(--c-text);
            min-width: 0; background: transparent;
            font-family: inherit;
        }
        .btn {
            background: var(--c-accent); border: none;
            padding: 0 20px; cursor: pointer;
            color: var(--c-onAccent, #1a1a1a);
            display: inline-flex; align-items: center; justify-content: center;
            transition: filter 120ms;
        }
        .btn:hover { filter: brightness(1.06); }
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
export class DsShopHeaderComponent {
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

    /** Estado interno del scope/query — el wrapper escucha vía outputs. */
    protected readonly scope = signal<string>('all');
    protected readonly liveQuery = signal<string>('');

    userClick   = output<void>();
    cartClick   = output<void>();
    search      = output<{ query: string; scope: string }>();
    categorySelect = output<DsCategory>();
    openCategoryMenu = output<void>();

    protected onSubmitSearch(e: Event): void {
        e.preventDefault();
        this.search.emit({ query: this.liveQuery() || this.query(), scope: this.scope() });
    }

    protected onScopeChange(e: Event): void {
        this.scope.set((e.target as HTMLSelectElement).value);
    }

    protected onQueryInput(e: Event): void {
        this.liveQuery.set((e.target as HTMLInputElement).value);
    }
}
