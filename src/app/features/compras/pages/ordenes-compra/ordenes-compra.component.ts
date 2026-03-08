import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrdenCompraService } from '../../services/orden-compra.service';
import { OrdenCompra, OrdenCompraPage } from '../../models/orden-compra.model';

@Component({
    selector: 'app-ordenes-compra',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    template: `
        <div class="page-header">
            <div>
                <h1 class="page-title">📋 Órdenes de Compra</h1>
                <p class="page-subtitle">{{ totalOrdenes() }} órdenes este mes</p>
            </div>
            <div class="page-actions">
                <button class="btn btn-secondary">📥 Exportar</button>
                <a routerLink="/admin/compras/ordenes/nueva" class="btn btn-primary">+ Nueva OC</a>
            </div>
        </div>

        <div class="table-container">
            <div class="table-toolbar">
                <div class="table-filters">
                    <div class="search-input min-w-[240px]">
                        <span>🔍</span>
                        <input type="text" placeholder="Buscar OC, proveedor..." [(ngModel)]="searchTerm">
                    </div>
                    <select class="select-filter" [(ngModel)]="filterEstado" (change)="onFilterChange()">
                        <option value="">Estado ▼</option>
                        <option value="BORRADOR">BORRADOR</option>
                        <option value="PENDIENTE">PENDIENTE</option>
                        <option value="APROBADA">APROBADA</option>
                        <option value="ENVIADA">ENVIADA</option>
                        <option value="RECIBIDA">RECIBIDA</option>
                        <option value="CANCELADA">CANCELADA</option>
                    </select>
                </div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>OC #</th>
                        <th>Fecha</th>
                        <th>Proveedor</th>
                        <th>Condición Pago</th>
                        <th>Total</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    @for (oc of ordenes(); track oc.id) {
                        <tr>
                            <td class="font-mono">{{ oc.codigo }}</td>
                            <td class="text-muted">{{ oc.fechaEmision | date:'dd/MM/yyyy' }}</td>
                            <td>{{ oc.proveedorNombre }}</td>
                            <td>{{ oc.condicionPago }}</td>
                            <td class="money">{{ oc.total | currency:'S/' }}</td>
                            <td>
                                <span class="badge" 
                                      [class.badge-primary]="oc.estado === 'APROBADA'"
                                      [class.badge-warning]="oc.estado === 'PENDIENTE'"
                                      [class.badge-success]="oc.estado === 'RECIBIDA'"
                                      [class.badge-info]="oc.estado === 'ENVIADA'"
                                      [class.badge-gray]="oc.estado === 'BORRADOR'"
                                      [class.badge-danger]="oc.estado === 'CANCELADA'">
                                    {{ oc.estado }}
                                </span>
                            </td>
                            <td>
                                <div class="actions-cell">
                                    <button class="icon-btn">👁</button>
                                    <a [routerLink]="['/admin/compras/ordenes', oc.id]" class="icon-btn">✏️</a>
                                    @if (oc.estado === 'APROBADA') {
                                        <a routerLink="/admin/compras/recepcion" class="icon-btn">📥</a>
                                    }
                                </div>
                            </td>
                        </tr>
                    }
                    @empty {
                        <tr>
                            <td colspan="7" class="text-center text-muted">No se encontraron órdenes de compra</td>
                        </tr>
                    }
                </tbody>
            </table>
            <div class="table-footer">
                <span>Mostrando 1–{{ ordenes().length }} de {{ totalOrdenes() }} órdenes</span>
                <div class="pagination">
                    <button class="page-btn" [class.active]="page() === 0" (click)="goToPage(0)">1</button>
                    <button class="page-btn" (click)="goToPage(page() + 1)">→</button>
                </div>
            </div>
        </div>
    `,
    styles: [`
        :host { display: block; }
    `]
})
export class OrdenesCompraComponent implements OnInit {
    private ordenCompraService = inject(OrdenCompraService);

    ordenes = signal<OrdenCompra[]>([]);
    totalOrdenes = signal<number>(0);
    page = signal<number>(0);
    searchTerm = '';
    filterEstado = '';

    ngOnInit(): void {
        this.loadOrdenes();
    }

    loadOrdenes(): void {
        this.ordenCompraService.getOrdenes(this.page(), 20, this.filterEstado || undefined).subscribe({
            next: (response: OrdenCompraPage) => {
                this.ordenes.set(response.content);
                this.totalOrdenes.set(response.totalElements);
            }
        });
    }

    onFilterChange(): void {
        this.page.set(0);
        this.loadOrdenes();
    }

    goToPage(pageNum: number): void {
        this.page.set(pageNum);
        this.loadOrdenes();
    }
}
