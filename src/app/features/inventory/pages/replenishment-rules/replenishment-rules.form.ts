import { CreateReplenishmentRuleRequest } from '../../models/wms-zone.models';

/** Valores crudos del formulario de la regla (`form.getRawValue()`). */
export type ReglaFormValue = {
    almacenId: string | null;
    sku: string;
    productoNombre: string;
    reorderPoint: number;
    reorderQuantity: number;
    preferredSupplierName: string;
    maxUnitCost: number | null;
    autoCreatePo: boolean;
    status?: string;
};

/**
 * Arma el alta/edición de una regla de reposición.
 *
 * REGLA DE NEGOCIO: `status` NO forma parte de este payload — `CreateReplenishmentRuleRequest`
 * no lo declara y el PUT lo ignora; el estado se cambia por su propio endpoint (ver
 * `debeAplicarCambioDeStatus`). El almacén es opcional (una regla sin almacén aplica a todos)
 * y `maxUnitCost` también: en ambos, `null` significa «sin definir» y no debe viajar.
 * `reorderPoint` 0 y `autoCreatePo` false SÍ viajan: son valores elegidos, no ausencias.
 */
export function reglaReposicionPayload(v: ReglaFormValue, productoId: string): CreateReplenishmentRuleRequest {
    return {
        almacenId: v.almacenId ?? undefined,
        sku: v.sku,
        productoNombre: v.productoNombre || undefined,
        reorderPoint: v.reorderPoint,
        reorderQuantity: v.reorderQuantity,
        preferredSupplierName: v.preferredSupplierName || undefined,
        maxUnitCost: v.maxUnitCost ?? undefined,
        autoCreatePo: v.autoCreatePo,
        productoId
    };
}

/**
 * Decide si tras guardar hay que llamar además al endpoint de cambio de estado.
 *
 * REGLA DE NEGOCIO: el estado sólo existe una vez creada la regla (nace ACTIVE), así que en
 * el alta nunca se aplica. En edición se aplica sólo si el usuario lo cambió respecto al
 * valor con el que se abrió el drawer — reenviar el mismo estado sería una escritura inútil.
 */
export function debeAplicarCambioDeStatus(
    editMode: boolean,
    statusNuevo: string | null | undefined,
    statusOriginal: string
): boolean {
    const nuevo = String(statusNuevo ?? '');
    return editMode && nuevo !== '' && nuevo !== statusOriginal;
}
