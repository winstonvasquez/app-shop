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
        <div class="di-wrapper"
             [class.di-disabled]="isDisabled()"
             [class.di-filled]="!!value()">
            <!-- Calendar icon -->
            <svg class="di-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true">
                <rect x="3" y="4.5" width="14" height="13" rx="2" stroke-width="1.6"/>
                <line x1="3" y1="8.5" x2="17" y2="8.5" stroke-width="1.6" stroke-linecap="round"/>
                <line x1="7" y1="2.5" x2="7" y2="5.5" stroke-width="1.6" stroke-linecap="round"/>
                <line x1="13" y1="2.5" x2="13" y2="5.5" stroke-width="1.6" stroke-linecap="round"/>
                <circle cx="7" cy="12" r="0.9" fill="currentColor" stroke="none"/>
                <circle cx="10" cy="12" r="0.9" fill="currentColor" stroke="none"/>
                <circle cx="13" cy="12" r="0.9" fill="currentColor" stroke="none"/>
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

            @if (value() && !isDisabled() && clearable()) {
                <button type="button"
                        class="di-clear"
                        aria-label="Limpiar fecha"
                        tabindex="-1"
                        (click)="clear()">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true">
                        <line x1="6" y1="6" x2="14" y2="14" stroke-width="1.8" stroke-linecap="round"/>
                        <line x1="14" y1="6" x2="6" y2="14" stroke-width="1.8" stroke-linecap="round"/>
                    </svg>
                </button>
            }
        </div>
    `,
    styles: [`
:host { display: block; }

/* ── Label ───────────────────────────────────────── */
.di-label {
    display: block;
    font-size: 0.8125rem;
    font-weight: 500;
    margin-bottom: 6px;
    color: var(--color-text-secondary);
    letter-spacing: 0.01em;
}
.di-required {
    color: var(--color-error);
    margin-left: 2px;
    font-weight: 600;
}

/* ── Wrapper ─────────────────────────────────────── */
.di-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    border: 1px solid var(--color-input-border, oklch(0.85 0 0));
    border-radius: 10px;
    /* Fondo SIEMPRE claro en todos los temas */
    background: var(--color-input-bg, #ffffff);
    transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
}

.di-wrapper:hover:not(.di-disabled) {
    border-color: var(--color-input-border-hover, color-mix(in oklch, var(--color-primary) 40%, oklch(0.85 0 0)));
    background: var(--color-input-bg-hover, oklch(0.985 0 0));
}

.di-wrapper:focus-within {
    border-color: var(--color-primary);
    background: var(--color-input-bg, #ffffff);
    box-shadow: 0 0 0 3px color-mix(in oklch, var(--color-primary) 18%, transparent);
}

.di-wrapper.di-disabled {
    opacity: 0.75;
    cursor: not-allowed;
    background: oklch(0.94 0 0);
    border-color: oklch(0.88 0 0);
}

/* ── Calendar icon ───────────────────────────────── */
.di-icon {
    position: absolute;
    left: 12px;
    width: 18px;
    height: 18px;
    color: oklch(0.5 0 0);
    pointer-events: none;
    z-index: 1;
    transition: color 0.15s ease;
}

.di-wrapper:focus-within .di-icon,
.di-wrapper.di-filled:not(.di-disabled) .di-icon {
    color: var(--color-primary);
}

/* ── Input ───────────────────────────────────────── */
.di-input {
    width: 100%;
    height: 40px;
    padding: 0 40px 0 40px;
    border: none;
    border-radius: inherit;
    background: transparent;
    color: var(--color-input-text, oklch(0.18 0 0));
    font-size: 0.875rem;
    font-family: inherit;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
    outline: none;
    /* Siempre esquema claro — el fondo es claro en todos los temas */
    color-scheme: light;
}

/* Picker indicator cubre todo el input */
.di-input::-webkit-calendar-picker-indicator {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
    background: transparent;
}

/* firefox / others */
.di-input::-moz-focus-inner { border: 0; }

/* Resalta el campo enfocado */
.di-input::-webkit-datetime-edit-day-field:focus,
.di-input::-webkit-datetime-edit-month-field:focus,
.di-input::-webkit-datetime-edit-year-field:focus {
    background: color-mix(in oklch, var(--color-primary) 18%, transparent);
    color: var(--color-text-primary);
    border-radius: 3px;
    outline: none;
}

/* ── Clear button ────────────────────────────────── */
.di-clear {
    position: absolute;
    right: 8px;
    width: 26px;
    height: 26px;
    display: grid;
    place-items: center;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 50%;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: background .15s, color .15s;
    z-index: 2;
}
.di-clear svg {
    width: 14px;
    height: 14px;
}
.di-clear:hover {
    background: color-mix(in oklch, var(--color-error) 15%, transparent);
    color: var(--color-error);
}

/* ── Disabled state ──────────────────────────────── */
.di-disabled .di-input {
    cursor: not-allowed;
}
    `]
})
export class DateInputComponent implements ControlValueAccessor {
    label     = input<string>('');
    required  = input<boolean>(false);
    minDate   = input<string>('');
    maxDate   = input<string>('');
    clearable = input<boolean>(true);

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

    clear(): void {
        this.value.set('');
        this.onChange('');
        this.onTouched();
    }
}
