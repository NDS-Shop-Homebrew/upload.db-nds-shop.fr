// NDS ROM analysis: header, icon banner, and title extraction.
//
// Banner layout (GBATEK, retail DS carts incl. NDSi-Enhanced):
//   +0x020  200h   Icon bitmap (32x32 px, 4x4 tiles of 8x8, 4bpp, tile-major)
//   +0x220  20h    16x RGB555 palette (entry 0 transparent)
//   +0x240  800h   8x UTF-16LE game titles (JP/EN/FR/DE/IT/ES/zh/ko)
//
// This mirrors tools/nds-to-cia/lib/extractIcon.mjs from db-nds-shop (which
// is the reference implementation and generates the store icons).
import zlib from "zlib";

const REGIONS: Record<number, string> = {
  0: "Japan",
  1: "USA",
  2: "Europe",
  3: "France",
  4: "Germany",
  5: "Italy",
  6: "Spain",
  7: "China",
  8: "Korea",
  9: "Australia",
  0xa: "World",
};

const TITLE_LANGS = ["jp", "en", "fr", "de", "it", "es", "zh", "ko"] as const;

export interface NdsMetadata {
  title: string;
  titleId: string;
  makerCode: string;
  version: string;
  region: string;
  language: string;
  titles: Record<string, string>;
  icon: string; // data URL PNG 48x48
  iconBytes: number;
  developer?: string;
  publisher?: string;
  genres?: string[];
}

let crcTable: Int32Array | null = null;
function crc32(buf: Buffer): number {
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function encodePng(width: number, height: number, rgba: Buffer): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  const stride = width * 4;
  const raw = Buffer.alloc(height * (1 + stride));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + stride)] = 0;
    rgba.copy(raw, y * (1 + stride) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function rgb555(v: number): [number, number, number] {
  return [
    (((v & 0x1f) * 255) / 31) | 0,
    ((((v >> 5) & 0x1f) * 255) / 31) | 0,
    ((((v >> 10) & 0x1f) * 255) / 31) | 0,
  ];
}

function decodeIcon(rom: Buffer, bl: number): Buffer {
  const px = Buffer.alloc(32 * 32 * 4);
  for (let ty = 0; ty < 4; ty++) {
    for (let tx = 0; tx < 4; tx++) {
      const tileOff = (ty * 4 + tx) * 32;
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const byte = rom[bl + 0x20 + tileOff + row * 4 + (col >> 1)];
          const idx = col & 1 ? byte >> 4 : byte & 0x0f;
          const i = (ty * 8 + row) * 32 + (tx * 8 + col);
          const pal = rom.readUInt16LE(bl + 0x220 + idx * 2);
          const [r, g, b] = rgb555(pal);
          px[i * 4] = r;
          px[i * 4 + 1] = g;
          px[i * 4 + 2] = b;
          px[i * 4 + 3] = 255;
        }
      }
    }
  }
  return px;
}

function upscale(px: Buffer): Buffer {
  const srcW = 32, srcH = 32, outW = 48, outH = 48;
  const out = Buffer.alloc(outW * outH * 4);
  for (let y = 0; y < outH; y++) {
    const sy = Math.min(srcH - 1, Math.max(0, ((y + 0.5) * srcH) / outH - 0.5));
    const y0 = Math.floor(sy);
    const y1 = Math.min(srcH - 1, y0 + 1);
    const fy = sy - y0;
    for (let x = 0; x < outW; x++) {
      const sx = Math.min(srcW - 1, Math.max(0, ((x + 0.5) * srcW) / outW - 0.5));
      const x0 = Math.floor(sx);
      const x1 = Math.min(srcW - 1, x0 + 1);
      const fx = sx - x0;
      const w00 = (1 - fx) * (1 - fy);
      const w01 = fx * (1 - fy);
      const w10 = (1 - fx) * fy;
      const w11 = fx * fy;
      const o = (y * outW + x) * 4;
      for (let c = 0; c < 4; c++) {
        const p00 = px[(y0 * srcW + x0) * 4 + c];
        const p01 = px[(y0 * srcW + x1) * 4 + c];
        const p10 = px[(y1 * srcW + x0) * 4 + c];
        const p11 = px[(y1 * srcW + x1) * 4 + c];
        out[o + c] = Math.round(w00 * p00 + w01 * p01 + w10 * p10 + w11 * p11);
      }
    }
  }
  return out;
}

function decodeUtf16le(buf: Buffer): string {
  return buf.toString("utf16le").replace(/\0.*$/s, "").trim();
}

export function analyzeNds(rom: Buffer): NdsMetadata {
  if (rom.length < 0x68) {
    throw new Error("ROM trop petite pour contenir un header NDS");
  }
  const rawHeaderTitle = rom.subarray(0x00, 0x0c).toString("ascii").replace(/\0.*$/s, "").trim();
  const titleId = rom.subarray(0x0c, 0x10).toString("ascii").trim();
  const makerCode = rom.subarray(0x10, 0x12).toString("ascii").trim();
  const version = rom[0x1e].toString();
  const regionCode = rom[0x1f];

  const bl = rom.readUInt32LE(0x68);
  const hasBanner = bl > 0 && bl + 0xa40 <= rom.length;

  const titles: Record<string, string> = {};
  let iconDataUrl = "";
  let iconBytes = 0;

  if (hasBanner) {
    for (let i = 0; i < TITLE_LANGS.length; i++) {
      const t = decodeUtf16le(rom.subarray(bl + 0x240 + i * 0x100, bl + 0x240 + (i + 1) * 0x100));
      if (t) titles[TITLE_LANGS[i]] = t;
    }
    const png = encodePng(48, 48, upscale(decodeIcon(rom, bl)));
    iconDataUrl = `data:image/png;base64,${png.toString("base64")}`;
    iconBytes = png.length;
  }

  const language = titles.fr ? "fr" : titles.en ? "en" : Object.keys(titles)[0] || "en";
  const title = titles[language] || titles.en || Object.values(titles)[0] || rawHeaderTitle || "Unknown";

  return {
    title,
    titleId,
    makerCode,
    version,
    region: REGIONS[regionCode] || "",
    language,
    titles,
    icon: iconDataUrl,
    iconBytes,
  };
}