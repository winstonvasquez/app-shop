import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService, Toast, ToastType } from '../../services/toast.service';

@Component({
    selector: 'app-toast-container',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, LucideAngularModule],
    template: `
        <div class="toast-container toast-top-right">
            @for (toast of toastService.toasts(); track toast.id) {
                <div class="toast" [class]="'toast-' + toast.type" role="alert" aria-live="polite">
                    <lucide-icon class="toast-icon" [name]="iconFor(toast.type)" [size]="18" />
                    <div class="toast-content">
                        <p class="toast-title">{{ toast.title }}</p>
                        @if (toast.message) {
                            <p class="toast-message">{{ toast.message }}</p>
                        }
                    </div>
                    <button class="toast-close" (click)="toastService.dismiss(toast.id)" aria-label="Cerrar">
                        <lucide-icon name="x" [size]="14" />
                    </button>
                    @if (toast.duration > 0) {
                        <div class="toast-progress" [style.animation-duration]="toast.duration + 'ms'"></div>
                    }
                </div>
            }
        </div>
    `
})
export class ToastContainerComponent {
    toastService = inject(ToastService);

    iconFor(type: ToastType): string {
        const icons: Record<ToastType, string> = {
            success: 'circle-check',
            error: 'circle-alert',
            warning: 'triangle-alert',
            info: 'info',
        };
        return icons[type];
    }
}
