import { readFile } from "node:fs/promises";

const routes = ["home", "scores", "game-preview", "portal", "playoff", "coaching", "dfs", "stadium"];
const expected = [
  ...routes.flatMap((route) => [
    [`${route}-desktop.png`, 1425, 990],
    [`${route}-mobile.png`, 375, 811],
  ]),
  ["mode-dialog-mobile.png", 375, 811],
];

function jpegSize(bytes) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }
    if (length < 2) break;
    offset += length + 2;
  }
  return null;
}

for (const [name, expectedWidth, expectedHeight] of expected) {
  const bytes = await readFile(new URL(`../artifacts/visual-qa/${name}`, import.meta.url));
  const isPng = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = jpegSize(bytes);
  if (!isPng && !jpeg) throw new Error(`${name} is not a valid PNG or JPEG capture`);
  const width = isPng ? bytes.readUInt32BE(16) : jpeg.width;
  const height = isPng ? bytes.readUInt32BE(20) : jpeg.height;
  if (width !== expectedWidth || height !== expectedHeight) {
    throw new Error(`${name} is ${width}x${height}; expected ${expectedWidth}x${expectedHeight}`);
  }
}

console.log(`Visual artifacts: PASS (${expected.length} image captures with expected viewport dimensions)`);
