import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, NgClass } from '@angular/common';
import { AuditLogService, AuditLog } from '../../services/audit-log.service';
import { ButtonComponent } from '@shared/components';

@Component({
    selector: 'app-auditoria',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, DatePipe, NgClass, ButtonComponent],
    templateUrl: './auditoria.component.html',
})
export class AuditoriaComponent implements OnInit {
    private service = inject(AuditLogService);

    readonly cargando = signal(false);
    readonly logs = signal<AuditLog[]>([]);
    readonly totalElements = signal(0);
    readonly page = signal(0);
    readonly pageSize = 50;

    // Filtros
    readonly filtroTipo = signal('');
    readonly filtroDesde = signal('');
    readonly filtroHasta = signal('');

    readonly seleccionado = signal<AuditLog | null>(null);
    readonly totalPages = computed(() => Math.ceil(this.totalElements() / this.pageSize));

    ngOnInit() {
        this.buscar();
    }

    buscar(nuevaPagina = 0) {
        this.page.set(nuevaPagina);
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
                this.totalElements.set(res.totalElements);
                this.cargando.set(false);
            },
            error: () => this.cargando.set(false),
        });
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
}
