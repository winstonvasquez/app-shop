import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { RecepcionService } from '../../services/recepcion.service';
import { Recepcion } from '../../models/orden-compra.model';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { LoadingSpinnerComponent } from '@shared/ui/feedback/loading-spinner/loading-spinner.component';
import { ButtonComponent } from '@shared/components';

@Component({
    selector: 'app-recepcion-detalle',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    PageHeaderComponent,
    AlertComponent,
    LoadingSpinnerComponent,
    DatePipe,
    ButtonComponent
  ],
    templateUrl: './recepcion-detalle.component.html'
})
export class RecepcionDetalleComponent implements OnInit {
    private readonly recepcionService = inject(RecepcionService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    recepcion = signal<Recepcion | null>(null);
    loading = signal(true);
    error = signal<string | null>(null);
    confirming = signal(false);
    confirmError = signal<string | null>(null);

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: '/admin' },
        { label: 'Compras', url: '/admin/compras/dashboard' },
        { label: 'Recepción', url: '/admin/compras/recepcion' },
        { label: 'Detalle' }
    ];

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) {
            this.router.navigate(['/admin/compras/recepcion']);
            return;
        }
        this.loadRecepcion(id);
    }

    private loadRecepcion(id: string): void {
        this.loading.set(true);
        this.recepcionService.getRecepcionById(id).subscribe({
            next: (rec) => {
                this.recepcion.set(rec);
                this.loading.set(false);
            },
            error: (err: Error) => {
                this.error.set(err.message ?? 'No se pudo cargar el detalle.');
                this.loading.set(false);
            }
        });
    }

    confirmarRecepcion(): void {
        const rec = this.recepcion();
        if (!rec?.id) return;
        this.confirming.set(true);
        this.confirmError.set(null);
        this.recepcionService.confirmarRecepcion(rec.id).subscribe({
            next: (updated) => {
                this.recepcion.set(updated);
                this.confirming.set(false);
            },
            error: (err: Error) => {
                this.confirmError.set(err.message);
                this.confirming.set(false);
            }
        });
    }

    onVolver(): void {
        this.router.navigate(['/admin/compras/recepcion']);
    }

    badgeEstado(estado: string): string {
        const map: Record<string, string> = {
            PENDIENTE: 'warning',
            CONFORME: 'success',
            CON_DIFERENCIAS: 'error',
            DIFERENCIA: 'error',
            COMPLETADA: 'success'
        };
        return map[estado] ?? 'neutral';
    }
}
