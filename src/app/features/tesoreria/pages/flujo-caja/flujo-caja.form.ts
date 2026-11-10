import { TransferenciaRequest } from '../../services/movimientos-financieros.service';
import { FinancialMovement } from '../../models/tesoreria.model';
import { MONEDA } from '@shared/constants/sunat.constants';

/** Forma de `transferenciaForm.getRawValue()`. */
export interface ValoresFormularioTransferencia {
    origenTipo: 'CAJA' | 'BANCO';
    origenId: number | null;
    destinoTipo: 'CAJA' | 'BANCO';
    destinoId: number | null;
    monto: number | null;
    moneda?: string | null;
    fecha?: string | null;
    descripcion?: string | null;
}

/** Opción de caja/cuenta para el drawer «Transferir». `abierta` sólo aplica a cajas. */
export interface OpcionTransferencia {
    value: number;
    label: string;
    moneda: string;
    abierta: boolean;
}

/**
 * Opciones válidas de un lado del traspaso: misma moneda que el formulario y, en cajas, sólo ABIERTAS
 * (el resto sólo da 409). `excluirId` saca el origen elegido de la lista de destinos.
 */
export function opcionesTransferencia(
    todas: OpcionTransferencia[], tipo: 'CAJA' | 'BANCO', moneda: string, excluirId?: number | null
): OpcionTransferencia[] {
    return todas.filter(o => o.moneda === moneda && (tipo === 'BANCO' || o.abierta) && o.value !== excluirId);
}

/** Mismo origen y destino (mismo tipo e id): el backend lo rechaza con 400; se avisa antes de enviar. */
export function transferenciaMismoOrigenYDestino(v: ValoresFormularioTransferencia): boolean {
    return v.origenId != null && v.origenTipo === v.destinoTipo && v.origenId === v.destinoId;
}

/** Arma el body de POST /movimientos/transferencia. El tenant sale del JWT, no del formulario. */
export function construirTransferenciaRequest(
    v: ValoresFormularioTransferencia, tenantId: number
): TransferenciaRequest {
    return {
        tenantId,
        origenTipo: v.origenTipo,
        origenId: v.origenId as number,
        destinoTipo: v.destinoTipo,
        destinoId: v.destinoId as number,
        monto: v.monto as number,
        moneda: v.moneda ?? MONEDA.PEN,
        fecha: v.fecha || undefined,
        descripcion: v.descripcion?.trim() || undefined,
    };
}

/** Referencias que el backend rechaza al anular (traspasos, anulaciones, ajustes de caja) + las automáticas de cobro/pago. */
const PREFIJOS_NO_MANUALES = ['TRF-', 'ANUL-', 'CIERRE-', 'APERT-', 'PAGO-', 'COBRO-'];

/** Ids de los movimientos ya anulados, deducidos de los contramovimientos `ANUL-<id>` presentes en la lista. */
export function idsAnulados(movs: FinancialMovement[]): Set<number> {
    const ids = new Set<number>();
    for (const m of movs) {
        if (m.referencia?.startsWith('ANUL-') && m.relacionadoId != null) ids.add(m.relacionadoId);
    }
    return ids;
}

/** Manual = lo cargó una persona: ni automático (cobro/pago), ni traspaso, ni anulación, ni ajuste de caja. */
export function esMovimientoManual(m: FinancialMovement): boolean {
    if (m.tipoMovimiento === 'TRANSFERENCIA' || m.origen === 'COBRO' || m.origen === 'PAGO' || m.origen === 'TRANSFERENCIA_INTERNA') {
        return false;
    }
    const ref = m.referencia ?? '';
    return !PREFIJOS_NO_MANUALES.some(p => ref.startsWith(p));
}

/** «Anular» sólo en manuales no anulados. El backend vuelve a validar (también si el contramovimiento cae en otra página). */
export function esAnulable(m: FinancialMovement, anulados: Set<number>): boolean {
    return m.id != null && esMovimientoManual(m) && !anulados.has(m.id);
}

/** El motivo es obligatorio (max 300): devuelve el texto recortado o null si no es válido. */
export function motivoAnulacionValido(motivo: string | null | undefined): string | null {
    const t = motivo?.trim() ?? '';
    return t.length > 0 && t.length <= 300 ? t : null;
}
