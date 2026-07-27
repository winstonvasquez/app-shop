import {
    Component, DestroyRef, OnInit, inject, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { of } from 'rxjs';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn, FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { CatalogService } from '@core/services/catalog.service';
import { PageHeaderComponent } from '@shared/ui/layout/page-header/page-header.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { DatePickerComponent } from '@shared/ui/forms/date-picker/date-picker.component';
import { ButtonComponent, CatalogSelectComponent } from '@shared/components';
import { MovimientosFinancierosService, FinancialMovementRequest } from '../../services/movimientos-financieros.service';
import { AuthService } from '@core/auth/auth.service';
import { FinancialMovement } from '../../models/tesoreria.model';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { MONEDA, CURRENCY_DISPLAY } from '@shared/constants/sunat.constants';
import { PAGINATION } from '@shared/constants/app.constants';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';

@Component({
    selector: 'app-flujo-caja',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        DecimalPipe, ReactiveFormsModule,
        DrawerComponent, DataTableComponent, PageHeaderComponent, FormFieldComponent, DatePickerComponent,
        ButtonComponent, CatalogSelectComponent
    ],
    templateUrl: './flujo-caja.component.html'
})
export class FlujoCajaComponent implements OnInit {
    private movService  = inject(MovimientosFinancierosService);
    private readonly catalog = inject(CatalogService);
    private auth        = inject(AuthService);
    private fb          = inject(FormBuilder);
    private destroyRef  = inject(DestroyRef);

    movimientos      = signal<FinancialMovement[]>([]);
    cargando         = signal(false);
    guardando        = signal(false);
    errorMsg         = signal<string | null>(null);
    showCreateDrawer = signal(false);
    flujoCajaNeto    = signal<number>(0);

    currentPage   = signal(0);
    pageSize      = signal<number>(PAGINATION.defaultPageSize);
    totalElements = signal(0);
    totalPages    = signal(0);

    fechaInicio = signal<string>('');
    fechaFin    = signal<string>('');
    filterTipoMovimiento = signal('');
    filterOrigen         = signal('');
    filterMoneda         = signal('');
    searchQuery          = signal('');

    readonly filters: FilterConfig[] = [
        catalogFilter(this.catalog, 'MONEDA', 'moneda', 'Moneda'),
        {
            field: 'tipoMovimiento',
            label: 'Tipo',
            options: of([
                { value: 'INGRESO', label: 'Ingreso' },
                { value: 'EGRESO', label: 'Egreso' },
                { value: 'TRANSFERENCIA', label: 'Transferencia' },
            ])
        },
        {
            field: 'origen',
            label: 'Origen',
            options: of([
                { value: 'CAJA', label: 'Caja' },
                { value: 'BANCO', label: 'Banco' },
                { value: 'COBRO', label: 'Cobro' },
                { value: 'PAGO', label: 'Pago' },
                { value: 'TRANSFERENCIA_INTERNA', label: 'Transferencia interna' },
            ])
        },
    ];

    movimientoForm: FormGroup = this.fb.group({
        tipoMovimiento: ['INGRESO', Validators.required],
        origen:         ['', Validators.required],
        descripcion:    ['', [Validators.required, Validators.minLength(3)]],
        monto:          [null, [Validators.required, Validators.min(0.01)]],
        moneda:         [MONEDA.PEN],
        fecha:          ['', Validators.required],
        cajaId:         [null],
    });

    ingresos = computed(() =>
        this.movimientos()
            .filter(m => m.tipoMovimiento === 'INGRESO')
            .reduce((s, m) => s + (m.monto ?? 0), 0)
    );

    egresos = computed(() =>
        this.movimientos()
            .filter(m => m.tipoMovimiento === 'EGRESO')
            .reduce((s, m) => s + (m.monto ?? 0), 0)
    );

    columns: TableColumn<FinancialMovement>[] = [
        { key: 'fecha', label: 'Fecha',
          render: r => r.fecha ? new Date(r.fecha).toLocaleDateString('es-PE') : '—' },
        { key: 'tipoMovimiento', label: 'Tipo', html: true,
          render: r => `<span class="${this.badgeMovimiento(r.tipoMovimiento)}">${r.tipoMovimiento}</span>` },
        { key: 'origen',     label: 'Origen',      render: r => r.origen ?? '—' },
        { key: 'descripcion', label: 'Descripción', render: r => r.descripcion ?? '—' },
        { key: 'monto', label: 'Monto', align: 'right',
          render: r => {
              const sign = r.tipoMovimiento === 'INGRESO' ? '+' : r.tipoMovimiento === 'EGRESO' ? '-' : '';
              return `${sign}${CURRENCY_DISPLAY.SYMBOL_PEN} ${(r.monto ?? 0).toFixed(2)}`;
          }
        },
        { key: 'moneda', label: 'Moneda', align: 'center', render: r => r.moneda ?? MONEDA.PEN },
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * respetando TODOS los filtros vigentes. Ver GET /treasury/api/tesoreria/movimientos/export.
     * OJO: el endpoint renombró `fechaInicio`/`fechaFin` a `fechaDesde`/`fechaHasta`
     * para unificarse con el GET del listado.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.treasury}/api/tesoreria/movimientos/export`,
        filename: 'flujo-caja',
        params: () => ({
            tenantId: this.auth.currentUser()?.activeCompanyId ?? 1,
            fechaDesde: this.fechaInicio(),
            fechaHasta: this.fechaFin(),
            tipoMovimiento: this.filterTipoMovimiento() || undefined,
            origen: this.filterOrigen() || undefined,
            moneda: this.filterMoneda() || undefined,
            q: this.searchQuery() || undefined,
        }),
    };

    ngOnInit(): void {
        const today    = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        this.fechaFin.set(today.toISOString().split('T')[0]);
        this.fechaInicio.set(firstDay.toISOString().split('T')[0]);
        this.loadData();
    }

    /** Rango de fecha del movimiento en el toolbar del data-table. */
    readonly dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fecha', label: 'Fecha del movimiento' }
    ];

    loadData(): void {
        this.cargando.set(true);

        this.movService.getFlujoCaja(this.fechaInicio(), this.fechaFin())
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (val) => this.flujoCajaNeto.set(val),
                error: () => this.cargando.set(false)
            });

        this.movService.getAll({
            fechaDesde: this.fechaInicio() || undefined,
            fechaHasta: this.fechaFin() || undefined,
            tipoMovimiento: this.filterTipoMovimiento() || undefined,
            origen: this.filterOrigen() || undefined,
            moneda: this.filterMoneda() || undefined,
            q: this.searchQuery() || undefined,
            page: this.currentPage(),
            size: this.pageSize(),
        })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (res) => {
                    this.movimientos.set(res.content);
                    this.totalElements.set(pageTotalElements(res));
                    this.totalPages.set(pageTotalPages(res));
                    this.cargando.set(false);
                },
                error: () => this.cargando.set(false)
            });
    }

    onPageChange(event: { page: number; size: number }): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadData();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'tipoMovimiento': this.filterTipoMovimiento.set(valor); break;
            case 'origen':         this.filterOrigen.set(valor); break;
            case 'moneda':         this.filterMoneda.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadData();
    }

    /** La búsqueda por texto va al backend (`q`), no filtra la página cargada. */
    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.loadData();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field !== 'fecha') return;
        this.fechaInicio.set(event.from ?? '');
        this.fechaFin.set(event.to ?? '');
        this.currentPage.set(0);
        this.loadData();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterTipoMovimiento.set('');
        this.filterOrigen.set('');
        this.filterMoneda.set('');
        this.currentPage.set(0);
        this.loadData();
    }

    consultar(): void {
        this.currentPage.set(0);
        this.loadData();
    }

    openCreateDrawer(): void {
        const today = new Date().toISOString().split('T')[0];
        this.movimientoForm.reset({ tipoMovimiento: 'INGRESO', moneda: MONEDA.PEN, fecha: today, monto: null, origen: '', descripcion: '', cajaId: null });
        this.errorMsg.set(null);
        this.showCreateDrawer.set(true);
    }

    registrarMovimiento(): void {
        if (this.movimientoForm.invalid) { this.movimientoForm.markAllAsTouched(); return; }
        this.guardando.set(true);
        const v = this.movimientoForm.value;
        const req: FinancialMovementRequest = {
            tenantId:       this.auth.currentUser()?.activeCompanyId ?? 1,
            tipoMovimiento: v.tipoMovimiento,
            origen:         v.origen,
            monto:          v.monto,
            moneda:         v.moneda ?? MONEDA.PEN,
            fecha:          v.fecha,
            descripcion:    v.descripcion,
            cajaId:         v.cajaId ?? undefined,
        };
        this.movService.registerMovement(req)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.showCreateDrawer.set(false);
                    this.guardando.set(false);
                    this.loadData();
                },
                error: (err: { error?: { detail?: string } }) => {
                    this.errorMsg.set(err?.error?.detail ?? 'Error al registrar movimiento');
                    this.guardando.set(false);
                }
            });
    }

    getControl(name: string): FormControl {
        return this.movimientoForm.get(name) as FormControl;
    }

    badgeMovimiento(tipo: string): string {
        const map: Record<string, string> = {
            INGRESO:       'badge badge-success',
            EGRESO:        'badge badge-warning',
            TRANSFERENCIA: 'badge badge-accent',
        };
        return map[tipo] ?? 'badge badge-neutral';
    }
}
