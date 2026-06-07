import { Component, input, output, signal, computed } from '@angular/core';
import { Variant } from '@features/products/models/variant.model';
import { NgClass } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

export interface ProductVariantsMeta {
    timerEndTime?: string;
    sizingFitPercentage?: number;
    deliveryTimeframe?: string;
    carriers?: string;
    returnPolicyText?: string;
}

@Component({
  selector: 'app-product-variants',
  standalone: true,
  imports: [NgClass, TranslateModule],
  templateUrl: './product-variants.component.html'
})
export class ProductVariantsComponent {
  product = input<ProductVariantsMeta>();
  variants = input.required<Variant[]>();
  addToCart = output<{ variant: Variant, quantity: number }>();

  selectedVariantIndex = signal<number>(0);
  quantity = signal<number>(1);

  selectedVariant = computed(() => this.variants()[this.selectedVariantIndex()]);

  /** Opciones de cantidad según el stock real de la variante (tope 10), no un máximo fijo. */
  readonly qtyOptions = computed<number[]>(() => {
    const max = Math.min(this.selectedVariant()?.stockActual ?? 0, 10);
    return Array.from({ length: Math.max(1, max) }, (_, i) => i + 1);
  });

  selectVariant(index: number) {
    this.selectedVariantIndex.set(index);
    this.quantity.set(1);
  }

  onQtyChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.quantity.set(parseInt(value, 10));
  }

  onAddToCart() {
    const variant = this.selectedVariant();
    if (variant && variant.stockActual > 0) {
      this.addToCart.emit({ variant, quantity: this.quantity() });
    }
  }
}
