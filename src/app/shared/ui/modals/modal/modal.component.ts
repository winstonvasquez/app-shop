import { Component, input, output, ChangeDetectionStrategy, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './modal.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModalComponent {
    isOpen = input.required<boolean>();
    title = input<string>('');
    size = input<'sm' | 'md' | 'lg' | 'xl' | 'full'>('md');
    closeOnBackdrop = input<boolean>(true);
    showCloseButton = input<boolean>(true);
    
    close = output<void>();
    
    constructor() {
        effect(() => {
            if (this.isOpen()) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });
    }
    
    onBackdropClick(): void {
        if (this.closeOnBackdrop()) {
            this.close.emit();
        }
    }
    
    onCloseClick(): void {
        this.close.emit();
    }
    
    onModalClick(event: Event): void {
        event.stopPropagation();
    }
}
