import { PaletteItem } from '../../types/PaletteItem'
import { IndexedImagePaletteGroup } from './gif'

const colorMatch = /^([\dABCDEF][\dABCDEF])([\dABCDEF][\dABCDEF])([\dABCDEF][\dABCDEF])([\dABCDEF][\dABCDEF])$/i

/**
 * Header that is apparently on every file, but since it is a text file you can do whatever you want with it.
 * So we can't even really trust that the file would contain "Paint.NET" anywhere in it.
 * 
 * ```
 * ; Paint.NET Palette File
 * ; Lines that start with a semicolon are comments
 * ; Colors are written as 8-digit hexadecimal numbers: aarrggbb
 * ; For example, this would specify green: FF00FF00
 * ; The alpha ('aa') value specifies how transparent a color is. FF is fully opaque, 00 is fully transparent.
 * ; A palette must consist of ninety six (96) colors. If there are less than this, the remaining color
 * ; slots will be set to white (FFFFFFFF). If there are more, then the remaining colors will be ignored.
 * ```
 */
export function getPaintNetPaletteGroup(arrayBuffer: ArrayBuffer, lines: string[]) {
	if (arrayBuffer.byteLength > 4096) return false

	const palette = lines.reduce<PaletteItem[]>((palette, line) => {
		if (line.length === 0 || line[0] === ';') return palette

		const argb = colorMatch.exec(line)
		if (argb) {
			const [opacity, r, g, b] = argb.slice(1, 5).map((number) => parseInt(number, 16) & 0xff)
			palette.push({ r, g, b, opacity })
		}

		return palette
	}, [])

	// If we actually followed their instructions then anything other than 96 is not good.
	if (palette.length === 0) return false

	// I hope we have learned our lesson and we will never again define a file format to a TXT file.
	const group: IndexedImagePaletteGroup = {
		sourceFormat: 'TXT',
		sourceVariant: `Paint.NET Palette`,
		canvasWidth: 0,
		canvasHeight: 0,
		mainColorIndex: 0,
		mainPaletteIndex: -1,
		palettes: [{ palette, numberOfColors: palette.length }],
		indexedImages: [],
		comments: [],
		errors: [],
	}

	return group
}
