import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { OrdenCompraService } from '../../services/orden-compra.service';
import { ProveedorService } from '../../services/proveedor.service';
import { OrdenCompra, OrdenCompraItem } from '../../models/orden-compra.model';
import { Proveedor } from '../../models/proveedor.model';
import { DataTableComponent, TableColumn, TableAction, SortEvent } from '@shared/ui/tables/data-table/data-table.component';
import { PaginationComponent, PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { LoadingSpinnerComponent } from '@shared/ui/feedback/loading-spinner/loading-spinner.component';
import { ButtonComponent } from '@shared/components';

export interface OcItemForm {
    productoNombre: string;
    sku: string;
    cantidad: number;
    precioUnitario: number;
}

@Component({
    selector: 'app-ordenes-compra',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    ReactiveFormsModule,
    DataTableComponent,
    PaginationComponent,
    DrawerComponent,
    DateInputComponent,
    PageHeaderComponent,
    AlertComponent,
    LoadingSpinnerComponent,
    DatePipe,
    ButtonComponent
  ],
    templateUrl: './ordenes-compra.component.html'
})
export class OrdenesCompraComponent implements OnInit {
    private readonly ordenService = inject(OrdenCompraService);
    private readonly proveedorService = inject(ProveedorService);
    private readonly fb = inject(FormBuilder);

    // Data
    ordenes = signal<OrdenCompra[]>([]);
    selectedOrden = signal<OrdenCompra | null>(null);
    proveedores = signal<Proveedor[]>([]);

    // UI state
    loading = signal(false);
    loadingDetail = signal(false);
    error = signal<string | null>(null);
    showForm = signal(false);
    showDetail = signal(false);
    editMode = signal(false);
    submitting = signal(false);
    submitError = signal<string | null>(null);

    // Items para el formulario
    formItems = signal<OcItemForm[]>([]);

    // Filters
    filterEstado = signal('');

    // Pagination
    currentPage = signal(0);
    pageSize = signal(10);
    totalElements = signal(0);
    totalPages = signal(0);

    // Sort
    sortField = signal('fechaEmision');
    sortDirection = signal<'asc' | 'desc'>('desc');

    // Computed
    hasOrdenes = computed(() => this.ordenes().length > 0);
    isEmpty = computed(() => !this.loading() && !this.hasOrdenes());

    totales = computed(() => {
        const items = this.formItems();
        const subtotal = items.reduce((acc, i) => acc + (i.cantidad * i.precioUnitario), 0);
        const igv = subtotal * 0.18;
        return { subtotal, igv, total: subtotal + igv };
    });

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: '/admin' },
        { label: 'Compras', url: '/admin/compras/dashboard' },
        { label: 'Órdenes de Compra' }
    ];

    readonly estadoOptions = [
        { value: 'BORRADOR', label: 'Borrador' },
        { value: 'PENDIENTE', label: 'Pendiente' },
        { value: 'APROBADA', label: 'Aprobada' },
        { value: 'ENVIADA', label: 'Enviada' },
        { value: 'RECIBIDA', label: 'Recibida' },
        { value: 'CANCELADA', label: 'Cancelada' }
    ];

    readonly condicionPagoOptions = [
        { value: 'CONTADO', label: 'Contado' },
        { value: 'CREDITO_15', label: 'Crédito 15 días' },
        { value: 'CREDITO_30', label: 'Crédito 30 días' },
        { value: 'CREDITO_60', label: 'Crédito 60 días' },
        { value: 'CREDITO_90', label: 'Crédito 90 días' }
    ];

    readonly almacenOptions = [
        { value: 'ALM1', label: 'Almacén Principal (ALM1)' },
        { value: 'ALM2', label: 'Almacén Secundario (ALM2)' }
    ];

    columns: TableColumn<OrdenCompra>[] = [
        { key: 'codigo', label: 'OC #', sortable: true, width: '130px' },
        {
            key: 'fechaEmision', label: 'Fecha', sortable: true,
            render: (r) => r.fechaEmision ? new Date(r.fechaEmision).toLocaleDateString('es-PE') : '—'
        },
        { key: 'proveedorNombre', label: 'Proveedor', render: (r) => r.proveedorNombre ?? '—' },
        {
            key: 'condicionPago', label: 'Cond. Pago',
            render: (r) => r.condicionPago.replace('_', ' ')
        },
        {
            key: 'total', label: 'Total', align: 'right', sortable: true,
            render: (r) => `S/ ${(r.total ?? 0).toFixed(2)}`
        },
        {
            key: 'estado', label: 'Estado', html: true,
            render: (r) => `<span class="badge badge-${this.badgeEstado(r.estado)}">${r.estado}</span>`
        }
    ];

    actions: TableAction<OrdenCompra>[] = [
        {
            label: 'Ver', icon: '👁️', class: 'btn-view',
            onClick: (row) => this.openDetail(row.id!)
        },
        {
            label: 'Editar', icon: '✏️', class: 'btn-edit',
            show: (row) => row.estado === 'BORRADOR',
            onClick: (row) => this.openEditForm(row)
        }
    ];

    ocForm: FormGroup;

    constructor() {
        this.ocForm = this.fb.group({
            proveedorId: ['', Validators.required],
            fechaEmision: ['', Validators.required],
            fechaEntregaEstimada: [''],
            condicionPago: ['CONTADO', Validators.required],
            almacenDestino: ['ALM1', Validators.required],
            observaciones: ['']
        });
    }

    ngOnInit(): void {
        this.loadOrdenes();
        this.loadProveedores();
    }

    loadOrdenes(): void {
        this.loading.set(true);
        this.error.set(null);
        this.ordenService.getOrdenes(
            this.currentPage(),
            this.pageSize(),
            this.filterEstado() || undefined
        ).subscribe({
            next: (res) => {
                this.ordenes.set(res.content);
                this.totalElements.set(res.totalElements);
                this.totalPages.set(res.totalPages);
                this.loading.set(false);
            },
            error: (err: Error) => {
                this.error.set(err.message);
                this.loading.set(false);
            }
        });
    }

    loadProveedores(): void {
        this.proveedorService.getProveedores(0, 200).subscribe({
            next: (res) => this.proveedores.set(res.content),
            error: () => { /* silent — proveedor dropdown optional */ }
        });
    }

    onFilterEstado(event: Event): void {
        this.filterEstado.set((event.target as HTMLSelectElement).value);
        this.currentPage.set(0);
        this.loadOrdenes();
    }

    onSort(event: SortEvent): void {
        this.sortField.set(event.field);
        this.sortDirection.set(event.direction);
        this.currentPage.set(0);
        this.loadOrdenes();
    }

    onPaginationChange(event: PaginationChangeEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadOrdenes();
    }

    // ── Detail drawer ──────────────────────────────
    openDetail(id: string): void {
        this.loadingDetail.set(true);
        this.showDetail.set(true);
        this.selectedOrden.set(null);
        this.ordenService.getOrdenById(id).subscribe({
            next: (orden) => {
                this.selectedOrden.set(orden);
                this.loadingDetail.set(false);
            },
            error: (err: Error) => {
                this.error.set(err.message);
                this.loadingDetail.set(false);
                this.showDetail.set(false);
            }
        });
    }

    closeDetail(): void {
        this.showDetail.set(false);
        this.selectedOrden.set(null);
    }

    updateEstado(newEstado: string): void {
        const orden = this.selectedOrden();
        if (!orden) return;
        this.loadingDetail.set(true);

        const op = newEstado === 'CANCELADA'
            ? this.ordenService.cancelarOrden(orden.id!)
            : this.ordenService.aprobarOrden(orden.id!);

        op.subscribe({
            next: (updated) => {
                this.selectedOrden.set(updated);
                this.ordenes.update(list =>
                    list.map(o => o.id === updated.id ? { ...o, estado: updated.estado } : o)
                );
                this.loadingDetail.set(false);
            },
            error: (err: Error) => {
                this.error.set(err.message);
                this.loadingDetail.set(false);
            }
        });
    }

    // ── Form drawer ────────────────────────────────
    openCreateForm(): void {
        this.editMode.set(false);
        this.selectedOrden.set(null);
        this.ocForm.reset({ condicionPago: 'CONTADO', almacenDestino: 'ALM1' });
        this.formItems.set([this.emptyItem()]);
        this.submitError.set(null);
        this.showForm.set(true);
    }

    openEditForm(orden: OrdenCompra): void {
        this.editMode.set(true);
        this.selectedOrden.set(orden);
        this.ocForm.patchValue({
            proveedorId: orden.proveedorId,
            fechaEmision: orden.fechaEmision,
            fechaEntregaEstimada: orden.fechaEntregaEstimada ?? '',
            condicionPago: orden.condicionPago,
            almacenDestino: orden.almacenDestino,
            observaciones: orden.observaciones ?? ''
        });
        this.formItems.set((orden.items ?? []).map(i => ({
            productoNombre: i.productoNombre,
            sku: i.sku ?? '',
            cantidad: i.cantidad,
            precioUnitario: i.precioUnitario
        })));
        this.submitError.set(null);
        this.showForm.set(true);
    }

    closeForm(): void {
        this.showForm.set(false);
        this.ocForm.reset();
        this.formItems.set([]);
    }

    addItem(): void {
        this.formItems.update(items => [...items, this.emptyItem()]);
    }

    removeItem(index: number): void {
        this.formItems.update(items => items.filter((_, i) => i !== index));
    }

    updateItem(index: number, field: keyof OcItemForm, value: string | number): void {
        this.formItems.update(items => {
            const updated = [...items];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    }

    private emptyItem(): OcItemForm {
        return { productoNombre: '', sku: '', cantidad: 1, precioUnitario: 0 };
    }

    onSubmit(): void {
        if (this.ocForm.invalid) {
            this.ocForm.markAllAsTouched();
            return;
        }
        if (this.formItems().length === 0) {
            this.submitError.set('Debe agregar al menos un producto.');
            return;
        }
        const invalid = this.formItems().some(i => !i.productoNombre.trim() || i.cantidad < 1 || i.precioUnitario <= 0);
        if (invalid) {
            this.submitError.set('Verifique que todos los productos tengan nombre, cantidad y precio.');
            return;
        }

        this.submitting.set(true);
        this.submitError.set(null);

        const { subtotal, igv, total } = this.totales();
        const payload: Partial<OrdenCompra> = {
            ...this.ocForm.value,
            subtotal,
            igv,
            total,
            items: this.formItems().map(i => ({
                productoNombre: i.productoNombre,
                sku: i.sku || undefined,
                cantidad: i.cantidad,
                precioUnitario: i.precioUnitario,
                subtotal: i.cantidad * i.precioUnitario
            } as OrdenCompraItem))
        };

        const op = this.editMode()
            ? this.ordenService.updateOrden(this.selectedOrden()!.id!, payload)
            : this.ordenService.createOrden(payload);

        op.subscribe({
            next: () => {
                this.submitting.set(false);
                this.closeForm();
                this.loadOrdenes();
            },
            error: (err: Error) => {
                this.submitError.set(err.message);
                this.submitting.set(false);
            }
        });
    }

    badgeEstado(estado: string): string {
        const map: Record<string, string> = {
            BORRADOR: 'neutral',
            PENDIENTE: 'warning',
            APROBADA: 'success',
            ENVIADA: 'accent',
            RECIBIDA: 'success',
            CANCELADA: 'error'
        };
        return map[estado] ?? 'neutral';
    }

    getControl(name: string): FormControl {
        return this.ocForm.get(name) as FormControl;
    }

    proveedorNombre(id: string): string {
        return this.proveedores().find(p => p.id === id)?.razonSocial ?? id;
    }
}
