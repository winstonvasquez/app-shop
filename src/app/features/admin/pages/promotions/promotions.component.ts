import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { AdminFormSectionComponent } from '@shared/ui/forms/admin-form-section/admin-form-section.component';
import { AdminFormLayoutComponent } from '@shared/ui/forms/admin-form-layout/admin-form-layout.component';
import { ButtonComponent } from '@shared/components';
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
    imports: [
        ReactiveFormsModule,
        DrawerComponent,
        DataTableComponent,
        DateInputComponent,
        FormFieldComponent,
        AdminFormSectionComponent,
        AdminFormLayoutComponent,
        ButtonComponent,
    ],
    templateUrl: './promotions.component.html',
})
export class PromotionsComponent implements OnInit {
    private readonly service    = inject(PromotionsService);
    private readonly parametros = inject(VentasParametrosService);
    private readonly fb         = inject(FormBuilder);

    promociones  = signal<PromocionVM[]>([]);
    cargando     = signal(false);
    showModal    = signal(false);
    guardando    = signal(false);
    editMode     = signal(false);
    editId       = signal<number | null>(null);
    submitError  = signal('');
    filtroEstado = '';

    tipoOptions    = signal<SelectOption[]>([]);
    alcanceOptions = signal<SelectOption[]>([]);
    readonly estadoOptions: { value: EstadoPromocion | ''; label: string }[] = [
        { value: '',         label: 'Todos' },
        { value: 'ACTIVA',   label: 'Activas' },
        { value: 'INACTIVA', label: 'Inactivas' },
        { value: 'VENCIDA',  label: 'Vencidas' },
    ];

    form = this.fb.group({
        nombre:       ['', Validators.required],
        descripcion:  [''],
        tipo:         ['PORCENTAJE' as Promocion['tipo'], Validators.required],
        valor:        [0, [Validators.required, Validators.min(0)]],
        alcance:      ['CARRITO' as Promocion['alcance'], Validators.required],
        codigoCupon:  [''],
        limiteUsos:   [null as number | null],
        fechaInicio:  [new Date().toISOString().split('T')[0], Validators.required],
        fechaFin:     ['', Validators.required],
        activo:       [true],
    });

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

    totalActivas    = computed(() => this.promociones().filter(p => p.estado === 'ACTIVA').length);
    proximasAVencer = computed(() => {
        const en7dias = new Date();
        en7dias.setDate(en7dias.getDate() + 7);
        return this.promociones().filter(p => {
            const fin = new Date(p.fechaFin);
            return p.estado === 'ACTIVA' && fin <= en7dias;
        }).length;
    });
    totalVencidas   = computed(() => this.promociones().filter(p => p.estado === 'VENCIDA').length);

    tipoDescuento = toSignal(this.form.controls.tipo.valueChanges, { initialValue: this.form.controls.tipo.value });

    /** Label dinámico para el campo valor según tipo de descuento seleccionado. */
    valorLabel = computed(() => {
        const tipo = this.tipoDescuento();
        return tipo === 'PORCENTAJE' ? 'Valor (%)' : 'Valor (S/)';
    });

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
        this.submitError.set('');
        this.showModal.set(true);
    }

    abrirEditar(row: PromocionVM): void {
        this.form.setValue({
            nombre:      row.nombre,
            descripcion: row.descripcion ?? '',
            tipo:        row.tipo,
            valor:       row.valor,
            alcance:     row.alcance,
            codigoCupon: row.codigoCupon ?? '',
            limiteUsos:  row.limiteUsos ?? null,
            fechaInicio: row.fechaInicio,
            fechaFin:    row.fechaFin,
            activo:      row.activo,
        });
        this.form.markAsPristine();
        this.editMode.set(true);
        this.editId.set(row.id ?? null);
        this.submitError.set('');
        this.showModal.set(true);
    }

    err(field: string): string {
        const c = this.form.get(field);
        if (!c || c.pristine || c.valid) return '';
        if (c.hasError('required')) return 'Campo requerido';
        if (c.hasError('min'))      return `Valor mínimo: ${c.getError('min').min}`;
        return 'Campo inválido';
    }

    onSubmit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const v = this.form.getRawValue();

        const dto: Omit<Promocion, 'id' | 'usosActuales'> = {
            nombre:      v.nombre!,
            descripcion: v.descripcion || undefined,
            tipo:        v.tipo as Promocion['tipo'],
            valor:       v.valor!,
            alcance:     v.alcance as Promocion['alcance'],
            codigoCupon: v.codigoCupon || undefined,
            limiteUsos:  v.limiteUsos ?? undefined,
            fechaInicio: v.fechaInicio!,
            fechaFin:    v.fechaFin!,
            activo:      v.activo ?? true,
        };

        this.guardando.set(true);
        this.submitError.set('');

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
        this.form.reset({
            nombre:      '',
            descripcion: '',
            tipo:        'PORCENTAJE',
            valor:       0,
            alcance:     'CARRITO',
            codigoCupon: '',
            limiteUsos:  null,
            fechaInicio: new Date().toISOString().split('T')[0],
            fechaFin:    '',
            activo:      true,
        });
        this.form.markAsPristine();
    }
}
