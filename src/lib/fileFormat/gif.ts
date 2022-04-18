import { PaletteItem } from '../../types/PaletteItem'
import { validEncodingLabels } from '../textEncoding'
import { cp437ToString } from '../cp437'
import { asHex } from '../hex'
import { createPalette, getPaletteIndex } from '../palette'

const GIF_IDENTIFIER_1 = 0x47494638
const GIF_87A = 0x3761
const GIF_89A = 0x3961

const GIF_EXTENSION = 0x21
const GIF_IMAGE_DESCRIPTOR = 0x2c
const GIF_TRAILER = 0x3b

const GIF_EXTENSION_PLAIN_TEXT = 0x01
const GIF_EXTENSION_GRAPHIC_CONTROL = 0xf9
const GIF_EXTENSION_COMMENT = 0xfe
const GIF_EXTENSION_APPLICATION = 0xff

const ContextType = {
	globalPalette: 'global-palette',
	header: 'header',
	trailer: 'trailer',
	imageDescriptor: 'image-descriptor',
	graphicControl: 'graphic-control',
	plainText: 'plain-text',
	comment: 'comment',
	application: 'application',
	unknown: 'unknown-extension',
} as const

type ContextType = typeof ContextType[keyof typeof ContextType]

export type DISPOSAL_MODE = 'keep' | 'background' | 'previous'

export interface IndexedImage {
	paletteIndex: number
	description?: string
	width: number
	height: number
	arrayBuffer: ArrayBuffer
	x: number
	y: number
	isTransparent: boolean
	transparentColorIndex: number
	duration: number
	disposalMode: DISPOSAL_MODE
}

export interface IndexedPalette {
	description?: string
	numberOfColors?: number
	palette: (PaletteItem | null)[]
	/** Color that is entirely transparent */
	transparentIndex?: number
	/** Blackest color in palette */
	blackIndex?: number
	/** Whitest color in palette */
	whiteIndex?: number
	/** Legacy: color to display at edges of a CRT monitor image */
	borderIndex?: number
}

export interface IndexedImagePaletteGroup {
	description?: string
	sourceFormat: string
	sourceVariant: string
	canvasWidth: number
	canvasHeight: number
	mainColorIndex: number
	mainPaletteIndex: number
	indexedImages: IndexedImage[]
	palettes: IndexedPalette[]
	animationRepeat?: number
	comments: string[]
	errors: string[]
}

export function createEmptyImage(): IndexedImage {
	return {
		arrayBuffer: new ArrayBuffer(0),
		duration: 0,
		isTransparent: false,
		paletteIndex: -1,
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
		mainPaletteIndex: -1,
		palettes: [],
		indexedImages: [],
		comments: [],
		errors: [],
	}

	let readPos = 13

	if (hasGlobalColorTable) {
		// const colorResolution = ((descriptor >>> 4) & 0x7) + 1
		// const isSorted = (descriptor & 0x8) === 0x8
		const numberOfColors = Math.pow(2, (descriptor & 0x7) + 1)
		const paletteSize = numberOfColors * 3
		const blockAfterPalette = readPos + paletteSize
		const palette = createPalette(numberOfColors)
		for (let i = 0; readPos < blockAfterPalette; readPos += 3, i++) {
			palette[i] = {
				r: read.getUint8(readPos),
				g: read.getUint8(readPos + 1),
				b: read.getUint8(readPos + 2),
			}
		}
		group.mainPaletteIndex = group.palettes.length
		group.palettes.push({
			palette,
			numberOfColors,
		})
	}

	let prevContext: ContextType = hasGlobalColorTable ? 'global-palette' : 'header'
	// All existing text in GIF files should be 7-bit ASCII, but we read using DOS Code Page 437 by default.
	// Additionally we add our custom Application Extension "EncodingAPI" which uses standard web encoding to define a character encoding to use.
	let decoder: TextDecoder | undefined
	let nextImage = createEmptyImage()

	while (readPos < read.byteLength) {
		const blockType = read.getUint8(readPos++)

		switch (blockType) {
			case GIF_TRAILER: {
				prevContext = 'trailer'
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
				nextImage.arrayBuffer = new ArrayBuffer(nextImage.width * nextImage.height)
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
					const palette = createPalette(numberOfColors)
					for (let i = 0; readPos < blockAfterPalette; readPos += 3, i++) {
						palette[i] = {
							r: read.getUint8(readPos),
							g: read.getUint8(readPos + 1),
							b: read.getUint8(readPos + 2),
						}
					}

					let paletteIndex = getPaletteIndex(group, palette)
					if (paletteIndex === -1) {
						paletteIndex = group.palettes.length
						group.palettes.push({
							palette,
							numberOfColors,
						})
					}

					nextImage.paletteIndex = paletteIndex
				} else {
					nextImage.paletteIndex = group.mainPaletteIndex
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

				prevContext = 'image-descriptor'

				nextImage = createEmptyImage()
				break
			}

			case GIF_EXTENSION: {
				const label = read.getUint8(readPos++)
				let blockSize = read.getUint8(readPos++)

				if (label === GIF_EXTENSION_PLAIN_TEXT) {
					// NOTE: we ignore this data just like everyone else
					readPos += blockSize
					blockSize = read.getUint8(readPos++)
					prevContext = 'plain-text'
				} else if (label === GIF_EXTENSION_GRAPHIC_CONTROL) {
					const flags = read.getUint8(readPos)
					const disposal = (flags >>> 2) & 0x7
					nextImage.isTransparent = (flags & 1) === 1
					nextImage.disposalMode =
						(disposal === 2 && 'background') || (disposal === 3 && 'previous') || 'keep'
					nextImage.duration = read.getUint16(readPos + 1, true)
					nextImage.transparentColorIndex = read.getUint8(readPos + 3)
					// An interesting thing about GIF is that each image can have their own transparent color independent of the palette.
					// This means you could use all 256 colors of a global palette while still having transparent parts on the image.
					const palette = group.palettes[nextImage.paletteIndex]
					if (palette && palette.transparentIndex == null) {
						palette.transparentIndex = nextImage.transparentColorIndex
					}
					prevContext = 'graphic-control'
				} else if (label === GIF_EXTENSION_COMMENT) {
					const characters = new Uint8Array(arrayBuffer, readPos, blockSize)
					// NOTE: all text should be 7-bit ASCII
					const comment = decoder ? decoder.decode(characters) : cp437ToString(characters)

					// Totally non-standard logic where we just do "best-fit" work to place comments to a context
					switch (prevContext) {
						case 'global-palette': {
							group.palettes[0].description = comment
							break
						}
						case 'application':
						case 'header':
						case 'trailer': {
							if (group.description == null) {
								group.description = comment
							} else {
								group.comments.push(comment)
							}
							break
						}
						case 'image-descriptor': {
							const image = group.indexedImages[group.indexedImages.length - 1]
							const palette = group.palettes[image.paletteIndex]
							if (palette && palette.description == null) {
								palette.description = comment
							} else {
								group.comments.push(comment)
							}
							break
						}
						// NOTE: typically graphic control would be directly followed by image descriptor or plain text extension
						case 'graphic-control': {
							const image = group.indexedImages[group.indexedImages.length - 1]
							if (image.description == null) {
								image.description = comment
							} else {
								group.comments.push(comment)
							}
							break
						}
						default: {
							group.comments.push(comment)
						}
					}

					prevContext = 'comment'
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
					} else if (application === 'EncodingAPI') {
						// This is our custom application extension: define character set used in comments.
						const encoding = cp437ToString(new Uint8Array(arrayBuffer, readPos, blockSize))
						if (validEncodingLabels.has(encoding)) {
							decoder = new TextDecoder(encoding)
						} else {
							group.errors.push(`Unsupported encoding: ${encoding}`)
						}
					} else {
						group.errors.push(`Error reading GIF: unknown application "${application}"`)
					}
					prevContext = 'application'
				} else {
					group.errors.push(`Error reading GIF: Encountered unknown extension label 0x${asHex(label)}`)
					prevContext = 'unknown-extension'
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
