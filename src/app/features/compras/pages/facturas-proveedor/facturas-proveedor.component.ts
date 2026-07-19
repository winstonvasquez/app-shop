import {
    Component,
    OnInit,
    inject,
    signal,
    computed,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormGroup } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { of } from 'rxjs';
import { FacturaProveedorService } from '../../services/factura-proveedor.service';
import { FacturaProveedor, RegistrarFacturaRequest } from '../../models/factura-proveedor.model';
import { ButtonComponent } from '@shared/components';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import {
    DataTableComponent,
    TableColumn,
    TableAction,
    PaginationEvent,
    FilterConfig,
    FilterChangeEvent,
} from '@shared/ui/tables/data-table/data-table.component';

@Component({
    selector: 'app-facturas-proveedor',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        RouterModule,
        ButtonComponent,
        DrawerComponent,
        PageHeaderComponent,
        AlertComponent,
        DataTableComponent,
    ],
    templateUrl: './facturas-proveedor.component.html',
})
export class FacturasProveedorComponent implements OnInit {
    private readonly facturaService = inject(FacturaProveedorService);
    private readonly fb = inject(FormBuilder);
    private readonly cdr = inject(ChangeDetectorRef);

    facturas = signal<FacturaProveedor[]>([]);
    selectedFactura = signal<FacturaProveedor | null>(null);

    loading = signal(false);
    error = signal<string | null>(null);
    showForm = signal(false);
    showDetail = signal(false);
    submitting = signal(false);
    submitError = signal<string | null>(null);
    actionError = signal<string | null>(null);

    filterEstado = signal('');
    currentPage = signal(0);
    pageSize = signal(10);
    totalElements = signal(0);
    totalPages = signal(0);
    searchQuery = signal('');

    hasFacturas = computed(() => this.facturas().length > 0);
    isEmpty = computed(() => !this.loading() && !this.hasFacturas());

    filteredFacturas = computed(() => {
        const q = this.searchQuery().trim().toLowerCase();
        if (!q) return this.facturas();
        return this.facturas().filter(
            (f) =>
                (f.proveedorNombre ?? '').toLowerCase().includes(q) ||
                `${f.serie}-${f.numero}`.toLowerCase().includes(q) ||
                (f.ordenCompraCodigo ?? '').toLowerCase().includes(q)
        );
    });

    breadcrumbs: Breadcrumb[] = [
        { label: 'Compras', url: '/compras' },
        { label: 'Facturas Proveedor' },
    ];

    estadoOptions = [
        { value: 'PENDIENTE', label: 'Pendiente' },
        { value: 'APROBADA', label: 'Aprobada' },
        { value: 'RECHAZADA', label: 'Rechazada' },
    ];

    matchOptions = [
        { value: 'OK_TOTAL', label: '✓ Match Total', cls: 'badge-success' },
        { value: 'OK_PARCIAL', label: '~ Match Parcial', cls: 'badge-warning' },
        { value: 'DIFERENCIA_PRECIO', label: '✗ Dif. Precio', cls: 'badge-error' },
        { value: 'DIFERENCIA_CANTIDAD', label: '✗ Dif. Cantidad', cls: 'badge-error' },
        { value: 'RECHAZADA', label: '✗ Rechazada', cls: 'badge-error' },
    ];

    columns: TableColumn<FacturaProveedor>[] = [
        { key: 'proveedorNombre', label: 'Proveedor' },
        { key: 'factura', label: 'Factura', render: (row) => `${row.serie}-${row.numero}` },
        { key: 'ordenCompraCodigo', label: 'OC' },
        { key: 'fechaEmision', label: 'Fecha' },
        { key: 'total', label: 'Total', align: 'right', render: (row) => `S/ ${row.total.toFixed(2)}` },
        {
            key: 'estado',
            label: 'Estado',
            html: true,
            render: (row) => `<span class="${this.getEstadoBadge(row.estado)}">${row.estado}</span>`,
        },
        {
            key: 'resultadoMatch',
            label: '3-Way Match',
            html: true,
            render: (row) =>
                `<span class="${this.getMatchBadge(row.resultadoMatch)}">${this.getMatchLabel(row.resultadoMatch)}</span>`,
        },
    ];

    actions: TableAction<FacturaProveedor>[] = [
        { label: 'Ver', icon: 'view', onClick: (row) => this.openDetail(row) },
    ];

    estadoFilters: FilterConfig[] = [
        {
            field: 'estado',
            label: 'Todos los estados',
            options: of(this.estadoOptions.map((o) => ({ value: o.value, label: o.label }))),
        },
    ];

    facturaForm = this.fb.group({
        ordenCompraId: ['', Validators.required],
        serie: ['', Validators.required],
        numero: ['', Validators.required],
        tipoDocumento: ['FACTURA'],
        fechaEmision: ['', Validators.required],
        fechaVencimiento: [''],
        moneda: ['PEN'],
        observaciones: [''],
        items: this.fb.array([this.createItemGroup()]),
    });

    rechazarForm = this.fb.group({
        motivo: ['', Validators.required],
    });

    showRechazarModal = signal(false);
    validandoSunatId = signal<string | null>(null);

    get itemsArray(): FormArray {
        return this.facturaForm.get('items') as FormArray;
    }

    ngOnInit(): void {
        this.loadFacturas();
    }

    loadFacturas(): void {
        this.loading.set(true);
        this.error.set(null);
        this.facturaService.listar(this.currentPage(), this.pageSize(), this.filterEstado() || undefined).subscribe({
            next: (page) => {
                this.facturas.set(page.content);
                this.totalElements.set(page.totalElements);
                this.totalPages.set(page.totalPages);
                this.loading.set(false);
                this.cdr.markForCheck();
            },
            error: (err) => {
                this.error.set('Error al cargar facturas');
                this.loading.set(false);
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        if (event.field === 'estado') {
            this.filterEstado.set((event.value as string) ?? '');
            this.currentPage.set(0);
            this.loadFacturas();
        }
    }

    onPageChange(event: PaginationEvent): void {
        this.currentPage.set(event.page);
        this.loadFacturas();
    }

    openCreateForm(): void {
        this.facturaForm.reset({ tipoDocumento: 'FACTURA', moneda: 'PEN' });
        while (this.itemsArray.length > 0) this.itemsArray.removeAt(0);
        this.itemsArray.push(this.createItemGroup());
        this.submitError.set(null);
        this.showForm.set(true);
    }

    closeForm(): void {
        this.showForm.set(false);
    }

    openDetail(factura: FacturaProveedor): void {
        this.selectedFactura.set(factura);
        this.actionError.set(null);
        this.showDetail.set(true);
    }

    closeDetail(): void {
        this.showDetail.set(false);
        this.selectedFactura.set(null);
    }

    addItem(): void {
        this.itemsArray.push(this.createItemGroup());
    }

    removeItem(i: number): void {
        if (this.itemsArray.length > 1) this.itemsArray.removeAt(i);
    }

    registrarFactura(): void {
        if (this.facturaForm.invalid) return;
        const fv = this.facturaForm.value;

        const request: RegistrarFacturaRequest = {
            ordenCompraId: fv.ordenCompraId ?? '',
            serie: fv.serie ?? '',
            numero: fv.numero ?? '',
            tipoDocumento: fv.tipoDocumento ?? 'FACTURA',
            fechaEmision: fv.fechaEmision ?? '',
            fechaVencimiento: fv.fechaVencimiento || undefined,
            moneda: fv.moneda ?? 'PEN',
            observaciones: fv.observaciones || undefined,
            items: (fv.items ?? []).map((i: Record<string, unknown>) => ({
                ordenItemId: (i['ordenItemId'] as string) || undefined,
                productoNombre: i['productoNombre'] as string,
                sku: (i['sku'] as string) || undefined,
                cantidad: Number(i['cantidad']),
                precioUnitario: Number(i['precioUnitario']),
            })),
        };

        this.submitting.set(true);
        this.submitError.set(null);
        this.facturaService.registrar(request).subscribe({
            next: () => {
                this.submitting.set(false);
                this.showForm.set(false);
                this.loadFacturas();
            },
            error: (err) => {
                this.submitError.set('Error al registrar factura');
                this.submitting.set(false);
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    aprobarFactura(id: string): void {
        this.facturaService.aprobar(id).subscribe({
            next: () => {
                this.closeDetail();
                this.loadFacturas();
            },
            error: (err) => {
                this.actionError.set('Error al aprobar factura');
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    openRechazarModal(): void {
        this.rechazarForm.reset();
        this.showRechazarModal.set(true);
    }

    closeRechazarModal(): void {
        this.showRechazarModal.set(false);
    }

    confirmarRechazo(): void {
        if (this.rechazarForm.invalid) return;
        const factura = this.selectedFactura();
        if (!factura?.id) return;
        const motivo = this.rechazarForm.value.motivo ?? '';
        this.facturaService.rechazar(factura.id, motivo).subscribe({
            next: () => {
                this.showRechazarModal.set(false);
                this.closeDetail();
                this.loadFacturas();
            },
            error: (err) => {
                this.actionError.set('Error al rechazar factura');
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    getEstadoBadge(estado: string): string {
        switch (estado) {
            case 'PENDIENTE': return 'badge badge-warning';
            case 'APROBADA': return 'badge badge-success';
            case 'RECHAZADA': return 'badge badge-error';
            default: return 'badge badge-neutral';
        }
    }

    getMatchBadge(match: string | undefined): string {
        if (!match) return 'badge badge-neutral';
        return match === 'OK_TOTAL' ? 'badge badge-success'
            : match === 'OK_PARCIAL' ? 'badge badge-warning'
            : 'badge badge-error';
    }

    getMatchLabel(match: string | undefined): string {
        return this.matchOptions.find(o => o.value === match)?.label ?? (match ?? '—');
    }

    validarSunat(id: string): void {
        this.validandoSunatId.set(id);
        this.facturaService.validarSunat(id).subscribe({
            next: () => {
                this.validandoSunatId.set(null);
                this.loadFacturas();
                if (this.selectedFactura()?.id === id) this.closeDetail();
            },
            error: () => {
                this.validandoSunatId.set(null);
                this.actionError.set('Error al validar con SUNAT');
                this.cdr.markForCheck();
            }
        });
    }

    private createItemGroup(): FormGroup {
        return this.fb.group({
            ordenItemId: [''],
            productoNombre: ['', Validators.required],
            sku: [''],
            cantidad: [1, [Validators.required, Validators.min(1)]],
            precioUnitario: [0, [Validators.required, Validators.min(0)]],
        });
    }
}
