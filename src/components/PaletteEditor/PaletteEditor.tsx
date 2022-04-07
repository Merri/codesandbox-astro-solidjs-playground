import { createSignal, Switch, Match } from 'solid-js'

export function PaletteEditor() {
    const [menuId] = createSignal<string>('')

    return <div>
        <div id="menu">
            <button type="button">New group</button>
        </div>
        <Switch>
            <Match when={menuId() === 'palette'}><dialog>Tässä voi valita paletin koon!</dialog></Match>
        </Switch>
    </div>
}