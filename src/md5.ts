/**
 * Minimal, dependency-free MD5 implementation based on RFC 1321 (Rivest, 1992):
 * https://www.rfc-editor.org/rfc/rfc1321
 *
 * Why not Web Crypto (`crypto.subtle.digest`)?
 *  - It's async (returns a Promise), which would force this component to
 *    render in two passes (loading -> resolved), needing `useEffect` +
 *    state, and would produce a flash of "no avatar" on every mount.
 *  - It doesn't exist in Node's SSR runtime the same way it does in
 *    browsers/edge runtimes (support varies across Next.js versions and
 *    runtimes: Node "classic", Edge, etc.), which makes server-rendering
 *    unreliable.
 *
 * A small synchronous, pure-JS MD5 sidesteps all of that: identical output
 * on the server and the client, available immediately during the first
 * render, and zero runtime dependencies.
 *
 * MD5 is used here purely as a fast, well-distributed hash to turn a
 * string identifier into deterministic bytes for the avatar pattern -
 * NOT for any security purpose.
 */

function toUtf8Bytes(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let charCode = str.codePointAt(i)!;
    if (charCode > 0xffff) i++; // consumed a low surrogate as part of the pair
    if (charCode < 0x80) {
      bytes.push(charCode);
    } else if (charCode < 0x800) {
      bytes.push(0xc0 | (charCode >> 6), 0x80 | (charCode & 0x3f));
    } else if (charCode < 0x10000) {
      bytes.push(
        0xe0 | (charCode >> 12),
        0x80 | ((charCode >> 6) & 0x3f),
        0x80 | (charCode & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (charCode >> 18),
        0x80 | ((charCode >> 12) & 0x3f),
        0x80 | ((charCode >> 6) & 0x3f),
        0x80 | (charCode & 0x3f),
      );
    }
  }
  return bytes;
}

function rotateLeft(x: number, c: number): number {
  return (x << c) | (x >>> (32 - c));
}

function toInt32Words(bytes: number[]): number[] {
  const words: number[] = [];
  for (let i = 0; i < bytes.length; i += 4) {
    words.push(
      bytes[i] |
        0 |
        ((bytes[i + 1] || 0) << 8) |
        ((bytes[i + 2] || 0) << 16) |
        ((bytes[i + 3] || 0) << 24),
    );
  }
  return words;
}

const SHIFTS = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5,
  9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11,
  16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15,
  21,
];

const K = [
  0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a,
  0xa8304613, 0xfd469501, 0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
  0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821, 0xf61e2562, 0xc040b340,
  0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
  0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8,
  0x676f02d9, 0x8d2a4c8a, 0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
  0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70, 0x289b7ec6, 0xeaa127fa,
  0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
  0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92,
  0xffeff47d, 0x85845dd1, 0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
  0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
];

/**
 * Hashes `input` with MD5 and returns the 16-byte digest as a plain
 * array of numbers (0-255 each)
 */
export function md5(input: string): number[] {
  const message = toUtf8Bytes(input);
  const originalLengthBits = message.length * 8;

  message.push(0x80);
  while (message.length % 64 !== 56) {
    message.push(0);
  }
  for (let i = 0; i < 8; i++) {
    message.push((originalLengthBits / Math.pow(2, 8 * i)) & 0xff);
  }

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  const words = toInt32Words(message);

  for (let chunkStart = 0; chunkStart < words.length; chunkStart += 16) {
    const M = words.slice(chunkStart, chunkStart + 16);
    let A = a0;
    let B = b0;
    let C = c0;
    let D = d0;

    for (let i = 0; i < 64; i++) {
      let F: number;
      let g: number;

      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }

      F = (F + A + K[i] + M[g]) | 0;
      A = D;
      D = C;
      C = B;
      B = (B + rotateLeft(F, SHIFTS[i])) | 0;
    }

    a0 = (a0 + A) | 0;
    b0 = (b0 + B) | 0;
    c0 = (c0 + C) | 0;
    d0 = (d0 + D) | 0;
  }

  const toBytesLE = (n: number) => [
    n & 0xff,
    (n >>> 8) & 0xff,
    (n >>> 16) & 0xff,
    (n >>> 24) & 0xff,
  ];

  return [
    ...toBytesLE(a0),
    ...toBytesLE(b0),
    ...toBytesLE(c0),
    ...toBytesLE(d0),
  ];
}
