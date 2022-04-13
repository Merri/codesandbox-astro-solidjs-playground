import { createSignal, For } from 'solid-js'
import { asHex } from '../../lib/hex'
import { PaletteItem } from '../../types/PaletteItem'

export function Palette({ items }: { items: (PaletteItem | null)[] }) {
	//const [items] = createSignal(new Array<PaletteItem | null>(256).fill(null))

	return (
		<div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '2px', width: 'calc(16 * 2rem + 15 * 2px)' }}>
			<For each={items}>
				{(item) => {
					const color =
						item != null ? `rgba(${item.r}, ${item.g}, ${item.b}, ${item.opacity ?? 1})` : undefined
					const hexStr = item != null ? `${asHex(item.r)} ${asHex(item.g)} ${asHex(item.b)} ` : undefined
					return (
						<span style={{ 'background-color': color, height: '1.25rem', 'width': '2rem' }}>
							<span aria-hidden={false} hidden>
								{hexStr}
							</span>
						</span>
					)
				}}
			</For>
		</div>
	)
}
