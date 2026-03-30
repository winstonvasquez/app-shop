import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-movimientos-inventario',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink],
    template: `
        <div class="page-container">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Movimientos de Inventario</h1>
                    <p class="page-subtitle">Entradas, salidas y ajustes de stock</p>
                </div>
            </div>
            <div class="card">
                <div class="card-body" style="text-align:center;padding:var(--space-xl)">
                    <div style="width:48px;height:4px;background:var(--color-primary);border-radius:2px;margin:0 auto var(--space-md)"></div>
                    <p style="font-size:1.125rem;font-weight:600;margin-bottom:var(--space-sm)">Movimientos de Inventario</p>
                    <p style="color:var(--color-text-muted);margin-bottom:var(--space-lg)">
                        El registro de entradas, salidas y ajustes de inventario está disponible en el módulo de Inventario.
                    </p>
                    <a routerLink="/admin/inventario/movimientos" class="btn btn-primary">Ir a Movimientos de Inventario</a>
                </div>
            </div>
        </div>
    `
})
export class MovimientosInventarioComponent {}
