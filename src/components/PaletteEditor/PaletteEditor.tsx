import { createSignal, Show, Switch, Match } from 'solid-js'
import { getAcoPaletteGroup } from '../../lib/fileFormat/aco'
import { getAsePaletteGroup } from '../../lib/fileFormat/ase'
import { getBmpPaletteGroup } from '../../lib/fileFormat/bmp'
import { getGifPaletteGroup, IndexedImagePaletteGroup } from '../../lib/fileFormat/gif'
import { getGplPaletteGroup } from '../../lib/fileFormat/gpl'
import { getIffPaletteGroup } from '../../lib/fileFormat/iff'
import { getPngPaletteGroup } from '../../lib/fileFormat/png'
import { PaletteGroup } from './PaletteGroup'

export function PaletteEditor() {
	const [menuId] = createSignal<string>('')
	const [group, setGroup] = createSignal<IndexedImagePaletteGroup>()
	const [errorMsg, setErrorMsg] = createSignal<string>('')

	async function oninput(event: InputEvent) {
		const target = event.currentTarget
		if (!target || !(target instanceof HTMLInputElement)) return
		const file = target.files?.[0]
		if (!file) return console.log('No file')
		try {
			const arrayBuffer = await file.arrayBuffer()
			const result =
				getAcoPaletteGroup(arrayBuffer) ||
				getAsePaletteGroup(arrayBuffer) ||
				getBmpPaletteGroup(arrayBuffer) ||
				getGifPaletteGroup(arrayBuffer) ||
				getGplPaletteGroup(arrayBuffer) ||
				getIffPaletteGroup(arrayBuffer) ||
				getPngPaletteGroup(arrayBuffer)
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
			if (error instanceof Error) {
				setErrorMsg(`[Critical error] ${error.message}`)
			}
		}
	}

	return (
		<div>
			<div id="menu">
				<button type="button">New group</button>
			</div>
			<label>
				GIF|IFF|LBM|ACO|ASE file: <input type="file" oninput={oninput} />
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
