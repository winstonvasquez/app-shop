/**
 * @microshop/auth-lib — Event Bus
 *
 * Comunicación desacoplada entre microfrontends via CustomEvents del DOM.
 * Ningún MFE importa directamente a otro — solo usa este bus.
 *
 * Prefijo de eventos: 'microshop:'
 *
 * Eventos estándar:
 *   'user:logout'       — todos los MFEs limpian su estado
 *   'tenant:changed'    — recargar datos con nuevo tenant
 *   'module:activated'  — sidebar actualiza nav items
 *   'nav:breadcrumb'    — actualizar breadcrumb del shell
 *   'cart:updated'      — badge del carrito en topbar
 *   'notification:show' — mostrar toast global
 */

export type MicroshopEventType =
    | 'user:logout'
    | 'tenant:changed'
    | 'module:activated'
    | 'nav:breadcrumb'
    | 'cart:updated'
    | 'notification:show';

export interface BreadcrumbEvent {
    items: { label: string; url?: string }[];
}

export interface NotificationEvent {
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
}

export const eventBus = {
    emit<T>(event: MicroshopEventType, data?: T): void {
        window.dispatchEvent(
            new CustomEvent(`microshop:${event}`, { detail: data, bubbles: true })
        );
    },

    on<T>(event: MicroshopEventType, callback: (data: T) => void): () => void {
        const handler = (e: Event) => callback((e as CustomEvent<T>).detail);
        window.addEventListener(`microshop:${event}`, handler);
        return () => window.removeEventListener(`microshop:${event}`, handler);
    }
};
