export function download(filename: string, contents: ArrayBuffer, mimeType = 'application/octet-stream') {
	const link = document.createElement('a')
	const url = URL.createObjectURL(new Blob([contents], { type: mimeType }))
	link.download = filename
	link.href = url
	link.dispatchEvent(new MouseEvent('click'))
	//requestAnimationFrame(() => URL.revokeObjectURL(url))
}
