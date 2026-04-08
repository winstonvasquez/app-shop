import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DecimalPipe, NgClass } from '@angular/common';
import { ConsolidadoService, ConsolidadoReport, LineaConsolidada } from '../../services/consolidado.service';

type Seccion = 'balance' | 'resultados';

@Component({
    selector: 'app-consolidado',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, DecimalPipe, NgClass],
    templateUrl: './consolidado.component.html',
})
export class ConsolidadoComponent {
    private service = inject(ConsolidadoService);

    readonly anno = signal(new Date().getFullYear());
    readonly empresaIdsTexto = signal('');
    readonly cargando = signal(false);
    readonly error = signal('');
    readonly reporte = signal<ConsolidadoReport | null>(null);
    readonly seccion = signal<Seccion>('balance');

    readonly lineas = computed((): LineaConsolidada[] => {
        const r = this.reporte();
        if (!r) return [];
        const mapa = this.seccion() === 'balance' ? r.balance : r.resultados;
        return Object.values(mapa);
    });

    readonly empresas = computed(() => this.reporte()?.empresas ?? []);

    consolidar() {
        const ids = this.empresaIdsTexto().split(',').map(s => s.trim()).filter(Boolean);
        if (ids.length === 0) {
            this.error.set('Ingrese al menos un UUID de empresa');
            return;
        }
        this.cargando.set(true);
        this.error.set('');
        this.service.consolidar(this.anno(), ids).subscribe({
            next: r => { this.reporte.set(r); this.cargando.set(false); },
            error: (e: HttpErrorResponse) => {
                this.error.set(e.error?.detail ?? 'Error al consolidar');
                this.cargando.set(false);
            },
        });
    }

    saldoEmpresa(linea: LineaConsolidada, empresaId: string): number {
        const v = linea.porEmpresa[empresaId];
        return v ?? 0;
    }
}
