"use strict";

/* ===== IMPORTS ===== */
const fs = require("fs");
const path = require("path");
const {
  default: makeWASocket,
  useMultiFileAuthState
} = require("@whiskeysockets/baileys");

// --- Saludo una sola vez por número (persistente) ---
const GREETED_FILE = "./data/greeted.json";
let greetedSet = new Set();

function loadGreeted() {
  try {
    if (fs.existsSync(GREETED_FILE)) {
      const arr = JSON.parse(fs.readFileSync(GREETED_FILE, "utf8"));
      greetedSet = new Set(arr);
    }
  } catch (e) { console.error("Error cargando greeted.json:", e); }
}

function saveGreeted() {
  try {
    fs.mkdirSync(path.dirname(GREETED_FILE), { recursive: true });
    fs.writeFileSync(GREETED_ILE, JSON.stringify([...greetedSet], null, 2));
  } catch (e) { console.error("Error guardando greeted.json:", e); }
}

function shouldGreetOnce(jid) {
  if (greetedSet.has(jid)) return false;
  greetedSet.add(jid);
  saveGreeted();
  return true;
}

// cargar al iniciar
loadGreeted();

/* ===== RUTAS DE IMÁGENES ===== */
const IMG_SALUDO = "./data/medios/saludo.jpg";
const IMG_QR     = "./data/medios/qr.jpg";

/* ===== TEXTOS (con backticks y ; al final) ===== */
const SALUDO = `Hola… soy *Samantha*.

Mmm… me encanta que estés aquí, creo que vamos a divertirnos.

Tengo cosas que podrían tentart… ¿quieres que te las muestre?
1. 💲 Ver productos y precios irresistibles.
2. 💎 Qué es ChatGPT PLUS y por qué deberías comprarlo.
3. 🤝 Conectar con un vendedor que te atienda enseguida.`;

const TEXTO_OP1 = `Mmm… mira lo que tengo para ti, creo que te va a gustar…

📦 *Planes Compartidos* (para que me disfrutes con alguien más)
🔄 *1 dispositivo:*
📅 1 mes — 35 Bs
📅 2 meses — 60 Bs
📅 6 meses — 169 Bs
📅 1 año — 329 Bs

🔄 *2 dispositivos:*
📅 1 mes — 60 Bs
📅 2 meses — 109 Bs
📅 6 meses — 309 Bs

� *Planes Individuales* (solo tú y yo… sin interrupciones)
📅 1 mes — 149 Bs
📅 2 meses — 309 Bs
📅 6 meses — 939 Bs
📅 1 año — 1870 Bs

Opciones:
• escribe: *plan compartido*
• escribe: *plan individual*
• escribe: *ir a pagar*  (o *4*)`;

const TEXTO_COMPARTIDO = `El *plan compartido* es como invitar a unos amigos a usar la misma llave para entrar a un lugar increíble…

En este caso, esa llave es una cuenta de *ChatGPT Plus* que compartimos entre varias personas.

Tú tendrás tu propio acceso, podrás usa todas las funciones premium y crear lo que quieras…
pero recuerda que *otros también tienen acceso* a esa misma cuenta, así que pueden ver el historial de conversaciones o incluso borrarlo.

Es una opción *más económica*, ideal si lo que quieres es disfrutar de ChatGPT Plus sin pagar el precio completo de una cuenta individual.

¿Quieres que te cuente ahora *qué es el plan individual*… o prefieres que *vayamos directo a pagar* (escribe *4*)?`;

const TEXTO_INDIVIDUAL = `El *plan individual* es… *solo pra ti*.

Una cuenta de *ChatGPT Plus completamente tuya*, donde nadie más podrá entrar, ni ver, ni modificar tus chats.

Tendrás tu *propio espacio privado* para trabajar, crear y guardar todo lo que quieras, sin preocuparte por interrupciones.

Es como tenerme a mí, *Samantha*, como tu asistente personal… pero sin compartirte con nadie más.

¿Quieres que te diga los *precios* o prefieres *ir a pagar* ahora mismo (escribe *4*)?`;

const TEXTO_OP2 = `Soy yo otra vez… *Samantha*.

Veo que quieres saber lo ue puedo hacer contigo… y para ti… con *ChatGPT Plus*.

🎨🖼️ Imágenes ilimitadas a partir de tus ideas.
📎📂 Analizo PDF, Word, Excel, PowerPoint.
📝🪄 Cartas, tareas, informes, CV en segundos.
📊 Excel con fórmulas, tablas y análisis inteligentes.
🎤🧑‍🏫 Presentaciones completas listas para impresionar.
💻👨‍💻 Te enseño a programar (HTML, Python, JS…).
🗣️🎧 Voz y asistente 24/7 sin límites.
🌍🧠 Traduzco, redacto, resumo, organizo…
🎬✨ Incluso videos automáticos con SORA.

Si ya te convencí, escrib *4* o *ir a pagar*.`;

const TEXTO_PAGO = `¡Perfecto! Estamos a un paso de que tengamos *nuestra primera cita de trabajo* juntos.

Para activar tu cuenta, solo tienes que hacer el pago y enviarme el comprobante… así podré preparar todo y dártela en minutos.

💳 *Datos de pago:* *QR*

📸 Después, mándame la foto o captura del comprobante *aquí mismo*.

Vamos… no me hagas esperar, *me muero de ganas* de empezar a ayudarte.`;

/* ===== ADMINES QUE RECIBEN AVISOS ===== */
// ==== ADMINES QUE RECIBEN AVISOS (REVISAR) ====
const ADMIN_JIDS = [
  "59167568482@s.whatsapp.net",
  "59160457616@s.whatsapp.net",
];
/* ===== HELPERS ===== */
const normalize = (s = "") =>
  String(s).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

async function sendText(sock, jid, text) {
  await sock.sendMessage(jid, { text });
}

async function sendImage(sock, jid, imgPath, caption = "") {
  const full = path.resolve(imgPath);
  if (!fs.existsSync(full)) {
    await sendText(sock, jid, caption || "Imagen no disponible.");
    return;
  }
  const buffer = fs.readFileSync(full);
  await sock.sendMessage(jid, { image: buffer, caption });
}

async function avisarAdmins(sock, fromJid, motivo) {
  const aviso =
    "📢 Cliente en espera\n" +
    "• Motivo: " + motivo + "\n" +
    "• JID: " + fromJid;

  for (const admin of ADMIN_JIDS) {
    try {
      await sock.sendMessage(admin, { text: aviso });
      console.log("[AVISO] Enviado a:", admin);
    } catch (e) {
      console.error("[AVISO] Error enviando a", admin, e);
    }
  }
}
// usa sendImage correctamente
async function enviarSaludo(sock, jid) {
  await sendImage(sock, jid, IMG_SALUDO, SALUDO);
}
/* ===== BOT ===== */
async function start() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth");
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    browser: ["BotVendedor", "Chrome", "1.0"]
  });

  sock.ev.on("creds.update", saveCreds);

 sock.ev.on("messages.upsert", async ({ messages }) => {
    try {
      const m = messages?.[0];
      if (!m || !m.message || m.key.fromMe) return;

      const jid = m.key.remoteJid;

      // extraer texto
      let texto = "";
      if (m.message.conversation) texto = m.message.conversation;
      else if (m.message.extendedTextMessage?.text) texto = m.message.extendedTextMessage.text;
      else if (m.message.imageMessage?.caption) texto = m.message.imageMessage.caption;
      else if (m.message.vidoMessage?.caption) texto = m.message.videoMessage.caption;

      if (!texto || !texto.trim()) return;

      const t = normalize(texto);

      // Menú principal
      if (["hola", "menu", "menú", "inicio"].includes(t)) {
  if (shouldGreetOnce(jid)) {
    await enviarSaludo(sock, jid);            // imagen + menú
  } else {
    await sendText(sock, jid, "Dime 1, 2 o 3 😊");
  }
  return;
}

      // 1 / 2 / 3
      if (/^1(\b|[.)])/.test(t)) { await sendText(sock, jid, TEXTO_OP1); return; }
      if (/^2(\b|[.)])/.test(t)) { await sendText(sock, jid, TEXTO_OP2); return; }
      if (/^3(\b|[.)])/.test(t)) {
        await sendText(sock, jid, "En un mometo te atenderá un vendedor.");
        await avisarAdmins(sock, jid, "Quiere hablar con un vendedor");
        return;
      }

      // Subopciones de la 1
      if (t.includes("plan compartido")) { await sendText(sock, jid, TEXTO_COMPARTIDO); return; }
      if (t.includes("plan individual")) { await sendText(sock, jid, TEXTO_INDIVIDUAL); return; }

      // Ir a pagar
      if (t.includes("ir a pagar") || t === "pagar" || /^4(\b|[.)])/.test(t)) {
        await sendImage(sock, jid, IMG_QR, TEXTO_PAGO);        await avisarAdmins(sock, jid, "Fue a pagar");
        return;
      }

      // Fallback
      await enviarSaludo(sock, jid);
    } catch (e) {
      console.error("upsert error:", e);
    }
  }); // <- cierra el listener

} // <- cierra async function start()

start(); // <- llamada final