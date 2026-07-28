import {
    Component, DestroyRef, OnInit, inject, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { map, of } from 'rxjs';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import {
    DataTableComponent, TableColumn, TableAction,
    FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent
} from '@shared/ui/tables/data-table/data-table.component';
import { PageHeaderComponent } from '@shared/ui/layout/page-header/page-header.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { DatePickerComponent } from '@shared/ui/forms/date-picker/date-picker.component';
import { ButtonComponent, CatalogSelectComponent } from '@shared/components';
import { CatalogService } from '@core/services/catalog.service';
import { PagosService } from '../../services/pagos.service';
import { CuentasBancariasService } from '../../services/cuentas-bancarias.service';
import { AuthService } from '@core/auth/auth.service';
import { Payment, PaymentRequest, Page, BankAccount } from '../../models/tesoreria.model';
import { MONEDA, CURRENCY_DISPLAY } from '@shared/constants/sunat.constants';
import { PAGINATION } from '@shared/constants/app.constants';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';

@Component({
    selector: 'app-pagos',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        DecimalPipe, ReactiveFormsModule,
        DrawerComponent, DataTableComponent, PageHeaderComponent, FormFieldComponent, DatePickerComponent,
        ButtonComponent, CatalogSelectComponent
    ],
    templateUrl: './pagos.component.html'
})
export class PagosComponent implements OnInit {
    private pagosService = inject(PagosService);
    private cuentasService = inject(CuentasBancariasService);
    private auth         = inject(AuthService);
    private fb           = inject(FormBuilder);
    private destroyRef   = inject(DestroyRef);
    private readonly catalog = inject(CatalogService);

    pagos         = signal<Payment[]>([]);
    cargando      = signal(false);
    guardando     = signal(false);
    errorMsg      = signal<string | null>(null);
    showCreateDrawer = signal(false);

    currentPage   = signal(0);
    pageSize      = signal<number>(PAGINATION.defaultPageSize);
    totalElements = signal(0);
    totalPages    = signal(0);

    // ── Filtros server-side ──────────────────────────────────────────────
    filterEstado     = signal('');
    filterTipoPago   = signal('');
    filterMetodoPago = signal('');
    filterFechaSolicitudDesde = signal<string | null>(null);
    filterFechaSolicitudHasta = signal<string | null>(null);

    readonly filters: FilterConfig[] = [
        {
            field: 'estado',
            label: 'Estado',
            options: of([
                { value: 'PENDING', label: 'Pendiente' },
                { value: 'APPROVED', label: 'Aprobado' },
                { value: 'PAID', label: 'Pagado' },
                { value: 'REJECTED', label: 'Rechazado' },
            ])
        },
        {
            field: 'tipoPago',
            label: 'Tipo de pago',
            options: toObservable(this.catalog.options('TIPO_PAGO')).pipe(
                map(o => o.map(x => ({ value: x.codigo, label: x.valor })))
            )
        },
        {
            field: 'metodoPago',
            label: 'Método de pago',
            options: toObservable(this.catalog.options('METODO_PAGO')).pipe(
                map(o => o.map(x => ({ value: x.codigo, label: x.valor })))
            )
        },
    ];

    readonly dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fechaSolicitud', label: 'Fecha de solicitud' }
    ];

    pagoForm: FormGroup = this.fb.group({
        beneficiarioNombre:    ['', [Validators.required, Validators.minLength(2)]],
        beneficiarioDocumento: [''],
        concepto:              ['', [Validators.required, Validators.minLength(3)]],
        monto:                 [null, [Validators.required, Validators.min(0.01)]],
        tipoPago:              ['PROVEEDOR', Validators.required],
        metodoPago:            ['TRANSFERENCIA', Validators.required],
        moneda:                [MONEDA.PEN, Validators.required],
        bankAccountId:         [null],
        fechaSolicitud:        ['', Validators.required],
    });

    /** Moneda elegida en el drawer, en sync con el FormControl (ver subscribeMonedaChanges). */
    selectedMoneda = signal<string>(MONEDA.PEN);
    /** Cuentas bancarias ACTIVAs del tenant, cargadas una vez al abrir el drawer. */
    cuentasBancarias = signal<BankAccount[]>([]);
    /**
     * Un pago solo puede salir de una cuenta en la MISMA moneda del pago: mezclar
     * (ej. pago en USD desde una cuenta PEN) deja el monto sin sentido cambiario.
     * Se filtra aquí en vez de dejar que el usuario elija cualquier cuenta.
     */
    cuentasFiltradas = computed(() =>
        this.cuentasBancarias().filter(c => c.moneda === this.selectedMoneda())
    );

    countPendientes   = computed(() => this.pagos().filter(p => p.estado === 'PENDING').length);
    countAprobados    = computed(() => this.pagos().filter(p => p.estado === 'APPROVED').length);
    countPagados      = computed(() => this.pagos().filter(p => p.estado === 'PAID').length);
    /**
     * Separado por moneda (igual que saldoTotalPEN/USD en cuentas-bancarias.component.ts):
     * sumar PEN + USD en una sola cifra no significa nada una vez que un pago puede ser en USD.
     */
    totalComprometidoPEN = computed(() =>
        this.pagos()
            .filter(p => (p.estado === 'PENDING' || p.estado === 'APPROVED') && (p.moneda ?? MONEDA.PEN) === MONEDA.PEN)
            .reduce((s, p) => s + (p.monto ?? 0), 0)
    );
    totalComprometidoUSD = computed(() =>
        this.pagos()
            .filter(p => (p.estado === 'PENDING' || p.estado === 'APPROVED') && p.moneda === MONEDA.USD)
            .reduce((s, p) => s + (p.monto ?? 0), 0)
    );

    columns: TableColumn<Payment>[] = [
        { key: 'fechaSolicitud', label: 'Fecha',
          render: r => r.fechaSolicitud ? new Date(r.fechaSolicitud).toLocaleDateString('es-PE') : '—' },
        { key: 'beneficiarioNombre', label: 'Beneficiario',
          render: r => r.beneficiarioNombre ?? '—' },
        { key: 'concepto', label: 'Concepto',
          render: r => r.concepto ?? '—' },
        { key: 'tipoPago', label: 'Tipo', html: true,
          render: r => `<span class="badge badge-neutral">${r.tipoPago}</span>` },
        { key: 'monto', label: 'Monto', align: 'right',
          render: r => `${r.moneda === MONEDA.USD ? CURRENCY_DISPLAY.SYMBOL_USD : CURRENCY_DISPLAY.SYMBOL_PEN} ${(r.monto ?? 0).toFixed(2)}` },
        { key: 'estado', label: 'Estado', align: 'center', html: true,
          render: r => `<span class="${this.badgePago(r.estado)}">${r.estado}</span>` },
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios,
     * respetando los mismos filtros activos en la vista.
     * Ver GET /api/tesoreria/pagos/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.treasury}/api/tesoreria/pagos/export`,
        filename: 'pagos',
        params: () => ({
            tenantId: this.auth.currentUser()?.activeCompanyId ?? 1,
            estado: this.filterEstado() || undefined,
            tipoPago: this.filterTipoPago() || undefined,
            metodoPago: this.filterMetodoPago() || undefined,
            fechaSolicitudDesde: this.filterFechaSolicitudDesde() ?? undefined,
            fechaSolicitudHasta: this.filterFechaSolicitudHasta() ?? undefined,
        }),
    };

    actions: TableAction<Payment>[] = [
        { label: 'Aprobar',  icon: '✓', class: 'btn-view',
          show: r => r.estado === 'PENDING',
          onClick: r => this.approve(r) },
        { label: 'Rechazar', icon: '✕', class: 'btn-view',
          show: r => r.estado === 'PENDING',
          onClick: r => this.reject(r) },
        { label: 'Pagar',    icon: '💳', class: 'btn-view',
          show: r => r.estado === 'APPROVED',
          onClick: r => this.pay(r) },
    ];

    ngOnInit(): void {
        this.load();
        this.subscribeMonedaChanges();
    }

    /**
     * Sincroniza `selectedMoneda` con el FormControl "moneda" y limpia
     * "bankAccountId" al cambiar de moneda: la cuenta elegida podría ya no
     * estar en la lista filtrada (ver cuentasFiltradas).
     */
    private subscribeMonedaChanges(): void {
        this.pagoForm.get('moneda')!.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((moneda: string) => {
                this.selectedMoneda.set(moneda ?? MONEDA.PEN);
                this.pagoForm.get('bankAccountId')!.setValue(null, { emitEvent: false });
            });
    }

    /** Cuentas bancarias activas para el <select> de "bankAccountId" del drawer. */
    private loadCuentasBancarias(): void {
        this.cuentasService.getAll({ estado: 'ACTIVA', size: 100 })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (res) => {
                    const data: BankAccount[] = Array.isArray(res) ? res : (res as Page<BankAccount>).content;
                    this.cuentasBancarias.set(data);
                },
                error: () => this.cuentasBancarias.set([])
            });
    }

    load(): void {
        this.cargando.set(true);
        this.pagosService.getAll(this.currentPage(), this.pageSize(), {
            estado: this.filterEstado() || undefined,
            tipoPago: this.filterTipoPago() || undefined,
            metodoPago: this.filterMetodoPago() || undefined,
            fechaSolicitudDesde: this.filterFechaSolicitudDesde() ?? undefined,
            fechaSolicitudHasta: this.filterFechaSolicitudHasta() ?? undefined,
        })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (res: Page<Payment> | Payment[]) => {
                    const data = Array.isArray(res) ? res : (res as Page<Payment>).content;
                    this.pagos.set(data);
                    this.totalElements.set(Array.isArray(res) ? data.length : (res as Page<Payment>).totalElements);
                    this.totalPages.set(Array.isArray(res) ? 1 : (res as Page<Payment>).totalPages);
                    this.cargando.set(false);
                },
                error: () => this.cargando.set(false)
            });
    }

    onPageChange(event: { page: number; size: number }): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.load();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        if (event.field === 'estado') {
            this.filterEstado.set(event.value ? String(event.value) : '');
        } else if (event.field === 'tipoPago') {
            this.filterTipoPago.set(event.value ? String(event.value) : '');
        } else if (event.field === 'metodoPago') {
            this.filterMetodoPago.set(event.value ? String(event.value) : '');
        } else {
            return;
        }
        this.currentPage.set(0);
        this.load();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        this.filterFechaSolicitudDesde.set(event.from ?? null);
        this.filterFechaSolicitudHasta.set(event.to ?? null);
        this.currentPage.set(0);
        this.load();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.filterEstado.set('');
        this.filterTipoPago.set('');
        this.filterMetodoPago.set('');
        this.filterFechaSolicitudDesde.set(null);
        this.filterFechaSolicitudHasta.set(null);
        this.currentPage.set(0);
        this.load();
    }

    openCreateDrawer(): void {
        const today = new Date().toISOString().split('T')[0];
        this.pagoForm.reset({
            tipoPago: 'PROVEEDOR', metodoPago: 'TRANSFERENCIA', moneda: MONEDA.PEN,
            bankAccountId: null, fechaSolicitud: today, monto: null
        });
        this.selectedMoneda.set(MONEDA.PEN);
        this.loadCuentasBancarias();
        this.errorMsg.set(null);
        this.showCreateDrawer.set(true);
    }

    registrarPago(): void {
        if (this.pagoForm.invalid) { this.pagoForm.markAllAsTouched(); return; }
        this.guardando.set(true);
        const v = this.pagoForm.value;
        const req: PaymentRequest = {
            tenantId:              this.auth.currentUser()?.activeCompanyId ?? 1,
            tipoPago:              v.tipoPago,
            monto:                 v.monto,
            moneda:                v.moneda ?? MONEDA.PEN,
            metodoPago:            v.metodoPago,
            fechaSolicitud:        v.fechaSolicitud,
            beneficiarioNombre:    v.beneficiarioNombre,
            beneficiarioDocumento: v.beneficiarioDocumento ?? '',
            concepto:              v.concepto,
            bankAccountId:         v.bankAccountId ?? undefined
        };
        this.pagosService.create(req)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => { this.showCreateDrawer.set(false); this.guardando.set(false); this.load(); },
                error: (err: { error?: { detail?: string } }) => {
                    this.errorMsg.set(err?.error?.detail ?? 'Error al registrar pago');
                    this.guardando.set(false);
                }
            });
    }

    approve(p: Payment): void {
        if (p.id) {
            this.cargando.set(true);
            this.pagosService.approve(p.id)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: () => this.load(),
                    error: (err: { error?: { detail?: string } }) => {
                        this.errorMsg.set(err?.error?.detail ?? 'Error al procesar operación');
                        this.cargando.set(false);
                    }
                });
        }
    }

    reject(p: Payment): void {
        if (p.id) {
            this.cargando.set(true);
            this.pagosService.reject(p.id)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: () => this.load(),
                    error: (err: { error?: { detail?: string } }) => {
                        this.errorMsg.set(err?.error?.detail ?? 'Error al procesar operación');
                        this.cargando.set(false);
                    }
                });
        }
    }

    pay(p: Payment): void {
        if (p.id) {
            this.cargando.set(true);
            this.pagosService.markAsPaid(p.id)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: () => this.load(),
                    error: (err: { error?: { detail?: string } }) => {
                        this.errorMsg.set(err?.error?.detail ?? 'Error al procesar operación');
                        this.cargando.set(false);
                    }
                });
        }
    }

    badgePago(estado: string): string {
        const map: Record<string, string> = {
            PENDING:  'badge badge-warning',
            APPROVED: 'badge badge-accent',
            PAID:     'badge badge-success',
            REJECTED: 'badge badge-error',
        };
        return map[estado] ?? 'badge badge-neutral';
    }

    getControl(name: string): FormControl {
        return this.pagoForm.get(name) as FormControl;
    }
}
