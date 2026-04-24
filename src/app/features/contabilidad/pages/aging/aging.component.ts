import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DecimalPipe, DatePipe, NgClass } from '@angular/common';
import { AgingService, AgingReport } from '../../services/aging.service';
import { ButtonComponent } from '@shared/components';

type Tab = 'cxc' | 'cxp';

@Component({
    selector: 'app-aging',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, DecimalPipe, DatePipe, NgClass, ButtonComponent],
    templateUrl: './aging.component.html',
})
export class AgingComponent implements OnInit {
    private service = inject(AgingService);

    readonly tab = signal<Tab>('cxc');
    readonly anno = signal(new Date().getFullYear());
    readonly cargando = signal(false);
    readonly error = signal('');
    readonly reportCxc = signal<AgingReport | null>(null);
    readonly reportCxp = signal<AgingReport | null>(null);

    readonly reporte = computed(() => this.tab() === 'cxc' ? this.reportCxc() : this.reportCxp());

    ngOnInit() {
        this.cargar();
    }

    cambiarTab(t: Tab) {
        this.tab.set(t);
        if (t === 'cxc' && !this.reportCxc()) this.cargar();
        if (t === 'cxp' && !this.reportCxp()) this.cargarCxp();
    }

    cargar() {
        this.cargando.set(true);
        this.error.set('');
        this.service.cxc(this.anno()).subscribe({
            next: r => { this.reportCxc.set(r); this.cargando.set(false); },
            error: (e: HttpErrorResponse) => {
                this.error.set(e.error?.detail ?? 'Error al cargar aging CxC');
                this.cargando.set(false);
            },
        });
        this.service.cxp(this.anno()).subscribe({
            next: r => this.reportCxp.set(r),
        });
    }

    private cargarCxp() {
        this.cargando.set(true);
        this.service.cxp(this.anno()).subscribe({
            next: r => { this.reportCxp.set(r); this.cargando.set(false); },
            error: () => this.cargando.set(false),
        });
    }

    semaforo(dias: number): string {
        if (dias <= 30) return 'badge badge-success';
        if (dias <= 60) return 'badge badge-warning';
        if (dias <= 90) return 'badge badge-accent';
        return 'badge badge-error';
    }
}
