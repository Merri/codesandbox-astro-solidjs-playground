import { cmyk2rgb, hsv2rgb, lab2rgb, RGBarray } from '../colorSpace'
import { asHex } from '../hex'
import { createPalette } from '../palette'
import { IndexedImagePaletteGroup } from './gif'

/**
 * ### Ones you can expect to find in ACO
 *
 * - RGB
 * - HSB
 * - CMYK
 * - Lab
 * - Gray
 *
 * ### Custom color spaces in ACO
 *
 * The details of a custom color's color data fields are not public and should be treated as a black box.
 *
 * - Pantone matching system
 * - Focoltone colour system
 * - Trumatch color
 * - Toyo 88 colorfinder 1050
 * - HKS colors
 *
 * @see https://www.adobe.com/devnet-apps/photoshop/fileformatashtml/
 */
export const AcoColorSpaceEnum = {
	colorCodeDummy: -1,
	RGB: 0,
	HSB: 1,
	CMYK: 2,
	Pantone: 3,
	Focoltone: 4,
	Trumatch: 5,
	Toyo: 6,
	Lab: 7,
	Gray: 8,
	WideCMYK: 9,
	HKS: 10,
	DIC: 11,
	TotalInk: 12,
	MonitorRGB: 13,
	Duotone: 14,
	Opacity: 15,
	Web: 16,
	GrayFloat: 17,
	RGBFloat: 18,
	OpacityFloat: 19,
} as const

export type AcoColorSpaceEnum = typeof AcoColorSpaceEnum[keyof typeof AcoColorSpaceEnum]

function acoCMYK(cyan: number, magenta: number, yellow: number, key: number): RGBarray {
	return cmyk2rgb(cyan / 655.35, magenta / 655.35, yellow / 655.35, key / 655.35)
}

function acoGray(gray: number): RGBarray {
	const color = (gray / 10000) * 255
	return [color, color, color]
}

function acoHSB(hue: number, saturation: number, brightness: number): RGBarray {
	return hsv2rgb(hue / 182.04, saturation / 655.35, brightness / 655.35)
}

function acoLab(L: number, a: number, b: number): RGBarray {
	return lab2rgb(L / 100, a / 100, b / 100)
}

function acoRGB(red: number, green: number, blue: number): RGBarray {
	return [red / 257, green / 257, blue / 257]
}

function acoWideCMYK(cyan: number, magenta: number, yellow: number, key: number): RGBarray {
	return cmyk2rgb(cyan / 100, magenta / 100, yellow / 100, key / 100)
}

/** @see AcoColorSpaceEnum */
function isValidColorSpace(colorSpace: number): boolean {
	return colorSpace >= 0 && colorSpace <= 19
}

export function getAcoPaletteGroup(arrayBuffer: ArrayBuffer) {
	const read = new DataView(arrayBuffer)
	if (read.getUint16(0, false) !== 1) return false
	const entriesV1 = read.getUint16(2, false)
	if (entriesV1 === 0) return false
	const fileSizeV1 = entriesV1 * 10 + 4
	if (fileSizeV1 > read.byteLength) return false
	if (!isValidColorSpace(read.getUint16(4, false))) return false

	const isV1 = fileSizeV1 === read.byteLength
	const isV2 = !isV1 && read.getUint16(fileSizeV1, false) === 2
	if (!isV1 && !isV2) return false

	const group: IndexedImagePaletteGroup = {
		sourceFormat: 'ACO',
		sourceVariant: isV1 ? 'Adobe Color Swatches version 1' : 'Adobe Color Swatches version 2',
		canvasWidth: 0,
		canvasHeight: 0,
		mainColorIndex: 0,
		mainPaletteIndex: -1,
		palettes: [],
		indexedImages: [],
		comments: [],
		errors: [],
	}

	const decoder = new TextDecoder('utf-16be')
	const reads = [[4, entriesV1]]
	if (isV2) reads.push([fileSizeV1 + 4, read.getUint16(fileSizeV1 + 2, false)])

	// read both V1 and V2 palette
	reads.forEach(([readPos, entries], index) => {
		const readingV2 = index > 0 || null
		const palette = createPalette(entries)
		for (let entry = 0; entry < entries; entry++) {
			const colorSpace = read.getUint16(readPos, false)

			switch (colorSpace) {
				case AcoColorSpaceEnum.CMYK: {
					const [r, g, b] = acoCMYK(
						read.getUint16(readPos + 2, false),
						read.getUint16(readPos + 4, false),
						read.getUint16(readPos + 6, false),
						read.getUint16(readPos + 8, false)
					)
					palette[entry] = { r, g, b }
					break
				}

				case AcoColorSpaceEnum.Gray: {
					const [r, g, b] = acoGray(read.getUint16(readPos + 2, false))
					palette[entry] = { r, g, b }
					break
				}

				case AcoColorSpaceEnum.HSB: {
					const [r, g, b] = acoHSB(
						read.getUint16(readPos + 2, false),
						read.getUint16(readPos + 4, false),
						read.getUint16(readPos + 6, false)
					)
					palette[entry] = { r, g, b }
					break
				}

				case AcoColorSpaceEnum.Lab: {
					const [r, g, b] = acoLab(
						read.getUint16(readPos + 2, false),
						read.getInt16(readPos + 4, false),
						read.getInt16(readPos + 6, false)
					)
					palette[entry] = { r, g, b }
					break
				}

				case AcoColorSpaceEnum.RGB: {
					const [r, g, b] = acoRGB(
						read.getUint16(readPos + 2, false),
						read.getUint16(readPos + 4, false),
						read.getUint16(readPos + 6, false)
					)
					palette[entry] = { r, g, b }
					break
				}

				case AcoColorSpaceEnum.WideCMYK: {
					const [r, g, b] = acoWideCMYK(
						read.getUint16(readPos + 2, false),
						read.getUint16(readPos + 4, false),
						read.getUint16(readPos + 6, false),
						read.getUint16(readPos + 8, false)
					)
					palette[entry] = { r, g, b }
					break
				}

				default: {
					group.errors.push(
						`Unknown or unsupported color space 0x${asHex(colorSpace, 4)} for color index ${entry}`
					)
				}
			}

			if (readingV2) {
				const size = read.getUint16(readPos + 12, false)
				const item = palette[entry]
				if (item) {
					// string is null terminated
					item.description =
						size > 1 ? decoder.decode(new Uint16Array(arrayBuffer, readPos + 14, size - 1)) : ''
				}
				readPos += 14 + size * 2
			} else {
				readPos += 10
			}
		}

		// point main palette reference to V2 if it exists
		group.mainPaletteIndex = group.palettes.length
		group.palettes.push({ palette, numberOfColors: entries })
	})

	return group
}
