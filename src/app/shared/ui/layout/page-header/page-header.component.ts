import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Breadcrumb {
    label: string;
    url?: string;
}

@Component({
    selector: 'app-page-header',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './page-header.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageHeaderComponent {
    title = input.required<string>();
    subtitle = input<string>('');
    breadcrumbs = input<Breadcrumb[]>([]);
    showBackButton = input<boolean>(false);
}
