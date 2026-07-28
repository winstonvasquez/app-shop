import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonComponent } from '@shared/components';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import {
    DataTableComponent, TableColumn, TableAction, PaginationEvent,
    FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, staticFilter, ACTIVO_OPTIONS } from '@shared/ui/tables/data-table/filter-helpers';
import { NOTIFICATION_DURATION } from '@shared/constants/ui.constants';
import { USER_ROLE } from '@shared/constants/feature-flags.constants';
import { AuthService } from '@core/auth/auth.service';
import { CatalogService } from '@core/services/catalog.service';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import {
    AccountingMappingService,
} from '../../services/accounting-mapping.service';
import {
    AccountingMapping, AccountingMappingRequest, EVENT_TYPES_CONOCIDOS,
} from '../../models/accounting-mapping.model';

@Component({
    selector: 'app-accounting-mapping',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ButtonComponent, DrawerComponent, DataTableComponent],
    templateUrl: './accounting-mapping.component.html',
})
export class AccountingMappingComponent implements OnInit {
    private service = inject(AccountingMappingService);
    private authService = inject(AuthService);
    readonly catalog = inject(CatalogService);

    readonly eventTypesConocidos = EVENT_TYPES_CONOCIDOS;

    /**
     * El backend expone crear/editar/eliminar/probar bajo
     * `AppConstants.Seguridad.ADMIN_OR_INTERNAL` (`hasRole('ADMIN') or hasAuthority('ROLE_INTERNAL_SERVICE')`)
     * en `AccountingMappingController`. La autoridad `ROLE_INTERNAL_SERVICE` es s2s (header
     * `X-Internal-Token`), nunca la tiene un usuario logueado desde el navegador — por eso
     * acá solo se evalúa el rol `ADMIN` exacto (no `isAdmin()`, que también incluye EMPLOYEE).
     */
    readonly puedeAdministrar = computed(() => this.authService.currentUser()?.role === USER_ROLE.ADMIN);

    readonly mapeos = signal<AccountingMapping[]>([]);
    readonly cargando = signal(false);
    readonly guardando = signal(false);
    readonly mostrarForm = signal(false);
    readonly editandoId = signal<string | null>(null);
    readonly error = signal('');
    readonly errorForm = signal('');

    // ── Prueba de asiento (POST /test/{eventType}) ─────────────────────────────
    readonly probandoEventType = signal<string | null>(null);
    readonly resultadoPrueba = signal<{ eventType: string; ok: boolean; mensaje: string } | null>(null);

    // ── Tabla — filtros TODOS server-side (la vista nunca filtra la página cargada) ──
    readonly searchQuery = signal('');
    readonly filterEventType = signal('');
    readonly filterActivo = signal('');
    readonly filterFechaCreacionDesde = signal<string | null>(null);
    readonly filterFechaCreacionHasta = signal<string | null>(null);
    readonly currentPage = signal(0);
    readonly pageSize = signal(20);
    readonly totalElements = signal(0);
    readonly totalPages = signal(0);

    // Filtros select del toolbar. eventType sale de erp_parameters (TIPO_EVENTO_CONTABLE_LOGISTICA);
    // activo es una columna boolean (sin catálogo, mismo patrón que ordenes-compra).
    readonly filters: FilterConfig[] = [
        catalogFilter(this.catalog, 'TIPO_EVENTO_CONTABLE_LOGISTICA', 'eventType', 'Tipo de evento'),
        staticFilter('activo', 'Estado', ACTIVO_OPTIONS)
    ];

    readonly dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fechaCreacion', label: 'Fecha de creación' }
    ];

    readonly columns: TableColumn<AccountingMapping>[] = [
        {
            key: 'eventType', label: 'Tipo de evento', html: true,
            render: m => `<span class="badge badge-neutral">${m.eventType}</span>`
        },
        { key: 'debitAccount', label: 'Cuenta débito' },
        { key: 'creditAccount', label: 'Cuenta crédito' },
        {
            key: 'descriptionTemplate', label: 'Plantilla descripción',
            render: m => m.descriptionTemplate || '—'
        },
        {
            key: 'activo', label: 'Estado', html: true,
            render: m => m.activo
                ? '<span class="badge badge-success">Activo</span>'
                : '<span class="badge badge-neutral">Inactivo</span>'
        },
        {
            key: 'fechaCreacion', label: 'Creado',
            render: m => m.fechaCreacion ? new Date(m.fechaCreacion).toLocaleDateString('es-PE') : '—'
        },
    ];

    /**
     * "Editar" se muestra TAMBIÉN para los mapeos inactivos: es la única vía para reactivarlos
     * (el drawer expone el estado como casilla y el PUT ahora acepta `activo`). Antes las tres
     * acciones exigían `m.activo`, así que un mapeo desactivado quedaba inalcanzable desde la UI
     * y tampoco se podía recrear — la unique constraint (event_type, tenant_id) no filtra por
     * `activo`. "Probar" y "Eliminar" sí siguen restringidas a los activos: no tiene sentido
     * disparar un asiento con un mapeo dado de baja, ni volver a darlo de baja.
     */
    readonly actions: TableAction<AccountingMapping>[] = [
        {
            label: 'Probar', icon: 'zap', class: 'btn-view',
            show: m => m.activo && this.puedeAdministrar(),
            onClick: m => this.probar(m),
        },
        {
            label: 'Editar', icon: 'edit', class: 'btn-view',
            show: () => this.puedeAdministrar(),
            onClick: m => this.abrirEditar(m),
        },
        {
            label: 'Eliminar', icon: 'trash-2', class: 'btn-view',
            show: m => m.activo && this.puedeAdministrar(),
            onClick: m => this.eliminar(m.id),
        },
    ];

    // Form signals
    readonly eventType = signal('');
    readonly debitAccount = signal('');
    readonly creditAccount = signal('');
    readonly descriptionTemplate = signal('');
    /**
     * Estado del mapeo en edición — EDITABLE: `AccountingMappingRequest` declara `activo` y el
     * PUT lo aplica, de modo que desmarcar la casilla da de baja el mapeo y volver a marcarla lo
     * reactiva. Es la única vía de reactivación: la unique constraint (event_type, tenant_id) no
     * filtra por `activo`, así que un mapeo desactivado impide crear otro para el mismo evento.
     */
    readonly activoEditando = signal(true);

    ngOnInit() { this.cargar(); }

    cargar() {
        this.cargando.set(true);
        this.error.set('');
        this.service.listar({
            page: this.currentPage(),
            size: this.pageSize(),
            q: this.searchQuery() || undefined,
            eventType: this.filterEventType() || undefined,
            activo: this.filterActivo() === '' ? undefined : this.filterActivo() === 'true',
            fechaCreacionDesde: this.filterFechaCreacionDesde() || undefined,
            fechaCreacionHasta: this.filterFechaCreacionHasta() || undefined,
        }).subscribe({
            next: res => {
                this.mapeos.set(res.content ?? []);
                this.totalElements.set(pageTotalElements(res));
                this.totalPages.set(pageTotalPages(res));
                this.cargando.set(false);
            },
            error: (err: unknown) => {
                this.error.set(this.mensajeError(err, 'Error al cargar mapeos contables'));
                this.cargando.set(false);
            },
        });
    }

    /** La búsqueda por texto va al backend (`q`), no filtra la página cargada. */
    onSearchTerm(term: string) {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.cargar();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'eventType': this.filterEventType.set(valor); break;
            case 'activo':    this.filterActivo.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.cargar();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field === 'fechaCreacion') {
            this.filterFechaCreacionDesde.set(event.from);
            this.filterFechaCreacionHasta.set(event.to);
            this.currentPage.set(0);
            this.cargar();
        }
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterEventType.set('');
        this.filterActivo.set('');
        this.filterFechaCreacionDesde.set(null);
        this.filterFechaCreacionHasta.set(null);
        this.currentPage.set(0);
        this.cargar();
    }

    onPageChange(event: PaginationEvent) {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.cargar();
    }

    abrirNuevo() {
        this.editandoId.set(null);
        this.eventType.set('');
        this.debitAccount.set('');
        this.creditAccount.set('');
        this.descriptionTemplate.set('');
        this.activoEditando.set(true);
        this.errorForm.set('');
        this.mostrarForm.set(true);
    }

    /**
     * El backend SÍ permite cambiar `eventType` en el PUT (sin validar duplicados
     * como en el POST), pero el frontend lo bloquea en edición: es la clave que
     * `LogisticsAccountingService` usa para resolver el mapeo automáticamente
     * (findByEventTypeAndTenantId) — cambiarlo aquí podría romper ese enrutamiento
     * en silencio. Para renombrar: crear uno nuevo + eliminar el anterior.
     */
    abrirEditar(m: AccountingMapping) {
        this.editandoId.set(m.id);
        this.eventType.set(m.eventType);
        this.debitAccount.set(m.debitAccount);
        this.creditAccount.set(m.creditAccount);
        this.descriptionTemplate.set(m.descriptionTemplate ?? '');
        this.activoEditando.set(m.activo);
        this.errorForm.set('');
        this.mostrarForm.set(true);
    }

    cerrarForm() { this.mostrarForm.set(false); }

    guardar() {
        if (!this.eventType() || !this.debitAccount() || !this.creditAccount()) return;
        const id = this.editandoId();
        const req: AccountingMappingRequest = {
            eventType: this.eventType().trim(),
            debitAccount: this.debitAccount().trim(),
            creditAccount: this.creditAccount().trim(),
            descriptionTemplate: this.descriptionTemplate().trim(),
            // Solo el PUT lo interpreta (permite reactivar); el alta siempre nace activa,
            // así que no lo enviamos al crear para no sugerir lo contrario.
            ...(id ? { activo: this.activoEditando() } : {}),
        };
        this.guardando.set(true);
        this.errorForm.set('');
        const obs = id ? this.service.actualizar(id, req) : this.service.crear(req);
        obs.subscribe({
            next: () => {
                this.mostrarForm.set(false);
                this.guardando.set(false);
                this.cargar();
            },
            error: (err: unknown) => {
                this.errorForm.set(this.mensajeError(err, 'Error al guardar el mapeo'));
                this.guardando.set(false);
            },
        });
    }

    eliminar(id: string) {
        this.service.eliminar(id).subscribe({
            next: () => this.cargar(),
            error: (err: unknown) => {
                this.error.set(this.mensajeError(err, 'Error al eliminar el mapeo'));
            },
        });
    }

    /**
     * Dispara un asiento de prueba REAL hacia Contabilidad (monto mínimo 0.01)
     * usando el mapeo configurado del evento. No afecta al mapeo en sí.
     */
    probar(m: AccountingMapping) {
        this.probandoEventType.set(m.eventType);
        this.resultadoPrueba.set(null);
        this.service.probar(m.eventType).subscribe({
            next: () => {
                this.resultadoPrueba.set({
                    eventType: m.eventType, ok: true,
                    mensaje: `Asiento de prueba enviado a Contabilidad para "${m.eventType}" (S/ 0.01).`,
                });
                this.probandoEventType.set(null);
                this.ocultarResultadoLuego();
            },
            error: (err: unknown) => {
                this.resultadoPrueba.set({
                    eventType: m.eventType, ok: false,
                    mensaje: this.mensajeError(err, `No se pudo enviar el asiento de prueba para "${m.eventType}"`),
                });
                this.probandoEventType.set(null);
                this.ocultarResultadoLuego();
            },
        });
    }

    private ocultarResultadoLuego() {
        setTimeout(() => this.resultadoPrueba.set(null), NOTIFICATION_DURATION.long);
    }

    private mensajeError(err: unknown, fallback: string): string {
        return err instanceof HttpErrorResponse ? (err.error?.message ?? err.message ?? fallback) : fallback;
    }
}
