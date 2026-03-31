import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DrawerComponent } from '../../../../shared/components/drawer/drawer.component';
import { PagosService } from '../../services/pagos.service';
import { Payment, PaymentRequest } from '../../models/tesoreria.model';
import { AuthService } from '@core/auth/auth.service';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';

@Component({
    selector: 'app-pagos',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DecimalPipe, FormsModule, DrawerComponent, DataTableComponent],
    templateUrl: './pagos.component.html'
})
export class PagosComponent implements OnInit {
    private pagosService = inject(PagosService);
    private auth = inject(AuthService);

    pagos = signal<Payment[]>([]);
    cargando = signal(false);
    showModal = signal(false);
    guardando = signal(false);

    filtroEstado = signal('');
    filtroTipo = signal('');

    readonly estadoOptions = [
        { value: 'PENDING',   label: 'Pendiente' },
        { value: 'APPROVED',  label: 'Aprobado' },
        { value: 'PAID',      label: 'Pagado' },
        { value: 'REJECTED',  label: 'Rechazado' },
    ];

    readonly tipoPagoOptions: { value: Payment['tipoPago']; label: string }[] = [
        { value: 'PROVEEDOR', label: 'Proveedor' },
        { value: 'NÓMINA',    label: 'Nómina' },
        { value: 'IMPUESTO',  label: 'Impuesto' },
        { value: 'OTRO',      label: 'Otro' },
    ];

    columns: TableColumn<Payment>[] = [
        { key: 'createdAt', label: 'Fecha',
          render: (row) => {
              const d = row.createdAt ?? row.fechaSolicitud;
              return d ? new Date(d).toLocaleDateString('es-PE') : '-';
          }
        },
        { key: 'beneficiarioNombre', label: 'Beneficiario / Concepto',
          render: (row) => `${row.beneficiarioNombre}\n${row.concepto ?? ''}` },
        { key: 'tipoPago', label: 'Tipo', html: true,
          render: (row) => `<span class="badge badge-neutral">${row.tipoPago}</span>` },
        { key: 'monto', label: 'Monto', align: 'right',
          render: (row) => `S/ ${(row.monto ?? 0).toFixed(2)}` },
        { key: 'estado', label: 'Estado', align: 'center', html: true,
          render: (row) => `<span class="${this.badgePago(row.estado)}">${row.estado}</span>` },
    ];

    actions: TableAction<Payment>[] = [
        { label: 'Aprobar',  icon: '✓', class: 'btn-view',
          show: (row) => row.estado === 'PENDING',
          onClick: (row) => this.approve(row) },
        { label: 'Rechazar', icon: '✕', class: 'btn-view',
          show: (row) => row.estado === 'PENDING',
          onClick: (row) => this.reject(row) },
        { label: 'Pagar',    icon: '💳', class: 'btn-view',
          show: (row) => row.estado === 'APPROVED',
          onClick: (row) => this.pay(row) },
    ];

    // Form nuevo pago
    formBeneficiario = '';
    formConcepto = '';
    formMonto = 0;
    formTipo: Payment['tipoPago'] = 'PROVEEDOR';

    pagosFiltrados = computed(() => {
        let lista = this.pagos();
        if (this.filtroEstado()) lista = lista.filter(p => p.estado === this.filtroEstado());
        if (this.filtroTipo()) lista = lista.filter(p => p.tipoPago === this.filtroTipo());
        return lista;
    });

    countPendientes = computed(() => this.pagos().filter(p => p.estado === 'PENDING').length);
    countAprobados = computed(() => this.pagos().filter(p => p.estado === 'APPROVED').length);
    countPagados = computed(() => this.pagos().filter(p => p.estado === 'PAID').length);
    totalPendiente = computed(() =>
        this.pagos()
            .filter(p => p.estado === 'PENDING' || p.estado === 'APPROVED')
            .reduce((s, p) => s + (p.monto ?? 0), 0)
    );

    ngOnInit(): void {
        this.loadPagos();
    }

    loadPagos(): void {
        this.cargando.set(true);
        this.pagosService.getAll().subscribe({
            next: (res) => {
                this.pagos.set(Array.isArray(res) ? res : (res?.content ?? []));
                this.cargando.set(false);
            },
            error: () => this.cargando.set(false)
        });
    }

    approve(p: Payment): void {
        if (p.id) {
            this.pagosService.approve(p.id).subscribe({ next: () => this.loadPagos() });
        }
    }

    reject(p: Payment): void {
        if (p.id) {
            this.pagosService.reject(p.id).subscribe({ next: () => this.loadPagos() });
        }
    }

    pay(p: Payment): void {
        if (p.id) {
            this.pagosService.markAsPaid(p.id).subscribe({ next: () => this.loadPagos() });
        }
    }

    registrarPago(): void {
        if (!this.formBeneficiario.trim() || this.formMonto <= 0) return;
        this.guardando.set(true);
        const req: PaymentRequest = {
            tenantId: this.auth.currentUser()?.activeCompanyId ?? 1,
            tipoPago: this.formTipo,
            monto: this.formMonto,
            moneda: 'PEN',
            metodoPago: 'TRANSFERENCIA',
            fechaSolicitud: new Date().toISOString().split('T')[0],
            beneficiarioNombre: this.formBeneficiario,
            beneficiarioDocumento: '',
            concepto: this.formConcepto
        };
        this.pagosService.create(req).subscribe({
            next: () => {
                this.showModal.set(false);
                this.resetForm();
                this.guardando.set(false);
                this.loadPagos();
            },
            error: () => this.guardando.set(false)
        });
    }

    badgePago(estado: string): string {
        const map: Record<string, string> = {
            PENDING: 'badge badge-warning',
            PENDIENTE: 'badge badge-warning',
            APPROVED: 'badge badge-accent',
            APROBADO: 'badge badge-accent',
            PAID: 'badge badge-success',
            PAGADO: 'badge badge-success',
            REJECTED: 'badge badge-error',
            RECHAZADO: 'badge badge-error'
        };
        return map[estado] ?? 'badge badge-neutral';
    }

    private resetForm(): void {
        this.formBeneficiario = '';
        this.formConcepto = '';
        this.formMonto = 0;
        this.formTipo = 'PROVEEDOR';
    }
}
