import { ChangeDetectionStrategy, Component, HostListener, inject } from '@angular/core';
import { ConfirmModalService } from '@shared/services/confirm-modal.service';

/**
 * Anfitrión del ConfirmModalService (montado una vez en App). Sin él, `confirm()` del servicio
 * nunca se resolvía. Reemplaza al `confirm()` nativo, que bloquea la suite E2E.
 */
@Component({
    selector: 'app-confirm-modal-host',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (svc.isOpen()) {
          <div class="modal-overlay" role="alertdialog" aria-modal="true" aria-labelledby="confirm-modal-title"
               (click)="$event.target === $event.currentTarget && svc.cancel()">
            <div class="modal-content modal-sm" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h2 class="modal-title" id="confirm-modal-title">{{ svc.options().title }}</h2>
              </div>
              <div class="modal-body"><p>{{ svc.options().message }}</p></div>
              <div class="modal-footer" style="display:flex;gap:8px;justify-content:flex-end;">
                <button type="button" class="btn-secondary" (click)="svc.cancel()">{{ svc.options().cancelLabel ?? 'Cancelar' }}</button>
                <button type="button" [class]="svc.options().variant === 'danger' ? 'btn-danger' : 'btn-primary'" (click)="svc.accept()">
                  {{ svc.options().confirmLabel ?? 'Confirmar' }}
                </button>
              </div>
            </div>
          </div>
        }
    `
})
export class ConfirmModalHostComponent {
    readonly svc = inject(ConfirmModalService);

    @HostListener('document:keydown.escape')
    onEscape() { if (this.svc.isOpen()) this.svc.cancel(); }
}
