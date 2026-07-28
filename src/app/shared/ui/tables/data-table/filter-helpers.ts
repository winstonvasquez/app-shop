import { Injector, Signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable, map, of } from 'rxjs';
import { CatalogService } from '@core/services/catalog.service';
import { FilterConfig } from './data-table.component';

/**
 * Constructores de `FilterConfig` para la toolbar del `<app-data-table>`.
 *
 * Antes cada página repetía a mano el mismo bloque:
 *
 *     { field: 'estado', label: 'Estado',
 *       options: toObservable(this.catalog.options('ESTADO_ORDEN_COMPRA'))
 *                  .pipe(map(o => o.map(x => ({ value: x.codigo, label: x.valor })))) }
 *
 * …lo que además invita a hardcodear `<option>` cuando da pereza. Estos helpers
 * dejan una sola línea por filtro y mantienen `erp_parameters` como fuente única.
 *
 * IMPORTANTE: `catalogFilter` y `signalFilter` usan `toObservable`, que exige
 * contexto de inyección. Llamarlos en el **inicializador de un campo** de la clase
 * (como en el ejemplo de abajo) es correcto. Si necesitás construirlos más tarde
 * (`ngOnInit`, un método, un `computed`), pasá el `Injector` en `opts`.
 *
 * Uso típico:
 *
 *     private readonly catalog = inject(CatalogService);
 *
 *     readonly filters: FilterConfig[] = [
 *         catalogFilter(this.catalog, 'ESTADO_ORDEN_COMPRA', 'estado', 'Estado'),
 *         catalogFilter(this.catalog, 'CONDICION_PAGO', 'condicionPago', 'Cond. de pago'),
 *         signalFilter('almacenId', 'Almacén', this.almacenes, a => ({ value: a.id, label: a.nombre })),
 *     ];
 */

export interface FilterOption {
    value: string | number;
    label: string;
}

export interface FilterHelperOptions {
    /** Requerido solo si el helper NO se llama dentro de un contexto de inyección. */
    injector?: Injector;
    /** Valor preseleccionado al montar la tabla. */
    value?: string | number | null;
    /** Excluye códigos que no deban ofrecerse como filtro (ej. estados internos). */
    exclude?: readonly string[];
}

/**
 * Filtro select alimentado por un catálogo de `erp_parameters`
 * (`GET /users/api/system/parameters/catalog/{tabla}`).
 *
 * @param tabla Código EXACTO del catálogo (ej. `'ESTADO_ORDEN_COMPRA'`). Si el
 *              catálogo no existe todavía hay que seedearlo por Flyway en
 *              microshopusers — nunca hardcodear las opciones en el componente.
 */
export function catalogFilter(
    catalog: CatalogService,
    tabla: string,
    field: string,
    label: string,
    opts: FilterHelperOptions = {}
): FilterConfig {
    const exclude = opts.exclude;
    return {
        field,
        label,
        value: opts.value ?? null,
        options: toObservable(catalog.options(tabla), opts.injector ? { injector: opts.injector } : undefined).pipe(
            map(options => options
                .filter(o => !exclude || !exclude.includes(o.codigo))
                .map(o => ({ value: o.codigo, label: o.valor })))
        )
    };
}

/**
 * Filtro select sobre una lista dinámica ya cargada en un signal
 * (almacenes, proveedores, sucursales, empleados…).
 */
export function signalFilter<T>(
    field: string,
    label: string,
    source: Signal<readonly T[]>,
    project: (item: T) => FilterOption,
    opts: FilterHelperOptions = {}
): FilterConfig {
    return {
        field,
        label,
        value: opts.value ?? null,
        options: toObservable(source, opts.injector ? { injector: opts.injector } : undefined).pipe(
            map(items => items.map(project))
        )
    };
}

/**
 * Filtro select sobre un observable que ya emite las opciones
 * (ej. un `service.listar().pipe(map(...))`).
 */
export function observableFilter(
    field: string,
    label: string,
    options$: Observable<FilterOption[]>,
    opts: Pick<FilterHelperOptions, 'value'> = {}
): FilterConfig {
    return { field, label, value: opts.value ?? null, options: options$ };
}

/**
 * Filtro select con opciones fijas. Usar SOLO cuando el dominio no vive en
 * `erp_parameters` y no tiene sentido seedearlo (ej. `Sí/No`, `Activo/Inactivo`
 * derivados de un boolean). Para estados/tipos/categorías de negocio usá
 * `catalogFilter` — si el catálogo falta, seedealo.
 */
export function staticFilter(
    field: string,
    label: string,
    options: readonly FilterOption[],
    opts: Pick<FilterHelperOptions, 'value'> = {}
): FilterConfig {
    return { field, label, value: opts.value ?? null, options: of([...options]) };
}

/** Opciones reutilizables para el clásico filtro de activo/inactivo sobre un boolean. */
export const ACTIVO_OPTIONS: readonly FilterOption[] = [
    { value: 'true', label: 'Activos' },
    { value: 'false', label: 'Inactivos' }
];
