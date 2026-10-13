import { CreateLotRequest } from '../../models/wms-zone.models';

/** Valores crudos del formulario del lote (`form.getRawValue()`). */
export type LoteFormValue = {
    sku: string;
    loteNumero: string;
    fechaFabricacion: string;
    fechaVencimiento: string;
    cantidadInicial: number | string;
    cantidadActual?: number | string;
    proveedorNombre: string;
    notas: string;
    activo: boolean;
};

/**
 * Arma el alta/edición de un lote.
 *
 * REGLA DE NEGOCIO, dos campos que deliberadamente NO viajan igual que el resto:
 * - `cantidadActual` queda SIEMPRE fuera del payload: la deriva el backend de los consumos
 *   FIFO/FEFO del lote, y mandarla desde el formulario descuadraría el kardex.
 * - `activo` sólo viaja en EDICIÓN: al crear, el backend lo ignora y el lote nace activo;
 *   incluirlo en el alta sugeriría que se puede dar de alta un lote ya inactivo. En edición
 *   sí es la única vía para reactivar un lote dado de baja.
 * Las fechas y los textos opcionales en blanco no viajan.
 */
export function lotePayload(v: LoteFormValue, productoId: string, editMode: boolean): CreateLotRequest {
    return {
        productoId,
        sku: v.sku,
        loteNumero: v.loteNumero,
        fechaFabricacion: v.fechaFabricacion || undefined,
        fechaVencimiento: v.fechaVencimiento || undefined,
        cantidadInicial: Number(v.cantidadInicial),
        proveedorNombre: v.proveedorNombre || undefined,
        notas: v.notas || undefined,
        ...(editMode ? { activo: v.activo } : {})
    };
}
