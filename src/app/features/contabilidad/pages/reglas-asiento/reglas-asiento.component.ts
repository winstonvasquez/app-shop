import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import {
    ReglaAsientoService, ReglaAsiento, ReglaAsientoRequest, DetalleRegla, TransactionType
} from '../../services/regla-asiento.service';

@Component({
    selector: 'app-reglas-asiento',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, DatePipe, DrawerComponent],
    templateUrl: './reglas-asiento.component.html',
})
export class ReglasAsientoComponent implements OnInit {
    private service = inject(ReglaAsientoService);

    readonly reglas = signal<ReglaAsiento[]>([]);
    readonly cargando = signal(false);
    readonly guardando = signal(false);
    readonly mostrarForm = signal(false);
    readonly editandoId = signal<string | null>(null);
    readonly error = signal('');
    readonly errorForm = signal('');

    // Form signals
    readonly tipoTransaccion = signal<TransactionType>('VENTA');
    readonly nombre = signal('');
    readonly descripcion = signal('');
    readonly detalles = signal<DetalleRegla[]>([
        { codigoCuenta: '', campoOrigen: 'BASE', movimientoTipo: 'DEBE', porcentaje: 100, orden: 1 },
        { codigoCuenta: '', campoOrigen: 'BASE', movimientoTipo: 'HABER', porcentaje: 100, orden: 2 },
    ]);

    readonly tiposTransaccion: TransactionType[] = ['VENTA', 'COMPRA', 'NOMINA', 'TESORERIA', 'INVENTARIO', 'LOGISTICA'];
    readonly camposOrigen = ['TOTAL', 'BASE', 'IGV', 'ISC', 'OTROS_CARGOS'] as const;

    ngOnInit() { this.cargar(); }

    cargar() {
        this.cargando.set(true);
        this.error.set('');
        this.service.listar().subscribe({
            next: data => { this.reglas.set(data); this.cargando.set(false); },
            error: (err: unknown) => {
                this.error.set(err instanceof HttpErrorResponse ? (err.error?.message ?? err.message) : 'Error al cargar reglas');
                this.cargando.set(false);
            },
        });
    }

    abrirNueva() {
        this.editandoId.set(null);
        this.tipoTransaccion.set('VENTA');
        this.nombre.set('');
        this.descripcion.set('');
        this.detalles.set([
            { codigoCuenta: '', campoOrigen: 'BASE', movimientoTipo: 'DEBE', porcentaje: 100, orden: 1 },
            { codigoCuenta: '', campoOrigen: 'BASE', movimientoTipo: 'HABER', porcentaje: 100, orden: 2 },
        ]);
        this.errorForm.set('');
        this.mostrarForm.set(true);
    }

    abrirEditar(r: ReglaAsiento) {
        this.editandoId.set(r.id);
        this.tipoTransaccion.set(r.transactionType as TransactionType);
        this.nombre.set(r.nombre);
        this.descripcion.set(r.descripcion);
        this.detalles.set(r.detalles.map(d => ({ ...d })));
        this.errorForm.set('');
        this.mostrarForm.set(true);
    }

    cerrarForm() { this.mostrarForm.set(false); }

    agregarDetalle() {
        const n = this.detalles().length + 1;
        this.detalles.update(ds => [
            ...ds,
            { codigoCuenta: '', campoOrigen: 'BASE' as const, movimientoTipo: 'DEBE' as const, porcentaje: 100, orden: n },
        ]);
    }

    eliminarDetalle(i: number) {
        if (this.detalles().length <= 2) return;
        this.detalles.update(ds => ds.filter((_, idx) => idx !== i));
    }

    actualizarDetalle(i: number, campo: keyof DetalleRegla, valor: unknown) {
        this.detalles.update(ds => ds.map((d, idx) =>
            idx === i ? { ...d, [campo]: valor } : d
        ));
    }

    guardar() {
        if (!this.nombre() || this.detalles().some(d => !d.codigoCuenta)) return;
        const req: ReglaAsientoRequest = {
            transactionType: this.tipoTransaccion(),
            nombre: this.nombre(),
            descripcion: this.descripcion(),
            detalles: this.detalles(),
        };
        this.guardando.set(true);
        this.errorForm.set('');
        const id = this.editandoId();
        const obs = id ? this.service.actualizar(id, req) : this.service.crear(req);
        obs.subscribe({
            next: regla => {
                if (id) {
                    this.reglas.update(rs => rs.map(r => r.id === id ? regla : r));
                } else {
                    this.reglas.update(rs => [...rs, regla]);
                }
                this.mostrarForm.set(false);
                this.guardando.set(false);
            },
            error: (err: unknown) => {
                this.errorForm.set(err instanceof HttpErrorResponse ? (err.error?.message ?? err.message) : 'Error al guardar');
                this.guardando.set(false);
            },
        });
    }

    desactivar(id: string) {
        this.service.desactivar(id).subscribe({
            next: () => this.reglas.update(rs => rs.map(r => r.id === id ? { ...r, activo: false } : r)),
            error: (err: unknown) => {
                this.error.set(err instanceof HttpErrorResponse ? (err.error?.message ?? err.message) : 'Error al desactivar');
            },
        });
    }
}
