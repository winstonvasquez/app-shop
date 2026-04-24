import { Component, OnInit, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { OrdenCompra } from '../../models/orden-compra.model';
import { OrdenCompraService } from '../../services/orden-compra.service';
import { ButtonComponent } from '@shared/components';

interface KanbanColumna {
    estado: string;
    label: string;
    color: string;
    ordenes: OrdenCompra[];
}

@Component({
    selector: 'app-kanban-ordenes',
    standalone: true,
    imports: [DecimalPipe, ButtonComponent],
    templateUrl: './kanban-ordenes.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KanbanOrdenesComponent implements OnInit {
    private ocService = inject(OrdenCompraService);
    private authService = inject(AuthService);

    cargando = signal(false);
    error = signal('');
    enviandoId = signal<string | null>(null);

    columnas = signal<KanbanColumna[]>([
        { estado: 'BORRADOR',                label: 'Borrador',               color: 'badge-neutral',  ordenes: [] },
        { estado: 'PENDIENTE',               label: 'Pend. Aprobación',        color: 'badge-warning',  ordenes: [] },
        { estado: 'APROBADA',                label: 'Aprobada',               color: 'badge-accent',   ordenes: [] },
        { estado: 'ENVIADA',                 label: 'Enviada',                color: 'badge-success',  ordenes: [] },
        { estado: 'RECIBIDA_PARCIALMENTE',   label: 'Recibida Parcial',       color: 'badge-warning',  ordenes: [] },
        { estado: 'RECIBIDA',                label: 'Recibida',               color: 'badge-success',  ordenes: [] },
    ]);

    ngOnInit(): void {
        this.cargarTodas();
    }

    cargarTodas(): void {
        this.cargando.set(true);
        this.ocService.getOrdenes(0, 200).subscribe({
            next: (page) => {
                const mapa = new Map<string, OrdenCompra[]>();
                for (const oc of page.content) {
                    const lista = mapa.get(oc.estado) ?? [];
                    lista.push(oc);
                    mapa.set(oc.estado, lista);
                }
                this.columnas.update(cols =>
                    cols.map(c => ({ ...c, ordenes: mapa.get(c.estado) ?? [] }))
                );
                this.cargando.set(false);
            },
            error: () => {
                this.error.set('Error al cargar órdenes');
                this.cargando.set(false);
            }
        });
    }

    enviarAlProveedor(oc: OrdenCompra): void {
        if (!oc.id) return;
        this.enviandoId.set(oc.id);
        this.ocService.enviarAlProveedor(oc.id).subscribe({
            next: () => {
                this.enviandoId.set(null);
                this.cargarTodas();
            },
            error: () => {
                this.enviandoId.set(null);
                this.error.set('No se pudo enviar la OC al proveedor');
            }
        });
    }

    totalColumna(col: KanbanColumna): number {
        return col.ordenes.reduce((s, o) => s + (o.total ?? 0), 0);
    }
}
