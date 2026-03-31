import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InventoryApiService } from '../../services/inventory-api.service';
import { Location, Warehouse } from '../../models/inventory.models';

@Component({
    selector: 'app-location-management',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="space-y-6">
            <header>
                <h1 class="text-2xl font-bold text-on">Ubicaciones</h1>
                <p class="text-sm text-subtle">Organiza ubicaciones físicas dentro de cada almacén.</p>
            </header>

            <div class="rounded-xl border border-border-subtle bg-surface p-5 shadow-sm space-y-4">
                <div>
                    <label class="text-xs font-semibold uppercase text-subtle">Almacén</label>
                    <select class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" (change)="onWarehouseSelectChange($event)">
                        <option value="">Selecciona un almacén</option>
                        @for (warehouse of warehouses(); track warehouse.id) {
                            <option [value]="warehouse.id">{{ warehouse.name }}</option>
                        }
                    </select>
                </div>

                <form class="grid gap-4 md:grid-cols-2" [formGroup]="locationForm" (ngSubmit)="onSubmit()">
                    <div>
                        <label class="text-xs font-semibold uppercase text-subtle">Código</label>
                        <input class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" formControlName="code" placeholder="UBI-001">
                    </div>
                    <div>
                        <label class="text-xs font-semibold uppercase text-subtle">Nombre</label>
                        <input class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" formControlName="name" placeholder="Zona A">
                    </div>
                    <div>
                        <label class="text-xs font-semibold uppercase text-subtle">Descripción</label>
                        <input class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" formControlName="description" placeholder="Opcional">
                    </div>
                    <div class="flex items-center gap-2">
                        <input type="checkbox" class="h-4 w-4" formControlName="active">
                        <span class="text-sm text-muted">Activo</span>
                    </div>
                    <div class="flex items-center justify-end md:col-span-2">
                        <button type="submit" class="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90" [disabled]="locationForm.invalid || submitting() || !selectedWarehouseId()">
                            {{ submitting() ? 'Guardando...' : 'Crear ubicación' }}
                        </button>
                    </div>
                </form>
            </div>

            @if (error()) {
                <div class="rounded-lg border border-red-200 bg-error/10 p-4 text-sm text-error-hover">{{ error() }}</div>
            }

            <div class="rounded-xl border border-border-subtle bg-surface p-5 shadow-sm">
                <div class="flex items-center justify-between">
                    <h2 class="text-sm font-semibold text-on">Ubicaciones registradas</h2>
                    <span class="text-xs text-subtle">{{ locations().length }} ubicaciones</span>
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
                            @for (location of locations(); track location.id) {
                                <tr>
                                    <td class="py-3 font-medium text-on">{{ location.code }}</td>
                                    <td class="py-3 text-muted">{{ location.name || '-' }}</td>
                                    <td class="py-3">
                                        <span class="rounded-full px-2 py-1 text-xs" [class.bg-success/10]="location.active" [class.text-success-hover]="location.active" [class.bg-surface-sunken]="!location.active" [class.text-subtle]="!location.active">
                                            {{ location.active ? 'Activo' : 'Inactivo' }}
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
export class LocationManagementComponent {
    private readonly api = inject(InventoryApiService);
    private readonly fb = inject(FormBuilder);

    warehouses = signal<Warehouse[]>([]);
    locations = signal<Location[]>([]);
    selectedWarehouseId = signal<number | null>(null);
    submitting = signal(false);
    error = signal<string | null>(null);

    locationForm = this.fb.nonNullable.group({
        code: ['', [Validators.required, Validators.maxLength(20)]],
        name: ['', [Validators.required, Validators.maxLength(200)]],
        description: [''],
        active: true
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

    onWarehouseChange(warehouseId: string): void {
        this.selectedWarehouseId.set(warehouseId ? Number(warehouseId) : null);
        this.loadLocations();
    }

    onWarehouseSelectChange(event: Event): void {
        const value = (event.target as HTMLSelectElement).value;
        this.onWarehouseChange(value);
    }

    loadLocations(): void {
        const warehouseId = this.selectedWarehouseId();
        if (warehouseId) {
            this.api.getLocationsByWarehouse(warehouseId).subscribe({
                next: (response) => this.locations.set(response),
                error: (err: Error) => this.error.set(err.message)
            });
        } else {
            this.locations.set([]);
        }
    }

    onSubmit(): void {
        if (!this.selectedWarehouseId()) {
            return;
        }

        if (this.locationForm.invalid) {
            this.locationForm.markAllAsTouched();
            return;
        }

        this.submitting.set(true);
        this.error.set(null);
        const payload = {
            warehouseId: this.selectedWarehouseId() ?? 0,
            code: this.locationForm.value.code ?? '',
            name: this.locationForm.value.name ?? '',
            description: this.locationForm.value.description ?? '',
            active: this.locationForm.value.active ?? true
        };

        this.api.createLocation(payload).subscribe({
            next: () => {
                this.submitting.set(false);
                this.locationForm.reset({ active: true });
                this.onWarehouseChange(String(this.selectedWarehouseId()));
            },
            error: (err: Error) => {
                this.submitting.set(false);
                this.error.set(err.message);
            }
        });
    }
}
