import { defineConfig, ConfigEnv } from 'vite'

export default defineConfig((_configEnv: ConfigEnv) => {
	return {
		server: {
			hmr: {
				port: 443,
			},
		},
	}
})
