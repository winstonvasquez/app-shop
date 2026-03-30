import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PeriodoService, PeriodoContable } from '../../services/periodo.service';

interface ResumenIGV {
    ventasGravadas: number;
    igvVentas: number;
    comprasGravadas: number;
    igvCompras: number;
    igvNeto: number;
    rentaBase: number;
    rentaMensual: number;
}

@Component({
    selector: 'app-declaracion-igv',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DecimalPipe, FormsModule],
    templateUrl: './declaracion-igv.component.html',
    styleUrls: ['./declaracion-igv.component.scss']
})
export class DeclaracionIgvComponent implements OnInit {
    private periodoService = inject(PeriodoService);

    periodos = signal<PeriodoContable[]>([]);
    periodoSeleccionado = signal<string>('');
    periodoActivo = signal<PeriodoContable | null>(null);

    resumen = signal<ResumenIGV>({
        ventasGravadas: 147999,
        igvVentas: 22576,
        comprasGravadas: 68983,
        igvCompras: 12569,
        igvNeto: 10007,
        rentaBase: 147999,
        rentaMensual: 2220
    });

    readonly vencimientoPDT = computed(() => {
        const p = this.periodoActivo();
        if (!p) return '—';
        const anno = p.anno;
        const mes = p.mes;
        const nextMes = mes === 12 ? 1 : mes + 1;
        const nextAnno = mes === 12 ? anno + 1 : anno;
        return `12/${String(nextMes).padStart(2, '0')}/${nextAnno}`;
    });

    ngOnInit() {
        this.periodoService.listar().subscribe({
            next: (lista) => {
                this.periodos.set(lista);
                const abierto = lista.find(p => p.estado === 'ABIERTO');
                if (abierto) {
                    this.periodoSeleccionado.set(abierto.id);
                    this.periodoActivo.set(abierto);
                }
            },
            error: () => {}
        });
    }

    cambiarPeriodo(id: string) {
        this.periodoSeleccionado.set(id);
        const p = this.periodos().find(x => x.id === id) ?? null;
        this.periodoActivo.set(p);
    }
}
