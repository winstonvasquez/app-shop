import {
    Component, ChangeDetectionStrategy, DestroyRef, OnInit,
    inject, signal, computed
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';
import { PageHeaderComponent } from '@shared/ui/layout/page-header/page-header.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { ButtonComponent } from '@shared/components';
import { CuentasBancariasService } from '../../services/cuentas-bancarias.service';
import { AuthService } from '@core/auth/auth.service';
import { BankAccount, BankAccountRequest, Page } from '../../models/tesoreria.model';

@Component({
    selector: 'app-cuentas-bancarias',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        DecimalPipe, ReactiveFormsModule,
        DrawerComponent, DataTableComponent, PageHeaderComponent, FormFieldComponent,
        ButtonComponent
    ],
    templateUrl: './cuentas-bancarias.component.html'
})
export class CuentasBancariasComponent implements OnInit {
    private cuentasService = inject(CuentasBancariasService);
    private auth           = inject(AuthService);
    private fb             = inject(FormBuilder);
    private destroyRef     = inject(DestroyRef);

    cuentas          = signal<BankAccount[]>([]);
    cargando         = signal(false);
    guardando        = signal(false);
    errorMsg         = signal<string | null>(null);
    showCreateDrawer = signal(false);
    showEditDrawer   = signal(false);
    selectedCuenta   = signal<BankAccount | null>(null);

    currentPage   = signal(0);
    pageSize      = signal(10);
    totalElements = signal(0);
    totalPages    = signal(0);

    saldoTotalPEN = computed(() =>
        this.cuentas()
            .filter(c => c.moneda === 'PEN' && c.estado === 'ACTIVA' && c.tipoCuenta !== 'DETRACCIONES')
            .reduce((s, c) => s + (c.saldoActual ?? 0), 0)
    );

    saldoTotalUSD = computed(() =>
        this.cuentas()
            .filter(c => c.moneda === 'USD' && c.estado === 'ACTIVA')
            .reduce((s, c) => s + (c.saldoActual ?? 0), 0)
    );

    saldoDetracciones = computed(() =>
        this.cuentas()
            .filter(c => c.tipoCuenta === 'DETRACCIONES' && c.estado === 'ACTIVA')
            .reduce((s, c) => s + (c.saldoActual ?? 0), 0)
    );

    cuentasPEN = computed(() =>
        this.cuentas().filter(c => c.moneda === 'PEN' && c.estado === 'ACTIVA').length
    );

    cuentasUSD = computed(() =>
        this.cuentas().filter(c => c.moneda === 'USD' && c.estado === 'ACTIVA').length
    );

    readonly tipoOptions = ['CORRIENTE', 'AHORROS', 'CTS', 'DETRACCIONES'];
    readonly monedaOptions = ['PEN', 'USD', 'EUR'];
    readonly BANCOS = [
        'BCP — Banco de Crédito del Perú',
        'BBVA Perú',
        'Scotiabank Perú',
        'Interbank',
        'Banco Pichincha',
        'Banco GNB',
        'Banco Falabella',
        'Banbif',
        'Banco Ripley',
        'Caja Municipal Arequipa',
        'Caja Huancayo',
        'Banco de la Nación'
    ];

    createForm: FormGroup = this.fb.group({
        banco:               ['', Validators.required],
        numeroCuenta:        ['', Validators.required],
        tipoCuenta:          ['CORRIENTE', Validators.required],
        moneda:              ['PEN', Validators.required],
        saldoInicial:        [0, [Validators.required, Validators.min(0)]],
        cuentaInterbancaria: [''],
        descripcion:         ['']
    });

    editForm: FormGroup = this.fb.group({
        banco:               ['', Validators.required],
        numeroCuenta:        ['', Validators.required],
        tipoCuenta:          ['CORRIENTE', Validators.required],
        moneda:              ['PEN', Validators.required],
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
          render: r => `${r.moneda === 'USD' ? '$' : 'S/'} ${(r.saldoActual ?? 0).toFixed(2)}` },
        { key: 'estado',              label: 'Estado',       align: 'center', html: true,
          render: r => `<span class="${this.badgeEstado(r.estado)}">${r.estado}</span>` }
    ];

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
        this.cuentasService.getAll(this.currentPage(), this.pageSize())
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

    onPageChange(event: { page: number; size: number }): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.load();
    }

    openCreateDrawer(): void {
        this.createForm.reset({
            banco: '', numeroCuenta: '', tipoCuenta: 'CORRIENTE',
            moneda: 'PEN', saldoInicial: 0, cuentaInterbancaria: '', descripcion: ''
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
