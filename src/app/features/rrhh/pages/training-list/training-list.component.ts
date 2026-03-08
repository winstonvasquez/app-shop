import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-training-list',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="training-container">
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Capacitaciones</h2>
                </div>
                <div class="card-content">
                    <p>Módulo de capacitaciones en desarrollo.</p>
                    <p>Funcionalidades planificadas:</p>
                    <ul>
                        <li>Crear cursos de capacitación</li>
                        <li>Inscribir participantes</li>
                        <li>Registrar asistencia y notas</li>
                        <li>Emitir certificados</li>
                    </ul>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .training-container {
            padding: 24px;
        }
    `]
})
export class TrainingListComponent {}
