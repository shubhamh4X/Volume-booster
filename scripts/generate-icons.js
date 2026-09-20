import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPng(width, height, drawPixel) {
  // PNG Signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth 8
  ihdrData.writeUInt8(6, 9); // color type 6: RGBA
  ihdrData.writeUInt8(0, 10); // compression method 0
  ihdrData.writeUInt8(0, 11); // filter method 0
  ihdrData.writeUInt8(0, 12); // interlace method 0
  const ihdr = makeChunk('IHDR', ihdrData);

  // Raw image data with filter byte 0 at start of each scanline
  const scanlineLength = width * 4 + 1;
  const rawData = Buffer.alloc(height * scanlineLength);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawPixel(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  // IDAT Chunk
  const compressed = zlib.deflateSync(rawData);
  const idat = makeChunk('IDAT', compressed);

  // IEND Chunk
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

// CRC32 implementation
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ table[(c ^ buf[i]) & 0xff];
  }
  return (c ^ 0xffffffff) >>> 0;
}

const table = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  table[n] = c;
}

// Monochrome High-Contrast Icon Drawer
function drawIconPixel(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const r = w / 2 - 1;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Smooth circular badge background (black #09090b with zinc border)
  if (dist > r) return [0, 0, 0, 0]; // transparent outside
  if (dist > r - 1.5) return [113, 113, 122, 255]; // zinc-500 border

  // Inside speaker icon logic (normalized 0 to 1)
  const nx = x / w;
  const ny = y / h;

  // Speaker body in white (#ffffff)
  // Left rectangle
  if (nx >= 0.22 && nx <= 0.40 && ny >= 0.38 && ny <= 0.62) {
    return [255, 255, 255, 255];
  }
  // Funnel trapezoid
  if (nx >= 0.38 && nx <= 0.58) {
    const halfH = 0.12 + (nx - 0.38) * 0.9;
    if (Math.abs(ny - 0.5) <= halfH) {
      return [255, 255, 255, 255];
    }
  }

  // Soundwave arcs
  const waveDist1 = Math.hypot(nx - 0.56, ny - 0.5);
  if (waveDist1 >= 0.14 && waveDist1 <= 0.20 && nx > 0.58 && Math.abs(ny - 0.5) <= 0.22) {
    return [255, 255, 255, 255];
  }

  const waveDist2 = Math.hypot(nx - 0.56, ny - 0.5);
  if (waveDist2 >= 0.26 && waveDist2 <= 0.32 && nx > 0.62 && Math.abs(ny - 0.5) <= 0.32) {
    return [255, 255, 255, 255];
  }

  return [9, 9, 11, 255]; // dark zinc #09090b
}

// Generate for extension and public
const dirs = ['./extension/icons', './public/icons'];
for (const dir of dirs) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

[16, 48, 128].forEach(size => {
  const png = createPng(size, size, drawIconPixel);
  fs.writeFileSync(`./extension/icons/icon${size}.png`, png);
  fs.writeFileSync(`./public/icons/icon${size}.png`, png);
  console.log(`Generated icon${size}.png`);
});
