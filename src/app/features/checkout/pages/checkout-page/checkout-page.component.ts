import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BreadcrumbComponent, BreadcrumbItem } from '@shared/components/breadcrumb/breadcrumb.component';
import { DsButtonComponent } from '@shared/ui/ds';
import { CartService } from '@features/cart/services/cart.service';
import { OrderService } from '@core/services/order.service';
import { SystemParameterService } from '@core/services/system-parameter.service';
import { ConfigService, MedioPago, Certificacion } from '@core/services/config.service';
import { AuthService } from '@core/auth/auth.service';
import { AddressService, Address, AddressInput } from '@core/services/address/address.service';
import { MercadoPagoService, CardData, YapeIntentResult } from '@core/services/payment/mercadopago.service';
import { CreditService } from '@core/services/credit.service';
import { AnalyticsService } from '@core/services/analytics.service';
import { ZonaEnvioService, ZonaEnvio } from '@core/services/zona-envio.service';
import { GuestSessionService } from '@core/services/guest-session.service';
import { CartSyncService } from '@core/services/cart-sync.service';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { OrderRequest } from '@core/models/order.model';
import { firstValueFrom } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { AdminFormSectionComponent } from '@shared/ui/forms/admin-form-section/admin-form-section.component';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    BreadcrumbComponent,
    DsButtonComponent,
    RouterLink,
    DecimalPipe,
    FormFieldComponent,
    AdminFormSectionComponent,
  ],
  templateUrl: './checkout-page.component.html'
})
export class CheckoutPageComponent implements OnInit {
  cartService = inject(CartService);
  orderService = inject(OrderService);
  configService = inject(ConfigService);
  authService = inject(AuthService);
  guestSession = inject(GuestSessionService);
  cartSync = inject(CartSyncService);
  router = inject(Router);
  translate = inject(TranslateService);
  systemParams = inject(SystemParameterService);
  addressService = inject(AddressService);
  mercadopagoService = inject(MercadoPagoService);
  creditService = inject(CreditService);
  analyticsService = inject(AnalyticsService);
  zonaEnvioService = inject(ZonaEnvioService);
  fb = inject(FormBuilder);

  isGuest = computed(() => !this.authService.currentUser());

  guestForm = this.fb.group({
    guestEmail: ['', [Validators.required, Validators.email]],
    guestName:  ['', Validators.required],
    guestPhone: [''],
  });

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
    nombreDestinatario: ['', Validators.required],
    telefonoDestinatario: ['', Validators.required],
    departamento: ['', Validators.required],
    provincia: ['', Validators.required],
    distrito: ['', Validators.required],
    direccion: ['', Validators.required],
    referencia: [''],
    ubigeo: [''],
    esPrincipal: [false],
  });

  selectedPaymentMethod = signal<string>('VIS');
  couponCode = signal('');
  couponError = signal<string | null>(null);
  couponApplying = signal(false);
  couponDiscount = signal(0);
  appliedCouponCode = signal<string | null>(null);

  zonas = signal<ZonaEnvio[]>([]);
  selectedZona = signal<ZonaEnvio | null>(null);
  shippingCost = computed(() => this.selectedZona()?.costoEnvio ?? 0);

  useCredit = signal(false);
  creditToApply = signal(0);

  finalTotal = computed(() => {
    let total = this.cartTotal() - this.couponDiscount() + this.shippingCost();
    if (this.useCredit()) {
      total = Math.max(0, total - this.creditToApply());
    }
    return total;
  });

  userId = computed(() => this.authService.currentUser()?.userId ?? null);

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
    this.analyticsService.trackBeginCheckout(this.cartTotal(), this.cartItems().length);
    this.zonaEnvioService.getZonas().subscribe({ next: zonas => this.zonas.set(zonas), error: () => {} });

    if (this.isGuest()) {
      // Pre-llenar formulario de invitado con datos guardados si existen
      this.guestForm.patchValue({
        guestEmail: this.guestSession.email(),
        guestName:  this.guestSession.name(),
        guestPhone: this.guestSession.phone(),
      });
      // Crear dirección de envío manual para invitados
      this.showAddressForm.set(true);
    } else {
      this.loadAddresses();
      this.creditService.loadBalance();
    }
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

  selectZona(zona: ZonaEnvio): void {
    this.selectedZona.set(zona);
  }

  applyCoupon(): void {
    const code = this.couponCode();
    if (!code.trim()) return;
    this.couponError.set(null);
    this.couponApplying.set(true);
    this.orderService.validateCoupon(code, this.cartTotal()).pipe(
      finalize(() => this.couponApplying.set(false))
    ).subscribe({
      next: (discount) => {
        this.couponDiscount.set(discount.amount);
        this.appliedCouponCode.set(code.trim().toUpperCase());
        this.couponError.set(null);
      },
      error: () => this.couponError.set('Cupón inválido o expirado')
    });
  }

  /**
   * Construye el OrderRequest a partir del estado actual del componente.
   * Centraliza la creación del DTO para que todos los métodos de pago usen el mismo.
   */
  private buildOrderRequest(estado: string = 'PENDIENTE_PAGO'): OrderRequest {
    const addr = this.selectedAddress()!;
    const guestEmail = this.isGuest() ? (this.guestForm.value.guestEmail ?? undefined) : undefined;

    // Guardar datos de invitado en sesión para reutilizar en próximas visitas
    if (this.isGuest() && guestEmail) {
      this.guestSession.setEmail(this.guestForm.value.guestEmail ?? '');
      this.guestSession.setName(this.guestForm.value.guestName ?? '');
      this.guestSession.setPhone(this.guestForm.value.guestPhone ?? '');
    }

    return {
      usuarioId: this.userId(),
      guestEmail,
      estado,
      detalles: this.cartItems().map(item => ({
        productoId: item.productId,
        varianteId: item.variantId ?? 0,
        cantidad: item.quantity
      })),
      direccionEnvio: {
        direccion: addr.direccion,
        ciudad: addr.distrito,
        codigoPostal: addr.ubigeo ?? '00000',
        pais: 'Perú',
        region: addr.departamento,
        nombreDestinatario: addr.nombreDestinatario ?? '',
        telefono: addr.telefonoDestinatario ?? ''
      },
      metodoPago: this.selectedPaymentMethod(),
      codigoCupon: this.appliedCouponCode() ?? undefined,
      zonaEnvioId: this.selectedZona()?.id ?? undefined
    };
  }

  /**
   * Valida precondiciones comunes antes de iniciar cualquier flujo de pago.
   * Retorna true si la validación pasa, false si hay error (y setea errorMessage).
   */
  private validarPrecondicionesPago(): boolean {
    if (this.cartItems().length === 0) {
      this.errorMessage.set('El carrito está vacío');
      return false;
    }
    if (this.isGuest() && this.guestForm.invalid) {
      this.errorMessage.set('Por favor completa tu nombre y email para continuar como invitado');
      return false;
    }
    if (!this.selectedAddress()) {
      this.errorMessage.set('Por favor selecciona una dirección de envío');
      return false;
    }
    return true;
  }

  /**
   * Crea el pedido en estado PENDIENTE_PAGO y retorna el orderId.
   * Debe llamarse ANTES de invocar cualquier gateway de pago.
   * Si falla, lanza excepción — el llamador debe capturarla y NO proceder con el pago.
   */
  private async crearPedidoPendiente(): Promise<number> {
    const orderRequest = this.buildOrderRequest('PENDIENTE_PAGO');
    const response = await firstValueFrom(this.orderService.createOrder(orderRequest));
    const orderId = response.id ?? (response as unknown as { orderId?: number }).orderId;
    if (!orderId) {
      throw new Error('El servidor no retornó un ID de pedido válido');
    }
    return orderId;
  }

  /**
   * Limpia el carrito y los datos de sesión de invitado tras un pago exitoso.
   */
  private limpiarTrasExito(orderId: number): void {
    this.cartService.clearCart();
    this.cartSync.markRecovered();
    if (this.isGuest()) this.guestSession.clear();
    this.analyticsService.trackPurchase(String(orderId), this.finalTotal());
  }

  /**
   * Cancela un pedido en el backend cuando el pago falla o es rechazado.
   * No lanza error al llamador — la cancelación es best-effort.
   *
   * @param orderId ID del pedido a cancelar
   * @param motivo  Razón de cancelación (ej. 'PAGO_FALLIDO', 'TIMEOUT')
   */
  private cancelarPedido(orderId: number, motivo: string): void {
    this.orderService.cancelOrder(orderId, motivo).subscribe({
      error: () => {
        // Ignorar error de cancelación — el backend tiene proceso batch de limpieza
        console.warn(`No se pudo cancelar el pedido ${orderId} con motivo ${motivo}`);
      }
    });
  }

  /**
   * Procesa el pago con tarjeta usando MercadoPago.
   *
   * Orden correcto del flujo:
   * 1. Validar precondiciones (carrito, dirección, invitado)
   * 2. Crear pedido en estado PENDIENTE_PAGO → obtener orderId real
   * 3. Tokenizar tarjeta con MP Brick simulado
   * 4. Enviar token al backend con el orderId real
   * 5a. Pago APROBADO → confirmar pago en backend → limpiar carrito → navegar a confirmación
   * 5b. Pago RECHAZADO → cancelar pedido (restaura stock) → mostrar error al usuario
   */
  async payWithCard() {
    if (!this.cardNumber() || !this.expiryDate() || !this.cvv() || !this.cardholderName()) {
      this.errorMessage.set('Por favor completa todos los campos de la tarjeta');
      return;
    }
    if (!this.validarPrecondicionesPago()) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    let orderId: number;
    try {
      // Paso 1: crear pedido ANTES del pago para obtener un orderId real
      orderId = await this.crearPedidoPendiente();
    } catch (err: unknown) {
      this.isLoading.set(false);
      const mensaje = err instanceof Error ? err.message : 'Error al crear el pedido';
      this.errorMessage.set(mensaje);
      return;
    }

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

    // Paso 2: tokenizar tarjeta (MP Brick simulado — nunca enviar datos raw al backend)
    this.mercadopagoService.createCardToken(cardData).subscribe({
      next: (token) => {
        // Paso 3: procesar pago en el backend con token + orderId real
        this.mercadopagoService.processCardPayment(
          token,
          this.finalTotal(),
          orderId,
          this.selectedPaymentMethod()
        ).subscribe({
          next: (result) => {
            if (result.status === 'approved') {
              // Paso 4a: confirmar pago en backend → navegar a confirmación
              this.orderService.confirmPayment(orderId, result.paymentId).subscribe({
                next: () => {
                  this.isLoading.set(false);
                  this.limpiarTrasExito(orderId);
                  this.router.navigate(['/orders/confirmation', orderId]);
                },
                error: () => {
                  // El pago fue aprobado por el gateway pero el backend no pudo confirmar.
                  // Navegar igualmente — el backend tiene reconciliación batch.
                  this.isLoading.set(false);
                  this.limpiarTrasExito(orderId);
                  this.router.navigate(['/orders/confirmation', orderId]);
                }
              });
            } else {
              // Paso 4b: pago rechazado → cancelar pedido para restaurar stock
              this.cancelarPedido(orderId, 'PAGO_FALLIDO');
              this.isLoading.set(false);
              this.errorMessage.set('Pago ' + result.status + ': ' + (result.message ?? 'Verifica los datos de tu tarjeta'));
            }
          },
          error: (err: Error) => {
            // Error de red o del gateway → cancelar pedido
            this.cancelarPedido(orderId, 'PAGO_FALLIDO');
            this.isLoading.set(false);
            this.errorMessage.set(err.message ?? 'Error al procesar el pago. Intenta nuevamente.');
          }
        });
      },
      error: (err: Error) => {
        // Error al tokenizar → cancelar pedido
        this.cancelarPedido(orderId, 'PAGO_FALLIDO');
        this.isLoading.set(false);
        this.errorMessage.set('Error al tokenizar la tarjeta: ' + err.message);
      }
    });
  }

  /**
   * Inicia el flujo de pago con Yape:
   *
   * Orden correcto del flujo:
   * 1. Validar precondiciones
   * 2. Crear pedido en estado PENDIENTE_PAGO → obtener orderId real
   * 3. Crear intent Yape en el backend con el orderId real → retorna QR dinámico
   * 4. Mostrar QR + iniciar polling cada 3 segundos
   * 5a. APPROVED → confirmar pago en backend → navegar a confirmación/{orderId}
   * 5b. REJECTED/EXPIRED → cancelar pedido (restaura stock) → mostrar error
   */
  async initiateYapePayment() {
    if (!this.validarPrecondicionesPago()) {
      // Reusar el campo yapeError para no confundir al usuario
      this.yapeError.set(this.errorMessage() || 'Por favor selecciona una dirección de envío');
      this.errorMessage.set('');
      return;
    }

    this.yapeLoading.set(true);
    this.yapeError.set(null);
    this.yapeIntent.set(null);

    let orderId: number;
    try {
      // Paso 1: crear pedido ANTES de obtener el QR Yape
      orderId = await this.crearPedidoPendiente();
    } catch (err: unknown) {
      this.yapeLoading.set(false);
      const mensaje = err instanceof Error ? err.message : 'Error al crear el pedido';
      this.yapeError.set(mensaje);
      return;
    }

    // Paso 2: crear intent Yape con el orderId real
    this.mercadopagoService.processYapePayment(this.finalTotal(), orderId).subscribe({
      next: (intent) => {
        this.yapeLoading.set(false);
        this.yapeIntent.set(intent);
        this.startYapePolling(intent.transactionId, orderId);
      },
      error: (err: Error) => {
        // No se pudo crear el QR → cancelar pedido
        this.cancelarPedido(orderId, 'PAGO_FALLIDO');
        this.yapeLoading.set(false);
        this.yapeError.set('No se pudo generar el QR Yape: ' + err.message);
      }
    });
  }

  /**
   * Inicia polling del estado Yape cada 3 segundos.
   *
   * @param transactionId ID de transacción retornado por processYapePayment()
   * @param orderId       ID del pedido creado previamente (PENDIENTE_PAGO)
   */
  private startYapePolling(transactionId: string, orderId: number) {
    this.stopYapePolling();

    this.yapePollingInterval = setInterval(() => {
      this.mercadopagoService.getYapeStatus(transactionId).subscribe({
        next: (status) => {
          if (status.status === 'APPROVED') {
            this.stopYapePolling();
            // Confirmar pago en backend → navegar a confirmación con orderId real
            this.orderService.confirmPayment(orderId, transactionId).subscribe({
              next: () => {
                this.limpiarTrasExito(orderId);
                this.router.navigate(['/orders/confirmation', orderId]);
              },
              error: () => {
                // Pago aprobado por Yape pero el backend no confirmó.
                // Navegar igualmente — reconciliación batch del backend.
                this.limpiarTrasExito(orderId);
                this.router.navigate(['/orders/confirmation', orderId]);
              }
            });
          } else if (status.status === 'REJECTED' || status.status === 'EXPIRED') {
            this.stopYapePolling();
            // Cancelar pedido para restaurar stock
            this.cancelarPedido(orderId, status.status === 'EXPIRED' ? 'TIMEOUT' : 'PAGO_FALLIDO');
            this.yapeIntent.set(null);
            this.yapeError.set('Pago Yape ' + status.status.toLowerCase() + '. Por favor intenta nuevamente.');
          }
        },
        error: () => {
          // Ignorar errores de polling — el usuario puede reintentar
        }
      });
    }, 3000);

    // Auto-cancelar polling después de 5 minutos (expiración del QR Yape)
    setTimeout(() => {
      this.stopYapePolling();
      if (this.yapeIntent()) {
        this.cancelarPedido(orderId, 'TIMEOUT');
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

  /** Helper de validación para el formulario de dirección — usado en template con [error]. */
  errAddress(field: string): string {
    const c = this.addressForm.get(field);
    if (!c || c.pristine || c.valid) return '';
    if (c.hasError('required')) return 'Campo requerido';
    return 'Campo inválido';
  }

  /** Helper de validación para el formulario de invitado — usado en template con [error]. */
  errGuest(field: string): string {
    const c = this.guestForm.get(field);
    if (!c || c.pristine || c.valid) return '';
    if (c.hasError('required')) return 'Campo requerido';
    if (c.hasError('email')) return 'Email inválido';
    return 'Campo inválido';
  }

  /**
   * Pago estándar sin gateway externo (efectivo, transferencia, contra entrega).
   * Crea el pedido directamente con estado PENDIENTE (sin PENDIENTE_PAGO intermedio)
   * ya que no hay un gateway que pueda fallar.
   */
  placeOrder() {
    if (!this.validarPrecondicionesPago()) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    const orderRequest = this.buildOrderRequest();

    this.orderService.createOrder(orderRequest).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        const orderId = response.id ?? (response as unknown as { orderId?: number }).orderId ?? 0;
        this.limpiarTrasExito(orderId);
        this.router.navigate(['/orders/confirmation', orderId]);
      },
      error: () => {
        this.errorMessage.set(this.translate.instant('checkout.orderError'));
        this.isLoading.set(false);
      }
    });
  }
}
