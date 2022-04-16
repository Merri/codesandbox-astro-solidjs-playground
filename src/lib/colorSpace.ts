export type RGBarray = [red: number, green: number, blue: number]

export function cmyk2rgb(c: number, m: number, y: number, k: number): RGBarray {
	c /= 100
	m /= 100
	y /= 100
	k /= 100

	c = c * (1 - k) + k
	m = m * (1 - k) + k
	y = y * (1 - k) + k

	return [(1 - c) * 255, (1 - m) * 255, (1 - y) * 255]
}

// https://stackoverflow.com/questions/17242144/javascript-convert-hsb-hsv-color-to-rgb-accurately/54024653#54024653
export function hsv2rgb(h: number, s: number, v: number): RGBarray {
	let f = (n: number, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0)
	return [f(5), f(3), f(1)]
}

export function lab2rgb(L: number, a: number, b: number): RGBarray {
	let y = (L + 16) / 116
	let x = a / 500 + y
	let z = y - b / 200

	x = 0.95047 * (x * x * x > 0.008856 ? x * x * x : (x - 16 / 116) / 7.787)
	y = 1.0 * (y * y * y > 0.008856 ? y * y * y : (y - 16 / 116) / 7.787)
	z = 1.08883 * (z * z * z > 0.008856 ? z * z * z : (z - 16 / 116) / 7.787)

	let rd = x * 3.2406 + y * -1.5372 + z * -0.4986
	let gr = x * -0.9689 + y * 1.8758 + z * 0.0415
	let bl = x * 0.0557 + y * -0.204 + z * 1.057

	rd = rd > 0.0031308 ? 1.055 * Math.pow(rd, 1 / 2.4) - 0.055 : 12.92 * rd
	gr = gr > 0.0031308 ? 1.055 * Math.pow(gr, 1 / 2.4) - 0.055 : 12.92 * gr
	bl = bl > 0.0031308 ? 1.055 * Math.pow(bl, 1 / 2.4) - 0.055 : 12.92 * bl

	return [Math.max(0, Math.min(1, rd)) * 255, Math.max(0, Math.min(1, gr)) * 255, Math.max(0, Math.min(1, bl)) * 255]
}
