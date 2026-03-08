import { Component, input } from '@angular/core';
import { Seller } from '@features/products/models/seller.model';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-seller-info',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './seller-info.component.html'
})
export class SellerInfoComponent {
  seller = input<Seller>();
}
