import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-stock-inventario',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink],
    template: `
        <div class="page-container">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Stock de Inventario</h1>
                    <p class="page-subtitle">Consulta de existencias por almacén</p>
                </div>
            </div>
            <div class="card">
                <div class="card-body" style="text-align:center;padding:var(--space-xl)">
                    <div style="width:48px;height:4px;background:var(--color-primary);border-radius:2px;margin:0 auto var(--space-md)"></div>
                    <p style="font-size:1.125rem;font-weight:600;margin-bottom:var(--space-sm)">Stock por Almacén</p>
                    <p style="color:var(--color-text-muted);margin-bottom:var(--space-lg)">
                        La consulta de stock y existencias por almacén está disponible en el módulo de Inventario.
                    </p>
                    <a routerLink="/admin/inventario/stock" class="btn btn-primary">Ir a Stock por Almacén</a>
                </div>
            </div>
        </div>
    `
})
export class StockInventarioComponent {}
