/** Contrato de `ReclamoController` (microshopventas, context-path /sales). */
export type TipoReclamo = 'RECLAMO' | 'QUEJA';
export type EstadoReclamo = 'PENDIENTE' | 'RESPONDIDO';
export type BienContratado = 'PRODUCTO' | 'SERVICIO';

/** Catálogo 06 SUNAT: 1 DNI, 4 CE, 6 RUC, 7 pasaporte. */
export const TIPOS_DOC_RECLAMO: readonly { value: string; label: string }[] = [
    { value: '1', label: 'DNI' },
    { value: '4', label: 'Carné de extranjería' },
    { value: '6', label: 'RUC' },
    { value: '7', label: 'Pasaporte' },
];

/** Body de POST /api/reclamos (ReclamoRequestDto). */
export interface ReclamoRequest {
    consumidorNombre: string;
    consumidorTipoDoc: string;
    consumidorNumDoc: string;
    domicilio: string;
    telefono?: string;
    email: string;
    menorEdad: boolean;
    apoderadoNombre?: string;
    apoderadoTipoDoc?: string;
    apoderadoNumDoc?: string;
    bienTipo: BienContratado;
    montoReclamado?: number;
    bienDescripcion: string;
    tipo: TipoReclamo;
    detalle: string;
    pedidoConsumidor: string;
}

/** ReclamoResponseDto. */
export interface Reclamo extends Omit<ReclamoRequest, 'montoReclamado' | 'telefono'> {
    id: number;
    /** Hoja numerada NNNNNN-AAAA: la constancia del consumidor. */
    codigo: string;
    estado: EstadoReclamo;
    fechaRegistro: string;
    /** yyyy-MM-dd (+15 días hábiles). */
    fechaLimiteRespuesta: string;
    vencido: boolean;
    telefono: string | null;
    montoReclamado: number | null;
    respuesta: string | null;
    fechaRespuesta: string | null;
    respondidoPor: number | null;
}
