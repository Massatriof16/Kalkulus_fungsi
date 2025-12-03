/* ===========================
   TAB HANDLING
=========================== */
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

        btn.classList.add("active");
        document.getElementById(btn.dataset.tab).classList.add("active");
    };
});

/* ===========================
   GLOBAL PIN HANDLING
=========================== */
let PIN = 0;
const a = 17;          // constant multiplier
const a_inv = 241;     // modular inverse of 17 mod 256
const n = 256;         // modulus

function savePIN() {
    PIN = parseInt(document.getElementById("pinInput").value);
    alert("PIN saved!");
}

function resetPIN() {
    PIN = 0;
    document.getElementById("pinInput").value = "";
    alert("PIN reset.");
}

/* ===========================
   ENCRYPTION FUNCTION
=========================== */
function encryptChar(x) {
    return (a * x + PIN) % n;
}

function decryptChar(y) {
    return (a_inv * (y - PIN)) % n;
}

/* ===========================
   TEXT ENCRYPTION / DECRYPTION
=========================== */
function encryptText() {
    let text = document.getElementById("plainText").value;
    let bytes = [...text].map(c => c.charCodeAt(0));
    let enc = bytes.map(b => encryptChar(b));
    document.getElementById("textOutput").textContent = btoa(String.fromCharCode(...enc));
}

function decryptText() {
    let raw = atob(document.getElementById("cipherText").value);
    let bytes = [...raw].map(c => c.charCodeAt(0));
    let dec = bytes.map(b => decryptChar(b));
    document.getElementById("textOutput").textContent = String.fromCharCode(...dec);
}

/* ===========================
   FILE ENCRYPTION
=========================== */
async function encryptFile() {
    let file = document.getElementById("encryptFileInput").files[0];
    if (!file) return alert("Select a file first!");

    showEncryptProgress();

    let buffer = await file.arrayBuffer();
    let bytes = new Uint8Array(buffer);

    let chunk = 4096;
    let encrypted = new Uint8Array(bytes.length);

    for (let i = 0; i < bytes.length; i += chunk) {
        for (let j = 0; j < chunk && i+j < bytes.length; j++) {
            encrypted[i+j] = encryptChar(bytes[i+j]);
        }
        updateEncryptProgress(i + chunk, bytes.length);
        await sleep(5);
    }

    let blob = new Blob([encrypted], { type: "application/octet-stream" });
    let url = URL.createObjectURL(blob);

    let dl = document.getElementById("encryptDownload");
    dl.href = url;
    dl.download = file.name + ".enc";
    dl.classList.remove("hidden");
}

async function decryptFile() {
    let file = document.getElementById("decryptFileInput").files[0];
    if (!file) return alert("Select a file first!");

    showDecryptProgress();

    let buffer = await file.arrayBuffer();
    let bytes = new Uint8Array(buffer);

    let chunk = 4096;
    let decrypted = new Uint8Array(bytes.length);

    for (let i = 0; i < bytes.length; i += chunk) {
        for (let j = 0; j < chunk && i+j < bytes.length; j++) {
            decrypted[i+j] = decryptChar(bytes[i+j]);
        }
        updateDecryptProgress(i + chunk, bytes.length);
        await sleep(5);
    }

    let blob = new Blob([decrypted], { type: "application/octet-stream" });
    let url = URL.createObjectURL(blob);

    let dl = document.getElementById("decryptDownload");
    dl.href = url;
    dl.download = file.name.replace(".enc", ".dec");
    dl.classList.remove("hidden");
}

/* ===========================
   PROGRESS BAR
=========================== */
function showEncryptProgress() {
    document.getElementById("encryptProgress").classList.remove("hidden");
    updateEncryptProgress(0, 1);
}

function showDecryptProgress() {
    document.getElementById("decryptProgress").classList.remove("hidden");
    updateDecryptProgress(0, 1);
}

function updateEncryptProgress(done, total) {
    let pct = Math.min(100, Math.floor((done / total) * 100));
    document.getElementById("encryptBar").style.width = pct + "%";
    document.getElementById("encryptPercent").textContent = pct + "%";
}

function updateDecryptProgress(done, total) {
    let pct = Math.min(100, Math.floor((done / total) * 100));
    document.getElementById("decryptBar").style.width = pct + "%";
    document.getElementById("decryptPercent").textContent = pct + "%";
}

function sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
}

/* ===========================
   TELEGRAM BOT
=========================== */
const BOT_TOKEN = "7612466712:AAGoSKw-S0c60u9ijt9hzYtw09dc3aauayQ";
let CHAT_ID = null;

function saveChatID() {
    CHAT_ID = document.getElementById("chatIdInput").value;
    alert("Chat ID saved!");
}

function resetChatID() {
    CHAT_ID = null;
    document.getElementById("chatIdInput").value = "";
    alert("Chat ID reset.");
}

async function sendEncryptedText() {
    if (!CHAT_ID) return alert("Set Chat ID first!");

    let text = document.getElementById("telegramText").value;
    let bytes = [...text].map(c => c.charCodeAt(0));
    let enc = bytes.map(b => encryptChar(b));
    let base = btoa(String.fromCharCode(...enc));

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: CHAT_ID, text: base })
    });

    alert("Message sent!");
}

async function sendEncryptedFile() {
    if (!CHAT_ID) return alert("Set Chat ID first!");

    let f = document.getElementById("telegramFileInput").files[0];
    if (!f) return alert("Select a file!");

    let buffer = await f.arrayBuffer();
    let bytes = new Uint8Array(buffer);
    let encrypted = bytes.map(b => encryptChar(b));

    let blob = new Blob([encrypted], { type: "application/octet-stream" });
    let form = new FormData();
    form.append("chat_id", CHAT_ID);
    form.append("document", blob, f.name + ".enc");

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
        method: "POST",
        body: form
    });

    alert("Encrypted file sent!");
}