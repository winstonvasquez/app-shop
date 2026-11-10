import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { SystemParameterService } from '@core/services/system-parameter.service';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ReclamoService } from '@features/info/libro-reclamaciones/reclamo.service';
import { EstadoReclamo, Reclamo, TIPOS_DOC_RECLAMO, TipoReclamo } from '@features/info/libro-reclamaciones/reclamo.model';
import { fechaLimiteLegible, plazoDeReclamo } from '@features/info/libro-reclamaciones/reclamo.form';
import { DataTableComponent, FilterChangeEvent, FilterConfig, PaginationEvent, TableAction, TableColumn } from '@shared/ui/tables/data-table/data-table.component';
import { staticFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { ButtonComponent } from '@shared/components';
import { mensajeDeErrorHttp } from '@core/utils/http-error.util';

const RESPUESTA_MAX = 2000;

/**
 * Backoffice del Libro de Reclamaciones: listado con estado y vencimiento del plazo (15 días hábiles),
 * detalle y respuesta. GET/PUT /sales/api/reclamos (ADMIN/GERENTE, acotado a la empresa del JWT).
 */
@Component({
    selector: 'app-reclamos',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DatePipe, DataTableComponent, DrawerComponent, PageHeaderComponent, AlertComponent, ButtonComponent],
    templateUrl: './reclamos.component.html',
})
export class ReclamosComponent implements OnInit {
    private readonly service = inject(ReclamoService);
    protected readonly params = inject(SystemParameterService);

    readonly breadcrumbs: Breadcrumb[] = [{ label: 'Admin', url: '/admin' }, { label: 'Libro de Reclamaciones' }];

    readonly reclamos = signal<Reclamo[]>([]);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);
    readonly currentPage = signal(0);
    readonly pageSize = signal(20);
    readonly totalElements = signal(0);
    readonly totalPages = signal(0);
    private filtroEstado: EstadoReclamo | '' = '';
    private filtroTipo: TipoReclamo | '' = '';

    readonly seleccionado = signal<Reclamo | null>(null);
    readonly respuesta = signal('');
    readonly guardando = signal(false);
    readonly errorRespuesta = signal<string | null>(null);
    readonly respuestaMax = RESPUESTA_MAX;
    readonly puedeResponder = computed(() => {
        const r = this.seleccionado();
        const texto = this.respuesta().trim();
        return !!r && r.estado === 'PENDIENTE' && texto.length > 0 && texto.length <= RESPUESTA_MAX;
    });

    readonly filters: FilterConfig[] = [
        staticFilter('estado', 'Estado', [{ value: 'PENDIENTE', label: 'Pendiente' }, { value: 'RESPONDIDO', label: 'Respondido' }]),
        staticFilter('tipo', 'Tipo', [{ value: 'RECLAMO', label: 'Reclamo' }, { value: 'QUEJA', label: 'Queja' }]),
    ];

    readonly columns: TableColumn<Reclamo>[] = [
        { key: 'codigo', label: 'Hoja N.º', width: '120px', render: (r) => r.codigo },
        { key: 'fechaRegistro', label: 'Registrado', render: (r) => new Date(r.fechaRegistro).toLocaleDateString('es-PE') },
        { key: 'consumidorNombre', label: 'Consumidor', render: (r) => r.consumidorNombre },
        { key: 'tipo', label: 'Tipo', render: (r) => (r.tipo === 'QUEJA' ? 'Queja' : 'Reclamo') },
        {
            key: 'estado', label: 'Estado / plazo', html: true,
            render: (r) => {
                const p = plazoDeReclamo(r);
                return `<span class="badge ${p.badge}">${p.texto}</span>`;
            },
        },
    ];

    readonly actions: TableAction<Reclamo>[] = [
        { label: 'Ver y responder', icon: '👁️', onClick: (r) => this.abrir(r.id), class: 'btn-view' },
    ];

    protected readonly plazoDe = plazoDeReclamo;
    protected readonly fechaLegible = fechaLimiteLegible;
    protected readonly etiquetaDoc = (cod: string | null | undefined) =>
        TIPOS_DOC_RECLAMO.find(t => t.value === cod)?.label ?? cod ?? '';

    ngOnInit(): void {
        this.cargar();
    }

    cargar(): void {
        this.loading.set(true);
        this.error.set(null);
        this.service.listar({ estado: this.filtroEstado, tipo: this.filtroTipo }, this.currentPage(), this.pageSize()).subscribe({
            next: (p) => {
                this.reclamos.set(p.content);
                this.totalElements.set(p.totalElements);
                this.totalPages.set(p.totalPages);
                this.loading.set(false);
            },
            error: (err: HttpErrorResponse) => {
                this.error.set(mensajeDeErrorHttp(err));
                this.loading.set(false);
            },
        });
    }

    onFilterChange(e: FilterChangeEvent): void {
        const v = e.value != null ? String(e.value) : '';
        if (e.field === 'estado') this.filtroEstado = v as EstadoReclamo | '';
        else if (e.field === 'tipo') this.filtroTipo = v as TipoReclamo | '';
        else return;
        this.currentPage.set(0);
        this.cargar();
    }

    onFiltersClear(): void {
        this.filtroEstado = '';
        this.filtroTipo = '';
        this.currentPage.set(0);
        this.cargar();
    }

    onPageChange(e: PaginationEvent | number): void {
        if (typeof e === 'number') this.currentPage.set(e);
        else { this.currentPage.set(e.page); this.pageSize.set(e.size); }
        this.cargar();
    }

    abrir(id: number): void {
        this.errorRespuesta.set(null);
        this.respuesta.set('');
        this.service.obtener(id).subscribe({
            next: (r) => this.seleccionado.set(r),
            error: (err: HttpErrorResponse) => this.error.set(mensajeDeErrorHttp(err, { 404: 'El reclamo ya no existe' })),
        });
    }

    cerrar(): void {
        this.seleccionado.set(null);
    }

    responder(): void {
        const r = this.seleccionado();
        if (!r || !this.puedeResponder() || this.guardando()) return;
        this.guardando.set(true);
        this.errorRespuesta.set(null);
        this.service.responder(r.id, this.respuesta().trim()).subscribe({
            next: (actualizado) => {
                this.seleccionado.set(actualizado);
                this.reclamos.update(lista => lista.map(x => (x.id === actualizado.id ? actualizado : x)));
                this.guardando.set(false);
            },
            error: (err: HttpErrorResponse) => {
                this.errorRespuesta.set(mensajeDeErrorHttp(err, { 409: 'Este reclamo ya fue respondido' }));
                this.guardando.set(false);
            },
        });
    }
}
