import {
    Component, DoCheck, forwardRef, input, signal, ChangeDetectionStrategy
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
        <div class="dp-root">
            @if (label()) {
                <label [for]="inputId" class="dp-label">
                    {{ label() }}
                    @if (required()) { <span class="dp-required">*</span> }
                </label>
            }
            <div class="dp-wrapper"
                 [class.dp-disabled]="isDisabled()"
                 [class.dp-error]="showError()"
                 [class.dp-filled]="!!value()">
                <!-- Calendar icon -->
                <svg class="dp-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true">
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
                    class="dp-input"
                    [value]="value()"
                    [min]="min()"
                    [max]="max()"
                    [disabled]="isDisabled()"
                    [attr.aria-invalid]="showError() || null"
                    [attr.aria-describedby]="hint() || showError() ? inputId + '-help' : null"
                    (change)="onDateChange($event)"
                    (blur)="onBlur()"
                />

                @if (value() && !isDisabled() && clearable()) {
                    <button type="button"
                            class="dp-clear"
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

            @if (showError() && control()) {
                <span class="dp-help dp-help-error" [id]="inputId + '-help'">
                    @if (control()?.hasError('required')) { Campo requerido }
                    @else if (control()?.hasError('min')) { Fecha anterior al mínimo permitido }
                    @else if (control()?.hasError('max')) { Fecha posterior al máximo permitido }
                    @else { Fecha inválida }
                </span>
            } @else if (hint()) {
                <span class="dp-help" [id]="inputId + '-help'">{{ hint() }}</span>
            }
        </div>
    `,
    styles: [`
        :host { display: block; }

        .dp-root {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        /* ── Label ───────────────────────────────── */
        .dp-label {
            font-size: 0.8125rem;
            font-weight: 500;
            color: var(--color-text-secondary);
            letter-spacing: 0.01em;
        }
        .dp-required {
            color: var(--color-error);
            margin-left: 2px;
            font-weight: 600;
        }

        /* ── Wrapper ─────────────────────────────── */
        .dp-wrapper {
            position: relative;
            display: flex;
            align-items: center;
            border: 1px solid var(--color-input-border, oklch(0.85 0 0));
            border-radius: 10px;
            /* Fondo SIEMPRE claro en todos los temas */
            background: var(--color-input-bg, #ffffff);
            transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
        }

        .dp-wrapper:hover:not(.dp-disabled) {
            border-color: var(--color-input-border-hover, color-mix(in oklch, var(--color-primary) 40%, oklch(0.85 0 0)));
            background: var(--color-input-bg-hover, oklch(0.985 0 0));
        }

        .dp-wrapper:focus-within {
            border-color: var(--color-primary);
            background: var(--color-input-bg, #ffffff);
            box-shadow: 0 0 0 3px color-mix(in oklch, var(--color-primary) 18%, transparent);
        }

        .dp-wrapper.dp-error {
            border-color: var(--color-error);
        }
        .dp-wrapper.dp-error:focus-within {
            box-shadow: 0 0 0 3px color-mix(in oklch, var(--color-error) 20%, transparent);
        }

        .dp-wrapper.dp-disabled {
            opacity: 0.75;
            cursor: not-allowed;
            background: oklch(0.94 0 0);
            border-color: oklch(0.88 0 0);
        }

        /* ── Icon ────────────────────────────────── */
        .dp-icon {
            position: absolute;
            left: 12px;
            width: 18px;
            height: 18px;
            color: oklch(0.5 0 0);
            pointer-events: none;
            transition: color .15s ease;
            z-index: 1;
        }

        .dp-wrapper:focus-within .dp-icon,
        .dp-wrapper.dp-filled:not(.dp-disabled) .dp-icon {
            color: var(--color-primary);
        }

        /* ── Input nativo ────────────────────────── */
        .dp-input {
            flex: 1 1 auto;
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

        /* Picker indicator cubre todo el input (click en cualquier parte) */
        .dp-input::-webkit-calendar-picker-indicator {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            opacity: 0;
            cursor: pointer;
            background: transparent;
        }

        .dp-input:disabled {
            cursor: not-allowed;
        }

        /* Resalta el campo enfocado (dd/mm/yyyy) */
        .dp-input::-webkit-datetime-edit-day-field:focus,
        .dp-input::-webkit-datetime-edit-month-field:focus,
        .dp-input::-webkit-datetime-edit-year-field:focus {
            background: color-mix(in oklch, var(--color-primary) 18%, transparent);
            color: var(--color-text-primary);
            border-radius: 3px;
            outline: none;
        }

        /* ── Clear button ────────────────────────── */
        .dp-clear {
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
        .dp-clear svg {
            width: 14px;
            height: 14px;
        }
        .dp-clear:hover {
            background: color-mix(in oklch, var(--color-error) 15%, transparent);
            color: var(--color-error);
        }

        /* ── Help text ───────────────────────────── */
        .dp-help {
            font-size: 0.75rem;
            color: var(--color-text-muted);
            letter-spacing: 0.01em;
        }
        .dp-help-error {
            color: var(--color-error);
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .dp-help-error::before {
            content: "⚠";
            font-size: 0.7rem;
        }

        /* color-scheme: light se aplica arriba — sin overrides por tema */
    `]
})
export class DatePickerComponent implements ControlValueAccessor, DoCheck {
    private static idCounter = 0;

    label = input('');
    required = input(false);
    hint = input('');
    min = input('');
    max = input('');
    clearable = input(true);
    control = input<AbstractControl | null>(null);

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
        const ctrl = this.control();
        const next = !!(ctrl?.invalid && ctrl?.touched);
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

    clear(): void {
        this.value.set('');
        this.changeCallback('');
        this.touchedCallback();
    }
}
