import { Component, input } from '@angular/core';
import { ProductDetail } from '@features/products/models/product-detail.model';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-product-main-info',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './product-main-info.component.html'
})
export class ProductMainInfoComponent {
  product = input.required<ProductDetail>();
}
