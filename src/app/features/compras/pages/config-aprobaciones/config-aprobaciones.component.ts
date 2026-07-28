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
    /**
     * 'true' preselecciona solo activos (comportamiento previo a este fix).
     * '' = Todos → manda `activo=undefined` al service, sin filtrar (necesario para poder
     * ver un nivel dado de baja y reactivarlo — antes era inalcanzable, hallazgo P1 2026-07-27).
     */
    filterActivo = signal<'true' | 'false' | ''>('true');

    form = signal<ConfigAprobacionRequest>({
        nombre: '',
        montoMinimo: 0,
        montoMaximo: null,
        rolAprobador: '',
        orden: 1,
        activo: true,
    });

    ngOnInit(): void {
        this.cargarNiveles();
    }

    cargarNiveles(): void {
        this.loading.set(true);
        const f = this.filterActivo();
        const activo = f === '' ? undefined : f === 'true';
        this.aprobacionService.getNiveles(activo).subscribe({
            next: (data) => {
                this.niveles.set(data);
                this.loading.set(false);
            },
            error: () => this.loading.set(false),
        });
    }

    onFilterActivoChange(value: string): void {
        this.filterActivo.set(value as 'true' | 'false' | '');
        this.cargarNiveles();
    }

    abrirFormulario(): void {
        this.editingNivelId.set(null);
        // El orden propuesto se calcula sobre TODOS los niveles, no sobre la lista visible:
        // con el filtro en "Inactivos" (una fila) proponia orden=2 aunque hubiera cinco activos.
        this.aprobacionService.getNiveles().subscribe({
            next: todos => this.form.update(f => ({ ...f, orden: todos.length + 1 })),
            error: () => { /* si falla, se queda el orden que ya haya en el formulario */ },
        });
        this.form.set({
            nombre: '', montoMinimo: 0, montoMaximo: null, rolAprobador: '',
            orden: this.niveles().length + 1, activo: true,
        });
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
            activo: nivel.activo,
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
                // Un nivel NUEVO siempre nace activo (AprobacionCommandService.crearNivel), asi
                // que crearlo con el filtro en "Inactivos" lo haria desaparecer al recargar.
                if (!editingId && this.filterActivo() === 'false') {
                    this.filterActivo.set('true');
                }
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
