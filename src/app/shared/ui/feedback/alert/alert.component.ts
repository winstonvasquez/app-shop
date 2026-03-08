import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-alert',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './alert.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AlertComponent {
    type = input<'info' | 'success' | 'warning' | 'error'>('info');
    title = input<string>('');
    message = input.required<string>();
    dismissible = input<boolean>(false);
    icon = input<boolean>(true);
    
    dismiss = output<void>();
    
    onDismiss(): void {
        this.dismiss.emit();
    }
    
    getIcon(): string {
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };
        return icons[this.type()];
    }
}
