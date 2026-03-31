import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-form-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col gap-1">
      @if (label()) {
        <label [for]="fieldId()" class="input-label">
          {{ label() }}
          @if (required()) { <span class="text-error ml-0.5">*</span> }
        </label>
      }
      <ng-content />
      @if (error()) {
        <span class="input-error-message" role="alert">{{ error() }}</span>
      } @else if (hint()) {
        <span class="input-hint">{{ hint() }}</span>
      }
    </div>
  `
})
export class FormFieldComponent {
  label = input('');
  fieldId = input('');
  error = input('');
  hint = input('');
  required = input(false);
}
