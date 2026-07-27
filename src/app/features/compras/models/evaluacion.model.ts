export interface EvaluacionProveedor {
    id: string;
    proveedorId: string;
    proveedorNombre: string;
    ordenCompraId?: string;
    ordenCompraCodigo?: string;
    /** YYYY-MM. Ausente en evaluaciones históricas creadas antes del filtro de periodo. */
    periodo?: string;
    puntajeEntrega: number;
    puntajeCalidad: number;
    puntajePrecio: number;
    puntajeServicio: number;
    puntajeTotal: number;
    nivel: string;
    /** OJO: el backend (EvaluacionDto/EvaluarProveedorRequest) usa `observaciones`, no `comentarios`. */
    observaciones?: string;
    evaluadoPor?: string;
    fechaEvaluacion: string;
}

export interface CrearEvaluacionRequest {
    proveedorId: string;
    ordenCompraId?: string;
    puntajeEntrega: number;
    puntajeCalidad: number;
    puntajePrecio: number;
    puntajeServicio: number;
    observaciones?: string;
}

export interface PresupuestoCompras {
    id: string;
    periodo: string;
    categoria: string;
    montoAsignado: number;
    montoEjecutado: number;
    montoComprometido: number;
    disponible: number;
    porcentajeEjecucion: number;
    estado: string;
}

export interface PuntoReorden {
    id: string;
    productoId: string;
    sku: string;
    productoNombre: string;
    proveedorId?: string;
    proveedorNombre?: string;
    stockMinimo: number;
    puntoReorden: number;
    cantidadSugerida: number;
    stockActual: number;
    requiereReorden: boolean;
    activo: boolean;
}

export interface HistorialPrecio {
    id: string;
    productoId: string;
    sku: string;
    productoNombre: string;
    proveedorId: string;
    proveedorNombre: string;
    ordenCompraId?: string;
    ordenCompraCodigo?: string;
    precioUnitario: number;
    moneda: string;
    fechaReferencia: string;
}
