import {
    Component, DestroyRef, OnInit, inject, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn } from '@shared/ui/tables/data-table/data-table.component';
import { PageHeaderComponent } from '@shared/ui/layout/page-header/page-header.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { DatePickerComponent } from '@shared/ui/forms/date-picker/date-picker.component';
import { MovimientosFinancierosService, FinancialMovementRequest } from '../../services/movimientos-financieros.service';
import { AuthService } from '@core/auth/auth.service';
import { FinancialMovement, Page } from '../../models/tesoreria.model';

@Component({
    selector: 'app-flujo-caja',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        DecimalPipe, ReactiveFormsModule,
        DrawerComponent, DataTableComponent, PageHeaderComponent, FormFieldComponent, DatePickerComponent
    ],
    templateUrl: './flujo-caja.component.html'
})
export class FlujoCajaComponent implements OnInit {
    private movService  = inject(MovimientosFinancierosService);
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
    pageSize      = signal(10);
    totalElements = signal(0);
    totalPages    = signal(0);

    fechaInicio = signal<string>('');
    fechaFin    = signal<string>('');

    movimientoForm: FormGroup = this.fb.group({
        tipoMovimiento: ['INGRESO', Validators.required],
        origen:         ['', Validators.required],
        descripcion:    ['', [Validators.required, Validators.minLength(3)]],
        monto:          [null, [Validators.required, Validators.min(0.01)]],
        moneda:         ['PEN'],
        fecha:          ['', Validators.required],
        cajaId:         [null],
    });

    readonly tipoOptions = [
        { value: 'INGRESO',       label: 'Ingreso' },
        { value: 'EGRESO',        label: 'Egreso' },
        { value: 'TRANSFERENCIA', label: 'Transferencia' },
    ];

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
              return `${sign}S/ ${(r.monto ?? 0).toFixed(2)}`;
          }
        },
        { key: 'moneda', label: 'Moneda', align: 'center', render: r => r.moneda ?? 'PEN' },
    ];

    ngOnInit(): void {
        const today    = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        this.fechaFin.set(today.toISOString().split('T')[0]);
        this.fechaInicio.set(firstDay.toISOString().split('T')[0]);
        this.loadData();
    }

    loadData(): void {
        this.cargando.set(true);

        this.movService.getFlujoCaja(this.fechaInicio(), this.fechaFin())
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (val) => this.flujoCajaNeto.set(val),
                error: () => this.cargando.set(false)
            });

        this.movService.getAll(this.fechaInicio(), this.fechaFin(), this.currentPage(), this.pageSize())
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (res: Page<FinancialMovement> | FinancialMovement[]) => {
                    const data = Array.isArray(res) ? res : (res as Page<FinancialMovement>).content;
                    this.movimientos.set(data);
                    this.totalElements.set(Array.isArray(res) ? data.length : (res as Page<FinancialMovement>).totalElements);
                    this.totalPages.set(Array.isArray(res) ? 1 : (res as Page<FinancialMovement>).totalPages);
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

    consultar(): void {
        this.currentPage.set(0);
        this.loadData();
    }

    openCreateDrawer(): void {
        const today = new Date().toISOString().split('T')[0];
        this.movimientoForm.reset({ tipoMovimiento: 'INGRESO', moneda: 'PEN', fecha: today, monto: null, origen: '', descripcion: '', cajaId: null });
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
            moneda:         v.moneda ?? 'PEN',
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
