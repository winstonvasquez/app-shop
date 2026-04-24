import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { CompareService } from '@features/products/services/compare.service';
import { CartService } from '@features/cart/services/cart.service';
import { BreadcrumbComponent, BreadcrumbItem } from '@shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-compare-page',
  standalone: true,
  imports: [BreadcrumbComponent, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './compare-page.component.html'
})
export class ComparePageComponent {
  readonly compareService = inject(CompareService);
  private readonly router = inject(Router);
  private readonly cartService = inject(CartService);

  readonly breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Inicio', route: ['/home'] },
    { label: 'Productos', route: ['/products'] },
    { label: 'Comparar productos' }
  ];

  removeProduct(id: number): void {
    this.compareService.remove(id);
    if (this.compareService.count() === 0) {
      this.router.navigate(['/products']);
    }
  }

  clearAll(): void {
    this.compareService.clear();
    this.router.navigate(['/products']);
  }

  addToCart(product: { id: number; name: string; price: number; image: string }): void {
    this.cartService.addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1
    });
    this.cartService.toggleDrawer();
  }

  goToProduct(id: number): void {
    this.router.navigate(['/products', id]);
  }

  /** Returns the union of all attribute keys across compared products */
  get allAttributeKeys(): string[] {
    const keys = new Set<string>();
    this.compareService.items().forEach(p => {
      Object.keys(p.attributes ?? {}).forEach(k => keys.add(k));
    });
    return Array.from(keys);
  }
}
