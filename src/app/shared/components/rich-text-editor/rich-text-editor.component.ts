import {
    AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, forwardRef, input, signal, viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/** Etiquetas permitidas en el HTML almacenado. Todo lo demás se aplana a texto. */
const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'BR', 'P', 'DIV', 'UL', 'OL', 'LI', 'A']);

/**
 * Editor de texto enriquecido reutilizable (cero dependencias externas).
 * Implementa ControlValueAccessor, así que reemplaza a un `<textarea>` sin
 * tocar el FormGroup: funciona con `formControlName`, `[formControl]` o `[(ngModel)]`.
 *
 * El valor del control es HTML **saneado** (whitelist de etiquetas, sin atributos
 * salvo `href` en enlaces). Si el usuario borra todo, el valor es `''`, no `<br>`,
 * para que `Validators.required` siga funcionando.
 *
 * Uso:
 *   <app-rich-text-editor formControlName="descripcion" rows="3"
 *                         placeholder="Descripción…" />
 */
@Component({
    selector: 'app-rich-text-editor',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [{
        provide: NG_VALUE_ACCESSOR,
        useExisting: forwardRef(() => RichTextEditorComponent),
        multi: true,
    }],
    template: `
        <div class="rte" [class.rte--disabled]="disabled()">
            <div class="rte__toolbar" role="toolbar" aria-label="Formato de texto">
                <button type="button" class="rte__btn" title="Negrita (Ctrl+B)" aria-label="Negrita"
                        [disabled]="disabled()" (mousedown)="run($event, 'bold')"><b>B</b></button>
                <button type="button" class="rte__btn" title="Cursiva (Ctrl+I)" aria-label="Cursiva"
                        [disabled]="disabled()" (mousedown)="run($event, 'italic')"><i>I</i></button>
                <button type="button" class="rte__btn" title="Subrayado (Ctrl+U)" aria-label="Subrayado"
                        [disabled]="disabled()" (mousedown)="run($event, 'underline')"><u>U</u></button>
                <span class="rte__sep"></span>
                <button type="button" class="rte__btn" title="Lista con viñetas" aria-label="Lista con viñetas"
                        [disabled]="disabled()" (mousedown)="run($event, 'insertUnorderedList')">•—</button>
                <button type="button" class="rte__btn" title="Lista numerada" aria-label="Lista numerada"
                        [disabled]="disabled()" (mousedown)="run($event, 'insertOrderedList')">1.</button>
                <span class="rte__sep"></span>
                <button type="button" class="rte__btn" title="Quitar formato" aria-label="Quitar formato"
                        [disabled]="disabled()" (mousedown)="run($event, 'removeFormat')">Tx</button>
            </div>

            <div #host class="rte__area" [attr.contenteditable]="!disabled()"
                 [class.rte__area--empty]="empty()"
                 [attr.data-placeholder]="placeholder()"
                 [style.min-height.px]="rows() * 22 + 12"
                 role="textbox" aria-multiline="true"
                 [attr.aria-label]="ariaLabel() || placeholder() || null"
                 [attr.aria-labelledby]="ariaLabelledby() || null"
                 (input)="onInput()" (blur)="onBlur()" (paste)="onPaste($event)"></div>
        </div>
    `,
    styles: [`
        :host { display: block; }
        :host(.error) .rte, :host(.ng-invalid.ng-touched) .rte { border-color: var(--color-error, #dc2626); }
        .rte { border: 1px solid var(--color-border, #d4d4d8); border-radius: 8px; background: var(--color-surface, #fff); overflow: hidden; }
        .rte:focus-within { border-color: var(--color-primary, #2563eb); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary, #2563eb) 18%, transparent); }
        .rte--disabled { opacity: .6; }
        .rte__toolbar { display: flex; align-items: center; gap: 2px; padding: 4px 6px; border-bottom: 1px solid var(--color-border, #e4e4e7); background: var(--color-surface-muted, #fafafa); }
        .rte__btn { min-width: 28px; height: 26px; padding: 0 6px; border: 0; border-radius: 5px; background: transparent; cursor: pointer; font-size: 12px; line-height: 1; color: var(--color-text, #27272a); }
        .rte__btn:hover:not(:disabled) { background: var(--color-surface-hover, #e4e4e7); }
        .rte__btn:disabled { cursor: not-allowed; opacity: .5; }
        .rte__sep { width: 1px; height: 16px; margin: 0 4px; background: var(--color-border, #e4e4e7); }
        .rte__area { padding: 8px 10px; outline: 0; font: inherit; color: inherit; overflow-y: auto; max-height: 320px; }
        .rte__area--empty::before { content: attr(data-placeholder); color: var(--color-text-muted, #a1a1aa); pointer-events: none; }
        .rte__area ul, .rte__area ol { margin: .25rem 0 .25rem 1.25rem; }
        .rte__area p { margin: 0 0 .35rem; }
    `],
})
export class RichTextEditorComponent implements ControlValueAccessor, AfterViewInit {
    private readonly host = viewChild<ElementRef<HTMLElement>>('host');

    /** Alto inicial aproximado, en líneas — equivale al `rows` del `<textarea>`. */
    readonly rows = input(3, { transform: (v: number | string) => Number(v) || 3 });
    readonly placeholder = input('');
    /** Nombre accesible: un `<label for>` NO vincula un div[contenteditable]. */
    readonly ariaLabel = input('');
    readonly ariaLabelledby = input('');

    readonly disabled = signal(false);
    /** Gobierna el placeholder: `:empty` no sirve porque el navegador deja un `<br>` residual. */
    readonly empty = signal(true);

    /**
     * Angular llama `writeValue` desde `FormControlName.ngOnChanges`, que corre en el
     * update pass del PADRE — antes de que exista la vista de este componente. Leer el
     * `viewChild` ahí lanza NG0951, así que el valor se guarda hasta `ngAfterViewInit`.
     */
    private pending: string | null = null;
    private viewReady = false;
    /** Último valor emitido: evita marcar el control `dirty` al tabular sin escribir. */
    private lastEmitted: string | null = null;

    private onChange: (v: string) => void = () => { /* set por Angular */ };
    private onTouched: () => void = () => { /* set por Angular */ };

    ngAfterViewInit(): void {
        this.viewReady = true;
        if (this.pending !== null) {
            this.apply(this.pending);
            this.pending = null;
        }
    }

    /** Ejecuta el comando sin perder la selección (de ahí `mousedown` + preventDefault). */
    run(ev: Event, command: string): void {
        ev.preventDefault();
        const el = this.host()?.nativeElement;
        if (!el || this.disabled()) return;
        el.focus();
        document.execCommand(command, false);
        this.onInput();
    }

    onInput(): void {
        const el = this.host()?.nativeElement;
        if (!el) return;
        // Sanear en cada pulsación destruiría la selección (replaceWith mueve el caret):
        // sólo se poda cuando de verdad hay algo fuera de la whitelist.
        if (this.hasForeignNode(el)) this.sanitizeInPlace(el);
        this.emit(el);
    }

    onBlur(): void {
        const el = this.host()?.nativeElement;
        if (el) {
            this.sanitizeInPlace(el);
            this.emit(el);
        }
        this.onTouched();
    }

    private emit(el: HTMLElement): void {
        this.empty.set(this.isEmpty(el));
        const next = this.empty() ? '' : el.innerHTML;
        if (next === this.lastEmitted) return;
        this.lastEmitted = next;
        this.onChange(next);
    }

    /** Pega siempre como texto plano: evita traerse estilos y etiquetas del origen. */
    onPaste(ev: ClipboardEvent): void {
        ev.preventDefault();
        const text = ev.clipboardData?.getData('text/plain') ?? '';
        document.execCommand('insertText', false, text);
        this.onInput();
    }

    // ── ControlValueAccessor ──────────────────────────────────────────────
    writeValue(value: string | null): void {
        if (!this.viewReady) {
            this.pending = value ?? '';
            return;
        }
        this.apply(value ?? '');
    }

    registerOnChange(fn: (v: string) => void): void { this.onChange = fn; }
    registerOnTouched(fn: () => void): void { this.onTouched = fn; }
    setDisabledState(isDisabled: boolean): void { this.disabled.set(isDisabled); }

    // ── Interno ───────────────────────────────────────────────────────────

    private apply(html: string): void {
        const el = this.host()?.nativeElement;
        if (!el) return;
        el.innerHTML = html;
        this.sanitizeInPlace(el);
        this.empty.set(this.isEmpty(el));
        this.lastEmitted = this.empty() ? '' : el.innerHTML;
    }

/**
     * ¿Hay algo que podar? Etiqueta fuera de la whitelist, o cualquier atributo
     * sobrante (`dir`, `align`, `data-*`… no sólo `style`/`class`/`id`).
     */
    private hasForeignNode(root: HTMLElement): boolean {
        return Array.from(root.querySelectorAll('*')).some(n =>
            !ALLOWED_TAGS.has(n.tagName)
            || n.attributes.length > (n.tagName === 'A' ? 3 : 0));
    }

    /** Vacío = sin texto y sin listas; ignora los `<br>`/`<div>` que deja el navegador. */
    private isEmpty(el: HTMLElement): boolean {
        return el.textContent?.trim() === '' && el.querySelector('li') === null;
    }

    /**
     * Poda el árbol a la whitelist: las etiquetas no permitidas se desenvuelven
     * (se conserva su texto) y se eliminan todos los atributos salvo `href`.
     */
    private sanitizeInPlace(root: HTMLElement): void {
        for (const node of Array.from(root.querySelectorAll('*'))) {
            if (!ALLOWED_TAGS.has(node.tagName)) {
                node.replaceWith(...Array.from(node.childNodes));
                continue;
            }
            for (const attr of Array.from(node.attributes)) {
                const keep = node.tagName === 'A' && attr.name === 'href'
                    && /^(https?:|mailto:|\/)/i.test(attr.value.trim());
                if (!keep) node.removeAttribute(attr.name);
            }
            if (node.tagName === 'A') {
                node.setAttribute('target', '_blank');
                node.setAttribute('rel', 'noopener noreferrer');
            }
        }
    }
}
