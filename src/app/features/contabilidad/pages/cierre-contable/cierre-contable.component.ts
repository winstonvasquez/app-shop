import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { switchMap } from 'rxjs/operators';
import { PeriodoService, PeriodoContable } from '../../services/periodo.service';
import {
    CierreContableService,
    ValidacionCierreResult,
    CierreResult,
    CierreRequest,
} from '../../services/cierre-contable.service';

type Paso = 'seleccion' | 'validacion' | 'reapertura' | 'resultado';

@Component({
    selector: 'app-cierre-contable',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule],
    templateUrl: './cierre-contable.component.html',
})
export class CierreContableComponent implements OnInit {
    private periodoService = inject(PeriodoService);
    private cierreService = inject(CierreContableService);

    readonly periodos = signal<PeriodoContable[]>([]);
    readonly periodoSeleccionado = signal<string>('');
    readonly tipoCierre = signal<'MENSUAL' | 'ANUAL'>('MENSUAL');
    readonly motivo = signal('');
    readonly paso = signal<Paso>('seleccion');
    readonly cargando = signal(false);
    readonly validacion = signal<ValidacionCierreResult | null>(null);
    readonly resultado = signal<CierreResult | null>(null);
    readonly error = signal('');

    readonly periodoActual = computed(() =>
        this.periodos().find(p => p.id === this.periodoSeleccionado()) ?? null
    );

    ngOnInit() {
        this.periodoService.listar().subscribe({
            next: lista => {
                this.periodos.set(lista);
                const abierto = lista.find(p => p.estado === 'ABIERTO');
                if (abierto) this.periodoSeleccionado.set(abierto.id);
            },
        });
    }

    validar() {
        const id = this.periodoSeleccionado();
        if (!id) return;
        this.cargando.set(true);
        this.error.set('');
        this.cierreService.validar(id).subscribe({
            next: res => {
                this.validacion.set(res);
                this.paso.set('validacion');
                this.cargando.set(false);
            },
            error: (err: unknown) => {
                const msg = err instanceof HttpErrorResponse
                    ? (err.error?.message ?? err.message)
                    : 'Error al validar el período';
                this.error.set(msg);
                this.cargando.set(false);
            },
        });
    }

    ejecutarCierre() {
        const id = this.periodoSeleccionado();
        if (!id || !this.motivo()) return;
        this.cargando.set(true);
        this.error.set('');
        const req: CierreRequest = { periodoId: id, motivo: this.motivo() };
        const obs =
            this.tipoCierre() === 'MENSUAL'
                ? this.cierreService.cierreMensual(req)
                : this.cierreService.cierreAnual(req);
        obs.pipe(
            switchMap(res => {
                this.resultado.set(res);
                this.paso.set('resultado');
                return this.periodoService.listar();
            })
        ).subscribe({
            next: lista => {
                this.periodos.set(lista);
                this.cargando.set(false);
            },
            error: (err: unknown) => {
                const msg = err instanceof HttpErrorResponse
                    ? (err.error?.message ?? err.message)
                    : 'Error al ejecutar el cierre';
                this.error.set(msg);
                this.cargando.set(false);
            },
        });
    }

    abrirReapertura() {
        this.motivo.set('');
        this.error.set('');
        this.paso.set('reapertura');
    }

    reabrir() {
        const id = this.periodoSeleccionado();
        if (!id || !this.motivo()) return;
        this.cargando.set(true);
        this.cierreService.reabrir(id, this.motivo()).pipe(
            switchMap(() => this.periodoService.listar())
        ).subscribe({
            next: lista => {
                this.periodos.set(lista);
                this.reiniciar();
                this.cargando.set(false);
            },
            error: (err: unknown) => {
                const msg = err instanceof HttpErrorResponse
                    ? (err.error?.message ?? err.message)
                    : 'Error al reabrir el período';
                this.error.set(msg);
                this.cargando.set(false);
            },
        });
    }

    reiniciar() {
        this.paso.set('seleccion');
        this.validacion.set(null);
        this.resultado.set(null);
        this.motivo.set('');
        this.error.set('');
    }
}
