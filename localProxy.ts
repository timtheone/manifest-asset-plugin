import type { ClientRequest } from "node:http";
import type { Plugin } from "vite";

/**
 * Vite plugin that captures the dev server port and exposes a proxy request
 * handler that injects an `x-local` header pointing back to the dev server.
 *
 * Returns the plugin (to be added to the `plugins` array) and `onProxyReq`
 * (to be used inside every `proxy` entry's `configure` callback).
 */
export function localProxy(): {
  plugin: Plugin;
  onProxyReq: (proxyReq: ClientRequest) => void;
} {
  let devServerPort: number;

  const plugin: Plugin = {
    name: "local-proxy",
    configureServer(server) {
      server.httpServer?.once("listening", () => {
        const address = server.httpServer?.address();
        if (address && typeof address === "object") {
          devServerPort = address.port;
        }
      });
    },
  };

  function onProxyReq(proxyReq: ClientRequest) {
    proxyReq.setHeader("x-local", `http://localhost:${devServerPort}`);
  }

  return { plugin, onProxyReq };
}
