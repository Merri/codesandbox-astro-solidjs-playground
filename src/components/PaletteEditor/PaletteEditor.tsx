import { createSignal, Show, Switch, Match } from 'solid-js'
import { getGifPaletteGroup, IndexedImagePaletteGroup } from '../../lib/fileFormat/gif'
import { getIffPaletteGroup } from '../../lib/fileFormat/iff'
import { PaletteGroup } from './PaletteGroup'

export function PaletteEditor() {
	const [menuId] = createSignal<string>('')
	const [group, setGroup] = createSignal<IndexedImagePaletteGroup>()
	const [errorMsg, setErrorMsg] = createSignal<string>('')

	async function oninput(event: InputEvent) {
		if (!(event.currentTarget instanceof HTMLInputElement)) return
		const file = event.currentTarget.files[0]
		if (!file) return console.log('No file')
		try {
			const arrayBuffer = await file.arrayBuffer()
			const result = getGifPaletteGroup(arrayBuffer) || getIffPaletteGroup(arrayBuffer)
			if (result) {
				setGroup(undefined)
				requestAnimationFrame(() => {
					setGroup(result)
				})
				if (errorMsg()) setErrorMsg('')
			} else {
				setErrorMsg(`Unsupported file format`)
			}
		} catch (error) {
			setErrorMsg(`[Critical error] ${error.message}`)
		}
	}

	return (
		<div>
			<div id="menu">
				<button type="button">New group</button>
			</div>
			<label>
				GIF file: <input type="file" oninput={oninput} />
			</label>
			<Show when={errorMsg() !== ''}>
				<p>Loading file failed: {errorMsg()}</p>
			</Show>
			<Show when={group()}>
				<PaletteGroup group={group()} />
			</Show>
			<Switch>
				<Match when={menuId() === 'palette'}>
					<dialog>Tässä voi valita paletin koon!</dialog>
				</Match>
			</Switch>
		</div>
	)
}
