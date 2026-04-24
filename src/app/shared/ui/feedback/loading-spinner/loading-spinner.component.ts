import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-loading-spinner',
    standalone: true,
    imports: [],
    templateUrl: './loading-spinner.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingSpinnerComponent {
    size = input<'sm' | 'md' | 'lg'>('md');
    text = input<string>('');
    overlay = input<boolean>(false);
    color = input<string>('primary');
}
