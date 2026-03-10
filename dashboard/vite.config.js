import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function icalProxyPlugin() {
  return {
    name: 'ical-proxy',
    configureServer(server) {
      server.middlewares.use('/api/ical', async (req, res) => {
        const url = new URL(req.url, 'http://localhost');
        const icalUrl = url.searchParams.get('url');

        if (!icalUrl) {
          res.statusCode = 400;
          res.end('Missing url parameter');
          return;
        }

        try {
          const response = await fetch(icalUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
          });
          if (!response.ok) {
            res.statusCode = response.status;
            res.end(`Airbnb returned ${response.status}`);
            return;
          }
          const text = await response.text();
          res.setHeader('Content-Type', 'text/calendar');
          res.end(text);
        } catch (err) {
          res.statusCode = 502;
          res.end(`Fetch failed: ${err.message}`);
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), icalProxyPlugin()],
})
