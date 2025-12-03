// ====================== SISTEM TAB ======================
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelector(".tab-btn.active").classList.remove("active");
        btn.classList.add("active");

        document.querySelector(".tab.active").classList.remove("active");
        document.getElementById(btn.dataset.tab).classList.add("active");
    });
});


// =============== FUNGSI KRIPTOGRAFI ====================
const a = 11;     // a tetap
const n = 256;    // mod 256
const a_inv = 163; // invers dari 11 mod 256

function encryptChar(x, b) { return (a * x + b) % n; }
function decryptChar(y, b) { return (a_inv * (y - b)) % n; }


// ===================== PIN HANDLING =====================
function savePin() {
    const pin = document.getElementById("pin-text").value;
    if(pin === "") return alert("Isi PIN dulu");
    localStorage.setItem("pin", pin);

    document.getElementById("pin-file").value = pin;
    document.getElementById("pin-bot").value = pin;
}

function resetPin() {
    localStorage.removeItem("pin");
    document.getElementById("pin-text").value = "";
    document.getElementById("pin-file").value = "";
    document.getElementById("pin-bot").value = "";
}

window.onload = () => {
    const pin = localStorage.getItem("pin");
    if(pin){
        document.getElementById("pin-text").value = pin;
        document.getElementById("pin-file").value = pin;
        document.getElementById("pin-bot").value = pin;
    }
};


// ================== ENCRYPT / DECRYPT TEXT ==================
function encryptText() {
    const b = parseInt(document.getElementById("pin-text").value);
    const text = document.getElementById("text-en").value;

    let out = "";
    for (let c of text) out += String.fromCharCode(encryptChar(c.charCodeAt(0), b));

    document.getElementById("text-output").value = out;
}

function decryptText() {
    const b = parseInt(document.getElementById("pin-text").value);
    const text = document.getElementById("text-de").value;

    let out = "";
    for (let c of text) out += String.fromCharCode(decryptChar(c.charCodeAt(0), b));

    document.getElementById("text-output").value = out;
}


// ================== ENCRYPT / DECRYPT FILE ==================
function encryptFile() {
    const file = document.getElementById("file-en").files[0];
    if (!file) return alert("Pilih file dulu");

    const b = parseInt(document.getElementById("pin-file").value);
    const reader = new FileReader();

    reader.onload = () => {
        const data = new Uint8Array(reader.result);
        const out = data.map(x => encryptChar(x, b));

        const blob = new Blob([out]);
        const url = URL.createObjectURL(blob);

        const a = document.getElementById("download-link");
        a.href = url;
        a.download = "encrypted.bin";
        a.style.display = "inline";
    };

    reader.readAsArrayBuffer(file);
}

function decryptFile() {
    const file = document.getElementById("file-de").files[0];
    if (!file) return alert("Pilih file dulu");

    const b = parseInt(document.getElementById("pin-file").value);
    const reader = new FileReader();

    reader.onload = () => {
        const data = new Uint8Array(reader.result);
        const out = data.map(y => decryptChar(y, b));

        const blob = new Blob([out]);
        const url = URL.createObjectURL(blob);

        const a = document.getElementById("download-link");
        a.href = url;
        a.download = "decrypted.bin";
        a.style.display = "inline";
    };

    reader.readAsArrayBuffer(file);
}


// ================= BOT TELEGRAM (TOKEN HARUS DIISI MANUAL) =================
const BOT_TOKEN = "ISI_TOKEN_BOTMU_DISINI";

function saveChatID(){
    const id = document.getElementById("chat-id").value;
    localStorage.setItem("chatid", id);
}

function resetChatID(){
    localStorage.removeItem("chatid");
    document.getElementById("chat-id").value = "";
}

window.onload = () => {
    const id = localStorage.getItem("chatid");
    if(id) document.getElementById("chat-id").value = id;
};

function sendBotText(){
    const id = document.getElementById("chat-id").value;
    const b = parseInt(document.getElementById("pin-bot").value);
    let msg = document.getElementById("bot-text").value;

    // encrypt
    let out = "";
    for (let c of msg) out += String.fromCharCode(encryptChar(c.charCodeAt(0), b));

    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({chat_id:id,text:out})
    });

    alert("Pesan terenkripsi dikirim!");
}

function sendBotFile(){
    alert("Untuk file Telegram perlu API upload, bisa ditambahkan nanti.");
}