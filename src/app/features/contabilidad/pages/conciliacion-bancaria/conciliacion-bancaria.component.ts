import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DecimalPipe, DatePipe, NgClass } from '@angular/common';
import {
    ConciliacionBancariaService,
    Conciliacion,
    CuentaBancaria,
    ConciliacionRequest,
    PartidaConciliacionRequest,
    PartidaConciliacion,
} from '../../services/conciliacion-bancaria.service';
import { PeriodoService, PeriodoContable } from '../../services/periodo.service';

type Vista = 'lista' | 'detalle' | 'nueva';

@Component({
    selector: 'app-conciliacion-bancaria',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, DecimalPipe, DatePipe, NgClass],
    templateUrl: './conciliacion-bancaria.component.html',
})
export class ConciliacionBancariaComponent implements OnInit {
    private service = inject(ConciliacionBancariaService);
    private periodoService = inject(PeriodoService);

    readonly vista = signal<Vista>('lista');
    readonly cargando = signal(false);
    readonly error = signal('');

    readonly conciliaciones = signal<Conciliacion[]>([]);
    readonly cuentas = signal<CuentaBancaria[]>([]);
    readonly periodos = signal<PeriodoContable[]>([]);
    readonly seleccionada = signal<Conciliacion | null>(null);

    // Nueva conciliación form
    readonly nuevaCuentaId = signal('');
    readonly nuevaPeriodoId = signal('');
    readonly nuevaFechaInicio = signal('');
    readonly nuevaFechaFin = signal('');
    readonly nuevaSaldoBancoInicio = signal(0);
    readonly nuevaSaldoBancoFin = signal(0);

    // Nueva partida form
    readonly mostrarFormPartida = signal(false);
    readonly partidaOrigen = signal<'BANCO' | 'LIBRO'>('BANCO');
    readonly partidaFecha = signal('');
    readonly partidaDescripcion = signal('');
    readonly partidaReferencia = signal('');
    readonly partidaMonto = signal(0);
    readonly partidaTipoMovimiento = signal<'DEBITO' | 'CREDITO'>('DEBITO');

    readonly partidasBanco = computed(() =>
        (this.seleccionada()?.partidas ?? []).filter(p => p.origen === 'BANCO')
    );
    readonly partidasLibro = computed(() =>
        (this.seleccionada()?.partidas ?? []).filter(p => p.origen === 'LIBRO')
    );
    readonly diferencia = computed(() => this.seleccionada()?.diferencia ?? 0);
    readonly estaConciliado = computed(() => this.seleccionada()?.estado === 'CONCILIADO');
    readonly pendientes = computed(() => this.seleccionada()?.partidasPendientes ?? 0);

    ngOnInit() {
        this.cargarDatos();
    }

    private cargarDatos() {
        this.cargando.set(true);
        this.service.listar().subscribe({
            next: lista => { this.conciliaciones.set(lista); this.cargando.set(false); },
            error: () => this.cargando.set(false),
        });
        this.service.listarCuentas().subscribe({ next: c => this.cuentas.set(c) });
        this.periodoService.listar().subscribe({ next: p => this.periodos.set(p) });
    }

    abrirNueva() {
        this.error.set('');
        this.vista.set('nueva');
    }

    cancelar() {
        this.vista.set('lista');
        this.seleccionada.set(null);
    }

    abrirDetalle(c: Conciliacion) {
        this.cargando.set(true);
        this.service.obtener(c.id).subscribe({
            next: detalle => {
                this.seleccionada.set(detalle);
                this.vista.set('detalle');
                this.cargando.set(false);
            },
            error: () => this.cargando.set(false),
        });
    }

    crear() {
        if (!this.nuevaCuentaId() || !this.nuevaPeriodoId()) return;
        const req: ConciliacionRequest = {
            cuentaBancariaId: this.nuevaCuentaId(),
            periodoId: this.nuevaPeriodoId(),
            fechaInicio: this.nuevaFechaInicio(),
            fechaFin: this.nuevaFechaFin(),
            saldoBancoInicio: this.nuevaSaldoBancoInicio(),
            saldoBancoFin: this.nuevaSaldoBancoFin(),
        };
        this.cargando.set(true);
        this.error.set('');
        this.service.crear(req).subscribe({
            next: creada => {
                this.conciliaciones.update(lista => [creada, ...lista]);
                this.seleccionada.set(creada);
                this.vista.set('detalle');
                this.cargando.set(false);
            },
            error: (e: HttpErrorResponse) => {
                this.error.set(e.error?.detail ?? 'Error al crear conciliación');
                this.cargando.set(false);
            },
        });
    }

    agregarPartida() {
        const id = this.seleccionada()?.id;
        if (!id) return;
        const req: PartidaConciliacionRequest = {
            origen: this.partidaOrigen(),
            fecha: this.partidaFecha(),
            descripcion: this.partidaDescripcion(),
            referencia: this.partidaReferencia(),
            monto: this.partidaMonto(),
            tipoMovimiento: this.partidaTipoMovimiento(),
        };
        this.cargando.set(true);
        this.service.agregarPartida(id, req).subscribe({
            next: actualizada => {
                this.seleccionada.set(actualizada);
                this.mostrarFormPartida.set(false);
                this.limpiarFormPartida();
                this.cargando.set(false);
            },
            error: (e: HttpErrorResponse) => {
                this.error.set(e.error?.detail ?? 'Error al agregar partida');
                this.cargando.set(false);
            },
        });
    }

    marcarConciliada(partida: PartidaConciliacion) {
        const id = this.seleccionada()?.id;
        if (!id || partida.conciliado) return;
        this.service.marcarConciliada(id, partida.id).subscribe({
            next: actualizada => this.seleccionada.set(actualizada),
        });
    }

    cerrar() {
        const id = this.seleccionada()?.id;
        if (!id) return;
        this.cargando.set(true);
        this.service.cerrar(id).subscribe({
            next: actualizada => {
                this.seleccionada.set(actualizada);
                this.conciliaciones.update(lista =>
                    lista.map(c => c.id === actualizada.id ? actualizada : c)
                );
                this.cargando.set(false);
            },
            error: (e: HttpErrorResponse) => {
                this.error.set(e.error?.detail ?? 'Error al cerrar conciliación');
                this.cargando.set(false);
            },
        });
    }

    private limpiarFormPartida() {
        this.partidaOrigen.set('BANCO');
        this.partidaFecha.set('');
        this.partidaDescripcion.set('');
        this.partidaReferencia.set('');
        this.partidaMonto.set(0);
        this.partidaTipoMovimiento.set('DEBITO');
    }
}
