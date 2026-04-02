
import { Target } from "bun";
/*
type Target =
  | "bun-darwin-x64"
  | "bun-darwin-x64-baseline"
  | "bun-darwin-arm64"
  | "bun-linux-x64"
  | "bun-linux-x64-baseline"
  | "bun-linux-x64-modern"
  | "bun-linux-arm64"
  | "bun-linux-x64-musl"
  | "bun-linux-arm64-musl"
  | "bun-windows-x64"
  | "bun-windows-x64-baseline"
  | "bun-windows-x64-modern"
  | "bun-windows-arm64";
*/
const targets: Record<string, Target> = {
    "linux_x64": "bun-linux-x64" as Target,
    "linux_arm64": "bun-linux-arm64" as Target,
    "windows_x64": "bun-windows-x64" as Target,
    "windows_arm64": "bun-windows-arm64" as Target,
    "macos_x64": "bun-darwin-x64" as Target,
    "macos_arm64": "bun-darwin-arm64" as Target,
}

async function main(target: string = 'linux_x64'){
    if (!targets[target as keyof typeof targets]) {
        console.error(`Target ${target} not found`);
        process.exit(1);
    }
    await Bun.build({
      entrypoints: ["./src/index.ts"],
      compile: {
        outfile: "./dist/media-upload-api",
      },
      target: 'bun',
    });
}
main();