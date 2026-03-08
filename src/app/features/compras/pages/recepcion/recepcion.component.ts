import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RecepcionService, Recepcion, RecepcionPage } from '../../services/recepcion.service';

@Component({
    selector: 'app-recepcion',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
        <div class="page-header">
            <div>
                <h1 class="page-title">📥 Recepción de Mercadería</h1>
                <p class="page-subtitle">Recepciones registradas</p>
            </div>
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Recepción</th>
                        <th>OC Referencia</th>
                        <th>Fecha</th>
                        <th>Proveedor</th>
                        <th>Guía</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    @for (recepcion of recepciones(); track recepcion.id) {
                        <tr>
                            <td class="font-mono">REC-{{ recepcion.id?.slice(0,8) }}</td>
                            <td class="font-mono">{{ recepcion.ordenCompraCodigo || '—' }}</td>
                            <td class="text-muted">{{ recepcion.fechaRecepcion | date:'dd/MM/yyyy' }}</td>
                            <td>—</td>
                            <td>{{ recepcion.numeroGuia || '—' }}</td>
                            <td>
                                <span class="badge"
                                      [class.badge-warning]="recepcion.estado === 'PENDIENTE'"
                                      [class.badge-success]="recepcion.estado === 'CONFORME'"
                                      [class.badge-danger]="recepcion.estado === 'DIFERENCIA'">
                                    {{ recepcion.estado }}
                                </span>
                            </td>
                            <td>
                                <div class="actions-cell">
                                    <button class="icon-btn">👁</button>
                                    @if (recepcion.estado === 'PENDIENTE') {
                                        <button class="icon-btn" (click)="confirmarRecepcion(recepcion.id!)">✅</button>
                                    }
                                </div>
                            </td>
                        </tr>
                    }
                    @empty {
                        <tr>
                            <td colspan="7" class="text-center text-muted">No hay recepciones registradas</td>
                        </tr>
                    }
                </tbody>
            </table>
        </div>
    `,
    styles: [`
        :host { display: block; }
    `]
})
export class RecepcionComponent implements OnInit {
    private recepcionService = inject(RecepcionService);

    recepciones = signal<Recepcion[]>([]);

    ngOnInit(): void {
        this.loadRecepciones();
    }

    loadRecepciones(): void {
        this.recepcionService.getRecepciones(0, 20).subscribe({
            next: (response: RecepcionPage) => {
                this.recepciones.set(response.content);
            }
        });
    }

    confirmarRecepcion(id: string): void {
        if (confirm('¿Confirmar la recepción de mercadería?')) {
            this.recepcionService.confirmarRecepcion(id).subscribe({
                next: () => this.loadRecepciones()
            });
        }
    }
}
