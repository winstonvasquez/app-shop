import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-proximamente',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
        <div class="page-container flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
            <div class="text-6xl opacity-30">🚧</div>
            <h2 class="page-title">{{ data['titulo'] ?? 'En construcción' }}</h2>
            <p class="page-subtitle text-muted">
                {{ data['descripcion'] ?? 'Esta sección estará disponible próximamente.' }}
            </p>
            <a routerLink="/admin/dashboard" class="btn btn-primary">Volver al inicio</a>
        </div>
    `
})
export class ProximamenteComponent {
    private route = inject(ActivatedRoute);
    data = this.route.snapshot.data;
}
