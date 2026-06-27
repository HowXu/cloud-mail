import { defineConfig } from 'vitest/config';
import { defineWorkersProject } from '@cloudflare/vitest-pool-workers/config';

export default defineConfig({
	test: {
		workspace: [
			{
				test: {
					name: 'node',
					include: ['test/union-receive.spec.js'],
					environment: 'node',
					pool: 'forks'
				}
			},
			defineWorkersProject({
				test: {
					name: 'workers',
					include: ['test/index.spec.js'],
					poolOptions: {
						workers: {
							wrangler: { configPath: './wrangler-dev.toml' },
						},
					},
				},
			})
		]
	},
});
