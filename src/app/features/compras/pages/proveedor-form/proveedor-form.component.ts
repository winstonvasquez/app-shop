import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProveedorService } from '../../services/proveedor.service';
import { Proveedor } from '../../models/proveedor.model';

@Component({
    selector: 'app-proveedor-form',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    template: `
        <div class="breadcrumb">
            <a routerLink="/admin/compras/proveedores">Proveedores</a>
            <span class="sep">›</span>
            <span>{{ isEdit() ? 'Editar' : 'Nuevo' }} Proveedor</span>
        </div>

        <div class="page-header">
            <h1 class="page-title">🏭 {{ isEdit() ? 'Editar' : 'Nuevo' }} Proveedor</h1>
        </div>

        <div class="form-card">
            <div class="form-card-title">📋 Datos del Proveedor</div>

            <div class="form-group mb-md">
                <label class="form-label">RUC *</label>
                <div class="flex gap-[var(--space-sm)]">
                    <input class="form-control form-control-mono" type="text" 
                           placeholder="20XXXXXXXXX" maxlength="11" 
                           [(ngModel)]="proveedor.ruc" class="max-w-[200px]"
                           [disabled]="isEdit()">
                    <button type="button" class="btn btn-outline-primary" (click)="validarSUNAT()">🔍 Validar SUNAT</button>
                </div>
            </div>

            @if (sunatData()) {
                <div class="info-box mb-md">
                    <div class="text-xs font-semibold text-success mb-[var(--space-sm)]">
                        ✅ Datos verificados en SUNAT
                    </div>
                    <div class="info-row">
                        <span class="lbl">Razón Social:</span>
                        <span class="val">{{ sunatData()?.razonSocial }}</span>
                    </div>
                    <div class="info-row mt-md">
                        <span class="lbl">Condición:</span><span class="val">{{ sunatData()?.condicion }}</span>
                        <span class="lbl ml-[var(--space-lg)]">Estado:</span>
                        <span class="val text-success">{{ sunatData()?.estado }}</span>
                    </div>
                    <div class="info-row mt-md">
                        <span class="lbl">Domicilio Fiscal:</span>
                        <span class="val">{{ sunatData()?.domicilio }}</span>
                    </div>
                </div>
            }

            <div class="form-group mb-md">
                <label class="form-label">Razón Social *</label>
                <input class="form-control" type="text" [(ngModel)]="proveedor.razonSocial" placeholder="Razón social">
            </div>

            <div class="form-group mb-md">
                <label class="form-label">Nombre Comercial</label>
                <input class="form-control" type="text" [(ngModel)]="proveedor.nombreComercial" placeholder="Nombre comercial">
            </div>

            <div class="section-divider">Datos de contacto</div>

            <div class="form-row mb-md">
                <div class="form-group">
                    <label class="form-label">Nombre de contacto</label>
                    <input class="form-control" type="text" [(ngModel)]="proveedor.contactoNombre" placeholder="Nombre completo">
                </div>
                <div class="form-group">
                    <label class="form-label">Teléfono</label>
                    <input class="form-control" type="tel" [(ngModel)]="proveedor.contactoTelefono" placeholder="01-234-5678">
                </div>
            </div>
            <div class="form-group mb-md">
                <label class="form-label">Email</label>
                <input class="form-control" type="email" [(ngModel)]="proveedor.contactoEmail" placeholder="contacto@proveedor.com">
            </div>

            <div class="section-divider">Datos financieros</div>

            <div class="form-row mb-md">
                <div class="form-group">
                    <label class="form-label">Banco</label>
                    <select class="form-control" [(ngModel)]="proveedor.banco">
                        <option value="">Seleccionar...</option>
                        <option value="BCP">BCP — Banco de Crédito</option>
                        <option value="BBVA">BBVA Continental</option>
                        <option value="Interbank">Interbank</option>
                        <option value="Scotiabank">Scotiabank</option>
                        <option value="BanBif">BanBif</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Nro. Cuenta / CCI</label>
                    <input class="form-control form-control-mono" type="text" [(ngModel)]="proveedor.cuentaBanco" placeholder="002-XXXXXXXXXXXX">
                </div>
            </div>

            <div class="form-row mb-md">
                <div class="form-group">
                    <label class="form-label">Condición de pago</label>
                    <select class="form-control" [(ngModel)]="proveedor.condicionPago">
                        <option value="CONTADO">Contado</option>
                        <option value="CREDITO_15">Crédito 15 días</option>
                        <option value="CREDITO_30">Crédito 30 días</option>
                        <option value="CREDITO_60">Crédito 60 días</option>
                        <option value="CREDITO_90">Crédito 90 días</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Moneda preferida</label>
                    <select class="form-control" [(ngModel)]="proveedor.monedaPreferida">
                        <option value="PEN">Soles (PEN)</option>
                        <option value="USD">Dólares (USD)</option>
                    </select>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn btn-secondary" routerLink="/admin/compras/proveedores">Cancelar</button>
                <button type="button" class="btn btn-primary" (click)="save()">💾 Guardar Proveedor</button>
            </div>
        </div>
    `,
    styles: [`
        :host { display: block; }
    `]
})
export class ProveedorFormComponent implements OnInit {
    private proveedorService = inject(ProveedorService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);

    proveedor: Proveedor = this.getEmptyProveedor();
    isEdit = signal<boolean>(false);
    sunatData = signal<any>(null);

    getEmptyProveedor(): Proveedor {
        return {
            ruc: '',
            razonSocial: '',
            nombreComercial: '',
            condicionSunat: 'HABIDO',
            estadoSunat: 'ACTIVO',
            condicionPago: 'CONTADO',
            monedaPreferida: 'PEN',
            estado: 'ACTIVO'
        };
    }

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.isEdit.set(true);
            this.proveedorService.getProveedorById(id).subscribe({
                next: (proveedor) => this.proveedor = proveedor
            });
        }
    }

    validarSUNAT(): void {
        if (this.proveedor.ruc?.length === 11) {
            this.sunatData.set({
                razonSocial: this.proveedor.razonSocial || 'DISTRIBUIDORA LIMA S.A.C.',
                condicion: 'HABIDO',
                estado: 'ACTIVO',
                domicilio: 'Av. Colonial 1234, Lima, Lima'
            });
        }
    }

    save(): void {
        if (this.isEdit()) {
            this.proveedorService.updateProveedor(this.proveedor.id!, this.proveedor).subscribe({
                next: () => this.router.navigate(['/admin/compras/proveedores'])
            });
        } else {
            this.proveedorService.createProveedor(this.proveedor).subscribe({
                next: () => this.router.navigate(['/admin/compras/proveedores'])
            });
        }
    }
}
