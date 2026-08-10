import { readFileSync } from "fs";
import { compileScript, compileTemplate, parse } from "vue/compiler-sfc";
import { defineConfig } from "tsup";

function vuePlugin() {
  return {
    name: "vue-sfc",
    setup(build: any) {
      build.onLoad({ filter: /\.vue$/ }, (args: any) => {
        const source = readFileSync(args.path, "utf8");
        const { descriptor } = parse(source, { filename: args.path });
        const id = Math.random().toString(36).slice(2);

        // Compile script
        const script = compileScript(descriptor, { id });
        const scriptCode = script.content;

        // Compile template
        const template = compileTemplate({
          source: descriptor.template!.content,
          filename: args.path,
          id,
          scoped: descriptor.styles.some((s) => s.scoped),
        });

        const contents = `
${scriptCode.replace(/export default/, "const __sfc__ =")}
${template.code}
__sfc__.render = render;
export default __sfc__;
`;
        return { contents, loader: "ts" };
      });
    },
  };
}

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["vue", "@sheetgrid/core", "@sheetgrid/tokens"],
  esbuildPlugins: [vuePlugin()],
});
