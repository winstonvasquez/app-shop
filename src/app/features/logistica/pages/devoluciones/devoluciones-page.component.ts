import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DevolucionService } from '../../services/devolucion.service';
import { Devolucion, DevolucionStatus } from '../../models/devolucion.model';
import { AuthService } from '../../../../core/auth/auth.service';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { LoadingSpinnerComponent } from '@shared/ui/feedback/loading-spinner/loading-spinner.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';

const STATUS_LABELS: Record<DevolucionStatus, string> = {
    REQUESTED: 'Solicitada',
    APPROVED:  'Aprobada',
    REJECTED:  'Rechazada',
    RECEIVED:  'Recibida',
    INSPECTED: 'Inspeccionada',
    REFUNDED:  'Reembolsada'
};

@Component({
    selector: 'app-devoluciones-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        FormsModule,
        DataTableComponent,
        DrawerComponent,
        AlertComponent,
        LoadingSpinnerComponent,
        PageHeaderComponent
    ],
    templateUrl: './devoluciones-page.component.html'
})
export class DevolucionesPageComponent implements OnInit {
    private readonly service     = inject(DevolucionService);
    private readonly authService = inject(AuthService);

    // Data
    devoluciones    = signal<Devolucion[]>([]);
    selected        = signal<Devolucion | null>(null);

    // UI state
    loading         = signal(false);
    loadingDetail   = signal(false);
    error           = signal<string | null>(null);
    showDetail      = signal(false);
    actionLoading   = signal(false);
    actionError     = signal<string | null>(null);

    // Inputs para acciones
    inspectionNotes = '';
    refundAmount    = 0;

    // Filters
    filterStatus = '';

    // Pagination
    currentPage   = signal(0);
    pageSize      = signal(10);
    totalElements = signal(0);
    totalPages    = signal(0);

    readonly statusOptions: { value: DevolucionStatus; label: string }[] = [
        { value: 'REQUESTED', label: 'Solicitada' },
        { value: 'APPROVED',  label: 'Aprobada' },
        { value: 'REJECTED',  label: 'Rechazada' },
        { value: 'RECEIVED',  label: 'Recibida' },
        { value: 'INSPECTED', label: 'Inspeccionada' },
        { value: 'REFUNDED',  label: 'Reembolsada' }
    ];

    readonly reasonOptions = [
        'Producto defectuoso',
        'Producto incorrecto',
        'No llegó en el tiempo acordado',
        'El cliente cambió de opinión',
        'Daño en el transporte',
        'Otro'
    ];

    breadcrumbs: Breadcrumb[] = [
        { label: 'Inicio',    url: '/admin/dashboard' },
        { label: 'Logística', url: '/logistica/dashboard' },
        { label: 'Devoluciones' }
    ];

    columns: TableColumn<Devolucion>[] = [
        { key: 'id', label: 'ID', render: (r) => r.id.slice(0, 8) + '…' },
        { key: 'orderId',   label: 'Pedido',  render: (r) => r.orderId?.slice(0, 8) + '…' || '—' },
        { key: 'reason',    label: 'Motivo',  render: (r) => r.reason || '—' },
        { key: 'refundAmount', label: 'Reembolso', align: 'right',
          render: (r) => r.refundAmount != null ? `S/ ${r.refundAmount.toFixed(2)}` : '—' },
        { key: 'requestedAt', label: 'Solicitado',
          render: (r) => new Date(r.requestedAt).toLocaleDateString('es-PE') },
        { key: 'status', label: 'Estado', html: true,
          render: (r) => `<span class="badge ${this.badgeStatus(r.status)}">${STATUS_LABELS[r.status]}</span>` }
    ];

    actions: TableAction<Devolucion>[] = [
        {
            label: 'Gestionar', icon: '⚙️', class: 'btn-view',
            onClick: (row) => this.openDetail(row)
        }
    ];

    private get companyId(): string {
        return String(this.authService.currentUser()?.activeCompanyId ?? 1);
    }

    ngOnInit() {
        this.loadDevoluciones();
    }

    loadDevoluciones() {
        this.loading.set(true);
        this.error.set(null);
        this.service.getDevoluciones(
            this.companyId, this.currentPage(), this.pageSize(),
            this.filterStatus || undefined
        ).subscribe({
            next: (res) => {
                this.devoluciones.set(res.content);
                this.totalElements.set(res.totalElements);
                this.totalPages.set(res.totalPages);
                this.loading.set(false);
            },
            error: (err: Error) => {
                this.error.set(err.message ?? 'Error al cargar devoluciones.');
                this.loading.set(false);
            }
        });
    }

    onFilterStatus(event: Event) {
        this.filterStatus = (event.target as HTMLSelectElement).value;
        this.currentPage.set(0);
        this.loadDevoluciones();
    }

    onPaginationChange(event: PaginationChangeEvent) {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadDevoluciones();
    }

    // ── Detalle y workflow ───────────────────────────────
    openDetail(dev: Devolucion) {
        this.selected.set(dev);
        this.actionError.set(null);
        this.inspectionNotes = '';
        this.refundAmount    = dev.refundAmount ?? 0;
        this.showDetail.set(true);
    }

    closeDetail() {
        this.showDetail.set(false);
        this.selected.set(null);
    }

    aprobar() {
        const dev = this.selected();
        if (!dev) return;
        this.actionLoading.set(true);
        this.service.aprobar(dev.id, this.companyId).subscribe({
            next: (updated) => { this.selected.set(updated); this.actionLoading.set(false); this.loadDevoluciones(); },
            error: (err: Error) => { this.actionError.set(err.message); this.actionLoading.set(false); }
        });
    }

    rechazar() {
        const dev = this.selected();
        if (!dev) return;
        this.actionLoading.set(true);
        this.service.rechazar(dev.id, this.companyId).subscribe({
            next: (updated) => { this.selected.set(updated); this.actionLoading.set(false); this.loadDevoluciones(); },
            error: (err: Error) => { this.actionError.set(err.message); this.actionLoading.set(false); }
        });
    }

    marcarRecibida() {
        const dev = this.selected();
        if (!dev) return;
        this.actionLoading.set(true);
        this.service.marcarRecibida(dev.id, this.companyId).subscribe({
            next: (updated) => { this.selected.set(updated); this.actionLoading.set(false); this.loadDevoluciones(); },
            error: (err: Error) => { this.actionError.set(err.message); this.actionLoading.set(false); }
        });
    }

    registrarInspeccion() {
        const dev = this.selected();
        if (!dev) return;
        this.actionLoading.set(true);
        this.service.registrarInspeccion(dev.id, this.inspectionNotes, this.companyId).subscribe({
            next: (updated) => { this.selected.set(updated); this.actionLoading.set(false); this.loadDevoluciones(); },
            error: (err: Error) => { this.actionError.set(err.message); this.actionLoading.set(false); }
        });
    }

    registrarReembolso() {
        const dev = this.selected();
        if (!dev) return;
        this.actionLoading.set(true);
        this.service.registrarReembolso(dev.id, this.refundAmount, this.companyId).subscribe({
            next: (updated) => { this.selected.set(updated); this.actionLoading.set(false); this.loadDevoluciones(); },
            error: (err: Error) => { this.actionError.set(err.message); this.actionLoading.set(false); }
        });
    }

    badgeStatus(status: DevolucionStatus): string {
        const map: Record<DevolucionStatus, string> = {
            REQUESTED: 'badge-warning',
            APPROVED:  'badge-accent',
            REJECTED:  'badge-error',
            RECEIVED:  'badge-accent',
            INSPECTED: 'badge-warning',
            REFUNDED:  'badge-success'
        };
        return map[status] ?? 'badge-neutral';
    }

    readonly statusLabels = STATUS_LABELS;
}
