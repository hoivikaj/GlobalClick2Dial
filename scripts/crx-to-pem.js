#!/usr/bin/env node
/**
 * Extract the public key from a CRX file and print it as PEM.
 * Usage: node crx-to-pem.js path/to/extension.crx
 *
 * Supports CRX2 and CRX3. Output is the PEM string (-----BEGIN PUBLIC KEY----- ...).
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
  let pubKeyLength, sigLength, keyOffset;

  if (version === 2) {
    pubKeyLength = readU32LE(crxBuffer, 8);
    sigLength = readU32LE(crxBuffer, 12);
    keyOffset = 16;
  } else if (version === 3) {
    // CRX3: header has proof set; first proof is the RSA/EC public key
    const headerLen = readU32LE(crxBuffer, 8);
    if (crxBuffer.length < 12 + headerLen) throw new Error('CRX3 header truncated');
    const header = crxBuffer.subarray(12, 12 + headerLen);
    // CRX3 proof_set is a repeated length-prefixed field; first entry is often the public key (DER)
    let off = 0;
    if (header.length < 4) throw new Error('CRX3 header too short');
    const firstLen = readU32LE(header, 0);
    if (header.length < 4 + firstLen) throw new Error('CRX3 first proof length exceeds header');
    const keyDer = header.subarray(4, 4 + firstLen);
    return keyDer;
  } else {
    throw new Error('Unsupported CRX version: ' + version);
  }

  if (crxBuffer.length < keyOffset + pubKeyLength + sigLength) {
    throw new Error('CRX truncated');
  }
  return crxBuffer.subarray(keyOffset, keyOffset + pubKeyLength);
}

function derToPem(derBuffer, label = 'PUBLIC KEY') {
  const b64 = derBuffer.toString('base64');
  const lines = [];
  for (let i = 0; i < b64.length; i += 64) {
    lines.push(b64.slice(i, i + 64));
  }
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----`;
}

const crxPath = process.argv[2];
if (!crxPath) {
  console.error('Usage: node crx-to-pem.js <path-to-extension.crx>');
  process.exit(1);
}

const buf = fs.readFileSync(path.resolve(crxPath));
const keyDer = extractPublicKeyFromCRX(buf);
// DER from CRX is usually SubjectPublicKeyInfo (already "PUBLIC KEY")
const pem = derToPem(keyDer);
console.log(pem);
