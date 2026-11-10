import { CURRENCY_DISPLAY, MONEDA } from '@shared/constants/sunat.constants';

export interface SaldoMoneda { moneda: string; monto: number; }

/** Símbolo de la moneda; sin moneda informada se asume PEN. */
export function simboloMoneda(moneda?: string): string {
    return moneda === MONEDA.USD ? CURRENCY_DISPLAY.SYMBOL_USD : CURRENCY_DISPLAY.SYMBOL_PEN;
}

/** Suma por moneda (nunca mezcla PEN con USD). PEN siempre aparece; el resto sólo si tiene filas. */
export function sumarPorMoneda(items: { moneda?: string; monto: number }[]): SaldoMoneda[] {
    const acc = new Map<string, number>([[MONEDA.PEN, 0]]);
    for (const i of items) {
        const m = i.moneda ?? MONEDA.PEN;
        acc.set(m, (acc.get(m) ?? 0) + (i.monto ?? 0));
    }
    return [...acc.entries()].map(([moneda, monto]) => ({ moneda, monto }));
}
