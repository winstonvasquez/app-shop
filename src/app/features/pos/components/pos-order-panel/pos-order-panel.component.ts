import { Component, ChangeDetectionStrategy, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CatalogSelectComponent } from '@shared/components';
import { CatalogService } from '@core/services/catalog.service';
import { PosCarritoService } from '../../services/pos-carrito.service';
import { CartItem, DescuentoTipo } from '../../models/catalogo-pos.model';
import { MetodoPagoPos, PagoMixto, TipoCpe } from '../../models/venta-pos.model';
import { estadoInicialDescuento, requiereAutorizacionSupervisor } from './pos-order-panel.descuento';

@Component({
    selector: 'app-pos-order-panel',
    standalone: true,
    imports: [FormsModule, TranslateModule, CatalogSelectComponent],
    templateUrl: './pos-order-panel.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosOrderPanelComponent {

    readonly carrito = inject(PosCarritoService);
    private readonly catalog = inject(CatalogService);

    /** True mientras la venta se está procesando — deshabilita Cobrar (anti doble-venta). */
    readonly isProcessing = input(false);

    readonly procesarVenta = output<void>();
    readonly irAlNumpad = output<void>();
    readonly giftCardLookup = output<string>();
    /** Descuento de línea que excede el umbral del cajero → requiere PIN de supervisor. */
    readonly requestSupervisorAuth = output<{ varianteId: number; tipo: DescuentoTipo; valor: number }>();

    /** Descuento máximo (%) que un cajero puede aplicar sin autorización de supervisor. */
    readonly MAX_DESCUENTO_SIN_AUTH = 10;

    /** Icono e i18nKey por código no vienen del catálogo (solo lista válida + label ES) — se mantienen localmente. */
    private readonly PAYMENT_ICON: Partial<Record<MetodoPagoPos, string>> = {
        EFECTIVO: 'cash', TARJETA: 'card', YAPE: 'yape', PLIN: 'plin',
    };
    private readonly PAYMENT_I18N: Partial<Record<MetodoPagoPos, string>> = {
        EFECTIVO: 'pos.panel.cash', TARJETA: 'pos.panel.card', YAPE: 'pos.panel.yape', PLIN: 'pos.panel.plin',
    };
    private readonly CPE_I18N: Record<TipoCpe, string> = {
        BOLETA: 'pos.panel.boleta', FACTURA: 'pos.panel.factura', SIN_CPE: 'pos.panel.sinCpe',
    };

    /** Métodos de pago disponibles como botón rápido (excluye MIXTO/GIFT_CARD, que tienen flujo propio). */
    readonly paymentMethods = computed(() =>
        this.catalog.options('METODO_PAGO_POS')()
            .filter(o => o.codigo in this.PAYMENT_ICON)
            .map(o => ({
                id: o.codigo as MetodoPagoPos,
                icon: this.PAYMENT_ICON[o.codigo as MetodoPagoPos] ?? 'cash',
                i18nKey: this.PAYMENT_I18N[o.codigo as MetodoPagoPos] ?? o.valor,
            }))
    );

    /** Métodos seleccionables por línea en pago dividido (mismo universo que paymentMethods). */
    readonly splitMethods = computed(() =>
        this.paymentMethods().map(m => ({ id: m.id as Exclude<MetodoPagoPos, 'MIXTO'>, i18nKey: m.i18nKey }))
    );

    readonly cpeOptions = computed(() =>
        this.catalog.options('TIPO_CPE')().map(o => ({
            id: o.codigo as TipoCpe,
            i18nKey: this.CPE_I18N[o.codigo as TipoCpe] ?? o.valor,
        }))
    );

    /** ID de variante con popover de descuento abierto */
    readonly discountPopoverFor = signal<number | null>(null);
    readonly discountType = signal<DescuentoTipo>('PORCENTAJE');
    readonly discountValue = signal<number>(0);

    toggleDiscountPopover(varianteId: number): void {
        if (this.discountPopoverFor() === varianteId) {
            this.discountPopoverFor.set(null);
            return;
        }
        const inicial = estadoInicialDescuento(this.lineaDe(varianteId));
        this.discountType.set(inicial.tipo);
        this.discountValue.set(inicial.valor);
        this.discountPopoverFor.set(varianteId);
    }

    private lineaDe(varianteId: number): CartItem | undefined {
        return this.carrito.items().find(i => i.variante.varianteId === varianteId);
    }

    applyLineDiscount(varianteId: number): void {
        const tipo = this.discountType();
        const valor = this.discountValue();
        if (valor > 0 && tipo !== 'NINGUNO') {
            if (requiereAutorizacionSupervisor(tipo, valor, this.lineaDe(varianteId), this.MAX_DESCUENTO_SIN_AUTH)) {
                // Cerrar popover y delegar al padre la verificación del PIN de supervisor;
                // el descuento se aplica solo si el backend autoriza.
                this.discountPopoverFor.set(null);
                this.requestSupervisorAuth.emit({ varianteId, tipo, valor });
                return;
            }
            this.carrito.setLineDiscount(varianteId, tipo, valor);
        } else {
            this.carrito.clearLineDiscount(varianteId);
        }
        this.discountPopoverFor.set(null);
    }

    removeLineDiscount(varianteId: number): void {
        this.carrito.clearLineDiscount(varianteId);
        this.discountPopoverFor.set(null);
    }

    onDiscountValueChange(event: Event): void {
        this.discountValue.set(parseFloat((event.target as HTMLInputElement).value) || 0);
    }

    onClienteChange(nombre: string): void {
        this.carrito.setCliente(null, nombre);
    }

    onDescuentoChange(event: Event): void {
        const val = parseFloat((event.target as HTMLInputElement).value) || 0;
        this.carrito.setDescuento(val);
    }

    onMontoRecibidoChange(event: Event): void {
        const val = parseFloat((event.target as HTMLInputElement).value) || 0;
        this.carrito.setMontoRecibido(val);
    }

    onPagoMontoChange(index: number, event: Event): void {
        const val = parseFloat((event.target as HTMLInputElement).value) || 0;
        this.carrito.setPagoMonto(index, val);
    }

    onPagoMetodoChange(index: number, event: Event): void {
        const metodo = (event.target as HTMLSelectElement).value as Exclude<MetodoPagoPos, 'MIXTO'>;
        this.carrito.setPagoMetodo(index, metodo);
    }

    fmt(val: number | undefined | null): string {
        return (val ?? 0).toFixed(2);
    }

    onGiftCardLookup(codigo: string): void {
        if (codigo.trim()) {
            this.giftCardLookup.emit(codigo.trim());
        }
    }

    bgColor(id: number): string {
        return 'prod-bg-' + (id % 7);
    }
}
