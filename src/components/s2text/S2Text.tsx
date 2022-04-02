import { createSignal, onMount, For, Show } from 'solid-js'

import { sanitizeAsCp437 } from '../../lib/cp437'
import { download } from '../../lib/download'
import { readS2Text, writeS2Text } from '../../lib/settlers2Text'
import { getInitialStrings, setInitialStrings } from '../../lib/simpleStringsStorage'

const DEFAULT_FILENAME = 'UNTITLED.ENG'

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
