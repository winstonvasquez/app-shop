import { Component, input, signal, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-card-collapsible',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [],
    template: `
        <div class="card-collapsible">
            <button
                class="card-collapsible-trigger"
                [attr.aria-expanded]="isOpen()"
                [attr.aria-controls]="contentId"
                (click)="toggle()">
                <span>{{ title() }}</span>
                <svg class="chevron w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </button>
            @if (isOpen()) {
                <div class="card-collapsible-body" [id]="contentId">
                    <ng-content />
                </div>
            }
        </div>
    `
})
export class CardCollapsibleComponent {
    title = input.required<string>();
    initialOpen = input(false);

    isOpen = signal(this.initialOpen());
    contentId = `collapsible-${Math.random().toString(36).slice(2)}`;

    toggle() { this.isOpen.update(v => !v); }
}
