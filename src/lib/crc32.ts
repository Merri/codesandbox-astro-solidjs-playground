function createTable() {
	const crcTable = new Uint32Array(256)

	for (let c = 0, n = 0; n !== 256; n++) {
		c = n
		for (let k = 0; k < 8; k++) {
			if (c & 1) {
				c = 0xedb88320 ^ (c >>> 1)
			} else {
				c = c >>> 1
			}
		}
		crcTable[n] = c
	}

	return crcTable
}

const crcTable = createTable()

/** Input should include chunk type + chunk data */
export function generateCRC32(buffer: Uint8Array) {
	const length = buffer.byteLength
	let crc = 0xffffffff

	for (let i = 0; i < length; i++) {
		crc = crcTable[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8)
	}

	// enforce unsigned integer
	return ~crc >>> 0
}
