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

    ngOnInit() {
        this.cargarLista();
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

    crear() {
        if (!this.nuevoNombre()) return;
        this.cargando.set(true);
        this.service.crear({ anno: this.nuevoAnno(), nombre: this.nuevoNombre(), detalles: [] }).subscribe({
            next: p => {
                this.presupuestos.update(lista => [p, ...lista]);
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
