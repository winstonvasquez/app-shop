import { Component, input, output, signal, computed } from '@angular/core';
import { Variant } from '@features/products/models/variant.model';
import { NgClass } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-product-variants',
  standalone: true,
  imports: [NgClass, TranslateModule],
  templateUrl: './product-variants.component.html'
})
export class ProductVariantsComponent {
  product = input<any>();
  variants = input.required<Variant[]>();
  addToCart = output<{ variant: Variant, quantity: number }>();

  selectedVariantIndex = signal<number>(0);
  quantity = signal<number>(1);

  selectedVariant = computed(() => this.variants()[this.selectedVariantIndex()]);

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
