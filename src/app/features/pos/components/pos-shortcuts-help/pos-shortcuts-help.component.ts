import { Component, ChangeDetectionStrategy, output } from '@angular/core';
import { POS_SHORTCUTS } from '../../services/pos-keyboard.service';

@Component({
    selector: 'app-pos-shortcuts-help',
    standalone: true,
    template: `
        <div class="shortcuts-overlay" (click)="close.emit()">
            <div class="shortcuts-panel" (click)="$event.stopPropagation()">
                <div class="shortcuts-header">
                    <h3 class="shortcuts-title">Atajos de teclado</h3>
                    <button class="shortcuts-close" (click)="close.emit()">
                        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                            <path fill-rule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clip-rule="evenodd" />
                        </svg>
                    </button>
                </div>
                <div class="shortcuts-list">
                    @for (s of shortcuts; track s.key) {
                    <div class="shortcut-row">
                        <kbd class="shortcut-key">{{ s.label }}</kbd>
                        <span class="shortcut-action">{{ s.action }}</span>
                    </div>
                    }
                </div>
            </div>
        </div>
    `,
    styles: [`
        .shortcuts-overlay {
            position: fixed;
            inset: 0;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
        }
        .shortcuts-panel {
            background: var(--color-surface-raised, #202020);
            border: 1px solid var(--color-border, #2c2c2c);
            border-radius: 12px;
            padding: 24px;
            min-width: 340px;
            max-width: 420px;
        }
        .shortcuts-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
        }
        .shortcuts-title {
            font-size: 16px;
            font-weight: 600;
            color: var(--color-text, #fff);
            margin: 0;
        }
        .shortcuts-close {
            background: none;
            border: none;
            color: var(--color-text-muted, #888);
            cursor: pointer;
            padding: 4px;
            border-radius: 6px;
        }
        .shortcuts-close:hover {
            background: var(--color-surface, #171717);
        }
        .shortcuts-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .shortcut-row {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .shortcut-key {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 44px;
            height: 28px;
            padding: 0 8px;
            background: var(--color-surface, #171717);
            border: 1px solid var(--color-border, #2c2c2c);
            border-radius: 6px;
            font-family: monospace;
            font-size: 12px;
            font-weight: 600;
            color: var(--color-text, #fff);
        }
        .shortcut-action {
            font-size: 13px;
            color: var(--color-text-subtle, #aaa);
        }
    `],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosShortcutsHelpComponent {
    readonly close = output<void>();
    readonly shortcuts = POS_SHORTCUTS;
}
