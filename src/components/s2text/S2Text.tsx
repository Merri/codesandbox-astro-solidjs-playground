import { createSignal, onMount, For, Show } from 'solid-js'

import { cp437ToString, sanitizeAsCp437, stringToCp437 } from './cp437'
import { download } from './download'

const DEFAULT_FILENAME = 'UNTITLED.ENG'

/**
 * Read The Settlers II string tables: NAMES.ENG, NAMES.GER, ONGAME.ENG, ONGAME.GER etc.
 *
 * Returns `string` with error message if file cannot be read.
 * Returns array of `string | null` if successful read.
 */
function readS2Text(arrayBuffer: ArrayBuffer): string | (null | string)[] {
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
function writeS2Text(strings: (null | string)[]): ArrayBuffer {
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

const hasLocalStorage = !((l) => {
	try {
		;(l = localStorage).removeItem((l._ = '_'))
	} catch (e) {
		return 1
	}
})()

function getInitialStrings(key = 'strings'): (null | string)[] {
	if (!hasLocalStorage) return []

	try {
		const result = JSON.parse(localStorage[key])
		if (Array.isArray(result)) return result
	} catch (error) {}

	return []
}

function setInitialStrings(strings: (null | string)[], key = 'strings') {
	if (!hasLocalStorage) return []

	try {
		localStorage[key] = JSON.stringify(strings)
	} catch (error) {}
}

export function S2Text() {
	const [filename, setFilename] = createSignal<string>(DEFAULT_FILENAME)
	const [errorMsg, setErrorMsg] = createSignal<string>('')
	const [strings, setStrings] = createSignal<(null | string)[]>([])
	const [originalStrings, setOriginalStrings] = createSignal<(null | string)[]>([])

	onMount(() => {
		requestAnimationFrame(() => {
			const strs = getInitialStrings()
			const oStrs = getInitialStrings('original')
			const [file = DEFAULT_FILENAME] = getInitialStrings('filename')
			if (strs.length) {
				setStrings(strs)
				setOriginalStrings(oStrs)
				setFilename(file)
			}
		})
	})

	async function oninput(event: InputEvent) {
		if (!(event.currentTarget instanceof HTMLInputElement)) return
		const file = event.currentTarget.files[0]
		if (!file) return console.log('No file')
		try {
			const arrayBuffer = await file.arrayBuffer()
			const result = readS2Text(arrayBuffer)

			if (typeof result === 'string') {
				setErrorMsg(result)
			} else {
				if (errorMsg()) setErrorMsg('')
				setStrings(result)
				setOriginalStrings(result.slice(0))
				setInitialStrings(result)
				setInitialStrings(result, 'original')
				setInitialStrings([file.name], 'filename')
				setFilename(file.name)
			}
		} catch (error) {
			setErrorMsg(`[Critical error] ${error.message}`)
		}
	}

	function changeString(event) {
		const el = event.currentTarget
		if (!el) return
		const index = ~~el.name.slice(6)

		const strs = strings()
		const text = el.value.replace(/\n/g, '@@')
		strs[index] = sanitizeAsCp437(text)
		setStrings(strs)
		setInitialStrings(strs)
	}

	function downloadFile() {
		download(filename(), writeS2Text(strings()))
	}

	return (
		<div>
			<label>
				ENG/GER file: <input type="file" oninput={oninput} />
			</label>
			<p>
				<button
					type="button"
					onclick={(event) => {
						event.preventDefault()
						const empty = new Array(10).fill(null)
						setStrings(empty.slice())
						setOriginalStrings(empty.slice())
						setInitialStrings(empty.slice())
						setInitialStrings(empty.slice(), 'original')
						setInitialStrings([DEFAULT_FILENAME], 'filename')
						setFilename(DEFAULT_FILENAME)
					}}
				>
					Create new empty file
				</button>
			</p>
			<Show when={errorMsg() !== ''}>
				<p>Loading file failed: {errorMsg()}</p>
			</Show>
			<Show when={strings().length !== 0} fallback={<p>Drop a file to field above.</p>}>
				<h2>
					<code>{filename()}</code>
				</h2>
				<p>Total string table size: {strings().length}</p>
				<button type="button" onclick={downloadFile}>
					<span aria-label="" role="img">
						⬇️
					</span>{' '}
					Download
				</button>
				<table>
					<thead>
						<tr>
							<th>ID</th>
							<th>Text</th>
							<th>Original</th>
						</tr>
					</thead>
					<tbody>
						<For each={strings()}>
							{(item, index) => (
								<tr>
									<td>#{index()}</td>
									<td>
										<Show
											when={item != null}
											fallback={
												<button
													type="button"
													name={`index-${index()}`}
													onclick={() => {
														const strs = strings()
														strs[index()] = ''
														setStrings(strs.slice(0))
														requestAnimationFrame(() => {
															document
																.querySelector<HTMLElement>(`[name='index-${index()}']`)
																?.focus()
														})
													}}
												>
													<span aria-label="Add" role="img">
														➕
													</span>
												</button>
											}
										>
											<textarea
												rows={item.includes('@@') ? 10 : 2}
												name={`index-${index()}`}
												onkeydown={(event) => {
													if (
														event.currentTarget.value.length === 0 &&
														['Delete', 'Backspace'].includes(event.key)
													) {
														const strs = strings()
														strs[index()] = null
														setStrings(strs.slice(0))
														requestAnimationFrame(() => {
															document
																.querySelector<HTMLElement>(`[name='index-${index()}']`)
																?.focus()
														})
													}
												}}
												oninput={changeString}
												value={item.replace(/@@/g, '\n')}
											/>
										</Show>
									</td>
									<td>
										<Show when={originalStrings()[index()] != null}>
											<textarea
												rows={originalStrings()[index()].includes('@@') ? 10 : 2}
												readonly
												value={originalStrings()[index()].replace(/@@/g, '\n')}
											/>
										</Show>
									</td>
								</tr>
							)}
						</For>
					</tbody>
				</table>
				<p>
					<button
						type="button"
						onclick={(event) => {
							event.preventDefault()
							const empty = new Array(10).fill(null)
							const strs = strings().concat(empty)
							const oStrs = originalStrings().concat(empty)
							setStrings(strs)
							setOriginalStrings(oStrs)
							setInitialStrings(strs)
							setInitialStrings(oStrs, 'original')
						}}
					>
						<span aria-label="Add 10 more items" role="img">
							➕ Add 10 more items
						</span>
					</button>
					&nbsp;
					<Show
						when={
							strings()
								.slice(-10)
								.every((item) => item == null) && strings().length > 10
						}
					>
						<button
							type="button"
							onclick={(event) => {
								event.preventDefault()
								const strs = strings().slice(0, -10)
								const oStrs = originalStrings().slice(0, -10)
								setStrings(strs)
								setOriginalStrings(oStrs)
								setInitialStrings(strs)
								setInitialStrings(oStrs, 'original')
							}}
						>
							<span aria-label="Reduce by 10" role="img">
								➖ Reduce by 10
							</span>
						</button>
					</Show>
				</p>
				<hr />
				<button type="button" onclick={downloadFile}>
					<span aria-label="" role="img">
						⬇️
					</span>{' '}
					Download <code>{filename()}</code>
				</button>
			</Show>
		</div>
	)
}
