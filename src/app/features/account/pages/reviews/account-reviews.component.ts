import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

interface MyReview {
    id: number;
    productId: number;
    productName: string;
    productImage: string;
    rating: number;
    comment: string;
    fecha: string;
}

@Component({
    selector: 'app-account-reviews',
    standalone: true,
    imports: [CommonModule, RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="page-container">
            <div class="page-header">
                <h1 class="page-title">Tus reseñas</h1>
                <p class="page-subtitle">Opiniones que has escrito sobre productos</p>
            </div>

            @if (loading()) {
                <div class="loading-container">
                    <div class="spinner"></div>
                </div>
            } @else if (reviews().length === 0) {
                <div class="flex flex-col items-center justify-center py-16 text-[var(--color-text-muted)] gap-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
                        class="opacity-40">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        <circle cx="8" cy="10" r="1"/>
                        <circle cx="12" cy="10" r="1"/>
                        <circle cx="16" cy="10" r="1"/>
                    </svg>
                    <p class="text-base font-medium">Aún no has escrito reseñas</p>
                    <a routerLink="/products"
                        class="btn btn-primary text-sm">
                        Explorar productos
                    </a>
                </div>
            } @else {
                <div class="flex flex-col gap-4 mt-6">
                    @for (review of reviews(); track review.id) {
                        <div class="card">
                            <div class="card-body flex gap-4">
                                <img [src]="review.productImage" [alt]="review.productName"
                                    class="w-16 h-16 object-cover rounded-lg border border-[var(--color-border)] flex-shrink-0" />
                                <div class="flex flex-col gap-1 flex-1 min-w-0">
                                    <p class="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                                        {{ review.productName }}
                                    </p>
                                    <div class="flex items-center gap-1">
                                        @for (star of starsArray(review.rating); track $index) {
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
                                                viewBox="0 0 24 24"
                                                [attr.fill]="star ? 'currentColor' : 'none'"
                                                stroke="currentColor" stroke-width="1.5"
                                                class="text-[var(--color-accent)]">
                                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                                            </svg>
                                        }
                                    </div>
                                    <p class="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                                        {{ review.comment }}
                                    </p>
                                    <p class="text-xs text-[var(--color-text-muted)] mt-1">
                                        {{ review.fecha | date:'dd/MM/yyyy' }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    }
                </div>
            }
        </div>
    `,
})
export class AccountReviewsComponent implements OnInit {
    private http = inject(HttpClient);

    reviews = signal<MyReview[]>([]);
    loading = signal(true);

    ngOnInit(): void {
        this.http.get<MyReview[]>(`${environment.apiUrls.sales}/api/products/reviews/mine`).subscribe({
            next: (data) => {
                this.reviews.set(data ?? []);
                this.loading.set(false);
            },
            error: () => {
                // Endpoint no disponible — estado vacío
                this.reviews.set([]);
                this.loading.set(false);
            },
        });
    }

    starsArray(rating: number): boolean[] {
        return Array.from({ length: 5 }, (_, i) => i < rating);
    }
}
