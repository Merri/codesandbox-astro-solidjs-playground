/** @todo The booleans probably will need some work so that they really make sense against practical implementation. */
interface FileFormatInfo {
	name: string
	extensions: string[]
	mime: string
	colors: { min: number; max: number } | number[]
	/** Can each color in palette have alpha opacity? */
	colorAlpha: boolean
	/** Can define color cycling? */
	colorCycling: boolean
	/** Can define color ranges? */
	colorRanges: boolean
	/** Can contain paletted image? */
	imageIndexed: boolean
	/** Can contain image with alpha transparency? */
	imageAlpha: boolean
	/** Can a palette entry have a name? */
	namedColors: boolean
	/** Can the file have a name? */
	namedFile: boolean
	/** Can the palette have a name? */
	namedPalette: boolean
	/** Can contain multiple palettes? */
	multiplePalette: boolean
	/** Can define a single color as transparent? */
	transparencyAlpha: boolean
	/** Can define a single indexed palette entry to be transparent? */
	transparencyIndexed: boolean
}

/** Get array of file extensions valid for given format. */
export function getFileFormatInfo(format: string): FileFormatInfo {
	switch (format) {
		case 'ACO':
			return {
				colors: { min: 1, max: 65535 },
				colorAlpha: false,
				colorCycling: false,
				colorRanges: false,
				imageAlpha: false,
				imageIndexed: false,
				multiplePalette: false,
				namedColors: false,
				namedFile: false,
				namedPalette: false,
				transparencyAlpha: false,
				transparencyIndexed: false,
				name: 'Adobe Color Swatches',
				extensions: ['aco'],
				mime: 'application/octet-stream',
			}

		case 'ACT':
			return {
				colors: { min: 1, max: 256 },
				colorAlpha: false,
				colorCycling: false,
				colorRanges: false,
				imageAlpha: false,
				imageIndexed: false,
				multiplePalette: false,
				namedColors: false,
				namedFile: false,
				namedPalette: false,
				transparencyAlpha: false,
				transparencyIndexed: true,
				name: 'Adobe Color Table',
				extensions: ['act'],
				mime: 'application/octet-stream',
			}

		case 'ASE':
			return {
				colors: { min: 1, max: Infinity },
				colorAlpha: false,
				colorCycling: false,
				colorRanges: false,
				imageAlpha: false,
				imageIndexed: false,
				multiplePalette: true,
				namedColors: true,
				namedFile: false,
				namedPalette: true,
				transparencyAlpha: false,
				transparencyIndexed: false,
				name: 'Adobe Swathes Exchange',
				extensions: ['ase'],
				mime: 'application/octet-stream',
			}

		case 'BMP':
			return {
				colors: { min: 2, max: 256 },
				colorAlpha: false,
				colorCycling: false,
				colorRanges: false,
				imageAlpha: true,
				imageIndexed: true,
				multiplePalette: true,
				namedColors: false,
				namedFile: false,
				namedPalette: false,
				transparencyAlpha: true,
				transparencyIndexed: false,
				name: 'Windows Bitmap',
				extensions: ['bmp'],
				mime: 'image/bmp',
			}

		case 'CI3':
			return {
				colors: { min: 1, max: Infinity },
				colorAlpha: false,
				colorCycling: false,
				colorRanges: false,
				imageAlpha: false,
				imageIndexed: false,
				multiplePalette: false,
				namedColors: true,
				namedFile: false,
				namedPalette: false,
				transparencyAlpha: false,
				transparencyIndexed: false,
				name: 'ColorImpact 3',
				extensions: ['cif'],
				mime: 'text/plain',
			}

		case 'CI4':
			return {
				colors: { min: 1, max: Infinity },
				colorAlpha: false,
				colorCycling: false,
				colorRanges: false,
				imageAlpha: false,
				imageIndexed: false,
				multiplePalette: false,
				namedColors: true,
				namedFile: false,
				namedPalette: false,
				transparencyAlpha: false,
				transparencyIndexed: false,
				name: 'ColorImpact 4 XML',
				extensions: ['xml'],
				mime: 'text/plain',
			}

		case 'GIF':
			return {
				colors: [2, 4, 8, 16, 32, 64, 128, 256],
				colorAlpha: false,
				colorCycling: false,
				colorRanges: false,
				imageAlpha: false,
				imageIndexed: true,
				multiplePalette: true,
				namedColors: false,
				namedFile: false,
				namedPalette: false,
				transparencyAlpha: false,
				transparencyIndexed: true,
				name: 'CompuServe Graphics Interchange',
				extensions: ['gif'],
				mime: 'image/gif',
			}

		case 'GPL':
			return {
				colors: { min: 1, max: Infinity },
				colorAlpha: false,
				colorCycling: false,
				colorRanges: false,
				imageAlpha: false,
				imageIndexed: false,
				multiplePalette: false,
				namedColors: true,
				namedFile: false,
				namedPalette: true,
				transparencyAlpha: false,
				transparencyIndexed: false,
				name: 'GIMP Palette',
				extensions: ['gpl'],
				mime: 'text/plain',
			}

		case 'IFF':
			return {
				colors: [256],
				colorAlpha: false,
				colorCycling: true,
				colorRanges: true,
				imageAlpha: true,
				imageIndexed: true,
				multiplePalette: true,
				namedColors: false,
				namedFile: false,
				namedPalette: false,
				transparencyAlpha: true,
				transparencyIndexed: true,
				name: 'Interchange File Format',
				extensions: ['bbm', 'iff', 'lbm'],
				mime: 'application/iff',
			}

		case 'JASC':
			return {
				colors: [16, 256],
				colorAlpha: false,
				colorCycling: false,
				colorRanges: false,
				imageAlpha: false,
				imageIndexed: false,
				multiplePalette: false,
				namedColors: false,
				namedFile: false,
				namedPalette: false,
				transparencyAlpha: false,
				transparencyIndexed: false,
				name: 'Jasc Palette',
				extensions: ['pal'],
				mime: 'text/plain',
			}

		case 'PNG':
			return {
				colors: { min: 2, max: 256 },
				colorAlpha: true,
				colorCycling: false,
				colorRanges: false,
				imageAlpha: true,
				imageIndexed: true,
				multiplePalette: false,
				namedColors: false,
				namedFile: true,
				namedPalette: false,
				transparencyAlpha: true,
				transparencyIndexed: true,
				name: 'Portable Network Graphics',
				extensions: ['png'],
				mime: 'image/png',
			}

		case 'RCT2':
			return {
				colors: { min: 1, max: 32767 },
				colorAlpha: false,
				colorCycling: false,
				colorRanges: false,
				imageAlpha: false,
				imageIndexed: false,
				multiplePalette: true,
				namedColors: false,
				namedFile: false,
				namedPalette: false,
				transparencyAlpha: false,
				transparencyIndexed: false,
				name: 'RollerCoaster Tycoon 2 (Water Palette)',
				extensions: ['dat'],
				mime: 'application/octet-stream',
			}

		case 'RIFF':
			return {
				colors: { min: 16, max: 65535 },
				colorAlpha: false,
				colorCycling: false,
				colorRanges: false,
				imageAlpha: false,
				imageIndexed: false,
				multiplePalette: false,
				namedColors: false,
				namedFile: false,
				namedPalette: false,
				transparencyAlpha: false,
				transparencyIndexed: false,
				name: 'Microsoft Windows LogPalette (RIFF)',
				extensions: ['pal'],
				mime: 'application/octet-stream',
			}

		case 'TXT':
			return {
				colors: { min: 1, max: 96 },
				colorAlpha: true,
				colorCycling: false,
				colorRanges: false,
				imageAlpha: false,
				imageIndexed: false,
				multiplePalette: false,
				namedColors: false,
				namedFile: false,
				namedPalette: false,
				transparencyAlpha: false,
				transparencyIndexed: false,
				name: 'Paint.NET',
				extensions: ['txt'],
				mime: 'text/plain',
			}

		case 'VGA':
			return {
				colors: [16, 256],
				colorAlpha: false,
				colorCycling: false,
				colorRanges: false,
				imageAlpha: false,
				imageIndexed: false,
				multiplePalette: false,
				namedColors: false,
				namedFile: false,
				namedPalette: false,
				transparencyAlpha: false,
				transparencyIndexed: false,
				name: 'Binary 48 or 768 bytes (24-bit, 18-bit, 16-bit, 15-bit, 12-bit)',
				/** Extensions that have actually been used by games and applications in the past. */
				extensions: ['bin', 'dat', 'pal', 'vga'],
				mime: 'application/octet-stream',
			}

		case 'VPL':
			return {
				colors: [16, 128],
				colorAlpha: false,
				colorCycling: false,
				colorRanges: false,
				imageAlpha: false,
				imageIndexed: false,
				multiplePalette: false,
				namedColors: false,
				namedFile: false,
				namedPalette: false,
				transparencyAlpha: false,
				transparencyIndexed: false,
				name: 'VICE Palette',
				extensions: ['vpl'],
				mime: 'text/plain',
			}

		case 'X16':
			return {
				colors: [256],
				colorAlpha: false,
				colorCycling: false,
				colorRanges: false,
				imageAlpha: false,
				imageIndexed: false,
				multiplePalette: false,
				namedColors: false,
				namedFile: false,
				namedPalette: false,
				transparencyAlpha: false,
				transparencyIndexed: false,
				name: 'Binary 512 bytes (16-bit) / Commander X16 (12-bit)',
				extensions: ['pal'],
				mime: 'application/octet-stream',
			}

		default:
			return {
				colors: [],
				colorAlpha: false,
				colorCycling: false,
				colorRanges: false,
				imageAlpha: false,
				imageIndexed: false,
				multiplePalette: false,
				namedColors: false,
				namedFile: false,
				namedPalette: false,
				transparencyAlpha: false,
				transparencyIndexed: false,
				name: 'Unknown',
				extensions: [],
				mime: 'application/octet-stream',
			}
	}
}
