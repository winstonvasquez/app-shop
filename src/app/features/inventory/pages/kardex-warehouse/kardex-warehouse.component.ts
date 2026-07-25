import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { WmsApiService } from '../../services/wms-api.service';
import { KardexLogisticoEntry } from '../../models/wms-zone.models';
import { AlmacenService } from '@features/logistica/services/almacen.service';
import { almacenSelectSource } from '@features/logistica/components/select-sources';
import { AuthService } from '@core/auth/auth.service';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { DataTableComponent, TableColumn, PaginationEvent } from '@shared/ui/tables/data-table/data-table.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { ButtonComponent, ServerSearchSelectComponent } from '@shared/components';
import { ROUTES } from '@shared/constants/app.constants';

@Component({
    selector: 'app-kardex-warehouse',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        DataTableComponent, PageHeaderComponent, AlertComponent,
        DateInputComponent, ServerSearchSelectComponent, ButtonComponent
    ],
    templateUrl: './kardex-warehouse.component.html'
})
export class KardexWarehouseComponent {
    private readonly api = inject(WmsApiService);
    private readonly almacenApi = inject(AlmacenService);
    private readonly authService = inject(AuthService);
    private readonly fb = inject(FormBuilder);

    readonly almacenSource = almacenSelectSource(this.almacenApi, () => this.authService.currentUser()?.activeCompanyId);

    entries = signal<KardexLogisticoEntry[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);
    selectedAlmacenId = signal<string | null>(null);

    currentPage = signal(0);
    pageSize = signal(20);
    totalElements = signal(0);
    totalPages = signal(0);

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: ROUTES.admin },
        { label: 'Inventario', url: '/admin/inventario/dashboard' },
        { label: 'Kardex por Almacén' }
    ];

    columns: TableColumn<KardexLogisticoEntry>[] = [
        { key: 'fecha', label: 'Fecha', sortable: true,
          render: (r) => new Date(r.fecha).toLocaleDateString('es-PE') },
        {
            key: 'tipoMovimiento', label: 'Tipo', html: true,
            render: (r) => {
                const isEntry = r.cantidadEntrada > 0;
                return `<span class="badge ${isEntry ? 'badge-success' : 'badge-error'}">${r.tipoMovimiento}</span>`;
            }
        },
        { key: 'productoNombre', label: 'Producto', render: (r) => r.productoNombre ?? r.sku },
        { key: 'cantidadEntrada', label: 'Entrada', align: 'right',
          render: (r) => r.cantidadEntrada > 0 ? r.cantidadEntrada.toLocaleString('es-PE') : '—' },
        { key: 'cantidadSalida', label: 'Salida', align: 'right',
          render: (r) => r.cantidadSalida > 0 ? r.cantidadSalida.toLocaleString('es-PE') : '—' },
        { key: 'saldo', label: 'Saldo', align: 'right', sortable: true,
          render: (r) => r.saldo.toLocaleString('es-PE') },
        { key: 'costoTotal', label: 'Costo Total', align: 'right',
          render: (r) => r.costoTotal != null ? `S/ ${r.costoTotal.toFixed(2)}` : '—' },
        { key: 'descripcion', label: 'Descripción', render: (r) => r.descripcion ?? '—' }
    ];

    form: FormGroup = this.fb.nonNullable.group({
        almacenId: [null as string | null, Validators.required],
        from: ['', Validators.required],
        to: ['', Validators.required]
    });

    onAlmacenChange(): void {
        this.currentPage.set(0);
        this.buscar();
    }

    buscar(): void {
        const v = this.form.getRawValue();
        if (!v.almacenId || !v.from || !v.to) { return; }
        this.loading.set(true);
        this.error.set(null);
        this.api.getKardexPorAlmacen(v.almacenId, v.from, v.to, this.currentPage(), this.pageSize()).subscribe({
            next: (res) => {
                this.entries.set(res.content);
                this.totalElements.set(pageTotalElements(res));
                this.totalPages.set(pageTotalPages(res));
                this.loading.set(false);
            },
            error: (err: Error) => { this.error.set(err.message); this.loading.set(false); }
        });
    }

    onPageChange(e: PaginationEvent): void {
        this.currentPage.set(e.page);
        this.pageSize.set(e.size);
        this.buscar();
    }
}
