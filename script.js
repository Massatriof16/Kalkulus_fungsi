/********************************************************************
 * KONSTANTA
 ********************************************************************/
const a = 11;
const n = 256;
const BOT_TOKEN = "7974427435:AAHsFppNpcM6Qb4J8iSbRFcI8Cph8tJA8tc"; // kamu isi sendiri


/********************************************************************
 * CUSTOM ENCODER
 ********************************************************************/
const source = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
const custom = "ZXCVBNMASDFGHJKLQWERTYUIOPzxcvbnmasdfghjklqwertyuiop9876543210¥§€";

function customEncode(data) {
    let result = "";
    for (let c of data) {
        let index = source.indexOf(c);
        result += (index === -1) ? c : custom[index];
    }
    return result;
}

function customDecode(data) {
    let result = "";
    for (let c of data) {
        let index = custom.indexOf(c);
        result += (index === -1) ? c : source[index];
    }
    return result;
}

/********************************************************************
 * GCD
 ********************************************************************/
function gcd(a, b) {
    while (b !== 0) {
        let t = b;
        b = a % b;
        a = t;
    }
    return a;
}

/********************************************************************
 * MODULAR INVERSE
 ********************************************************************/
function modInverse(a, m) {
    let m0 = m;
    let y = 0, x = 1;
    if (m === 1) return 0;
    while (a > 1) {
        let q = Math.floor(a / m);
        let t = m;
        m = a % m;
        a = t;
        t = y;
        y = x - q * y;
        x = t;
    }
    if (x < 0) x += m0;
    return x;
}

/********************************************************************
 * ENKRIPSI & DEKRIPSI TEKS
 ********************************************************************/
function encryptText(text, b) {
    let bytes = new TextEncoder().encode(text);
    let encrypted = [];
    for (let byte of bytes) {
        encrypted.push((a * byte + b) % n);
    }
    return btoa(String.fromCharCode(...encrypted));
}

function decryptText(base64, b) {
    try {
        let encBytes = atob(base64).split("").map(c => c.charCodeAt(0));
        let invA = modInverse(a, n);
        let dec = [];
        for (let byte of encBytes) {
            dec.push((invA * (byte - b + n)) % n);
        }
        return new TextDecoder().decode(new Uint8Array(dec));
    } catch {
        return "Error: Encrypted text invalid";
    }
}

/********************************************************************
 * ENKRIPSI & DEKRIPSI BYTES (FILE)
 ********************************************************************/
function encryptBytes(bytes, b) {
    let enc = [];
    for (let byte of bytes) {
        enc.push((a * byte + b) % n);
    }
    return btoa(String.fromCharCode(...enc));
}

function decryptBytes(base64, b) {
    try {
        let encBytes = atob(base64).split("").map(c => c.charCodeAt(0));
        let invA = modInverse(a, n);
        let dec = [];
        for (let byte of encBytes) {
            dec.push((invA * (byte - b + n)) % n);
        }
        return new Uint8Array(dec);
    } catch {
        return null;
    }
}

/********************************************************************
 * NOTIFIKASI
 ********************************************************************/
function showNotification(msg) {
    const n = document.getElementById("notification");
    n.textContent = msg;
    n.style.display = "block";
    setTimeout(() => n.style.display = "none", 3000);
}

/********************************************************************
 * LOAD LOCAL STORAGE
 ********************************************************************/
function loadFromStorage() {
    const pin = localStorage.getItem("pin");
    const chatId = localStorage.getItem("chatId");

    if (pin) {
        document.getElementById("pin-input").value = pin;
        document.getElementById("file-pin-input").value = pin;
        document.getElementById("telegram-pin-input").value = pin;
    }

    if (chatId) {
        document.getElementById("chat-id-input").value = chatId;
    }
}

/********************************************************************
 * TAB NAVIGATION
 ********************************************************************/
document.querySelectorAll(".tab-button").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));

        btn.classList.add("active");
        const tabId = btn.dataset.tab + "-tab";
        document.getElementById(tabId).classList.add("active");
    });
});

/********************************************************************
 * PIN MANAGEMENT
 ********************************************************************/
document.getElementById("save-pin").addEventListener("click", () => {
    const pin = document.getElementById("pin-input").value;
    if (!pin) return showNotification("PIN tidak boleh kosong");

    localStorage.setItem("pin", pin);
    loadFromStorage();
    showNotification("PIN tersimpan");
});

document.getElementById("reset-pin").addEventListener("click", () => {
    localStorage.removeItem("pin");
    loadFromStorage();
    showNotification("PIN direset");
});

/********************************************************************
 * TEXT ENCRYPT / DECRYPT
 ********************************************************************/
document.getElementById("encrypt-text").addEventListener("click", () => {
    const pin = parseInt(localStorage.getItem("pin"));
    const text = document.getElementById("encrypt-text-input").value;
    if (!pin) return showNotification("PIN belum disimpan");

    const base64 = encryptText(text, pin);
    const finalText = customEncode(base64);

    document.getElementById("output-text").value = finalText;
    showNotification("Teks terenkripsi");
});

document.getElementById("decrypt-text").addEventListener("click", () => {
    const pin = parseInt(localStorage.getItem("pin"));
    const text = document.getElementById("decrypt-text-input").value;
    if (!pin) return showNotification("PIN belum disimpan");

    const decoded = customDecode(text);
    const result = decryptText(decoded, pin);

    document.getElementById("output-text").value = result;
    showNotification("Teks terdekripsi");
});

/********************************************************************
 * COPY & CLEAR
 ********************************************************************/
document.getElementById("copy-output").addEventListener("click", () => {
    const out = document.getElementById("output-text");
    out.select();
    document.execCommand("copy");
    showNotification("Output dicopy");
});

document.getElementById("clear-output").addEventListener("click", () => {
    document.getElementById("output-text").value = "";
    showNotification("Output dibersihkan");
});

/********************************************************************
 * ENKRIPSI FILE
 ********************************************************************/
document.getElementById("encrypt-file").addEventListener("click", () => {
    const input = document.getElementById("encrypt-file-input");
    const pin = parseInt(localStorage.getItem("pin"));
    if (!input.files[0] || !pin) return showNotification("File atau PIN belum ada");

    const file = input.files[0];
    const reader = new FileReader();

    // Progress UI
    const bar = document.getElementById("encrypt-progress");
    const fill = document.getElementById("encrypt-progress-fill");
    const status = document.getElementById("encrypt-status");

    bar.style.display = "block";
    fill.style.width = "0%";
    status.textContent = "📄 Membaca file...";

    reader.onload = e => {
        fill.style.width = "40%";
        status.textContent = "🔐 Mengenkripsi...";

        const bytes = new Uint8Array(e.target.result);

        // base64 dari hasil affine
        const base64 = encryptBytes(bytes, pin);

        // header metadata
        const header = JSON.stringify({ name: file.name, type: file.type || 'application/octet-stream' });

        // gabungkan header dan payload (pemisah '::')
        const combined = header + "::" + base64;

        // custom encode (mapping yang sudah kamu punya)
        const finalData = customEncode(combined);

        fill.style.width = "80%";
        status.textContent = "📦 Menyiapkan file...";

        // simpan sebagai text agar browser dan Telegram bisa terima
        const blob = new Blob([finalData], { type: "text/plain" });

        fill.style.width = "100%";
        status.textContent = "✔ Selesai";

        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = file.name + ".enc"; // simpan ekstensi .enc
        link.textContent = "Download file terenkripsi";

        document.getElementById("encrypt-file-output").innerHTML = "";
        document.getElementById("encrypt-file-output").appendChild(link);
    };

    reader.readAsArrayBuffer(file);
});

/********************************************************************
 * DEKRIPSI FILE
 ********************************************************************/
document.getElementById("decrypt-file").addEventListener("click", () => {
    const input = document.getElementById("decrypt-file-input");
    const pin = parseInt(localStorage.getItem("pin"));
    if (!input.files[0] || !pin) return showNotification("File atau PIN belum ada");

    const file = input.files[0];
    const reader = new FileReader();

    // Progress UI
    const bar = document.getElementById("decrypt-progress");
    const fill = document.getElementById("decrypt-progress-fill");
    const status = document.getElementById("decrypt-status");

    bar.style.display = "block";
    fill.style.width = "0%";
    status.textContent = "📄 Membaca file...";

    reader.onload = e => {
        fill.style.width = "40%";
        status.textContent = "🔓 Mendekripsi...";

        const customText = e.target.result; // string hasil encrypt/custom
        // reverse the custom encoding to get header::base64
        const decodedCombined = customDecode(customText);

        // pisahkan header dan payload
        const sepIndex = decodedCombined.indexOf("::");
        if (sepIndex === -1) {
            status.textContent = "❌ Gagal — Format file tidak dikenali";
            return showNotification("File tidak valid atau format header hilang");
        }

        const headerStr = decodedCombined.slice(0, sepIndex);
        const base64part = decodedCombined.slice(sepIndex + 2);

        // parse header json
        let meta;
        try {
            meta = JSON.parse(headerStr);
        } catch (err) {
            status.textContent = "❌ Gagal — Header tidak valid";
            return showNotification("Header file tidak valid");
        }

        // decrypt base64 -> bytes
        const decryptedBytes = decryptBytes(base64part, pin);
        if (!decryptedBytes) {
            status.textContent = "❌ Gagal — File atau PIN salah";
            return showNotification("File tidak valid atau PIN salah");
        }

        fill.style.width = "80%";
        status.textContent = "📦 Menyiapkan file...";

        // buat blob dengan MIME yang asli
        const blob = new Blob([decryptedBytes], { type: meta.type || "application/octet-stream" });

        fill.style.width = "100%";
        status.textContent = "✔ Selesai";

        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        // gunakan nama asli kalau ada, atau fallback
        const outName = (meta.name && meta.name.replace(/\.enc$/i, "")) || file.name.replace(/\.enc$/i, "");
        link.download = outName;
        link.textContent = "Download file terdekripsi";

        document.getElementById("decrypt-file-output").innerHTML = "";
        document.getElementById("decrypt-file-output").appendChild(link);
    };

    reader.readAsText(file); // kita baca sebagai text (karena isinya custom-encoded text)
});

/********************************************************************
 * TELEGRAM (KIRIM TEKS & FILE) — Dengan Status Progress Lengkap
 ********************************************************************/
function setTelegramStatus(msg) {
    document.getElementById("telegram-status").textContent = msg;
}

// Simpan Chat ID
document.getElementById("save-chat-id").addEventListener("click", () => {
    const cid = document.getElementById("chat-id-input").value;
    localStorage.setItem("chatId", cid);
    setTelegramStatus("Chat ID tersimpan ✔");
    showNotification("Chat ID tersimpan");
});

// Reset Chat ID
document.getElementById("reset-chat-id").addEventListener("click", () => {
    localStorage.removeItem("chatId");
    document.getElementById("chat-id-input").value = "";
    setTelegramStatus("Chat ID dihapus ✔");
    showNotification("Chat ID direset");
});

// SEND TEXT
document.getElementById("send-text").addEventListener("click", async () => {
    const pin = parseInt(localStorage.getItem("pin"));
    const cid = localStorage.getItem("chatId");
    const text = document.getElementById("telegram-text-input").value;

    if (!pin || !cid) {
        return setTelegramStatus("❌ PIN atau Chat ID belum diatur");
    }

    setTelegramStatus("🔐 Mengenkripsi teks...");
    const base64 = encryptText(text, pin);
    const enc = customEncode(base64);

    setTelegramStatus("📤 Mengirim ke Telegram...");
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: cid, text: enc })
    });

    if (res.ok) {
        setTelegramStatus("✔ Pesan terenkripsi berhasil terkirim!");
        showNotification("Teks terkirim");
    } else {
        setTelegramStatus("❌ Gagal mengirim pesan!");
    }
});

// SEND FILE
document.getElementById("send-file").addEventListener("click", async () => {
    const fileInput = document.getElementById("telegram-file-input");
    const pin = parseInt(localStorage.getItem("pin"));
    const cid = localStorage.getItem("chatId");

    if (!fileInput.files[0] || !pin || !cid) {
        return setTelegramStatus("❌ File / PIN / Chat ID belum lengkap");
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    setTelegramStatus("📄 Membaca file...");

    reader.onload = async e => {
    const bytes = new Uint8Array(e.target.result);

    setTelegramStatus("🔐 Mengenkripsi file...");
    const base64 = encryptBytes(bytes, pin);

    const header = JSON.stringify({ name: file.name, type: file.type || 'application/octet-stream' });
    const combined = header + "::" + base64;
    const finalData = customEncode(combined);

    // kirim sebagai text/plain (Base64+header sudah di-custom)
    const blob = new Blob([finalData], { type: "text/plain" });

    setTelegramStatus("📤 Mengirim file terenkripsi ke Telegram...");

    const form = new FormData();
    form.append("chat_id", cid);
    form.append("document", blob, file.name + ".enc");

    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
        method: "POST",
        body: form
    });

    if (res.ok) {
        setTelegramStatus("✔ File terenkripsi berhasil terkirim!");
        showNotification("File terkirim");
    } else {
        setTelegramStatus("❌ Gagal mengirim file!");
    }
};

    reader.readAsArrayBuffer(file);
});

/********************************************************************
 * INITIAL LOAD
 ********************************************************************/
loadFromStorage();