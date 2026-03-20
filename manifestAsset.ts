import fs from "node:fs";
import path from "node:path";
import type { Plugin, ResolvedConfig } from "vite";

export interface ManifestAsset {
  scripts: string[];
  css: string[];
  inlineCss: string[];
  headerHtml: string;
  bodyHtml: string;
}

/**
 * Vite plugin that generates manifest-asset.json at build time.
 *
 * The wireframe service fetches this file in production/staging instead of scraping index.html,
 * so resource paths are always correct regardless of Vite version or filename changes.
 */
export function manifestAsset(): Plugin {
  let resolvedConfig: ResolvedConfig;

  return {
    name: "manifest-asset",

    configResolved(config) {
      resolvedConfig = config;
    },

    closeBundle() {
      const outDir = resolvedConfig.build.outDir;
      const base = resolvedConfig.base ?? "/";

      const viteManifestPath = path.resolve(outDir, ".vite", "manifest.json");
      if (!fs.existsSync(viteManifestPath)) {
        console.warn(
          "[manifest-asset] Vite manifest not found. Make sure build.manifest is set to true in vite.config.ts.",
        );
        return;
      }

      const viteManifest: Record<
        string,
        { file: string; css?: string[]; isEntry?: boolean }
      > = JSON.parse(fs.readFileSync(viteManifestPath, "utf-8"));

      const scripts: string[] = [];
      const css: string[] = [];

      for (const entry of Object.values(viteManifest)) {
        if (!entry.isEntry) continue;

        const scriptSrc = `${base}${entry.file}`.replace(/\/+/g, "/");
        scripts.push(
          `<script type="module" crossorigin src="${scriptSrc}"></script>`,
        );

        for (const cssFile of entry.css ?? []) {
          const cssSrc = `${base}${cssFile}`.replace(/\/+/g, "/");
          css.push(cssSrc);
        }
      }

      const manifest: ManifestAsset = {
        scripts,
        css,
        inlineCss: [],
        headerHtml: "",
        bodyHtml: "",
      };

      const outputPath = path.resolve(outDir, "manifest-asset.json");
      fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2), "utf-8");
      console.log(`[manifest-asset] Written to ${outputPath}`);
    },
  };
}
