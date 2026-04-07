import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import {
    AsientoRecurrenteService,
    AsientoRecurrente,
    AsientoRecurrenteRequest,
    RecurringLineItem,
} from '../../services/asiento-recurrente.service';

const FRECUENCIA_LABELS: Record<string, string> = {
    MENSUAL: 'Mensual',
    TRIMESTRAL: 'Trimestral',
    SEMESTRAL: 'Semestral',
    ANUAL: 'Anual',
};

interface LineaForm {
    accountCode: string;
    movementType: 'DEBE' | 'HABER';
    amount: number | null;
}

@Component({
    selector: 'app-asientos-recurrentes',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DecimalPipe, DatePipe, FormsModule, DrawerComponent],
    templateUrl: './asientos-recurrentes.component.html',
})
export class AsientosRecurrentesComponent implements OnInit {
    private service = inject(AsientoRecurrenteService);

    recurrentes = signal<AsientoRecurrente[]>([]);
    cargando = signal(false);
    guardando = signal(false);
    error = signal('');

    mostrarForm = signal(false);

    // Form state
    nombre = signal('');
    descripcion = signal('');
    frecuencia = signal<string>('MENSUAL');
    diaEjecucion = signal(1);
    fechaInicio = signal('');
    fechaFin = signal('');
    glosa = signal('');
    lineas = signal<LineaForm[]>([
        { accountCode: '', movementType: 'DEBE', amount: null },
        { accountCode: '', movementType: 'HABER', amount: null },
    ]);

    readonly frecuencias = ['MENSUAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL'];
    readonly frecuenciaLabel = (f: string) => FRECUENCIA_LABELS[f] ?? f;

    ngOnInit() {
        this.cargar();
    }

    cargar() {
        this.cargando.set(true);
        this.error.set('');
        this.service.listar().subscribe({
            next: data => {
                this.recurrentes.set(data);
                this.cargando.set(false);
            },
            error: () => {
                this.error.set('No se pudo cargar la lista de asientos recurrentes.');
                this.cargando.set(false);
            },
        });
    }

    abrirForm() {
        this.resetForm();
        this.mostrarForm.set(true);
    }

    cerrarForm() {
        this.mostrarForm.set(false);
    }

    agregarLinea() {
        this.lineas.update(ls => [...ls, { accountCode: '', movementType: 'DEBE', amount: null }]);
    }

    eliminarLinea(idx: number) {
        this.lineas.update(ls => ls.filter((_, i) => i !== idx));
    }

    guardar() {
        const lineas = this.lineas();
        if (!this.nombre() || !this.frecuencia() || !this.fechaInicio() || !this.glosa()) {
            return;
        }
        if (lineas.length < 2 || lineas.some(l => !l.accountCode || !l.amount)) {
            return;
        }

        const request: AsientoRecurrenteRequest = {
            name: this.nombre(),
            description: this.descripcion(),
            frequency: this.frecuencia(),
            executionDay: this.diaEjecucion(),
            startDate: this.fechaInicio(),
            endDate: this.fechaFin() || null,
            templateGloss: this.glosa(),
            templateLines: lineas.map(l => ({
                accountCode: l.accountCode,
                movementType: l.movementType,
                amount: l.amount as number,
            } as RecurringLineItem)),
        };

        this.guardando.set(true);
        this.service.crear(request).subscribe({
            next: creado => {
                this.recurrentes.update(ls => [...ls, creado]);
                this.guardando.set(false);
                this.mostrarForm.set(false);
            },
            error: () => {
                this.guardando.set(false);
            },
        });
    }

    ejecutarAhora(id: string) {
        this.service.ejecutarAhora(id).subscribe({
            next: actualizado => {
                this.recurrentes.update(ls => ls.map(r => r.id === id ? actualizado : r));
            },
        });
    }

    desactivar(id: string) {
        this.service.desactivar(id).subscribe({
            next: () => {
                this.recurrentes.update(ls => ls.map(r => r.id === id ? { ...r, active: false } : r));
            },
        });
    }

    private resetForm() {
        this.nombre.set('');
        this.descripcion.set('');
        this.frecuencia.set('MENSUAL');
        this.diaEjecucion.set(1);
        this.fechaInicio.set('');
        this.fechaFin.set('');
        this.glosa.set('');
        this.lineas.set([
            { accountCode: '', movementType: 'DEBE', amount: null },
            { accountCode: '', movementType: 'HABER', amount: null },
        ]);
    }
}
