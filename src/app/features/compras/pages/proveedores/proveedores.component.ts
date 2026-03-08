import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProveedorService } from '../../services/proveedor.service';
import { Proveedor, ProveedorPage } from '../../models/proveedor.model';

@Component({
    selector: 'app-proveedores',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    template: `
        <div class="page-header">
            <div>
                <h1 class="page-title">🏭 Proveedores</h1>
                <p class="page-subtitle">{{ totalProveedores() }} proveedores registrados</p>
            </div>
            <div class="page-actions">
                <a routerLink="/admin/compras/proveedores/nuevo" class="btn btn-primary">+ Nuevo Proveedor</a>
            </div>
        </div>

        <div class="table-container">
            <div class="table-toolbar">
                <div class="table-filters">
                    <div class="search-input min-w-[300px]">
                        <span>🔍</span>
                        <input type="text" placeholder="Buscar RUC, razón social..." 
                               [(ngModel)]="searchTerm" (input)="onSearch()">
                    </div>
                    <select class="select-filter" [(ngModel)]="filterEstado" (change)="onFilterChange()">
                        <option value="">Estado SUNAT ▼</option>
                        <option value="HABIDO">HABIDO</option>
                        <option value="NO HABIDO">NO HABIDO</option>
                    </select>
                </div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>RUC</th>
                        <th>Razón Social</th>
                        <th>Condición SUNAT</th>
                        <th>Estado</th>
                        <th>Contacto</th>
                        <th>Última OC</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    @for (proveedor of proveedores(); track proveedor.id) {
                        <tr>
                            <td class="font-mono">{{ proveedor.ruc }}</td>
                            <td><strong>{{ proveedor.razonSocial }}</strong></td>
                            <td>
                                <span class="badge" 
                                      [class.badge-success]="proveedor.condicionSunat === 'HABIDO'"
                                      [class.badge-warning]="proveedor.condicionSunat === 'NO HABIDO'">
                                    {{ proveedor.condicionSunat }}
                                </span>
                            </td>
                            <td>
                                <span class="badge"
                                      [class.badge-success]="proveedor.estado === 'ACTIVO'"
                                      [class.badge-warning]="proveedor.estado !== 'ACTIVO'">
                                    {{ proveedor.estado }}
                                </span>
                            </td>
                            <td>{{ proveedor.contactoEmail || '—' }}</td>
                            <td class="text-muted">—</td>
                            <td>
                                <div class="actions-cell">
                                    <button class="icon-btn">👁</button>
                                    <a [routerLink]="['/admin/compras/proveedores', proveedor.id]" class="icon-btn">✏️</a>
                                    <button class="icon-btn" (click)="deleteProveedor(proveedor.id!)">🗑️</button>
                                </div>
                            </td>
                        </tr>
                    }
                    @empty {
                        <tr>
                            <td colspan="7" class="text-center text-muted">No se encontraron proveedores</td>
                        </tr>
                    }
                </tbody>
            </table>
            <div class="table-footer">
                <span>{{ totalProveedores() }} proveedores</span>
                <div class="pagination">
                    <button class="page-btn" [class.active]="page() === 0" (click)="goToPage(0)">1</button>
                    <button class="page-btn" (click)="goToPage(page() + 1)">2</button>
                </div>
            </div>
        </div>
    `,
    styles: [`
        :host { display: block; }
    `]
})
export class ProveedoresComponent implements OnInit {
    private proveedorService = inject(ProveedorService);

    proveedores = signal<Proveedor[]>([]);
    totalProveedores = signal<number>(0);
    page = signal<number>(0);
    searchTerm = '';
    filterEstado = '';

    ngOnInit(): void {
        this.loadProveedores();
    }

    loadProveedores(): void {
        this.proveedorService.getProveedores(this.page(), 20, this.filterEstado || undefined).subscribe({
            next: (response: ProveedorPage) => {
                this.proveedores.set(response.content);
                this.totalProveedores.set(response.totalElements);
            }
        });
    }

    onSearch(): void {
        this.page.set(0);
        this.loadProveedores();
    }

    onFilterChange(): void {
        this.page.set(0);
        this.loadProveedores();
    }

    goToPage(pageNum: number): void {
        this.page.set(pageNum);
        this.loadProveedores();
    }

    deleteProveedor(id: string): void {
        if (confirm('¿Está seguro de eliminar este proveedor?')) {
            this.proveedorService.deleteProveedor(id).subscribe({
                next: () => this.loadProveedores()
            });
        }
    }
}
