import {
    Component, DestroyRef, OnInit, inject, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';
import { PageHeaderComponent } from '@shared/ui/layout/page-header/page-header.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { DatePickerComponent } from '@shared/ui/forms/date-picker/date-picker.component';
import { PagosService } from '../../services/pagos.service';
import { AuthService } from '@core/auth/auth.service';
import { Payment, PaymentRequest, Page } from '../../models/tesoreria.model';

@Component({
    selector: 'app-pagos',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        DecimalPipe, ReactiveFormsModule,
        DrawerComponent, DataTableComponent, PageHeaderComponent, FormFieldComponent, DatePickerComponent
    ],
    templateUrl: './pagos.component.html'
})
export class PagosComponent implements OnInit {
    private pagosService = inject(PagosService);
    private auth         = inject(AuthService);
    private fb           = inject(FormBuilder);
    private destroyRef   = inject(DestroyRef);

    pagos         = signal<Payment[]>([]);
    cargando      = signal(false);
    guardando     = signal(false);
    errorMsg      = signal<string | null>(null);
    showCreateDrawer = signal(false);

    currentPage   = signal(0);
    pageSize      = signal(10);
    totalElements = signal(0);
    totalPages    = signal(0);

    pagoForm: FormGroup = this.fb.group({
        beneficiarioNombre:    ['', [Validators.required, Validators.minLength(2)]],
        beneficiarioDocumento: [''],
        concepto:              ['', [Validators.required, Validators.minLength(3)]],
        monto:                 [null, [Validators.required, Validators.min(0.01)]],
        tipoPago:              ['PROVEEDOR', Validators.required],
        metodoPago:            ['TRANSFERENCIA', Validators.required],
        fechaSolicitud:        ['', Validators.required],
    });

    readonly tipoPagoOptions = [
        { value: 'PROVEEDOR', label: 'Proveedor' },
        { value: 'NOMINA',    label: 'Nómina' },
        { value: 'IMPUESTO',  label: 'Impuesto' },
        { value: 'OTRO',      label: 'Otro' },
    ];

    readonly metodoPagoOptions = [
        { value: 'TRANSFERENCIA', label: 'Transferencia Bancaria' },
        { value: 'CHEQUE',        label: 'Cheque' },
        { value: 'EFECTIVO',      label: 'Efectivo' },
    ];

    countPendientes   = computed(() => this.pagos().filter(p => p.estado === 'PENDING').length);
    countAprobados    = computed(() => this.pagos().filter(p => p.estado === 'APPROVED').length);
    countPagados      = computed(() => this.pagos().filter(p => p.estado === 'PAID').length);
    totalComprometido = computed(() =>
        this.pagos()
            .filter(p => p.estado === 'PENDING' || p.estado === 'APPROVED')
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
          render: r => `S/ ${(r.monto ?? 0).toFixed(2)}` },
        { key: 'estado', label: 'Estado', align: 'center', html: true,
          render: r => `<span class="${this.badgePago(r.estado)}">${r.estado}</span>` },
    ];

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

    ngOnInit(): void { this.load(); }

    load(): void {
        this.cargando.set(true);
        this.pagosService.getAll(this.currentPage(), this.pageSize())
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

    openCreateDrawer(): void {
        const today = new Date().toISOString().split('T')[0];
        this.pagoForm.reset({ tipoPago: 'PROVEEDOR', metodoPago: 'TRANSFERENCIA', fechaSolicitud: today, monto: null });
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
            moneda:                'PEN',
            metodoPago:            v.metodoPago,
            fechaSolicitud:        v.fechaSolicitud,
            beneficiarioNombre:    v.beneficiarioNombre,
            beneficiarioDocumento: v.beneficiarioDocumento ?? '',
            concepto:              v.concepto
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
