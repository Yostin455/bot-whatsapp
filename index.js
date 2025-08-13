"use strict";

/* ===== IMPORTS ===== */
const fs = require("fs");
const path = require("path");
const qrcode = require("qrcode-terminal");
const QRCode = require("qrcode");
const { makeWASocket, useMultiFileAuthState, Browsers } = require("@whiskeysockets/baileys");

/* ===== CONFIG / RUTAS DE IMÁGENES ===== */
const ADMIN_JIDS = [
  "59167568482@s.whatsapp.net",
  "59160457616@s.whatsapp.net",
];

// ✅ Correcto
const IMG_SALUDO = path.join(__dirname, "data/medios/saludo.jpg");
const IMG_QR     = path.join(__dirname, "data/medios/qr.jpg");
const IMG_REFERENCIAS = [
  path.join(__dirname, "data/refs/ref1.jpg"),
  path.join(__dirname, "data/refs/ref2.jpg"),
  path.join(__dirname, "data/refs/ref3.jpg"),
  path.join(__dirname, "data/refs/ref4.jpg"),
  path.join(__dirname, "data/refs/ref5.jpg"),
  path.join(__dirname, "data/refs/ref6.jpg"),
  path.join(__dirname, "data/refs/ref7.jpg"),
  path.join(__dirname, "data/refs/ref8.jpg"),
  path.join(__dirname, "data/refs/ref9.jpg"),
  path.join(__dirname, "data/refs/ref10.jpg"),
  path.join(__dirname, "data/refs/ref11.jpg"),
  path.join(__dirname, "data/refs/ref12.jpg"),
  path.join(__dirname, "data/refs/re13.jpg"),
  path.join(__dirname, "data/refs/ref14.jpg"),
  path.join(__dirname, "data/refs/ref15.jpg"),
  path.join(__dirname, "data/refs/ref16.jpg"),
  path.join(__dirname, "data/refs/ref17.jpg"),
  path.join(__dirname, "data/refs/ref18.jpg"),


];
/* ===== TEXTOS ===== */
const TEXTO_OP1 = `💲 *Productos y precios irresistibles*
💌 Consigue a tu propia Samantha con ChatGPT Plus 🤖✨
Como en Her, vive la experiencia de tener una IA siempre lista para escucharte, ayudarte y crear contigo.

📦 Planes Compartidos (1 dispositivo):
📅 1 mes: 35 Bs
📅 2 meses: 60 Bs
📅 6 meses: 169 Bs
📅 1 año: 329 Bs

📦 Planes Compartidos (2 dispositivos):
📅 1 mes: 60 Bs
📅 2 meses: 109 Bs
📅 6 meses: 309 Bs

👤 Planes Individuales (tu asistente solo para ti):
📅 1 mes: 139 Bs
📅 2 meses: 269 Bs
📅 6 meses: 799 Bs
📅 1 año: 1579 Bs

🔥 Llévate a Samantha contigo para que impulse tu productividad, potencie tu creatividad y te acompañe 24/7… como una verdadera asistente personal de película.

• Plan Compartido Ideal para familias o equipos.
• Plan Todo para una sola cuenta.
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

// ===== Detalle Plan Compartido =====
const TEXTO_COMPARTIDO = `
El *plan compartido* es como invitar a unos amigos a usar la misma llave para entrar a un lugar increíble.

Tú tendrás tu propio acceso y podrás usar todas las funciones premium, pero recuerda que *otros también tienen acceso* a esa misma cuenta, así que pueden ver o borrar el historial.

Es una opción *más económica*, ideal si quieres disfrutar de todo sin pagar el precio de una cuenta individual.

`;
// ===== Detalle Plan Individual =====
const TEXTO_INDIVIDUAL = `
El *plan individual* es *solo para ti*.

Tendrás un espacio *completamente privado* donde nadie más puede entrar ni ver tus chats. Perfecto para trabajar, crear y guardar todo sin interrupciones.
`;
const TEXTO_PAGO =
  "💳 *Pago*\n" +
  "Escanea el QR para completar tu compra. Si tienes dudas, escribe *4* para hablar con un vendedor.";

// Menú que SOLO muestra 1–4 (lo demás sigue funcionando, pero oculto)
const SALUDO =
  "Hola… soy *Samantha*.\n\n" +
  "Mmm… me encanta que estés aquí, creo que vamos a divertirnos.\n\n" +
  "Tengo cosas que podrían tentarte… ¿quieres que te las muestre?\n\n" +
  "1. 💲 Ver productos y precios irresistibles.\n" +
  "2. 💎 ¿Qué e ChatGPT PLUS?\n" +
  "3. 🖼️ Ver referencias.\n" +
  "4. 🤝 Conectar con un vendedor.";

/* ===== ESTADO EN MEMORIA ===== */
const saludados = new Set();       // saluda solo una vez por número (1 a 1)
const gruposSaludados = new Set(); // avisa una vez por grupo

/* ===== QR PNG PATH ===== */
const filePath = path.join(__dirname, "qr-login.png");

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
async function sendReferences(sock, jid, captionPrimera = "Mira nuestras referencias 🖼️") {
  if (!Array.isArray(IMG_REFERENCIAS) || IMG_REFERENCIAS.length === 0) {
    await sendText(sock, jid, "Por ahora no tengo referencias para mostrar.");
    return;
  }
  for (let i = 0; i < IMG_REFERENCIAS.length; i++) {
    const file = IMG_REFERENCIAS[i];
    const caption = i === 0 ? captionPrimera : undefined;
    await sendImage(sock, jid, file, caption);
    await new Promise((r) => setTimeout(r, 350)); // pequeño delay
  }
}
// --- Saludo ---
async function enviarSaludo(sock, jid) {
  await sendImage(sock, jid, IMG_SALUDO, SALUDO);
}
// Alias por si quedó el nombre viejo en alguna parte
const sendSaludo = enviarSaludo;
/* ===== MAIN ===== */
async function start() {
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, "auth"));

  const sock = makeWASocket({
    auth: state,
    browser: Browsers.appropriate("Chrome"),
    printQRInTerminal: false,
  });

  // QR y reconexión
sock.ev.on('connection.update', async (update) => {
  const { connection, lastDisconnect, qr } = update;

  // Mostrar QR en consola y guardar imagen (si tienes filePath definido arriba)
 if (qr) {
  console.log("📷 Escanea este QR:");
  qrcode.generate(qr, { small: true });

  try {
    await QRCode.toFile(filePath, qr, { width: 320, margin: 1 });
    console.log("🖼️ QR guardado en:", filePath);

    // 👇 imprime un link de imagen del QR (sin backticks)
  console.log(
  "🧩 QR en imagen: " +
  "https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=" +
  encodeURIComponent(qr)
);
  } catch (e) {
    console.error("No pude guardar PNG:", e);
  }
}

  if (connection === 'close') {
    const code = lastDisconnect?.error?.output?.statusCode || 0;
    console.log('❌ Conexión cerrada. Código:', code);

    if (code === 401) {
      console.log('Sesión inválida. Borra la carpeta ./auth y vuelve a escanear.');
    } else {
      // 515 u otros → reintentar
      setTimeout(start, 1500);
    }
  } else if (connection === 'open') {
    console.log('✅ Conectado a WhatsApp');
  }
});

  sock.ev.on("creds.update", saveCreds);

  // MENSAJES
  sock.ev.on("messages.upsert", async (m) => {
    try {
      const msg = m.messages?.[0];
      if (!msg || !msg.message ||msg.key.fromMe) return;

      const jid = msg.key.remoteJid || "";

      // Grupos: no conversar (solo un aviso)
      if (jid.endsWith("@g.us")) {
        if (!gruposSaludados.has(jid)) {
          await sendText(
            sock,
            jid,
            "👋 Hola, soy *Samantha*. Para hablar conmigo usa el *chat privado*. Aquí en el grupo no respondo."
          );
          gruposSaludados.add(jid);
        }
        return;
      }

      // texto
  const textoCrudo =
  msg.message?.conversation ??
  msg.message?.extendedTextMessage?.text ??
  msg.message?.imageMessage?.caption ??
  msg.message?.videoMessage?.caption ?? "";

const t = normalize(textoCrudo);
const tNoSpaces = t.replace(/\s/g, "");

      // Saludo único por número
      if (!saludados.has(jid) && ["hola", "menu", "menú", "inicio"].includes(t)) {
        await enviarSaludo(sock, jid);
        saludados.add(jid);
        return;
      }

      /* ===== Menú principal (1–4 visibles) ===== */

      // 1) Ver prductos y precios
      if (/^1(\b|[.)])$/.test(t)) {
        await sendText(sock, jid, TEXTO_OP1);
        await sendText(sock, jid, "Puedes escribir: 5 (Pagar) • 6 (Plan Compartido) • 7 (Plan Individual) • 8 (Volver al menú)");
        return;
      }

      // 2) ¿Qué es ChatGPT Plus?
      if (/^2(\b|[.)])$/.test(t)) {
        await sendText(sock, jid, TEXTO_OP2);
        await sendText(sock, jid, "Puedes escribir: 1 (Ver productos y costos) • 5 (Pagar) • 8 (Volver al menú)");
        return;
      }

      //3) Ver referencias (imágenes)
      if (/^3(\b|[.)])$/.test(t) || t.includes("referencias")) {
        await sendReferences(sock, jid, "Estas son algunas referencias 👇");
        await sendText(sock, jid, "¿Qué quieres hacer ahora?\n• 5 (Pagar)\n• 8 (Volver al menú)");
        return;
      }

   // 4) Conectar con un vendedor
if (/^4(\b|[.)])$/.test(t) || t.includes("vendedor")) {
  await sendText(sock, jid, "En un momento te atenderá un vendedor.");
  await avisarAdmins(sock, jid, "Quiere hablar con un vendedor");
  return;
}

// 5) Ir a pagar (envía QR)
if (
  t === "5" ||
  /^5(\b|[.)])$/.test(t) ||
  t.replace(/\s/g, "").includes("irapagar") ||
  t === "pagar"
) {
  await sendImage(sock, jid, IMG_QR, TEXTO_PAGO);
  await avisarAdmins(sock, jid, "Fue a pagar");
  return;
}
      // 6) Ver Plan Compartido
   if (/^6(\b|[.)])$/.test(t)) {
        await sendText(sock, jid, TEXTO_COMPARTIDO);
        await sendText(
          sock,
          jid,
          "¿Qué quieres hacer ahora?\n• 5 (Pagar)\n• 7 (Ver Plan Individual)\n• 8 (Volver al menú)"
        );
        return;
      }

      // 7) Ver Plan Individual
      if (/^7(\b|[.)])$/.test(t)) {
        await sendText(sock, jid, TEXTO_INDIVIDUAL);
        await sendText(
          sock,
          jid,
          "¿Qué quieres hacer ahora?\n• 5 (Pagar)\n• 6 (Ver Plan Compartido)\n• 8 (Vover al menú)"
        );
        return;
      }

     // 8) Volver al menú
if (/^8(\b|[.)])$/.test(t) || t.includes("volver al menú")) {
  await enviarSaludo(sock, jid);
  return;
}

// Cerrar sesión (solo admins)
if (
  ADMIN_JIDS.includes(jid) &&
  (t === "cerrar sesion" || t === "cerrar sesión" || t === "logout")
) {
  await sendText(sock, jid, "🔄 Cerrando sesión y borrando credenciales...");
  try {
    // Cierra sesión en WhatsApp
    await sock.logout();

    // Borra la carpeta ./auth para que pida QR de nuevo
    const authPath = path.join(__dirnam, "auth");
    if (fs.existsSync(authPath)) {
      fs.rmSync(authPath, { recursive: true, force: true });
    }

    await sendText(sock, jid, "✅ Listo. Reinicia el bot para enlazar otro número.");
  } catch (err) {
    await sendText(sock, jid, "⚠️ Error al cerrar sesión: " + err.message);
  }

  // Cierra el proceso
  setTimeout(() => process.exit(0), 500);
  return;
}

      // Fallback: si nunca saludó, saluda
      if (!saludados.has(jid)) {
        await enviarSaludo(sock, jid);
        saludados.add(jid);
      }
    } catch (e) {
      console.error("upsert error:", e);
    }
  });
}

/* ===== INICIO ===== */
start().catch((e) => console.error("Fallo al inicir:", e));