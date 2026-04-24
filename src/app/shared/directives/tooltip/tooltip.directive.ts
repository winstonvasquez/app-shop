import {
    Directive, input, ElementRef, HostListener,
    Renderer2, inject, OnDestroy
} from '@angular/core';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

@Directive({
    selector: '[appTooltip]',
    standalone: true,
})
export class TooltipDirective implements OnDestroy {
    appTooltip = input.required<string>();
    tooltipPosition = input<TooltipPosition>('top');
    tooltipDelay = input(400);

    private el = inject(ElementRef);
    private renderer = inject(Renderer2);
    private tooltipEl: HTMLElement | null = null;
    private showTimer: ReturnType<typeof setTimeout> | null = null;

    @HostListener('mouseenter') onMouseEnter() {
        if (!this.appTooltip()) return;
        this.showTimer = setTimeout(() => this.show(), this.tooltipDelay());
    }

    @HostListener('mouseleave') onMouseLeave() {
        if (this.showTimer) { clearTimeout(this.showTimer); this.showTimer = null; }
        this.hide();
    }

    @HostListener('focus') onFocus() {
        if (!this.appTooltip()) return;
        this.show();
    }

    @HostListener('blur') onBlur() { this.hide(); }

    private show() {
        this.tooltipEl = this.renderer.createElement('div');
        this.renderer.addClass(this.tooltipEl, 'tooltip');
        this.renderer.addClass(this.tooltipEl, `tooltip-${this.tooltipPosition()}`);
        this.renderer.setProperty(this.tooltipEl, 'textContent', this.appTooltip());
        this.renderer.setStyle(this.el.nativeElement, 'position', 'relative');
        this.renderer.appendChild(this.el.nativeElement, this.tooltipEl);
    }

    private hide() {
        if (this.tooltipEl) {
            this.renderer.removeChild(this.el.nativeElement, this.tooltipEl);
            this.tooltipEl = null;
        }
    }

    ngOnDestroy() {
        if (this.showTimer) clearTimeout(this.showTimer);
        this.hide();
    }
}
