/*
 * Public API Surface of @microshop/ui-kit
 *
 * Shared UI components, design tokens, and utilities.
 * Consumed by all MFEs to maintain visual consistency.
 *
 * Design tokens (CSS custom properties) are in:
 *   src/styles/theme.css           — dark/light theme tokens
 *   src/styles/admin-utilities.css — ERP utility classes (.btn, .card, .badge, .table, etc.)
 * Import them globally in each MFE's angular.json styles[]
 */

// Feedback components
export { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
export { LoadingSpinnerComponent } from '@shared/ui/feedback/loading-spinner/loading-spinner.component';

// Form components
export { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';

// Layout components
export { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';

// Modal components
export { ModalComponent } from '@shared/ui/modals/modal/modal.component';

// Table components
export {
    DataTableComponent,
    TableColumn,
    TableAction,
    PaginationEvent,
    SortEvent
} from '@shared/ui/tables/data-table/data-table.component';

// Shared feature components
export { ProductCardComponent } from '@shared/components/product-card/product-card.component';
export { SectionHeaderComponent } from '@shared/components/section-header/section-header.component';
export { LanguageSelectorComponent } from '@shared/components/language-selector/language-selector.component';

// Shared services
export { NotificationService, Notification } from '@shared/services/notification.service';
export { SearchService } from '@shared/services/search.service';
