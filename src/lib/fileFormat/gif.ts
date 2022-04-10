const GIF_IDENTIFIER_1 = 0x47494638
const GIF_87A = 0x3761
const GIF_89A = 0x3961

const GIF_EXTENSION = 0x021
const GIF_IMAGE_DESCRIPTOR = 0x2c
const GIF_TRAILER = 0x3b

const GIF_EXTENSION_GRAPHICS_CONTROL = 0xf9
const GIF_EXTENSION_PLAIN_TEXT = 0x01
const GIF_EXTENSION_COMMENT = 0xfe
const GIF_EXTENSION_APPLICATION = 0xff

type DISPOSAL_MODE = 'keep' | 'background' | 'previous'

import { PaletteItem } from '../../types/PaletteItem'
import { asHex } from '../hex'
import { createPalette } from '../palette'

interface IndexedImage {
	x: number
	y: number
	width: number
	height: number
	arrayBuffer: ArrayBuffer
	isTransparent: boolean
	transparentColorIndex: number
	duration: number
	disposalMode: DISPOSAL_MODE
}

interface IndexedPaletteImage extends IndexedImage {
	palette: (PaletteItem | null)[]
	paletteSize: number
}

interface PaletteGroup {
	sourceFormat: string
	sourceVariant: string
	canvasWidth: number
	canvasHeight: number
	mainColorIndex: number
	mainPalette: (PaletteItem | null)[]
	mainPaletteSize: number
	mainPaletteImages: IndexedImage[]
	images: IndexedPaletteImage[]
	errors: string[]
}

function createEmptyImage(): IndexedImage {
	return {
		arrayBuffer: new ArrayBuffer(0),
		duration: 0,
		isTransparent: false,
		transparentColorIndex: 0,
		x: 0,
		y: 0,
		width: 0,
		height: 0,
		disposalMode: 'keep',
	}
}

/**
 * TODO: add support for reading Local Color Tables
 * @see http://www.matthewflickinger.com/lab/whatsinagif/bits_and_bytes.asp
 * @see https://upload.wikimedia.org/wikipedia/commons/a/aa/SmallFullColourGIF.gif
 */
export function getGifPaletteGroup(arrayBuffer: ArrayBuffer) {
	const read = new DataView(arrayBuffer)
	if (read.getUint32(0, false) !== GIF_IDENTIFIER_1) return false
	const version = read.getUint16(4, false)
	if (version !== GIF_87A && version !== GIF_89A) return false
	// [0][000][0][000] = GCT flag, color resolution, sort flag, number of colors
	const descriptor = read.getUint8(10)
	const hasGlobalColorTable = (descriptor & 0x80) === 0x80

	const paletteGroup: PaletteGroup = {
		sourceFormat: 'GIF',
		sourceVariant: version === GIF_89A ? 'Version89a' : 'Version87a',
		canvasWidth: read.getUint16(6, true),
		canvasHeight: read.getUint16(8, true),
		mainColorIndex: read.getUint8(11),
		mainPalette: createPalette(),
		mainPaletteSize: 0,
		mainPaletteImages: [],
		images: [],
		errors: [],
	}

	let readPos = 13

	if (hasGlobalColorTable) {
		// const colorResolution = ((descriptor >>> 4) & 0x7) + 1
		// const isSorted = (descriptor & 0x8) === 0x8
		const numberOfColors = Math.pow(2, (descriptor & 0x7) + 1)
		const paletteSize = numberOfColors * 3
		const blockAfterPalette = readPos + paletteSize
		for (let i = 0; readPos < blockAfterPalette; readPos += 3, i++) {
			const r = read.getUint8(readPos)
			const g = read.getUint8(readPos + 1)
			const b = read.getUint8(readPos + 2)
			paletteGroup.mainPalette[i] = { r, g, b }
		}
		paletteGroup.mainPaletteSize = paletteSize
	}

	let nextImage = createEmptyImage()

	while (readPos < read.byteLength) {
		const blockType = read.getUint8(readPos++)

		switch (blockType) {
			case GIF_TRAILER: {
				break
			}

			case GIF_IMAGE_DESCRIPTOR: {


                nextImage = createEmptyImage()
				break
			}

			case GIF_EXTENSION: {
				const label = read.getUint8(readPos++)
				let blockSize = read.getUint8(readPos++)

				if (label === GIF_EXTENSION_GRAPHICS_CONTROL) {
					const flags = read.getUint8(readPos)
					const disposal = (descriptor >>> 2) & 0x7
					nextImage.isTransparent = (flags & 1) === 1
					nextImage.disposalMode =
						(disposal === 2 && 'background') || (disposal === 3 && 'previous') || 'keep'
					nextImage.duration = read.getUint16(readPos + 1, true)
					nextImage.transparentColorIndex = read.getUint8(readPos + 3)
				}

                if (label === GIF_EXTENSION_PLAIN_TEXT) {
                    readPos += blockSize
                    blockSize = read.getUint8(readPos)
                    // TODO: store the text
                }

                if (label === GIF_EXTENSION_COMMENT) {
                    // TODO: store the comment
                }

                if (label === GIF_EXTENSION_APPLICATION) {
                    readPos += blockSize
                    blockSize = read.getUint8(readPos)
                    // TODO: check for NETSCAPE2.0
                    // TODO: read animation loop
                }

				readPos += blockSize

				if (read.getUint8(readPos++) !== 0) {
					paletteGroup.errors.push(`Error reading GIF: block extension did not end to 0x00`)
					break
				}
			}

			default: {
				paletteGroup.errors.push(`Error reading GIF: unknown block type 0x${asHex(blockType)}`)
				return paletteGroup
			}
		}
	}

	return paletteGroup
}
