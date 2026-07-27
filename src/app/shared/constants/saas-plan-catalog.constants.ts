/**
 * Contenido curado de landing/pricing — SaaS plans y módulos.
 *
 * Los HECHOS (precio, maxUsers, módulos incluidos por plan) SIEMPRE vienen de
 * `PortalService.getPlans()` / `getModules()` (backend, tabla saas_plan /
 * saas_module / saas_plan_module en microshopusers). Este archivo NUNCA debe
 * hardcodear precio ni maxUsers — solo copy de marketing (audiencia, soporte,
 * agrupación por dominio, bullets de capacidades) que el backend no modela.
 *
 * Antes de editar: alinear con microshopusers `SaasQueryService.getAllPlans()`
 * y la seed `V4__saas_subscriptions.sql` (códigos de plan/módulo deben calzar).
 */
import { SaasPlanInfo } from '../../core/models/saas.model';

export type ModuleDomainKey = 'comercial' | 'cadena-suministro' | 'finanzas' | 'personas';

export interface ModuleContentMeta {
  domain: ModuleDomainKey;
  purpose: string;
  capabilities: string[];
}

/** Copy curado por código de módulo (`SaasModuleInfo.code`). */
export const MODULE_CONTENT: Record<string, ModuleContentMeta> = {
  POS: {
    domain: 'comercial',
    purpose: 'Vender rápido en mostrador con boleta o factura electrónica al instante.',
    capabilities: [
      'Cobro táctil con múltiples medios de pago (efectivo, tarjeta, Yape/Plin)',
      'Emisión de boleta y factura electrónica SUNAT en el mismo flujo',
      'Funciona offline y sincroniza al reconectar',
      'Apertura y cierre de caja con arqueo',
    ],
  },
  VENTAS: {
    domain: 'comercial',
    purpose: 'Gestiona pedidos, cotizaciones y comprobantes electrónicos fuera del mostrador.',
    capabilities: [
      'Cotizaciones y pedidos con seguimiento de estado',
      'Comprobantes electrónicos (factura/boleta) validados por SUNAT',
      'Integración con el canal de venta online (storefront)',
      'Gestión de clientes y líneas de crédito',
    ],
  },
  COMPRAS: {
    domain: 'cadena-suministro',
    purpose: 'Controla órdenes de compra y proveedores desde la cotización hasta la recepción.',
    capabilities: [
      'Registro y evaluación de proveedores',
      'Órdenes de compra con aprobación por niveles',
      'Recepción de mercadería validada contra la OC',
      'Cálculo automático de detracciones y retenciones SUNAT',
    ],
  },
  INVENTARIO: {
    domain: 'cadena-suministro',
    purpose: 'Mantén el stock exacto en todos tus almacenes en tiempo real.',
    capabilities: [
      'Kardex valorizado (PEPS / promedio ponderado)',
      'Múltiples almacenes, sin límite de cantidad',
      'Alertas de stock mínimo y máximo',
      'Conteos físicos con ajuste automático de kardex',
    ],
  },
  LOGISTICA: {
    domain: 'cadena-suministro',
    purpose: 'Despacha con guías de remisión electrónicas y visibilidad del transporte.',
    capabilities: [
      'Guías de remisión electrónicas (remitente y transportista)',
      'Tracking de despacho en tiempo real',
      'Gestión de transportistas y unidades',
      'Planificación de rutas de entrega',
    ],
  },
  CONTABILIDAD: {
    domain: 'finanzas',
    purpose: 'Automatiza tu contabilidad bajo el PCGE y genera tus libros electrónicos.',
    capabilities: [
      'Plan Contable General Empresarial (PCGE 2020)',
      'Asientos automáticos desde ventas, compras y planillas',
      'Libro diario y libro mayor',
      'Generación de libros electrónicos (PLE) para SUNAT',
    ],
  },
  TESORERIA: {
    domain: 'finanzas',
    purpose: 'Controla cajas, bancos y el flujo de caja real de tu empresa.',
    capabilities: [
      'Control de cajas y cuentas bancarias',
      'Flujo de caja proyectado vs. real',
      'Conciliación bancaria',
      'Ingresos y egresos por centro de costo',
    ],
  },
  RRHH: {
    domain: 'personas',
    purpose: 'Gestiona planillas y el ciclo de vida completo de tus colaboradores.',
    capabilities: [
      'Planillas con cálculo automático de CTS y gratificaciones',
      'Control de asistencia y vacaciones',
      'Evaluaciones de desempeño 360°',
      'Legajo digital del colaborador (documentos, contratos, dependientes)',
    ],
  },
};

export interface ModuleDomainMeta {
  key: ModuleDomainKey;
  label: string;
  description: string;
}

/** Agrupación funcional para la sección de módulos del landing. */
export const MODULE_DOMAINS: ModuleDomainMeta[] = [
  { key: 'comercial', label: 'Comercial y Atención al Cliente', description: 'Todo el ciclo de venta, en mostrador y fuera de él.' },
  { key: 'cadena-suministro', label: 'Cadena de Suministro', description: 'Compras, inventario y despacho conectados entre sí.' },
  { key: 'finanzas', label: 'Finanzas y Cumplimiento', description: 'Contabilidad y tesorería alineadas con SUNAT.' },
  { key: 'personas', label: 'Personas', description: 'Gestión completa del talento y la planilla.' },
];

export interface PlanSupportMeta {
  channel: string;
  hours: string;
  slaResponse: string;
  extra?: string;
}

export interface PlanContentMeta {
  audience: string;
  recommended: boolean;
  support: PlanSupportMeta;
}

/** Copy curado por código de plan (`SaasPlanInfo.code`). */
export const PLAN_CONTENT: Record<string, PlanContentMeta> = {
  STARTER: {
    audience: 'Micro y pequeñas empresas que recién digitalizan su mostrador y facturación.',
    recommended: false,
    support: { channel: 'Chat estándar', hours: 'Horario de oficina (L-V 9am-6pm)', slaResponse: 'Respuesta objetivo en 24h' },
  },
  PROFESSIONAL: {
    audience: 'Empresas en crecimiento que necesitan compras, inventario, contabilidad, logística y tesorería integrados.',
    recommended: true,
    support: { channel: 'Chat y correo prioritario', hours: 'Horario extendido', slaResponse: 'Respuesta objetivo en 4h' },
  },
  ENTERPRISE: {
    audience: 'Corporativos o empresas multi-sede que necesitan RRHH, planillas y el ERP completo.',
    recommended: false,
    support: {
      channel: 'Canal dedicado + ejecutivo de cuenta',
      hours: '24/7',
      slaResponse: 'Respuesta objetivo en 1h',
      extra: 'Acuerdo de soporte con SLA dedicado (negociado por contrato)',
    },
  },
};

/**
 * Controles de seguridad que aplican igual en TODOS los planes — verificado contra el código
 * (no marketing). Antes de editar, releer:
 * - JWT RSA-256: sesión persistida en BD, SIN mecanismo de revocación real (SesionEntity.valido
 *   nunca se pone en false, no hay endpoint de logout). No afirmar "revocable".
 * - RBAC: SecurityConfig usa hasRole/hasAnyRole (rol fijo). PolicyEntity/PolicyRoleEntity
 *   (ALLOW/DENY) existen pero solo se exponen a la UI (UserQueryService) — no hay evaluador que
 *   los aplique en runtime. No afirmar que las políticas ALLOW/DENY controlan el acceso real.
 */
export const SECURITY_BASELINE: string[] = [
  'Autenticación con JWT firmado RSA-256, con sesión registrada en base de datos',
  'Aislamiento de datos por empresa (multi-tenant) con defensa activa contra acceso cruzado (IDOR) en cada endpoint sensible',
  'Control de acceso por roles (RBAC), con catálogo de políticas de permisos por rol',
  'Contraseñas cifradas con BCrypt — nunca se almacenan en texto plano',
  'Auditoría base: cada registro guarda qué usuario lo creó o modificó y cuándo',
  'Comunicación cifrada en tránsito (HTTPS/TLS)',
  'Retención de datos: se conservan mientras la suscripción esté activa, sin borrado automático ni diferencia entre planes',
];

/**
 * Cumplimiento SUNAT — a diferencia de SECURITY_BASELINE, esto SÍ varía por plan, porque
 * depende de qué módulo incluye cada uno (no es un control de seguridad, es una capacidad
 * de negocio ligada a VENTAS/CONTABILIDAD/LOGISTICA). Verificado contra la seed real de planes.
 */
export const COMPLIANCE_BY_PLAN: string[] = [
  'Comprobantes electrónicos SUNAT (boleta/factura): incluidos desde Starter (módulo Ventas/POS)',
  'Libros electrónicos (PLE) y PCGE 2020: incluidos desde Professional (módulo Contabilidad)',
  'Guías de remisión electrónica (GRE): incluidas desde Professional (módulo Logística)',
];

/**
 * No hay un nivel de seguridad "premium": los controles de arriba son idénticos en los 3 planes.
 * (Se descartó un diferenciador basado en Envers/RRHH: esas tablas de auditoría solo existen hoy
 * vía ddl-auto=update en dev — ninguna migración Flyway las crea. Con ddl-auto=none, que es la
 * configuración correcta, el historial de revisiones no existe. Afirmarlo sería falso.)
 */
export const SECURITY_PARITY_NOTE =
  'La seguridad no se vende por niveles: los controles de arriba son exactamente los mismos en Starter, Professional y Enterprise. Lo único que cambia entre planes es el catálogo de módulos disponibles (por ejemplo, RRHH es exclusivo de Enterprise).';

/** Límites que NO están restringidos por el backend en ningún plan — se declaran explícitos para evitar ambigüedad. */
export const UNLIMITED_ACROSS_PLANS: string[] = [
  'Sedes: sin límite técnico en ningún plan',
  'Almacenamiento de datos: sin límite técnico en ningún plan',
  'Volumen de operaciones (ventas, compras, comprobantes): sin límite técnico en ningún plan',
];

/**
 * Plan más económico que incluye el módulo dado, según los planes reales
 * devueltos por el backend (`SaasPlanInfo.moduleCodes`). Devuelve `undefined`
 * si ningún plan activo lo incluye todavía.
 */
export function minPlanForModule(moduleCode: string, plans: SaasPlanInfo[]): SaasPlanInfo | undefined {
  return [...plans]
    .sort((a, b) => a.priceMonthly - b.priceMonthly)
    .find((p) => p.moduleCodes.includes(moduleCode));
}
