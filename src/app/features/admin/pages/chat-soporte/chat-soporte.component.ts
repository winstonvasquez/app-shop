import {
    Component,
    inject,
    signal,
    OnInit,
    OnDestroy,
    ChangeDetectionStrategy,
    ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { catchError, of } from 'rxjs';
import { ChatConversacion, ChatMessage } from '@core/services/chat/chat.service';

@Component({
    selector: 'app-chat-soporte',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule],
    template: `
        <div class="page-header">
            <div>
                <h1 class="page-title">Bandeja de Soporte</h1>
                <p class="page-subtitle">Conversaciones activas de clientes</p>
            </div>
        </div>

        <div class="chat-admin-layout">
            <!-- Lista de conversaciones -->
            <div class="conv-list card">
                <div class="card-header">
                    <span class="card-title">Conversaciones</span>
                    <span class="badge badge-accent">{{ conversaciones().length }}</span>
                </div>
                <div class="card-body" style="padding:0">
                    @if (loading()) {
                        <div class="loading-container" style="height:120px">
                            <div class="spinner"></div>
                        </div>
                    } @else if (conversaciones().length === 0) {
                        <p style="padding:var(--space-md);color:var(--color-text-muted);text-align:center;font-size:0.875rem">
                            No hay conversaciones activas
                        </p>
                    } @else {
                        @for (conv of conversaciones(); track conv.id) {
                            <button
                                class="conv-item"
                                [class.active]="selectedConv()?.id === conv.id"
                                (click)="selectConv(conv)"
                            >
                                <span class="conv-icon">💬</span>
                                <div class="conv-info">
                                    <span class="conv-client">Cliente #{{ conv.clienteId }}</span>
                                    <span class="conv-asunto">{{ conv.asunto ?? 'Sin asunto' }}</span>
                                    <span class="conv-time">{{ formatDate(conv.lastMessageAt) }}</span>
                                </div>
                                <span class="badge badge-success" style="font-size:0.65rem">ABIERTA</span>
                            </button>
                        }
                    }
                </div>
            </div>

            <!-- Panel de mensajes -->
            <div class="msg-panel card" [class.empty]="!selectedConv()">
                @if (!selectedConv()) {
                    <div class="msg-empty">
                        <span style="font-size:2.5rem">💬</span>
                        <p>Selecciona una conversación para ver los mensajes</p>
                    </div>
                } @else {
                    <div class="card-header">
                        <span class="card-title">Conversación #{{ selectedConv()!.id }}</span>
                        <span style="font-size:0.75rem;color:var(--color-text-muted)">
                            Cliente #{{ selectedConv()!.clienteId }}
                        </span>
                    </div>

                    <div class="msg-list" #msgContainer>
                        @if (messages().length === 0) {
                            <p style="text-align:center;color:var(--color-text-muted);font-size:0.875rem;padding:24px">
                                Sin mensajes aún
                            </p>
                        }
                        @for (msg of messages(); track msg.id) {
                            <div class="msg-row" [class.from-client]="msg.emisorTipo === 'CLIENTE'"
                                 [class.from-support]="msg.emisorTipo === 'SOPORTE'">
                                <div class="msg-bubble">
                                    <span class="msg-sender">{{ msg.emisorTipo === 'CLIENTE' ? 'Cliente' : 'Soporte' }}</span>
                                    <span class="msg-text">{{ msg.contenido }}</span>
                                    <span class="msg-time">{{ formatTime(msg.timestamp) }}</span>
                                </div>
                            </div>
                        }
                    </div>

                    <div class="msg-input-area">
                        <textarea
                            class="input-field"
                            [(ngModel)]="reply"
                            placeholder="Escribe una respuesta como soporte..."
                            rows="2"
                            (keydown.ctrl.enter)="sendReply()"
                            style="resize:none;font-size:0.875rem"
                        ></textarea>
                        <button
                            class="btn btn-primary"
                            (click)="sendReply()"
                            [disabled]="sending() || !reply.trim()"
                        >
                            @if (sending()) {
                                Enviando...
                            } @else {
                                Responder
                            }
                        </button>
                    </div>
                }
            </div>
        </div>
    `,
    styles: [`
        .chat-admin-layout {
            display: grid;
            grid-template-columns: 280px 1fr;
            gap: var(--space-md, 16px);
            height: calc(100vh - 180px);
        }

        /* Lista de conversaciones */
        .conv-list {
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .conv-item {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 12px 16px;
            width: 100%;
            text-align: left;
            background: none;
            border: none;
            border-bottom: 1px solid var(--color-border);
            cursor: pointer;
            transition: background 0.15s;
            color: inherit;
        }

        .conv-item:hover,
        .conv-item.active {
            background: var(--color-surface-raised);
        }

        .conv-item.active {
            border-left: 3px solid var(--color-primary);
        }

        .conv-icon {
            font-size: 1.4rem;
            flex-shrink: 0;
            margin-top: 2px;
        }

        .conv-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
            flex: 1;
            min-width: 0;
        }

        .conv-client {
            font-weight: 600;
            font-size: 0.875rem;
            color: var(--color-text-on, #e8e8e8);
        }

        .conv-asunto {
            font-size: 0.78rem;
            color: var(--color-text-muted, #888);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .conv-time {
            font-size: 0.7rem;
            color: var(--color-text-muted, #888);
        }

        /* Panel de mensajes */
        .msg-panel {
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .msg-panel.empty {
            align-items: center;
            justify-content: center;
        }

        .msg-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            color: var(--color-text-muted, #888);
            font-size: 0.875rem;
        }

        .msg-list {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .msg-row {
            display: flex;
        }

        .msg-row.from-client {
            justify-content: flex-start;
        }

        .msg-row.from-support {
            justify-content: flex-end;
        }

        .msg-bubble {
            max-width: 70%;
            padding: 8px 14px;
            border-radius: 14px;
            font-size: 0.82rem;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .from-client .msg-bubble {
            background: var(--color-surface-raised);
            border: 1px solid var(--color-border);
            border-bottom-left-radius: 4px;
        }

        .from-support .msg-bubble {
            background: var(--color-primary);
            color: #fff;
            border-bottom-right-radius: 4px;
        }

        .msg-sender {
            font-size: 0.68rem;
            font-weight: 600;
            opacity: 0.7;
        }

        .msg-text {
            word-break: break-word;
            line-height: 1.45;
        }

        .msg-time {
            font-size: 0.67rem;
            opacity: 0.6;
            align-self: flex-end;
        }

        .msg-input-area {
            padding: 12px 16px;
            border-top: 1px solid var(--color-border);
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
    `]
})
export class ChatSoporteComponent implements OnInit, OnDestroy {
    private readonly http = inject(HttpClient);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly adminBase = `${environment.apiUrls.users}/api/admin/chat`;
    private readonly clientBase = `${environment.apiUrls.users}/api/chat`;

    conversaciones = signal<ChatConversacion[]>([]);
    selectedConv = signal<ChatConversacion | null>(null);
    messages = signal<ChatMessage[]>([]);
    loading = signal(true);
    sending = signal(false);

    reply = '';
    private pollingInterval?: ReturnType<typeof setInterval>;
    private lastSince: string | null = null;

    ngOnInit(): void {
        this.loadConversaciones();
        // Polling de nuevas conversaciones cada 10s
        this.pollingInterval = setInterval(() => this.loadConversaciones(), 10_000);
    }

    ngOnDestroy(): void {
        if (this.pollingInterval !== undefined) {
            clearInterval(this.pollingInterval);
        }
    }

    loadConversaciones(): void {
        this.http.get<ChatConversacion[]>(`${this.adminBase}/conversaciones`)
            .pipe(catchError(() => of([])))
            .subscribe(convs => {
                this.conversaciones.set(convs);
                this.loading.set(false);
                this.cdr.markForCheck();
            });
    }

    selectConv(conv: ChatConversacion): void {
        this.selectedConv.set(conv);
        this.messages.set([]);
        this.lastSince = null;
        this.loadMessages(conv.id);
    }

    loadMessages(convId: number): void {
        const url = this.lastSince
            ? `${this.clientBase}/conversaciones/${convId}/mensajes?since=${encodeURIComponent(this.lastSince)}`
            : `${this.clientBase}/conversaciones/${convId}/mensajes`;

        this.http.get<ChatMessage[]>(url)
            .pipe(catchError(() => of([])))
            .subscribe(msgs => {
                if (this.lastSince) {
                    this.messages.update(prev => [...prev, ...msgs]);
                } else {
                    this.messages.set(msgs);
                }
                if (msgs.length > 0) {
                    this.lastSince = msgs[msgs.length - 1].timestamp;
                }
                this.cdr.markForCheck();
            });
    }

    sendReply(): void {
        const convId = this.selectedConv()?.id;
        if (!convId || !this.reply.trim() || this.sending()) return;

        this.sending.set(true);
        const texto = this.reply.trim();
        this.reply = '';

        this.http.post<ChatMessage>(
            `${this.adminBase}/conversaciones/${convId}/mensajes`,
            { contenido: texto }
        ).pipe(catchError(() => of(null)))
         .subscribe(msg => {
             if (msg) {
                 this.messages.update(prev => [...prev, msg]);
                 this.lastSince = msg.timestamp;
             }
             this.sending.set(false);
             this.cdr.markForCheck();
         });
    }

    formatDate(ts: string): string {
        try {
            return new Date(ts).toLocaleDateString('es-PE', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
            });
        } catch { return ts; }
    }

    formatTime(ts: string): string {
        try {
            return new Date(ts).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
        } catch { return ''; }
    }
}
