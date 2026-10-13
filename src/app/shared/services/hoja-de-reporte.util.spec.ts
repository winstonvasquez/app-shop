import { describe, expect, it } from 'vitest';
import { estilosDeReporte, hojaDeReporte, humanizarNombreDeArchivo } from './hoja-de-reporte.util';

const FECHA = '6/08/2026, 10:30:00';

describe('humanizarNombreDeArchivo', () => {
    it('convierte guiones y guiones bajos en espacios y capitaliza', () => {
        expect(humanizarNombreDeArchivo('ordenes-compra')).toBe('Reporte: Ordenes compra');
        expect(humanizarNombreDeArchivo('kardex_valorizado')).toBe('Reporte: Kardex valorizado');
    });

    it('colapsa separadores repetidos y recorta los de los extremos', () => {
        expect(humanizarNombreDeArchivo('-asientos__contables-')).toBe('Reporte: Asientos contables');
    });

    it('con nombre vacío no revienta: devuelve sólo el prefijo', () => {
        expect(humanizarNombreDeArchivo('')).toBe('Reporte: ');
    });
});

describe('hojaDeReporte', () => {
    const cabecera = ['Código', 'Descripción', 'Total'];
    const filas = [['P-1', 'Polo algodón', '99.90'], ['P-2', 'Casaca', '250.00']];

    it('respeta el layout de filas que asume el estilado: 0 título, 1-2 metadatos, 3 vacía, 4 cabecera, 5+ datos', () => {
        const { aoa } = hojaDeReporte(cabecera, filas, 'Catálogo', FECHA);
        expect(aoa[0][0]).toBe('Catálogo');
        expect(aoa[1][0]).toBe(`Generado: ${FECHA}`);
        expect(aoa[2][0]).toBe('Total de registros: 2');
        expect(aoa[3]).toEqual(['', '', '']);
        expect(aoa[4]).toEqual(cabecera);
        expect(aoa.slice(5)).toEqual(filas);
        expect(aoa.length).toBe(7);
    });

    it('rellena las tres filas combinadas hasta el ancho de la tabla', () => {
        const { aoa } = hojaDeReporte(cabecera, filas, 'Catálogo', FECHA);
        for (const r of [0, 1, 2]) {
            expect(aoa[r].length, `fila ${r}`).toBe(3);
            expect(aoa[r].slice(1), `fila ${r}`).toEqual(['', '']);
        }
    });

    it('sin filas el total sale en 0 y la hoja se queda en las 5 filas de estructura', () => {
        const { aoa } = hojaDeReporte(cabecera, [], 'Vacío', FECHA);
        expect(aoa[2][0]).toBe('Total de registros: 0');
        expect(aoa.length).toBe(5);
    });

    it('con cabecera vacía usa una columna mínima y no genera anchos', () => {
        const { aoa, anchos } = hojaDeReporte([], [], 'Sin columnas', FECHA);
        expect(aoa[0]).toEqual(['Sin columnas']);
        expect(aoa[3]).toEqual(['']);
        expect(anchos).toEqual([]);
    });

    it('una celda nula o ausente se escribe como cadena vacía, no como «null»', () => {
        const conHuecos = [['P-1', null, undefined]] as unknown as string[][];
        const { aoa } = hojaDeReporte(cabecera, conHuecos, 'Catálogo', FECHA);
        expect(aoa[5]).toEqual(['P-1', '', '']);
    });

    it('el ancho lo fija el contenido más largo de la columna, más dos de margen', () => {
        const { anchos } = hojaDeReporte(['A'], [['0123456789012345']], 'X', FECHA);
        expect(anchos).toEqual([{ wch: 18 }]);
    });

    it('el ancho nunca baja de 10 aunque todo sea corto (la cabecera tiene que leerse)', () => {
        expect(hojaDeReporte(['A'], [['x']], 'X', FECHA).anchos).toEqual([{ wch: 10 }]);
    });

    it('el ancho nunca pasa de 45: una observación larga no puede empujar las demás columnas', () => {
        const larga = 'x'.repeat(200);
        expect(hojaDeReporte(['A'], [[larga]], 'X', FECHA).anchos).toEqual([{ wch: 45 }]);
    });

    it('la cabecera cuenta para el ancho aunque no haya ninguna fila', () => {
        expect(hojaDeReporte(['Descripción del artículo'], [], 'X', FECHA).anchos).toEqual([{ wch: 26 }]);
    });

    it('una fila más corta que la cabecera no descuadra el ancho de las columnas que le faltan', () => {
        const { anchos } = hojaDeReporte(['A', 'Bbbbbbbbbbbb'], [['solo-una']], 'X', FECHA);
        expect(anchos).toEqual([{ wch: 10 }, { wch: 14 }]);
    });
});

describe('estilosDeReporte', () => {
    /** Coordenadas emitidas, en orden, para una hoja de `nCols` columnas y `nFilas` filas. */
    const celdas = (nCols: number, nFilas: number) =>
        [...estilosDeReporte(nCols, nFilas)].map(([r, c]) => `${r},${c}`);

    it('estila el título y los metadatos SÓLO en la columna 0: esas filas van combinadas', () => {
        expect(celdas(3, 5).slice(0, 3)).toEqual(['0,0', '1,0', '2,0']);
    });

    it('nunca toca la fila 3, que es la separadora', () => {
        expect(celdas(3, 8)).not.toContain('3,0');
    });

    it('estila la cabecera (fila 4) en todo el ancho', () => {
        expect(celdas(3, 5).slice(3)).toEqual(['4,0', '4,1', '4,2']);
    });

    it('estila cada celda de datos, de la fila 5 hasta el final de la hoja', () => {
        expect(celdas(2, 7).slice(5)).toEqual(['5,0', '5,1', '6,0', '6,1']);
    });

    it('sin filas de datos se queda en el título, los metadatos y la cabecera', () => {
        expect(celdas(2, 5)).toEqual(['0,0', '1,0', '2,0', '4,0', '4,1']);
    });

    it('con una sola columna sigue estilando cabecera y datos', () => {
        expect(celdas(1, 6)).toEqual(['0,0', '1,0', '2,0', '4,0', '5,0']);
    });

    it('el título y la cabecera llevan el azul corporativo; los datos, sólo rejilla', () => {
        const estilos = [...estilosDeReporte(1, 6)];
        expect(estilos[0][2]['fill']).toEqual({ patternType: 'solid', fgColor: { rgb: '2563EB' } });
        expect(estilos[3][2]['fill']).toEqual({ patternType: 'solid', fgColor: { rgb: '2563EB' } });
        expect(estilos[4][2]['fill']).toBeUndefined();
        expect(estilos[4][2]['border']).toBeDefined();
    });

    it('los metadatos van en cursiva y sin borde', () => {
        const meta = [...estilosDeReporte(1, 5)][1][2];
        expect(meta['font']).toEqual({ sz: 10, italic: true, color: { rgb: '64748B' } });
        expect(meta['border']).toBeUndefined();
    });

    it('el borde de la rejilla es fino y gris por los cuatro lados', () => {
        const fino = { style: 'thin', color: { rgb: 'E2E8F0' } };
        expect([...estilosDeReporte(1, 6)][4][2]['border'])
            .toEqual({ top: fino, bottom: fino, left: fino, right: fino });
    });
});
