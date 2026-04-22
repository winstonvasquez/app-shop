import {
    Component, inject, signal, OnInit, ChangeDetectionStrategy
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { MovimientoService, Movimiento, MovimientoPage } from '../../../services/movimiento.service';
import { AlmacenService } from '../../../services/almacen.service';
import { Almacen } from '../../../models/almacen.model';
import { MovimientoItem, CreateMovimientoDto } from '../../../models/movimiento.model';
import { AuthService } from '../../../../../core/auth/auth.service';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';

interface ItemForm {
    productoNombre: string;
    sku: string;
    cantidad: number;
}

@Component({
    selector: 'app-movimientos-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        DataTableComponent,
        DrawerComponent,
        DateInputComponent,
        AlertComponent,
        PageHeaderComponent
    ],
    templateUrl: './movimientos-page.component.html'
})
export class MovimientosPageComponent implements OnInit {
    private readonly movimientoService = inject(MovimientoService);
    private readonly almacenService    = inject(AlmacenService);
    private readonly authService       = inject(AuthService);
    private readonly fb                = inject(FormBuilder);

    // Data
    movimientos = signal<Movimiento[]>([]);
    almacenes   = signal<Almacen[]>([]);
    formItems   = signal<ItemForm[]>([]);

    // UI state
    loading     = signal(false);
    error       = signal<string | null>(null);
    showForm    = signal(false);
    submitting  = signal(false);
    submitError = signal<string | null>(null);

    // Filter form
    filterForm = this.fb.group({
        tipoFilter: [''],
        dateFrom:   [''],
        dateTo:     ['']
    });

    // Pagination
    currentPage   = signal(0);
    pageSize      = signal(10);
    totalElements = signal(0);
    totalPages    = signal(1);

    readonly tipoOptions = [
        { value: 'ENTRADA_COMPRA', label: 'Entrada Compra' },
        { value: 'SALIDA_VENTA',   label: 'Salida Venta' },
        { value: 'TRASLADO',       label: 'Traslado' },
        { value: 'AJUSTE',         label: 'Ajuste de inventario' },
        { value: 'DEVOLUCION',     label: 'Devolución' }
    ];

    breadcrumbs: Breadcrumb[] = [
        { label: 'Inicio',    url: '/admin/dashboard' },
        { label: 'Logística', url: '/logistica/dashboard' },
        { label: 'Movimientos de Stock' }
    ];

    columns: TableColumn<Movimiento>[] = [
        { key: 'createdAt', label: 'Fecha',
          render: (r) => r.createdAt
            ? new Date(r.createdAt).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
            : '—' },
        { key: 'tipo', label: 'Tipo', html: true,
          render: (r) => `<span class="badge ${this.badgeTipo(r.tipo)}">${r.tipo.replace(/_/g, ' ')}</span>` },
        { key: 'codigo',         label: 'Código' },
        { key: 'almacenOrigen',  label: 'Almacén Origen',  render: (r) => r.almacenOrigen  || '—' },
        { key: 'almacenDestino', label: 'Destino',          render: (r) => r.almacenDestino || '—' },
        { key: 'referenciaTipo', label: 'Referencia',       render: (r) => r.referenciaTipo || '—' },
        { key: 'estado', label: 'Estado', html: true,
          render: () => `<span class="badge badge-success">PROCESADO</span>` }
    ];

    actions: TableAction<Movimiento>[] = [
        {
            label: 'Ver detalle', icon: '👁️', class: 'btn-view',
            onClick: (_row) => {}
        }
    ];

    form: FormGroup = this.fb.group({
        tipo:              ['', Validators.required],
        almacenOrigenId:   [''],
        almacenDestinoId:  [''],
        motivo:            [''],
        observaciones:     ['']
    });

    private get companyId(): string {
        return String(this.authService.currentUser()?.activeCompanyId ?? 1);
    }

    ngOnInit() {
        this.loadAlmacenes();
        this.loadMovimientos();
    }

    loadAlmacenes() {
        this.almacenService.getAlmacenes(this.companyId).subscribe({
            next: (res) => this.almacenes.set(res.content),
            error: () => this.almacenes.set([])
        });
    }

    loadMovimientos() {
        const { tipoFilter, dateFrom, dateTo } = this.filterForm.value;
        this.loading.set(true);
        this.error.set(null);
        this.movimientoService.getMovimientos(this.companyId, {
            tipo:  tipoFilter  || undefined,
            desde: dateFrom    || undefined,
            hasta: dateTo      || undefined,
            page:  this.currentPage(),
            size:  this.pageSize()
        }).subscribe({
            next: (res: MovimientoPage) => {
                this.movimientos.set(res.content || []);
                this.totalElements.set(res.totalElements ?? res.content?.length ?? 0);
                this.totalPages.set(res.totalPages ?? 1);
                this.loading.set(false);
            },
            error: (err: Error) => {
                this.error.set(err.message ?? 'Error al cargar movimientos.');
                this.movimientos.set([]);
                this.loading.set(false);
            }
        });
    }

    buscar() {
        this.currentPage.set(0);
        this.loadMovimientos();
    }

    onPaginationChange(event: PaginationChangeEvent) {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadMovimientos();
    }

    // ── Drawer ──────────────────────────────────────────
    openCreateForm() {
        this.form.reset();
        this.formItems.set([this.emptyItem()]);
        this.submitError.set(null);
        this.showForm.set(true);
    }

    closeForm() {
        this.showForm.set(false);
        this.form.reset();
        this.formItems.set([]);
    }

    addItem() {
        this.formItems.update(items => [...items, this.emptyItem()]);
    }

    removeItem(index: number) {
        this.formItems.update(items => items.filter((_, i) => i !== index));
    }

    updateItem(index: number, field: keyof ItemForm, value: string | number) {
        this.formItems.update(items => {
            const updated = [...items];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    }

    onSubmit() {
        if (this.form.invalid) { this.form.markAllAsTouched(); return; }
        if (this.formItems().length === 0) {
            this.submitError.set('Agregue al menos un producto al movimiento.');
            return;
        }
        const invalidItem = this.formItems().some(i => !i.productoNombre.trim() || i.cantidad < 1);
        if (invalidItem) {
            this.submitError.set('Verifique que todos los ítems tengan nombre y cantidad válida.');
            return;
        }

        this.submitting.set(true);
        this.submitError.set(null);

        const items: MovimientoItem[] = this.formItems().map(i => ({
            productoId:     '00000000-0000-0000-0000-000000000000',
            productoNombre: i.productoNombre,
            sku:            i.sku,
            cantidad:       i.cantidad
        }));

        const dto: CreateMovimientoDto = {
            ...this.form.value,
            items
        };

        this.movimientoService.createMovimiento(dto, this.companyId).subscribe({
            next: () => {
                this.submitting.set(false);
                this.closeForm();
                this.loadMovimientos();
            },
            error: (err: Error) => {
                this.submitError.set(err.message ?? 'Error al crear movimiento.');
                this.submitting.set(false);
            }
        });
    }

    err(field: string): string {
        const c = this.form.get(field);
        if (!c || c.pristine || c.valid) return '';
        if (c.hasError('required')) return 'Campo requerido';
        return 'Campo inválido';
    }

    private emptyItem(): ItemForm {
        return { productoNombre: '', sku: '', cantidad: 1 };
    }

    badgeTipo(tipo: string): string {
        if (tipo?.startsWith('ENTRADA')) return 'badge-success';
        if (tipo?.startsWith('SALIDA'))  return 'badge-error';
        if (tipo === 'TRASLADO')         return 'badge-accent';
        if (tipo === 'AJUSTE')           return 'badge-warning';
        return 'badge-neutral';
    }
}
