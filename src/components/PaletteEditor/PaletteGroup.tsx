import { For, Show } from 'solid-js'

import { IndexedImagePaletteGroup } from '../../lib/fileFormat/gif'
import { Palette } from './Palette'

export function PaletteGroup({ group }: { group: IndexedImagePaletteGroup }) {
	function noop(event: Event) {
		event.preventDefault()
	}

	return (
		<section>
			<header>
				<h3>Palette Group</h3>
			</header>
			<Show when={group.mainPaletteSize}>
				<h4>Main palette</h4>
				<Palette items={group.mainPalette} />
			</Show>
			<For each={group.images}>
				{(image) => (
					<>
						<h4>Palette</h4>
						<Palette items={image.palette.slice(0, image.paletteSize)} />
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
