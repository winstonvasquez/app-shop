import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-evaluation-list',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="evaluation-container">
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Evaluaciones de Desempeño</h2>
                </div>
                <div class="card-content">
                    <p>Módulo de evaluaciones en desarrollo.</p>
                    <p>Funcionalidades planificadas:</p>
                    <ul>
                        <li>Crear evaluaciones de desempeño</li>
                        <li>Asignar evaluadores</li>
                        <li>Registrar puntajes y comentarios</li>
                        <li>Historial de evaluaciones por empleado</li>
                    </ul>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .evaluation-container {
            padding: 24px;
        }
    `]
})
export class EvaluationListComponent {}
