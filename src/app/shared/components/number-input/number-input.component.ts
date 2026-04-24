import { Component, input, model, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-number-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, LucideAngularModule],
  template: `
    <div class="input-number-wrapper">
      <button type="button" class="input-number-btn"
              [disabled]="value() <= min()"
              (click)="decrement()"
              aria-label="Disminuir">
        <lucide-icon name="minus" [size]="14" />
      </button>
      <input type="number" class="input-number-field"
             [ngModel]="value()"
             (ngModelChange)="value.set($event)"
             [min]="min()" [max]="max()" [step]="step()" />
      <button type="button" class="input-number-btn"
              [disabled]="value() >= max()"
              (click)="increment()"
              aria-label="Aumentar">
        <lucide-icon name="plus" [size]="14" />
      </button>
    </div>
  `
})
export class NumberInputComponent {
  value = model(0);
  min = input(0);
  max = input(Infinity);
  step = input(1);

  increment() { this.value.update(v => Math.min(v + this.step(), this.max())); }
  decrement() { this.value.update(v => Math.max(v - this.step(), this.min())); }
}
