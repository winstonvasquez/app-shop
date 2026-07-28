import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DecimalPipe, NgClass } from '@angular/common';
import { PresupuestoService, Presupuesto, ComparativoPresupuesto } from '../../services/presupuesto.service';
import { ButtonComponent } from '@shared/components';

type Vista = 'lista' | 'comparativo' | 'nuevo';

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

@Component({
    selector: 'app-presupuesto',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, DecimalPipe, NgClass, ButtonComponent],
    templateUrl: './presupuesto.component.html',
})
export class PresupuestoComponent implements OnInit {
    private service = inject(PresupuestoService);

    readonly meses = MESES;
    readonly vista = signal<Vista>('lista');
    readonly cargando = signal(false);
    readonly error = signal('');

    readonly presupuestos = signal<Presupuesto[]>([]);
    readonly comparativo = signal<ComparativoPresupuesto[]>([]);
    readonly annoComparativo = signal(new Date().getFullYear());

    // Nuevo form
    readonly nuevoAnno = signal(new Date().getFullYear() + 1);
    readonly nuevoNombre = signal('');
    /** Grilla cuenta x mes: el detalle DEBE capturarse en el alta (el controller no
     *  tiene endpoint para agregarlo después, solo POST / y PUT /{id}/aprobar). */
    readonly filas = signal<{ codigoCuenta: string; montos: number[] }[]>([this.filaVacia()]);

    ngOnInit() {
        this.cargarLista();
    }

    private filaVacia(): { codigoCuenta: string; montos: number[] } {
        return { codigoCuenta: '', montos: Array(12).fill(0) };
    }

    private cargarLista() {
        this.service.listar().subscribe({
            next: lista => this.presupuestos.set(lista),
        });
    }

    verComparativo(anno: number) {
        this.annoComparativo.set(anno);
        this.cargando.set(true);
        this.service.comparativo(anno).subscribe({
            next: c => { this.comparativo.set(c); this.vista.set('comparativo'); this.cargando.set(false); },
            error: () => this.cargando.set(false),
        });
    }

    aprobar(pres: Presupuesto) {
        this.service.aprobar(pres.id).subscribe({
            next: actualizado => this.presupuestos.update(lista =>
                lista.map(p => p.id === actualizado.id ? actualizado : p)
            ),
        });
    }

    /** Abre el formulario de alta con la grilla de detalle reiniciada. */
    abrirNuevo() {
        this.nuevoAnno.set(new Date().getFullYear() + 1);
        this.nuevoNombre.set('');
        this.filas.set([this.filaVacia()]);
        this.error.set('');
        this.vista.set('nuevo');
    }

    agregarFila() {
        this.filas.update(fs => [...fs, this.filaVacia()]);
    }

    eliminarFila(i: number) {
        if (this.filas().length <= 1) return;
        this.filas.update(fs => fs.filter((_, idx) => idx !== i));
    }

    actualizarCodigoCuenta(i: number, valor: string) {
        this.filas.update(fs => fs.map((f, idx) => idx === i ? { ...f, codigoCuenta: valor } : f));
    }

    actualizarMonto(i: number, mesIdx: number, valor: number) {
        this.filas.update(fs => fs.map((f, idx) =>
            idx === i ? { ...f, montos: f.montos.map((m, mi) => mi === mesIdx ? valor : m) } : f
        ));
    }

    crear() {
        if (!this.nuevoNombre()) return;
        // Detalle = cuenta x mes con monto > 0; filas sin código de cuenta no se envían.
        const detalles = this.filas()
            .filter(f => f.codigoCuenta.trim() !== '')
            .flatMap(f => f.montos
                .map((montoPresupuestado, idx) => ({ codigoCuenta: f.codigoCuenta.trim(), mes: idx + 1, montoPresupuestado }))
                .filter(d => d.montoPresupuestado > 0));
        this.cargando.set(true);
        this.service.crear({ anno: this.nuevoAnno(), nombre: this.nuevoNombre(), detalles }).subscribe({
            next: p => {
                this.presupuestos.update(lista => [p, ...lista]);
                this.filas.set([this.filaVacia()]);
                this.vista.set('lista');
                this.cargando.set(false);
            },
            error: (e: HttpErrorResponse) => {
                this.error.set(e.error?.detail ?? 'Error al crear presupuesto');
                this.cargando.set(false);
            },
        });
    }

    cancelar() {
        this.vista.set('lista');
        this.error.set('');
    }

    ejecucionClass(pct: number): string {
        if (pct >= 90) return 'badge badge-success';
        if (pct >= 60) return 'badge badge-warning';
        return 'badge badge-error';
    }
}
