import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InventoryApiService } from '../../services/inventory-api.service';
import { Warehouse } from '../../models/inventory.models';

@Component({
    selector: 'app-warehouse-management',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="space-y-6">
            <header>
                <h1 class="text-2xl font-bold text-on">Almacenes</h1>
                <p class="text-sm text-subtle">Gestiona almacenes y su disponibilidad.</p>
            </header>

            <form class="grid gap-4 rounded-xl border border-border-subtle bg-surface p-5 shadow-sm md:grid-cols-2" [formGroup]="warehouseForm" (ngSubmit)="onSubmit()">
                <div>
                    <label class="text-xs font-semibold uppercase text-subtle">Código</label>
                    <input class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" formControlName="code" placeholder="ALM-001">
                </div>
                <div>
                    <label class="text-xs font-semibold uppercase text-subtle">Nombre</label>
                    <input class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" formControlName="name" placeholder="Almacén Principal">
                </div>
                <div class="md:col-span-2">
                    <label class="text-xs font-semibold uppercase text-subtle">Descripción</label>
                    <input class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" formControlName="description" placeholder="Opcional">
                </div>
                <div>
                    <label class="text-xs font-semibold uppercase text-subtle">Dirección</label>
                    <input class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" formControlName="address" placeholder="Av. Principal 123">
                </div>
                <div>
                    <label class="text-xs font-semibold uppercase text-subtle">Ciudad</label>
                    <input class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" formControlName="city" placeholder="Lima">
                </div>
                <div>
                    <label class="text-xs font-semibold uppercase text-subtle">País</label>
                    <input class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" formControlName="country" placeholder="Perú">
                </div>
                <div>
                    <label class="text-xs font-semibold uppercase text-subtle">Teléfono</label>
                    <input class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" formControlName="phone" placeholder="+51 999 999 999">
                </div>
                <div>
                    <label class="text-xs font-semibold uppercase text-subtle">Responsable</label>
                    <input class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" formControlName="responsiblePerson" placeholder="Nombre completo">
                </div>
                <div class="flex items-center gap-2">
                    <input type="checkbox" class="h-4 w-4" formControlName="active">
                    <span class="text-sm text-muted">Activo</span>
                </div>
                <div class="flex items-center gap-2">
                    <input type="checkbox" class="h-4 w-4" formControlName="isPrincipal">
                    <span class="text-sm text-muted">Principal</span>
                </div>
                <div class="flex items-center justify-end md:col-span-2">
                    <button type="submit" class="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90" [disabled]="warehouseForm.invalid || submitting()">
                        {{ submitting() ? 'Guardando...' : 'Crear almacén' }}
                    </button>
                </div>
            </form>

            @if (error()) {
                <div class="rounded-lg border border-red-200 bg-error/10 p-4 text-sm text-error-hover">{{ error() }}</div>
            }

            <div class="rounded-xl border border-border-subtle bg-surface p-5 shadow-sm">
                <div class="flex items-center justify-between">
                    <h2 class="text-sm font-semibold text-on">Listado</h2>
                    <span class="text-xs text-subtle">{{ warehouses().length }} almacenes</span>
                </div>
                <div class="mt-4 overflow-x-auto">
                    <table class="min-w-full text-sm">
                        <thead class="text-left text-xs uppercase text-gray-400">
                            <tr>
                                <th class="py-2">Código</th>
                                <th class="py-2">Nombre</th>
                                <th class="py-2">Estado</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-border-subtle">
                            @for (warehouse of warehouses(); track warehouse.id) {
                                <tr>
                                    <td class="py-3 font-medium text-on">{{ warehouse.code }}</td>
                                    <td class="py-3 text-muted">{{ warehouse.name }}</td>
                                    <td class="py-3">
                                        <span class="rounded-full px-2 py-1 text-xs" [class.bg-success/10]="warehouse.active" [class.text-success-hover]="warehouse.active" [class.bg-surface-sunken]="!warehouse.active" [class.text-subtle]="!warehouse.active">
                                            {{ warehouse.active ? 'Activo' : 'Inactivo' }}
                                        </span>
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    `
})
export class WarehouseManagementComponent {
    private readonly api = inject(InventoryApiService);
    private readonly fb = inject(FormBuilder);

    warehouses = signal<Warehouse[]>([]);
    submitting = signal(false);
    error = signal<string | null>(null);

    warehouseForm = this.fb.nonNullable.group({
        code: ['', [Validators.required, Validators.maxLength(20)]],
        name: ['', [Validators.required, Validators.maxLength(200)]],
        description: [''],
        address: [''],
        city: [''],
        country: [''],
        phone: [''],
        responsiblePerson: [''],
        active: true,
        isPrincipal: false
    });

    constructor() {
        this.loadWarehouses();
    }

    loadWarehouses(): void {
        this.api.getWarehouses().subscribe({
            next: (response) => this.warehouses.set(response),
            error: (err: Error) => this.error.set(err.message)
        });
    }

    onSubmit(): void {
        if (this.warehouseForm.invalid) {
            this.warehouseForm.markAllAsTouched();
            return;
        }

        this.submitting.set(true);
        this.error.set(null);
        const payload = {
            code: this.warehouseForm.value.code ?? '',
            name: this.warehouseForm.value.name ?? '',
            description: this.warehouseForm.value.description ?? '',
            address: this.warehouseForm.value.address ?? '',
            city: this.warehouseForm.value.city ?? '',
            country: this.warehouseForm.value.country ?? '',
            phone: this.warehouseForm.value.phone ?? '',
            responsiblePerson: this.warehouseForm.value.responsiblePerson ?? '',
            active: this.warehouseForm.value.active ?? true,
            isPrincipal: this.warehouseForm.value.isPrincipal ?? false
        };

        this.api.createWarehouse(payload).subscribe({
            next: () => {
                this.submitting.set(false);
                this.warehouseForm.reset({ active: true, isPrincipal: false });
                this.loadWarehouses();
            },
            error: (err: Error) => {
                this.submitting.set(false);
                this.error.set(err.message);
            }
        });
    }
}
