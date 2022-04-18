import { PaletteEntryFlag } from '../../types/PaletteItem'
import { createPalette } from '../palette'
import { IndexedImagePaletteGroup, IndexedPalette } from './gif'

const RIFF = 0x52494646
const PAL = 0x50414c20

/** Windows LogPalette */
const data = 0x64617461
/** Palette header */
const plth = 0x706c7468
/** "Enhanced RIFF" options */
const opt = 0x6f707420

// headers + 16 colors
const minimumFileSize = 88

/** @todo Complete translation of the rigid ranges in RIFF once there is a structure for color ranges. */
export function getRiffPaletteGroup(arrayBuffer: ArrayBuffer) {
	if (arrayBuffer.byteLength < minimumFileSize) return false
	const view = new DataView(arrayBuffer)
	if (view.getUint32(0, false) !== RIFF) return false
	const fileSize = view.getUint32(4, true) + 8
	if (fileSize !== view.byteLength) return false
	if (view.getUint32(8, false) !== PAL) return false

	const group: IndexedImagePaletteGroup = {
		sourceFormat: 'RIFF',
		sourceVariant: `Invalid PAL`,
		canvasWidth: 0,
		canvasHeight: 0,
		mainColorIndex: 0,
		mainPaletteIndex: -1,
		palettes: [],
		indexedImages: [],
		comments: [],
		errors: [],
	}

	const chunkType = view.getUint32(12, false)
	const nextChunkOffset = view.getUint32(16, true) + 16
	let logPaletteOffset = 20

	// Page 52 onwards http://www-mmsp.ece.mcgill.ca/Documents/AudioFormats/WAVE/Docs/riffmci.pdf
	if (chunkType === data) {
		group.sourceVariant = 'Simple PAL'
	} else if (chunkType === plth) {
		group.sourceVariant = 'Extended PAL'

		const mapType = view.getUint32(20, true)
		if (mapType !== data) {
			group.errors.push(`Extended RIFF Palette in YUV or XYZ color space are not supported`)
			return group
		}

		logPaletteOffset += 26
	} else {
		return group
	}

	const windowsVersion = view.getUint16(logPaletteOffset, true)
	group.sourceVariant += ` (Windows version: ${windowsVersion})`

	const numberOfColors = view.getUint16(logPaletteOffset + 2, true)
	const palette = createPalette(numberOfColors)

	for (let i = 0; i < numberOfColors; i++) {
		const offset = logPaletteOffset + 4 + i * 4

		palette[i] = {
			r: view.getUint8(offset),
			g: view.getUint8(offset + 1),
			b: view.getUint8(offset + 2),
		}

		/**
		 * ```c++
		 * typedef struct tagPALETTEENTRY {
		 *   BYTE peRed;
		 *   BYTE peGreen;
		 *   BYTE peBlue;
		 *   BYTE peFlags;
		 *  } PALETTEENTRY;
		 * ```
		 *
		 * @see https://docs.microsoft.com/en-us/previous-versions/dd162769(v=vs.85)
		 */
		const flags = view.getUint8(offset + 3)

		if (flags !== 0 && (flags & 0xf8) === 0) {
			palette[i]!.riff = {
				explicit: (flags & PaletteEntryFlag.PC_EXPLICIT) !== 0,
				noCollapse: (flags & PaletteEntryFlag.PC_NOCOLLAPSE) !== 0,
				reserved: (flags & PaletteEntryFlag.PC_RESERVED) !== 0,
			}
		}
	}

	const indexedPalette: IndexedPalette = { palette, numberOfColors }

	if (chunkType === plth) {
		const whiteColorIndex = view.getUint16(24, true)
		const blackColorIndex = view.getUint16(26, true)
		const borderColorIndex = view.getUint16(28, true)

		/**
		 * 0xffff = ignore
		 * 0x0001 = first 16 colors contain VGA standard palette
		 * 0x0002 = Standard AVC 198 palette (but Internet does not know what that is)
		 */
		const registeredMap = view.getUint16(30, true)
		// continuous custom colors
		const customBase = view.getUint16(32, true)
		const customCount = view.getUint16(34, true)
		// continuous colors for menus, text, screen elements
		const reservedBase = view.getUint16(36, true)
		const reservedCount = view.getUint16(38, true)
		// continuous "art" colors for anti-aliasing, gradients from less strong to stronger intensity
		const artBase = view.getUint16(40, true)
		const artCount = view.getUint16(42, true)
		// how many colors each of the art gradients have
		const numIntense = view.getUint16(44, true)

		// The stuff above are kind of color ranges, but in a very, very ridig and limited structure.
		// Easy enough to somewhat convert to ILBM.CRNG or DRNG I guess, but doing the other way? Nope.

		if (whiteColorIndex !== 0xffff) indexedPalette.whiteIndex = whiteColorIndex
		if (blackColorIndex !== 0xffff) indexedPalette.blackIndex = blackColorIndex
		if (borderColorIndex !== 0xffff) indexedPalette.borderIndex = borderColorIndex
	}

	// See if this is "enhanced RIFF format" which contains this additional text field.
	if (nextChunkOffset < view.byteLength && view.getUint32(nextChunkOffset, false) === opt) {
		const optSize = view.getUint32(nextChunkOffset + 4, true)
		const decoder = new TextDecoder('ascii')
		/**
		 * ### Sample
		 * ```
		 * Transparent=255-0-255:-1;KeepUnmapped=0;Dither=0;SplitFixed=625;Precision=0;Size=256
		 * ```
		 * Don't know the meaning of KeepUnmapped, Dither, SplitFixed, or Precision. Also -1 is a mystery.
		 */
		const options = decoder
			.decode(arrayBuffer.slice(nextChunkOffset + 8, nextChunkOffset + 4 + optSize))
			// There apparently should be one null character, but PaletteMaker generated RIFFs have 5
			.replace(/\0+$/, '')
			.split(';')
			.reduce<Record<string, string>>((options, pair) => {
				const [key, value] = pair.split('=', 2)
				if (key && value) {
					options[key] = value
				}
				return options
			}, {})

		if (options.Transparent != null) {
			const [r, g, b] = options.Transparent.split(':')[0]
				.split('-')
				.map((value) => parseInt(value, 10))
			const transparentIndex = palette.findIndex((item) => item && item.r === r && item.g === g && item.b === b)
			if (transparentIndex !== -1) indexedPalette.transparentIndex = transparentIndex
		}

		if (options.Size != null) {
			indexedPalette.numberOfColors = parseInt(options.Size, 10)
		}
	}

	group.palettes.push(indexedPalette)

	return group
}
