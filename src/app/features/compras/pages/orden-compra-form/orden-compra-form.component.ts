import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrdenCompraService } from '../../services/orden-compra.service';
import { OrdenCompra } from '../../models/orden-compra.model';
import { ProveedorService } from '../../services/proveedor.service';
import { Proveedor, ProveedorPage } from '../../models/proveedor.model';

@Component({
    selector: 'app-orden-compra-form',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    template: `
        <div class="breadcrumb">
            <a routerLink="/admin/compras/ordenes">Órdenes de Compra</a>
            <span class="sep">›</span>
            <span>{{ isEdit() ? 'Editar' : 'Nueva' }} Orden</span>
        </div>

        <div class="page-header">
            <h1 class="page-title">🆕 {{ isEdit() ? 'Editar' : 'Nueva' }} Orden de Compra</h1>
            <div class="page-actions">
                <span class="badge badge-gray text-[13px] px-[14px] py-1.5">{{ codigoOC }}</span>
            </div>
        </div>

        <div class="form-card max-w-[900px]">
            <div class="form-card-title">📋 Encabezado de la OC</div>

            <div class="form-row mb-md">
                <div class="form-group">
                    <label class="form-label">Proveedor *</label>
                    <select class="form-control" [(ngModel)]="orden.proveedorId">
                        <option value="">Seleccionar proveedor...</option>
                        @for (proveedor of proveedores(); track proveedor.id) {
                            <option [value]="proveedor.id">{{ proveedor.razonSocial }} ({{ proveedor.ruc }})</option>
                        }
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Fecha de emisión *</label>
                    <input class="form-control" type="date" [(ngModel)]="orden.fechaEmision">
                </div>
            </div>

            <div class="form-row mb-md">
                <div class="form-group">
                    <label class="form-label">Condición de pago *</label>
                    <select class="form-control" [(ngModel)]="orden.condicionPago">
                        <option value="CONTADO">Contado</option>
                        <option value="CREDITO_15">15 días</option>
                        <option value="CREDITO_30">30 días</option>
                        <option value="CREDITO_60">60 días</option>
                        <option value="CREDITO_90">90 días</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Almacén destino *</label>
                    <select class="form-control" [(ngModel)]="orden.almacenDestino">
                        <option value="ALM1">Principal Lima (ALM1)</option>
                        <option value="ALM2">Secundario Callao (ALM2)</option>
                    </select>
                </div>
            </div>

            <div class="section-divider">Ítems de compra</div>

            <div class="items-table-wrap mb-md">
                <table>
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th class="w-[80px]">Cant.</th>
                            <th class="w-[120px]">P. Unit.</th>
                            <th class="w-[100px]">IGV 18%</th>
                            <th class="w-[120px]">Subtotal</th>
                            <th class="w-[40px]"></th>
                        </tr>
                    </thead>
                    <tbody>
                        @for (item of orden.items; track $index; let i = $index) {
                            <tr>
                                <td>
                                    <input class="form-control" type="text" [(ngModel)]="item.productoNombre" 
                                           placeholder="Nombre del producto" class="border-none p-0 bg-transparent w-full">
                                </td>
                                <td>
                                    <input class="form-control" type="number" [(ngModel)]="item.cantidad" 
                                           (change)="calculateTotals()" class="w-[70px] text-center">
                                </td>
                                <td>
                                    <input class="form-control form-control-mono" type="number" [(ngModel)]="item.precioUnitario" 
                                           (change)="calculateTotals()" class="w-[110px]">
                                </td>
                                <td class="font-mono">{{ calculateItemIgv(item) | currency:'S/' }}</td>
                                <td class="font-mono font-bold">{{ calculateItemSubtotal(item) | currency:'S/' }}</td>
                                <td>
                                    <button class="icon-btn text-error" (click)="removeItem(i)">✕</button>
                                </td>
                            </tr>
                        }
                        <tr class="bg-surface">
                            <td colspan="6">
                                <button class="btn btn-secondary btn-sm border-dashed w-full justify-center"
                                        (click)="addItem()">
                                    ➕ Agregar ítem
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="flex justify-end">
                <div class="totals-box min-w-[300px]">
                    <div class="totals-row subtotal"><span>Base imponible</span><span class="money">{{ subtotal | currency:'S/' }}</span></div>
                    <div class="totals-row subtotal"><span>IGV (18%)</span><span class="money">{{ igv | currency:'S/' }}</span></div>
                    <div class="totals-row grand-total"><span>TOTAL OC</span><span class="money">{{ total | currency:'S/' }}</span></div>
                </div>
            </div>

            <div class="form-group mt-lg">
                <label class="form-label">Observaciones</label>
                <textarea class="form-control" rows="2" [(ngModel)]="orden.observaciones" placeholder="Notas adicionales para el proveedor..."></textarea>
            </div>

            <div class="form-actions">
                <button type="button" class="btn btn-secondary" routerLink="/admin/compras/ordenes">Cancelar</button>
                <button type="button" class="btn btn-secondary" (click)="saveDraft()">💾 Guardar borrador</button>
                <button type="button" class="btn btn-success" (click)="saveAndApprove()">✅ Aprobar OC</button>
            </div>
        </div>
    `,
    styles: [`
        :host { display: block; }
    `]
})
export class OrdenCompraFormComponent implements OnInit {
    private ordenCompraService = inject(OrdenCompraService);
    private proveedorService = inject(ProveedorService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);

    isEdit = signal<boolean>(false);
    proveedores = signal<Proveedor[]>([]);
    codigoOC = 'OC-2026-0043';

    orden: any = {
        proveedorId: '',
        fechaEmision: new Date().toISOString().split('T')[0],
        condicionPago: 'CREDITO_30',
        almacenDestino: 'ALM1',
        observaciones: '',
        items: [{ productoNombre: '', cantidad: 1, precioUnitario: 0 }]
    };

    subtotal = 0;
    igv = 0;
    total = 0;

    ngOnInit(): void {
        this.proveedorService.getProveedores(0, 100).subscribe({
            next: (page: ProveedorPage) => this.proveedores.set(page.content)
        });
    }

    addItem(): void {
        this.orden.items.push({ productoNombre: '', cantidad: 1, precioUnitario: 0 });
    }

    removeItem(index: number): void {
        this.orden.items.splice(index, 1);
        this.calculateTotals();
    }

    calculateItemIgv(item: any): number {
        return item.cantidad * item.precioUnitario * 0.18;
    }

    calculateItemSubtotal(item: any): number {
        return item.cantidad * item.precioUnitario * 1.18;
    }

    calculateTotals(): void {
        this.subtotal = this.orden.items.reduce((sum: number, item: any) =>
            sum + (item.cantidad * item.precioUnitario), 0);
        this.igv = this.subtotal * 0.18;
        this.total = this.subtotal + this.igv;
    }

    saveDraft(): void {
        this.calculateTotals();
        this.orden.estado = 'BORRADOR';
        this.ordenCompraService.createOrden(this.orden).subscribe({
            next: () => this.router.navigate(['/admin/compras/ordenes'])
        });
    }

    saveAndApprove(): void {
        this.calculateTotals();
        this.orden.estado = 'PENDIENTE';
        this.ordenCompraService.createOrden(this.orden).subscribe({
            next: (oc) => {
                this.ordenCompraService.aprobarOrden(oc.id!).subscribe({
                    next: () => this.router.navigate(['/admin/compras/ordenes'])
                });
            }
        });
    }
}
