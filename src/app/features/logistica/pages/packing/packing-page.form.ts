import { CreatePackingBody } from '../../models/packing.model';

export interface PackingFormValue {
    pickingOrderId: string;
    packageType: string;
    weight: number | null;
    length: number | null;
    width: number | null;
    height: number | null;
    notes: string;
}

/** Vacíos fuera: el backend exige `@Positive` en medidas y rechazaría 0/null explícito de forma confusa. */
export function armarPackingBody(v: PackingFormValue): CreatePackingBody {
    return {
        pickingOrderId: v.pickingOrderId,
        packageType: v.packageType || undefined,
        weight: v.weight || undefined,
        length: v.length || undefined,
        width: v.width || undefined,
        height: v.height || undefined,
        notes: v.notes || undefined,
    };
}
