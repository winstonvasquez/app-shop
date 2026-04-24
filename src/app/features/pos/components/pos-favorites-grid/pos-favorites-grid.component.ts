import {
    Component, ChangeDetectionStrategy, input, output, signal,
} from '@angular/core';
import { PosFavorito } from '../../services/pos-favoritos.service';

@Component({
    selector: 'app-pos-favorites-grid',
    standalone: true,
    templateUrl: './pos-favorites-grid.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosFavoritesGridComponent {

    readonly favoritos = input.required<PosFavorito[]>();
    readonly isLoading = input(false);

    readonly selected = output<PosFavorito>();
    readonly remove = output<PosFavorito>();

    // Context menu state
    readonly contextMenuFav = signal<PosFavorito | null>(null);
    readonly contextMenuX = signal(0);
    readonly contextMenuY = signal(0);

    onSelect(fav: PosFavorito): void {
        this.selected.emit(fav);
    }

    onContextMenu(event: MouseEvent, fav: PosFavorito): void {
        event.preventDefault();
        this.contextMenuFav.set(fav);
        this.contextMenuX.set(event.clientX);
        this.contextMenuY.set(event.clientY);
    }

    closeContextMenu(): void {
        this.contextMenuFav.set(null);
    }

    removeFavorito(): void {
        const fav = this.contextMenuFav();
        if (fav) {
            this.remove.emit(fav);
            this.contextMenuFav.set(null);
        }
    }

    fmt(val: number | undefined | null): string {
        return (val ?? 0).toFixed(2);
    }
}
