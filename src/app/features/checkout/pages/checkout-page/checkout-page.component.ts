import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CartService } from '@features/cart/services/cart.service';
import { OrderService } from '@core/services/order.service';
import { SystemParameterService } from '@core/services/system-parameter.service';
import { ConfigService, MedioPago, Certificacion } from '@core/services/config.service';
import { AuthService } from '@core/auth/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule],
  templateUrl: './checkout-page.component.html'
})
export class CheckoutPageComponent implements OnInit {
  cartService = inject(CartService);
  orderService = inject(OrderService);
  configService = inject(ConfigService);
  authService = inject(AuthService);
  router = inject(Router);
  translate = inject(TranslateService);
  systemParams = inject(SystemParameterService);

  cartItems = this.cartService.cartItems;
  cartTotal = this.cartService.cartTotal;

  // Mock User Address
  shippingAddress = {
    name: 'Winston Fernando',
    phone: '+51 987 654 321',
    street: 'Av. Juan de Arona 123',
    district: 'San Isidro',
    city: 'Lima',
    region: 'Lima',
    country: 'Perú'
  };

  selectedPaymentMethod = signal<string>('VIS'); // Default Visa code
  couponCode = signal('');

  // Fake discounts mimicking heavy discount visual
  limitedTimeDiscount = computed(() => {
    return this.cartTotal() * 0.15; // 15% discount fake
  });

  itemDiscounts = computed(() => {
    // Mock big savings text
    return this.cartTotal() * 0.40;
  });

  discountTotal = computed(() => {
    return this.limitedTimeDiscount() + this.itemDiscounts();
  });

  finalTotal = computed(() => {
    return this.cartTotal() - this.limitedTimeDiscount() - this.itemDiscounts();
  });

  userId = computed(() => this.authService.currentUser()?.userId || 1);

  isLoading = signal(false);
  errorMessage = signal('');
  donatingToStore = signal(true);

  // Arrays instead of resources
  paymentMethods = signal<MedioPago[]>([]);
  certifications = signal<Certificacion[]>([]);

  ngOnInit() {
    this.configService.getMediosPago().subscribe(data => this.paymentMethods.set(data));
    this.configService.getCertificaciones().subscribe(data => this.certifications.set(data));
  }

  goHome() {
    this.router.navigate(['/']);
  }

  setPaymentMethod(code: string) {
    this.selectedPaymentMethod.set(code);
  }

  toggleDonation() {
    this.donatingToStore.update(val => !val);
  }

  applyCoupon() {
    console.log('Coupon applied', this.couponCode());
  }

  placeOrder() {
    if (this.cartItems().length === 0) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    const orderRequest = {
      usuarioId: this.userId(),
      detalles: this.cartItems().map(item => ({
        productoId: item.productId,
        cantidad: item.quantity
      })),
      direccionEnvio: {
        direccion: this.shippingAddress.street,
        ciudad: this.shippingAddress.city,
        codigoPostal: '00000', // Mock postal code
        pais: this.shippingAddress.country,
        region: this.shippingAddress.region,
        nombreDestinatario: this.shippingAddress.name,
        telefono: this.shippingAddress.phone
      },
      metodoPago: this.selectedPaymentMethod()
    };

    this.orderService.createOrder(orderRequest).subscribe({
      next: (response: any) => {
        this.cartService.clearCart();
        this.isLoading.set(false);
        alert(this.translate.instant('checkout.orderSuccess') + response.id);
        this.router.navigate(['/']);
      },
      error: (err: any) => {
        this.errorMessage.set(this.translate.instant('checkout.orderError'));
        this.isLoading.set(false);
      }
    });
  }
}
