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
}
