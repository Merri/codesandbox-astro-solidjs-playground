import { PaletteItem } from '../../types/PaletteItem'
import { cmyk2rgb, lab2rgb, RGBarray } from '../colorSpace'
import { asHex } from '../hex'
import { IndexedImagePaletteGroup } from './gif'

// bytes required to store one color with empty block names
const ASE_MIN_SIZE = 52
const ASE_SIGNATURE = 0x41534546
const ASE_VERSION = 0x00010000

const ASE_BLOCK_START = 0xc001
const ASE_BLOCK_END = 0xc002
const ASE_COLOR_BLOCK = 0x0001

const AseColorSpaceEnum = {
	RGB: 0x52474220,
	CMYK: 0x434d594b,
	Lab: 0x4c414220,
	Gray: 0x47726179,
} as const
type AseColorSpaceEnum = typeof AseColorSpaceEnum[keyof typeof AseColorSpaceEnum]

function aseGray(value: number): RGBarray {
	const color = value * 255
	return [color, color, color]
}

function aseRGB(red: number, green: number, blue: number): RGBarray {
	return [red * 255, green * 255, blue * 255]
}

export function getAsePaletteGroup(arrayBuffer: ArrayBuffer) {
	if (arrayBuffer.byteLength < ASE_MIN_SIZE) return false
	const read = new DataView(arrayBuffer)
	if (read.getUint32(0, false) !== ASE_SIGNATURE) return false
	if (read.getUint32(4, false) !== ASE_VERSION) return false

	const group: IndexedImagePaletteGroup = {
		sourceFormat: 'ASE',
		sourceVariant: 'Adobe Swatches Exchange',
		canvasWidth: 0,
		canvasHeight: 0,
		mainColorIndex: 0,
		mainPaletteIndex: -1,
		palettes: [],
		indexedImages: [],
		comments: [],
		errors: [],
	}

	const numberOfBlocks = read.getUint32(8, false)
	let blockIsOpen = false
	let palette: PaletteItem[] = []
	let paletteName = ''
	const decoder = new TextDecoder('utf-16be')

	for (let b = 0, readPos = 12; b < numberOfBlocks; b++) {
		const blockType = read.getUint16(readPos, false)
		const blockSize = read.getUint32(readPos + 2, false)
		readPos += 6

		let blockStart = readPos

		switch (blockType) {
			case ASE_BLOCK_START: {
				if (blockIsOpen) {
					group.errors.push(`Critical error: opening block when block is already open`)
					return group
				} else if (palette.length) {
					// support colors outside named blocks
					group.palettes.push({ palette, numberOfColors: palette.length })
					palette = []
				}
				const blockNameSize = read.getUint16(readPos, false)
				paletteName =
					blockNameSize > 1
						? decoder.decode(new Uint16Array(arrayBuffer, readPos + 2, blockNameSize - 1))
						: ''
				blockIsOpen = true
				break
			}

			case ASE_BLOCK_END: {
				if (!blockIsOpen) {
					group.errors.push(`Critical error: closing block when block is already closed`)
					return group
				}
				group.palettes.push({ description: paletteName, palette, numberOfColors: palette.length })
				palette = []
				paletteName = ''
				blockIsOpen = false
				break
			}

			case ASE_COLOR_BLOCK: {
				const blockNameSize = read.getUint16(readPos, false)
				const colorName =
					blockNameSize > 1
						? decoder.decode(new Uint16Array(arrayBuffer, readPos + 2, blockNameSize - 1))
						: ''
				readPos += 2 + blockNameSize * 2

				const colorSpace = read.getUint32(readPos, false)

				switch (colorSpace) {
					case AseColorSpaceEnum.CMYK: {
						const [r, g, b] = cmyk2rgb(
							read.getFloat32(readPos + 4, false),
							read.getFloat32(readPos + 8, false),
							read.getFloat32(readPos + 12, false),
							read.getFloat32(readPos + 16, false)
						)
						palette.push({ r, g, b, description: colorName })
						break
					}

					case AseColorSpaceEnum.Gray: {
						const [r, g, b] = aseGray(read.getFloat32(readPos + 4, false))
						palette.push({ r, g, b, description: colorName })
						break
					}

					case AseColorSpaceEnum.Lab: {
						const [r, g, b] = lab2rgb(
							read.getFloat32(readPos + 4, false),
							read.getFloat32(readPos + 8, false),
							read.getFloat32(readPos + 12, false)
						)
						palette.push({ r, g, b, description: colorName })
						break
					}

					case AseColorSpaceEnum.RGB: {
						const [r, g, b] = aseRGB(
							read.getFloat32(readPos + 4, false),
							read.getFloat32(readPos + 8, false),
							read.getFloat32(readPos + 12, false)
						)
						palette.push({ r, g, b, description: colorName })
						break
					}

					default: {
						group.errors.push(`Unknown color space 0x${asHex(colorSpace, 8)}`)
					}
				}

				break
			}

			default: {
				group.errors.push(`Unknown block type 0x${asHex(blockType, 8)}`)
			}
		}

		readPos = blockStart + blockSize
	}

	// support colors outside named blocks
	if (palette.length) {
		group.palettes.push({ palette, numberOfColors: palette.length })
	}

	return group
}
