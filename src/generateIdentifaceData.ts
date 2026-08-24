import { md5 } from "./md5";

export interface IdentifaceCell {
  row: number;
  col: number;
}

export interface IdentifaceData {
  /** rgb() color string derived from the first 3 hash bytes */
  foreground: string;
  /** filled grid cells to render */
  cells: IdentifaceCell[];
  /** grid is always gridSize x gridSize */
  gridSize: number;
}

const GRID_SIZE = 5;
const CHUNK_SIZE = 3;

/**
 * splits into non-overlapping chunks of `size`, dropping any incomplete
 * trailing chunk.
 */
function chunkDiscard<T>(list: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i + size <= list.length; i += size) {
    chunks.push(list.slice(i, i + size));
  }
  return chunks;
}

/**
 * [a, b, c, b, a] - a symmetric, "identicon-style" row.
 */
function mirrorRow(row: number[]): number[] {
  const [first, second] = row;
  return [...row, second, first];
}

/**
 * Deterministically derives Identiface data (color + which grid cells are
 * filled) from an arbitrary identifier string. Same identifier -> same
 * output, always. Pure & synchronous - safe to call during render,
 * including on the server.
 */
export function generateIdentifaceData(identifier: string): IdentifaceData {
  const hash = md5(identifier);

  const [r, g, b] = hash;
  const foreground = `rgb(${r}, ${g}, ${b})`;

  const grid = chunkDiscard(hash, CHUNK_SIZE)
    .map(mirrorRow)
    .flat()
    .map((value, index) => ({ value, index }));

  const cells: IdentifaceCell[] = grid
    .filter(({ value }) => value % 2 === 0)
    .map(({ index }) => ({
      row: Math.floor(index / GRID_SIZE),
      col: index % GRID_SIZE,
    }));

  return { foreground, cells, gridSize: GRID_SIZE };
}
