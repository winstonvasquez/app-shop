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
import { CajasService } from '../../services/cajas.service';
import { CuentasBancariasService } from '../../services/cuentas-bancarias.service';
import { AuthService } from '@core/auth/auth.service';
import { FinancialMovement, Page, BankAccount } from '../../models/tesoreria.model';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { MONEDA, CURRENCY_DISPLAY } from '@shared/constants/sunat.constants';
import { PAGINATION } from '@shared/constants/app.constants';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';

/**
 * Origen del movimiento: enum de dominio (MovementOrigin) en el backend, sin
 * @JsonCreator ni deserialización laxa — cualquier texto que no coincida EXACTO
 * devuelve 400. Se reutiliza tanto en el filtro de la tabla como en el drawer.
 */
const ORIGEN_MOVIMIENTO_OPTIONS: { value: string; label: string }[] = [
    { value: 'CAJA', label: 'Caja' },
    { value: 'BANCO', label: 'Banco' },
    { value: 'COBRO', label: 'Cobro' },
    { value: 'PAGO', label: 'Pago' },
    { value: 'TRANSFERENCIA_INTERNA', label: 'Transferencia interna' },
];

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
    private cajasService = inject(CajasService);
    private cuentasService = inject(CuentasBancariasService);
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
            options: of(ORIGEN_MOVIMIENTO_OPTIONS)
        },
    ];

    /** Opciones del enum MovementOrigin para el <select> del drawer. */
    readonly origenOptions = ORIGEN_MOVIMIENTO_OPTIONS;

    /** Origen elegido en el drawer, en sync con el FormControl (ver subscribeOrigenChanges). */
    selectedOrigen = signal<string>('');
    /** Cajas ABIERTAs del tenant, para el <select> de "origenId" cuando origen=CAJA. */
    cajasOptions   = signal<{ value: number; label: string }[]>([]);
    /** Cuentas bancarias ACTIVAs del tenant, para el <select> de "origenId" cuando origen=BANCO. */
    cuentasOptions = signal<{ value: number; label: string }[]>([]);

    movimientoForm: FormGroup = this.fb.group({
        tipoMovimiento: ['INGRESO', Validators.required],
        origen:         ['', Validators.required],
        descripcion:    ['', [Validators.required, Validators.minLength(3)]],
        monto:          [null, [Validators.required, Validators.min(0.01)]],
        moneda:         [MONEDA.PEN],
        fecha:          ['', Validators.required],
        origenId:       [null],
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
        this.loadOrigenRefOptions();
        this.subscribeOrigenChanges();
    }

    /**
     * Cajas y cuentas bancarias para los <select> de "origenId" (ver subscribeOrigenChanges).
     *
     * Cajas: se listan TODAS (abiertas y cerradas), no solo ABIERTA — un movimiento retroactivo
     * (ej. un ajuste registrado después del cierre de turno) debe poder imputarse a una caja ya
     * cerrada. Las cerradas se marcan en la etiqueta para que el usuario sepa lo que elige.
     */
    private loadOrigenRefOptions(): void {
        this.cajasService.getAll({ size: 100 })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (res) => this.cajasOptions.set(
                    res.content.filter(c => c.id != null).map(c => ({
                        value: c.id as number,
                        label: c.estado === 'CERRADA' ? `${c.nombre} (cerrada)` : c.nombre
                    }))
                ),
                error: () => this.cajasOptions.set([])
            });

        this.cuentasService.getAll({ estado: 'ACTIVA', size: 100 })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (res) => {
                    const data: BankAccount[] = Array.isArray(res) ? res : (res as Page<BankAccount>).content;
                    this.cuentasOptions.set(
                        data.filter(c => c.id != null).map(c => ({ value: c.id as number, label: `${c.banco} - ${c.numeroCuenta}` }))
                    );
                },
                error: () => this.cuentasOptions.set([])
            });
    }

    /**
     * Sincroniza `selectedOrigen` con el FormControl "origen" y controla
     * "origenId": limpia su valor al cambiar de origen (una caja no es una
     * cuenta bancaria) y lo deshabilita para COBRO/PAGO/TRANSFERENCIA_INTERNA,
     * donde todavía no hay catálogo de origen que ofrecer. Usar `.disable()`
     * (NO `[disabled]` en el template): sobre `formControlName` ese atributo
     * solo emite un warning y el control sigue habilitado.
     */
    private subscribeOrigenChanges(): void {
        this.movimientoForm.get('origen')!.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((origen: string) => {
                this.selectedOrigen.set(origen ?? '');
                const origenIdCtrl = this.movimientoForm.get('origenId')!;
                origenIdCtrl.setValue(null, { emitEvent: false });
                if (origen === 'CAJA' || origen === 'BANCO') {
                    origenIdCtrl.enable({ emitEvent: false });
                } else {
                    origenIdCtrl.disable({ emitEvent: false });
                }
            });
    }

    /**
     * Rango de fecha del movimiento en el toolbar del data-table. Es computado
     * para que el periodo por defecto (mes en curso) se vea ya cargado en los
     * campos en vez de aparecer vacío mientras la tabla muestra ese periodo.
     */
    readonly dateRangeFilters = computed<DateRangeFilterConfig[]>(() => [
        { field: 'fecha', label: 'Fecha del movimiento', from: this.fechaInicio(), to: this.fechaFin() }
    ]);

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

    openCreateDrawer(): void {
        const today = new Date().toISOString().split('T')[0];
        this.movimientoForm.reset({ tipoMovimiento: 'INGRESO', moneda: MONEDA.PEN, fecha: today, monto: null, origen: '', descripcion: '', origenId: null });
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
            origenId:       v.origenId ?? undefined,
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
