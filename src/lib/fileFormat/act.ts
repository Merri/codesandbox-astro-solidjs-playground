import { createPalette } from '../palette'
import { IndexedImagePaletteGroup } from './gif'

export function getActPaletteGroup(arrayBuffer: ArrayBuffer) {
	if (arrayBuffer.byteLength !== 772) return false

	const view = new DataView(arrayBuffer)

	let numberOfColors = view.getUint16(768, true)
	let transparentIndex: number | undefined = view.getUint16(770, true)

	if (numberOfColors === 0) return false

	if ((transparentIndex > 255 && transparentIndex < 0xffff) || numberOfColors > 256) {
		// See if it has been saved in incorrect byte order...
		numberOfColors = view.getUint16(768, false)
		transparentIndex = view.getUint16(770, false)

		if ((transparentIndex > 255 && transparentIndex < 0xffff) || numberOfColors > 256) {
			return false
		}
	}

	if (transparentIndex === 0xffff) transparentIndex = undefined

	const palette = createPalette(256)

	for (let i = 0, offset = 0; i < 256; i++, offset += 3) {
		palette[i] = {
			r: view.getUint8(offset),
			g: view.getUint8(offset + 1),
			b: view.getUint8(offset + 2),
		}
	}

	const group: IndexedImagePaletteGroup = {
		sourceFormat: 'ACT',
		sourceVariant: `Adobe Color Table`,
		canvasWidth: 0,
		canvasHeight: 0,
		mainColorIndex: 0,
		mainPaletteIndex: -1,
		palettes: [{ palette, numberOfColors, transparentIndex }],
		indexedImages: [],
		comments: [],
		errors: [],
	}

	return group
}
