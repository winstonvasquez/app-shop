import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '@env/environment';

export interface ChatMessage {
    id: number;
    conversacionId: number;
    emisorId: number;
    emisorTipo: 'CLIENTE' | 'SOPORTE';
    contenido: string;
    timestamp: string;
    leido: boolean;
}

export interface ChatConversacion {
    id: number;
    clienteId: number;
    asunto: string | null;
    estado: string;
    createdAt: string;
    lastMessageAt: string;
}

/** Intervalo de polling para mensajes nuevos */
const CHAT_POLLING_MS = 5_000;

@Injectable({ providedIn: 'root' })
export class ChatService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.users}/api/chat`;

    /** Estado del panel flotante */
    isOpen = signal(false);

    /** Mensajes no leídos del soporte (para badge) */
    unreadCount = signal(0);

    /** Lista de mensajes de la conversación activa */
    messages = signal<ChatMessage[]>([]);

    /** ID de la conversación activa */
    conversationId = signal<number | null>(null);

    /** Timestamp del último mensaje recibido para polling incremental */
    private lastSince: string | null = null;

    private pollingInterval?: ReturnType<typeof setInterval>;

    /** Abre el panel de chat e inicia el polling */
    open(): void {
        this.isOpen.set(true);
        this.startPolling();
    }

    /** Cierra el panel, detiene el polling y marca mensajes como leídos */
    close(): void {
        this.isOpen.set(false);
        this.stopPolling();
        const convId = this.conversationId();
        if (convId !== null) {
            this.markAsRead(convId).subscribe();
        }
    }

    /**
     * Envía un mensaje en la conversación activa.
     * Si no existe conversación, la crea primero.
     */
    sendMessage(text: string): Observable<ChatMessage> {
        const convId = this.conversationId();
        if (convId === null) {
            // Crear conversación y luego enviar
            return new Observable(observer => {
                this.loadOrCreateConversation().subscribe({
                    next: id => {
                        this.doSendMessage(id, text).subscribe({
                            next: msg => { observer.next(msg); observer.complete(); },
                            error: err => observer.error(err)
                        });
                    },
                    error: err => observer.error(err)
                });
            });
        }
        return this.doSendMessage(convId, text);
    }

    /** Carga la conversación activa o crea una nueva si no existe */
    loadOrCreateConversation(): Observable<number> {
        return new Observable<number>(observer => {
            this.http.get<ChatConversacion>(`${this.baseUrl}/conversaciones/activa`)
                .subscribe({
                    next: conv => {
                        this.conversationId.set(conv.id);
                        // Cargar mensajes iniciales
                        this.loadAllMessages(conv.id);
                        observer.next(conv.id);
                        observer.complete();
                    },
                    error: () => {
                        // 404 → crear nueva conversación
                        this.http.post<ChatConversacion>(`${this.baseUrl}/conversaciones`, {})
                            .subscribe({
                                next: conv => {
                                    this.conversationId.set(conv.id);
                                    this.messages.set([]);
                                    observer.next(conv.id);
                                    observer.complete();
                                },
                                error: err => observer.error(err)
                            });
                    }
                });
        });
    }

    /** Inicia el polling cada 5 segundos */
    private startPolling(): void {
        this.stopPolling(); // limpiar si ya había uno

        const convId = this.conversationId();
        if (convId === null) {
            // Cargar/crear conversación antes de iniciar polling
            this.loadOrCreateConversation().subscribe(() => {
                this.schedulePolling();
            });
        } else {
            this.schedulePolling();
        }
    }

    private schedulePolling(): void {
        this.pollingInterval = setInterval(() => {
            this.getNewMessages();
        }, CHAT_POLLING_MS);
    }

    /** Detiene el polling */
    private stopPolling(): void {
        if (this.pollingInterval !== undefined) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = undefined;
        }
    }

    /** Obtiene mensajes nuevos desde la última marca de tiempo */
    private getNewMessages(): void {
        const convId = this.conversationId();
        if (convId === null) return;

        const url = this.lastSince
            ? `${this.baseUrl}/conversaciones/${convId}/mensajes?since=${encodeURIComponent(this.lastSince)}`
            : `${this.baseUrl}/conversaciones/${convId}/mensajes`;

        this.http.get<ChatMessage[]>(url).pipe(
            catchError(() => of([]))
        ).subscribe(nuevos => {
            if (nuevos.length > 0) {
                this.messages.update(prev => [...prev, ...nuevos]);
                // Actualizar timestamp del último mensaje
                this.lastSince = nuevos[nuevos.length - 1].timestamp;
                // Actualizar badge con mensajes de soporte no leídos
                const noLeidos = nuevos.filter(m => m.emisorTipo === 'SOPORTE' && !m.leido).length;
                if (noLeidos > 0) {
                    this.unreadCount.update(c => c + noLeidos);
                }
            }
        });
    }

    /** Carga todos los mensajes históricos de una conversación */
    private loadAllMessages(convId: number): void {
        this.http.get<ChatMessage[]>(`${this.baseUrl}/conversaciones/${convId}/mensajes`)
            .pipe(catchError(() => of([])))
            .subscribe(msgs => {
                this.messages.set(msgs);
                if (msgs.length > 0) {
                    this.lastSince = msgs[msgs.length - 1].timestamp;
                }
                // Contar no leídos del soporte
                const noLeidos = msgs.filter(m => m.emisorTipo === 'SOPORTE' && !m.leido).length;
                this.unreadCount.set(noLeidos);
            });
    }

    private doSendMessage(convId: number, text: string): Observable<ChatMessage> {
        return this.http.post<ChatMessage>(
            `${this.baseUrl}/conversaciones/${convId}/mensajes`,
            { contenido: text }
        ).pipe(
            tap(msg => {
                this.messages.update(prev => [...prev, msg]);
                this.lastSince = msg.timestamp;
            })
        );
    }

    private markAsRead(convId: number): Observable<void> {
        return this.http.put<void>(`${this.baseUrl}/conversaciones/${convId}/leer`, {}).pipe(
            tap(() => this.unreadCount.set(0)),
            catchError(() => of(undefined as unknown as void))
        );
    }

    /** Inicializa el contador de no leídos desde el backend (llamar en app init si el usuario está autenticado) */
    initUnreadCount(): void {
        const convId = this.conversationId();
        if (convId !== null) {
            this.http.get<{ count: number }>(`${this.baseUrl}/conversaciones/${convId}/unread-count`)
                .pipe(catchError(() => of({ count: 0 })))
                .subscribe(r => this.unreadCount.set(r.count));
        }
    }
}
