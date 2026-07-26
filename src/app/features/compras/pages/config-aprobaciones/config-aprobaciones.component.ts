import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { AprobacionService } from '../../services/aprobacion.service';
import { ConfigAprobacionRequest, NivelAprobacion } from '../../models/aprobacion.model';
import { ButtonComponent } from '@shared/components';

@Component({
    selector: 'app-config-aprobaciones',
    standalone: true,
    imports: [ButtonComponent],
    templateUrl: './config-aprobaciones.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigAprobacionesComponent implements OnInit {
    private aprobacionService = inject(AprobacionService);

    niveles = signal<NivelAprobacion[]>([]);
    loading = signal(false);
    showForm = signal(false);
    editingNivelId = signal<string | null>(null);

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
        this.editingNivelId.set(null);
        this.form.set({ nombre: '', montoMinimo: 0, montoMaximo: null, rolAprobador: '', orden: this.niveles().length + 1 });
        this.showForm.set(true);
    }

    abrirEdicion(nivel: NivelAprobacion): void {
        this.editingNivelId.set(nivel.id);
        this.form.set({
            nombre: nivel.nombre,
            montoMinimo: nivel.montoMinimo,
            montoMaximo: nivel.montoMaximo,
            rolAprobador: nivel.rolAprobador,
            orden: nivel.orden,
        });
        this.showForm.set(true);
    }

    guardar(): void {
        const f = this.form();
        if (!f.nombre || !f.rolAprobador) return;
        const editingId = this.editingNivelId();
        const obs = editingId ? this.aprobacionService.actualizarNivel(editingId, f) : this.aprobacionService.crearNivel(f);
        obs.subscribe({
            next: () => {
                this.showForm.set(false);
                this.editingNivelId.set(null);
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
