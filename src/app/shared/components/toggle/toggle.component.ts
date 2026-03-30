import { Component, input, model, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <label class="toggle-wrapper">
      <span class="toggle">
        <input type="checkbox" [(ngModel)]="checked" [disabled]="disabled()" />
        <span class="toggle-track"></span>
        <span class="toggle-thumb"></span>
      </span>
      @if (label()) {
        <span class="toggle-content">
          <span class="toggle-label">{{ label() }}</span>
          @if (description()) {
            <span class="toggle-description">{{ description() }}</span>
          }
        </span>
      }
    </label>
  `
})
export class ToggleComponent {
  checked = model(false);
  label = input('');
  description = input('');
  disabled = input(false);
}
