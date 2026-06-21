// 九号 ebike API 解密模块 — AES-128-CBC 纯 TypeScript 实现
// 加密结构: s=Base64(key16+iv16+...), r=Base64(AES密文)
// 解密: 从 s 提取 key+iv → 解密 r → 明文 JSON

// ─── Base64 解码 ───
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

function base64ToBytes(b64: string): number[] {
  let s = b64.replace(/\s/g, "")
  while (s.length % 4 !== 0) s += "="
  const bytes: number[] = []
  for (let i = 0; i < s.length; i += 4) {
    const a = B64.indexOf(s[i])
    const b = B64.indexOf(s[i + 1])
    const c = s[i + 2] === "=" ? 0 : B64.indexOf(s[i + 2])
    const d = s[i + 3] === "=" ? 0 : B64.indexOf(s[i + 3])
    bytes.push((a << 2) | (b >> 4))
    if (s[i + 2] !== "=") bytes.push(((b & 15) << 4) | (c >> 2))
    if (s[i + 3] !== "=") bytes.push(((c & 3) << 6) | d)
  }
  return bytes
}

// ─── AES-128 S-Box / Inverse S-Box ───
const SBOX: number[] = [
  0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
  0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
  0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
  0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
  0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
  0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
  0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
  0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
  0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
  0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
  0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
  0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
  0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
  0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
  0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
  0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16,
]

const INV_SBOX: number[] = new Array(256)
for (let i = 0; i < 256; i++) INV_SBOX[SBOX[i]] = i

const RCON = [0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36]

// ─── GF(2^8) 乘法 ───
function gmul(a: number, b: number): number {
  let p = 0
  for (let i = 0; i < 8; i++) {
    if (b & 1) p ^= a
    const hi = a & 0x80
    a = (a << 1) & 0xff
    if (hi) a ^= 0x1b
    b >>= 1
  }
  return p
}

// ─── 密钥扩展 ───
function keyExpansion(key: number[]): number[] {
  const w = new Array<number>(176)
  for (let i = 0; i < 16; i++) w[i] = key[i]
  for (let i = 16; i < 176; i += 4) {
    const t0 = w[i - 4], t1 = w[i - 3], t2 = w[i - 2], t3 = w[i - 1]
    if (i % 16 === 0) {
      const s0 = SBOX[t1] ^ RCON[(i >> 4) - 1]
      const s1 = SBOX[t2]
      const s2 = SBOX[t3]
      const s3 = SBOX[t0]
      w[i]     = w[i - 16] ^ s0
      w[i + 1] = w[i - 15] ^ s1
      w[i + 2] = w[i - 14] ^ s2
      w[i + 3] = w[i - 13] ^ s3
    } else {
      w[i]     = w[i - 16] ^ t0
      w[i + 1] = w[i - 15] ^ t1
      w[i + 2] = w[i - 14] ^ t2
      w[i + 3] = w[i - 13] ^ t3
    }
  }
  return w
}

// ─── InvShiftRows ───
// AES 状态列主序: s[row + 4*col]
// Row 0: 0,4,8,12   Row 1: 1,5,9,13   Row 2: 2,6,10,14   Row 3: 3,7,11,15
function invShiftRows(s: number[]): void {
  let t: number
  // Row 1: 右移 1
  t = s[13]; s[13] = s[9]; s[9] = s[5]; s[5] = s[1]; s[1] = t
  // Row 2: 右移 2 (= 交换)
  t = s[10]; s[10] = s[2]; s[2] = t
  t = s[14]; s[14] = s[6]; s[6] = t
  // Row 3: 右移 3 (= 左移 1)
  t = s[3]; s[3] = s[7]; s[7] = s[11]; s[11] = s[15]; s[15] = t
}

// ─── InvMixColumns ───
// 矩阵: [0e 0b 0d 09; 09 0e 0b 0d; 0d 09 0e 0b; 0b 0d 09 0e]
function invMixColumns(s: number[]): void {
  for (let c = 0; c < 4; c++) {
    const i = c * 4
    const a = s[i], b = s[i + 1], cc = s[i + 2], d = s[i + 3]
    s[i]     = gmul(a, 0x0e) ^ gmul(b, 0x0b) ^ gmul(cc, 0x0d) ^ gmul(d, 0x09)
    s[i + 1] = gmul(a, 0x09) ^ gmul(b, 0x0e) ^ gmul(cc, 0x0b) ^ gmul(d, 0x0d)
    s[i + 2] = gmul(a, 0x0d) ^ gmul(b, 0x09) ^ gmul(cc, 0x0e) ^ gmul(d, 0x0b)
    s[i + 3] = gmul(a, 0x0b) ^ gmul(b, 0x0d) ^ gmul(cc, 0x09) ^ gmul(d, 0x0e)
  }
}

// ─── AES-128 解密单个块 ───
function aesDecryptBlock(block: number[], w: number[]): number[] {
  const s = block.slice()
  // 初始: AddRoundKey(10)
  for (let i = 0; i < 16; i++) s[i] ^= w[160 + i]
  // 轮 9 到 1
  for (let round = 9; round >= 1; round--) {
    invShiftRows(s)
    for (let i = 0; i < 16; i++) s[i] = INV_SBOX[s[i]]
    for (let i = 0; i < 16; i++) s[i] ^= w[round * 16 + i]
    invMixColumns(s)
  }
  // 最后轮（无 InvMixColumns）
  invShiftRows(s)
  for (let i = 0; i < 16; i++) s[i] = INV_SBOX[s[i]]
  for (let i = 0; i < 16; i++) s[i] ^= w[i]
  return s
}

// ─── AES-128-CBC 解密 ───
function aesCbcDecrypt(ciphertext: number[], key: number[], iv: number[]): number[] {
  const w = keyExpansion(key)
  const output: number[] = []
  let prev = iv
  for (let offset = 0; offset < ciphertext.length; offset += 16) {
    const block = ciphertext.slice(offset, offset + 16)
    const dec = aesDecryptBlock(block, w)
    for (let i = 0; i < 16; i++) output.push(dec[i] ^ prev[i])
    prev = block
  }
  // PKCS7 去填充
  const pad = output[output.length - 1]
  if (pad >= 1 && pad <= 16) output.length -= pad
  return output
}

// ─── 主解密函数 ───
export function ninebotDecrypt(sB64: string, rB64: string): any {
  // s 字段 = Base64(key16 + iv16 + 其他)
  const sBytes = base64ToBytes(sB64)
  const key = sBytes.slice(0, 16)
  const iv = sBytes.slice(16, 32)
  // r 字段 = Base64(AES 密文)
  const rBytes = base64ToBytes(rB64)
  // AES-128-CBC 解密
  const plain = aesCbcDecrypt(rBytes, key, iv)
  // 转字符串
  let text = ""
  for (const b of plain) text += String.fromCharCode(b)
  // 调试: 输出解密结果的前 200 字节
  const hex = plain.slice(0, 200).map(b => b.toString(16).padStart(2, '0')).join(' ')
  const preview = text.substring(0, 120).replace(/[\x00-\x1f]/g, '?')
  throw new Error(`DEBUG len=${plain.length} hex: ${hex}\npreview: ${preview}`)
  // return JSON.parse(text)
}
