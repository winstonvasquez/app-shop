import { Component, input, output, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

export type DrawerSide = 'left' | 'right';
export type DrawerSize = 'sm' | 'md' | 'lg' | 'full';

@Component({
    selector: 'app-drawer',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, LucideAngularModule],
    template: `
        @if (isOpen()) {
          <!-- Overlay -->
          <div class="drawer-overlay" (click)="close()"></div>

          <!-- Panel -->
          <aside class="drawer"
                 [class]="'drawer-' + side() + ' drawer-' + size()"
                 role="complementary"
                 [attr.aria-label]="title()">
            <div class="drawer-header">
              <h3 class="drawer-title">{{ title() }}</h3>
              @if (closable()) {
                <button class="drawer-close" (click)="close()" aria-label="Cerrar panel">
                  <lucide-icon name="x" [size]="18" />
                </button>
              }
            </div>

            <div class="drawer-body">
              <ng-content />
            </div>

            @if (hasFooter()) {
              <div class="drawer-footer">
                <ng-content select="[slot=footer]" />
              </div>
            }
          </aside>
        }
    `
})
export class DrawerComponent {
    isOpen = input(false);
    title = input('');
    side = input<DrawerSide>('right');
    size = input<DrawerSize>('md');
    closable = input(true);
    hasFooter = input(false);

    closed = output<void>();

    close() {
        if (this.closable()) this.closed.emit();
    }

    @HostListener('document:keydown.escape')
    onEscape() { this.close(); }
}
