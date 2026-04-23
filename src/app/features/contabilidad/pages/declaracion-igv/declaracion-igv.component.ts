import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PeriodoService, PeriodoContable } from '../../services/periodo.service';
import { DeclaracionIgvService, PDT621, HistorialDeclaracion } from '../../services/declaracion-igv.service';
import { ButtonComponent } from '@shared/components';

@Component({
    selector: 'app-declaracion-igv',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DecimalPipe, DatePipe, FormsModule, ButtonComponent],
    templateUrl: './declaracion-igv.component.html',
    styleUrls: ['./declaracion-igv.component.scss']
})
export class DeclaracionIgvComponent implements OnInit {
    private periodoService = inject(PeriodoService);
    private declaracionService = inject(DeclaracionIgvService);

    readonly periodos = signal<PeriodoContable[]>([]);
    readonly periodoSeleccionado = signal<string>('');
    readonly periodoActivo = signal<PeriodoContable | null>(null);

    readonly resumen = signal<PDT621 | null>(null);
    readonly guardando = signal(false);
    readonly cargando = signal(false);
    readonly historial = signal<HistorialDeclaracion[]>([]);
    readonly regimenRenta = signal<'RMT' | 'MYPE' | 'GENERAL'>('RMT');
    readonly coeficiente = signal(0.015);

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
                const abierto = lista.find(periodo => periodo.estado === 'ABIERTO');
                if (abierto) {
                    this.periodoSeleccionado.set(abierto.id);
                    this.periodoActivo.set(abierto);
                    this.calcularIGV(abierto.id);
                }
            },
            error: (err: unknown) => console.warn('[DeclaracionIGV] Error al cargar periodos:', err)
        });
        this.declaracionService.historial().subscribe({
            next: h => this.historial.set(h),
            error: (err: unknown) => console.warn('[DeclaracionIGV] Error al cargar historial:', err)
        });
    }

    cambiarPeriodo(id: string) {
        this.periodoSeleccionado.set(id);
        const periodo = this.periodos().find(p => p.id === id) ?? null;
        this.periodoActivo.set(periodo);
        if (id) {
            this.calcularIGV(id);
        }
    }

    calcularIGV(periodoId: string) {
        this.cargando.set(true);
        this.declaracionService.calcular({
            periodoId,
            regimenRenta: this.regimenRenta(),
            coeficienteRenta: this.coeficiente(),
        }).subscribe({
            next: data => {
                this.resumen.set(data);
                this.cargando.set(false);
            },
            error: (err: unknown) => {
                console.warn('[DeclaracionIGV] Error al calcular IGV:', err);
                this.cargando.set(false);
            },
        });
    }

    guardarDeclaracion() {
        const periodoId = this.periodoSeleccionado();
        if (!periodoId) return;
        this.guardando.set(true);
        this.declaracionService.guardar({
            periodoId,
            regimenRenta: this.regimenRenta(),
            coeficienteRenta: this.coeficiente(),
        }).subscribe({
            next: data => {
                this.resumen.set(data);
                this.guardando.set(false);
            },
            error: (err: unknown) => {
                console.warn('[DeclaracionIGV] Error al guardar declaración:', err);
                this.guardando.set(false);
            },
        });
    }
}
