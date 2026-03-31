import { Component, input } from '@angular/core';
import { Review } from '@features/products/models/review.model';
import { NgClass } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-product-reviews',
  standalone: true,
  imports: [NgClass, TranslateModule],
  templateUrl: './product-reviews.component.html'
})
export class ProductReviewsComponent {
  reviews = input<Review[]>([]);
  rating = input<number>(0);
  /** Datos de distribución de talla provistos por el backend. Si es null/undefined, el bloque se oculta. */
  sizeFeedback = input<{ small: number; trueToSize: number; large: number } | null>(null);
}
