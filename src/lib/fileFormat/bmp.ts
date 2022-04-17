import { createPalette } from '../palette'
import { IndexedImagePaletteGroup } from './gif'

const bmpIdentifiers = new Set([
	0x424d, // Windows BM
	0x4241, // OS/2 BA
	0x4349, // OS/2 CI
	0x4350, // OS/2 CP
	0x4943, // OS/2 IC
	0x5054, // OS/2 PT
])

const BmpHeaderSize = {
	BitmapCore: 12,
	BitmapCore2: 64,
	OS22XBitmap: 16, // but the actual header size is 64
	BitmapInfo: 40,
	BitmapV2Info: 52,
	BitmapV3Info: 56,
	BitmapV4: 108,
	BitmapV5: 124,
} as const
type BmpHeaderSize = typeof BmpHeaderSize[keyof typeof BmpHeaderSize]

const bmpHeaderLookup = new Map<number, [headerSize: BmpHeaderSize, bytesPerPixel: 3 | 4, planesAndBppOffset: 22 | 26]>(
	[
		[BmpHeaderSize.BitmapCore, [12, 3, 22]],
		[BmpHeaderSize.BitmapCore2, [64, 3, 22]],
		[BmpHeaderSize.OS22XBitmap, [64, 3, 22]],
		[BmpHeaderSize.BitmapInfo, [40, 4, 26]],
		[BmpHeaderSize.BitmapV2Info, [52, 4, 26]],
		[BmpHeaderSize.BitmapV3Info, [56, 4, 26]],
		[BmpHeaderSize.BitmapV4, [108, 4, 26]],
		[BmpHeaderSize.BitmapV5, [124, 4, 26]],
	]
)

function getVariantName(identifier: number) {
	switch (identifier) {
		case 0x424d:
			return 'Windows'
		case 0x4241:
			return 'OS/2 Bitmap Array'
		case 0x4349:
			return 'OS/2 Color Icon'
		case 0x4350:
			return 'OS/2 Color Pointer'
		case 0x4943:
			return 'OS/2 Icon'
		case 0x5054:
			return 'OS/2 Pointer'
		default:
			return 'Unknown'
	}
}

// this compression provides color mask in place of a palette
const BMP_COMPRESSION_BITFIELS_ENCODING = 3

/** @todo Read the indexed image */
export function getBmpPaletteGroup(arrayBuffer: ArrayBuffer) {
	const read = new DataView(arrayBuffer)
	const identifier = read.getUint16(0, false)
	if (!bmpIdentifiers.has(identifier)) return false

	// legacy BMP files may report 0 as filesize
	const fileLength = read.getUint32(2, true) || read.byteLength
	if (read.byteLength !== fileLength) return false

	// expect reserved values to be always null
	const reserved = read.getUint32(6, true)
	if (reserved !== 0) return false

	// figure out actual header size (BMP has a pretty wild history)
	const reportedHeaderSize = read.getUint32(14, true)
	const sizes = bmpHeaderLookup.get(reportedHeaderSize)
	if (sizes == null) return false

	const [headerSize, paletteSize, planesAndBppOffset] = sizes
	const imageOffset = read.getUint32(10, true)
	const paletteOffset = headerSize + 14
	if (imageOffset <= paletteOffset) return false

	const group: IndexedImagePaletteGroup = {
		sourceFormat: 'BMP',
		sourceVariant: `${getVariantName(identifier)} Bitmap`,
		canvasWidth: 0,
		canvasHeight: 0,
		mainColorIndex: 0,
		mainPaletteIndex: -1,
		palettes: [],
		indexedImages: [],
		comments: [],
		errors: [],
	}

	const compression = (headerSize === BmpHeaderSize.BitmapInfo && read.getUint32(30, true)) || 0
	// this compression provides color mask in place of a palette
	if (compression === BMP_COMPRESSION_BITFIELS_ENCODING) {
		group.errors.push(`BMP file is encoded in bitfields encoding and has no palette`)
		return group
	}

	const planesAndBpp = read.getUint32(planesAndBppOffset, true)
	if ((planesAndBpp & 0xffff) !== 1) {
		group.errors.push(`BMP reported other than one plane: ${planesAndBpp & 0xffff}`)
		return group
	}

	const entries = (paletteSize > 3 && read.getUint32(46, true)) || 1 << (planesAndBpp >>> 16)

	if (entries >= 2 && entries <= 256) {
		const palette = createPalette(entries)
		const is4Byte = paletteSize === 4 || undefined

		for (let i = 0; i < entries; i++) {
			const readPos = paletteOffset + i * paletteSize
			palette[i] = {
				b: read.getUint8(readPos),
				g: read.getUint8(readPos + 1),
				r: read.getUint8(readPos + 2),
				bmpReserved: is4Byte && read.getUint8(readPos + 3),
			}
		}

		group.mainPaletteIndex = group.palettes.length
		group.palettes.push({
			palette,
			numberOfColors: entries,
		})
	} else {
		group.errors.push(`BMP should contain 2 to 256 colors in palette, but reports to have ${entries}`)
	}

	return group
}
