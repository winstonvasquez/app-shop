import {
    Component,
    inject,
    signal,
    AfterViewChecked,
    ElementRef,
    ViewChild,
    ChangeDetectionStrategy,
    OnDestroy
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatService } from '@core/services/chat/chat.service';
import { AuthService } from '@core/auth/auth.service';

@Component({
    selector: 'app-floating-chat',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule],
    template: `
        <div class="floating-chat" [class.open]="chatService.isOpen()">
            <!-- Header -->
            <div class="chat-header">
                <div class="chat-header-info">
                    <span class="chat-avatar">💬</span>
                    <div>
                        <span class="chat-title">Soporte MicroShop</span>
                        <span class="chat-status">En línea</span>
                    </div>
                </div>
                <button class="chat-close-btn" (click)="chatService.close()" aria-label="Cerrar chat">✕</button>
            </div>

            <!-- Cuerpo del chat -->
            <div class="chat-messages" #scrollContainer>
                @if (!authService.isAuthenticated()) {
                    <div class="chat-guest-msg">
                        <span class="chat-guest-icon">🔒</span>
                        <p>Inicia sesión para chatear con nuestro equipo de soporte.</p>
                    </div>
                } @else if (chatService.messages().length === 0) {
                    <div class="chat-empty">
                        <span class="chat-empty-icon">👋</span>
                        <p>¡Hola! ¿En qué podemos ayudarte hoy?</p>
                    </div>
                } @else {
                    @for (msg of chatService.messages(); track msg.id) {
                        <div class="chat-msg" [class.from-client]="msg.emisorTipo === 'CLIENTE'"
                             [class.from-support]="msg.emisorTipo === 'SOPORTE'">
                            <div class="chat-bubble">
                                <span class="chat-bubble-text">{{ msg.contenido }}</span>
                                <span class="chat-bubble-time">{{ formatTime(msg.timestamp) }}</span>
                            </div>
                        </div>
                    }
                }
            </div>

            <!-- Input de mensaje -->
            @if (authService.isAuthenticated()) {
                <div class="chat-input-area">
                    <input
                        class="chat-input"
                        [(ngModel)]="newMessage"
                        (keydown.enter)="send()"
                        placeholder="Escribe un mensaje..."
                        [disabled]="sending()"
                        maxlength="500"
                        aria-label="Mensaje de chat"
                    />
                    <button class="chat-send-btn" (click)="send()" [disabled]="sending() || !newMessage.trim()"
                            aria-label="Enviar mensaje">
                        @if (sending()) {
                            <span class="chat-spinner"></span>
                        } @else {
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                                 fill="none" stroke="currentColor" stroke-width="2.5"
                                 stroke-linecap="round" stroke-linejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"/>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                            </svg>
                        }
                    </button>
                </div>
            }
        </div>
    `,
    styles: [`
        .floating-chat {
            position: fixed;
            bottom: 90px;
            right: 20px;
            width: 320px;
            max-height: 420px;
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.32);
            display: flex;
            flex-direction: column;
            z-index: 9999;
            overflow: hidden;
            transform: scale(0.92) translateY(12px);
            opacity: 0;
            pointer-events: none;
            transition: transform 0.22s cubic-bezier(.4,0,.2,1),
                        opacity 0.22s cubic-bezier(.4,0,.2,1);
        }

        .floating-chat.open {
            transform: scale(1) translateY(0);
            opacity: 1;
            pointer-events: auto;
        }

        /* Header */
        .chat-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 14px;
            background: var(--color-primary);
            color: #fff;
            flex-shrink: 0;
        }

        .chat-header-info {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .chat-avatar {
            font-size: 1.4rem;
            line-height: 1;
        }

        .chat-title {
            display: block;
            font-weight: 600;
            font-size: 0.875rem;
            line-height: 1.2;
        }

        .chat-status {
            display: block;
            font-size: 0.72rem;
            opacity: 0.82;
        }

        .chat-close-btn {
            background: none;
            border: none;
            color: #fff;
            cursor: pointer;
            font-size: 1.1rem;
            padding: 4px 6px;
            border-radius: 6px;
            line-height: 1;
            opacity: 0.85;
            transition: opacity 0.15s;
        }

        .chat-close-btn:hover {
            opacity: 1;
            background: rgba(255,255,255,0.15);
        }

        /* Área de mensajes */
        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            min-height: 180px;
            max-height: 260px;
        }

        /* Mensaje vacío / no autenticado */
        .chat-guest-msg,
        .chat-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            gap: 8px;
            color: var(--color-text-muted, #888);
            text-align: center;
            font-size: 0.85rem;
            padding: 24px 12px;
        }

        .chat-guest-icon,
        .chat-empty-icon {
            font-size: 2rem;
        }

        /* Burbujas */
        .chat-msg {
            display: flex;
        }

        .chat-msg.from-client {
            justify-content: flex-end;
        }

        .chat-msg.from-support {
            justify-content: flex-start;
        }

        .chat-bubble {
            max-width: 82%;
            padding: 8px 12px;
            border-radius: 14px;
            font-size: 0.82rem;
            line-height: 1.4;
            display: flex;
            flex-direction: column;
            gap: 3px;
        }

        .from-client .chat-bubble {
            background: var(--color-primary);
            color: #fff;
            border-bottom-right-radius: 4px;
        }

        .from-support .chat-bubble {
            background: var(--color-surface-raised);
            color: var(--color-text-on, #e8e8e8);
            border: 1px solid var(--color-border);
            border-bottom-left-radius: 4px;
        }

        .chat-bubble-text {
            word-break: break-word;
        }

        .chat-bubble-time {
            font-size: 0.67rem;
            opacity: 0.62;
            align-self: flex-end;
        }

        /* Input */
        .chat-input-area {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 12px;
            border-top: 1px solid var(--color-border);
            flex-shrink: 0;
            background: var(--color-surface);
        }

        .chat-input {
            flex: 1;
            background: var(--color-surface-raised);
            border: 1px solid var(--color-border);
            border-radius: 20px;
            padding: 8px 14px;
            font-size: 0.82rem;
            color: var(--color-text-on, #e8e8e8);
            outline: none;
            transition: border-color 0.15s;
        }

        .chat-input:focus {
            border-color: var(--color-primary);
        }

        .chat-input:disabled {
            opacity: 0.6;
        }

        .chat-send-btn {
            background: var(--color-primary);
            border: none;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            cursor: pointer;
            flex-shrink: 0;
            transition: background 0.15s, transform 0.12s;
        }

        .chat-send-btn:hover:not(:disabled) {
            background: color-mix(in oklch, var(--color-primary) 85%, black);
            transform: scale(1.06);
        }

        .chat-send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .chat-spinner {
            width: 14px;
            height: 14px;
            border: 2px solid rgba(255,255,255,0.4);
            border-top-color: #fff;
            border-radius: 50%;
            animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `]
})
export class FloatingChatComponent implements AfterViewChecked, OnDestroy {
    readonly chatService = inject(ChatService);
    readonly authService = inject(AuthService);

    @ViewChild('scrollContainer') private scrollContainer!: ElementRef<HTMLDivElement>;

    newMessage = '';
    sending = signal(false);

    private prevMessageCount = 0;

    ngAfterViewChecked(): void {
        const msgs = this.chatService.messages();
        if (msgs.length !== this.prevMessageCount) {
            this.prevMessageCount = msgs.length;
            this.scrollToBottom();
        }
    }

    ngOnDestroy(): void {
        this.chatService.close();
    }

    send(): void {
        const text = this.newMessage.trim();
        if (!text || this.sending()) return;

        this.sending.set(true);
        this.newMessage = '';

        this.chatService.sendMessage(text).subscribe({
            next: () => this.sending.set(false),
            error: () => {
                this.sending.set(false);
                this.newMessage = text; // restaurar texto si falla
            }
        });
    }

    formatTime(timestamp: string): string {
        try {
            const d = new Date(timestamp);
            return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return '';
        }
    }

    private scrollToBottom(): void {
        try {
            if (this.scrollContainer?.nativeElement) {
                const el = this.scrollContainer.nativeElement;
                el.scrollTop = el.scrollHeight;
            }
        } catch {
            // no-op
        }
    }
}
