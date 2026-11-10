import {
    Component, DestroyRef, OnInit, inject, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { of } from 'rxjs';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn, TableAction, FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { PageHeaderComponent } from '@shared/ui/layout/page-header/page-header.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { DatePickerComponent } from '@shared/ui/forms/date-picker/date-picker.component';
import { ButtonComponent } from '@shared/components';
import { construirTransferenciaRequest, transferenciaMismoOrigenYDestino, opcionesTransferencia, OpcionTransferencia, esAnulable, idsAnulados, motivoAnulacionValido } from './flujo-caja.form';
import { MovimientosFinancierosService, FinancialMovementRequest, FlujoCaja } from '../../services/movimientos-financieros.service';
import { CajasService } from '../../services/cajas.service';
import { CuentasBancariasService } from '../../services/cuentas-bancarias.service';
import { AuthService } from '@core/auth/auth.service';
import { FinancialMovement, Page, BankAccount } from '../../models/tesoreria.model';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { MONEDA, CURRENCY_DISPLAY } from '@shared/constants/sunat.constants';
import { mensajeDeErrorHttp } from '@core/utils/http-error.util';
import { HttpErrorResponse } from '@angular/common/http';
import { PAGINATION } from '@shared/constants/app.constants';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import { hoyLocalISO } from '@core/utils/local-datetime.util';

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
        ButtonComponent
    ],
    templateUrl: './flujo-caja.component.html'
})
export class FlujoCajaComponent implements OnInit {
    private movService  = inject(MovimientosFinancierosService);
    private cajasService = inject(CajasService);
    private cuentasService = inject(CuentasBancariasService);
    private auth        = inject(AuthService);
    private fb          = inject(FormBuilder);
    private destroyRef  = inject(DestroyRef);

    movimientos      = signal<FinancialMovement[]>([]);
    cargando         = signal(false);
    guardando        = signal(false);
    errorMsg         = signal<string | null>(null);
    showCreateDrawer = signal(false);
    /** Totales del rango completo en la moneda elegida (backend), no la suma de la página. */
    flujo            = signal<FlujoCaja | null>(null);

    currentPage   = signal(0);
    pageSize      = signal<number>(PAGINATION.defaultPageSize);
    totalElements = signal(0);
    totalPages    = signal(0);

    fechaInicio = signal<string>('');
    fechaFin    = signal<string>('');
    filterTipoMovimiento = signal('');
    filterOrigen         = signal('');
    /** Moneda del flujo y de la tabla: los KPIs no se pueden mezclar entre monedas. */
    moneda               = signal<string>(MONEDA.PEN);
    readonly monedas = [MONEDA.PEN, MONEDA.USD];
    searchQuery          = signal('');

    readonly filters: FilterConfig[] = [
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
    /**
     * TRANSFERENCIA_INTERNA no se ofrece en el alta manual (el backend la rechaza con 400): los traspasos
     * se hacen con el drawer «Transferir» (POST /movimientos/transferencia). Sí queda en el filtro de la tabla.
     */
    readonly origenOptions = ORIGEN_MOVIMIENTO_OPTIONS.filter(o => o.value !== 'TRANSFERENCIA_INTERNA');
    /** Alta manual: sólo INGRESO/EGRESO (TRANSFERENCIA no movía ningún saldo). */
    readonly tipoMovimientoOptions = [
        { value: 'INGRESO', label: 'Ingreso' },
        { value: 'EGRESO', label: 'Egreso' },
    ];

    // -- Drawer «Anular» --
    showAnularDrawer = signal(false);
    movimientoAAnular = signal<FinancialMovement | null>(null);
    anulando         = signal(false);
    anularErrorMsg   = signal<string | null>(null);
    motivoAnulacion  = new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(300)] });
    /** Ids anulados según los contramovimientos ANUL- de la página cargada. */
    private anulados = computed(() => idsAnulados(this.movimientos()));

    actions: TableAction<FinancialMovement>[] = [
        { label: 'Anular', icon: '↩', class: 'btn-view',
          show: r => esAnulable(r, this.anulados()),
          onClick: r => this.openAnularDrawer(r) },
    ];

    // -- Drawer «Transferir» --
    showTransferDrawer = signal(false);
    transfiriendo      = signal(false);
    transferErrorMsg   = signal<string | null>(null);
    /** Espejos de transferenciaForm.origenTipo/destinoTipo (ver ngOnInit). */
    transferOrigenTipo  = signal<'CAJA' | 'BANCO'>('CAJA');
    transferDestinoTipo = signal<'CAJA' | 'BANCO'>('BANCO');
    transferenciaForm: FormGroup = this.fb.group({
        origenTipo:  ['CAJA'],
        origenId:    [null, Validators.required],
        destinoTipo: ['BANCO'],
        destinoId:   [null, Validators.required],
        monto:       [null, [Validators.required, Validators.min(0.01)]],
        moneda:      [MONEDA.PEN, Validators.required],
        fecha:       ['', Validators.required],
        descripcion: [''],
    });
    transferMoneda      = signal<string>(MONEDA.PEN);
    transferOrigenId    = signal<number | null>(null);
    /** Cajas y cuentas con moneda/estado, para filtrar el traspaso (cajasOptions/cuentasOptions sólo llevan etiqueta). */
    private cajasTransfer   = signal<OpcionTransferencia[]>([]);
    private cuentasTransfer = signal<OpcionTransferencia[]>([]);
    /** Sólo cajas abiertas y de la moneda elegida: lo demás sólo daba 409. */
    transferOrigenOpciones = computed(() => opcionesTransferencia(
        this.transferOrigenTipo() === 'CAJA' ? this.cajasTransfer() : this.cuentasTransfer(),
        this.transferOrigenTipo(), this.transferMoneda()));
    /** Misma moneda que el origen (la moneda del formulario) y sin el propio origen. */
    transferDestinoOpciones = computed(() => opcionesTransferencia(
        this.transferDestinoTipo() === 'CAJA' ? this.cajasTransfer() : this.cuentasTransfer(),
        this.transferDestinoTipo(), this.transferMoneda(),
        this.transferDestinoTipo() === this.transferOrigenTipo() ? this.transferOrigenId() : null));
    /** Clave por apertura del drawer: el reintento del mismo traspaso no lo duplica (ver MovimientosFinancierosService.transferir). */
    private transferKey = crypto.randomUUID();

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

    simbolo = computed(() => this.simboloDe(this.moneda()));

    private simboloDe(moneda: string | undefined): string {
        return moneda === MONEDA.USD ? 'US$' : CURRENCY_DISPLAY.SYMBOL_PEN;
    }

    columns: TableColumn<FinancialMovement>[] = [
        { key: 'fecha', label: 'Fecha',
          render: r => r.fecha ? new Date(r.fecha).toLocaleDateString('es-PE') : '—' },
        { key: 'tipoMovimiento', label: 'Tipo', html: true,
          render: r => `<span class="${this.badgeMovimiento(r.tipoMovimiento)}">${r.tipoMovimiento}</span>` },
        { key: 'origen',     label: 'Origen',      render: r => r.origen ?? '—' },
        { key: 'descripcion', label: 'Descripción', html: true,
          render: r => this.descripcionConMarcas(r) },
        { key: 'monto', label: 'Monto', align: 'right',
          render: r => {
              const sign = r.tipoMovimiento === 'INGRESO' ? '+' : r.tipoMovimiento === 'EGRESO' ? '-' : '';
              return `${sign}${this.simboloDe(r.moneda)} ${(r.monto ?? 0).toFixed(2)}`;
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
            moneda: this.moneda(),
            q: this.searchQuery() || undefined,
        }),
    };

    ngOnInit(): void {
        const today    = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        this.fechaFin.set(hoyLocalISO(today));
        this.fechaInicio.set(hoyLocalISO(firstDay));
        this.loadData();
        this.loadOrigenRefOptions();
        this.subscribeOrigenChanges();
        this.transferenciaForm.get('origenTipo')!.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((t: 'CAJA' | 'BANCO') => {
                this.transferOrigenTipo.set(t);
                this.transferenciaForm.get('origenId')!.setValue(null);
            });
        this.transferenciaForm.get('origenId')!.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((id: number | null) => {
                this.transferOrigenId.set(id);
                const destino = this.transferenciaForm.get('destinoId')!;
                // Si el destino elegido pasó a ser el mismo origen, se limpia.
                if (id != null && destino.value === id && this.transferDestinoTipo() === this.transferOrigenTipo()) destino.setValue(null);
            });
        this.transferenciaForm.get('moneda')!.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((m: string) => {
                this.transferMoneda.set(m ?? MONEDA.PEN);
                this.transferenciaForm.patchValue({ origenId: null, destinoId: null });
            });
        this.transferenciaForm.get('destinoTipo')!.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((t: 'CAJA' | 'BANCO') => {
                this.transferDestinoTipo.set(t);
                this.transferenciaForm.get('destinoId')!.setValue(null);
            });
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
                next: (res) => {
                    this.cajasOptions.set(
                        res.content.filter(c => c.id != null).map(c => ({
                            value: c.id as number,
                            label: c.estado === 'CERRADA' ? `${c.nombre} (cerrada)` : c.nombre
                        }))
                    );
                    this.cajasTransfer.set(res.content.filter(c => c.id != null).map(c => ({
                        value: c.id as number, label: c.nombre, moneda: c.moneda ?? MONEDA.PEN, abierta: c.estado === 'ABIERTA'
                    })));
                },
                error: () => { this.cajasOptions.set([]); this.cajasTransfer.set([]); }
            });

        this.cuentasService.getAll({ estado: 'ACTIVA', size: 100 })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (res) => {
                    const data: BankAccount[] = Array.isArray(res) ? res : (res as Page<BankAccount>).content;
                    this.cuentasOptions.set(
                        data.filter(c => c.id != null).map(c => ({ value: c.id as number, label: `${c.banco} - ${c.numeroCuenta}` }))
                    );
                    this.cuentasTransfer.set(data.filter(c => c.id != null).map(c => ({
                        value: c.id as number, label: `${c.banco} - ${c.numeroCuenta}`, moneda: c.moneda, abierta: true
                    })));
                },
                error: () => { this.cuentasOptions.set([]); this.cuentasTransfer.set([]); }
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
                    // Sin cuenta/caja el movimiento se guardaba sin afectar ningún saldo (el backend da 400).
                    origenIdCtrl.setValidators(Validators.required);
                    origenIdCtrl.enable({ emitEvent: false });
                } else {
                    origenIdCtrl.clearValidators();
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

        this.movService.getFlujoCaja(this.fechaInicio(), this.fechaFin(), this.moneda())
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (val) => this.flujo.set(val),
                error: () => { this.flujo.set(null); this.cargando.set(false); }
            });

        this.movService.getAll({
            fechaDesde: this.fechaInicio() || undefined,
            fechaHasta: this.fechaFin() || undefined,
            tipoMovimiento: this.filterTipoMovimiento() || undefined,
            origen: this.filterOrigen() || undefined,
            moneda: this.moneda(),
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
            default: return;
        }
        this.currentPage.set(0);
        this.loadData();
    }

    onMonedaChange(moneda: string): void {
        this.moneda.set(moneda);
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
        this.moneda.set(MONEDA.PEN);
        this.currentPage.set(0);
        this.loadData();
    }

    openCreateDrawer(): void {
        const today = hoyLocalISO();
        this.movimientoForm.reset({ tipoMovimiento: 'INGRESO', moneda: MONEDA.PEN, fecha: today, monto: null, origen: '', descripcion: '', origenId: null });
        this.errorMsg.set(null);
        this.showCreateDrawer.set(true);
    }

    openAnularDrawer(m: FinancialMovement): void {
        this.movimientoAAnular.set(m);
        this.motivoAnulacion.reset('');
        this.anularErrorMsg.set(null);
        this.showAnularDrawer.set(true);
    }

    confirmarAnulacion(): void {
        const m = this.movimientoAAnular();
        const motivo = motivoAnulacionValido(this.motivoAnulacion.value);
        if (m?.id == null || motivo == null) { this.motivoAnulacion.markAsTouched(); return; }
        this.anulando.set(true);
        this.anularErrorMsg.set(null);
        this.movService.anular(m.id, motivo)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => { this.anulando.set(false); this.showAnularDrawer.set(false); this.loadData(); },
                // 400 (no manual) / 409 (ya anulado, caja cerrada, saldo insuficiente): el motivo viaja en `detail`.
                error: (err: HttpErrorResponse) => {
                    this.anularErrorMsg.set(mensajeDeErrorHttp(err));
                    this.anulando.set(false);
                }
            });
    }

    openTransferDrawer(): void {
        this.transferenciaForm.reset({
            origenTipo: 'CAJA', origenId: null, destinoTipo: 'BANCO', destinoId: null,
            monto: null, moneda: MONEDA.PEN, fecha: hoyLocalISO(), descripcion: ''
        });
        this.transferOrigenTipo.set('CAJA');
        this.transferDestinoTipo.set('BANCO');
        this.transferMoneda.set(MONEDA.PEN);
        this.transferOrigenId.set(null);
        this.transferKey = crypto.randomUUID();
        this.transferErrorMsg.set(null);
        this.showTransferDrawer.set(true);
    }

    registrarTransferencia(): void {
        if (this.transferenciaForm.invalid) { this.transferenciaForm.markAllAsTouched(); return; }
        const v = this.transferenciaForm.getRawValue();
        if (transferenciaMismoOrigenYDestino(v)) {
            this.transferErrorMsg.set('El origen y el destino deben ser distintos.');
            return;
        }
        this.transfiriendo.set(true);
        this.transferErrorMsg.set(null);
        this.movService.transferir(construirTransferenciaRequest(v, this.auth.currentUser()?.activeCompanyId ?? 1), this.transferKey)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => { this.transfiriendo.set(false); this.showTransferDrawer.set(false); this.loadData(); },
                // 409: saldo insuficiente, moneda distinta o caja cerrada; el motivo viaja en `detail`.
                error: (err: HttpErrorResponse) => {
                    this.transferErrorMsg.set(mensajeDeErrorHttp(err));
                    this.transfiriendo.set(false);
                }
            });
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

    getTransferControl(name: string): FormControl {
        return this.transferenciaForm.get(name) as FormControl;
    }

    getControl(name: string): FormControl {
        return this.movimientoForm.get(name) as FormControl;
    }

    /** Descripción + marcas: «anulado» (tiene un ANUL- en la lista) y «asiento pendiente» (hay que contabilizarlo a mano). */
    private descripcionConMarcas(r: FinancialMovement): string {
        const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const anulado = r.id != null && this.anulados().has(r.id);
        const texto = esc(r.descripcion ?? '—');
        return (anulado ? `<s>${texto}</s> <span class="badge badge-neutral">Anulado</span>` : texto)
            + (r.asientoPendiente ? ' <span class="badge badge-warning" title="El asiento contable falló: contabilizar a mano">Asiento pendiente</span>' : '');
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
