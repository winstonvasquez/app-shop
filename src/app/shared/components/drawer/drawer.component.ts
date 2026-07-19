import { Component, input, output, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

export type DrawerSide = 'left' | 'right';
export type DrawerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

@Component({
    selector: 'app-drawer',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [LucideAngularModule],
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
    `,
    styles: [`
      /* ===== Estándar global de drawers — heredado por TODOS los <app-drawer> ===== */
      .drawer { overflow: hidden; }

      /* Header con color de marca + tipografía mejorada */
      .drawer-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 18px 24px;
        border-bottom: none;
        border-radius: 16px 0 0 0;
        background: var(--color-primary, #0B3D91);
        background: linear-gradient(135deg,
          var(--color-primary, #0B3D91),
          color-mix(in srgb, var(--color-primary, #0B3D91) 80%, #000));
        flex-shrink: 0;
      }
      .drawer-title {
        margin: 0;
        color: #fff;
        font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
        font-size: 1.05rem;
        font-weight: 600;
        letter-spacing: -0.01em;
        line-height: 1.3;
      }
      .drawer-close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        padding: 0;
        border: none;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.16);
        color: #fff;
        cursor: pointer;
        transition: background 0.15s ease;
        flex-shrink: 0;
      }
      .drawer-close:hover { background: rgba(255, 255, 255, 0.30); }

      /* Cuerpo con scroll y padding cómodo */
      .drawer-body {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding: 24px;
        background: var(--color-surface, #fff);
      }

      /* Footer: botones con espaciado consistente, alineados a la derecha */
      .drawer-footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        padding: 16px 24px;
        border-top: 1px solid var(--color-border, #e5e7eb);
        background: var(--color-surface, #fff);
        flex-shrink: 0;
      }

      /* Botones del drawer: ~70% menos ovalados (12px → 6px) */
      .drawer ::ng-deep app-button .btn { border-radius: 6px; }
      /* Espaciado entre botones del footer (funciona con o sin wrapper <div slot=footer>) */
      .drawer-footer ::ng-deep app-button + app-button { margin-inline-start: 20px; }

      /* ===== Formularios proyectados dentro del drawer (::ng-deep, scoped al body) ===== */
      .drawer-body ::ng-deep fieldset,
      .drawer-body ::ng-deep .gre-section {
        border: 1px solid var(--color-border, #e5e7eb);
        border-radius: 12px;
        padding: 16px 18px 18px;
        margin: 0 0 18px;
      }
      .drawer-body ::ng-deep legend,
      .drawer-body ::ng-deep .gre-legend {
        padding: 0 8px;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--color-primary, #0B3D91);
      }
      .drawer-body ::ng-deep label,
      .drawer-body ::ng-deep .input-label {
        display: block;
        margin-bottom: 6px;
        font-size: 0.8rem;
        font-weight: 500;
        color: var(--color-text-muted, #64748b);
      }
      .drawer-body ::ng-deep .form-input,
      .drawer-body ::ng-deep select,
      .drawer-body ::ng-deep textarea {
        border-radius: 8px;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }
      .drawer-body ::ng-deep .form-input:focus,
      .drawer-body ::ng-deep select:focus,
      .drawer-body ::ng-deep textarea:focus {
        outline: none;
        border-color: var(--color-primary, #0B3D91);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary, #0B3D91) 18%, transparent);
      }
    `]
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
