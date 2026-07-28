/**
 * Modelos del dominio WMS "logística" (Almacén = UUID, `com.microshop.logistica`) —
 * distinto del dominio "invalmacen" (Warehouse = Long) de `inventory.models.ts`.
 * Backend: `${environment.apiUrls.logistics}/api/{zonas,ubicaciones,lotes,numeros-serie,reglas-reposicion,kardex}`.
 */

export type ZoneType = 'RECEPCION' | 'ALMACENAMIENTO' | 'PICKING' | 'PACKING' | 'DESPACHO' | 'DEVOLUCIONES' | 'CROSS_DOCK';
export type ZoneTemperature = 'AMBIENTE' | 'FRIO' | 'CONGELADO';
export type ZoneLocationType = 'STORAGE' | 'PICKING' | 'RECEIVING' | 'SHIPPING' | 'STAGING';
export type SerialStatusWms = 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'RETURNED' | 'DEFECTIVE';
export type LotSelectionStrategy = 'FIFO' | 'FEFO';

export interface WarehouseZone {
    id: string;
    almacenId: string;
    nombre: string;
    codigo: string;
    tipo: ZoneType;
    temperatura: ZoneTemperature;
    descripcion?: string;
    capacidadMaxima: number;
    ocupacionActual: number;
    ordenPicking: number;
    fechaCreacion: string;
}

export interface CreateZoneRequest {
    almacenId: string;
    nombre: string;
    codigo: string;
    tipo: ZoneType;
    temperatura?: ZoneTemperature;
    descripcion?: string;
    capacidadMaxima: number;
    ordenPicking: number;
}

export interface ZoneLocation {
    id: string;
    zoneId: string;
    zoneCodigo?: string;
    codigo: string;
    pasillo?: string;
    estante?: string;
    nivel?: string;
    posicion?: string;
    tipo: ZoneLocationType;
    capacidadMaxima: number;
    ocupacionActual: number;
    fechaCreacion: string;
}

export interface CreateZoneLocationRequest {
    zoneId: string;
    codigo: string;
    pasillo?: string;
    estante?: string;
    nivel?: string;
    posicion?: string;
    tipo?: ZoneLocationType;
    capacidadMaxima: number;
}

export interface Lot {
    id: string;
    productoId: string;
    sku: string;
    loteNumero: string;
    fechaFabricacion?: string;
    fechaVencimiento?: string;
    cantidadInicial: number;
    cantidadActual: number;
    proveedorNombre?: string;
    notas?: string;
    activo: boolean;
    fechaCreacion: string;
}

/**
 * Payload de POST y PUT de lotes (`CreateLotRequest` del backend).
 * - `cantidadInicial` solo se persiste al crear: es la línea base del kardex del lote
 *   (`consumido = cantidadInicial - cantidadActual`); el PUT la ignora a propósito.
 * - `activo` solo lo interpreta el PUT — permite REACTIVAR un lote dado de baja lógica.
 */
export interface CreateLotRequest {
    productoId: string;
    sku: string;
    loteNumero: string;
    fechaFabricacion?: string;
    fechaVencimiento?: string;
    cantidadInicial: number;
    proveedorNombre?: string;
    notas?: string;
    activo?: boolean;
}

export interface LotExpirationAlert {
    lotId: string;
    loteNumero: string;
    sku: string;
    fechaVencimiento: string;
    diasRestantes: number;
    cantidadActual: number;
}

export interface SerialNumberWms {
    id: string;
    productoId: string;
    sku: string;
    serialNumber: string;
    lotId?: string;
    status: SerialStatusWms;
    currentLocation?: string;
    notas?: string;
    activo: boolean;
    fechaCreacion: string;
}

export interface CreateSerialRequest {
    productoId: string;
    sku: string;
    serialNumber: string;
    lotId?: string;
    currentLocation?: string;
    notas?: string;
}

export interface ReplenishmentRule {
    id: string;
    productoId: string;
    almacenId?: string;
    sku: string;
    productoNombre?: string;
    reorderPoint: number;
    reorderQuantity: number;
    preferredSupplierId?: string;
    preferredSupplierName?: string;
    maxUnitCost?: number;
    autoCreatePo: boolean;
    lastTriggeredAt?: string;
    triggerCount: number;
    status: string;
    activo: boolean;
    fechaCreacion: string;
    fechaModificacion?: string;
}

export interface CreateReplenishmentRuleRequest {
    productoId: string;
    almacenId?: string;
    sku: string;
    productoNombre?: string;
    reorderPoint: number;
    reorderQuantity: number;
    preferredSupplierId?: string;
    preferredSupplierName?: string;
    maxUnitCost?: number;
    autoCreatePo?: boolean;
}

export interface KardexLogisticoEntry {
    movimientoId: string;
    tipoMovimiento: string;
    fecha: string;
    descripcion: string;
    cantidadEntrada: number;
    cantidadSalida: number;
    saldo: number;
    sku: string;
    productoNombre?: string;
    almacenNombre?: string;
    almacenId: string;
    precioUnitario?: number;
    costoTotal?: number;
}
