// Shortest valid code to check if local storage actually is usable
const hasLocalStorage = !((l) => {
	try {
		;(l = localStorage).removeItem((l._ = '_'))
	} catch (e) {
		return 1
	}
})()

/** Gets stored string | null array from local storage if local storage is truly accessible. */
export function getInitialStrings(key = 'strings'): (null | string)[] {
	if (!hasLocalStorage) return []

	try {
		const result = JSON.parse(localStorage[key])
		if (Array.isArray(result)) return result
	} catch (error) {}

	return []
}

/** Saves string | null array to local storage if local storage is truly accessible. */
export function setInitialStrings(strings: (null | string)[], key = 'strings') {
	if (!hasLocalStorage) return []

	try {
		localStorage[key] = JSON.stringify(strings)
	} catch (error) {}
}
