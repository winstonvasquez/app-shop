import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '@core/services/chat/chat.service';

interface MenuItem {
    label: string;
    icon: string;
    badge: (() => string | null) | null;
    action: () => void;
}

@Component({
    selector: 'app-floating-menu',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './floating-menu.component.html'
})
export class FloatingMenuComponent {
    readonly chatService = inject(ChatService);

    isOpen = signal(true);

    menuItems: MenuItem[] = [
        {
            label: 'Mensajes',
            icon: '💬',
            badge: () => {
                const count = this.chatService.unreadCount();
                return count > 0 ? String(count) : null;
            },
            action: () => this.chatService.open()
        },
        {
            label: 'Ir arriba',
            icon: '⬆️',
            badge: null,
            action: () => this.scrollToTop()
        }
    ];

    toggleMenu(): void {
        this.isOpen.update(val => !val);
    }

    scrollToTop(): void {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        this.isOpen.set(false);
    }

    getBadge(item: MenuItem): string | null {
        return typeof item.badge === 'function' ? item.badge() : item.badge;
    }
}
