import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { UserResponse } from '@features/admin/models/user.model';

@Component({
    selector: 'app-user-list',
    standalone: true,
    imports: [],
    templateUrl: './user-list.component.html',
    styleUrl: './user-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserListComponent {
    users = input.required<UserResponse[]>();

    edit = output<UserResponse>();
    delete = output<UserResponse>();
}
