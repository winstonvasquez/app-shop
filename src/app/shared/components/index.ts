export { IconComponent } from './icon/icon.component';
export { ICON_CATALOG } from './icon/icon-catalog';
export type { IconName } from './icon/icon-catalog';
export { ButtonComponent } from './button/button.component';
export type { ButtonVariant, ButtonSize } from './button/button.component';
// form-field/ (slot-only) fue eliminado 2026-04-21 — usar FormFieldComponent de @shared/ui (híbrido)
export * from './number-input/number-input.component';
export { CatalogSelectComponent } from './catalog-select/catalog-select.component';
export { ServerSearchSelectComponent } from './server-search-select/server-search-select.component';
export type { ServerSelectOption, ServerSelectDataSource, ServerSelectId } from './server-search-select/server-search-select.component';
export { RichTextEditorComponent } from './rich-text-editor/rich-text-editor.component';
export { MultiCheckSelectComponent } from './multi-check-select/multi-check-select.component';
export type { MultiCheckOption } from './multi-check-select/multi-check-select.component';
export { ImageGalleryManagerComponent } from './image-gallery-manager/image-gallery-manager.component';
export type { GalleryImage, PendingImage } from './image-gallery-manager/image-gallery-manager.component';
export * from './modal/modal.component';
export * from './drawer/drawer.component';
export * from './toast/toast-container.component';
