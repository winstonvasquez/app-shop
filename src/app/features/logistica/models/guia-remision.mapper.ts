import { CreateGuiaRemisionDto, GuiaRemisionItemDto } from './guia-remision.model';

/**
 * Línea del formulario de GRE (estado local del componente, no del backend). El usuario
 * escribe el producto a mano: la guía puede amparar bienes que no están en el catálogo.
 */
export interface ItemFormularioGuia {
    productoNombre: string;
    sku: string;
    cantidad: number;
    unidad: string;
    descripcion: string;
}

/**
 * Forma cruda de `greForm.value`. Todos los controles son nullables porque el
 * FormBuilder los declara así, y `.value` de un FormGroup es parcial.
 */
export interface ValoresFormularioGuia {
    serie?: string | null;
    numeroDocumento?: string | null;
    fechaEmision?: string | null;
    fechaInicioTraslado?: string | null;
    almacenOrigenId?: string | null;
    direccionOrigen?: string | null;
    ubigeoOrigen?: string | null;
    destinatarioRuc?: string | null;
    destinatarioRazonSocial?: string | null;
    destinatarioDireccion?: string | null;
    ubigeoDestino?: string | null;
    puntoLlegada?: string | null;
    motivoTraslado?: string | null;
    descripcionTraslado?: string | null;
    modalidadTraslado?: '01' | '02' | null;
    pesoBrutoTotal?: number | null;
    transportistaRuc?: string | null;
    transportistaRazonSocial?: string | null;
    transportistaMtc?: string | null;
    vehiculoPlaca?: string | null;
    conductorDocumento?: string | null;
    conductorNombre?: string | null;
    conductorLicencia?: string | null;
}

/**
 * Ítems de la GRE. `unidad` cae a NIU (unidad de medida SUNAT por defecto, "unidades")
 * porque el catálogo 03 de SUNAT no admite una línea sin unidad; `sku` y `descripcion`
 * viajan ausentes si están vacíos, para no sellar el comprobante con cadenas vacías.
 */
export function construirItemsGuiaRemision(items: ItemFormularioGuia[]): GuiaRemisionItemDto[] {
    return items.map((it) => ({
        productoNombre: it.productoNombre,
        sku: it.sku || undefined,
        cantidad: it.cantidad,
        unidad: it.unidad || 'NIU',
        descripcion: it.descripcion || undefined,
    }));
}

/**
 * Traduce el formulario al DTO de alta de Guía de Remisión Electrónica (GRE).
 *
 * Regla que gobierna todo el mapeo: la GRE es un comprobante que se sella y se envía a
 * SUNAT, así que un campo NO llenado tiene que viajar AUSENTE, nunca como cadena vacía
 * —un `''` en el XML es un dato declarado en blanco, no un dato omitido—. De ahí el
 * `|| undefined` en todos los opcionales.
 *
 * Los cinco campos que el formulario declara obligatorios (serie, número, almacén y
 * dirección de origen, motivo de traslado) usan `?? ''` en vez de `|| undefined`: se
 * mandan aunque estén vacíos para que el rechazo lo dé el backend con su validación,
 * y no se pierda en silencio un envío al que le falta la serie.
 *
 * `modalidadTraslado` cae a '02' (transporte PRIVADO, catálogo 18 de SUNAT), que es el
 * default del formulario: sin modalidad la SUNAT no sabe si exigir datos del
 * transportista público o del vehículo propio.
 *
 * `pesoBrutoTotal` usa `??` y no `||`: un peso de 0 es un valor declarado (aunque
 * absurdo) y no debe convertirse en «sin declarar».
 */
export function construirDtoGuiaRemision(
    f: ValoresFormularioGuia,
    items: ItemFormularioGuia[]
): CreateGuiaRemisionDto {
    return {
        serie: f.serie ?? '',
        numeroDocumento: f.numeroDocumento ?? '',
        fechaEmision: f.fechaEmision || undefined,
        fechaInicioTraslado: f.fechaInicioTraslado || undefined,
        almacenOrigenId: f.almacenOrigenId ?? '',
        direccionOrigen: f.direccionOrigen ?? '',
        ubigeoOrigen: f.ubigeoOrigen || undefined,
        destinatarioRuc: f.destinatarioRuc || undefined,
        destinatarioRazonSocial: f.destinatarioRazonSocial || undefined,
        destinatarioDireccion: f.destinatarioDireccion || undefined,
        ubigeoDestino: f.ubigeoDestino || undefined,
        puntoLlegada: f.puntoLlegada || undefined,
        motivoTraslado: f.motivoTraslado ?? '',
        descripcionTraslado: f.descripcionTraslado || undefined,
        modalidadTraslado: f.modalidadTraslado ?? '02',
        pesoBrutoTotal: f.pesoBrutoTotal ?? undefined,
        transportistaRuc: f.transportistaRuc || undefined,
        transportistaRazonSocial: f.transportistaRazonSocial || undefined,
        transportistaMtc: f.transportistaMtc || undefined,
        vehiculoPlaca: f.vehiculoPlaca || undefined,
        conductorDocumento: f.conductorDocumento || undefined,
        conductorNombre: f.conductorNombre || undefined,
        conductorLicencia: f.conductorLicencia || undefined,
        items: construirItemsGuiaRemision(items),
    };
}
