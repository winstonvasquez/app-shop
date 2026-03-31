import {
    Component, input, forwardRef, ChangeDetectionStrategy, signal
} from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

@Component({
    selector: 'app-date-input',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => DateInputComponent),
            multi: true,
        }
    ],
    template: `
        @if (label()) {
            <label [for]="inputId" class="di-label">
                {{ label() }}
                @if (required()) {
                    <span class="di-required">*</span>
                }
            </label>
        }
        <div class="di-wrapper" [class.di-disabled]="isDisabled()">
            <!-- Calendar icon -->
            <svg class="di-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true">
                <rect x="3" y="4" width="14" height="14" rx="2" stroke-width="1.5"/>
                <path d="M3 8h14" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M7 2v3M13 2v3" stroke-width="1.5" stroke-linecap="round"/>
                <circle cx="7.5" cy="12" r="1" fill="currentColor" stroke="none"/>
                <circle cx="10" cy="12" r="1" fill="currentColor" stroke="none"/>
                <circle cx="12.5" cy="12" r="1" fill="currentColor" stroke="none"/>
            </svg>

            <input
                [id]="inputId"
                type="date"
                class="di-input"
                [min]="minDate()"
                [max]="maxDate()"
                [disabled]="isDisabled()"
                [value]="value()"
                (change)="onInputChange($event)"
                (blur)="onTouched()"
            />
        </div>
    `,
    styles: [`
:host { display: block; }

/* ── Label ───────────────────────────────────────── */
.di-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 6px;
    color: var(--color-text-secondary);
}
.di-required {
    color: var(--color-error);
    margin-left: 2px;
}

/* ── Wrapper ─────────────────────────────────────── */
.di-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}

/* ── Calendar icon ───────────────────────────────── */
.di-icon {
    position: absolute;
    left: 11px;
    width: 16px;
    height: 16px;
    color: var(--color-text-muted);
    pointer-events: none;
    z-index: 1;
    flex-shrink: 0;
    transition: color 0.15s;
}

/* ── Input ───────────────────────────────────────── */
.di-input {
    width: 100%;
    height: 40px;
    padding: 0 12px 0 36px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-surface-raised);
    color: var(--color-text-primary);
    font-size: 0.875rem;
    font-family: inherit;
    /* make native calendar chrome match theme */
    color-scheme: dark;
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
    appearance: none;
    -webkit-appearance: none;
}

/* let the browser keep its own date picker button but reset appearance */
.di-input::-webkit-calendar-picker-indicator {
    opacity: 0.5;
    cursor: pointer;
    filter: invert(1);
    padding: 2px 6px 2px 0;
}
.di-input::-webkit-calendar-picker-indicator:hover {
    opacity: 1;
}

/* firefox / others */
.di-input::-moz-focus-inner { border: 0; }

.di-input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px color-mix(in oklch, var(--color-primary) 18%, transparent);
}

.di-input:focus ~ .di-icon,
.di-wrapper:focus-within .di-icon {
    color: var(--color-primary);
}

/* Light theme override */
[data-theme="light"] .di-input {
    color-scheme: light;
}
[data-theme="light"] .di-input::-webkit-calendar-picker-indicator {
    filter: none;
}

/* ── Disabled state ──────────────────────────────── */
.di-disabled .di-input {
    opacity: 0.45;
    cursor: not-allowed;
}
.di-disabled .di-icon {
    opacity: 0.35;
}

/* ── Placeholder date text (unfilled) ────────────── */
.di-input:not([value=""]):not(:placeholder-shown) {
    color: var(--color-text-primary);
}
    `]
})
export class DateInputComponent implements ControlValueAccessor {
    label    = input<string>('');
    required = input<boolean>(false);
    minDate  = input<string>('');
    maxDate  = input<string>('');

    readonly inputId = `date-input-${Math.random().toString(36).slice(2, 8)}`;

    value      = signal<string>('');
    isDisabled = signal<boolean>(false);

    private onChange: (v: string) => void = () => {};
    onTouched: () => void = () => {};

    writeValue(val: string): void {
        this.value.set(val ?? '');
    }

    registerOnChange(fn: (v: string) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(disabled: boolean): void {
        this.isDisabled.set(disabled);
    }

    onInputChange(event: Event): void {
        const val = (event.target as HTMLInputElement).value;
        this.value.set(val);
        this.onChange(val);
    }
}
