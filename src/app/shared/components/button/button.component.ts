import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

@Component({
    selector: 'app-button',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, LucideAngularModule],
    template: `
        <button
            [type]="type()"
            [disabled]="disabled() || loading()"
            [class]="buttonClasses()"
            [attr.aria-label]="ariaLabel() || undefined"
            [attr.title]="iconOnly() ? label() : undefined">

            @if (loading()) {
                <span class="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
            } @else if (icon()) {
                <lucide-icon [name]="icon()!" [size]="iconSize()" [strokeWidth]="1.5" />
            }

            @if (!iconOnly()) {
                <span>{{ label() }}</span>
            }
        </button>
    `,
})
export class ButtonComponent {
    label = input.required<string>();
    variant = input<ButtonVariant>('primary');
    size = input<ButtonSize>('md');
    icon = input<string | undefined>(undefined);
    iconOnly = input(false);
    type = input<'button' | 'submit' | 'reset'>('button');
    disabled = input(false);
    loading = input(false);
    ariaLabel = input('');

    protected iconSize(): number {
        const sizes: Record<ButtonSize, number> = { xs: 12, sm: 14, md: 16, lg: 18 };
        return sizes[this.size()];
    }

    protected buttonClasses(): string {
        const base = 'btn';
        const variant = `btn-${this.variant()}`;
        const size = this.size() !== 'md' ? `btn-${this.size()}` : '';
        const loadingClass = this.loading() ? 'btn-loading' : '';
        const iconOnlyClass = this.iconOnly() ? 'btn-icon' : '';
        return [base, variant, size, loadingClass, iconOnlyClass].filter(Boolean).join(' ');
    }
}
