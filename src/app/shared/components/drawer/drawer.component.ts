import { Component, input, output, HostListener, ChangeDetectionStrategy, effect, signal, DestroyRef, inject } from '@angular/core';
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
          <div class="drawer-overlay open"
               [style.z-index]="zIndex()"
               [class.drawer-oculto]="isInert()"
               (click)="close()"></div>

          <!-- Panel -->
          <aside class="drawer"
                 [class]="'drawer-' + side() + ' drawer-' + size()"
                 [class.drawer-oculto]="isInert()"
                 [style.z-index]="zIndex() + 1"
                 [attr.inert]="isInert() ? '' : null"
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

      /*
       * Drawer tapado por otro encima: se oculta del todo en lugar de asomar detrás.
       * Con dos abiertos (p. ej. «Nuevo ítem de catálogo» → «Homologar proveedor») se
       * veían los dos paneles superpuestos y el título del de atrás quedaba cortado.
       * Se usa visibility y NO @if / display:none: el nodo sigue en el DOM, así que
       * el formulario a medio llenar conserva su estado y reaparece intacto al cerrar
       * el de encima.
       */
      .drawer-oculto { visibility: hidden; }

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

    /**
     * Pila global de drawers abiertos (contrato 2026-08-01): cuando se anida un
     * `<app-drawer>` dentro de otro (p.ej. "Homologar Proveedor" abierto desde
     * "Nuevo Ítem de Catálogo"), el de atrás debe quedar apilado visualmente
     * (z-index) e INERTE (atributo `inert`: sin foco, sin clics, sin lectores
     * de pantalla) para no interceptar eventos del que está encima. Se prefiere
     * apilar-e-inertizar sobre cerrar el anterior porque el usuario suele estar
     * a mitad de un alta y perder el formulario de atrás sería peor.
     */
    private static readonly openStack: DrawerComponent[] = [];
    // 50/51 es la capa que el CSS global ya daba a `.drawer-overlay`/`.drawer`
    // (_admin-utilities.scss). Con 1000 el overlay del drawer tapaba por completo
    // los modales (`.modal-overlay`, z-50) abiertos DESDE un drawer: el modal era
    // invisible y el clic cerraba el drawer. El paso de 2 mantiene el apilado
    // (anidado: 52/53) sin cruzar la capa de modales, que ahora va por encima.
    private static readonly BASE_Z_INDEX = 50;
    private static readonly Z_INDEX_STEP = 2;

    private readonly destroyRef = inject(DestroyRef);

    /** z-index propio de este drawer dentro de la pila (overlay = zIndex, panel = zIndex+1). */
    readonly zIndex = signal(DrawerComponent.BASE_Z_INDEX);
    /** true si hay al menos un drawer abierto por encima de este en la pila. */
    readonly isInert = signal(false);

    constructor() {
        effect(() => {
            if (this.isOpen()) {
                this.pushToStack();
            } else {
                this.removeFromStack();
            }
        });
        this.destroyRef.onDestroy(() => this.removeFromStack());
    }

    private pushToStack(): void {
        if (!DrawerComponent.openStack.includes(this)) {
            DrawerComponent.openStack.push(this);
        }
        DrawerComponent.recomputeStack();
    }

    private removeFromStack(): void {
        const idx = DrawerComponent.openStack.indexOf(this);
        if (idx !== -1) {
            DrawerComponent.openStack.splice(idx, 1);
            DrawerComponent.recomputeStack();
        }
    }

    private static recomputeStack(): void {
        DrawerComponent.openStack.forEach((drawer, i) => {
            drawer.zIndex.set(DrawerComponent.BASE_Z_INDEX + i * DrawerComponent.Z_INDEX_STEP);
            drawer.isInert.set(i !== DrawerComponent.openStack.length - 1);
        });
    }

    close() {
        // Un drawer inerte (tapado por otro encima) no debe cerrarse por click/Esc.
        if (this.isInert()) return;
        if (this.closable()) this.closed.emit();
    }

    @HostListener('document:keydown.escape')
    onEscape() { this.close(); }
}
