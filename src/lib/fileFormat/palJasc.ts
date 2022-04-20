import { createPalette } from '../palette'
import { IndexedImagePaletteGroup } from './gif'

const JASC_IDENTIFIER = 0x4a415343
const JASC_PALETTE = 0x2d50414c
// 16 black colors
const JASC_MINSIZE = 126

export function getJascPaletteGroup(arrayBuffer: ArrayBuffer, lines: string[]) {
	if (arrayBuffer.byteLength < JASC_MINSIZE) return false

	const view = new DataView(arrayBuffer)
	if (view.getUint32(0, false) !== JASC_IDENTIFIER) return false
	if (view.getUint32(4, false) !== JASC_PALETTE) return false

	const group: IndexedImagePaletteGroup = {
		sourceFormat: 'PAL',
		sourceVariant: 'Jasc Palette',
		canvasWidth: 0,
		canvasHeight: 0,
		mainColorIndex: 0,
		mainPaletteIndex: -1,
		palettes: [],
		indexedImages: [],
		comments: [],
		errors: [],
	}

	if (lines[1] !== '0100') {
		group.errors.push(`Unknown identifier, espected 0100, got ${lines[1]}`)
		return group
	}

	const numberOfColors = parseInt(lines[2], 10)
	if (numberOfColors < 1) {
		group.errors.push(`Invalid number of colors: ${numberOfColors}`)
		return group
	}

	const colors = lines.slice(3).filter((line) => line)
	if (colors.length < numberOfColors) {
		group.errors.push(`Less possible colors in file (${colors.length}) than reported ${numberOfColors}`)
		return group
	}

	const palette = createPalette(colors.length)

	colors.forEach((color, index) => {
		const rgb = color.split(' ').map((value) => parseInt(value, 10))
		palette[index] = {
			r: rgb[0] & 0xff,
			g: rgb[1] & 0xff,
			b: rgb[2] & 0xff,
		}
	})

	group.palettes.push({ palette, numberOfColors })

	return group
}
