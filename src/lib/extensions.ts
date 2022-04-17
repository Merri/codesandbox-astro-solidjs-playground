interface FileFormatInfo {
	name: string
	extensions: string[]
}

/** Get array of file extensions valid for given format. */
function getFormatInfo(format: string): FileFormatInfo {
	switch (format) {
		case 'ACO':
			return { name: 'Adobe Color Swatches', extensions: ['aco'] }
		case 'ACT':
			return { name: 'Adobe Color Table', extensions: ['act'] }
		case 'ASE':
			return { name: 'Adobe Swathes Exchange', extensions: ['ase'] }
		case 'BMP':
			return { name: 'Windows Bitmap', extensions: ['bmp'] }
		case 'GIF':
			return { name: 'CompuServe Graphics Interchange', extensions: ['gif'] }
		case 'GPL':
			return { name: 'GIMP Palette', extensions: ['gpl'] }
		case 'IFF':
			return { name: 'Interchange File Format', extensions: ['bbm', 'iff', 'lbm'] }
		case 'JASC':
			return { name: 'Jasc Palette', extensions: ['pal'] }
		case 'PNG':
			return { name: 'Portable Network Graphics', extensions: ['png'] }
		default:
			return { name: 'Unknown', extensions: [] }
	}
}
