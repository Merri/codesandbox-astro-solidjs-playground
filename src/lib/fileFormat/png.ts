import { generateCRC32 } from '../crc32'
import { asHex } from '../hex'
import { createPalette } from '../palette'
import { IndexedImagePaletteGroup } from './gif'

function isValidBitDepthForColorType(bitDepth: number, colorType: number): boolean {
	switch (colorType) {
		case 0: {
			return bitDepth === 1 || bitDepth === 2 || bitDepth === 4 || bitDepth === 8 || bitDepth === 16
		}

		case 3: {
			return bitDepth === 1 || bitDepth === 2 || bitDepth === 4 || bitDepth === 8
		}

		case 2:
		case 4:
		case 6: {
			return bitDepth === 8 || bitDepth === 16
		}

		default: {
			return false
		}
	}
}

const PNG_IDENTIFIER_1 = 0x89504e47
const PNG_IDENTIFIER_2 = 0x0d0a1a0a
const IHDR = 0x49484452
const PLTE = 0x504c5445

/** @todo This is smallest for one pixel 8-bit depth image... but what about 1-bit depth? */
const PNG_MINSIZE = 67

export function getPngPaletteGroup(arrayBuffer: ArrayBuffer) {
	if (arrayBuffer.byteLength < PNG_MINSIZE) return false
	const read = new DataView(arrayBuffer)
	if (read.getUint32(0, false) !== PNG_IDENTIFIER_1) return false
	if (read.getUint32(4, false) !== PNG_IDENTIFIER_2) return false
	if (read.getUint32(8, false) !== 13) return false
	if (read.getUint32(12, false) !== IHDR) return false
	const width = read.getUint32(16, false)
	const height = read.getUint32(20, false)

	const group: IndexedImagePaletteGroup = {
		sourceFormat: 'PNG',
		sourceVariant: '',
		canvasWidth: width,
		canvasHeight: height,
		mainColorIndex: 0,
		mainPaletteIndex: -1,
		palettes: [],
		indexedImages: [],
		comments: [],
		errors: [],
	}

	const bitDepth = read.getUint8(24)
	const colorType = read.getUint8(25)
	const compressionMethod = read.getUint8(26)
	const filterMethod = read.getUint8(27)
	const interlaceMethod = read.getUint8(28)
	const ihdrCrc32 = read.getUint32(29, false)

	if (width === 0 || height === 0) {
		group.errors.push(`Critical error: width or height is zero`)
		return group
	}

	if (!isValidBitDepthForColorType(bitDepth, colorType)) {
		group.errors.push(`Bit depth (0x${asHex(bitDepth)}) and color type (0x${asHex(colorType)}) mismatch`)
		return group
	}

	if (compressionMethod !== 0) {
		group.errors.push(`Unknown compression method (${asHex(compressionMethod)})`)
		return group
	}

	if (filterMethod !== 0) {
		group.errors.push(`Unknown filter method (${asHex(filterMethod)})`)
		return group
	}

	if (interlaceMethod > 1) {
		group.errors.push(`Unknown interlace method (${asHex(interlaceMethod)})`)
		return group
	}

	const expectedIhdrCrc32 = generateCRC32(new Uint8Array(arrayBuffer, 12, 17))
	if (ihdrCrc32 !== expectedIhdrCrc32) {
		group.errors.push(
			`IHDR: checksum mismatch, expected 0x${asHex(expectedIhdrCrc32, 8)}, got 0x${asHex(ihdrCrc32, 8)}`
		)
	}

	const decoder = new TextDecoder('ascii')

	for (let readPos = 33; readPos < read.byteLength - 11; ) {
		const chunkSize = read.getUint32(readPos, false)

		const buffer = new Uint8Array(arrayBuffer, readPos + 4, chunkSize + 4)
		const expectedCrc32 = generateCRC32(buffer)
		const actualCrc32 = read.getUint32(readPos + 8 + chunkSize, false)

		if (actualCrc32 !== expectedCrc32) {
			group.errors.push(
				`${decoder.decode(buffer.slice(0, 4))}: checksum mismatch, expected 0x${asHex(
					expectedCrc32,
					8
				)}, got 0x${asHex(actualCrc32, 8)}`
			)
		}

		switch (read.getUint32(readPos + 4, false)) {
			case PLTE: {
				const numberOfColors = chunkSize / 3
				const palette = createPalette(numberOfColors)
				for (let i = 0; i < numberOfColors; i++) {
					let colorPos = readPos + 8 + i * 3
					palette[i] = {
						r: read.getUint8(colorPos),
						g: read.getUint8(colorPos + 1),
						b: read.getUint8(colorPos + 2),
					}
				}
				group.palettes.push({ palette, numberOfColors })
				break
			}
		}

		readPos += chunkSize + 12
	}

	return group
}
