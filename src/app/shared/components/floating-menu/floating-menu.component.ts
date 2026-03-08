import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface MenuItem {
  label: string;
  icon: string;
  badge: string | null;
  action: () => void;
}

@Component({
  selector: 'app-floating-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './floating-menu.component.html'
})
export class FloatingMenuComponent {
  isOpen = signal(true);

  menuItems: MenuItem[] = [
    { label: 'Mensajes', icon: '💬', badge: '22', action: () => { } },
    { label: 'Comentarios', icon: '📝', badge: null, action: () => { } },
    { label: 'Ir arriba', icon: '⬆️', badge: null, action: () => this.scrollToTop() }
  ];

  toggleMenu() {
    this.isOpen.update(val => !val);
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.isOpen.set(false);
  }
}
