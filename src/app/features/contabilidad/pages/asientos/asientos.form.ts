import { longToSyntheticUuid } from '@core/utils/synthetic-uuid.util';
import { AsientoRequest, MovimientoRequest } from '../../models/asiento.model';

/** Una fila de la tabla de movimientos del drawer «Nuevo Asiento». */
export interface LineaAsientoForm {
    cuentaId: string;
    codigoCuenta: string;
    nombreCuenta: string;
    debe: number;
    haber: number;
    glosa: string;
}

/** Cabecera del asiento tal como la escribe el usuario (ngModel del drawer). */
export interface CabeceraAsientoForm {
    fecha: string;
    glosa: string;
    tipo: string;
}

/**
 * Convierte las filas de la tabla en los movimientos del asiento.
 *
 * Regla de negocio: una fila sólo es un movimiento si tiene cuenta elegida Y algún
 * importe positivo. La tabla arranca con filas en blanco y el usuario puede dejar
 * huecos entre líneas llenas; enviarlas produciría movimientos de S/ 0.00 en el
 * libro diario. Un importe negativo tampoco es un movimiento: en partida doble el
 * signo lo da la columna (debe/haber), no el número.
 *
 * `Number(x) || 0`: el input es de texto, así que un valor vacío o no numérico vale
 * cero, no NaN — un NaN llegaría al backend como `null` al serializar el JSON.
 *
 * La glosa de la línea cae a la de la cabecera: SUNAT exige glosa por movimiento y
 * lo habitual es que todas repitan la del asiento.
 */
export function construirMovimientos(
    lineas: readonly LineaAsientoForm[],
    glosaCabecera: string,
): MovimientoRequest[] {
    return lineas
        .filter(l => l.cuentaId && ((Number(l.debe) || 0) > 0 || (Number(l.haber) || 0) > 0))
        .map(l => ({
            cuentaId: l.cuentaId,
            codigoCuenta: l.codigoCuenta,
            debe: Number(l.debe) || 0,
            haber: Number(l.haber) || 0,
            glosa: l.glosa || glosaCabecera,
        }));
}

/**
 * Arma el asiento manual que se envía al backend.
 *
 * `origen: 'MANUAL'` es fijo: este formulario es la única vía de alta a mano; los
 * demás orígenes (VENTA, COMPRA, TESORERÍA…) los genera el asiento automático.
 *
 * `companyId` y `tenantId` llevan el MISMO valor —la empresa activa del JWT— porque
 * en contabilidad el tenant es la empresa. El backend los declara `UUID`, así que el
 * Long viaja como UUID sintético (un `"7"` crudo da 400). Sin empresa activa NO se
 * puede guardar: lanza en vez de inventar la empresa 1 (grabaría en otro tenant).
 */
export function construirAsientoRequest(
    form: CabeceraAsientoForm,
    lineas: readonly LineaAsientoForm[],
    periodoId: string,
    activeCompanyId: number | string | null | undefined,
): AsientoRequest {
    const empresa = Number(activeCompanyId ?? NaN);
    if (!Number.isFinite(empresa)) {
        throw new Error('No hay una empresa activa: no se puede guardar el asiento.');
    }
    const companyId = longToSyntheticUuid(empresa);
    return {
        fecha: form.fecha,
        glosa: form.glosa,
        tipo: form.tipo,
        origen: 'MANUAL',
        periodoId,
        companyId,
        tenantId: companyId,
        movimientos: construirMovimientos(lineas, form.glosa),
    };
}
