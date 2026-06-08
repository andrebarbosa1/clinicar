import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Load firebase-applet-config.json safely for both ESM/CJS and DEV/PROD
let firebaseConfig: any = {};
try {
  const rootConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(rootConfigPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(rootConfigPath, 'utf8'));
  } else {
    // Fallback detection of ESM vs CJS dirname
    let currentDirname = '';
    if (typeof __dirname !== 'undefined') {
      currentDirname = __dirname;
    } else {
      currentDirname = path.dirname(fileURLToPath(import.meta.url));
    }
    const localConfigPath = path.join(currentDirname, 'firebase-applet-config.json');
    if (fs.existsSync(localConfigPath)) {
      firebaseConfig = JSON.parse(fs.readFileSync(localConfigPath, 'utf8'));
    }
  }
} catch (err) {
  console.error("Error reading firebase-applet-config.json:", err);
}

// Initialize Firebase safely
let appFirebase: any = null;
let db: any = null;

try {
  const finalFirebaseConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig?.projectId,
    appId: process.env.FIREBASE_APP_ID || firebaseConfig?.appId,
    apiKey: process.env.FIREBASE_API_KEY || firebaseConfig?.apiKey,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || firebaseConfig?.authDomain,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || firebaseConfig?.storageBucket,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || firebaseConfig?.messagingSenderId,
    firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || firebaseConfig?.firestoreDatabaseId,
  };

  if (finalFirebaseConfig.apiKey) {
    appFirebase = initializeApp(finalFirebaseConfig);
    db = getFirestore(appFirebase, finalFirebaseConfig.firestoreDatabaseId || undefined);
    console.log("Firebase initialized successfully on server.");
  } else {
    console.warn("WARNING: Firebase API key is missing. Firebase is not initialized. Background jobs and notifications requiring database will be offline, but server is running!");
  }
} catch (firebaseErr: any) {
  console.error("Critical error configuring Firebase on startup:", firebaseErr);
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // Security Middleware to block sensitive paths and files
  app.use((req, res, next) => {
    const blockedPatterns = [
      /\.env.*/i,
      /\.sql$/i,
      /\.htpasswd$/i,
      /^\/wp-json\//i,
      /^\/server-status/i,
      /^\/admin/i,
      /^\/cpanel/i
    ];

    if (blockedPatterns.some(pattern => pattern.test(req.path))) {
      console.warn(`[Security] Blocked access to restricted path: ${req.path} (IP: ${req.ip})`);
      return res.status(403).json({
        error: "Forbidden",
        message: "Access to this resource is restricted for security reasons."
      });
    }
    next();
  });

  // Security Headers Middleware
  app.use((req, res, next) => {
    // Content Security Policy (Optimized for Render production deployments)
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.firebaseapp.com https://apis.google.com https://www.gstatic.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "img-src 'self' data: https: http:; " +
      "font-src 'self' data: https://fonts.gstatic.com; " +
      "connect-src 'self' https: wss:; " +
      "frame-src 'self' https://*.firebaseapp.com https://*.firebase.com; " +
      "upgrade-insecure-requests;"
    );

    // X-Frame-Options
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // Permissions-Policy
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');

    // Referrer-Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // X-Content-Type-Options
    res.setHeader('X-Content-Type-Options', 'nosniff');

    next();
  });

  app.use(express.json());

  // Email Transporter (Lazy)
  let transporter: nodemailer.Transporter | null = null;
  function getTransporter() {
    if (!transporter) {
      const user = process.env.VITE_EMAIL_USER || process.env.EMAIL_USER;
      const pass = process.env.VITE_EMAIL_PASS || process.env.EMAIL_PASS;
      
      if (!user || !pass) {
        console.warn("Email credentials not configured in environment variables.");
        return null;
      }

      transporter = nodemailer.createTransport({
        service: 'gmail', // or other service
        auth: {
          user: user,
          pass: pass
        }
      });
    }
    return transporter;
  }

  // API Route for sending manual reminders (e.g. from UI)
  app.post('/api/send-reminder', async (req, res) => {
    if (!db) {
      return res.status(503).json({ error: "O banco de dados do Firebase não está configurado ou disponível no servidor." });
    }

    const { recordId } = req.body;

    if (!recordId) {
      return res.status(400).json({ error: "O identificador da consulta (recordId) é obrigatório." });
    }

    const mailTransporter = getTransporter();
    if (!mailTransporter) {
      return res.status(500).json({ error: "O serviço de e-mail não está configurado no servidor." });
    }

    try {
      // 1. Fetch real record from firestore securely to prevent spoofing
      const recordRef = doc(db, 'records', recordId);
      const recordSnap = await getDoc(recordRef);

      if (!recordSnap.exists()) {
        return res.status(404).json({ error: "A consulta informada não foi encontrada no banco de dados." });
      }

      const record = recordSnap.data();
      const patientName = record.paciente;
      const date = record.data;
      const time = record.horario || "conforme agendado";

      if (!patientName) {
        return res.status(400).json({ error: "Os dados da consulta estão incompletos no banco de dados." });
      }

      // 2. Fetch patient profile to get the actual registered email from database securely
      const patientQ = query(collection(db, 'patients'), where('name', '==', patientName));
      const patientSnapshot = await getDocs(patientQ);

      if (patientSnapshot.empty) {
        return res.status(400).json({ error: `Nenhum cadastro de paciente foi encontrado com o nome "${patientName}".` });
      }

      const patientData = patientSnapshot.docs[0].data();
      const patientEmail = patientData.email;

      if (!patientEmail) {
        return res.status(400).json({ error: `O paciente "${patientName}" não possui endereço de e-mail cadastrado.` });
      }

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: patientEmail,
        subject: `Lembrete de Consulta - Sorriso & Saúde`,
        text: `Olá ${patientName}, este é um lembrete da sua consulta agendada para o dia ${date} às ${time}. Estamos ansiosos para ver você!`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #0ea5e9;">Lembrete de Consulta</h2>
            <p>Olá <strong>${patientName}</strong>,</p>
            <p>Este é um lembrete da sua consulta odontológica agendada:</p>
            <div style="background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Data:</strong> ${date}</p>
              <p style="margin: 5px 0;"><strong>Hora:</strong> ${time}</p>
              <p style="margin: 5px 0;"><strong>Local:</strong> Sorriso & Saúde Odontologia</p>
            </div>
            <p>Se precisar reagendar, por favor entre em contato com pelo menos 24h de antecedência.</p>
            <p>Atenciosamente,<br>Equipe Sorriso & Saúde</p>
          </div>
        `
      };

      await mailTransporter.sendMail(mailOptions);
      
      // Update record to indicate reminder sent successfully
      await updateDoc(recordRef, {
        reminderSent: true,
        reminderSentAt: new Date().toISOString()
      });

      res.json({ success: true, message: "E-mail de lembrete enviado com sucesso!" });
    } catch (error: any) {
      console.error("Error sending email:", error);
      let errorMsg = "Falha ao enviar e-mail de lembrete.";
      if (error.code === 'EAUTH' || error.responseCode === 535) {
        errorMsg = "Erro de Autenticação: Verifique se as credenciais (EMAIL_USER e EMAIL_PASS) estão corretas. Se usar Gmail, você DEVE usar uma 'Senha de Aplicativo'.";
      }
      res.status(500).json({ error: errorMsg, details: error.message });
    }
  });

  // Background Task: Check for upcoming appointments (reminders)
  // This runs every 10 minutes in this example
  setInterval(async () => {
    if (!db) {
      console.warn("Skipping background appointments check because Firebase is not initialized.");
      return;
    }
    console.log("Checking for upcoming appointments to send reminders...");
    const mailTransporter = getTransporter();
    if (!mailTransporter) return;

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // Query records for tomorrow that haven't been reminded
      const q = query(
        collection(db, 'records'), 
        where('data', '==', tomorrowStr),
        where('status', '==', 'Agendado')
      );

      const snapshot = await getDocs(q);
      console.log(`Found ${snapshot.size} appointments for tomorrow.`);

      for (const appointmentDoc of snapshot.docs) {
        const record = appointmentDoc.data();
        
        // Skip if already sent
        if (record.reminderSent) continue;

        // We need the patient's email. Since it's not in the record, 
        // we'll try to find it in the 'patients' collection.
        const patientQ = query(collection(db, 'patients'), where('name', '==', record.paciente));
        const patientSnapshot = await getDocs(patientQ);
        
        if (patientSnapshot.empty) {
          console.warn(`No contact info found for patient: ${record.paciente}`);
          continue;
        }

        const patientData = patientSnapshot.docs[0].data();
        const email = patientData.email;

        if (!email) {
          console.warn(`Patient ${record.paciente} has no email address.`);
          continue;
        }

        // Send Email
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: email,
          subject: `Lembrete de Consulta Amanhã - Sorriso & Saúde`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #0ea5e9;">Lembrete: Consulta Amanhã</h2>
              <p>Olá <strong>${record.paciente}</strong>,</p>
              <p>Lembramos que você tem uma consulta agendada para amanhã:</p>
              <div style="background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Data:</strong> ${record.data}</p>
                <p style="margin: 5px 0;"><strong>Serviço:</strong> ${record.procedimento}</p>
              </div>
              <p>Caso não possa comparecer, por favor nos avise.</p>
              <p>Esperamos por você!</p>
            </div>
          `
        };

        try {
          await mailTransporter.sendMail(mailOptions);
          await updateDoc(appointmentDoc.ref, {
            reminderSent: true,
            reminderSentAt: new Date().toISOString()
          });
          console.log(`Reminder sent to ${record.paciente} (${email})`);
        } catch (sendErr) {
          console.error(`Failed to send reminder to ${record.paciente}:`, sendErr);
        }
      }
    } catch (err) {
      console.error("Error in background reminder worker:", err);
    }
  }, 10 * 60 * 1000); // 10 minutes

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
