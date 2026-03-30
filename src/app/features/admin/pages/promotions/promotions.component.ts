import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { PromotionsService, Promocion } from '../../services/promotions.service';
import { VentasParametrosService, SelectOption } from '../../services/ventas-parametros.service';

type EstadoPromocion = 'ACTIVA' | 'INACTIVA' | 'VENCIDA';

interface PromocionVM extends Promocion {
    estado: EstadoPromocion;
}

@Component({
    selector: 'app-promotions',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, DrawerComponent, DataTableComponent, DateInputComponent],
    templateUrl: './promotions.component.html',
})
export class PromotionsComponent implements OnInit {
    private readonly service = inject(PromotionsService);
    private readonly parametros = inject(VentasParametrosService);

    promociones = signal<PromocionVM[]>([]);
    cargando    = signal(false);
    showModal   = signal(false);
    guardando   = signal(false);
    editMode    = signal(false);
    editId      = signal<number | null>(null);
    filtroEstado = '';

    tipoOptions    = signal<SelectOption[]>([]);
    alcanceOptions = signal<SelectOption[]>([]);
    readonly estadoOptions: { value: EstadoPromocion | ''; label: string }[] = [
        { value: '',         label: 'Todos' },
        { value: 'ACTIVA',   label: 'Activas' },
        { value: 'INACTIVA', label: 'Inactivas' },
        { value: 'VENCIDA',  label: 'Vencidas' },
    ];

    // Form
    formNombre      = '';
    formDescripcion = '';
    formTipo: Promocion['tipo']     = 'PORCENTAJE';
    formValor       = 0;
    formAlcance: Promocion['alcance'] = 'CARRITO';
    formCupon       = '';
    formLimite: number | null = null;
    formFechaInicio = new Date().toISOString().split('T')[0];
    formFechaFin    = '';
    formActivo      = true;

    columns: TableColumn<PromocionVM>[] = [
        { key: 'nombre',    label: 'Nombre' },
        { key: 'tipo',      label: 'Tipo', html: true,
          render: (row) => `<span class="badge badge-neutral">${row.tipo === 'PORCENTAJE' ? '%' : 'S/'}</span> ${row.tipo.replace('_', ' ')}` },
        { key: 'valor',     label: 'Valor', align: 'right',
          render: (row) => row.tipo === 'PORCENTAJE'
            ? `${row.valor}%`
            : `S/ ${row.valor.toFixed(2)}` },
        { key: 'fechaInicio', label: 'Vigencia',
          render: (row) => `${new Date(row.fechaInicio).toLocaleDateString('es-PE')} — ${new Date(row.fechaFin).toLocaleDateString('es-PE')}` },
        { key: 'usosActuales', label: 'Usos',
          render: (row) => row.limiteUsos
            ? `${row.usosActuales} / ${row.limiteUsos}`
            : `${row.usosActuales}` },
        { key: 'estado',    label: 'Estado', html: true,
          render: (row) => `<span class="badge ${this.parametros.getBadgeEstadoPromocion(row.estado)}">${row.estado}</span>` },
    ];

    actions: TableAction<PromocionVM>[] = [
        { label: 'Editar',     icon: '✏️', class: 'btn-view',
          onClick: (row) => this.abrirEditar(row) },
        { label: 'Desactivar', icon: '⊘', class: 'btn-view',
          show: (row) => row.activo && row.estado !== 'VENCIDA',
          onClick: (row) => this.toggleActivo(row) },
    ];

    promocionesVm = computed(() => {
        if (!this.filtroEstado) return this.promociones();
        return this.promociones().filter(p => p.estado === this.filtroEstado);
    });

    totalActivas        = computed(() => this.promociones().filter(p => p.estado === 'ACTIVA').length);
    proximasAVencer     = computed(() => {
        const en7dias = new Date();
        en7dias.setDate(en7dias.getDate() + 7);
        return this.promociones().filter(p => {
            const fin = new Date(p.fechaFin);
            return p.estado === 'ACTIVA' && fin <= en7dias;
        }).length;
    });
    totalVencidas       = computed(() => this.promociones().filter(p => p.estado === 'VENCIDA').length);

    ngOnInit(): void {
        this.cargar();
        this.parametros.getTiposPromocion().subscribe(opts => this.tipoOptions.set(opts));
        this.parametros.getAlcancesPromocion().subscribe(opts => this.alcanceOptions.set(opts));
    }

    cargar(): void {
        this.cargando.set(true);
        this.service.getAll().subscribe({
            next: (list) => {
                this.promociones.set(list.map(p => ({ ...p, estado: this.calcularEstado(p) })));
                this.cargando.set(false);
            },
            error: () => {
                this.promociones.set([]);
                this.cargando.set(false);
            }
        });
    }

    abrirNueva(): void {
        this.resetForm();
        this.editMode.set(false);
        this.editId.set(null);
        this.showModal.set(true);
    }

    abrirEditar(row: PromocionVM): void {
        this.formNombre      = row.nombre;
        this.formDescripcion = row.descripcion ?? '';
        this.formTipo        = row.tipo;
        this.formValor       = row.valor;
        this.formAlcance     = row.alcance;
        this.formCupon       = row.codigoCupon ?? '';
        this.formLimite      = row.limiteUsos ?? null;
        this.formFechaInicio = row.fechaInicio;
        this.formFechaFin    = row.fechaFin;
        this.formActivo      = row.activo;
        this.editMode.set(true);
        this.editId.set(row.id ?? null);
        this.showModal.set(true);
    }

    guardar(): void {
        if (!this.formNombre.trim() || this.formValor <= 0 || !this.formFechaFin) return;

        const dto: Omit<Promocion, 'id' | 'usosActuales'> = {
            nombre:       this.formNombre,
            descripcion:  this.formDescripcion || undefined,
            tipo:         this.formTipo,
            valor:        this.formValor,
            alcance:      this.formAlcance,
            codigoCupon:  this.formCupon || undefined,
            limiteUsos:   this.formLimite ?? undefined,
            fechaInicio:  this.formFechaInicio,
            fechaFin:     this.formFechaFin,
            activo:       this.formActivo,
        };

        this.guardando.set(true);

        if (this.editMode() && this.editId() !== null) {
            this.service.update(this.editId()!, dto).subscribe({
                next: (updated) => {
                    this.promociones.update(list =>
                        list.map(p => p.id === updated.id
                            ? { ...updated, estado: this.calcularEstado(updated) }
                            : p
                        )
                    );
                    this.guardando.set(false);
                    this.cerrarModal();
                },
                error: () => {
                    // fallback: update local
                    this.promociones.update(list =>
                        list.map(p => p.id === this.editId()
                            ? { ...p, ...dto, estado: this.calcularEstado({ ...p, ...dto }) }
                            : p
                        )
                    );
                    this.guardando.set(false);
                    this.cerrarModal();
                }
            });
        } else {
            this.service.create(dto).subscribe({
                next: (created) => {
                    this.promociones.update(list => [
                        { ...created, estado: this.calcularEstado(created) },
                        ...list
                    ]);
                    this.guardando.set(false);
                    this.cerrarModal();
                },
                error: () => {
                    // fallback: add local
                    const local: PromocionVM = {
                        id: Date.now(), ...dto, usosActuales: 0,
                        estado: this.calcularEstado({ ...dto, usosActuales: 0 })
                    };
                    this.promociones.update(list => [local, ...list]);
                    this.guardando.set(false);
                    this.cerrarModal();
                }
            });
        }
    }

    toggleActivo(row: PromocionVM): void {
        const updated = { ...row, activo: !row.activo };
        this.service.update(row.id!, { activo: updated.activo }).subscribe({
            next: () => {},
            error: () => {}
        });
        this.promociones.update(list =>
            list.map(p => p.id === row.id
                ? { ...p, activo: !p.activo, estado: this.calcularEstado({ ...p, activo: !p.activo }) }
                : p
            )
        );
    }

    cerrarModal(): void {
        this.showModal.set(false);
        this.resetForm();
    }

    private calcularEstado(p: Omit<Promocion, 'id'>): EstadoPromocion {
        if (!p.activo) return 'INACTIVA';
        if (p.fechaFin && new Date(p.fechaFin) < new Date()) return 'VENCIDA';
        return 'ACTIVA';
    }

    private resetForm(): void {
        this.formNombre       = '';
        this.formDescripcion  = '';
        this.formTipo         = 'PORCENTAJE';
        this.formValor        = 0;
        this.formAlcance      = 'CARRITO';
        this.formCupon        = '';
        this.formLimite       = null;
        this.formFechaInicio  = new Date().toISOString().split('T')[0];
        this.formFechaFin     = '';
        this.formActivo       = true;
    }
}
