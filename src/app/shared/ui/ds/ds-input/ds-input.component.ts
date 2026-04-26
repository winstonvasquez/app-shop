import {
    Component, input, output, computed, ChangeDetectionStrategy, forwardRef,
} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type DsInputSize = 'sm' | 'md' | 'lg';
export type DsInputType = 'text' | 'email' | 'password' | 'tel' | 'number' | 'search' | 'url';

/**
 * Input — port 1:1 de primitives.jsx → function Input.
 * Layout: <label class="wrap"> [icon] <input> [suffix] </label>
 * - icon: nombre Lucide (izquierda, color var(--c-muted))
 * - suffix: nombre Lucide (derecha, color var(--c-muted))
 * - error: borde var(--c-danger)
 * - sizes: sm=32px, md=40px, lg=48px (height)
 * Implementa ControlValueAccessor para uso con Reactive/Template Forms.
 */
@Component({
    selector: 'ds-input',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [LucideAngularModule],
    providers: [{
        provide: NG_VALUE_ACCESSOR,
        useExisting: forwardRef(() => DsInputComponent),
        multi: true,
    }],
    host: {
        '[class.is-full]': 'full()',
    },
    template: `
        <label class="wrap" [class.error]="error()" [class.disabled]="disabled" [style]="wrapStyle()">
            @if (icon()) {
                <lucide-icon class="icon" [name]="icon()!" [size]="iconSize()"/>
            }
            <input
                [type]="type()"
                [value]="innerValue"
                [placeholder]="placeholder()"
                [disabled]="disabled"
                [attr.inputmode]="inputmode() || null"
                [attr.maxlength]="maxlength() || null"
                [attr.autocomplete]="autocomplete() || null"
                [style.font-size.px]="sizes().fs"
                (input)="onInput($any($event.target).value)"
                (blur)="onTouched()"
                (focus)="focus.emit()"
                (keydown.enter)="enter.emit()"/>
            @if (suffix()) {
                <lucide-icon class="suffix" [name]="suffix()!" [size]="iconSize()"/>
            }
        </label>
    `,
    styles: [`
        :host { display: inline-flex; }
        :host(.is-full) { display: flex; width: 100%; }
        :host(.is-full) .wrap { width: 100%; }

        .wrap {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 0 12px;
            background: var(--c-surface);
            border: 1px solid var(--c-border);
            border-radius: var(--r-md);
            font-family: var(--f-sans);
            transition: border-color 120ms, box-shadow 120ms;
            cursor: text;
        }
        .wrap:focus-within {
            border-color: var(--c-brand);
            box-shadow: 0 0 0 3px var(--color-focus-ring, color-mix(in srgb, var(--c-brand) 30%, transparent));
        }
        .wrap.error {
            border-color: var(--c-danger);
        }
        .wrap.error:focus-within {
            box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-danger) 30%, transparent);
        }
        .wrap.disabled {
            opacity: .55;
            cursor: not-allowed;
            background: var(--c-surface2);
        }
        .icon, .suffix { color: var(--c-muted); display: inline-flex; }

        input {
            flex: 1; min-width: 0;
            border: none; outline: none; background: transparent;
            color: var(--c-text);
            font-family: inherit;
            padding: 0;
        }
        input:disabled { cursor: not-allowed; }
        input::placeholder { color: var(--c-subtle, var(--c-muted)); }
    `],
})
export class DsInputComponent implements ControlValueAccessor {
    type = input<DsInputType>('text');
    placeholder = input<string>('');
    size = input<DsInputSize>('md');
    icon = input<string | null>(null);
    suffix = input<string | null>(null);
    error = input<boolean>(false);
    full = input<boolean>(false);
    inputmode = input<'numeric' | 'decimal' | 'tel' | 'email' | 'search' | 'url' | null>(null);
    maxlength = input<number | null>(null);
    autocomplete = input<string | null>(null);

    focus = output<void>();
    enter = output<void>();

    protected innerValue = '';
    protected disabled = false;

    private onChange: (v: string) => void = () => { /* noop */ };
    protected onTouched: () => void = () => { /* noop */ };

    protected sizes = computed(() => {
        const map: Record<DsInputSize, { h: number; fs: number }> = {
            sm: { h: 32, fs: 13 },
            md: { h: 40, fs: 14 },
            lg: { h: 48, fs: 15 },
        };
        return map[this.size()];
    });

    protected iconSize = computed(() => {
        const map: Record<DsInputSize, number> = { sm: 14, md: 16, lg: 18 };
        return map[this.size()];
    });

    protected wrapStyle = computed(() => `height: ${this.sizes().h}px;`);

    protected onInput(v: string): void {
        this.innerValue = v;
        this.onChange(v);
    }

    /* ── ControlValueAccessor ────────────────────────────── */
    writeValue(v: string | null | undefined): void {
        this.innerValue = v ?? '';
    }
    registerOnChange(fn: (v: string) => void): void {
        this.onChange = fn;
    }
    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }
    setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }
}
