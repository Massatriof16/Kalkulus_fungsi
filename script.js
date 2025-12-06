// script.js — FIXED FOR YOUR HTML
"use strict";

/* ================================
   CONFIG
================================= */
const A = 11;
const N = 256;
const A_INV = modInv(A, N);

/* ================================
   HELPERS
================================= */
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

function textToBytes(t) { return new TextEncoder().encode(t); }
function bytesToText(b) { return new TextDecoder().decode(b); }

function bytesToBase64(bytes) {
  let bin = "";
  const part = 0x8000;
  for (let i = 0; i < bytes.length; i += part)
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + part));
  return btoa(bin);
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

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
    const t = ((bytes[i] - b + 256) % 256);
    out[i] = (aInv * t) % 256;
  }
  return out;
}

/* ================================
   TEXT ENCRYPT / DECRYPT
================================= */
function encryptText() {
  const b = parseInt(document.querySelector("#pin-input").value);
  const plain = document.querySelector("#encrypt-text-input").value;
  if (isNaN(b)) return alert("PIN kosong.");

  const enc = encryptBytes(textToBytes(plain), A, b);
  document.querySelector("#output-text").value = bytesToBase64(enc);
}

function decryptText() {
  const b = parseInt(document.querySelector("#pin-input").value);
  const base64 = document.querySelector("#decrypt-text-input").value.trim();
  if (isNaN(b)) return alert("PIN kosong.");

  try {
    const enc = base64ToBytes(base64);
    const dec = decryptBytes(enc, A, b);
    document.querySelector("#output-text").value = bytesToText(dec);
  } catch {
    alert("Ciphertext tidak valid atau PIN salah.");
  }
}

/* ================================
   FILE ENCRYPT / DECRYPT
================================= */
async function encryptFile() {
  const b = parseInt(document.querySelector("#pin-input").value);
  const file = document.querySelector("#encrypt-file-input").files[0];
  if (!file) return alert("Pilih file!");
  if (isNaN(b)) return alert("PIN kosong.");

  const buf = await file.arrayBuffer();
  const enc = encryptBytes(new Uint8Array(buf), A, b);

  const base64 = bytesToBase64(enc);
  const blob = new Blob([base64], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = file.name + ".enc.txt";
  a.click();

  URL.revokeObjectURL(url);
}

async function decryptFile() {
  const b = parseInt(document.querySelector("#pin-input").value);
  const file = document.querySelector("#decrypt-file-input").files[0];
  if (!file) return alert("Pilih file!");
  if (isNaN(b)) return alert("PIN kosong.");

  const base64 = await file.text();
  let enc;

  try { enc = base64ToBytes(base64.trim()); }
  catch { return alert("File terenkripsi rusak."); }

  const dec = decryptBytes(enc, A, b);

  const blob = new Blob([dec], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = file.name.replace(".enc.txt", "") || "file.dec";
  a.click();

  URL.revokeObjectURL(url);
}

/* ================================
   TELEGRAM SEND
================================= */
// (token tetap kosong seperti file aslimu)
const BOT_TOKEN = "";

async function sendText() {
  const b = parseInt(document.querySelector("#pin-input").value);
  const chat = document.querySelector("#chat-id-input").value;
  const text = document.querySelector("#telegram-text-input").value;

  if (!BOT_TOKEN) return alert("BOT_TOKEN kosong.");
  if (!chat) return alert("Chat ID kosong.");
  if (isNaN(b)) return alert("PIN kosong.");

  const enc = encryptBytes(textToBytes(text), A, b);
  const b64 = bytesToBase64(enc);

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text: b64 })
  });
}

async function sendFile() {
  const b = parseInt(document.querySelector("#pin-input").value);
  const chat = document.querySelector("#chat-id-input").value;
  const file = document.querySelector("#telegram-file-input").files[0];

  if (!BOT_TOKEN) return alert("BOT_TOKEN kosong.");
  if (!chat) return alert("Chat ID kosong.");
  if (!file) return alert("Pilih file.");
  if (isNaN(b)) return alert("PIN kosong.");

  const buf = await file.arrayBuffer();
  const enc = encryptBytes(new Uint8Array(buf), A, b);
  const b64 = bytesToBase64(enc);

  const blob = new Blob([b64], { type: "text/plain" });
  const fd = new FormData();

  fd.append("chat_id", chat);
  fd.append("document", blob, file.name + ".enc.txt");

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
    method: "POST",
    body: fd
  });
}

/* ================================
   BUTTON BINDING (sesuai HTML)
================================= */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelector("#encrypt-text")?.addEventListener("click", encryptText);
  document.querySelector("#decrypt-text")?.addEventListener("click", decryptText);

  document.querySelector("#encrypt-file")?.addEventListener("click", encryptFile);
  document.querySelector("#decrypt-file")?.addEventListener("click", decryptFile);

  document.querySelector("#send-text")?.addEventListener("click", sendText);
  document.querySelector("#send-file")?.addEventListener("click", sendFile);
});