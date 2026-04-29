import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import Firebase config
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'firebase-applet-config.json'), 'utf8'));

// Initialize Firebase
const appFirebase = initializeApp(firebaseConfig);
const db = getFirestore(appFirebase, firebaseConfig.firestoreDatabaseId);

async function startServer() {
  const app = express();
  const PORT = 3000;

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
    const { recordId, patientEmail, patientName, date, time } = req.body;
    
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

    const mailTransporter = getTransporter();
    if (!mailTransporter) {
      return res.status(500).json({ error: "E-mail service not configured" });
    }

    try {
      await mailTransporter.sendMail(mailOptions);
      
      // Update record if it exists
      if (recordId) {
        const recordRef = doc(db, 'records', recordId);
        await updateDoc(recordRef, {
          reminderSent: true,
          reminderSentAt: new Date().toISOString()
        });
      }

      res.json({ success: true, message: "Email sent successfully" });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Background Task: Check for upcoming appointments (reminders)
  // This runs every 10 minutes in this example
  setInterval(async () => {
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
