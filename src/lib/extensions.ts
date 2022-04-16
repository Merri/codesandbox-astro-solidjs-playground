/** Get array of file extensions valid for given format. */
function getFormatExtensions(format: string): string[] {
	switch (format) {
		case 'ACO':
			return ['aco']
		case 'ACT':
			return ['act']
		case 'ASE':
			return ['ase']
		case 'IFF':
			return ['iff', 'lbm']
		case 'GIF':
			return ['gif']
		default:
			return []
	}
}
