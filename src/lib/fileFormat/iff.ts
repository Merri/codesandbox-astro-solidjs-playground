import { cp437ToString } from '../cp437'
import { asHex } from '../hex'
import { createPalette } from '../palette'
import { createEmptyImage, IndexedImagePaletteGroup } from './gif'

const IFF_HEADER = 0x464f524d
const IFF_COLOR_MAP = 0x434d4150
const IFF_BITMAP_HEADER = 0x424d4844
const IFF_BODY = 0x424f4459

/**
 * TODO: add support for decoding indexed image data (not only the palette)
 */
export function getIffPaletteGroup(arrayBuffer: ArrayBuffer) {
	const read = new DataView(arrayBuffer)
	if (read.getUint32(0, false) !== IFF_HEADER) return false
	const chunkSize = read.getUint32(4, false)
	if (read.byteLength !== chunkSize + 8) return false

	const header = cp437ToString(new Uint8Array(arrayBuffer, 8, 4))

	const group: IndexedImagePaletteGroup = {
		sourceFormat: 'IFF',
		sourceVariant: header.trim(),
		canvasWidth: 0,
		canvasHeight: 0,
		mainColorIndex: 0,
		mainPalette: createPalette(),
		mainPaletteSize: 0,
		mainPaletteImages: [],
		comments: [],
		images: [],
		errors: [],
	}

	// if (!['ILBM', 'PBM '].includes(header)) return group

	let nextImage = createEmptyImage()
	let nextPalette = group.mainPalette
	let nextPaletteColors = 0
	const mainImage = nextImage

	for (let readPos = 12, jumpSize = 0; readPos < read.byteLength; readPos += jumpSize) {
		const chunkType = read.getUint32(readPos, false)
		const chunkSize = read.getUint32(readPos + 4, false)
		jumpSize = chunkSize + (chunkSize & 1) + 8

		console.log(`Chunk: 0x${asHex(chunkType, 8)}, ${cp437ToString(new Uint8Array(arrayBuffer, readPos, 4))}`)

		if (chunkType === IFF_BITMAP_HEADER) {
			const width = read.getUint16(readPos + 6, false)
			const height = read.getUint16(readPos + 8, false)
			const x = read.getInt16(readPos + 10, false)
			const y = read.getInt16(readPos + 12, false)
			const numPlanes = read.getUint8(readPos + 14)
			const mask = read.getUint8(readPos + 15)
			const compression = read.getUint8(readPos + 16)
			const pad1 = read.getUint8(readPos + 17)
			const transparentColor = read.getUint16(readPos + 18, false)
			const xAspect = read.getUint8(readPos + 20)
			const yAspect = read.getUint8(readPos + 21)
			const pageWidth = read.getInt16(readPos + 22, false)
			const pageHeight = read.getInt16(readPos + 24, false)
			nextImage.width = width
			nextImage.height = height
			nextImage.x = x
			nextImage.y = y
		} else if (chunkType === IFF_COLOR_MAP) {
			const afterPalette = readPos + 8 + chunkSize
			for (let i = 0, j = readPos + 8; j < afterPalette; j += 3, i++) {
				const r = read.getUint8(j)
				const g = read.getUint8(j + 1)
				const b = read.getUint8(j + 2)
				nextPalette[i] = { r, g, b }
			}
			const numberOfColors = chunkSize / 3
			nextPaletteColors = numberOfColors
		} else if (chunkType === IFF_BODY) {
			if (mainImage === nextImage) {
                group.mainPaletteImages.push(nextImage)
				group.mainPaletteSize = nextPaletteColors
			} else {
				group.images.push({
					...nextImage,
					palette: nextPalette,
					paletteSize: nextPaletteColors,
				})
			}
            nextImage = createEmptyImage()
            nextPalette = createPalette()
            nextPaletteColors = 0
		}
	}

	return group
}
