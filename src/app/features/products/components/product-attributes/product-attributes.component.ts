import { Component, input } from '@angular/core';
import { Attribute } from '@features/products/models/attribute.model';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-product-attributes',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './product-attributes.component.html'
})
export class ProductAttributesComponent {
  attributes = input<Attribute[]>([]);
}
