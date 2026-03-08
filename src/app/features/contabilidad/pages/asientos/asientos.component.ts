import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AsientoService } from '../../services/asiento.service';
import { Asiento } from '../../models/asiento.model';

@Component({
    selector: 'app-asientos',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="page-header">
            <div>
                <h1 class="page-title">📋 Asientos Contables</h1>
                <p class="page-subtitle">Gestión de asientos del período</p>
            </div>
            <div class="page-actions">
                <button class="btn btn-primary">+ Nuevo Asiento</button>
            </div>
        </div>

        <div class="card">
            <div class="table-toolbar">
                <div class="table-filters">
                    <div class="search-input min-w-[240px]">
                        <span>🔍</span><input type="text" placeholder="Buscar asiento...">
                    </div>
                    <select class="select-filter">
                        <option>Tipo ▼</option>
                        <option>Manual</option>
                        <option>Automático</option>
                    </select>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Fecha</th>
                        <th>Glosa</th>
                        <th>Tipo</th>
                        <th>Origen</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="font-mono font-bold">ASI-2026-00001</td>
                        <td>01/03/2026</td>
                        <td>Venta al contado</td>
                        <td>Automático</td>
                        <td>VENTA</td>
                        <td><span class="badge badge-success">Definitivo</span></td>
                        <td>
                            <button class="icon-btn btn-sm">👁</button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    `
})
export class AsientosComponent implements OnInit {
    private asientoService = inject(AsientoService);

    asientos = signal<Asiento[]>([]);

    ngOnInit() {
        this.cargarAsientos();
    }

    private cargarAsientos() {
        // TODO: Implementar carga desde API
    }
}
