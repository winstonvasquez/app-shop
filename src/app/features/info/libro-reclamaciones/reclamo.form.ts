import { esDniValido, esRucValido } from '@features/checkout/pages/checkout-page/checkout-page.rules';
import { Reclamo, ReclamoRequest } from './reclamo.model';

/** Valores crudos del formulario (todo texto, salvo el check de menor de edad). */
export interface ReclamoFormValue {
    consumidorNombre: string;
    consumidorTipoDoc: string;
    consumidorNumDoc: string;
    domicilio: string;
    telefono: string;
    email: string;
    menorEdad: boolean;
    apoderadoNombre: string;
    apoderadoTipoDoc: string;
    apoderadoNumDoc: string;
    bienTipo: string;
    montoReclamado: string;
    bienDescripcion: string;
    tipo: string;
    detalle: string;
    pedidoConsumidor: string;
}

export type ErroresReclamo = Partial<Record<keyof ReclamoFormValue, string>>;

export const RECLAMO_FORM_VACIO: ReclamoFormValue = {
    consumidorNombre: '', consumidorTipoDoc: '1', consumidorNumDoc: '', domicilio: '', telefono: '', email: '',
    menorEdad: false, apoderadoNombre: '', apoderadoTipoDoc: '1', apoderadoNumDoc: '',
    bienTipo: 'PRODUCTO', montoReclamado: '', bienDescripcion: '',
    tipo: 'RECLAMO', detalle: '', pedidoConsumidor: '',
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Espejo de `ReclamoCommandService.validarDocumento`: DNI 8 dígitos, RUC módulo 11, resto 4-20 alfanum./guion. */
export function documentoReclamoValido(tipoDoc: string, num: string): boolean {
    const n = num.trim();
    if (tipoDoc === '1') return esDniValido(n);
    if (tipoDoc === '6') return esRucValido(n);
    return /^[A-Za-z0-9-]{4,20}$/.test(n);
}

function requerido(v: string, max: number, etiqueta: string): string | undefined {
    const t = v.trim();
    if (!t) return `${etiqueta} es obligatorio`;
    return t.length > max ? `Máximo ${max} caracteres` : undefined;
}

function errorDeDocumento(tipoDoc: string, num: string, mensaje: string): string | undefined {
    const n = num.trim();
    if (!n) return mensaje.replace('no es válido', 'es obligatorio');
    return n.length > 20 || !documentoReclamoValido(tipoDoc, n) ? mensaje : undefined;
}

/** Validaciones espejo de `ReclamoRequestDto` + las reglas de negocio del servicio. `{}` = válido. */
export function erroresDeReclamo(f: ReclamoFormValue): ErroresReclamo {
    const e: ErroresReclamo = {};
    const poner = (k: keyof ReclamoFormValue, msg: string | undefined) => { if (msg) e[k] = msg; };

    poner('consumidorNombre', requerido(f.consumidorNombre, 200, 'El nombre'));
    poner('domicilio', requerido(f.domicilio, 250, 'El domicilio'));
    poner('bienDescripcion', requerido(f.bienDescripcion, 500, 'La descripción del bien'));
    poner('detalle', requerido(f.detalle, 2000, 'El detalle'));
    poner('pedidoConsumidor', requerido(f.pedidoConsumidor, 1000, 'El pedido del consumidor'));
    poner('consumidorNumDoc', errorDeDocumento(f.consumidorTipoDoc, f.consumidorNumDoc, 'El documento no es válido'));

    const email = f.email.trim();
    poner('email', !email ? 'El correo es obligatorio'
        : !EMAIL.test(email) || email.length > 150 ? 'Ingrese un correo válido' : undefined);

    if (f.telefono.trim().length > 20) e.telefono = 'Máximo 20 caracteres';

    if (f.menorEdad) {
        poner('apoderadoNombre', requerido(f.apoderadoNombre, 200, 'El nombre del apoderado'));
        poner('apoderadoNumDoc', errorDeDocumento(f.apoderadoTipoDoc, f.apoderadoNumDoc, 'El documento del apoderado no es válido'));
    }

    const monto = String(f.montoReclamado ?? '').trim(); // input type=number entrega number|null
    if (monto && !(Number(monto) >= 0)) e.montoReclamado = 'Ingrese un monto válido (0 o más)';
    return e;
}

/** Arma el body. El apoderado sólo viaja si es menor de edad. */
export function construirReclamo(f: ReclamoFormValue): ReclamoRequest {
    const monto = String(f.montoReclamado ?? '').trim(); // input type=number entrega number|null
    return {
        consumidorNombre: f.consumidorNombre.trim(),
        consumidorTipoDoc: f.consumidorTipoDoc,
        consumidorNumDoc: f.consumidorNumDoc.trim(),
        domicilio: f.domicilio.trim(),
        telefono: f.telefono.trim() || undefined,
        email: f.email.trim(),
        menorEdad: f.menorEdad,
        apoderadoNombre: f.menorEdad ? f.apoderadoNombre.trim() : undefined,
        apoderadoTipoDoc: f.menorEdad ? f.apoderadoTipoDoc : undefined,
        apoderadoNumDoc: f.menorEdad ? f.apoderadoNumDoc.trim() : undefined,
        bienTipo: f.bienTipo === 'SERVICIO' ? 'SERVICIO' : 'PRODUCTO',
        montoReclamado: monto ? Number(monto) : undefined,
        bienDescripcion: f.bienDescripcion.trim(),
        tipo: f.tipo === 'QUEJA' ? 'QUEJA' : 'RECLAMO',
        detalle: f.detalle.trim(),
        pedidoConsumidor: f.pedidoConsumidor.trim(),
    };
}

/** Texto del fallo al registrar: el 429 (throttle) y el 400 (tienda sin dominio) se explican en claro. */
export function mensajeDeFalloReclamo(status: number, detalle: string | undefined): string {
    if (status === 429) return 'Registraste demasiados reclamos desde esta conexión. Intenta nuevamente en una hora.';
    if (status === 400) {
        return detalle && detalle.length < 200 ? detalle
            : 'Revisa los datos del formulario. Si el problema continúa, es posible que esta tienda aún no tenga habilitado su Libro de Reclamaciones.';
    }
    if (status === 0) return 'No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.';
    return 'No pudimos registrar tu reclamo en este momento. Intenta de nuevo más tarde.';
}

/** «05/12/2026» desde yyyy-MM-dd sin pasar por Date (evita el corrimiento de zona horaria). */
export function fechaLimiteLegible(iso: string): string {
    const [y, m, d] = iso.split('-');
    return y && m && d ? `${d}/${m}/${y}` : iso;
}

/** Texto y badge del plazo para la tabla del backoffice. */
export function plazoDeReclamo(r: Pick<Reclamo, 'estado' | 'vencido' | 'fechaLimiteRespuesta'>): { texto: string; badge: string } {
    if (r.estado === 'RESPONDIDO') return { texto: 'Respondido', badge: 'badge-success' };
    return r.vencido
        ? { texto: `Vencido (${fechaLimiteLegible(r.fechaLimiteRespuesta)})`, badge: 'badge-error' }
        : { texto: `Vence ${fechaLimiteLegible(r.fechaLimiteRespuesta)}`, badge: 'badge-warning' };
}
