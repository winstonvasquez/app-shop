import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { RecepcionService, Recepcion } from '../../services/recepcion.service';

@Component({
    selector: 'app-recepcion-detalle',
    standalone: true,
    imports: [CommonModule, RouterLink, DatePipe],
    template: `
        <div class="breadcrumb">
            <a routerLink="/admin/compras/recepcion">Recepciones</a>
            <span class="sep">›</span>
            <span>Detalle de Recepción</span>
        </div>

        <div class="page-header">
            <div>
                <h1 class="page-title">📥 Recepción de Mercadería</h1>
                <p class="page-subtitle mono">{{ recepcion()?.ordenCompraCodigo ?? '...' }}</p>
            </div>
            @if (recepcion()?.estado === 'PENDIENTE') {
                <div class="page-actions">
                    <button class="btn btn-success" (click)="confirmar()">✅ Confirmar recepción</button>
                </div>
            }
        </div>

        @if (recepcion(); as r) {
            <div class="form-card max-w-[900px]">
                <div class="form-card-title">📋 Datos de la recepción</div>

                <div class="grid grid-cols-2 gap-3 mb-4">
                    <div class="info-row"><span class="lbl">OC Referencia:</span><strong class="mono">{{ r.ordenCompraCodigo ?? '—' }}</strong></div>
                    <div class="info-row"><span class="lbl">N° Guía:</span><strong class="mono">{{ r.numeroGuia ?? '—' }}</strong></div>
                    <div class="info-row"><span class="lbl">Transportista:</span><span>{{ r.transportista ?? '—' }}</span></div>
                    <div class="info-row"><span class="lbl">Fecha recepción:</span><span>{{ r.fechaRecepcion | date:'dd/MM/yyyy' }}</span></div>
                    <div class="info-row"><span class="lbl">Responsable:</span><span>{{ r.responsable ?? '—' }}</span></div>
                    <div class="info-row"><span class="lbl">Almacén:</span><span>{{ r.almacenDestino }}</span></div>
                    <div class="info-row"><span class="lbl">Estado:</span>
                        <span class="badge"
                            [class.badge-warning]="r.estado === 'PENDIENTE'"
                            [class.badge-success]="r.estado === 'CONFORME'"
                            [class.badge-danger]="r.estado === 'DIFERENCIA'">
                            {{ r.estado }}
                        </span>
                    </div>
                </div>

                @if (r.observaciones) {
                    <div class="info-box mb-md">
                        <strong>Observaciones:</strong> {{ r.observaciones }}
                    </div>
                }
            </div>
        } @else {
            <div class="text-muted text-center p-12">
                ⏳ Cargando recepción...
            </div>
        }
    `,
    styles: [`:host { display: block; }`]
})
export class RecepcionDetalleComponent implements OnInit {
    private recepcionService = inject(RecepcionService);
    private route = inject(ActivatedRoute);

    recepcion = signal<Recepcion | null>(null);

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.recepcionService.getRecepcionById(id).subscribe({
                next: (r) => this.recepcion.set(r),
                error: () => this.recepcion.set(null)
            });
        }
    }

    confirmar(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id && confirm('¿Confirmar la recepción de mercadería?')) {
            this.recepcionService.confirmarRecepcion(id).subscribe({
                next: (r) => this.recepcion.set(r)
            });
        }
    }
}
