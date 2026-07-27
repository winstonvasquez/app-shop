import {
    Component, ChangeDetectionStrategy, DestroyRef, OnInit,
    inject, signal, computed
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import {
    DataTableComponent, TableColumn, TableAction,
    FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent, PaginationEvent
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, staticFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { PageHeaderComponent } from '@shared/ui/layout/page-header/page-header.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { ButtonComponent, CatalogSelectComponent } from '@shared/components';
import { CuentasBancariasService } from '../../services/cuentas-bancarias.service';
import { AuthService } from '@core/auth/auth.service';
import { CatalogService } from '@core/services/catalog.service';
import { BankAccount, BankAccountRequest, Page } from '../../models/tesoreria.model';
import { MONEDA, CURRENCY_DISPLAY } from '@shared/constants/sunat.constants';
import { PAGINATION } from '@shared/constants/app.constants';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';

@Component({
    selector: 'app-cuentas-bancarias',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        DecimalPipe, ReactiveFormsModule,
        DrawerComponent, DataTableComponent, PageHeaderComponent, FormFieldComponent,
        ButtonComponent, CatalogSelectComponent
    ],
    templateUrl: './cuentas-bancarias.component.html'
})
export class CuentasBancariasComponent implements OnInit {
    private cuentasService = inject(CuentasBancariasService);
    private auth           = inject(AuthService);
    private fb             = inject(FormBuilder);
    private destroyRef     = inject(DestroyRef);
    readonly catalog        = inject(CatalogService);

    cuentas          = signal<BankAccount[]>([]);
    cargando         = signal(false);
    guardando        = signal(false);
    errorMsg         = signal<string | null>(null);
    showCreateDrawer = signal(false);
    showEditDrawer   = signal(false);
    selectedCuenta   = signal<BankAccount | null>(null);

    currentPage   = signal(0);
    pageSize      = signal<number>(PAGINATION.defaultPageSize);
    totalElements = signal(0);
    totalPages    = signal(0);

    // Filtros (TODOS server-side — la vista nunca filtra la página cargada)
    searchQuery            = signal('');
    filterEstado           = signal('');
    filterTipoCuenta       = signal('');
    filterMoneda           = signal('');
    filterBanco            = signal('');
    filterCreatedAtDesde   = signal<string | null>(null);
    filterCreatedAtHasta   = signal<string | null>(null);

    /** Estado de cuenta: enum de dominio (AccountStatus), sin catálogo dedicado en erp_parameters. */
    filters: FilterConfig[] = [
        staticFilter('estado', 'Estado', [
            { value: 'ACTIVA', label: 'Activa' },
            { value: 'INACTIVA', label: 'Inactiva' },
            { value: 'BLOQUEADA', label: 'Bloqueada' },
        ]),
        catalogFilter(this.catalog, 'TIPO_CUENTA_BANCARIA', 'tipoCuenta', 'Tipo de cuenta'),
        catalogFilter(this.catalog, 'MONEDA', 'moneda', 'Moneda'),
        catalogFilter(this.catalog, 'BANCO', 'banco', 'Banco'),
    ];

    /** Rango de fecha de registro para el toolbar del data-table. */
    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'createdAt', label: 'Fecha de registro' }
    ];

    saldoTotalPEN = computed(() =>
        this.cuentas()
            .filter(c => c.moneda === MONEDA.PEN && c.estado === 'ACTIVA' && c.tipoCuenta !== 'DETRACCIONES')
            .reduce((s, c) => s + (c.saldoActual ?? 0), 0)
    );

    saldoTotalUSD = computed(() =>
        this.cuentas()
            .filter(c => c.moneda === MONEDA.USD && c.estado === 'ACTIVA')
            .reduce((s, c) => s + (c.saldoActual ?? 0), 0)
    );

    saldoDetracciones = computed(() =>
        this.cuentas()
            .filter(c => c.tipoCuenta === 'DETRACCIONES' && c.estado === 'ACTIVA')
            .reduce((s, c) => s + (c.saldoActual ?? 0), 0)
    );

    cuentasPEN = computed(() =>
        this.cuentas().filter(c => c.moneda === MONEDA.PEN && c.estado === 'ACTIVA').length
    );

    cuentasUSD = computed(() =>
        this.cuentas().filter(c => c.moneda === MONEDA.USD && c.estado === 'ACTIVA').length
    );

    createForm: FormGroup = this.fb.group({
        banco:               ['', Validators.required],
        numeroCuenta:        ['', Validators.required],
        tipoCuenta:          ['CORRIENTE', Validators.required],
        moneda:              [MONEDA.PEN, Validators.required],
        saldoInicial:        [0, [Validators.required, Validators.min(0)]],
        cuentaInterbancaria: [''],
        descripcion:         ['']
    });

    editForm: FormGroup = this.fb.group({
        banco:               ['', Validators.required],
        numeroCuenta:        ['', Validators.required],
        tipoCuenta:          ['CORRIENTE', Validators.required],
        moneda:              [MONEDA.PEN, Validators.required],
        saldoInicial:        [0, [Validators.required, Validators.min(0)]],
        cuentaInterbancaria: [''],
        descripcion:         ['']
    });

    columns: TableColumn<BankAccount>[] = [
        { key: 'banco',               label: 'Banco',        sortable: true },
        { key: 'numeroCuenta',        label: 'N° Cuenta',    render: r => `<span class="font-mono">${r.numeroCuenta}</span>`, html: true },
        { key: 'cuentaInterbancaria', label: 'CCI',          render: r => r.cuentaInterbancaria
            ? `<span class="font-mono" style="font-size:0.8rem">${r.cuentaInterbancaria}</span>`
            : '—', html: true },
        { key: 'tipoCuenta',          label: 'Tipo',         align: 'center', html: true,
          render: r => `<span class="${this.badgeTipo(r.tipoCuenta)}">${r.tipoCuenta}</span>` },
        { key: 'moneda',              label: 'Moneda',       align: 'center' },
        { key: 'saldoActual',         label: 'Saldo Actual', align: 'right',
          render: r => `${r.moneda === MONEDA.USD ? CURRENCY_DISPLAY.SYMBOL_USD : CURRENCY_DISPLAY.SYMBOL_PEN} ${(r.saldoActual ?? 0).toFixed(2)}` },
        { key: 'estado',              label: 'Estado',       align: 'center', html: true,
          render: r => `<span class="${this.badgeEstado(r.estado)}">${r.estado}</span>` }
    ];

    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.treasury}/api/tesoreria/cuentas-bancarias/export`,
        filename: 'cuentas-bancarias',
        params: () => ({
            tenantId: this.auth.currentUser()?.activeCompanyId ?? 1,
            estado: this.filterEstado(),
            tipoCuenta: this.filterTipoCuenta(),
            moneda: this.filterMoneda(),
            banco: this.filterBanco(),
            createdAtDesde: this.filterCreatedAtDesde() ?? undefined,
            createdAtHasta: this.filterCreatedAtHasta() ?? undefined,
            search: this.searchQuery(),
        })
    };

    actions: TableAction<BankAccount>[] = [
        { label: 'Editar',      icon: '✏️',  class: 'btn-icon-edit',
          show: () => true,
          onClick: r => this.openEditDrawer(r) },
        { label: 'Desactivar',  icon: '🔒',  class: 'btn-view',
          show: r => r.estado === 'ACTIVA',
          onClick: r => this.changeStatus(r, 'INACTIVA') },
        { label: 'Activar',     icon: '🔓',  class: 'btn-view',
          show: r => r.estado !== 'ACTIVA',
          onClick: r => this.changeStatus(r, 'ACTIVA') }
    ];

    ngOnInit(): void { this.load(); }

    load(): void {
        this.cargando.set(true);
        this.cuentasService.getAll({
            page: this.currentPage(),
            size: this.pageSize(),
            estado: this.filterEstado() || undefined,
            tipoCuenta: this.filterTipoCuenta() || undefined,
            moneda: this.filterMoneda() || undefined,
            banco: this.filterBanco() || undefined,
            createdAtDesde: this.filterCreatedAtDesde() || undefined,
            createdAtHasta: this.filterCreatedAtHasta() || undefined,
            search: this.searchQuery() || undefined,
        })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (res: Page<BankAccount> | BankAccount[]) => {
                    const data = Array.isArray(res) ? res : (res as Page<BankAccount>).content;
                    this.cuentas.set(data);
                    this.totalElements.set(Array.isArray(res) ? data.length : (res as Page<BankAccount>).totalElements);
                    this.totalPages.set(Array.isArray(res) ? 1 : (res as Page<BankAccount>).totalPages);
                    this.cargando.set(false);
                },
                error: () => this.cargando.set(false)
            });
    }

    /** La búsqueda por texto también va al backend (`search`), no filtra la página cargada. */
    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.load();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'estado':     this.filterEstado.set(valor); break;
            case 'tipoCuenta': this.filterTipoCuenta.set(valor); break;
            case 'moneda':     this.filterMoneda.set(valor); break;
            case 'banco':      this.filterBanco.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.load();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field === 'createdAt') {
            this.filterCreatedAtDesde.set(event.from);
            this.filterCreatedAtHasta.set(event.to);
            this.currentPage.set(0);
            this.load();
        }
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterEstado.set('');
        this.filterTipoCuenta.set('');
        this.filterMoneda.set('');
        this.filterBanco.set('');
        this.filterCreatedAtDesde.set(null);
        this.filterCreatedAtHasta.set(null);
        this.currentPage.set(0);
        this.load();
    }

    onPageChange(event: PaginationEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.load();
    }

    openCreateDrawer(): void {
        this.createForm.reset({
            banco: '', numeroCuenta: '', tipoCuenta: 'CORRIENTE',
            moneda: MONEDA.PEN, saldoInicial: 0, cuentaInterbancaria: '', descripcion: ''
        });
        this.errorMsg.set(null);
        this.showCreateDrawer.set(true);
    }

    crearCuenta(): void {
        if (this.createForm.invalid) { this.createForm.markAllAsTouched(); return; }
        this.guardando.set(true);
        const req: BankAccountRequest = {
            ...this.createForm.value,
            tenantId: this.auth.currentUser()?.activeCompanyId ?? 1
        };
        this.cuentasService.create(req)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.showCreateDrawer.set(false);
                    this.guardando.set(false);
                    this.load();
                },
                error: (err: { error?: { detail?: string } }) => {
                    this.errorMsg.set(err?.error?.detail ?? 'Error al crear cuenta bancaria');
                    this.guardando.set(false);
                }
            });
    }

    openEditDrawer(cuenta: BankAccount): void {
        this.selectedCuenta.set(cuenta);
        this.editForm.reset({
            banco:               cuenta.banco,
            numeroCuenta:        cuenta.numeroCuenta,
            tipoCuenta:          cuenta.tipoCuenta,
            moneda:              cuenta.moneda,
            saldoInicial:        cuenta.saldoActual,
            cuentaInterbancaria: cuenta.cuentaInterbancaria ?? '',
            descripcion:         cuenta.descripcion ?? ''
        });
        this.errorMsg.set(null);
        this.showEditDrawer.set(true);
    }

    actualizarCuenta(): void {
        const cuenta = this.selectedCuenta();
        if (!cuenta?.id || this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
        this.guardando.set(true);
        const req: BankAccountRequest = {
            ...this.editForm.value,
            tenantId: this.auth.currentUser()?.activeCompanyId ?? 1
        };
        this.cuentasService.update(cuenta.id, req)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.showEditDrawer.set(false);
                    this.guardando.set(false);
                    this.load();
                },
                error: (err: { error?: { detail?: string } }) => {
                    this.errorMsg.set(err?.error?.detail ?? 'Error al actualizar cuenta bancaria');
                    this.guardando.set(false);
                }
            });
    }

    changeStatus(cuenta: BankAccount, estado: string): void {
        if (!cuenta.id) return;
        this.cuentasService.changeStatus(cuenta.id, estado)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => this.load(),
                error: (err: { error?: { detail?: string } }) =>
                    this.errorMsg.set(err?.error?.detail ?? 'Error al cambiar estado')
            });
    }

    getControl(form: FormGroup, name: string): FormControl {
        return form.get(name) as FormControl;
    }

    badgeTipo(tipo: string): string {
        const map: Record<string, string> = {
            CORRIENTE:    'badge badge-accent',
            AHORROS:      'badge badge-success',
            CTS:          'badge badge-neutral',
            DETRACCIONES: 'badge badge-warning'
        };
        return map[tipo] ?? 'badge';
    }

    badgeEstado(estado: string): string {
        const map: Record<string, string> = {
            ACTIVA:   'badge badge-success',
            INACTIVA: 'badge badge-neutral',
            BLOQUEADA:'badge badge-error'
        };
        return map[estado] ?? 'badge';
    }
}
