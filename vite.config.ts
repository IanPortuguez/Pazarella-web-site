import vinext from 'vinext';
import {defineConfig} from 'vite';
import {cloudflare} from '@cloudflare/vite-plugin';

// The root Wrangler file is the single source for D1/R2 bindings.
// No mock identities or provider-specific ChatGPT headers are injected.
export default defineConfig({
  plugins:[vinext(),cloudflare({...(process.env.TEST_STATE_DIR?{persistState:{path:process.env.TEST_STATE_DIR}}:{}),viteEnvironment:{name:'rsc',childEnvironments:['ssr']},inspectorPort:false})],
  server:{host:'127.0.0.1',port:5173,watch:{ignored:['**/.sites-runtime/**','**/.wrangler/**','**/dist/**']}},
});
