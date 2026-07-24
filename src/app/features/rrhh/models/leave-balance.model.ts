/**
 * Balance de vacaciones de un empleado para un año determinado.
 * Espeja `LeaveBalanceDto` (microshopusers · com.microshop.rrhh.application.dto.vacation).
 */
export interface LeaveBalance {
    id: number;
    employeeId: number;
    employeeName: string | null;
    anio: number;
    diasGanados: number;
    diasUsados: number;
    diasDisponibles: number;
    diasVencidos: number;
}
