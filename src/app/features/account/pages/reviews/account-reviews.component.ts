import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { BreadcrumbComponent, BreadcrumbItem } from '@shared/components/breadcrumb/breadcrumb.component';

interface ResenaResponse {
    id: number;
    productoId: number;
    productoNombre: string;
    calificacion: number;
    comentario: string | null;
    fechaResena: string;
}

@Component({
    selector: 'app-account-reviews',
    standalone: true,
    imports: [DatePipe, RouterLink, ReactiveFormsModule, BreadcrumbComponent],
    templateUrl: './account-reviews.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountReviewsComponent implements OnInit {
    private http = inject(HttpClient);
    private fb = inject(FormBuilder);

    readonly breadcrumbItems: BreadcrumbItem[] = [
        { label: 'Inicio', route: ['/home'] },
        { label: 'Mi Cuenta' },
        { label: 'Tus reseñas' }
    ];

    reviews = signal<ResenaResponse[]>([]);
    loading = signal(true);
    editing = signal<number | null>(null);
    deleting = signal<number | null>(null);
    saving = signal(false);

    editForm = this.fb.group({
        calificacion: [1, [Validators.required, Validators.min(1), Validators.max(5)]],
        comentario: [''],
    });

    readonly isEmpty = computed(() => !this.loading() && this.reviews().length === 0);

    private readonly base = `${environment.apiUrls.sales}/api/productos/reviews`;

    ngOnInit(): void {
        this.http.get<{ content: ResenaResponse[] }>(`${this.base}/mine`).subscribe({
            next: (data) => {
                this.reviews.set(data.content ?? []);
                this.loading.set(false);
            },
            error: () => {
                this.reviews.set([]);
                this.loading.set(false);
            },
        });
    }

    starsArray(rating: number): boolean[] {
        return Array.from({ length: 5 }, (_, i) => i < rating);
    }

    startEdit(review: ResenaResponse): void {
        this.editing.set(review.id);
        this.editForm.setValue({ calificacion: review.calificacion, comentario: review.comentario ?? '' });
    }

    cancelEdit(): void {
        this.editing.set(null);
    }

    saveEdit(review: ResenaResponse): void {
        if (this.editForm.invalid) return;
        this.saving.set(true);
        const { calificacion, comentario } = this.editForm.value;
        this.http.put<ResenaResponse>(`${this.base}/${review.id}`, {
            productoId: review.productoId,
            calificacion,
            comentario,
        }).subscribe({
            next: (updated) => {
                this.reviews.update(list => list.map(r => r.id === updated.id ? updated : r));
                this.editing.set(null);
                this.saving.set(false);
            },
            error: () => this.saving.set(false),
        });
    }

    deleteReview(id: number): void {
        this.deleting.set(id);
        this.http.delete<void>(`${this.base}/${id}`).subscribe({
            next: () => {
                this.reviews.update(list => list.filter(r => r.id !== id));
                this.deleting.set(null);
            },
            error: () => this.deleting.set(null),
        });
    }
}
