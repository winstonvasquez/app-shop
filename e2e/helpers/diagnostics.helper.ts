import { Page, Request, Response } from '@playwright/test';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Recolector de diagnósticos de una página: errores de consola, excepciones no
 * capturadas y respuestas HTTP fallidas. Sirve para que la suite de navegación
 * reporte QUÉ está roto en cada vista en vez de limitarse a pasar o fallar.
 */

export interface HttpFailure {
    url: string;
    method: string;
    status: number;
}

export interface RouteDiagnostics {
    route: string;
    label: string;
    consoleErrors: string[];
    pageErrors: string[];
    httpFailures: HttpFailure[];
}

/** Ruido conocido del entorno de desarrollo que no indica una vista rota. */
const IGNORED_CONSOLE = [
    /Angular is running in development mode/i,
    /\[webpack-dev-server\]/i,
    /Download the Angular DevTools/i,
    /favicon\.ico/i,
    /ResizeObserver loop/i,
];

/**
 * Endpoints cuyo fallo no invalida la vista: telemetría, proveedores externos y
 * respuestas 404 que son parte del contrato (el POS pregunta si hay un turno
 * abierto y el backend responde 404 cuando no lo hay; el chat pregunta por la
 * conversación activa del cliente y responde 404 cuando no hay ninguna abierta).
 */
const IGNORED_REQUESTS = [
    /\/analytics\/api\/events/i,
    /google|facebook|apple/i,
    /\/api\/pos\/turno\/activo/i,
    /\/api\/chat\/conversaciones\/activa/i,
];

/**
 * Errores de consola que SÍ son un defecto de la vista aunque Angular no los propague
 * como excepción no capturada.
 *
 * Angular captura los errores que ocurren dentro de su ciclo de detección de cambios y
 * los escribe con `console.error` en vez de dejarlos llegar a `window.onerror`, así que
 * `page.on('pageerror')` NO los ve. Con eso, tres pantallas del ERP renderizaban una
 * lista vacía por un `@for` sobre un objeto `Page<T>` mal tipado como array
 * (`newCollection[Symbol.iterator] is not a function`) y la suite pasaba en verde.
 * Un icono no registrado en el set curado de lucide se manifiesta igual.
 */
export const CONSOLE_ERRORS_FATALES = [
    /Symbol\(Symbol\.iterator\)|\[Symbol\.iterator\] is not a function/i,
    /icon has not been provided by any available icon providers/i,
    /NG0(?:100|200|300|301|302|303|304|900|901|902|910|911|912|913)\b/,
    /is not a function/i,
    /Cannot read propert(?:y|ies) of (?:undefined|null)/i,
];

/** ¿Este texto de consola delata una vista defectuosa? */
export function esErrorFatalDeConsola(texto: string): boolean {
    return CONSOLE_ERRORS_FATALES.some(rx => rx.test(texto));
}

export class DiagnosticsCollector {
    private consoleErrors: string[] = [];
    private pageErrors: string[] = [];
    private httpFailures: HttpFailure[] = [];

    constructor(private readonly page: Page) {
        page.on('console', msg => {
            if (msg.type() !== 'error') return;
            const text = msg.text();
            if (IGNORED_CONSOLE.some(rx => rx.test(text))) return;
            this.consoleErrors.push(text);
        });
        page.on('pageerror', err => this.pageErrors.push(err.message));
        page.on('response', (res: Response) => {
            const req: Request = res.request();
            if (res.status() < 400) return;
            if (IGNORED_REQUESTS.some(rx => rx.test(res.url()))) return;
            this.httpFailures.push({ url: res.url(), method: req.method(), status: res.status() });
        });
    }

    /** Vacía lo acumulado; se llama antes de navegar a cada ruta. */
    reset(): void {
        this.consoleErrors = [];
        this.pageErrors = [];
        this.httpFailures = [];
    }

    snapshot(route: string, label: string): RouteDiagnostics {
        return {
            route,
            label,
            consoleErrors: [...this.consoleErrors],
            pageErrors: [...this.pageErrors],
            httpFailures: [...this.httpFailures],
        };
    }

    /** Fallos que se consideran bloqueantes para dar una vista por buena. */
    static isBroken(d: RouteDiagnostics): boolean {
        return d.pageErrors.length > 0 || d.httpFailures.some(f => f.status >= 500);
    }

    static describe(d: RouteDiagnostics): string {
        const parts: string[] = [];
        if (d.pageErrors.length) parts.push(`excepciones JS: ${d.pageErrors.join(' | ')}`);
        const server = d.httpFailures.filter(f => f.status >= 500);
        if (server.length) parts.push(`HTTP 5xx: ${server.map(f => `${f.status} ${f.method} ${f.url}`).join(' | ')}`);
        const client = d.httpFailures.filter(f => f.status >= 400 && f.status < 500);
        if (client.length) parts.push(`HTTP 4xx: ${client.map(f => `${f.status} ${f.method} ${f.url}`).join(' | ')}`);
        if (d.consoleErrors.length) parts.push(`consola: ${d.consoleErrors.slice(0, 3).join(' | ')}`);
        return parts.join('\n');
    }
}

/** Escribe el reporte acumulado para revisarlo fuera de Playwright. */
export function writeDiagnosticsReport(file: string, rows: RouteDiagnostics[]): void {
    mkdirSync(dirname(file), { recursive: true });
    const resumen = {
        generado: new Date().toISOString(),
        total: rows.length,
        conExcepciones: rows.filter(r => r.pageErrors.length > 0).length,
        con5xx: rows.filter(r => r.httpFailures.some(f => f.status >= 500)).length,
        con4xx: rows.filter(r => r.httpFailures.some(f => f.status >= 400 && f.status < 500)).length,
        conErroresConsola: rows.filter(r => r.consoleErrors.length > 0).length,
    };
    writeFileSync(file, JSON.stringify({ resumen, rutas: rows }, null, 2), 'utf8');
}

/**
 * Anexa el diagnóstico de una ruta a un .jsonl. Playwright recicla el worker
 * cuando un test falla, así que acumular en memoria pierde todo lo anterior:
 * el reporte tiene que escribirse ruta por ruta.
 */
export function appendDiagnostics(file: string, row: RouteDiagnostics): void {
    mkdirSync(dirname(file), { recursive: true });
    appendFileSync(file, JSON.stringify(row) + '\n', 'utf8');
}

/** Vacía el .jsonl al empezar una corrida. */
export function resetDiagnosticsLog(file: string): void {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, '', 'utf8');
}
