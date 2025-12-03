/* =========================
   ModCipher — client-side
   E(x) = (a*x + b) mod 256
   D(y) = a_inv*(y - b) mod 256
   Base64 transport for ciphertext
   ========================= */

/* -----------------------
   CONFIG
   ----------------------- */
// multiplier 'a' must be invertible mod 256 (odd and gcd(a,256)=1)
// you may change A (but ensure modInverse exists)
const A = 11;
const N = 256;
const BOT_TOKEN = "7612466712:AAGoSKw-S0c60u9ijt9hzYtw09dc3aauayQ"; // <-- PUT YOUR TELEGRAM BOT TOKEN HERE FOR TESTING (do NOT publish token publicly)


// ------------------------ DOM helpers ------------------------
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const toastEl = $("#toast");

function toast(msg, timeout=2200){
  if(!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  setTimeout(()=> toastEl.classList.add("hidden"), timeout);
}

// ------------------------ tabs ------------------------
$$(".tab").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    $$(".tab").forEach(b=>b.classList.remove("active"));
    $$(".tab-content").forEach(t=>t.classList.remove("active"));
    btn.classList.add("active");
    const target = btn.getAttribute("data-target");
    $("#" + target).classList.add("active");
  });
});

// ------------------------ localStorage keys ------------------------
const LS_PIN = "modcipher_pin_v1";
const LS_CHAT = "modcipher_chat_v1";

// ------------------------ PIN handling ------------------------
const pinInput = $("#pinInput");
const pinNote = $("#pinNote");
$("#savePinBtn").addEventListener("click", ()=>{
  const v = pinInput.value.trim();
  if(v === "" || isNaN(Number(v))){
    toast("PIN must be numeric");
    return;
  }
  localStorage.setItem(LS_PIN, String(Number(v)));
  updatePinNote();
  toast("PIN saved");
});
$("#resetPinBtn").addEventListener("click", ()=>{
  localStorage.removeItem(LS_PIN);
  pinInput.value = "";
  updatePinNote();
  toast("PIN reset");
});
function getPin(){
  const v = localStorage.getItem(LS_PIN);
  if(v === null) return null;
  return Number(v);
}
function updatePinNote(){
  const p = getPin();
  if(p === null) pinNote.textContent = "PIN not saved";
  else { pinNote.textContent = `PIN saved (b = ${p})`; pinInput.value = p; }
}
updatePinNote();

// ------------------------ Chat ID handling ------------------------
const chatInput = $("#chatIdInput");
const chatNote = $("#chatNote");
$("#saveChatBtn").addEventListener("click", ()=>{
  const v = chatInput.value.trim();
  if(!v){ toast("Chat ID empty"); return; }
  localStorage.setItem(LS_CHAT, v);
  updateChatNote();
  toast("Chat ID saved");
});
$("#resetChatBtn").addEventListener("click", ()=>{
  localStorage.removeItem(LS_CHAT);
  chatInput.value = "";
  updateChatNote();
  toast("Chat ID reset");
});
function getChatId(){
  return localStorage.getItem(LS_CHAT);
}
function updateChatNote(){
  const v = getChatId();
  chatNote.textContent = v ? `Chat ID saved: ${v}` : "No Chat ID saved";
}
updateChatNote();

// ------------------------ Math helpers ------------------------
function gcd(a,b){
  a = Math.abs(a); b = Math.abs(b);
  while(b){ const t = a % b; a = b; b = t; }
  return a;
}
function modInv(a, n){
  a = ((a % n) + n) % n;
  let t = 0, newT = 1;
  let r = n, newR = a;
  while(newR !== 0){
    const q = Math.floor(r / newR);
    const tmpT = t - q*newT; t = newT; newT = tmpT;
    const tmpR = r - q*newR; r = newR; newR = tmpR;
  }
  if(r > 1) return null;
  if(t < 0) t += n;
  return t % n;
}
const A_INV = modInv(A, N);
if(A_INV === null) console.warn("A has no modular inverse for N=", N);

// ------------------------ Base64 <-> bytes ------------------------
function bytesToBase64(bytes){
  let binary = "";
  const chunk = 0x8000;
  for(let i=0;i<bytes.length;i+=chunk){
    const sub = bytes.subarray(i, i+chunk);
    binary += String.fromCharCode.apply(null, sub);
  }
  return btoa(binary);
}
function base64ToBytes(b64){
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) arr[i] = bin.charCodeAt(i);
  return arr;
}
function textToBytes(str){ return new TextEncoder().encode(str); }
function bytesToText(b){ return new TextDecoder().decode(b); }

// ------------------------ core encrypt / decrypt ------------------------
function encryptBytes(byteArray, a, b){
  const out = new Uint8Array(byteArray.length);
  for(let i=0;i<byteArray.length;i++){
    out[i] = ((a * byteArray[i]) + b) % N;
  }
  return out;
}
function decryptBytes(byteArray, a, b){
  const aInv = modInv(a, N);
  if(aInv === null) throw new Error("a not invertible");
  const out = new Uint8Array(byteArray.length);
  for(let i=0;i<byteArray.length;i++){
    const t = (byteArray[i] - b) % N;
    const tpos = (t + N) % N;
    out[i] = (aInv * tpos) % N;
  }
  return out;
}

// ------------------------ TEXT handlers ------------------------
const plainInput = $("#plainInput");
const cipherInput = $("#cipherInput");
const textOutput = $("#textOutput");
$("#encryptTextBtn").addEventListener("click", ()=>{
  const b = getPin();
  if(b === null){ toast("Save PIN first"); return; }
  const txt = plainInput.value || "";
  const bytes = textToBytes(txt);
  const enc = encryptBytes(bytes, A, b);
  const b64 = bytesToBase64(enc);
  textOutput.textContent = b64;
  toast("Text encrypted");
});
$("#decryptTextBtn").addEventListener("click", ()=>{
  const b = getPin();
  if(b === null){ toast("Save PIN first"); return; }
  const b64 = cipherInput.value.trim();
  if(!b64){ toast("Paste ciphertext Base64"); return; }
  try{
    const bytes = base64ToBytes(b64);
    const dec = decryptBytes(bytes, A, b);
    const txt = bytesToText(dec);
    textOutput.textContent = txt;
    toast("Decrypted");
  } catch(e){
    textOutput.textContent = "Decryption error: " + String(e);
  }
});
$("#copyTextBtn").addEventListener("click", async ()=>{
  const v = textOutput.textContent;
  if(!v) return;
  try{ await navigator.clipboard.writeText(v); toast("Copied") } catch(e){ toast("Copy failed") }
});
$("#clearTextBtn").addEventListener("click", ()=>{ textOutput.textContent = ""; });

// ------------------------ FILE handlers (chunked) ------------------------
const encInput = $("#fileEncryptInput");
const decInput = $("#fileDecryptInput");
const encryptBar = $("#encryptBar");
const encryptPct = $("#encryptPct");
const decryptBar = $("#decryptBar");
const decryptPct = $("#decryptPct");
const downloadEnc = $("#downloadEnc");
const downloadDec = $("#downloadDec");
const fileLog = $("#fileLog");

function logFile(msg){
  fileLog.textContent = msg + "\n" + fileLog.textContent;
}

async function encryptFile(){
  const file = encInput.files[0];
  const b = getPin();
  if(!file){ toast("Select file"); return; }
  if(b === null){ toast("Save PIN first"); return; }

  // prepare UI
  $("#encryptProgress").classList.remove("hidden");
  encryptBar.style.width = "0%";
  encryptPct.textContent = "0%";
  downloadEnc.classList.add("hidden");
  fileLog.textContent = "";

  const chunkSize = 64 * 1024; // 64KB
  const total = file.size;
  const reader = file.stream().getReader();
  let received = 0;
  const parts = [];

  while(true){
    const {done, value} = await reader.read();
    if(done) break;
    const chunk = new Uint8Array(value);
    const enc = encryptBytes(chunk, A, b);
    parts.push(enc);
    received += chunk.length;
    const pct = Math.floor((received / total) * 100);
    encryptBar.style.width = pct + "%";
    encryptPct.textContent = pct + "%";
    await new Promise(r => setTimeout(r, 8)); // yield to UI
  }

  // concatenate parts
  let out = new Uint8Array(parts.reduce((s,p)=>s+p.length,0));
  let offset = 0;
  for(const p of parts){ out.set(p, offset); offset += p.length; }

  // Base64 encode output (so it's safe as text)
  const b64 = bytesToBase64(out);
  const blob = new Blob([b64], { type: "text/plain" });
  downloadEnc.href = URL.createObjectURL(blob);
  downloadEnc.download = file.name + ".enc.txt";
  downloadEnc.classList.remove("hidden");
  logFile(`Encrypted: ${file.name} (${total} bytes)`);
  $("#encryptProgress").classList.add("hidden");
  toast("File encrypted (Base64). Ready to download.");
}

async function decryptFile(){
  const file = decInput.files[0];
  const b = getPin();
  if(!file){ toast("Select file"); return; }
  if(b === null){ toast("Save PIN first"); return; }

  $("#decryptProgress").classList.remove("hidden");
  decryptBar.style.width = "0%";
  decryptPct.textContent = "0%";
  downloadDec.classList.add("hidden");
  fileLog.textContent = "";

  // read whole file as text (Base64)
  const txt = await file.text();
  let bytes;
  try{ bytes = base64ToBytes(txt.trim()); }
  catch(e){ fileLog.textContent = "Not a valid Base64 encrypted file."; $("#decryptProgress").classList.add("hidden"); return; }

  const total = bytes.length;
  const chunkSize = 64 * 1024;
  const parts = [];
  let idx = 0;
  while(idx < bytes.length){
    const slice = bytes.subarray(idx, Math.min(idx+chunkSize, bytes.length));
    const dec = decryptBytes(slice, A, b);
    parts.push(dec);
    idx += slice.length;
    const pct = Math.floor((idx / total) * 100);
    decryptBar.style.width = pct + "%";
    decryptPct.textContent = pct + "%";
    await new Promise(r=>setTimeout(r,8));
  }

  // join
  let out = new Uint8Array(parts.reduce((s,p)=>s+p.length,0));
  let off = 0;
  for(const p of parts){ out.set(p, off); off += p.length; }

  const blob = new Blob([out], { type: "application/octet-stream" });
  downloadDec.href = URL.createObjectURL(blob);
  downloadDec.download = file.name.replace(/\.enc(\.txt)?$/i, "") || (file.name + ".dec");
  downloadDec.classList.remove("hidden");
  logFile(`Decrypted: ${file.name} (${total} bytes)`);
  $("#decryptProgress").classList.add("hidden");
  toast("File decrypted. Ready to download.");
}

$("#clearFileLogBtn").addEventListener("click", ()=> fileLog.textContent = "");

// ------------------------ TELEGRAM send ------------------------
const tgLog = $("#tgLog");
function logTg(msg){ tgLog.textContent = msg + "\n" + tgLog.textContent; }

async function sendTelegramMessage(chatId, text){
  if(!BOT_TOKEN){ throw new Error("BOT_TOKEN not set"); }
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method:"POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ chat_id: chatId, text })
  });
  return await res.json();
}

async function sendTelegramDocument(chatId, blob, filename){
  if(!BOT_TOKEN){ throw new Error("BOT_TOKEN not set"); }
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`;
  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("document", blob, filename);
  const res = await fetch(url, { method:"POST", body: form });
  return await res.json();
}

$("#sendTgTextBtn").addEventListener("click", async ()=>{
  const chat = getChatId();
  if(!chat){ toast("Save Chat ID first"); return; }
  const b = getPin();
  if(b === null){ toast("Save PIN first"); return; }
  const txt = $("#tgPlain").value || "";
  const enc = encryptBytes(textToBytes(txt), A, b);
  const b64 = bytesToBase64(enc);
  $("#tgTextNote").textContent = "Sending...";
  try{
    const res = await sendTelegramMessage(chat, b64);
    logTg(`sendMessage -> ${JSON.stringify(res)}`);
    $("#tgTextNote").textContent = res.ok ? "Sent ✔" : "Failed";
    toast(res.ok ? "Message sent" : "Send failed");
  }catch(e){
    logTg("Error: "+String(e));
    $("#tgTextNote").textContent = "Error";
    toast("Send failed");
  }
});

$("#sendTgFileBtn").addEventListener("click", async ()=>{
  const chat = getChatId();
  if(!chat){ toast("Save Chat ID first"); return; }
  const b = getPin();
  if(b===null){ toast("Save PIN first"); return; }
  const f = $("#tgFileInput").files[0];
  if(!f){ toast("Select a