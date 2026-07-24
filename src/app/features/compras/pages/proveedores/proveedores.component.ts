import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { ProveedorService } from '../../services/proveedor.service';
import { Proveedor } from '../../models/proveedor.model';
import { of } from 'rxjs';
import { DataTableComponent, TableColumn, TableAction, SortEvent, FilterConfig, FilterChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { MONEDA } from '@shared/constants/sunat.constants';
import { PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { ButtonComponent, CatalogSelectComponent } from '@shared/components';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';

@Component({
    selector: 'app-proveedores',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        DataTableComponent,
        DrawerComponent,
        FormFieldComponent,
        PageHeaderComponent,
        AlertComponent,
        ButtonComponent,
        CatalogSelectComponent
    ],
    templateUrl: './proveedores.component.html'
})
export class ProveedoresComponent implements OnInit {
    private readonly proveedorService = inject(ProveedorService);
    private readonly fb = inject(FormBuilder);

    // Data
    proveedores = signal<Proveedor[]>([]);
    selectedProveedor = signal<Proveedor | null>(null);

    // UI state
    loading = signal(false);
    error = signal<string | null>(null);
    showModal = signal(false);
    editMode = signal(false);
    submitting = signal(false);
    submitError = signal<string | null>(null);

    // Filters
    searchQuery = signal('');
    filterEstado = signal('');

    // Filtro de estado para el toolbar del data-table
    estadoFilters: FilterConfig[] = [
        {
            field: 'estado',
            label: 'Todos los estados',
            options: of([
                { value: 'ACTIVO', label: 'Activo' },
                { value: 'INACTIVO', label: 'Inactivo' }
            ])
        }
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (respeta los filtros actuales search + estado). Ver /purchases/api/proveedores/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.purchases}/api/proveedores/export`,
        filename: 'proveedores',
        params: () => ({ search: this.searchQuery(), estado: this.filterEstado() }),
    };

    // Pagination
    currentPage = signal(0);
    pageSize = signal(20);
    totalElements = signal(0);
    totalPages = signal(0);

    // Sort
    sortField = signal('razonSocial');
    sortDirection = signal<'asc' | 'desc'>('asc');

    // Computed
    hasProveedores = computed(() => this.proveedores().length > 0);
    isEmpty = computed(() => !this.loading() && !this.hasProveedores());

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: '/admin' },
        { label: 'Compras', url: '/admin/compras/dashboard' },
        { label: 'Proveedores' }
    ];

    columns: TableColumn<Proveedor>[] = [
        {
            key: 'ruc', label: 'RUC', sortable: true, width: '130px',
            html: true, render: (r) => `<span class="font-mono text-sm">${r.ruc}</span>`
        },
        { key: 'razonSocial', label: 'Razón Social', sortable: true },
        {
            key: 'condicionSunat', label: 'Cond. SUNAT', html: true,
            render: (r) => `<span class="badge badge-${r.condicionSunat === 'HABIDO' ? 'success' : 'warning'}">${r.condicionSunat ?? '—'}</span>`
        },
        {
            key: 'condicionPago', label: 'Cond. Pago',
            render: (r) => r.condicionPago?.replace('_', ' ') ?? '—'
        },
        {
            key: 'contactoEmail', label: 'Email',
            render: (r) => r.contactoEmail ?? '—'
        },
        {
            key: 'estado', label: 'Estado', html: true,
            render: (r) => `<span class="badge badge-${r.estado === 'ACTIVO' ? 'success' : 'neutral'}">${r.estado ?? '—'}</span>`
        }
    ];

    actions: TableAction<Proveedor>[] = [
        {
            label: 'Editar', icon: '✏️', class: 'btn-view',
            onClick: (row) => this.openEditModal(row)
        },
        {
            label: 'Eliminar', icon: '🗑️', class: 'btn-delete',
            onClick: (row) => this.onDelete(row)
        }
    ];

    proveedorForm: FormGroup;

    constructor() {
        this.proveedorForm = this.fb.group({
            ruc: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
            razonSocial: ['', [Validators.required, Validators.maxLength(200)]],
            nombreComercial: ['', [Validators.maxLength(200)]],
            condicionSunat: ['HABIDO'],
            domicilioFiscal: [''],
            contactoNombre: [''],
            contactoTelefono: [''],
            contactoEmail: ['', [Validators.email]],
            banco: [''],
            cuentaBanco: [''],
            condicionPago: ['CONTADO'],
            monedaPreferida: [MONEDA.PEN]
        });
    }

    ngOnInit(): void {
        this.loadProveedores();
    }

    loadProveedores(): void {
        this.loading.set(true);
        this.error.set(null);
        this.proveedorService.getProveedores(
            this.currentPage(),
            this.pageSize(),
            this.searchQuery() || undefined,
            this.filterEstado() || undefined
        ).subscribe({
            next: (res) => {
                this.proveedores.set(res.content);
                this.totalElements.set(pageTotalElements(res));
                this.totalPages.set(pageTotalPages(res));
                this.loading.set(false);
            },
            error: (err: Error) => {
                this.error.set(err.message);
                this.loading.set(false);
            }
        });
    }

    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.loadProveedores();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        if (event.field === 'estado') {
            this.filterEstado.set(event.value != null ? String(event.value) : '');
            this.currentPage.set(0);
            this.loadProveedores();
        }
    }

    onSort(event: SortEvent): void {
        this.sortField.set(event.field);
        this.sortDirection.set(event.direction);
        this.currentPage.set(0);
        this.loadProveedores();
    }

    onPaginationChange(event: PaginationChangeEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadProveedores();
    }

    openCreateModal(): void {
        this.editMode.set(false);
        this.selectedProveedor.set(null);
        this.proveedorForm.reset({ condicionSunat: 'HABIDO', condicionPago: 'CONTADO', monedaPreferida: MONEDA.PEN });
        this.submitError.set(null);
        this.showModal.set(true);
    }

    openEditModal(proveedor: Proveedor): void {
        this.editMode.set(true);
        this.selectedProveedor.set(proveedor);
        this.proveedorForm.patchValue({
            ruc: proveedor.ruc,
            razonSocial: proveedor.razonSocial,
            nombreComercial: proveedor.nombreComercial ?? '',
            condicionSunat: proveedor.condicionSunat ?? 'HABIDO',
            domicilioFiscal: proveedor.domicilioFiscal ?? '',
            contactoNombre: proveedor.contactoNombre ?? '',
            contactoTelefono: proveedor.contactoTelefono ?? '',
            contactoEmail: proveedor.contactoEmail ?? '',
            banco: proveedor.banco ?? '',
            cuentaBanco: proveedor.cuentaBanco ?? '',
            condicionPago: proveedor.condicionPago ?? 'CONTADO',
            monedaPreferida: proveedor.monedaPreferida ?? MONEDA.PEN
        });
        this.submitError.set(null);
        this.showModal.set(true);
    }

    closeModal(): void {
        this.showModal.set(false);
        this.proveedorForm.reset();
    }

    onSubmit(): void {
        if (this.proveedorForm.invalid) {
            this.proveedorForm.markAllAsTouched();
            return;
        }
        this.submitting.set(true);
        this.submitError.set(null);

        const val = this.proveedorForm.value as Partial<Proveedor>;
        const op = this.editMode()
            ? this.proveedorService.updateProveedor(this.selectedProveedor()!.id!, val)
            : this.proveedorService.createProveedor(val);

        op.subscribe({
            next: () => {
                this.submitting.set(false);
                this.closeModal();
                this.loadProveedores();
            },
            error: (err: Error) => {
                this.submitError.set(err.message);
                this.submitting.set(false);
            }
        });
    }

    onDelete(proveedor: Proveedor): void {
        if (!confirm(`¿Eliminar proveedor "${proveedor.razonSocial}"?`)) return;
        this.loading.set(true);
        this.proveedorService.deleteProveedor(proveedor.id!).subscribe({
            next: () => this.loadProveedores(),
            error: (err: Error) => {
                this.error.set(err.message);
                this.loading.set(false);
            }
        });
    }

    getControl(name: string): FormControl {
        return this.proveedorForm.get(name) as FormControl;
    }
}
