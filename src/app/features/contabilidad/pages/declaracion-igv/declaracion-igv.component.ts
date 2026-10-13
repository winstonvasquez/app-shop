import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PeriodoService, PeriodoContable } from '../../services/periodo.service';
import { HttpErrorResponse } from '@angular/common/http';
import { DeclaracionIgvService, PDT621 } from '../../services/declaracion-igv.service';
import { ButtonComponent } from '@shared/components';
import { mensajeDeErrorHttp } from '@core/utils/http-error.util';

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
    readonly historial = signal<PDT621[]>([]);
    readonly error = signal('');
    readonly regimenRenta = signal<'RMT' | 'MYPE' | 'GENERAL'>('RMT');
    readonly coeficiente = signal(0.015);

    /** Vencimiento según el cronograma que calcula el backend (no se recalcula aquí). */
    readonly vencimientoPDT = computed(() => {
        const v = this.resumen()?.fechaVencimiento;
        if (!v) return '—';
        const [anno, mes, dia] = v.split('-');
        return `${dia}/${mes}/${anno}`;
    });

    /** IGV a pagar tras el saldo a favor: lo que el backend ya sumó a la renta en totalAPagar (sin recalcular la regla). */
    readonly igvAPagar = computed(() => {
        const r = this.resumen();
        return r ? r.totalAPagar - r.rentaMensual : 0;
    });

    /**
     * /calcular siempre responde BORRADOR, así que el estado real sale del historial:
     * una declaración PRESENTADA/RECTIFICADA del periodo elegido no se puede volver a guardar (409).
     */
    readonly declaracionCerrada = computed(() => {
        const id = this.periodoSeleccionado();
        return this.historial().some(h => h.periodoId === id && h.estado !== 'BORRADOR');
    });

    /** Nombre del periodo de una declaración del historial (el DTO sólo trae el id). */
    nombrePeriodo(periodoId: string): string {
        return this.periodos().find(p => p.id === periodoId)?.nombre ?? '—';
    }

    private cargarHistorial() {
        this.declaracionService.historial().subscribe({
            next: page => this.historial.set(page.content),
            error: (err: unknown) => this.error.set(this.mensaje(err, 'No se pudo cargar el historial')),
        });
    }

    private mensaje(err: unknown, porDefecto: string): string {
        return err instanceof HttpErrorResponse ? mensajeDeErrorHttp(err) : porDefecto;
    }

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
        this.cargarHistorial();
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
        this.error.set('');
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
                this.error.set(this.mensaje(err, 'No se pudo calcular el IGV'));
                this.cargando.set(false);
            },
        });
    }

    guardarDeclaracion() {
        const periodoId = this.periodoSeleccionado();
        if (!periodoId) return;
        this.guardando.set(true);
        this.error.set('');
        this.declaracionService.guardar({
            periodoId,
            regimenRenta: this.regimenRenta(),
            coeficienteRenta: this.coeficiente(),
        }).subscribe({
            next: data => {
                this.resumen.set(data);
                this.guardando.set(false);
                this.cargarHistorial();
            },
            error: (err: unknown) => {
                this.error.set(this.mensaje(err, 'No se pudo guardar la declaración'));
                this.guardando.set(false);
            },
        });
    }
}
