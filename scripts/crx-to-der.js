#!/usr/bin/env node
/**
 * Extract the public key from a CRX file and write it as DER (key.der).
 * Then you can run OpenSSL:
 *
 *   openssl pkey -pubin -inform DER -in key.der -outform PEM -out key.pem
 *
 * Or to see if it's RSA vs EC:
 *   openssl pkey -pubin -inform DER -in key.der -text -noout
 *
 * Usage: node crx-to-der.js path/to/extension.crx [output.der]
 */

const fs = require('fs');
const path = require('path');

function readU32LE(buf, offset) {
  return buf.readUInt32LE(offset);
}

function extractPublicKeyFromCRX(crxBuffer) {
  if (crxBuffer.length < 12) throw new Error('File too small to be a CRX');
  const magic = crxBuffer.toString('utf8', 0, 4);
  if (magic !== 'Cr24') throw new Error('Invalid CRX magic');

  const version = readU32LE(crxBuffer, 4);
  let pubKeyLength, keyOffset;

  if (version === 2) {
    pubKeyLength = readU32LE(crxBuffer, 8);
    const sigLength = readU32LE(crxBuffer, 12);
    keyOffset = 16;
    if (crxBuffer.length < keyOffset + pubKeyLength + sigLength) {
      throw new Error('CRX truncated');
    }
    return crxBuffer.subarray(keyOffset, keyOffset + pubKeyLength);
  }
  if (version === 3) {
    const headerLen = readU32LE(crxBuffer, 8);
    if (crxBuffer.length < 12 + headerLen) throw new Error('CRX3 header truncated');
    const header = crxBuffer.subarray(12, 12 + headerLen);
    if (header.length < 4) throw new Error('CRX3 header too short');
    const firstLen = readU32LE(header, 0);
    if (header.length < 4 + firstLen) throw new Error('CRX3 first proof length exceeds header');
    return header.subarray(4, 4 + firstLen);
  }
  throw new Error('Unsupported CRX version: ' + version);
}

const crxPath = process.argv[2];
const outPath = process.argv[3] || 'key.der';
if (!crxPath) {
  console.error('Usage: node crx-to-der.js <path-to-extension.crx> [output.der]');
  console.error('');
  console.error('Then run:');
  console.error('  openssl pkey -pubin -inform DER -in key.der -outform PEM -out key.pem');
  process.exit(1);
}

const buf = fs.readFileSync(path.resolve(crxPath));
const keyDer = extractPublicKeyFromCRX(buf);
fs.writeFileSync(path.resolve(outPath), keyDer);
console.log('Wrote', outPath);
console.log('Then: openssl pkey -pubin -inform DER -in', outPath, '-outform PEM -out key.pem');
console.log('Or to inspect: openssl pkey -pubin -inform DER -in', outPath, '-text -noout');
process.exit(0);
