import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

/**
 * Configuración de exportación SERVER-SIDE para el data-table (o cualquier vista).
 * El backend genera el archivo (XLSX/CSV) con datos limpios; el frontend solo
 * dispara la descarga. Reemplaza la exportación client-side que serializaba el
 * HTML renderizado de la tabla.
 */
export interface BackendExportConfig {
  /** URL del endpoint backend que genera el archivo (sin `?format`). */
  url: string;
  /** Nombre base del archivo (sin extensión). Fallback si el backend no envía Content-Disposition. */
  filename?: string;
  /**
   * Parámetros de filtro a enviar (mismos que la lista). Es una FUNCIÓN para
   * evaluarse al momento del click y capturar el estado actual de los filtros.
   */
  params?: () => Record<string, string | number | boolean | null | undefined>;
}

@Injectable({ providedIn: 'root' })
export class BackendExportService {
  private readonly http = inject(HttpClient);

  /**
   * Descarga el archivo generado por el backend como blob y dispara la descarga
   * en el navegador. El JWT lo agrega el auth interceptor global; los errores los
   * maneja el http-error interceptor.
   */
  download(config: BackendExportConfig, format: 'csv' | 'xlsx'): void {
    let params = new HttpParams().set('format', format);
    const raw = config.params?.() ?? {};
    for (const [k, v] of Object.entries(raw)) {
      if (v !== null && v !== undefined && v !== '') {
        params = params.set(k, String(v));
      }
    }

    this.http
      .get(config.url, { params, responseType: 'blob', observe: 'response' })
      .subscribe({
        next: resp => {
          const blob = resp.body;
          if (!blob) return;
          const fallback = `${config.filename ?? 'export'}.${format}`;
          const nombre = this.filenameFromDisposition(resp.headers.get('Content-Disposition')) ?? fallback;
          this.triggerDownload(blob, nombre);
        },
        error: () => {
          /* Notificado por http-error.interceptor; no romper el flujo. */
        },
      });
  }

  /** Extrae el filename de un header Content-Disposition (soporta RFC 5987 `filename*`). */
  private filenameFromDisposition(header: string | null): string | null {
    if (!header) return null;
    const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(header);
    return match ? decodeURIComponent(match[1]) : null;
  }

  private triggerDownload(blob: Blob, nombre: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }
}
