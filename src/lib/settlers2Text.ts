import { cp437ToString, stringToCp437 } from './cp437'

/**
 * Read The Settlers II string tables: NAMES.ENG, NAMES.GER, ONGAME.ENG, ONGAME.GER etc.
 *
 * Returns `string` with error message if file cannot be read.
 * Returns array of `string | null` if successful read.
 */
export function readS2Text(arrayBuffer: ArrayBuffer): string | (null | string)[] {
	const view = new DataView(arrayBuffer)
	/*
	 * Sample file header: `E7 FD 58 02 01 00 B0 21 00 00`
	 * - `FDE7` = 64999 (identifier)
	 * - `0258` = 600 (items)
	 * - `0001` = 1 (alwaysOne)
	 * - `000021B0` = 8624 (size of file without header)
	 */
	const identifier = view.getUint16(0, true)
	const items = view.getUint16(2, true)
	const alwaysOne = view.getUint16(4, true)
	const bytesToRead = view.getUint32(6, true)

	if (identifier !== 64999) return 'Invalid identifier (was not 64999)'
	if (alwaysOne !== 1) return 'Invalid identifier (was not 1)'
	if (bytesToRead !== view.byteLength - 10) return 'Invalid filesize in header'
	// smallest theoretical file with items = all items are null
	if (items * 4 > bytesToRead) return 'Invalid string table size: file not big enough for the reported table size'

	const text: (string | null)[] = []
	const startOfStringData = 10 + items * 4

	for (let pos = 10; pos < startOfStringData; pos += 4) {
		/** String start position. Strings can be in any order. */
		const strStart = view.getUint32(pos, true)
		// Some fan made files give items value that is too big
		if (strStart + 10 >= view.byteLength) break

		if (strStart === 0) {
			text.push(null)
		} else {
			text.push(cp437ToString(new Uint8Array(view.buffer, 10 + strStart)))
		}
	}

	if (items !== text.length) {
		console.warn(`File indicated it has ${items} strings, but read ${text.length} strings`)
	}

	return text
}

/**
 * Write The Settlers II string tables. Will always succeed as long as the given array is an array of strings and nulls.
 */
export function writeS2Text(strings: (null | string)[]): ArrayBuffer {
	const stringLength = strings.reduce((total, item) => {
		if (item == null) return total
		// We can calculate this here already, because `stringToCp437` gives as many bytes back as we give characters to it.
		// Usually it is a great idea to only deal with final converted data.
		return total + item.length + 1
	}, 0)

	const itemsLength = strings.length * 4
	const bytesToWrite = stringLength + itemsLength

	const file = new ArrayBuffer(bytesToWrite + 10)
	const view = new DataView(file)
	const bytes = new Uint8Array(file)

	view.setUint16(0, 64999, true)
	view.setUint16(2, strings.length, true)
	view.setUint16(4, 1, true)
	view.setUint32(6, bytesToWrite, true)

	let stringsPos = itemsLength + 10

	for (let i = 0; i < strings.length; i++) {
		if (strings[i] == null) continue
		view.setUint32(i * 4 + 10, stringsPos - 10, true)
		const strToWrite = stringToCp437(strings[i])
		bytes.set(strToWrite, stringsPos)
		stringsPos += strToWrite.byteLength + 1
	}

	return file
}
