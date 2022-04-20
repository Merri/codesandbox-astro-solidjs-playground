import { createSignal, Show, Switch, Match } from 'solid-js'
import { getAcoPaletteGroup } from '../../lib/fileFormat/aco'
import { getAsePaletteGroup } from '../../lib/fileFormat/ase'
import { getBmpPaletteGroup } from '../../lib/fileFormat/bmp'
import { getGifPaletteGroup, IndexedImagePaletteGroup } from '../../lib/fileFormat/gif'
import { getGplPaletteGroup } from '../../lib/fileFormat/gpl'
import { getIffPaletteGroup } from '../../lib/fileFormat/iff'
import { getJascPaletteGroup } from '../../lib/fileFormat/palJasc'
import { getPngPaletteGroup } from '../../lib/fileFormat/png'
import { getRiffPaletteGroup } from '../../lib/fileFormat/palRiff'
import { getPaintNetPaletteGroup } from '../../lib/fileFormat/txt'
import { getVicePaletteGroup } from '../../lib/fileFormat/vpl'
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
			let result =
				getAcoPaletteGroup(arrayBuffer) ||
				getAsePaletteGroup(arrayBuffer) ||
				getBmpPaletteGroup(arrayBuffer) ||
				getGifPaletteGroup(arrayBuffer) ||
				getIffPaletteGroup(arrayBuffer) ||
				getRiffPaletteGroup(arrayBuffer) ||
				getPngPaletteGroup(arrayBuffer)

			// Did not match a binary format? See if it is a text file by checking null char in first 1 kilobyte
			if (!result && new Uint8Array(arrayBuffer.slice(0, 1024)).every((byte) => byte !== 0)) {
				// ASCII would technically be more appropriate considering the history, but we rebel.
				const decoder = new TextDecoder('utf-8')

				// This is a generic clean up that should fit well with all text file type files
				const content = decoder
					.decode(arrayBuffer)
					.replace(/\r\n/g, '\n')
					.replace(/\r/g, '\n')
					.split('\n')
					.map((line) => line.trim())

				result =
					getGplPaletteGroup(arrayBuffer, content) ||
					getJascPaletteGroup(arrayBuffer, content) ||
					getVicePaletteGroup(arrayBuffer, content) ||
					getPaintNetPaletteGroup(arrayBuffer, content)
			}

			const group = result || undefined

			if (group) {
				setGroup(undefined)
				requestAnimationFrame(() => {
					setGroup(group)
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
				Gimme a file: <input type="file" oninput={oninput} />
			</label>
			<Show when={errorMsg() !== ''}>
				<p>Loading file failed: {errorMsg()}</p>
			</Show>
			<Show when={group()}>
				<PaletteGroup group={group()} />
			</Show>
			<Show when={!group()}>
				<h2>Supported file formats</h2>
				<p>Need a palette from a file? Maybe for and from indexed images? Give it to me!</p>
				<table>
					<thead>
						<tr>
							<th>Extension</th>
							<th>Format</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>ACO</td>
							<td>Adobe Color Swatches</td>
						</tr>
						<tr>
							<td>ASE</td>
							<td>Adobe Swatches Exchange</td>
						</tr>
						<tr>
							<td>BMP</td>
							<td>Windows or OS/2 Bitmap</td>
						</tr>
						<tr>
							<td>GIF</td>
							<td>CompuServe Graphics Interchange Format</td>
						</tr>
						<tr>
							<td>GPL</td>
							<td>Gimp Palette</td>
						</tr>
						<tr>
							<td>
								IFF
								<br />
								BBM
								<br />
								LBM
							</td>
							<td>
								Interchange File Format
								<br />
								Amiga ILBM form and DOS PBM form
							</td>
						</tr>
						<tr>
							<td>PAL</td>
							<td>Jasc Palette (Paint Shop Pro)</td>
						</tr>
						<tr>
							<td>PAL</td>
							<td>
								Resource Interchange File Format (aka Microsoft Palette)
								<br />
								RIFF Simple Palette and RIFF Extended Palette
								<br />
								"Enhanced RIFF" also supported
							</td>
						</tr>
						<tr>
							<td>PNG</td>
							<td>Portable Network Graphics</td>
						</tr>
						<tr>
							<td>TXT</td>
							<td>Paint.NET Palette</td>
						</tr>
						<tr>
							<td>VPL</td>
							<td>VICE Palette</td>
						</tr>
					</tbody>
				</table>
				<p>TODO: Adobe Color Table, VGA binary formats, ColorImpact 3 (CIF) &amp; 4 (XML)</p>
			</Show>
			<Switch>
				<Match when={menuId() === 'palette'}>
					<dialog>Tässä voi valita paletin koon!</dialog>
				</Match>
			</Switch>
		</div>
	)
}
