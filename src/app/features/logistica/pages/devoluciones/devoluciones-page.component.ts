import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { toObservable } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { DevolucionService } from '../../services/devolucion.service';
import { Devolucion, DevolucionStatus } from '../../models/devolucion.model';
import { AuthService } from '../../../../core/auth/auth.service';
import { ButtonComponent } from '@shared/components';
import { DataTableComponent, TableColumn, TableAction, FilterConfig, FilterChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { PAGINATION } from '@shared/constants/app.constants';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import { CatalogService } from '@core/services/catalog.service';

@Component({
    selector: 'app-devoluciones-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        ButtonComponent,
        DataTableComponent,
        DrawerComponent,
        AlertComponent,
        PageHeaderComponent,
        DatePipe
    ],
    templateUrl: './devoluciones-page.component.html'
})
export class DevolucionesPageComponent implements OnInit {
    private readonly service     = inject(DevolucionService);
    private readonly authService = inject(AuthService);
    private readonly fb          = inject(FormBuilder);
    protected readonly catalog   = inject(CatalogService);

    // Data
    // Backend (GET /logistics/api/returns) devuelve una lista plana sin paginar
    // (ver nota en devolucion.model.ts) — `allDevoluciones` guarda el resultado completo
    // y `devoluciones` el slice de la página actual (paginación client-side).
    allDevoluciones = signal<Devolucion[]>([]);
    devoluciones    = signal<Devolucion[]>([]);
    selected        = signal<Devolucion | null>(null);

    // UI state
    loading         = signal(false);
    loadingDetail   = signal(false);
    error           = signal<string | null>(null);
    showDetail      = signal(false);
    actionLoading   = signal(false);
    actionError     = signal<string | null>(null);

    // Filters — reactive
    filterForm = this.fb.group({
        status: ['']
    });

    // Acción drawer — reactive
    actionForm = this.fb.group({
        motivoRechazo:   ['', [Validators.required]],
        inspectionNotes: ['', [Validators.required]],
        refundAmount:    [0, [Validators.required, Validators.min(0.01)]],
        refundNotas:     ['']
    });

    // Pagination
    currentPage   = signal(0);
    pageSize      = signal<number>(PAGINATION.defaultPageSize);
    totalElements = signal(0);
    totalPages    = signal(0);

    // Filtro de estado en el toolbar del data-table
    readonly estadoFilters: FilterConfig[] = [
        { field: 'status', label: 'Todos los estados',
          options: toObservable(this.catalog.options('ESTADO_DEVOLUCION_LOGISTICA')).pipe(
              map(o => o.map(x => ({ value: x.codigo, label: x.valor })))
          ) }
    ];

    breadcrumbs: Breadcrumb[] = [
        { label: 'Inicio',    url: '/admin/dashboard' },
        { label: 'Logística', url: '/logistica/dashboard' },
        { label: 'Devoluciones' }
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (mismo filtro de estado que la lista). Ver /logistics/api/returns/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.logistics}/api/returns/export`,
        filename: 'devoluciones',
        params: () => ({ status: this.filterForm.value.status || undefined })
    };

    columns: TableColumn<Devolucion>[] = [
        { key: 'id', label: 'ID', render: (r) => r.id.slice(0, 8) + '…' },
        { key: 'orderId',   label: 'Pedido',  render: (r) => r.orderId?.slice(0, 8) + '…' || '—' },
        { key: 'reason',    label: 'Motivo',  render: (r) => r.reason || '—' },
        { key: 'refundAmount', label: 'Reembolso', align: 'right',
          render: (r) => r.refundAmount != null ? `S/ ${r.refundAmount.toFixed(2)}` : '—' },
        { key: 'requestedAt', label: 'Solicitado',
          render: (r) => new Date(r.requestedAt).toLocaleDateString('es-PE') },
        { key: 'status', label: 'Estado', html: true,
          render: (r) => `<span class="badge ${this.badgeStatus(r.status)}">${this.catalog.label('ESTADO_DEVOLUCION_LOGISTICA', r.status)}</span>` }
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
        const filterStatus = this.filterForm.value.status ?? '';
        this.service.getDevoluciones(this.companyId, filterStatus || undefined).subscribe({
            next: (res) => {
                this.allDevoluciones.set(res);
                this.totalElements.set(res.length);
                this.totalPages.set(Math.max(1, Math.ceil(res.length / this.pageSize())));
                this.applyPage();
                this.loading.set(false);
            },
            error: (err: Error) => {
                this.error.set(err.message ?? 'Error al cargar devoluciones.');
                this.loading.set(false);
            }
        });
    }

    /** Aplica el slice de la página actual sobre el arreglo completo ya cargado (paginación client-side). */
    private applyPage() {
        const start = this.currentPage() * this.pageSize();
        this.devoluciones.set(this.allDevoluciones().slice(start, start + this.pageSize()));
    }

    onFilterChangeEvent(event: FilterChangeEvent) {
        if (event.field !== 'status') return;
        this.filterForm.patchValue({ status: event.value != null ? String(event.value) : '' });
        this.currentPage.set(0);
        this.loadDevoluciones();
    }

    onPaginationChange(event: PaginationChangeEvent) {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.totalPages.set(Math.max(1, Math.ceil(this.allDevoluciones().length / this.pageSize())));
        this.applyPage();
    }

    // ── Detalle y workflow ───────────────────────────────
    openDetail(dev: Devolucion) {
        this.selected.set(dev);
        this.actionError.set(null);
        this.actionForm.reset({
            motivoRechazo:   '',
            inspectionNotes: '',
            refundAmount:    dev.refundAmount ?? 0,
            refundNotas:     ''
        });
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
        const motivoControl = this.actionForm.controls.motivoRechazo;
        motivoControl.markAsTouched();
        if (motivoControl.invalid) {
            this.actionError.set('Debe indicar el motivo del rechazo.');
            return;
        }
        this.actionLoading.set(true);
        this.actionError.set(null);
        const motivo = motivoControl.value ?? '';
        this.service.rechazar(dev.id, motivo, this.companyId).subscribe({
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
        const notesControl = this.actionForm.controls.inspectionNotes;
        notesControl.markAsTouched();
        if (notesControl.invalid) {
            this.actionError.set('Las notas de inspección son obligatorias.');
            return;
        }
        this.actionLoading.set(true);
        this.actionError.set(null);
        const notes = notesControl.value ?? '';
        this.service.registrarInspeccion(dev.id, notes, this.companyId).subscribe({
            next: (updated) => { this.selected.set(updated); this.actionLoading.set(false); this.loadDevoluciones(); },
            error: (err: Error) => { this.actionError.set(err.message); this.actionLoading.set(false); }
        });
    }

    registrarReembolso() {
        const dev = this.selected();
        if (!dev) return;
        const amountControl = this.actionForm.controls.refundAmount;
        amountControl.markAsTouched();
        if (amountControl.invalid) {
            this.actionError.set('El monto a reembolsar es obligatorio y debe ser mayor a 0.');
            return;
        }
        this.actionLoading.set(true);
        this.actionError.set(null);
        const amount = amountControl.value ?? 0;
        const notas = this.actionForm.value.refundNotas ?? '';
        this.service.registrarReembolso(dev.id, amount, notas, this.companyId).subscribe({
            next: (updated) => { this.selected.set(updated); this.actionLoading.set(false); this.loadDevoluciones(); },
            error: (err: Error) => { this.actionError.set(err.message); this.actionLoading.set(false); }
        });
    }

    badgeStatus(status: DevolucionStatus): string {
        const map: Record<DevolucionStatus, string> = {
            REQUESTED:               'badge-warning',
            APPROVED:                'badge-accent',
            REJECTED:                'badge-error',
            IN_TRANSIT_TO_WAREHOUSE: 'badge-accent',
            RECEIVED:                'badge-accent',
            INSPECTED:               'badge-warning',
            REFUNDED:                'badge-success',
            CANCELLED:               'badge-neutral'
        };
        return map[status] ?? 'badge-neutral';
    }
}
