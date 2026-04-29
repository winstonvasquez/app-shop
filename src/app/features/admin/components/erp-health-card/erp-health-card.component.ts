import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    OnInit,
    inject,
    signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { ErpHealthService } from '@features/admin/services/erp-health.service';
import {
    ErpEstado,
    ErpHealthResponse,
    ServiceHealth
} from '@features/admin/models/erp-health.model';

interface ServiceRow {
    label: string;
    health: ServiceHealth;
}

/**
 * Tarjeta del dashboard admin que muestra el estado consolidado del ERP.
 *
 * <p>Polling cada 30s al endpoint cross-service que agrega los outbox de
 * ventas/compras/logística. Si {@code estadoGlobal} es DEGRADED o WARN
 * destaca el problema; si OK indica que los flujos s2s sincronizan bien.</p>
 */
@Component({
    selector: 'app-erp-health-card',
    standalone: true,
    imports: [DatePipe],
    templateUrl: './erp-health-card.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErpHealthCardComponent implements OnInit {
    private readonly service = inject(ErpHealthService);
    private readonly destroyRef = inject(DestroyRef);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly health = signal<ErpHealthResponse | null>(null);

    private static readonly POLL_MS = 30_000;

    ngOnInit(): void {
        this.refresh();
        const id = setInterval(() => this.refresh(), ErpHealthCardComponent.POLL_MS);
        this.destroyRef.onDestroy(() => clearInterval(id));
    }

    refresh(): void {
        this.loading.set(true);
        this.service.getHealth()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (h) => {
                    this.health.set(h);
                    this.error.set(null);
                    this.loading.set(false);
                },
                error: (e) => {
                    this.error.set(e?.message ?? 'No se pudo consultar el estado');
                    this.loading.set(false);
                }
            });
    }

    services(): ServiceRow[] {
        const h = this.health();
        if (!h) return [];
        return [
            { label: 'Ventas', health: h.ventas },
            { label: 'Compras', health: h.compras },
            { label: 'Logística', health: h.logistica }
        ];
    }

    firstServiceWithErrors(): ServiceRow | null {
        return this.services().find(s => (s.health.topErrors?.length ?? 0) > 0) ?? null;
    }

    estadoColor(estado: ErpEstado | string | undefined): string {
        if (!estado) return 'bg-gray-200 text-gray-700';
        if (estado === 'OK') return 'bg-emerald-100 text-emerald-700';
        if (estado.startsWith('WARN')) return 'bg-amber-100 text-amber-700';
        return 'bg-rose-100 text-rose-700';
    }

    serviceColor(estado: string): string {
        if (estado === 'OK') return 'border-emerald-200';
        if (estado.startsWith('WARN')) return 'border-amber-200';
        return 'border-rose-200';
    }

    estadoLabel(estado: string | undefined): string {
        if (!estado) return '—';
        if (estado.length > 30) return estado.substring(0, 30) + '…';
        return estado;
    }
}
