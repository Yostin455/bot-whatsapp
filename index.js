"use strict";

/* ===== IMPORTS ===== */
const fs = require("fs");
const path = require("path");
const qrcode = require("qrcode-terminal");
const QRCode = require("qrcode");
const {
  makeWASocket,
  useMultiFileAuthState,
  Browsers,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

/* ===== CONFIG ===== */
// Admins que reciben avisos
const ADMIN_JIDS = [
  "59167568482@s.whatsapp.net",
  "591@s.whatsapp.net",
];

// Rutas de imágenes
const IMG_SALUDO = path.join(__dirname, "data/medios/saludo.png");
const IMG_QR     = path.join(__dirname, "data/medios/qr.jpeg");
const IMG_REFERENCIAS = [
  path.join(__dirname, "data/refs/ref1.jpeg"),
  path.join(__dirname, "data/refs/ref2.jpeg"),
  path.join(__dirname, "data/refs/ref3.jpeg"),
  path.join(__dirname, "data/refs/ref4.jpeg"),
  path.join(__dirname, "data/refs/ref5.jpeg")
];

/* ===== 🎯 PERSISTENCIA: users.json ===== */
const USERS_FILE = path.join(__dirname, "users.json");
function loadUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) return {};
    const raw = fs.readFileSync(USERS_FILE, "utf8");
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}
function saveUsers(data) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("No pude guardar users.json:", e.message);
  }
}
let users = loadUsers();

/* ===== TEXTOS ===== */
const TEXTO_OP2 = `💎 *¿Qué es ChatGPT Plus?*

ChatGPT Plus es la versión premium del asistente más avanzado de IA.
Beneficios principales:
• Respuestas más rápidas ⚡
• Prioridad en horas pico ⏰
• Acceso a modelos más potentes 🤖
• Ideal para estudio, trabajo y equipos 💼`;

const TEXTO_COMPARTIDO = `📦 *Plan Compartido*

El *plan compartido* es más económico.
Compartes acceso con *otros clientes* (ellos pueden ver/borrar historial).

Ideal si quieres disfrutar de todo sin pagar una cuenta individual.`;

const TEXTO_PAGO =
  "💳 *Pago*\n" +
  "Escanea el QR para completar tu compra. Si tienes dudas, escribe *4* para hablar con un vendedor.";

/* ===== NUEVOS PRECIOS ===== */
const TEXTO_PRECIOS = `✨ *Planes ChatGPT Plus 🤖*

📦 *Planes Compartidos*

*1 Mes:*
📅 1 dispositivo → 35 Bs (📱)
📅 2 dispositivos → 🚀 55 Bs (📱💻)
🔥 Por solo 20 Bs más duplicas la cantidad de dispositivos.

*2 Meses:*
📅 1 dispositivo → 59 Bs (📱)
📅 2 dispositivos → 109 Bs (📱💻)

*3 Meses:*
📅 1 dispositivo → 83 Bs (📱)
📅 2 dispositivos → 163 Bs (📱💻)

*6 Meses:*
📅 1 dispositivo → 169 Bs (📱)
📅 2 dispositivos → 309 Bs (📱💻)

✨ Comparte ChatGPT Plus, ahorra más y multiplica tu productividad. 🚀`;

/* ===== MENÚ (vertical / escalonado) ===== */
const SALUDO_MENU = [
  "Hola… soy *IAmax* 🤖.",
  "",
  "Me alegra que estés aquí, creo que vamos a lograr cosas increíbles.",
  "",
  "Tengo algunas opciones que podrían interesarte:",
  "",
  "1. 💲 Ver productos y precios irresistibles.",
  "2. 💎 ¿Qué es ChatGPT PLUS?",
  "3. 🖼️ Ver referencias.",
  "4. 🤝 Conectar con un vendedor.",
  "5. 🧾 Ir a pagar / aplicar ahora.",
  "6. 📦 ¿Qué es un plan compartido?",
  "8. 🔁 Volver al menú"
].join("\n");

const OPCIONES_STD = [
  "Opciones:",
  "4. 🤝 Hablar con un asesor",
  "5. 🧾 Ir a pagar / aplicar ahora",
  "8. 🔁 Volver al menú"
].join("\n");

/* ===== ESTADO EN MEMORIA ===== */
const saludados = new Set();
const gruposSaludados = new Set();

/* ===== HELPERS ===== */
const FILE_QR = path.join(__dirname, "qr-login.png");
const normalize = (s = "") =>
  String(s).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

async function sendText(sock, jid, text) {
  try { await sock.sendMessage(jid, { text }); } catch (e) { console.error("sendText:", e.message); }
}
async function sendImage(sock, jid, imgPath, caption = "") {
  try {
    const full = path.resolve(imgPath);
    if (!fs.existsSync(full)) { await sendText(sock, jid, caption || "Imagen no disponible."); return; }
    const buffer = fs.readFileSync(full);
    await sock.sendMessage(jid, { image: buffer, caption });
  } catch (e) {
    console.error("sendImage:", e.message);
  }
}
async function avisarAdmins(sock, fromJid, motivo) {
  const aviso = "📢 Cliente en espera\n• Motivo: " + motivo + "\n• JID: " + fromJid;
  for (const admin of ADMIN_JIDS) {
    try { await sock.sendMessage(admin, { text: aviso }); } catch {}
  }
}
async function sendReferences(sock, jid, captionPrimera = "Mira nuestras referencias 🖼️") {
  if (!IMG_REFERENCIAS.length) { await sendText(sock, jid, "Por ahora no tengo referencias para mostrar."); return; }
  for (let i = 0; i < IMG_REFERENCIAS.length; i++) {
    await sendImage(sock, jid, IMG_REFERENCIAS[i], i === 0 ? captionPrimera : "");
    await new Promise((r) => setTimeout(r, 300));
  }
}
async function enviarSaludo(sock, jid) { await sendImage(sock, jid, IMG_SALUDO, SALUDO_MENU); }

/* ===== MAIN ===== */
async function start() {
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, "auth"));

  // Asegurar compatibilidad con la versión actual de WhatsApp Web
  let version = /** @type {[number, number, number]} */ ([2, 2410, 1]); // fallback seguro
  try {
    const v = await fetchLatestBaileysVersion();
    if (v?.version && Array.isArray(v.version)) version = v.version;
    console.log("WA Web version:", version, "(latest:", v?.isLatest, ")");
  } catch (e) {
    console.log("No se pudo obtener versión WA Web, uso fallback:", version);
  }

  const sock = makeWASocket({
    auth: state,
    version, // evita 405
    browser: Browsers.appropriate("Chrome"),
  });

  sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      // Muestra QR en terminal y guarda PNG
      try {
        qrcode.generate(qr, { small: true });
        await QRCode.toFile(FILE_QR, qr, { width: 320, margin: 1 });
        console.log("QR guardado en:", FILE_QR);
      } catch {}
    }

    if (connection === "open") {
      console.log("✅ Conectado a WhatsApp");
    } else if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode || 0;
      console.log("❌ Conexión cerrada:", code);
      setTimeout(start, 2000);
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async (m) => {
    try {
      const msg = m.messages?.[0];
      if (!msg || !msg.message || msg.key.fromMe) return;

      const jid = msg.key.remoteJid || "";

      // Grupos: solo invita a DM la primera vez
      if (jid.endsWith("@g.us")) {
        if (!gruposSaludados.has(jid)) {
          await sendText(sock, jid, "👋 Soy *IAmax*. Escríbeme en *privado* para ayudarte.");
          gruposSaludados.add(jid);
        }
        return;
      }

      // Texto entrante
      const textoCrudo =
        msg.message?.conversation ??
        msg.message?.extendedTextMessage?.text ??
        msg.message?.imageMessage?.caption ??
        msg.message?.videoMessage?.caption ??
        "";
      const t = normalize(textoCrudo);

      // Saludo inicial
      if (!saludados.has(jid) && ["hola", "menu", "menú", "inicio"].includes(t)) {
        await enviarSaludo(sock, jid);
        saludados.add(jid);
        return;
      }

      // --- Menú 1..8 ---
      if (/^1$/.test(t)) { await sendText(sock, jid, TEXTO_PRECIOS); await sendText(sock, jid, OPCIONES_STD); return; }
      if (/^2$/.test(t)) { await sendText(sock, jid, TEXTO_OP2); await sendText(sock, jid, OPCIONES_STD); return; }
      if (/^3$/.test(t)) { await sendReferences(sock, jid, "Estas son algunas referencias 👇"); await sendText(sock, jid, OPCIONES_STD); return; }
      if (/^4$/.test(t)) { await sendText(sock, jid, "En un momento te atenderá un vendedor."); await avisarAdmins(sock, jid, "Quiere hablar con un vendedor"); await sendText(sock, jid, OPCIONES_STD); return; }
      if (/^5$/.test(t)) { await sendImage(sock, jid, IMG_QR, TEXTO_PAGO); await avisarAdmins(sock, jid, "Fue a pagar"); await sendText(sock, jid, OPCIONES_STD); return; }
      if (/^6$/.test(t)) { await sendText(sock, jid, TEXTO_COMPARTIDO); await sendText(sock, jid, OPCIONES_STD); return; }
      if (/^8$/.test(t) || t.includes("volver al menú")) { await enviarSaludo(sock, jid); return; }

      // Fallback: si nunca saludó, envía el menú
      if (!saludados.has(jid)) { await enviarSaludo(sock, jid); saludados.add(jid); }
    } catch (e) {
      console.error("upsert error:", e);
    }
  });
}

/* ===== INICIO ===== */
start().catch((e) => console.error("Fallo al iniciar:", e));
