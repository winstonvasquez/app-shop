/**
 * Convierte la fecha de un `<input type="date">` (`yyyy-MM-dd`) al `yyyy-MM-ddTHH:mm:ss` que exige
 * un `LocalDateTime` de Jackson (con solo la fecha el backend responde 400 «cuerpo inválido»).
 *
 * - `conHoraActual: false` (por defecto) → `T00:00:00`.
 * - `conHoraActual: true` → hora local de `ahora` (para fechas que ordenan un kardex).
 * - Vacía, o que ya trae hora, se devuelve tal cual: el backend aplica su default o la valida.
 */
export function fechaALocalDateTime(fecha: string, conHoraActual = false, ahora: Date = new Date()): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
    if (!conHoraActual) return `${fecha}T00:00:00`;
    const dos = (n: number): string => String(n).padStart(2, '0');
    return `${fecha}T${dos(ahora.getHours())}:${dos(ahora.getMinutes())}:${dos(ahora.getSeconds())}`;
}
