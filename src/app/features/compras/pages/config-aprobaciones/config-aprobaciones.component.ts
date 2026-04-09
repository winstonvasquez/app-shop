import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { AprobacionService } from '../../services/aprobacion.service';
import { ConfigAprobacionRequest, NivelAprobacion } from '../../models/aprobacion.model';

@Component({
    selector: 'app-config-aprobaciones',
    standalone: true,
    imports: [],
    templateUrl: './config-aprobaciones.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigAprobacionesComponent implements OnInit {
    private aprobacionService = inject(AprobacionService);

    niveles = signal<NivelAprobacion[]>([]);
    loading = signal(false);
    showForm = signal(false);

    form = signal<ConfigAprobacionRequest>({
        nombre: '',
        montoMinimo: 0,
        montoMaximo: null,
        rolAprobador: '',
        orden: 1,
    });

    ngOnInit(): void {
        this.cargarNiveles();
    }

    cargarNiveles(): void {
        this.loading.set(true);
        this.aprobacionService.getNiveles().subscribe({
            next: (data) => {
                this.niveles.set(data);
                this.loading.set(false);
            },
            error: () => this.loading.set(false),
        });
    }

    abrirFormulario(): void {
        this.form.set({ nombre: '', montoMinimo: 0, montoMaximo: null, rolAprobador: '', orden: this.niveles().length + 1 });
        this.showForm.set(true);
    }

    guardar(): void {
        const f = this.form();
        if (!f.nombre || !f.rolAprobador) return;
        this.aprobacionService.crearNivel(f).subscribe({
            next: () => {
                this.showForm.set(false);
                this.cargarNiveles();
            },
        });
    }

    eliminar(id: string): void {
        if (!confirm('¿Desactivar este nivel de aprobación?')) return;
        this.aprobacionService.eliminarNivel(id).subscribe({
            next: () => this.cargarNiveles(),
        });
    }

    updateForm(field: keyof ConfigAprobacionRequest, value: unknown): void {
        this.form.set({ ...this.form(), [field]: value });
    }

    formatMonto(monto: number | null): string {
        return monto === null ? 'Sin límite' : `S/ ${monto.toFixed(2)}`;
    }
}
