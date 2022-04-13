import { PaletteItem } from '../../types/PaletteItem'
import { cp437ToString } from '../cp437'
import { asHex } from '../hex'
import { createPalette } from '../palette'

const GIF_IDENTIFIER_1 = 0x47494638
const GIF_87A = 0x3761
const GIF_89A = 0x3961

const GIF_EXTENSION = 0x21
const GIF_IMAGE_DESCRIPTOR = 0x2c
const GIF_TRAILER = 0x3b

const GIF_EXTENSION_PLAIN_TEXT = 0x01
const GIF_EXTENSION_GRAPHICS_CONTROL = 0xf9
const GIF_EXTENSION_COMMENT = 0xfe
const GIF_EXTENSION_APPLICATION = 0xff

type DISPOSAL_MODE = 'keep' | 'background' | 'previous'

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

export interface IndexedImagePaletteGroup {
	sourceFormat: string
	sourceVariant: string
	canvasWidth: number
	canvasHeight: number
	mainColorIndex: number
	mainPalette: (PaletteItem | null)[]
	mainPaletteSize: number
	mainPaletteImages: IndexedImage[]
	images: IndexedPaletteImage[]
	animationRepeat?: number
	comments: string[]
	errors: string[]
}

export function createEmptyImage(): IndexedImage {
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
 * TODO: add support for decoding indexed image data (not only the palette)
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

	const group: IndexedImagePaletteGroup = {
		sourceFormat: 'GIF',
		sourceVariant: version === GIF_89A ? 'Version89a' : 'Version87a',
		canvasWidth: read.getUint16(6, true),
		canvasHeight: read.getUint16(8, true),
		mainColorIndex: read.getUint8(11),
		mainPalette: createPalette(),
		mainPaletteSize: 0,
		mainPaletteImages: [],
		comments: [],
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
			group.mainPalette[i] = { r, g, b }
		}
		group.mainPaletteSize = numberOfColors
	}

	let nextImage = createEmptyImage()

	while (readPos < read.byteLength) {
		const blockType = read.getUint8(readPos++)

		switch (blockType) {
			case GIF_TRAILER: {
				if (readPos < read.byteLength) {
					group.errors.push(`Error reading GIF: file continues after trailer`)
				}
				break
			}

			case GIF_IMAGE_DESCRIPTOR: {
				nextImage.x = read.getInt16(readPos, true)
				nextImage.y = read.getInt16(readPos + 2, true)
				nextImage.width = read.getInt16(readPos + 4, true)
				nextImage.height = read.getInt16(readPos + 6, true)
				const flags = read.getUint8(readPos + 8)
				readPos += 9

				const hasLocalColorTable = (flags & 0x80) === 0x80
				// TODO: handle interlaced image
				// const isInterlaced = (flags & 0x40) === 0x40
				// const isSorted = (flags & 0x20) === 0x20

				if (hasLocalColorTable) {
					const numberOfColors = Math.pow(2, (flags & 0x7) + 1)
					const paletteSize = numberOfColors * 3
					const blockAfterPalette = readPos + paletteSize
					const palette = createPalette()
					for (let i = 0; readPos < blockAfterPalette; readPos += 3, i++) {
						const r = read.getUint8(readPos)
						const g = read.getUint8(readPos + 1)
						const b = read.getUint8(readPos + 2)
						palette[i] = { r, g, b }
					}
					group.images.push({
						...nextImage,
						palette,
						paletteSize: numberOfColors,
					})
				} else {
					group.mainPaletteImages.push(nextImage)
				}

				console.log('After Local Palette', readPos, asHex(readPos, 4))

				// skip LZW minimum code size
				readPos++
				// TODO: decode LZW compressed image instead of skipping through
				for (
					let bytesToSkip = read.getUint8(readPos++);
					bytesToSkip !== 0;
					bytesToSkip = read.getUint8(readPos++)
				) {
					readPos += bytesToSkip
				}

				console.log('pos', readPos, asHex(readPos, 4))

				nextImage = createEmptyImage()
				break
			}

			case GIF_EXTENSION: {
				const label = read.getUint8(readPos++)
				let blockSize = read.getUint8(readPos++)

				if (label === GIF_EXTENSION_PLAIN_TEXT) {
					readPos += blockSize
					blockSize = read.getUint8(readPos++)
					// NOTE: we ignore this data just like everyone else
				} else if (label === GIF_EXTENSION_GRAPHICS_CONTROL) {
					const flags = read.getUint8(readPos)
					const disposal = (flags >>> 2) & 0x7
					nextImage.isTransparent = (flags & 1) === 1
					nextImage.disposalMode =
						(disposal === 2 && 'background') || (disposal === 3 && 'previous') || 'keep'
					nextImage.duration = read.getUint16(readPos + 1, true)
					nextImage.transparentColorIndex = read.getUint8(readPos + 3)
				} else if (label === GIF_EXTENSION_COMMENT) {
					// NOTE: all text should be 7-bit ASCII
					group.comments.push(cp437ToString(new Uint8Array(arrayBuffer, readPos, blockSize)))
				} else if (label === GIF_EXTENSION_APPLICATION) {
					// NOTE: all text should be 7-bit ASCII
					const application = cp437ToString(new Uint8Array(arrayBuffer, readPos, blockSize))

					readPos += blockSize
					blockSize = read.getUint8(readPos++)

					if (application === 'NETSCAPE2.0') {
						if (blockSize !== 3) {
							group.errors.push(`Error reading GIF: Netscape Application data wasn't size of 3`)
							return group
						}
						const alwaysOne = read.getUint8(readPos)
						if (alwaysOne !== 1) {
							group.errors.push(`Error reading GIF: Netscape Application data first byte by was not 1`)
							return group
						}
						group.animationRepeat = read.getUint16(readPos + 1, true)
					} else {
						group.errors.push(`Error reading GIF: unknown application "${application}"`)
					}
				} else {
					group.errors.push(`Error reading GIF: Encountered unknown extension label 0x${asHex(label)}`)
				}

				readPos += blockSize

				if (read.getUint8(readPos++) !== 0) {
					group.errors.push(`Error reading GIF: block extension did not end to 0x00`)
				}

				break
			}

			default: {
				group.errors.push(`Error reading GIF: unknown block type 0x${asHex(blockType)}`)
				return group
			}
		}
	}

	return group
}
