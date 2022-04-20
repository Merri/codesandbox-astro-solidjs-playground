import { PaletteItem } from '../../types/PaletteItem'
import { IndexedImagePaletteGroup } from './gif'

const systems = {
	c64: {
		colors: [
			'Black',
			'White',
			'Red',
			'Cyan',
			'Purple',
			'Green',
			'Blue',
			'Yellow',
			'Orange',
			'Brown',
			'Light Red',
			'Dark Gray',
			'Medium Gray',
			'Light Green',
			'Light Blue',
			'Light Gray',
		],
		dithers: [0x0, 0xe, 0x4, 0xc, 0x8, 0x4, 0x4, 0xc, 0x4, 0x4, 0x8, 0x4, 0x8, 0x8, 0x8, 0xc],
	},
	vic20: {
		colors: [
			'Black',
			'White',
			'Red',
			'Cyan',
			'Purple',
			'Green',
			'Blue',
			'Yellow',
			'Orange',
			'Light Orange',
			'Pink',
			'Light Cyan',
			'Light Purple',
			'Light Green',
			'Light Blue',
			'Light Yellow',
		],
		dithers: [0x0, 0xe, 0x4, 0xc, 0x8, 0x4, 0x4, 0xc, 0x4, 0x4, 0x8, 0x4, 0x8, 0x8, 0x8, 0xc],
	},
}

function detectVicePaletteVariant(palette: PaletteItem[]) {
	const paletteNames = palette
		.map(({ description }) => (description || '').replace(/#/g, ''))
		.join('#')
		.toLowerCase()

	if (palette.length === systems.c64.colors.length) {
		const c64Names = systems.c64.colors.join('#').toLowerCase()
		if (c64Names === paletteNames) return `VICE Commodore 64 Palette`
	}

	if (palette.length === systems.vic20.colors.length) {
		const vic20Names = systems.vic20.colors.join('#').toLowerCase()
		if (vic20Names === paletteNames) return `VICE Commodore VIC-20 Palette`
	}

	return 'VICE Palette'
}

// 16 * 11 chars - 1
const VICE_MINSIZE = 175

const colorMatch = /^([\dABCDEF][\dABCDEF]) ([\dABCDEF][\dABCDEF]) ([\dABCDEF][\dABCDEF]) ([\dABCDEF])$/i

export function getVicePaletteGroup(arrayBuffer: ArrayBuffer, lines: string[]) {
	if (arrayBuffer.byteLength < VICE_MINSIZE) return false

	// The nasty part about VICE format is that you can't really identify it.
	// Yes, most palettes do have a comment with VICE Palette file. But it is entirely possible to also omit it.
	const palette = lines.reduceRight<PaletteItem[]>((palette, line, index, all) => {
		let [beforeComment, afterComment = ''] = line.split(/\s*#/, 2)

		if (beforeComment.length && colorMatch.test(beforeComment)) {
			const [r, g, b, vplDither] = beforeComment.split(' ').map((number) => parseInt(number, 16) & 0xff)
			const item: PaletteItem = { r, g, b, vplDither }

			afterComment = afterComment.trim()

			if (!afterComment && index > 0) {
				let prevLine = all[index - 1].trim()
				if (prevLine[0] === '#') {
					afterComment = prevLine.slice(1).trim()
				}
			}

			if (afterComment) item.description = afterComment

			palette.push(item)
		}

		return palette
	}, [])

	if (palette.length === 0) return false

	palette.reverse()

	const group: IndexedImagePaletteGroup = {
		sourceFormat: 'VPL',
		sourceVariant: detectVicePaletteVariant(palette),
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
