export function PaletteGroup() {
    function noop(event: Event) {
        event.preventDefault()
    }

	return (
		<section>
			<header>
				<h3>Palette Group</h3>
			</header>
			<form onsubmit={noop}>
				<p>
					<button type="submit">Add palette</button>
				</p>
			</form>
		</section>
	)
}
