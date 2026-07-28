import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { AuditLogService, AuditLog, UsuarioFiltroOption, longToSyntheticUuid } from '../../services/audit-log.service';
import { ButtonComponent } from '@shared/components';
import { pageTotalElements } from '@core/models/pagination.model';
import {
    DataTableComponent, TableColumn, TableAction, PaginationEvent,
    FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent,
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { CatalogService } from '@core/services/catalog.service';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';

@Component({
    selector: 'app-auditoria',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ButtonComponent, DataTableComponent],
    templateUrl: './auditoria.component.html',
})
export class AuditoriaComponent implements OnInit {
    private service = inject(AuditLogService);
    readonly catalog = inject(CatalogService);

    readonly cargando = signal(false);
    readonly logs = signal<AuditLog[]>([]);
    readonly totalElements = signal(0);
    readonly page = signal(0);
    readonly pageSize = 50;

    // Filtros — TODOS server-side, la vista nunca filtra la página cargada.
    readonly filterEntidadTipo = signal('');
    readonly filterAccion = signal('');
    readonly filterUsuarioId = signal('');
    readonly filterDesde = signal<string | null>(null);
    readonly filterHasta = signal<string | null>(null);
    readonly searchQuery = signal('');

    readonly seleccionado = signal<AuditLog | null>(null);
    readonly totalPages = computed(() => Math.ceil(this.totalElements() / this.pageSize));

    /** Usuarios de la empresa para el select de filtro (id envuelto como UUID sintético). */
    readonly usuariosFiltro = signal<UsuarioFiltroOption[]>([]);

    filters: FilterConfig[] = [
        catalogFilter(this.catalog, 'ENTIDAD_AUDITORIA_CONTABLE', 'entidadTipo', 'Entidad'),
        catalogFilter(this.catalog, 'ACCION_AUDITORIA', 'accion', 'Acción'),
        signalFilter('usuarioId', 'Usuario', this.usuariosFiltro, u => ({ value: u.id, label: u.nombre })),
    ];

    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'timestamp', label: 'Fecha del evento' },
    ];

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

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios,
     * aplicando los mismos filtros vigentes en la búsqueda (entidadTipo/desde/hasta).
     * Ver /finance/api/v1/contabilidad/audit-log/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.accounting}/api/v1/contabilidad/audit-log/export`,
        filename: 'auditoria',
        params: () => ({
            entidadTipo: this.filterEntidadTipo() || undefined,
            accion: this.filterAccion() || undefined,
            usuarioId: this.filterUsuarioId() || undefined,
            search: this.searchQuery() || undefined,
            desde: this.desdeIso(),
            hasta: this.hastaIso(),
        }),
    };

    /** `yyyy-MM-dd` del date-input → ISO-8601, que es lo que espera el backend. */
    private desdeIso(): string | undefined {
        const v = this.filterDesde();
        return v ? new Date(v).toISOString() : undefined;
    }

    private hastaIso(): string | undefined {
        const v = this.filterHasta();
        return v ? new Date(v).toISOString() : undefined;
    }

    ngOnInit() {
        this.buscar();
        this.loadUsuariosFiltro();
    }

    /** Usuarios de la empresa para el select de filtro del toolbar. */
    private loadUsuariosFiltro(): void {
        this.service.listarUsuariosFiltro().subscribe({
            // El backend guarda usuarioId como UUID sintético (new UUID(0, id)),
            // no como el Long de microshopusers → hay que envolverlo.
            next: (us) => this.usuariosFiltro.set(
                (us ?? []).map(u => ({
                    id: longToSyntheticUuid(u.id),
                    nombre: u.persona?.nombreCompleto?.trim() || u.username
                }))
            ),
            error: () => this.usuariosFiltro.set([])
        });
    }

    buscar(nuevaPagina = 0) {
        this.page.set(nuevaPagina);
        this.cargando.set(true);
        this.service.buscar({
            entidadTipo: this.filterEntidadTipo() || undefined,
            accion: this.filterAccion() || undefined,
            usuarioId: this.filterUsuarioId() || undefined,
            search: this.searchQuery() || undefined,
            desde: this.desdeIso(),
            hasta: this.hastaIso(),
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

    /** La búsqueda por texto va al backend (`search`), no filtra la página cargada. */
    onSearchTerm(term: string) {
        this.searchQuery.set(term);
        this.buscar(0);
    }

    onFilterChangeEvent(event: FilterChangeEvent) {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'entidadTipo': this.filterEntidadTipo.set(valor); break;
            case 'accion':      this.filterAccion.set(valor); break;
            case 'usuarioId':   this.filterUsuarioId.set(valor); break;
            default: return;
        }
        this.buscar(0);
    }

    onDateRangeChange(event: DateRangeChangeEvent) {
        if (event.field !== 'timestamp') return;
        this.filterDesde.set(event.from);
        this.filterHasta.set(event.to);
        this.buscar(0);
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear() {
        this.searchQuery.set('');
        this.filterEntidadTipo.set('');
        this.filterAccion.set('');
        this.filterUsuarioId.set('');
        this.filterDesde.set(null);
        this.filterHasta.set(null);
        this.buscar(0);
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
