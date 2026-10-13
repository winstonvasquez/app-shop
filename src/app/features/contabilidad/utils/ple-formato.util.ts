/**
 * Formatos comunes a todos los libros PLE de SUNAT. Estaban duplicados letra por letra
 * en el registro de ventas (libro 14) y en el de compras (libro 8); el formato de una
 * fecha o de un periodo NO depende del libro, sólo la lista de campos lo hace.
 */

const MESES: Record<string, string> = {
    enero: '01', febrero: '02', marzo: '03', abril: '04',
    mayo: '05', junio: '06', julio: '07', agosto: '08',
    septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12'
};

/**
 * Periodo tributario en el formato AAAAMM00 que exige la cabecera de cada línea PLE
 * (los dos últimos dígitos son el día, siempre 00 en libros mensuales).
 *
 * Entra el nombre humano del periodo contable («Marzo 2026»). Un mes que no esté en
 * la tabla cae a enero y un año ausente a 2026: el libro se genera igual y el usuario
 * ve el error en el nombre del archivo antes de subirlo a SUNAT.
 */
export function formatPeriodoPLE(nombre: string): string {
    const parts = nombre.toLowerCase().split(' ');
    const mes = MESES[parts[0]] ?? '01';
    const anio = parts[1] ?? '2026';
    return `${anio}${mes}00`;
}

/** Fecha en el formato DD/MM/AAAA del PLE. Sin fecha, campo vacío (SUNAT lo admite). */
export function formatFechaPLE(fecha: string): string {
    if (!fecha) return '';
    try {
        const d = new Date(fecha);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        return `${dd}/${mm}/${d.getFullYear()}`;
    } catch { return fecha; }
}
