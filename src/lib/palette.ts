import { PaletteItem } from '../types/PaletteItem'
import { IndexedImagePaletteGroup } from './fileFormat/gif'

/** Create a palette with 256 items. */
export function createPalette(numberOfColors = 256, empty = true): (PaletteItem | null)[] {
	const palette: null[] = new Array(numberOfColors).fill(null)
	return empty ? palette : palette.map<PaletteItem>(() => ({ r: 0, g: 0, b: 0 }))
}

export function getPaletteIndex(group: IndexedImagePaletteGroup, palette: (PaletteItem | null)[]) {
	return group.palettes.findIndex((group) => {
		return (
			group.palette.length === palette.length &&
			group.palette.every((itemA, index) => {
				const itemB = palette[index]
				if (itemA == null && itemB == null) {
					return true
				} else if (itemA == null || itemB == null) {
					return false
				} else if (
					itemA.r === itemB.r &&
					itemA.g === itemB.g &&
					itemA.b === itemB.b &&
					itemA.description === itemB.description &&
					itemA.opacity === itemB.opacity
				) {
					return true
				}
				return false
			})
		)
	})
}
