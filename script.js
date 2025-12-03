/* script.js
 Client-side only encryption app:
 E(x) = (a*x + b) mod 256
 D(y) = a_inv * (y - b) mod 256
 Uses Base64 to transport ciphertext.
*/

/////////////////////
// Config - Ubah sesuai kebutuhan
const A = 11;            // kunci a (harus gcd(a,256)=1) - default 11
const N = 256;           // modulus
const BOT_TOKEN = "7612466712:AAGoSKw-S0c60u9ijt9hzYtw09dc3aauayQ"; // <-- isi token bot kalian di sini (untuk demo)
/////////////////////

// Utilities: DOM
const qs = sel => document.querySelector(sel);
const qsa = sel => Array.from(document.querySelectorAll(sel));

// Tabs
qsa('.tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    qsa('.tab-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const t = btn.dataset.tab;
    qsa('.tab').forEach(tab=>tab.classList.remove('active'));
    qs('#tab-'+t).classList.add('active');
  });
});

// localStorage keys
const PIN_KEY = "app_pin_b";
const CHAT_KEY = "app_chat_id";

// Elements
const pinInput = qs('#pinInput');
const savePinBtn = qs('#savePinBtn');
const resetPinBtn = qs('#resetPinBtn');
const pinMsg = qs('#pinMsg');

const plainInput = qs('#plainInput');
const encryptTextBtn = qs('#encryptTextBtn');
const cipherInput = qs('#cipherInput');
const decryptTextBtn = qs('#decryptTextBtn');
const textOutput = qs('#textOutput');
const copyTextOutput = qs('#copyTextOutput');
const clearTextOutput = qs('#clearTextOutput');

const fileEncryptInput = qs('#fileEncryptInput');
const encryptFileBtn = qs('#encryptFileBtn');
const encFileMsg = qs('#encFileMsg');
const fileDecryptInput = qs('#fileDecryptInput');
const decryptFileBtn = qs('#decryptFileBtn');
const decFileMsg = qs('#decFileMsg');
const fileDownloadArea = qs('#fileDownloadArea');

const chatIdInput = qs('#chatIdInput');
const saveChatBtn = qs('#saveChatBtn');
const resetChatBtn = qs('#resetChatBtn');
const chatMsg = qs('#chatMsg');

const telegramPlain = qs('#telegramPlain');
const sendTelegramTextBtn = qs('#sendTelegramTextBtn');
const telegramTextMsg = qs('#telegramTextMsg');
const telegramFileInput = qs('#telegramFileInput');
const sendTelegramFileBtn = qs('#sendTelegramFileBtn');
const telegramFileMsg = qs('#telegramFileMsg');

// ------------ Math helpers ------------
function gcd(a,b){
  a = Math.abs(a); b = Math.abs(b);
  while(b){
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}

// Extended Euclidean - returns inverse of a mod n, or null
function modInverse(a, n){
  a = ((a % n) + n) % n;
  let t = 0, newT = 1;
  let r = n, newR = a;
  while(newR !== 0){
    const q = Math.floor(r / newR);
    const tmpT = t - q * newT;
    t = newT; newT = tmpT;
    const tmpR = r - q * newR;
    r = newR; newR = tmpR;
  }
  if (r > 1) return null; // not invertible
  if (t < 0) t += n;
  return t % n;
}

// Bytes <-> Base64 helpers
function bytesToBase64(bytes){
  // bytes: Uint8Array
  let binary = '';
  const chunkSize = 0x8000; // for large arrays
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, sub);
  }
  return btoa(binary);
}
function base64ToBytes(base64){
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++){
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Text <-> Bytes (UTF-8)
function textToBytes(str){
  return new TextEncoder().encode(str);
}
function bytesToText(bytes){
  return new TextDecoder().decode(bytes);
}

// ------------ Core encrypt / decrypt ------------
function encryptBytes(byteArray, a, b){
  // byteArray: Uint8Array
  const out = new Uint8Array(byteArray.length);
  for(let i=0;i<byteArray.length;i++){
    out[i] = ( (a * byteArray[i]) + b ) % N;
  }
  return out;
}
function decryptBytes(byteArray, a, b){
  const aInv = modInverse(a, N);
  if (aInv === null) throw new Error("a tidak memiliki invers modulo " + N);
  const out = new Uint8Array(byteArray.length);
  for(let i=0;i<byteArray.length;i++){
    // (y - b) mod N -> ensure positive
    const t = (byteArray[i] - b) % N;
    const tPos = (t + N) % N;
    out[i] = (aInv * tPos) % N;
  }
  return out;
}

// Text wrappers
function encryptTextToBase64(str, a, b){
  const bytes = textToBytes(str);
  const enc = encryptBytes(bytes, a, b);
  return bytesToBase64(enc);
}
function decryptBase64ToText(base64, a, b){
  const bytes = base64ToBytes(base64);
  const dec = decryptBytes(bytes, a, b);
  return bytesToText(dec);
}

// File helpers -> create downloadable blob
function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}

// ------------ UI logic / localStorage ------------
function loadPin(){
  const v = localStorage.getItem(PIN_KEY);
  if (v !== null){
    pinInput.value = v;
    pinMsg.textContent = "PIN loaded";
  } else {
    pinMsg.textContent = "";
  }
}
function savePin(){
  const v = pinInput.value.trim();
  if (v === "") { pinMsg.textContent = "PIN kosong"; return; }
  const n = Number(v);
  if (!Number.isFinite(n) || isNaN(n)){
    pinMsg.textContent = "PIN harus angka";
    return;
  }
  localStorage.setItem(PIN_KEY, String(n));
  pinMsg.textContent = "PIN disimpan";
}
function resetPin(){
  localStorage.removeItem(PIN_KEY);
  pinInput.value = "";
  pinMsg.textContent = "PIN direset";
}

function loadChat(){
  const v = localStorage.getItem(CHAT_KEY);
  if (v !== null){
    chatIdInput.value = v;
    chatMsg.textContent = "Chat ID loaded";
  } else chatMsg.textContent = "";
}
function saveChat(){
  const v = chatIdInput.value.trim();
  if (!v) { chatMsg.textContent = "Chat ID kosong"; return; }
  localStorage.setItem(CHAT_KEY, v);
  chatMsg.textContent = "Chat ID disimpan";
}
function resetChat(){
  localStorage.removeItem(CHAT_KEY);
  chatIdInput.value = "";
  chatMsg.textContent = "Chat ID direset";
}

// Initial load
loadPin();
loadChat();

// ------------ Text encryption handlers ------------
encryptTextBtn.addEventListener('click', ()=>{
  try {
    const b = Number(localStorage.getItem(PIN_KEY));
    if (Number.isNaN(b)) { pinMsg.textContent = "Simpan PIN dulu"; return; }
    const aInv = modInverse(A,N);
    if (aInv === null) { alert("A tidak invertible untuk N="+N); return; }
    const plain = plainInput.value || "";
    const base64 = encryptTextToBase64(plain, A, b);
    textOutput.textContent = base64;
  } catch (err) {
    textOutput.textContent = "Error: " + String(err);
  }
});

decryptTextBtn.addEventListener('click', ()=>{
  try {
    const b = Number(localStorage.getItem(PIN_KEY));
    if (Number.isNaN(b)) { pinMsg.textContent = "Simpan PIN dulu"; return; }
    const cipher = cipherInput.value.trim();
    if (!cipher) { textOutput.textContent = "Masukkan ciphertext Base64"; return; }
    const plain = decryptBase64ToText(cipher, A, b);
    textOutput.textContent = plain;
  } catch (err) {
    textOutput.textContent = "Error: " + String(err);
  }
});

copyTextOutput.addEventListener('click', ()=>{
  const txt = textOutput.textContent;
  if (!txt) return;
  navigator.clipboard?.writeText(txt).then(()=> {
    pinMsg.textContent = "Tersalin ke clipboard";
  }).catch(()=> pinMsg.textContent = "Gagal copy");
});
clearTextOutput.addEventListener('click', ()=>{
  textOutput.textContent = "";
});

// ------------ File encryption handlers ------------
encryptFileBtn.addEventListener('click', async ()=>{
  const file = fileEncryptInput.files[0];
  if (!file) { encFileMsg.textContent = "Pilih file dulu"; return; }
  const b = Number(localStorage.getItem(PIN_KEY));
  if (Number.isNaN(b)) { encFileMsg.textContent = "Simpan PIN dulu"; return; }

  encFileMsg.textContent = "Membaca file...";
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const enc = encryptBytes(bytes, A, b);
  const base64 = bytesToBase64(enc);
  const blob = new Blob([base64], { type: "text/plain" });
  const outName = file.name + ".enc";
  encFileMsg.textContent = "Selesai. Siap didownload.";
  fileDownloadArea.innerHTML = `<a id="dlEnc" href="#">Download ${outName}</a>`;
  const dlLink = qs('#dlEnc');
  dlLink.addEventListener('click', (e)=>{
    e.preventDefault();
    downloadBlob(blob, outName);
  });
});

decryptFileBtn.addEventListener('click', async ()=>{
  const file = fileDecryptInput.files[0];
  if (!file) { decFileMsg.textContent = "Pilih file terenkripsi (.enc)"; return; }
  const b = Number(localStorage.getItem(PIN_KEY));
  if (Number.isNaN(b)) { decFileMsg.textContent = "Simpan PIN dulu"; return; }

  decFileMsg.textContent = "Membaca file terenkripsi...";
  const txt = await file.text();
  try {
    const cipherBytes = base64ToBytes(txt.trim());
    const dec = decryptBytes(cipherBytes, A, b);
    const blob = new Blob([dec]);
    const outName = (file.name.replace(/\.enc$/i,"")) || "decrypted";
    decFileMsg.textContent = "Selesai. Siap didownload.";
    fileDownloadArea.innerHTML = `<a id="dlDec" href="#">Download ${outName}</a>`;
    const dlLink = qs('#dlDec');
    dlLink.addEventListener('click', (e)=>{
      e.preventDefault();
      downloadBlob(blob, outName);
    });
  } catch (err){
    decFileMsg.textContent = "Error dekripsi: " + String(err);
  }
});

// ------------ Telegram (fetch) handlers ------------
async function sendTelegramMessage(chatId, text){
  if (!BOT_TOKEN || BOT_TOKEN.includes("ISI_TOKEN")) {
    throw new Error("BOT_TOKEN belum diisi. Masukkan token di script.js");
  }
  const encText = encodeURIComponent(text);
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${chatId}&text=${encText}`;
  const res = await fetch(url, { method: 'GET' });
  const j = await res.json();
  return j;
}

async function sendTelegramDocument(chatId, blob, filename){
  if (!BOT_TOKEN || BOT_TOKEN.includes("ISI_TOKEN")) {
    throw new Error("BOT_TOKEN belum diisi. Masukkan token di script.js");
  }
  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('document', blob, filename);
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`;
  const res = await fetch(url, { method: 'POST', body: form });
  const j = await res.json();
  return j;
}

sendTelegramTextBtn.addEventListener('click', async ()=>{
  const chatId = localStorage.getItem(CHAT_KEY) || chatIdInput.value.trim();
  if (!chatId) { telegramTextMsg.textContent = "Simpan atau masukkan Chat ID dulu"; return; }
  const b = Number(localStorage.getItem(PIN_KEY));
  if (Number.isNaN(b)) { telegramTextMsg.textContent = "Simpan PIN dulu"; return; }

  const plain = telegramPlain.value || "";
  const base64 = encryptTextToBase64(plain, A, b);
  telegramTextMsg.textContent = "Mengirim...";
  try {
    const result = await sendTelegramMessage(chatId, base64);
    if (result.ok) telegramTextMsg.textContent = "Terkirim ✔";
    else telegramTextMsg.textContent = "Gagal: " + JSON.stringify(result);
  } catch (err){
    telegramTextMsg.textContent = "Error: " + String(err);
  }
});

sendTelegramFileBtn.addEventListener('click', async ()=>{
  const chatId = localStorage.getItem(CHAT_KEY) || chatIdInput.value.trim();
  if (!chatId) { telegramFileMsg.textContent = "Simpan atau masukkan Chat ID dulu"; return; }
  const b = Number(localStorage.getItem(PIN_KEY));
  if (Number.isNaN(b)) { telegramFileMsg.textContent = "Simpan PIN dulu"; return; }
  const file = telegramFileInput.files[0];
  if (!file) { telegramFileMsg.textContent = "Pilih file dulu"; return; }

  telegramFileMsg.textContent = "Membaca dan enkripsi file...";
  try {
    const ab = await file.arrayBuffer();
    const bytes = new Uint8Array(ab);
    const enc = encryptBytes(bytes, A, b);
    const base64 = bytesToBase64(enc);
    const blob = new Blob([base64], { type: "text/plain" });
    const outName = file.name + ".enc";
    telegramFileMsg.textContent = "Mengirim ke Telegram...";
    const result = await sendTelegramDocument(chatId, blob, outName);
    if (result.ok) telegramFileMsg.textContent = "Terkirim ✔";
    else telegramFileMsg.textContent = "Gagal kirim: " + JSON.stringify(result);
  } catch (err){
    telegramFileMsg.textContent = "Error: " + String(err);
  }
});

// ------------ Save/reset events ------------
savePinBtn.addEventListener('click', savePin);
resetPinBtn.addEventListener('click', resetPin);
saveChatBtn.addEventListener('click', saveChat);
resetChatBtn.addEventListener('click', resetChat);