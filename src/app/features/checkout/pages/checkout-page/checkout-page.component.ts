import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BreadcrumbComponent, BreadcrumbItem } from '@shared/components/breadcrumb/breadcrumb.component';
import { CartService } from '@features/cart/services/cart.service';
import { OrderService } from '@core/services/order.service';
import { SystemParameterService } from '@core/services/system-parameter.service';
import { ConfigService, MedioPago, Certificacion } from '@core/services/config.service';
import { AuthService } from '@core/auth/auth.service';
import { AddressService, Address, AddressInput } from '@core/services/address/address.service';
import { MercadoPagoService, CardData, YapeIntentResult } from '@core/services/payment/mercadopago.service';
import { CreditService } from '@core/services/credit.service';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule, ReactiveFormsModule, BreadcrumbComponent, RouterLink],
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
  addressService = inject(AddressService);
  mercadopagoService = inject(MercadoPagoService);
  creditService = inject(CreditService);
  fb = inject(FormBuilder);

  cartItems = this.cartService.cartItems;
  cartTotal = this.cartService.cartTotal;

  readonly breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Inicio', route: ['/home'] },
    { label: 'Carrito', route: ['/cart'] },
    { label: 'Checkout' }
  ];

  paymentConfirmed = signal(false);

  checkoutStep = computed(() => {
    if (!this.selectedAddress()) return 1;
    if (!this.paymentConfirmed()) return 2;
    return 3;
  });

  // Direcciones del cliente
  addresses = signal<Address[]>([]);
  selectedAddress = signal<Address | null>(null);
  showAddressModal = signal(false);
  showAddressForm = signal(false);
  savingAddress = signal(false);
  addressFormError = signal<string | null>(null);

  addressForm = this.fb.group({
    nombreCompleto: ['', Validators.required],
    telefono: ['', Validators.required],
    departamento: ['', Validators.required],
    provincia: ['', Validators.required],
    distrito: ['', Validators.required],
    direccionLinea1: ['', Validators.required],
    referencia: [''],
    esPrincipal: [false],
  });

  selectedPaymentMethod = signal<string>('VIS');
  couponCode = signal('');
  couponError = signal<string | null>(null);
  couponApplying = signal(false);
  couponDiscount = signal(0);

  useCredit = signal(false);
  creditToApply = signal(0);

  finalTotal = computed(() => {
    let total = this.cartTotal() - this.couponDiscount();
    if (this.useCredit()) {
      total = Math.max(0, total - this.creditToApply());
    }
    return total;
  });

  userId = computed(() => this.authService.currentUser()?.userId || 1);

  isLoading = signal(false);
  errorMessage = signal('');

  paymentMethods = signal<MedioPago[]>([]);
  certifications = signal<Certificacion[]>([]);

  // ── Formulario de tarjeta (MP Brick simulado) ──────────────────────────────
  cardNumber = signal('');
  expiryDate = signal('');  // formato MM/AA
  cvv = signal('');
  cardholderName = signal('');

  // ── Yape ──────────────────────────────────────────────────────────────────
  yapeIntent = signal<YapeIntentResult | null>(null);
  yapeLoading = signal(false);
  yapeError = signal<string | null>(null);
  /** Referencia al intervalo de polling de Yape */
  private yapePollingInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    this.configService.getMediosPago().subscribe(data => this.paymentMethods.set(data));
    this.configService.getCertificaciones().subscribe(data => this.certifications.set(data));
    this.loadAddresses();
    this.creditService.loadBalance();
  }

  toggleCredit(checked: boolean): void {
    this.useCredit.set(checked);
    const balance = this.creditService.balance()?.balance ?? 0;
    const subtotal = this.cartTotal() - this.couponDiscount();
    this.creditToApply.set(Math.min(balance, subtotal));
  }

  loadAddresses(): void {
    this.addressService.getMyAddresses().subscribe({
      next: (dirs) => {
        this.addresses.set(dirs);
        const principal = dirs.find(d => d.esPrincipal) ?? dirs[0] ?? null;
        this.selectedAddress.set(principal);
      },
      error: () => {
        this.addresses.set([]);
        this.selectedAddress.set(null);
      }
    });
  }

  goHome() {
    this.router.navigate(['/']);
  }

  setPaymentMethod(code: string) {
    this.selectedPaymentMethod.set(code);
  }

  openAddressModal() {
    this.showAddressModal.set(true);
    this.showAddressForm.set(false);
    this.addressFormError.set(null);
  }

  closeAddressModal() {
    this.showAddressModal.set(false);
    this.showAddressForm.set(false);
    this.addressFormError.set(null);
    this.addressForm.reset({ esPrincipal: false });
  }

  selectAddress(addr: Address) {
    this.selectedAddress.set(addr);
    this.closeAddressModal();
  }

  openNewAddressForm() {
    this.showAddressForm.set(true);
    this.addressForm.reset({ esPrincipal: this.addresses().length === 0 });
  }

  saveNewAddress() {
    if (this.addressForm.invalid) return;
    this.savingAddress.set(true);
    this.addressFormError.set(null);

    const data = this.addressForm.value as AddressInput;
    this.addressService.addAddress(data).subscribe({
      next: (newAddr) => {
        this.savingAddress.set(false);
        this.selectedAddress.set(newAddr);
        this.closeAddressModal();
        this.loadAddresses();
      },
      error: (err: Error) => {
        this.savingAddress.set(false);
        this.addressFormError.set(err.message);
      }
    });
  }

  applyCoupon(): void {
    const code = this.couponCode();
    if (!code.trim()) return;
    this.couponError.set(null);
    this.couponApplying.set(true);
    this.orderService.validateCoupon(code).pipe(
      finalize(() => this.couponApplying.set(false))
    ).subscribe({
      next: (discount) => {
        this.couponDiscount.set(discount.amount);
        this.couponError.set(null);
      },
      error: () => this.couponError.set('Cupón inválido o expirado')
    });
  }

  /**
   * Procesa el pago con tarjeta usando MercadoPago:
   * 1. Crea el token de tarjeta (MP Brick simulado)
   * 2. Envía el token al backend para procesar el pago
   * 3. Navega a /orders/confirmation/:orderId si es aprobado
   */
  payWithCard() {
    if (!this.cardNumber() || !this.expiryDate() || !this.cvv() || !this.cardholderName()) {
      this.errorMessage.set('Por favor completa todos los campos de la tarjeta');
      return;
    }
    if (!this.selectedAddress()) {
      this.errorMessage.set('Por favor selecciona una dirección de envío');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const [expiryMonth, expiryYear] = this.expiryDate().split('/');
    const cardData: CardData = {
      cardNumber: this.cardNumber().replace(/\s/g, ''),
      expiryMonth: expiryMonth ?? '',
      expiryYear: expiryYear ?? '',
      securityCode: this.cvv(),
      cardholderName: this.cardholderName(),
      cardholderIdType: 'DNI',
      cardholderIdNumber: '00000000'
    };

    // Paso 1: generar token (MP Brick simulado)
    this.mercadopagoService.createCardToken(cardData).subscribe({
      next: (token) => {
        // Paso 2: procesar pago en el backend con el token
        this.mercadopagoService.processCardPayment(
          token,
          this.finalTotal(),
          0,  // El pedido se crea en placeOrder(); aquí se usa 0 como placeholder
          this.selectedPaymentMethod()
        ).subscribe({
          next: (result) => {
            this.isLoading.set(false);
            if (result.status === 'approved') {
              this.cartService.clearCart();
              this.router.navigate(['/orders/confirmation', result.orderId]);
            } else {
              this.errorMessage.set('Pago ' + result.status + ': ' + (result.message ?? 'Verifica los datos de tu tarjeta'));
            }
          },
          error: (err: Error) => {
            this.isLoading.set(false);
            this.errorMessage.set(err.message ?? 'Error al procesar el pago. Intenta nuevamente.');
          }
        });
      },
      error: (err: Error) => {
        this.isLoading.set(false);
        this.errorMessage.set('Error al tokenizar la tarjeta: ' + err.message);
      }
    });
  }

  /**
   * Inicia el flujo de pago con Yape:
   * 1. Llama al backend para obtener el QR dinámico
   * 2. Muestra el QR al usuario con cuenta regresiva de 5 minutos
   * 3. Inicia polling cada 3 segundos para detectar confirmación
   */
  initiateYapePayment() {
    if (!this.selectedAddress()) {
      this.yapeError.set('Por favor selecciona una dirección de envío');
      return;
    }

    this.yapeLoading.set(true);
    this.yapeError.set(null);
    this.yapeIntent.set(null);

    this.mercadopagoService.processYapePayment(this.finalTotal(), 0).subscribe({
      next: (intent) => {
        this.yapeLoading.set(false);
        this.yapeIntent.set(intent);
        this.startYapePolling(intent.transactionId);
      },
      error: (err: Error) => {
        this.yapeLoading.set(false);
        this.yapeError.set('No se pudo generar el QR Yape: ' + err.message);
      }
    });
  }

  /** Inicia polling del estado Yape cada 3 segundos. */
  private startYapePolling(transactionId: string) {
    this.stopYapePolling();

    this.yapePollingInterval = setInterval(() => {
      this.mercadopagoService.getYapeStatus(transactionId).subscribe({
        next: (status) => {
          if (status.status === 'APPROVED') {
            this.stopYapePolling();
            this.cartService.clearCart();
            // Navega a confirmación — el orderId real viene del backend
            this.router.navigate(['/orders/confirmation', 0]);
          } else if (status.status === 'REJECTED' || status.status === 'EXPIRED') {
            this.stopYapePolling();
            this.yapeIntent.set(null);
            this.yapeError.set('Pago Yape ' + status.status.toLowerCase() + '. Por favor intenta nuevamente.');
          }
        },
        error: () => {
          // Ignorar errores de polling — el usuario puede reintentar
        }
      });
    }, 3000);

    // Auto-cancelar polling después de 5 minutos (expiración del QR)
    setTimeout(() => {
      this.stopYapePolling();
      if (this.yapeIntent()) {
        this.yapeIntent.set(null);
        this.yapeError.set('El código QR Yape expiró. Por favor genera uno nuevo.');
      }
    }, 5 * 60 * 1000);
  }

  stopYapePolling() {
    if (this.yapePollingInterval !== null) {
      clearInterval(this.yapePollingInterval);
      this.yapePollingInterval = null;
    }
  }

  placeOrder() {
    if (this.cartItems().length === 0) return;
    if (!this.selectedAddress()) {
      this.errorMessage.set('Por favor selecciona una dirección de envío');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const addr = this.selectedAddress()!;
    const orderRequest = {
      usuarioId: this.userId(),
      detalles: this.cartItems().map(item => ({
        productoId: item.productId,
        cantidad: item.quantity
      })),
      direccionEnvio: {
        direccion: addr.direccionLinea1,
        ciudad: addr.distrito,
        codigoPostal: '00000',
        pais: 'Perú',
        region: addr.departamento,
        nombreDestinatario: addr.nombreCompleto,
        telefono: addr.telefono
      },
      metodoPago: this.selectedPaymentMethod()
    };

    this.orderService.createOrder(orderRequest).subscribe({
      next: (response: unknown) => {
        this.cartService.clearCart();
        this.isLoading.set(false);
        const res = response as { id?: number; orderId?: number };
        const orderId = res.id ?? res.orderId;
        this.router.navigate(['/orders/confirmation', orderId]);
      },
      error: (err: unknown) => {
        this.errorMessage.set(this.translate.instant('checkout.orderError'));
        this.isLoading.set(false);
      }
    });
  }
}
