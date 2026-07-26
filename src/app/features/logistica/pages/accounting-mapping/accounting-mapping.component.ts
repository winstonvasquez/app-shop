import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonComponent } from '@shared/components';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn, TableAction, PaginationEvent } from '@shared/ui/tables/data-table/data-table.component';
import { NOTIFICATION_DURATION } from '@shared/constants/ui.constants';
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

    readonly eventTypesConocidos = EVENT_TYPES_CONOCIDOS;

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

    // ── Tabla ─────────────────────────────────────────────────────────────────
    readonly searchQuery = signal('');
    readonly currentPage = signal(0);
    readonly pageSize = signal(20);

    readonly mapeosFiltrados = computed(() => {
        const q = this.searchQuery().trim().toLowerCase();
        const lista = this.mapeos();
        if (!q) return lista;
        return lista.filter(m =>
            m.eventType?.toLowerCase().includes(q) ||
            m.debitAccount?.toLowerCase().includes(q) ||
            m.creditAccount?.toLowerCase().includes(q)
        );
    });

    readonly mapeosPaginados = computed(() => {
        const inicio = this.currentPage() * this.pageSize();
        return this.mapeosFiltrados().slice(inicio, inicio + this.pageSize());
    });
    readonly totalPagesLocal = computed(() => Math.ceil(this.mapeosFiltrados().length / this.pageSize()) || 1);

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

    readonly actions: TableAction<AccountingMapping>[] = [
        {
            label: 'Probar', icon: 'zap', class: 'btn-view',
            show: m => m.activo,
            onClick: m => this.probar(m),
        },
        {
            label: 'Editar', icon: 'edit', class: 'btn-view',
            show: m => m.activo,
            onClick: m => this.abrirEditar(m),
        },
        {
            label: 'Eliminar', icon: 'trash-2', class: 'btn-view',
            show: m => m.activo,
            onClick: m => this.eliminar(m.id),
        },
    ];

    // Form signals
    readonly eventType = signal('');
    readonly debitAccount = signal('');
    readonly creditAccount = signal('');
    readonly descriptionTemplate = signal('');

    ngOnInit() { this.cargar(); }

    cargar() {
        this.cargando.set(true);
        this.error.set('');
        this.service.listar().subscribe({
            next: data => { this.mapeos.set(data); this.cargando.set(false); },
            error: (err: unknown) => {
                this.error.set(this.mensajeError(err, 'Error al cargar mapeos contables'));
                this.cargando.set(false);
            },
        });
    }

    onSearchTerm(term: string) {
        this.searchQuery.set(term);
        this.currentPage.set(0);
    }

    onPageChange(event: PaginationEvent) {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
    }

    abrirNuevo() {
        this.editandoId.set(null);
        this.eventType.set('');
        this.debitAccount.set('');
        this.creditAccount.set('');
        this.descriptionTemplate.set('');
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
        this.errorForm.set('');
        this.mostrarForm.set(true);
    }

    cerrarForm() { this.mostrarForm.set(false); }

    guardar() {
        if (!this.eventType() || !this.debitAccount() || !this.creditAccount()) return;
        const req: AccountingMappingRequest = {
            eventType: this.eventType().trim(),
            debitAccount: this.debitAccount().trim(),
            creditAccount: this.creditAccount().trim(),
            descriptionTemplate: this.descriptionTemplate().trim(),
        };
        this.guardando.set(true);
        this.errorForm.set('');
        const id = this.editandoId();
        const obs = id ? this.service.actualizar(id, req) : this.service.crear(req);
        obs.subscribe({
            next: mapeo => {
                if (id) {
                    this.mapeos.update(ms => ms.map(m => m.id === id ? mapeo : m));
                } else {
                    this.mapeos.update(ms => [...ms, mapeo]);
                }
                this.mostrarForm.set(false);
                this.guardando.set(false);
            },
            error: (err: unknown) => {
                this.errorForm.set(this.mensajeError(err, 'Error al guardar el mapeo'));
                this.guardando.set(false);
            },
        });
    }

    eliminar(id: string) {
        this.service.eliminar(id).subscribe({
            next: () => this.mapeos.update(ms => ms.map(m => m.id === id ? { ...m, activo: false } : m)),
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
