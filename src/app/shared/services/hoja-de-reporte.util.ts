/** Matriz de celdas que consume `XLSX.utils.aoa_to_sheet` (array of arrays). */
export type Aoa = (string | number)[][];

/** Ancho de columna en caracteres, como lo espera `ws['!cols']`. */
export interface AnchoDeColumna { wch: number; }

/** Estilo de celda de xlsx-js-style (la lib no exporta tipos precisos). */
export type CellStyle = Record<string, unknown>;

/** Una celda con estilo: fila, columna y el estilo que le toca. */
export type CeldaConEstilo = [r: number, c: number, style: CellStyle];

const CORP = '2563EB';   // azul corporativo (banda de título y cabecera)
const BORDER = 'E2E8F0'; // gris del borde de la rejilla
const METADATO = '64748B';

/** Rejilla fina alrededor de la celda. Los cuatro lados comparten la misma definición. */
function borde(): CellStyle {
    const s = { style: 'thin', color: { rgb: BORDER } };
    return { top: s, bottom: s, left: s, right: s };
}

/**
 * Título por defecto de un reporte cuando la pantalla no da uno: se humaniza el nombre del
 * archivo (`ordenes-compra` → `Reporte: Ordenes compra`). Guiones y guiones bajos son
 * separadores de palabra, no parte del texto.
 */
export function humanizarNombreDeArchivo(nombre: string): string {
    const t = nombre.replace(/[-_]+/g, ' ').trim();
    return 'Reporte: ' + t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * Arma el contenido de la hoja de un reporte XLSX: la matriz de celdas y los anchos de columna.
 *
 * El layout de filas es un CONTRATO con quien aplica los estilos: fila 0 título, 1 y 2 metadatos,
 * 3 separadora, 4 cabecera y de la 5 en adelante los datos. Cambiar el orden aquí desalinea las
 * bandas de color y los bordes, que se pintan por número de fila.
 *
 * Las tres primeras filas se rellenan hasta el ancho de la tabla porque van combinadas
 * (`!merges`): sin las celdas vacías, la combinación deja huecos.
 *
 * Los anchos se calculan por el contenido más largo de cada columna, acotados entre 10 y 45
 * caracteres: por debajo la cabecera no se lee, y por encima una celda con una observación larga
 * dejaría el resto de columnas fuera de la pantalla.
 */
export function hojaDeReporte(
    cabecera: string[],
    filas: string[][],
    titulo: string,
    fecha: string,
): { aoa: Aoa; anchos: AnchoDeColumna[] } {
    const nCols = Math.max(cabecera.length, 1);
    const relleno = Array(nCols - 1).fill('');

    const aoa: Aoa = [
        [titulo, ...relleno],                              // 0 título
        [`Generado: ${fecha}`, ...relleno],                // 1 metadata
        [`Total de registros: ${filas.length}`, ...relleno], // 2 metadata
        Array(nCols).fill(''),                             // 3 separador
        cabecera,                                          // 4 cabecera
        ...filas.map(f => f.map(c => String(c ?? ''))),    // 5+ datos
    ];

    const anchos = cabecera.map((h, c) => {
        const maxLen = Math.max(String(h).length, ...filas.map(f => String(f[c] ?? '').length));
        return { wch: Math.min(Math.max(maxLen + 2, 10), 45) };
    });

    return { aoa, anchos };
}

/**
 * Qué estilo lleva cada celda del reporte, en el mismo layout de filas que arma `hojaDeReporte`:
 * la 0 es la banda de título, la 1 y la 2 los metadatos en cursiva, la 3 va sin estilo (es la
 * separadora) y de la 4 en adelante la rejilla — cabecera en azul y datos en cuerpo normal.
 *
 * Las tres primeras filas sólo estilan la columna 0 porque van combinadas: estilar el resto no
 * se ve y multiplicaría las celdas escritas por el ancho de la tabla.
 *
 * Es un GENERADOR a propósito: un reporte de decenas de miles de filas produce cientos de miles
 * de celdas, y materializarlas en un array antes de aplicarlas duplicaría la memoria del export
 * sin ninguna ventaja. Para probarlo basta con `[...estilosDeReporte(...)]`.
 */
export function* estilosDeReporte(nCols: number, nFilas: number): Generator<CeldaConEstilo> {
    yield [0, 0, {
        font: { bold: true, sz: 15, color: { rgb: 'FFFFFF' } },
        fill: { patternType: 'solid', fgColor: { rgb: CORP } },
        alignment: { horizontal: 'left', vertical: 'center' },
    }];

    for (const r of [1, 2]) {
        yield [r, 0, { font: { sz: 10, italic: true, color: { rgb: METADATO } } }];
    }

    for (let c = 0; c < nCols; c++) {
        yield [4, c, {
            font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
            fill: { patternType: 'solid', fgColor: { rgb: CORP } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: borde(),
        }];
    }

    for (let r = 5; r < nFilas; r++) {
        for (let c = 0; c < nCols; c++) {
            yield [r, c, { font: { sz: 10 }, alignment: { vertical: 'center' }, border: borde() }];
        }
    }
}
