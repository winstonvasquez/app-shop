/** Lo mínimo de un pedido que necesita la serie diaria del dashboard. */
export interface PedidoParaSerie {
    fechaPedido: string;
    estado: string;
    total: number;
}

const dosDigitos = (n: number): string => String(n).padStart(2, '0');

/** Primer y último día del mes de `hoy` en `yyyy-MM-dd` (lo que esperan fechaPedidoDesde/Hasta). */
export function rangoDelMes(hoy: Date): { desde: string; hasta: string } {
    const y = hoy.getFullYear();
    const m = hoy.getMonth();
    const ultimo = new Date(y, m + 1, 0).getDate();
    const mes = `${y}-${dosDigitos(m + 1)}`;
    return { desde: `${mes}-01`, hasta: `${mes}-${dosDigitos(ultimo)}` };
}

/**
 * Ventas por día del mes de `hoy`: suma de `total` de cada pedido cobrado (PAGADO, ENVIADO o ENTREGADO), indexada por día
 * (posición 0 = día 1). Los pedidos de otro mes se ignoran. La fecha se lee del texto
 * (`yyyy-MM-ddTHH:mm:ss`, un LocalDateTime sin zona) para que la zona horaria del navegador
 * no mueva un pedido de las 23:30 al día siguiente.
 */
const ESTADOS_COBRADOS: ReadonlySet<string> = new Set(['PAGADO', 'ENVIADO', 'ENTREGADO']);

export function ventasPorDia(pedidos: readonly PedidoParaSerie[], hoy: Date): number[] {
    const anio = hoy.getFullYear();
    const mes = hoy.getMonth() + 1;
    const serie: number[] = new Array(new Date(anio, mes, 0).getDate()).fill(0);
    for (const p of pedidos) {
        // Venta = pedido cobrado (el ingreso nace al cobrar): un PENDIENTE todavía no lo es.
        if (!ESTADOS_COBRADOS.has(p.estado) || !p.fechaPedido) continue;
        const a = Number(p.fechaPedido.slice(0, 4));
        const m = Number(p.fechaPedido.slice(5, 7));
        const d = Number(p.fechaPedido.slice(8, 10));
        if (a === anio && m === mes && d >= 1 && d <= serie.length) {
            serie[d - 1] += p.total ?? 0;
        }
    }
    return serie.map(v => Math.round(v * 100) / 100);
}
