import { cp437ToString } from '../cp437'
import { asHex } from '../hex'
import { createPalette } from '../palette'
import { createEmptyImage, IndexedImagePaletteGroup } from './gif'

/** How to deal with BODY image data based on XBMI chunk */
const PictureTypeEnum = {
	/** As you would normally do with FORM.ILBM or FORM.PBM */
	Default: -1,
	/** Indexed palette: numcolors = 1<<depth */
	Palette: 0,
	/** Indexed greyscale: black = 0, white = (1<<depth)-1 */
	Grey: 1,
	/** Red Green Blue: bits per sample = depth/3 */
	RGB: 2,
	/** Red Green Blue Alpha: bits per sample = depth/4 */
	RGBA: 3,
	/** Cyan Magenta Yellow Black: bits per sample = depth/4 */
	CMYK: 4,
	/** Cyan Magenta Yellow Black Alpha: bits per sample = depth/5 */
	CMYKA: 5,
	/** One bit = one sample: white = 0, black = 1 */
	BW: 6,
} as const
type PictureTypeEnum = typeof PictureTypeEnum[keyof typeof PictureTypeEnum]

const FORM = 0x464f524d
const CMAP = 0x434d4150
const CNAM = 0x434e414d
const BMHD = 0x424d4844
const BODY = 0x424f4459
const XBMI = 0x58424d49

/**
 * @todo Add support for decoding indexed image data (not only the palette)
 * @todo Support LIST and CAT https://wiki.amigaos.net/wiki/A_Quick_Introduction_to_IFF
 * @todo CMYK
 * @todo CRNG & DRNG
 */
export function getIffPaletteGroup(arrayBuffer: ArrayBuffer) {
	const read = new DataView(arrayBuffer)
	if (read.getUint32(0, false) !== FORM) return false
	const chunkSize = read.getUint32(4, false)
	if (read.byteLength !== chunkSize + 8) return false

	const header = cp437ToString(new Uint8Array(arrayBuffer, 8, 4))

	const group: IndexedImagePaletteGroup = {
		sourceFormat: 'IFF',
		sourceVariant: `FORM ${header.trim()}`,
		canvasWidth: 0,
		canvasHeight: 0,
		mainColorIndex: 0,
		mainPaletteIndex: -1,
		palettes: [],
		indexedImages: [],
		comments: [],
		errors: [],
	}

	if (!['ILBM', 'PBM '].includes(header)) {
		group.errors.push(`Unknown IFF image variant: "${header}" (supported: "ILBM" and "PBM ")`)
	}

	let xbmiPictureType: PictureTypeEnum = PictureTypeEnum.Default
	let nextImage = createEmptyImage()
	let colorNames = new Map<number, string>()
	const decoder = new TextDecoder('latin1')

	for (let readPos = 12, jumpSize = 0; readPos < read.byteLength; readPos += jumpSize) {
		const chunkType = read.getUint32(readPos, false)
		const chunkSize = read.getUint32(readPos + 4, false)
		jumpSize = chunkSize + (chunkSize & 1) + 8

		console.log(`Chunk: 0x${asHex(chunkType, 8)}, ${cp437ToString(new Uint8Array(arrayBuffer, readPos, 4))}`)

		if (chunkType === BMHD) {
			const width = read.getUint16(readPos + 8, false)
			const height = read.getUint16(readPos + 10, false)
			const x = read.getInt16(readPos + 12, false)
			const y = read.getInt16(readPos + 14, false)
			const numPlanes = read.getUint8(readPos + 16)
			const mask = read.getUint8(readPos + 17)
			const compression = read.getUint8(readPos + 18)
			const pad1 = read.getUint8(readPos + 19)
			const transparentColor = read.getUint16(readPos + 20, false)
			const xAspect = read.getUint8(readPos + 22)
			const yAspect = read.getUint8(readPos + 23)
			const pageWidth = read.getInt16(readPos + 24, false)
			const pageHeight = read.getInt16(readPos + 26, false)
			nextImage.width = width
			nextImage.height = height
			nextImage.x = x
			nextImage.y = y
		} else if (chunkType === CMAP) {
			const numberOfColors = chunkSize / 3
			const palette = createPalette(numberOfColors)
			const afterPalette = readPos + 8 + chunkSize
			for (let i = 0, j = readPos + 8; j < afterPalette; j += 3, i++) {
				const r = read.getUint8(j)
				const g = read.getUint8(j + 1)
				const b = read.getUint8(j + 2)
				palette[i] = { r, g, b }
			}
			nextImage.paletteIndex = group.palettes.length
			group.palettes.push({ palette, numberOfColors })
		} else if (chunkType === CNAM) {
			const firstIndex = read.getUint16(readPos + 8, false)
			const lastIndex = read.getUint16(readPos + 10, false)
			const colorNum = lastIndex - firstIndex + 1
			const names = decoder.decode(new Uint8Array(arrayBuffer, readPos + 12, chunkSize - 5)).split('\0')
			if (names.length !== colorNum) {
				group.errors.push(`Expected ${colorNum} color names, got ${names.length}`)
			}
			names.forEach((name, index) => {
				colorNames.set(index + firstIndex, name)
			})
		} else if (chunkType === XBMI) {
			if (chunkSize === 6) {
				const type = read.getUint16(readPos + 8, false)
				xbmiPictureType =
					type >= 0 && type <= PictureTypeEnum.BW ? (type as PictureTypeEnum) : PictureTypeEnum.Default
				const xDpi = read.getUint16(readPos + 10, false)
				const yDpi = read.getUint16(readPos + 12, false)
			}
		} else if (chunkType === BODY) {
			nextImage = createEmptyImage()
		}
	}

	if (group.palettes.length === 1) {
		group.mainPaletteIndex = 0

		const palette = group.palettes[0].palette
		colorNames.forEach((colorName, index) => {
			const item = palette[index]
			if (item != null) {
				item.description = colorName
			}
		})
	}

	return group
}
