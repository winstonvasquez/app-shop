import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface BreadcrumbItem {
    label: string;
    route?: string[];
    queryParams?: Record<string, string>;
}

@Component({
    selector: 'app-breadcrumb',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink],
    template: `
        <nav aria-label="breadcrumb" class="py-2 px-0">
            <ol class="flex flex-wrap items-center gap-1 text-sm text-muted">
                @for (item of items(); track item.label; let last = $last) {
                    <li class="flex items-center gap-1">
                        @if (!last && item.route) {
                            <a [routerLink]="item.route" [queryParams]="item.queryParams"
                               class="hover:text-primary transition-colors">
                                {{ item.label }}
                            </a>
                        } @else {
                            <span [attr.aria-current]="last ? 'page' : null"
                                  [class.text-on-light]="last" [class.font-medium]="last">
                                {{ item.label }}
                            </span>
                        }
                        @if (!last) {
                            <span class="text-muted" aria-hidden="true">›</span>
                        }
                    </li>
                }
            </ol>
        </nav>
    `
})
export class BreadcrumbComponent {
    items = input.required<BreadcrumbItem[]>();
}
