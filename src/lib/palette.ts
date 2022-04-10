import { PaletteItem } from '../types/PaletteItem'

/** Create a palette with 256 items. */
export function createPalette(empty = true): (PaletteItem | null)[] {
	const palette: null[] = new Array(256).fill(null)
	return empty ? palette : palette.map<PaletteItem>(() => ({ r: 0, g: 0, b: 0 }))
}
