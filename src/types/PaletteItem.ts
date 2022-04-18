/**
 * Flags used in RIFF when the value is other than 0xFF
 * @see https://docs.microsoft.com/en-us/openspecs/windows_protocols/ms-wmf/45e5c320-55b4-4f3a-af55-40f9e0f6e3ac
 */
export const PaletteEntryFlag = {
	PC_RESERVED: 0x01,
	PC_EXPLICIT: 0x02,
	PC_NOCOLLAPSE: 0x04,
} as const
export type PaletteEntryFlag = typeof PaletteEntryFlag[keyof typeof PaletteEntryFlag]

export type PaletteItem = {
	r: number
	g: number
	b: number
	opacity?: number
	description?: string
	/** @todo Research this reserved value. Is it used for alpha? Something else? Or is it just always 0xFF? */
	bmpReserved?: number
	/**
	 * These values make mostly sense for OS that has only 256 colors and balances between "system palette" and "logical palette".
	 * @see https://docs.microsoft.com/en-us/previous-versions/dd162769(v=vs.85)
	 */
	riff?: {
		/** @todo You, someone! Describe this in a meaningful way. Maybe there is some practical use...? */
		explicit: boolean
		/** Add to system palette if there is space available in the system palette. Otherwise place to logical palette. */
		noCollapse: boolean
		/** Used for color cycling. OS will avoid designating this color to logical palette as color changes often. */
		reserved: boolean
	}
}
