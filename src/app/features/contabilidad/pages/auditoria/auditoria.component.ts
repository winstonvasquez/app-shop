import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuditLogService, AuditLog } from '../../services/audit-log.service';
import { ButtonComponent } from '@shared/components';
import { pageTotalElements } from '@core/models/pagination.model';
import { DataTableComponent, TableColumn, TableAction, PaginationEvent } from '@shared/ui/tables/data-table/data-table.component';

@Component({
    selector: 'app-auditoria',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ButtonComponent, DataTableComponent],
    templateUrl: './auditoria.component.html',
})
export class AuditoriaComponent implements OnInit {
    private service = inject(AuditLogService);

    readonly cargando = signal(false);
    readonly logs = signal<AuditLog[]>([]);
    readonly totalElements = signal(0);
    readonly page = signal(0);
    readonly pageSize = 50;

    // Filtros (gobiernan la consulta al backend)
    readonly filtroTipo = signal('');
    readonly filtroDesde = signal('');
    readonly filtroHasta = signal('');

    // Búsqueda rápida client-side sobre la página cargada (el backend no soporta texto libre)
    readonly searchQuery = signal('');

    readonly seleccionado = signal<AuditLog | null>(null);
    readonly totalPages = computed(() => Math.ceil(this.totalElements() / this.pageSize));

    readonly logsFiltrados = computed(() => {
        const q = this.searchQuery().trim().toLowerCase();
        const lista = this.logs();
        if (!q) return lista;
        return lista.filter(l =>
            l.usuarioNombre?.toLowerCase().includes(q) ||
            l.entidadTipo?.toLowerCase().includes(q) ||
            l.accion?.toLowerCase().includes(q) ||
            l.entidadId?.toLowerCase().includes(q)
        );
    });

    columns: TableColumn<AuditLog>[] = [
        { key: 'timestamp', label: 'Fecha/Hora', render: l => this.formatFechaHora(l.timestamp) },
        {
            key: 'entidadTipo', label: 'Entidad', html: true,
            render: l => `<div class="text-sm">${l.entidadTipo}</div><div class="text-muted text-xs font-mono">${l.entidadId.substring(0, 8)}…</div>`
        },
        {
            key: 'accion', label: 'Acción', html: true,
            render: l => `<span class="${this.accionClass(l.accion)}">${l.accion}</span>`
        },
        { key: 'usuarioNombre', label: 'Usuario' },
    ];

    actions: TableAction<AuditLog>[] = [
        { label: 'Ver detalle', icon: 'view', onClick: l => this.verDetalle(l) },
    ];

    ngOnInit() {
        this.buscar();
    }

    buscar(nuevaPagina = 0) {
        this.page.set(nuevaPagina);
        this.searchQuery.set('');
        this.cargando.set(true);
        this.service.buscar({
            entidadTipo: this.filtroTipo() || undefined,
            desde: this.filtroDesde() ? new Date(this.filtroDesde()).toISOString() : undefined,
            hasta: this.filtroHasta() ? new Date(this.filtroHasta()).toISOString() : undefined,
            page: nuevaPagina,
            size: this.pageSize,
        }).subscribe({
            next: res => {
                this.logs.set(res.content);
                this.totalElements.set(pageTotalElements(res));
                this.cargando.set(false);
            },
            error: () => this.cargando.set(false),
        });
    }

    onSearchTerm(term: string) {
        this.searchQuery.set(term);
    }

    onPageChange(event: PaginationEvent) {
        this.buscar(event.page);
    }

    verDetalle(log: AuditLog) {
        this.seleccionado.set(log);
    }

    cerrarDetalle() {
        this.seleccionado.set(null);
    }

    accionClass(accion: string): string {
        const map: Record<string, string> = {
            CREAR: 'badge badge-success',
            MODIFICAR: 'badge badge-warning',
            CERRAR: 'badge badge-neutral',
            ANULAR: 'badge badge-error',
            EXTORNAR: 'badge badge-error',
            APROBAR: 'badge badge-success',
        };
        return map[accion] ?? 'badge badge-neutral';
    }

    formatJson(json: string | null): string {
        if (!json) return '—';
        try { return JSON.stringify(JSON.parse(json), null, 2); }
        catch { return json; }
    }

    formatFechaHora(timestamp: string): string {
        if (!timestamp) return '';
        try {
            const d = new Date(timestamp);
            const fecha = d.toLocaleDateString('es-PE');
            const hora = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
            return `${fecha} ${hora}`;
        } catch { return timestamp; }
    }
}
