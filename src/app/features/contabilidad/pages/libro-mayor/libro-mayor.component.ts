import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AsientoService } from '../../services/asiento.service';

@Component({
    selector: 'app-libro-mayor',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="page-header">
            <div>
                <h1 class="page-title">📔 Libro Mayor</h1>
                <p class="page-subtitle">Saldos por cuenta PCGE</p>
            </div>
            <div class="page-actions">
                <button class="btn btn-secondary">📥 Generar PLE</button>
            </div>
        </div>

        <div class="card mb-lg">
            <div class="flex flex-wrap items-end gap-[var(--space-md)]">
                <div class="form-group min-w-[300px] m-0">
                    <label class="form-label">Cuenta PCGE</label>
                    <select class="form-control">
                        <option>70.1 — Ventas de mercaderías</option>
                        <option>10.1 — Caja y bancos</option>
                        <option>20.1 — Mercaderías</option>
                        <option>40.1 — IGV por pagar</option>
                    </select>
                </div>
                <div class="form-group m-0">
                    <label class="form-label">Período</label>
                    <select class="form-control"><option>Marzo 2026</option></select>
                </div>
                <button class="btn btn-primary">🔍 Ver Mayor</button>
            </div>
        </div>

        <div class="card">
            <p>Seleccione una cuenta para ver el mayor</p>
        </div>
    `
})
export class LibroMayorComponent implements OnInit {
    private asientoService = inject(AsientoService);
    ngOnInit() { }
}
