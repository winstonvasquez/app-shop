import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

interface SystemParameter {
    key:         string;
    value:       string;
    description: string;
    editable:    boolean;
    tipo:        string;
    group:       string;
}

@Component({
    selector: 'app-configuracion',
    standalone: true,
    imports: [FormsModule],
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
        } @else if (params().length > 0) {
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Parámetros del sistema</h3>
                    <span class="badge badge-neutral">{{ params().length }} parámetros</span>
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
                            <th class="table-header-cell">Parámetro</th>
                            <th class="table-header-cell">Valor</th>
                            <th class="table-header-cell">Descripción</th>
                            <th class="table-header-cell">Tipo</th>
                            <th class="table-header-cell">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        @for (param of paramsFiltrados(); track param.key) {
                            <tr class="table-row" style="height:48px">
                                <td class="table-cell font-mono" style="font-size:0.875rem">{{ param.key }}</td>
                                <td class="table-cell" style="color:var(--color-text-muted)">
                                    {{ param.value || '(vacío)' }}
                                </td>
                                <td class="table-cell" style="color:var(--color-text-muted);font-size:0.8rem">
                                    {{ param.description || '—' }}
                                </td>
                                <td class="table-cell">
                                    <span [class]="tipoBadgeClass(param.tipo)">{{ param.tipo }}</span>
                                </td>
                                <td class="table-cell">
                                    @if (param.editable) {
                                        <button class="btn-icon btn-icon-edit" title="Editar" (click)="openEdit(param)">✏️</button>
                                    } @else {
                                        <span style="color:var(--color-text-muted)">—</span>
                                    }
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

        @if (editingParam()) {
            <div class="modal-overlay" (click)="closeEdit()">
                <div class="modal-content" style="max-width:480px" (click)="$event.stopPropagation()">
                    <div class="modal-header">
                        <h2 class="modal-title">Editar parámetro</h2>
                        <button class="modal-close-btn" (click)="closeEdit()">✕</button>
                    </div>
                    <div class="modal-body" style="display:flex; flex-direction:column; gap:.875rem">
                        <div>
                            <label class="input-label">Parámetro</label>
                            <code style="display:block; padding:.5rem .75rem; background:var(--color-surface-raised);
                                         border-radius:6px; font-size:.875rem">{{ editingParam()!.key }}</code>
                        </div>
                        @if (editingParam()!.description) {
                            <p style="font-size:.875rem; color:var(--color-text-muted); margin:0">
                                {{ editingParam()!.description }}
                            </p>
                        }
                        <div>
                            <label class="input-label">Valor</label>
                            @if (editingParam()!.tipo === 'boolean') {
                                <select class="input-field" [value]="editValue()"
                                        (change)="onEditChange($event)">
                                    <option value="true">true</option>
                                    <option value="false">false</option>
                                </select>
                            } @else {
                                <input class="input-field"
                                       [type]="editingParam()!.tipo === 'number' ? 'number' :
                                               editingParam()!.tipo === 'email' ? 'email' : 'text'"
                                       [value]="editValue()"
                                       (input)="onEditChange($event)">
                            }
                            @if (editError()) {
                                <p style="color:var(--color-error); font-size:.8rem; margin:.25rem 0 0">{{ editError() }}</p>
                            }
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" (click)="closeEdit()">Cancelar</button>
                        <button class="btn btn-primary" [disabled]="saving()" (click)="saveEdit()">
                            @if (saving()) { Guardando... } @else { Guardar }
                        </button>
                    </div>
                </div>
            </div>
        }
    `
})
export class ConfiguracionComponent implements OnInit {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.users}/api/system/parameters`;

    params        = signal<SystemParameter[]>([]);
    cargando      = signal(false);
    error         = signal<string | null>(null);
    busqueda      = '';

    editingParam  = signal<SystemParameter | null>(null);
    editValue     = signal<string>('');
    editError     = signal<string>('');
    saving        = signal(false);

    paramsFiltrados = computed(() => {
        const q = this.busqueda.toLowerCase();
        if (!q) return this.params();
        return this.params().filter(p =>
            p.key.toLowerCase().includes(q) ||
            p.value.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q)
        );
    });

    ngOnInit() { this.cargar(); }

    cargar() {
        this.cargando.set(true);
        this.error.set(null);
        this.http.get<SystemParameter[]>(this.baseUrl).subscribe({
            next: (data) => {
                this.params.set(data.sort((a, b) => a.key.localeCompare(b.key)));
                this.cargando.set(false);
            },
            error: () => {
                this.error.set('No disponible');
                this.cargando.set(false);
            }
        });
    }

    tipoBadgeClass(tipo: string): string {
        const map: Record<string, string> = {
            number:  'badge badge-accent',
            boolean: 'badge badge-success',
            email:   'badge badge-neutral',
            url:     'badge badge-neutral',
            text:    'badge badge-warning',
        };
        return map[tipo] ?? 'badge badge-neutral';
    }

    openEdit(param: SystemParameter): void {
        this.editingParam.set(param);
        this.editValue.set(param.value);
        this.editError.set('');
    }

    closeEdit(): void {
        this.editingParam.set(null);
        this.editError.set('');
    }

    onEditChange(event: Event): void {
        const target = event.target as HTMLInputElement | HTMLSelectElement;
        this.editValue.set(target.value);
    }

    saveEdit(): void {
        const param = this.editingParam();
        if (!param) return;
        const val = this.editValue().trim();
        if (param.tipo === 'number' && isNaN(Number(val))) {
            this.editError.set('El valor debe ser un número.');
            return;
        }
        if (param.tipo === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
            this.editError.set('El valor debe ser un email válido.');
            return;
        }
        this.saving.set(true);
        this.editError.set('');
        this.http.put<void>(`${this.baseUrl}/${param.key}`, val, {
            headers: { 'Content-Type': 'text/plain' }
        }).subscribe({
            next: () => {
                this.saving.set(false);
                this.closeEdit();
                this.params.update(list =>
                    list.map(p => p.key === param.key ? { ...p, value: val } : p)
                );
            },
            error: () => {
                this.saving.set(false);
                this.editError.set('Error al guardar el parámetro.');
            },
        });
    }
}
