import {
    Component, DoCheck, Input, forwardRef, signal, ChangeDetectionStrategy
} from '@angular/core';
import {
    ControlValueAccessor, NG_VALUE_ACCESSOR, AbstractControl
} from '@angular/forms';

@Component({
    selector: 'app-date-picker',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [{
        provide: NG_VALUE_ACCESSOR,
        useExisting: forwardRef(() => DatePickerComponent),
        multi: true
    }],
    template: `
        <div class="date-picker-root">
            @if (label) {
                <label [for]="inputId" class="input-label">
                    {{ label }}
                    @if (required) { <span style="color:var(--color-error)">*</span> }
                </label>
            }
            <input
                [id]="inputId"
                type="date"
                class="input-field"
                [class.input-error]="showError()"
                [value]="value()"
                [min]="min"
                [max]="max"
                [disabled]="isDisabled()"
                (change)="onDateChange($event)"
                (blur)="onBlur()"
            />
            @if (showError() && control) {
                <span class="input-error-message">
                    @if (control.hasError('required')) { Campo requerido }
                    @else { Fecha inválida }
                </span>
            }
            @if (hint && !showError()) {
                <span class="input-hint">{{ hint }}</span>
            }
        </div>
    `,
    styles: [`
        .date-picker-root { display: flex; flex-direction: column; gap: 4px; }
        input[type="date"] { color-scheme: dark; width: 100%; }
        .input-error { border-color: var(--color-error) !important; }
    `]
})
export class DatePickerComponent implements ControlValueAccessor, DoCheck {
    private static idCounter = 0;

    @Input() label = '';
    @Input() required = false;
    @Input() hint = '';
    @Input() min = '';
    @Input() max = '';
    @Input() control: AbstractControl | null = null;

    protected readonly inputId = `date-picker-${++DatePickerComponent.idCounter}`;

    value = signal('');
    isDisabled = signal(false);
    showError = signal(false);

    private changeCallback: (val: string) => void = () => {};
    private touchedCallback: () => void = () => {};

    writeValue(val: string): void { this.value.set(val ?? ''); }
    registerOnChange(fn: (v: string) => void): void { this.changeCallback = fn; }
    registerOnTouched(fn: () => void): void { this.touchedCallback = fn; }
    setDisabledState(isDisabled: boolean): void { this.isDisabled.set(isDisabled); }

    ngDoCheck(): void {
        const next = !!(this.control?.invalid && this.control?.touched);
        if (next !== this.showError()) { this.showError.set(next); }
    }

    onDateChange(event: Event): void {
        const val = (event.target as HTMLInputElement).value;
        this.value.set(val);
        this.changeCallback(val);
    }

    onBlur(): void {
        this.touchedCallback();
    }
}
