import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
    selector: 'app-configuracion',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
        <div class="page-header">
            <div>
                <h1 class="page-title">Configuración del Sistema</h1>
                <p class="page-subtitle">Parámetros generales del ERP</p>
            </div>
            <div class="page-actions">
                <button class="btn btn-primary" (click)="cargar()" [disabled]="cargando()">
                    {{ cargando() ? 'Cargando...' : 'Actualizar' }}
                </button>
            </div>
        </div>

        @if (error()) {
            <div class="card mb-lg" style="border-left:3px solid var(--color-warning);padding:var(--space-md)">
                <p style="color:var(--color-text-muted);font-size:0.875rem">
                    Servicio de usuarios no disponible. Verifique que microshopusers esté corriendo en puerto 8080.
                </p>
            </div>
        }

        @if (cargando()) {
            <div class="loading-container"><div class="spinner"></div></div>
        } @else if (parametros().length > 0) {
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Parámetros del sistema</h3>
                    <span class="badge badge-neutral">{{ parametros().length }} parámetros</span>
                </div>
                <div class="filters-bar">
                    <div class="search-box">
                        <span class="search-box-icon">🔍</span>
                        <input type="text" class="input-field" placeholder="Buscar parámetro..."
                               [(ngModel)]="busqueda" style="padding-left:2rem">
                    </div>
                </div>
                <table class="table">
                    <thead>
                        <tr>
                            <th class="table-header-cell">Clave</th>
                            <th class="table-header-cell">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        @for (param of parametrosFiltrados(); track param.clave) {
                            <tr class="table-row">
                                <td class="table-cell font-mono" style="font-size:0.875rem">{{ param.clave }}</td>
                                <td class="table-cell" style="color:var(--color-text-muted)">
                                    {{ param.valor || '(vacío)' }}
                                </td>
                            </tr>
                        }
                    </tbody>
                </table>
            </div>
        } @else if (!cargando()) {
            <div class="card">
                <div class="card-body" style="text-align:center;padding:var(--space-xl)">
                    <p style="color:var(--color-text-muted)">No hay parámetros configurados.</p>
                </div>
            </div>
        }
    `
})
export class ConfiguracionComponent implements OnInit {
    private http = inject(HttpClient);

    parametros = signal<{ clave: string; valor: string }[]>([]);
    cargando = signal(false);
    error = signal<string | null>(null);
    busqueda = '';

    parametrosFiltrados = computed(() => {
        const q = this.busqueda.toLowerCase();
        if (!q) return this.parametros();
        return this.parametros().filter(p =>
            p.clave.toLowerCase().includes(q) || p.valor.toLowerCase().includes(q)
        );
    });

    ngOnInit() { this.cargar(); }

    cargar() {
        this.cargando.set(true);
        this.error.set(null);
        this.http.get<Record<string, string>>(`${environment.apiUrls.users}/api/system/parameters`).subscribe({
            next: (data) => {
                const items = Object.entries(data).map(([clave, valor]) => ({ clave, valor }));
                this.parametros.set(items.sort((a, b) => a.clave.localeCompare(b.clave)));
                this.cargando.set(false);
            },
            error: () => {
                this.error.set('No disponible');
                this.cargando.set(false);
            }
        });
    }
}
