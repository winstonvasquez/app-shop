import { Component, input, output, HostListener, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

@Component({
    selector: 'app-modal',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, LucideAngularModule],
    template: `
        @if (isOpen()) {
          <div class="modal-overlay" [class]="'modal-' + size()" (click)="onOverlayClick($event)" role="dialog" aria-modal="true" [attr.aria-labelledby]="titleId">
            <div class="modal-content" (click)="$event.stopPropagation()">
              @if (title()) {
                <div class="modal-header">
                  <h2 class="modal-title" [id]="titleId">{{ title() }}</h2>
                  @if (closable()) {
                    <button class="modal-close-btn" (click)="close()" aria-label="Cerrar">
                      <lucide-icon name="x" [size]="18" />
                    </button>
                  }
                </div>
              }
              <div class="modal-body">
                <ng-content />
              </div>
              @if (hasFooter()) {
                <div class="modal-footer">
                  <ng-content select="[slot=footer]" />
                </div>
              }
            </div>
          </div>
        }
    `
})
export class ModalComponent implements OnInit {
    isOpen = input(false);
    title = input('');
    size = input<ModalSize>('md');
    closable = input(true);
    hasFooter = input(false);

    closed = output<void>();

    titleId = `modal-title-${Math.random().toString(36).slice(2)}`;

    ngOnInit() {}

    close() {
        if (this.closable()) this.closed.emit();
    }

    onOverlayClick(e: MouseEvent) {
        if (e.target === e.currentTarget) this.close();
    }

    @HostListener('document:keydown.escape')
    onEscape() { this.close(); }
}
