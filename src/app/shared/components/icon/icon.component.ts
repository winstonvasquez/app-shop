import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
    selector: 'app-icon',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [LucideAngularModule],
    template: `
        <lucide-icon
            [name]="name()"
            [size]="size()"
            [strokeWidth]="strokeWidth()"
            [absoluteStrokeWidth]="absoluteStrokeWidth()"
            [class]="class()"
        />
    `,
})
export class IconComponent {
    name = input.required<string>();
    size = input(16);
    strokeWidth = input(2);
    absoluteStrokeWidth = input(false);
    class = input('');
}
