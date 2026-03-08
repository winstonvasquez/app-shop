import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-libro-diario',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="page-header">
            <div>
                <h1 class="page-title">📓 Libro Diario</h1>
                <p class="page-subtitle">Asientos contables PCGE</p>
            </div>
            <div class="page-actions">
                <button class="btn btn-secondary">📥 Generar PLE</button>
                <button class="btn btn-primary">+ Asiento Manual</button>
            </div>
        </div>
        
        <div class="card">
            <p>Libro Diario - Cargar datos desde API</p>
        </div>
    `
})
export class LibroDiarioComponent implements OnInit {
    ngOnInit() {}
}
