import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx-js-style';

/** Estilo de celda de xlsx-js-style (la lib no exporta tipos precisos). */
type CellStyle = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class ExportService {
    private readonly CORP = '2563EB';   // azul corporativo (header/título)
    private readonly BORDER = 'E2E8F0'; // gris borde

    exportCsv(filas: string[][], nombreArchivo: string): void {
        const contenido = filas
            .map(fila => fila.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\n');
        this.descargar(contenido, nombreArchivo + '.csv', 'text/csv;charset=utf-8;');
    }

    /**
     * Exporta un reporte XLSX real y formateado:
     *  - Banda de título con color corporativo + texto blanco
     *  - Metadatos de encabezado (generado, total de registros)
     *  - Fila de cabecera con color + bordes
     *  - Anchos de columna automáticos
     */
    exportExcel(cabecera: string[], filas: string[][], nombreArchivo: string, titulo?: string): void {
        const nCols = Math.max(cabecera.length, 1);
        const tituloReporte = titulo || this.humanizar(nombreArchivo);
        const fecha = new Date().toLocaleString('es-PE');

        const aoa: (string | number)[][] = [];
        aoa.push([tituloReporte, ...Array(nCols - 1).fill('')]);              // 0 título
        aoa.push([`Generado: ${fecha}`, ...Array(nCols - 1).fill('')]);       // 1 metadata
        aoa.push([`Total de registros: ${filas.length}`, ...Array(nCols - 1).fill('')]); // 2 metadata
        aoa.push(Array(nCols).fill(''));                                      // 3 separador
        aoa.push(cabecera);                                                   // 4 cabecera
        filas.forEach(f => aoa.push(f.map(c => String(c ?? ''))));           // 5+ datos

        const ws = XLSX.utils.aoa_to_sheet(aoa);

        // Título y metadata a todo el ancho
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: nCols - 1 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: nCols - 1 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: nCols - 1 } },
        ];

        const set = (r: number, c: number, style: CellStyle): void => {
            const ref = XLSX.utils.encode_cell({ r, c });
            const cell = (ws[ref] as Record<string, unknown>) ?? (ws[ref] = { t: 's', v: '' } as Record<string, unknown>);
            cell['s'] = style;
        };

        // Banda de título
        set(0, 0, {
            font: { bold: true, sz: 15, color: { rgb: 'FFFFFF' } },
            fill: { patternType: 'solid', fgColor: { rgb: this.CORP } },
            alignment: { horizontal: 'left', vertical: 'center' },
        });
        // Metadata
        for (const r of [1, 2]) {
            set(r, 0, { font: { sz: 10, italic: true, color: { rgb: '64748B' } } });
        }
        // Cabecera (fila 4)
        for (let c = 0; c < nCols; c++) {
            set(4, c, {
                font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
                fill: { patternType: 'solid', fgColor: { rgb: this.CORP } },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: this.borde(),
            });
        }
        // Datos
        for (let r = 5; r < aoa.length; r++) {
            for (let c = 0; c < nCols; c++) {
                set(r, c, { font: { sz: 10 }, alignment: { vertical: 'center' }, border: this.borde() });
            }
        }

        // Anchos por longitud de contenido
        ws['!cols'] = cabecera.map((h, c) => {
            const maxLen = Math.max(String(h).length, ...filas.map(f => String(f[c] ?? '').length));
            return { wch: Math.min(Math.max(maxLen + 2, 10), 45) };
        });
        ws['!rows'] = [{ hpt: 26 }, { hpt: 15 }, { hpt: 15 }];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
        const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        this.descargarBlob(blob, `${nombreArchivo}.xlsx`);
    }

    descargarTxt(contenido: string, nombreArchivo: string): void {
        this.descargar(contenido, nombreArchivo + '.txt', 'text/plain;charset=utf-8;');
    }

    private borde(): CellStyle {
        const s = { style: 'thin', color: { rgb: this.BORDER } };
        return { top: s, bottom: s, left: s, right: s };
    }

    private humanizar(s: string): string {
        const t = s.replace(/[-_]+/g, ' ').trim();
        return 'Reporte: ' + t.charAt(0).toUpperCase() + t.slice(1);
    }

    private descargar(contenido: string, nombre: string, tipo: string): void {
        this.descargarBlob(new Blob([contenido], { type: tipo }), nombre);
    }

    private descargarBlob(blob: Blob, nombre: string): void {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombre;
        a.click();
        URL.revokeObjectURL(url);
    }
}
