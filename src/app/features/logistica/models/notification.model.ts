/**
 * Espejo EXACTO de `NotificationResponse` (backend logística):
 * `id/userId/type/title/message/data/read/readAt/fechaCreacion`.
 *
 * Fix ronda 3 (2026-07-26): el modelo declaraba `createdAt` (nunca enviado por el backend)
 * y `companyId` (tampoco existe en el DTO) → la fecha se renderizaba VACÍA en cada
 * notificación, tanto en el GET /unread inicial como en las que llegan por el stream SSE.
 * Se alinea al nombre real del backend (`fechaCreacion`, ISO-8601 de un `Instant`).
 */
export interface LogisticsNotification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: string;
    /** Payload JSON serializado (opcional, informativo). */
    data?: string;
    read: boolean;
    fechaCreacion: string;
    readAt?: string;
}

export interface UnreadCountResponse {
    count: number;
}
