
import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserResponse } from '@features/admin/models/user.model';

@Component({
    selector: 'app-user-list',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './user-list.component.html',
    styleUrl: './user-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserListComponent {
    // Inputs as signals
    users = input.required<UserResponse[]>();
    totalElements = input.required<number>();
    totalPages = input.required<number>();
    currentPage = input.required<number>();
    pageSize = input.required<number>();
    searchQuery = input<string>('');

    // Outputs as modern outputs
    search = output<string>();
    pageSizeChange = output<number>();
    pageChange = output<number>();
    edit = output<UserResponse>();
    delete = output<UserResponse>();

    // Computed properties
    pages = computed(() => {
        const total = this.totalPages();
        return Array.from({ length: total }, (_, i) => i);
    });

    onSearchInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.search.emit(input.value);
    }

    onPageSizeChangeInput(event: Event): void {
        const select = event.target as HTMLSelectElement;
        this.pageSizeChange.emit(parseInt(select.value, 10));
    }
}
