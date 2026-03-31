import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-toolbar',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule],
    template: `
    <div class="toolbar">
      @if (title()) {
        <h2 class="toolbar-title">{{ title() }}</h2>
      }
      <ng-content select="[slot=start]" />
      <div class="flex-1"></div>
      <div class="toolbar-actions">
        <ng-content />
      </div>
    </div>
  `
})
export class ToolbarComponent {
    title = input('');
}
