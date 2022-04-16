import { For } from 'solid-js'

import { IndexedImagePaletteGroup } from '../../lib/fileFormat/gif'
import { Palette } from './Palette'

export function PaletteGroup({ group }: { group: IndexedImagePaletteGroup | undefined }) {
	function noop(event: Event) {
		event.preventDefault()
	}

	return (
		<section>
			<header>
				<h3>Palette Group</h3>
			</header>
			<For each={group?.palettes ?? []}>
				{(palette, index) => (
					<>
						<h4>{group?.mainPaletteIndex === index() ? 'Main palette' : 'Palette'}</h4>
						<Palette items={palette.palette.slice(0, palette.numberOfColors ?? palette.palette.length)} />
					</>
				)}
			</For>
			<form onsubmit={noop}>
				<p>
					<button type="submit">Add palette</button>
				</p>
			</form>
		</section>
	)
}
