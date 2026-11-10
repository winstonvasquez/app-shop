import {
    Component, DestroyRef, OnInit, inject, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
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
import { CajasService, CajaRequest, CajaUpdateRequest } from '../../services/cajas.service';
import { construirAbrirRequest, diferenciaMonto, textoDiferenciaCierre } from './cajas.form';
import { mensajeDeErrorHttp } from '@core/utils/http-error.util';
import { HttpErrorResponse } from '@angular/common/http';
import { CashRegister, Page } from '../../models/tesoreria.model';
import { PAGINATION } from '@shared/constants/app.constants';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { CatalogService } from '@core/services/catalog.service';
import { MONEDA, CURRENCY_DISPLAY } from '@shared/constants/sunat.constants';

@Component({
    selector: 'app-cajas',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        DecimalPipe, ReactiveFormsModule,
        DrawerComponent, DataTableComponent, PageHeaderComponent, FormFieldComponent,
        ButtonComponent, CatalogSelectComponent
    ],
    templateUrl: './cajas.component.html'
})
export class CajasComponent implements OnInit {
    private cajasService = inject(CajasService);
    private fb           = inject(FormBuilder);
    private destroyRef   = inject(DestroyRef);
    private auth         = inject(AuthService);
    readonly catalog      = inject(CatalogService);

    cajas         = signal<CashRegister[]>([]);
    cargando      = signal(false);
    guardando     = signal(false);
    errorMsg      = signal<string | null>(null);
    actionErrorMsg = signal<string | null>(null);
    /** Resultado del último cierre (faltante/sobrante), visible sobre la tabla. */
    cierreMsg      = signal<string | null>(null);
    /**
     * Aviso de ajuste de fondo al abrir con otro monto. La confirmación es inline en el drawer (2.º clic) y no un
     * modal encima: con el modal, Esc cerraba también el drawer y disparaba el confirm() nativo de cambios sin guardar.
     */
    ajusteMsg      = signal<string | null>(null);

    currentPage   = signal(0);
    pageSize      = signal<number>(PAGINATION.defaultPageSize);
    totalElements = signal(0);
    totalPages    = signal(0);

    // Filtros (TODOS server-side — la vista nunca filtra la página cargada)
    searchQuery              = signal('');
    filterEstado             = signal('');
    filterMoneda              = signal('');
    filterFechaAperturaDesde = signal<string | null>(null);
    filterFechaAperturaHasta = signal<string | null>(null);
    filterFechaCierreDesde   = signal<string | null>(null);
    filterFechaCierreHasta   = signal<string | null>(null);

    /** Estado de caja: enum de dominio (CashRegisterStatus), sin catálogo dedicado en erp_parameters. */
    filters: FilterConfig[] = [
        staticFilter('estado', 'Estado', [
            { value: 'ABIERTA', label: 'Abierta' },
            { value: 'CERRADA', label: 'Cerrada' },
        ]),
        catalogFilter(this.catalog, 'MONEDA', 'moneda', 'Moneda'),
    ];

    /** Rangos de fecha de apertura y cierre para el toolbar del data-table. */
    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fechaApertura', label: 'Fecha de apertura' },
        { field: 'fechaCierre', label: 'Fecha de cierre' },
    ];

    showCreateDrawer = signal(false);
    showActionDrawer = signal(false);
    showEditDrawer   = signal(false);
    selectedCaja     = signal<CashRegister | null>(null);
    actionType       = signal<'abrir' | 'cerrar'>('abrir');

    createForm: FormGroup = this.fb.group({
        nombre:       ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
        moneda:       [MONEDA.PEN, Validators.required],
        saldoInicial: [0,  [Validators.required, Validators.min(0)]]
    });

    actionForm: FormGroup = this.fb.group({
        saldoInicial: [0, [Validators.required, Validators.min(0)]]
    });

    /** Arqueo: efectivo realmente contado al cerrar. Viaja como `saldoFinal`; el backend deriva la diferencia. */
    efectivoContado = new FormControl<number | null>(null, [Validators.required, Validators.min(0)]);
    private efectivoContadoValor = toSignal(this.efectivoContado.valueChanges, { initialValue: null });
    /** Contado − saldo del sistema (null mientras no se digite). Redondeo a centavos para no pintar 0.1+0.2. */
    diferenciaCierre = computed(() => diferenciaMonto(this.efectivoContadoValor(), this.selectedCaja()?.saldoActual));

    /** Solo editable mientras la caja esté CERRADA — ver CashRegisterService.update. */
    editForm: FormGroup = this.fb.group({
        nombre:        ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
        moneda:        [MONEDA.PEN, Validators.required],
        observaciones: ['']
    });

    cajasAbiertas = computed(() => this.cajas().filter(c => c.estado === 'ABIERTA').length);
    cajasCerradas = computed(() => this.cajas().filter(c => c.estado !== 'ABIERTA').length);
    /**
     * Separado por moneda (mismo patrón que saldoTotalPEN/USD en cuentas-bancarias.component.ts):
     * una caja puede abrirse en USD (ver createForm.moneda), así que sumar todo en una cifra
     * mezclaría PEN y USD sin sentido.
     */
    saldoTotalPEN = computed(() =>
        this.cajas()
            .filter(c => c.estado === 'ABIERTA' && (c.moneda ?? MONEDA.PEN) === MONEDA.PEN)
            .reduce((s, c) => s + (c.saldoActual ?? 0), 0)
    );
    saldoTotalUSD = computed(() =>
        this.cajas()
            .filter(c => c.estado === 'ABIERTA' && c.moneda === MONEDA.USD)
            .reduce((s, c) => s + (c.saldoActual ?? 0), 0)
    );

    columns: TableColumn<CashRegister>[] = [
        { key: 'nombre',        label: 'Nombre',        sortable: true },
        { key: 'estado',        label: 'Estado',        align: 'center', html: true,
          render: r => `<span class="${r.estado === 'ABIERTA' ? 'badge badge-success' : 'badge badge-neutral'}">${r.estado}</span>` },
        { key: 'saldoActual',   label: 'Saldo Actual',  align: 'right',
          render: r => `${r.moneda === MONEDA.USD ? CURRENCY_DISPLAY.SYMBOL_USD : CURRENCY_DISPLAY.SYMBOL_PEN} ${(r.saldoActual ?? 0).toFixed(2)}` },
        { key: 'saldoInicial',  label: 'Saldo Inicial', align: 'right',
          render: r => `${r.moneda === MONEDA.USD ? CURRENCY_DISPLAY.SYMBOL_USD : CURRENCY_DISPLAY.SYMBOL_PEN} ${(r.saldoInicial ?? 0).toFixed(2)}` },
        { key: 'fechaApertura', label: 'Apertura',
          render: r => r.fechaApertura ? new Date(r.fechaApertura).toLocaleDateString('es-PE') : '—' },
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (respeta los filtros actuales). Ver GET /api/tesoreria/cajas/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.treasury}/api/tesoreria/cajas/export`,
        filename: 'cajas',
        params: () => ({
            tenantId: this.auth.currentUser()?.activeCompanyId ?? 1,
            estado: this.filterEstado(),
            moneda: this.filterMoneda(),
            fechaAperturaDesde: this.filterFechaAperturaDesde() ?? undefined,
            fechaAperturaHasta: this.filterFechaAperturaHasta() ?? undefined,
            fechaCierreDesde: this.filterFechaCierreDesde() ?? undefined,
            fechaCierreHasta: this.filterFechaCierreHasta() ?? undefined,
            q: this.searchQuery(),
        }),
    };

    actions: TableAction<CashRegister>[] = [
        { label: 'Editar', icon: '✏️', class: 'btn-icon-edit',
          show: r => r.estado !== 'ABIERTA',
          onClick: r => this.openEditDrawer(r) },
        { label: 'Abrir',  icon: '🔓', class: 'btn-view',
          show: r => r.estado !== 'ABIERTA',
          onClick: r => this.openActionDrawer(r, 'abrir') },
        { label: 'Cerrar', icon: '🔒', class: 'btn-view',
          show: r => r.estado === 'ABIERTA',
          onClick: r => this.openActionDrawer(r, 'cerrar') },
    ];

    ngOnInit(): void {
        this.load();
        // Cambiar el monto invalida la confirmación pedida.
        this.actionForm.get('saldoInicial')!.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.ajusteMsg.set(null));
    }

    load(): void {
        this.cargando.set(true);
        this.cajasService.getAll({
            page: this.currentPage(),
            size: this.pageSize(),
            estado: this.filterEstado() || undefined,
            moneda: this.filterMoneda() || undefined,
            fechaAperturaDesde: this.filterFechaAperturaDesde() || undefined,
            fechaAperturaHasta: this.filterFechaAperturaHasta() || undefined,
            fechaCierreDesde: this.filterFechaCierreDesde() || undefined,
            fechaCierreHasta: this.filterFechaCierreHasta() || undefined,
            q: this.searchQuery() || undefined,
        })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (res: Page<CashRegister>) => {
                    this.cajas.set(res.content);
                    this.totalElements.set(res.totalElements);
                    this.totalPages.set(res.totalPages);
                    this.cargando.set(false);
                },
                error: () => this.cargando.set(false)
            });
    }

    /** La búsqueda por texto también va al backend (`q`), no filtra la página cargada. */
    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.load();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'estado': this.filterEstado.set(valor); break;
            case 'moneda': this.filterMoneda.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.load();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        switch (event.field) {
            case 'fechaApertura':
                this.filterFechaAperturaDesde.set(event.from);
                this.filterFechaAperturaHasta.set(event.to);
                break;
            case 'fechaCierre':
                this.filterFechaCierreDesde.set(event.from);
                this.filterFechaCierreHasta.set(event.to);
                break;
            default: return;
        }
        this.currentPage.set(0);
        this.load();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterEstado.set('');
        this.filterMoneda.set('');
        this.filterFechaAperturaDesde.set(null);
        this.filterFechaAperturaHasta.set(null);
        this.filterFechaCierreDesde.set(null);
        this.filterFechaCierreHasta.set(null);
        this.currentPage.set(0);
        this.load();
    }

    onPageChange(event: PaginationEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.load();
    }

    openCreateDrawer(): void {
        this.createForm.reset({ nombre: '', moneda: MONEDA.PEN, saldoInicial: 0 });
        this.errorMsg.set(null);
        this.showCreateDrawer.set(true);
    }

    openActionDrawer(caja: CashRegister, tipo: 'abrir' | 'cerrar'): void {
        this.selectedCaja.set(caja);
        this.actionType.set(tipo);
        // Reabrir parte del saldo con que cerró la caja: con 0 el backend responde 409.
        this.actionForm.reset({ saldoInicial: caja.saldoActual ?? 0 });
        this.efectivoContado.reset(null);
        this.actionErrorMsg.set(null);
        this.ajusteMsg.set(null);
        this.showActionDrawer.set(true);
    }

    /** Solo se ofrece (ver `actions`) mientras la caja esté CERRADA: el backend también lo valida. */
    openEditDrawer(caja: CashRegister): void {
        this.selectedCaja.set(caja);
        this.editForm.reset({
            nombre: caja.nombre,
            moneda: caja.moneda ?? MONEDA.PEN,
            observaciones: caja.observaciones ?? ''
        });
        this.actionErrorMsg.set(null);
        this.showEditDrawer.set(true);
    }

    crearCaja(): void {
        if (this.createForm.invalid) { this.createForm.markAllAsTouched(); return; }
        this.guardando.set(true);
        // El backend exige tenantId en el body (CashRegisterRequestDto): el interceptor
        // de tenant solo agrega cabeceras, no rellena el payload.
        const req: CajaRequest = {
            ...this.createForm.value,
            tenantId: this.auth.currentUser()?.activeCompanyId ?? 1
        };
        this.cajasService.create(req)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => { this.showCreateDrawer.set(false); this.guardando.set(false); this.load(); },
                error: (err: { error?: { detail?: string } }) => {
                    this.errorMsg.set(err?.error?.detail ?? 'Error al crear caja');
                    this.guardando.set(false);
                }
            });
    }

    guardarEdicion(): void {
        const caja = this.selectedCaja();
        if (!caja?.id || this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
        this.guardando.set(true);
        const req: CajaUpdateRequest = this.editForm.value;
        this.cajasService.update(caja.id, req)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => { this.showEditDrawer.set(false); this.guardando.set(false); this.load(); },
                error: (err: { error?: { detail?: string } }) => {
                    this.actionErrorMsg.set(err?.error?.detail ?? 'Error al actualizar caja');
                    this.guardando.set(false);
                }
            });
    }

    ejecutarAccion(): void {
        const caja = this.selectedCaja();
        if (!caja?.id) return;
        const cerrando = this.actionType() === 'cerrar';
        if (cerrando && this.efectivoContado.invalid) { this.efectivoContado.markAsTouched(); return; }
        if (!cerrando && this.actionForm.invalid) { this.actionForm.markAllAsTouched(); return; }

        const saldoInicial: number = this.actionForm.value.saldoInicial ?? 0;
        const ajuste = diferenciaMonto(saldoInicial, caja.saldoActual);
        const hayAjuste = !cerrando && ajuste !== 0;
        if (hayAjuste && !this.ajusteMsg()) {
            // Otro monto que el de cierre = ajuste de fondo (movimiento de caja): exige confirmación explícita (2.º clic).
            this.ajusteMsg.set(`La caja cerró con ${(caja.saldoActual ?? 0).toFixed(2)} y la abre con ${saldoInicial.toFixed(2)}. `
                + `Se registrará un ${(ajuste ?? 0) > 0 ? 'ingreso' : 'egreso'} de ${Math.abs(ajuste ?? 0).toFixed(2)} por la diferencia. Pulse «Confirmar ajuste y abrir» para continuar.`);
            return;
        }
        const ajusteConfirmado = hayAjuste;

        this.guardando.set(true);
        this.actionErrorMsg.set(null);
        const op = cerrando
            ? this.cajasService.close(caja.id, this.efectivoContado.value ?? 0)
            : this.cajasService.open(caja.id, construirAbrirRequest(saldoInicial, caja.saldoActual, ajusteConfirmado));
        op.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: res => {
                this.cierreMsg.set(cerrando ? this.mensajeCierre(caja.nombre, res.diferenciaCierre) : null);
                this.showActionDrawer.set(false); this.guardando.set(false); this.load();
            },
            error: (err: HttpErrorResponse) => {
                this.actionErrorMsg.set(mensajeDeErrorHttp(err));
                this.guardando.set(false);
            }
        });
    }

    private mensajeCierre(nombre: string, diferencia: number | null | undefined): string {
        const d = diferencia ?? 0;
        return d === 0
            ? `Caja ${nombre} cerrada: ${textoDiferenciaCierre(d)}.`
            : `Caja ${nombre} cerrada con ${textoDiferenciaCierre(d)} de ${Math.abs(d).toFixed(2)}; quedó registrado como movimiento y asiento.`;
    }

    getControl(form: FormGroup, name: string): FormControl {
        return form.get(name) as FormControl;
    }
}
