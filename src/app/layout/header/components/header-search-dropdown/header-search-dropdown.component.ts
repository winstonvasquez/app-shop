import { Component, ElementRef, HostListener, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SearchService } from '@shared/services/search.service';
import { ProductsApiService } from '@features/products/services/products-api.service';
import { ProductResponse } from '@core/models/product.model';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { UrlEncryptionService } from '@core/services/url-encryption.service';

@Component({
    selector: 'app-header-search-dropdown',
    standalone: true,
    imports: [
    FormsModule,
    TranslateModule,
    DecimalPipe,
  ],
    templateUrl: './header-search-dropdown.component.html'
})
export class HeaderSearchDropdownComponent implements OnInit {
    searchService = inject(SearchService);
    productsApiService = inject(ProductsApiService);
    router = inject(Router);
    private elementRef = inject(ElementRef);
    private urlEncryption = inject(UrlEncryptionService);

    searchQuery = signal('');
    isOpen = signal(false);
    isSearching = signal(false);
    searchResults = signal<ProductResponse[]>([]);

    private searchSubject = new Subject<string>();

    recentSearches = this.searchService.recentSearches;
    popularSearches = this.searchService.popularSearches;

    ngOnInit() {
        this.searchQuery.set(this.searchService.searchQuery());

        this.searchSubject.pipe(
            debounceTime(400),
            distinctUntilChanged(),
            switchMap(query => {
                if (!query.trim()) {
                    this.searchResults.set([]);
                    return of(null);
                }
                this.isSearching.set(true);
                return this.productsApiService.getProducts({ page: 0, size: 8 }, query).pipe(
                    catchError(() => of({ content: [] }))
                );
            })
        ).subscribe(response => {
            this.isSearching.set(false);
            if (response && response.content) {
                this.searchResults.set(response.content);
            }
        });
    }

    onFocus() {
        this.isOpen.set(true);
    }

    @HostListener('document:click', ['$event.target'])
    onClickOutside(targetElement: EventTarget | null) {
        const clickedInside = this.elementRef.nativeElement.contains(targetElement as Node);
        if (!clickedInside) {
            this.isOpen.set(false);
        }
    }

    executeSearch(term?: string) {
        const query = term || this.searchQuery();
        if (query.trim()) {
            this.searchService.setSearchQuery(query);
            this.searchQuery.set(query);
            this.isOpen.set(false);

            if (this.router.url !== '/' && !this.router.url.startsWith('/?')) {
                this.router.navigate(['/']);
            }
        }
    }

    goToProduct(productId: number) {
        this.isOpen.set(false);
        const encryptedId = this.urlEncryption.encrypt(productId);
        this.router.navigate(['/products', encryptedId]);
    }

    searchQueryChanged(query: string) {
        this.searchSubject.next(query);
    }

    clearSearch() {
        this.searchQuery.set('');
        this.searchService.setSearchQuery('');
        this.isOpen.set(false);
        if (this.router.url !== '/' && !this.router.url.startsWith('/?')) {
            this.router.navigate(['/']);
        }
    }

    clearRecent() {
        this.searchService.clearRecentSearches();
    }
}
