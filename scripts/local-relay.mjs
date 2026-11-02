// Firefox 153+ blocks extension requests to a private address (Local Network
// Access), and loopback is the exception. This relays 127.0.0.1 to the
// classifier so Sharp can reach it: `bun scripts/local-relay.mjs`.
//
// Everything is passed through untouched, including the CORS and preflight
// headers llama.cpp already answers, because Sharp still sees two origins.
import { createServer, request } from 'node:http';

const upstream = new URL(process.argv[2] ?? 'http://192.168.2.100:8456');
const port = Number(process.argv[3] ?? 8457);

createServer((incoming, response) => {
  const out = request(
    {
      hostname: upstream.hostname,
      port: upstream.port,
      path: `${upstream.pathname.replace(/\/$/, '')}${incoming.url}`,
      method: incoming.method,
      headers: incoming.headers,
    },
    (answer) => {
      response.writeHead(answer.statusCode ?? 502, answer.headers);
      answer.pipe(response);
    },
  );
  out.on('error', (error) => {
    response.writeHead(502, { 'Content-Type': 'text/plain' });
    response.end(`Relay could not reach ${upstream.origin}: ${error.message}\n`);
  });
  incoming.pipe(out);
}).listen(port, '127.0.0.1', () => {
  console.log(`Relaying http://127.0.0.1:${port} -> ${upstream.origin}`);
});
