import { createPalette } from '../palette'
import { IndexedImagePaletteGroup } from './gif'

// GIMP Palette
const GIMP_IDENTIFIER_1 = 0x47494d50
const GIMP_IDENTIFIER_2 = 0x2050616c
const GIMP_IDENTIFIER_3 = 0x65747465

// identifier + empty name + # + 1 black color
const GIMP_MINSIZE = 27

const colorMatch = /^ *(\d+) +(\d+) +(\d+) *(?:\t(.*))?$/
const nameMatch = /^Name:(.*)$/

export function getGplPaletteGroup(arrayBuffer: ArrayBuffer, lines: string[]) {
	if (arrayBuffer.byteLength < GIMP_MINSIZE) return false

	const view = new DataView(arrayBuffer)
	if (view.getUint32(0, false) !== GIMP_IDENTIFIER_1) return false
	if (view.getUint32(4, false) !== GIMP_IDENTIFIER_2) return false
	if (view.getUint32(8, false) !== GIMP_IDENTIFIER_3) return false

	let name = lines.find((line) => nameMatch.test(line))
	if (name) name = name.slice(5).trim()

	const colors = lines.filter((line) => colorMatch.test(line))
	const numberOfColors = colors.length
	if (numberOfColors === 0) return false

	const group: IndexedImagePaletteGroup = {
        description: name,
		sourceFormat: 'GPL',
		sourceVariant: `Gimp Palette`,
		canvasWidth: 0,
		canvasHeight: 0,
		mainColorIndex: 0,
		mainPaletteIndex: -1,
		palettes: [],
		indexedImages: [],
		comments: [],
		errors: [],
	}

	const palette = createPalette(numberOfColors)

	colors.forEach((line, index) => {
		const [, red, green, blue, colorName] = colorMatch.exec(line) || []
		palette[index] = {
			r: parseInt(red, 10) & 0xff,
			g: parseInt(green, 10) & 0xff,
			b: parseInt(blue, 10) & 0xff,
			description: colorName || undefined,
		}
	})

	group.palettes.push({ palette, numberOfColors })

	return group
}
