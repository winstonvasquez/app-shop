import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-loading-spinner',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './loading-spinner.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingSpinnerComponent {
    size = input<'sm' | 'md' | 'lg'>('md');
    text = input<string>('');
    overlay = input<boolean>(false);
    color = input<string>('primary');
}
