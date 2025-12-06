// script.js (FINAL FIXED STABLE VERSION)
// Affine Encrypt/Decrypt + File Encryption (Base64 Text) + Telegram Bot Send

"use strict";

/* ==========================================
   CONFIG
========================================== */
const A = 11;      // nilai a (harus coprime dengan 256)
const N = 256;     // modulus byte
const A_INV = modInv(A, N);

// Jangan taruh BOT_TOKEN di repo publik (bahaya!)
const BOT_TOKEN = "";  // isi hanya saat testing lokal

/* ==========================================
   MATH & BASE64 HELPERS
========================================== */
function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { const t = a % b; a = b; b = t; }
  return a;
}

function modInv(a, n) {
  a = ((a % n) + n) % n;
  let t = 0, newT = 1;
  let r = n, newR = a;

  while (newR !== 0) {
    const q = Math.floor(r / newR);
    [t, newT] = [newT, t - q * newT];
    [r, newR] = [newR, r - q * newR];
  }
  if (r > 1) return null;
  if (t < 0) t += n;
  return t % n;
}

function bytesToBase64(bytes) {
  let bin = "";
  const part = 0x8000;
  for (let i = 0; i < bytes.length; i += part) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + part));
  }
  return btoa(bin);
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function textToBytes(t) { return new TextEncoder().encode(t); }
function bytesToText(b) { return new TextDecoder().decode(b); }

/* ==========================================
   AFFINE ENCRYPT / DECRYPT
========================================== */
function encryptBytes(bytes, a, b) {
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++)
    out[i] = (a * bytes[i] + b) % 256;
  return out;
}

function decryptBytes(bytes, a, b) {
  const aInv = modInv(a, 256);
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    const t = ((bytes[i] - b) % 256 + 256) % 256;
    out[i] = (aInv * t) % 256;
  }
  return out;
}

/* ==========================================
   UTILITIES
========================================== */
function $(id) { return document.querySelector(id); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function setProgress(p) {
  const bar = $("#progressBar");
  if (bar) bar.style.width = p + "%";
}

function parsePinFrom(id) {
  let val = $("#" + id).value;
  if (val === "" || val === null) return null;
  val = parseInt(val);
  if (isNaN(val)) return null;
  return val & 0xFF;
}

/* ==========================================
   TEXT MODE
========================================== */
function encryptText() {
  const b = parsePinFrom("pinText");
  if (b === null) return alert("Isi PIN (b) dulu.");

  const plain = $("#inputEncryptText").value;
  const enc = encryptBytes(textToBytes(plain), A, b);
  $("#outputText").innerText = bytesToBase64(enc);
}

function decryptText() {
  const b = parsePinFrom("pinText");
  if (b === null) return alert("Isi PIN (b) dulu.");

  const base64 = $("#inputDecryptText").value.trim();
  try {
    const enc = base64ToBytes(base64);
    const dec = decryptBytes(enc, A, b);
    $("#outputText").innerText = bytesToText(dec);
  } catch {
    alert("Ciphertext tidak valid atau PIN salah.");
  }
}

/* ==========================================
   FILE MODE (CHUNKED + BASE64)
========================================== */
async function encryptFile() {
  const file = $("#fileEncrypt").files[0];
  const b = parsePinFrom("pinFile");
  if (!file) return alert("Pilih file!");
  if (b === null) return alert("Isi PIN!");

  setProgress(0);
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);

  const chunk = 64 * 1024;
  const parts = [];
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    parts.push(encryptBytes(slice, A, b));
    setProgress(Math.floor((i + slice.length) / bytes.length * 100));
    await sleep(5);
  }

  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of parts) { out.set(p, pos); pos += p.length; }

  const base64 = bytesToBase64(out);
  const blob = new Blob([base64], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = file.name + ".enc.txt";
  a.click();

  URL.revokeObjectURL(url);
  setProgress(100);
}

async function decryptFile() {
  const file = $("#fileDecrypt").files[0];
  const b = parsePinFrom("pinFile");
  if (!file) return alert("Pilih file!");
  if (b === null) return alert("Isi PIN!");

  setProgress(0);
  const base64 = (await file.text()).trim();

  let enc;
  try { enc = base64ToBytes(base64); }
  catch { return alert("File terenkripsi rusak."); }

  const chunk = 64 * 1024;
  const parts = [];
  for (let i = 0; i < enc.length; i += chunk) {
    const slice = enc.subarray(i, i + chunk);
    parts.push(decryptBytes(slice, A, b));
    setProgress(Math.floor((i + slice.length) / enc.length * 100));
    await sleep(5);
  }

  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of parts) { out.set(p, pos); pos += p.length; }

  const blob = new Blob([out], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = file.name.replace(/\.enc(\.txt)?$/, "") || (file.name + ".dec");
  a.click();

  URL.revokeObjectURL(url);
  setProgress(100);
}

/* ==========================================
   TELEGRAM SEND (Ciphertext)
========================================== */
async function sendEncryptedText() {
  const chat = $("#chatId").value;
  const b = parsePinFrom("pinBot");
  const plain = $("#botText").value;

  if (!BOT_TOKEN) return alert("BOT_TOKEN kosong");
  if (!chat) return alert("Masukkan Chat ID");
  if (b === null) return alert("Pin salah");

  const enc = encryptBytes(textToBytes(plain), A, b);
  const b64 = bytesToBase64(enc);

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text: b64 })
  });
}

async function sendEncryptedFile() {
  const chat = $("#chatId").value;
  const b = parsePinFrom("pinBot");
  const f = $("#botFile").files[0];

  if (!BOT_TOKEN) return alert("BOT_TOKEN kosong");
  if (!chat) return alert("Masukkan Chat ID");
  if (!f) return alert("Pilih file");
  if (b === null) return alert("Pin salah");

  const buf = await f.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const enc = encryptBytes(bytes, A, b);
  const b64 = bytesToBase64(enc);

  const blob = new Blob([b64], { type: "text/plain" });

  const fd = new FormData();
  fd.append("chat_id", chat);
  fd.append("document", blob, f.name + ".enc.txt");

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
    method: "POST",
    body: fd
  });
}

/* ==========================================
   BUTTON BINDING
========================================== */
document.addEventListener("DOMContentLoaded", () => {
  $("#encryptTextBtn")?.addEventListener("click", encryptText);
  $("#decryptTextBtn")?.addEventListener("click", decryptText);

  $("#encryptFileBtn")?.addEventListener("click", encryptFile);
  $("#decryptFileBtn")?.addEventListener("click", decryptFile);

  $("#sendTgTextBtn")?.addEventListener("click", sendEncryptedText);
  $("#sendTgFileBtn")?.addEventListener("click", sendEncryptedFile);
});