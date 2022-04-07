import { createSignal, For } from 'solid-js'
import { asHex } from '../../lib/hex'

export type PaletteItem = {
	r: number
	g: number
	b: number
	opacity: number
}

export function Palette() {
	const [items] = createSignal(new Array<PaletteItem | null>(256).fill(null))

	return (
		<div>
			<For each={items()}>
				{(item) => {
					const color = item != null ? `rgba(${item.r}, ${item.g}, ${item.b}, ${item.opacity})` : undefined
					const hexStr = item != null ? `${asHex(item.r)} ${asHex(item.g)} ${asHex(item.b)} ` : undefined
					return <span style={{ 'background-color': color }}>{hexStr}</span>
				}}
			</For>
		</div>
	)
}
