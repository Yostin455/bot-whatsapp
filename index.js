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

// ===== Opción 1: precios/planes (ahora muestra 5 y 6) =====
const TEXTO_OP1 = `
Mmm… mira lo que tengo para ti, creo que te va a gustar…

📦 *Planes Compartidos*
🔄 *1 dispositivo:*
• 1 mes — 35 Bs
• 2 meses — 60 Bs
• 6 meses — 169 Bs
• 1 año — 329 Bs

🔄 *2 dispositivos:*
• 1 mes — 60 Bs
• 2 meses — 109 Bs
• 6 meses — 309 Bs

👤 *Planes Individuales*
• 1 mes — 139 Bs
• 2 meses — 299 Bs
• 6 meses — 929 Bs
• 1 año — 1879 Bs
`;

// ===== Detalle Plan Compartido =====
const TEXTO_COMPARTIDO = `
El *plan compartido* es como invitar a unos amigos a usar la misma llave para entrar a un lugar increíble.

Tú tendrás tu propio acceso y podrás usar todas las funciones premium, pero recuerda que *otros también tienen acceso* a esa misma cuenta, así que pueden ver o borrar el historial.

Es una opción *más económica*, ideal si quieres disfrutar de todo sin pagar el precio de una cuenta individual.

¿Qué quieres hacer ahora?
• Escribe *6* ara ver el Plan Individual
• Escribe *ir a pagar* o *4* para continuar al pago
`;
// ===== Detalle Plan Individual =====
const TEXTO_INDIVIDUAL = `
El *plan individual* es *solo para ti*.

Tendrás un espacio *completamente privado* donde nadie más puede entrar ni ver tus chats. Perfecto para trabajar, crear y guardar todo sin interrupciones.

¿Qué quieres hacer ahora?
• Escribe *5* para ver el Plan Compartido
• Escribe *ir a pagar* o *4* para continuar al pago
`;
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

Si ya te convencí*.`;

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

const qrcode = require("qrcode-terminal");

sock.ev.on("connection.update", (update) => {
  const { qr, connection, lastDisconnect } = update;

  if (qr) {
    console.log("\n=== Escanea este QR ===");
    qrcode.generate(qr, { small: true });
  }

  if (connection === "open") {
    console.log("✅ Conectado a WhatsApp");
  }

  if (connection === "close") {
    const code =
      lastDisconnect?.error?.output?.statusCode ||
      lastDisconnect?.error?.data?.statusCode ||
      lastDisconnect?.error?.staus ||
      "";
    const reason =
      lastDisconnect?.error?.message ||
      lastDisconnect?.error?.toString() ||
      "Desconocido";

    console.log(`❌ Conexión cerrada. Código: ${code} | Motivo: ${reason}`);

    // Si la sesión quedó inválida, hay que borrar ./auth y escanear de nuevo
    const shouldLogout =
      reason.toLowerCase().includes("logged out") ||
      reason.toLowerCase().includes("bad session") ||
      code === 401;

    // Si fue reemplazada por otra instancia (Railway encenddo, por ejemplo)
    const replaced =
      reason.toLowerCase().includes("connection replaced") || code === 409;

    if (shouldLogout) {
      console.log("➡️ Sesión inválida. Borra la carpeta ./auth y escanea de nuevo.");
    } else if (replaced) {
      console.log("➡️ La conexión fue reemplazada. Asegúrate de tener SOLO una instancia.");
    } else {
      console.log("🔁 Reintentando conexión en 5s…");
      setTimeout(start, 5000); // reintenta
    }
  }
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
if (/^1(\b|[.)])$/.test(t)) {
  await sendText(sock, jid, TEXTO_OP1);
  // Sugerencia de navegación
  await sendText(sock, jid, "Puedes escribir: 5 (Plan Compartido) • 6 (Plan Individual) • 4 (Pagar) • 7 (Volver al menú)");
  return;
}
if (/^2(\b|[.)])$/.test(t)) {
  await sendText(sock, jid, TEXTO_OP2);
  // Sugerencia de navegación
  await sendText(sock, jid, "Puedes escribir: 4 (Pagar) • 7 (Volver al menú)");
  return;
}
if (/^3(\b|[.)])/.test(t)) {
      await sendText(sock, jid, "En un momento te atenderá un vendedor.");
      await avisarAdmins(sock, jid, "Quiere hablar con un vendedor");
      return;
    }

    // Subopciones (números)
    if (/^5(\b|[.)])/.test(t)) {
      await sendText(sock, jid, TEXTO_COMPARTIDO);
      await sendText(
        sock,
        jid,
        "¿Qué quieres hacer ahora?\n" +
        "• Escribe *6* para ver el Plan Individual.\n" +
        "• Escribe *ir a pagar* o *4* para continuar alpago.\n" +
        "• Escribe *7* para volver al menú."
      );
      return;
    }

    if (/^6(\b|[.)])/.test(t)) {
      await sendText(sock, jid, TEXTO_INDIVIDUAL);
      await sendText(
        sock,
        jid,
        "¿Qué quieres hacer ahora?\n" +
        "• Escribe *5* para ver el Plan Compartido.\n" +
        "• Escribe *ir a pagar* o *4* para continuar al pago.\n" +
        "• Escribe *7* para volver al menú."
      );
      return;
    }

    // === Ir a pagar (4) ===
    if (
      t ==="4" ||                          // "4"
      /^4(\b|[.)])$/.test(t) ||             // "4." o "4)"
      t.replace(/\s/g, "") === "4" ||       // "  4  "
      t.includes("ir a pagar") ||           // "ir a pagar"
      t === "pagar"                         // "pagar"
    ) {
      await sendImage(sock, jid, IMG_QR, TEXTO_PAGO);
      await avisarAdmins(sock, jid, "Fue a pagar");
      return;
    }

    // === Volver al menú (7) ===
    // Acepta: "7", "7.", "7)", "*7*", con o sin espacios
    if (/^[\s\]*7[\s\*]*[.)]?\s*$/.test(texto || "")) {
      await enviarSaludo(sock, jid); // Menú con imagen
      // Si prefieres solo texto: // await sendText(sock, jid, SALUDO);
      return;
    }

    // Fallback (si no coincide nada)
    await enviarSaludo(sock, jid);
    } catch (e) {
      console.error("upsert error:", e);
    }
  }); // <- cierra el listener

} // <- cierra async function start()

start(); // <- llamada final