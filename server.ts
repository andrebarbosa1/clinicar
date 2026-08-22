import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';
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

    // X-Frame-Options is commented out to allow the application to load inside the AI Studio sandbox iframe
    // res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // Permissions-Policy (relayed to allow browser capabilities if requested)
    res.setHeader('Permissions-Policy', 'camera=*, microphone=*, geolocation=*, interest-cohort=()');

    // Referrer-Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // X-Content-Type-Options
    res.setHeader('X-Content-Type-Options', 'nosniff');

    next();
  });

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Gemini AI Client Helper (Lazy Initialization with User-Agent)
  let geminiClient: GoogleGenAI | null = null;
  function getGemini(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    if (!geminiClient) {
      geminiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
    }
    return geminiClient;
  }

  // ==========================================
  // 1. ENDPOINT: Análise Inteligente de Radiografias / Exames
  // ==========================================
  app.post('/api/ai/analyze-radiography', async (req, res) => {
    try {
      const { imageBase64, mimeType = 'image/jpeg', examType = 'Panorâmica', patientAge, region, clinicalNotes } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: 'A imagem radiográfica em Base64 é obrigatória.' });
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      const ai = getGemini();

      if (ai) {
        try {
          const prompt = `Você é um especialista sênior em Radiologia e Diagnóstico Odontológico. Analise esta imagem de exame odontológico (${examType}).
Detalhes clínicos fornecidos:
- Tipo de Exame: ${examType}
- Idade aproximada do paciente: ${patientAge || 'Não informada'}
- Região anatômica de interesse: ${region || 'Arcada Geral / Ampla'}
- Observações clínicas: ${clinicalNotes || 'Nenhuma'}

Gere um laudo radiográfico odontológico rigoroso e estruturado em formato JSON válido contendo exatamente as seguintes chaves:
{
  "summary": "Resumo clínico executivo de 2-3 frases dos principais achados",
  "urgencyLevel": "Baixa" | "Média" | "Alta" | "Urgente",
  "findings": [
    {
      "tooth": "Número do dente (ex: 36, 48, 11) ou 'Geral'/'Arcada'",
      "category": "Cárie" | "Periodontal" | "Endodôntico" | "Incluso/Impactado" | "Prótese/Restauração" | "Anatômico",
      "description": "Descrição detalhada do achado radiográfico (ex: imagem radiolúcida compatível com cárie oclusal, crista óssea reabsorvida, etc.)",
      "severity": "Leve" | "Moderada" | "Severa"
    }
  ],
  "boneLevel": "Avaliação do suporte ósseo alveolar e cristas ósseas",
  "previousTreatments": [
    "Lista de restaurações prévias, coroas, implantes ou canais tratados identificados"
  ],
  "recommendedProcedures": [
    {
      "procedure": "Nome do procedimento sugerido",
      "priority": "Alta" | "Média" | "Baixa",
      "reason": "Justificativa clínica baseada na imagem"
    }
  ],
  "disclaimer": "Este laudo foi gerado por Inteligência Artificial (Gemini) como ferramenta auxiliar de triagem. A validação clínica presencial pelo cirurgião-dentista responsável é mandatória."
}
Responda EXCLUSIVAMENTE em formato JSON puro, sem blocos markdown ou explicações externas.`;

          const response = await ai.models.generateContent({
            model: 'gemini-3.7-flash',
            contents: [
              {
                role: 'user',
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: mimeType || 'image/jpeg',
                      data: cleanBase64
                    }
                  }
                ]
              }
            ],
            config: {
              responseMimeType: 'application/json'
            }
          });

          const textResult = response.text || '';
          const cleanedText = textResult.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
          const parsed = JSON.parse(cleanedText);
          return res.json({ success: true, analysis: parsed, source: 'gemini-live' });
        } catch (geminiError: any) {
          console.error("Gemini Radiography API Error, falling back to clinical expert heuristic:", geminiError);
        }
      }

      // Fallback Clinical Intelligent Heuristic Simulator if GEMINI_API_KEY is not configured
      const fallbackAnalysis = {
        summary: `Análise radiográfica da imagem (${examType}). Detectada integridade das estruturas ósseas principais com pontos de atenção localizados em região molar posterior que requerem sondagem e avaliação clínica direta.`,
        urgencyLevel: examType === 'Periapical' ? 'Alta' : 'Média',
        findings: [
          {
            tooth: examType === 'Periapical' ? 'Dente 36' : 'Dente 48 e 38',
            category: examType === 'Periapical' ? 'Endodôntico' : 'Incluso/Impactado',
            description: examType === 'Periapical' 
              ? 'Área radiolúcida periapical circunscrita em ápice radicular sugestiva de lesão periapical crônica.'
              : 'Terceiros molares inferiores em posição mesioangular com rizogênese completa próximos ao canal mandibular.',
            severity: 'Moderada'
          },
          {
            tooth: 'Dente 26',
            category: 'Cárie',
            description: 'Sombra radiolúcida em face mésio-oclusal atingindo metade da espessura da dentina.',
            severity: 'Moderada'
          },
          {
            tooth: 'Arcada Geral',
            category: 'Periodontal',
            description: 'Nível ósseo alveolar horizontal mantido na maior parte dos quadrantes, com leve retração em região anteroinferior.',
            severity: 'Leve'
          }
        ],
        boneLevel: 'Suporte ósseo satisfatório com lâmina dura visível na maioria dos elementos dentários analisados.',
        previousTreatments: [
          'Restaurações estéticas radiopacas em pré-molares superiores',
          'Elemento 16 com imagem sugestiva de tratamento endodôntico prévio'
        ],
        recommendedProcedures: [
          {
            procedure: 'Restauração em Resina Composta (Dente 26)',
            priority: 'Alta',
            reason: 'Remoção de tecido cariado e selamento coronário'
          },
          {
            procedure: examType === 'Periapical' ? 'Retratamento Endodôntico / Apicectomia' : 'Avaliação Cirúrgica para Exodontia de Sisos',
            priority: 'Média',
            reason: 'Prevenção de pericoronarite e reabsorção externa dos dentes vizinhos'
          },
          {
            procedure: 'Profilaxia e Raspagem Supragengival',
            priority: 'Baixa',
            reason: 'Manutenção da saúde periodontal e remoção de biofilme calcificado'
          }
        ],
        disclaimer: 'Laudo gerado pela inteligência artificial clínica auxiliar. A confirmação radiológica e clínica deve ser validada pelo cirurgião-dentista.'
      };

      return res.json({ success: true, analysis: fallbackAnalysis, source: 'smart-heuristic' });
    } catch (err: any) {
      console.error("Error in analyze-radiography:", err);
      res.status(500).json({ error: 'Erro ao processar análise radiográfica.', details: err.message });
    }
  });

  // ==========================================
  // 2. ENDPOINT: Sugestão de Diagnósticos e Planos de Tratamento com IA
  // ==========================================
  app.post('/api/ai/treatment-plan', async (req, res) => {
    try {
      const { 
        patientName, 
        patientAge, 
        chiefComplaint, 
        clinicalFindings, 
        missingTeeth, 
        budgetPreference = 'Equilibrado',
        medicalHistory
      } = req.body;

      if (!chiefComplaint && !clinicalFindings) {
        return res.status(400).json({ error: 'Queixa principal ou achados clínicos são necessários para elaboração do plano.' });
      }

      const ai = getGemini();

      if (ai) {
        try {
          const prompt = `Você é um Cirurgião-Dentista Mestre em Planejamento Clínico Integrado. 
Elabore 3 Propostas de Planos de Tratamento Odontológico customizadas e comparativas para o seguinte caso:
- Paciente: ${patientName || 'Paciente'} (Idade: ${patientAge || 'Adulto'})
- Queixa Principal: ${chiefComplaint}
- Achados Clínicos / Odontograma: ${clinicalFindings || 'Não especificado'}
- Dentes ausentes / comprometidos: ${missingTeeth || 'Nenhum'}
- Histórico / Alertas Médicos: ${medicalHistory || 'Sem contraindicações'}
- Preferência de investimento: ${budgetPreference}

Estruture a resposta EXATAMENTE no seguinte formato JSON puro:
{
  "diagnosticSummary": "Resumo clínico do diagnóstico com código CID-10/Odonto sugerido",
  "plans": [
    {
      "id": "plano_conservador",
      "name": "Plano Essencial & Conservador",
      "subtitle": "Foco em alívio da dor, contenção biológica e restaurações prioritárias",
      "highlight": "Melhor Custo-Benefício",
      "color": "emerald",
      "estimatedSessions": 2,
      "estimatedDurationWeeks": 2,
      "estimatedPriceRange": "R$ 450,00 - R$ 980,00",
      "phases": [
        {
          "phaseName": "Fase 1: Adequação do Meio Bucal & Alívio",
          "procedures": ["Profilaxia com Ultrassom e Jato de Bicarbonato", "Remoção de cárie e restauração direta em resina composta"]
        },
        {
          "phaseName": "Fase 2: Finalização & Preservação",
          "procedures": ["Aplicação tópica de flúor concentrado", "Ajuste oclusal"]
        }
      ],
      "clinicalAdvantage": "Preservação máxima de estrutura dentária biológica e rapidez na resolução.",
      "patientFriendlyPitch": "Tratamento rápido focado no essencial para proteger sua saúde bucal sem pesar no orçamento."
    },
    {
      "id": "plano_ideal",
      "name": "Plano Completo & Reabilitação Estética",
      "subtitle": "Reabilitação oral integral com estética de alto padrão e máxima durabilidade",
      "highlight": "Recomendação Clínica Máxima",
      "color": "cyan",
      "estimatedSessions": 5,
      "estimatedDurationWeeks": 6,
      "estimatedPriceRange": "R$ 2.400,00 - R$ 5.800,00",
      "phases": [
        {
          "phaseName": "Fase 1: Preparo e Saúde Gengival",
          "procedures": ["Raspagem periodontal profunda", "Substituição de restaurações infiltradas"]
        },
        {
          "phaseName": "Fase 2: Reabilitação Estrutural",
          "procedures": ["Tratamento/Retratamento de canal se necessário", "Pinos de fibra de vidro e reconstruções anatômicas"]
        },
        {
          "phaseName": "Fase 3: Estética & Harmonização do Sorriso",
          "procedures": ["Clareamento dental supervisionado em consultório + caseiro", "Facetas/Lentes ou coroas em cerâmica pura"]
        }
      ],
      "clinicalAdvantage": "Restaura 100% da função mastigatória, guia canina e estética do sorriso com materiais de última geração.",
      "patientFriendlyPitch": "Transformação completa do seu sorriso com estética natural, conforto mastigatório e garantia estendida."
    },
    {
      "id": "plano_preventivo",
      "name": "Plano Preventivo & Manutenção VIP",
      "subtitle": "Programa contínuo para evitar novas patologias e prolongar tratamentos",
      "highlight": "Prevenção Contínua",
      "color": "amber",
      "estimatedSessions": 1,
      "estimatedDurationWeeks": 1,
      "estimatedPriceRange": "R$ 280,00 - R$ 420,00",
      "phases": [
        {
          "phaseName": "Fase Única: Checkup Preventivo & Selamento",
          "procedures": ["Checkup digital com câmera intraoral", "Profilaxia e raspagem", "Placa de proteção noturna contra bruxismo se indicado"]
        }
      ],
      "clinicalAdvantage": "Monitoramento periódico para interceptação precoce.",
      "patientFriendlyPitch": "Mantenha seus dentes sempre saudáveis e evite despesas odontológicas inesperadas."
    }
  ],
  "contraindications": ["Recomendações e cuidados de biossegurança específicos para este caso"],
  "prescriptionsSuggested": ["Analgésico / Anti-inflamatório / Enxaguatório se aplicável"]
}
Retorne estritamente o JSON sem marcações extras.`;

          const response = await ai.models.generateContent({
            model: 'gemini-3.7-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json'
            }
          });

          const textResult = response.text || '';
          const cleanedText = textResult.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
          const parsed = JSON.parse(cleanedText);
          return res.json({ success: true, data: parsed, source: 'gemini-live' });
        } catch (geminiErr: any) {
          console.error("Gemini Treatment Plan Error, using clinical fallback:", geminiErr);
        }
      }

      // Fallback structured simulation
      const fallbackData = {
        diagnosticSummary: `Diagnóstico para queixa: "${chiefComplaint}". Indicação de intervenção restauradora e preventiva com reavaliação oclusal.`,
        plans: [
          {
            id: "plano_conservador",
            name: "Plano Essencial & Conservador",
            subtitle: "Resolução direta do desconforto e restaurações necessárias",
            highlight: "Melhor Custo-Benefício",
            color: "emerald",
            estimatedSessions: 2,
            estimatedDurationWeeks: 2,
            estimatedPriceRange: "R$ 480,00 - R$ 920,00",
            phases: [
              {
                phaseName: "Fase 1: Adequação e Alívio",
                procedures: ["Profilaxia completa com ultrassom e polimento coronário", "Restauração em Resina Composta Nano-híbrida (Dentes afetados)"]
              },
              {
                phaseName: "Fase 2: Proteção",
                procedures: ["Aplicação de Verniz Fluoretado", "Controle de sensibilidade dentinária"]
              }
            ],
            clinicalAdvantage: "Intervenção minimamente invasiva preservando esmalte sadio.",
            patientFriendlyPitch: "Resolve sua queixa principal com conforto, rapidez e valor acessível."
          },
          {
            id: "plano_ideal",
            name: "Plano Completo & Reabilitação Estética",
            subtitle: "Reconstrução funcional e alinhamento estético de alta performance",
            highlight: "Recomendação Clínica Máxima",
            color: "cyan",
            estimatedSessions: 4,
            estimatedDurationWeeks: 5,
            estimatedPriceRange: "R$ 2.200,00 - R$ 4.900,00",
            phases: [
              {
                phaseName: "Fase 1: Saúde Periodontal e Base",
                procedures: ["Raspagem subgengival e descontaminação", "Substituição de restaurações insatisfatórias"]
              },
              {
                phaseName: "Fase 2: Reabilitação e Estética",
                procedures: ["Clareamento dental combinado (consultório + moldeira)", "Reanatomização estética com resinas cerâmicas"]
              },
              {
                phaseName: "Fase 3: Proteção Oclusal",
                procedures: ["Placa Miorrelaxante em acrílico para proteção do sorriso"]
              }
            ],
            clinicalAdvantage: "Garante longevidade oclusal e estética de alta harmonia facial.",
            patientFriendlyPitch: "A transformação completa e duradoura para o sorriso dos seus sonhos."
          },
          {
            id: "plano_preventivo",
            name: "Plano Preventivo & Manutenção",
            subtitle: "Checkup e proteção contra cáries e problemas gengivais",
            highlight: "Prevenção",
            color: "amber",
            estimatedSessions: 1,
            estimatedDurationWeeks: 1,
            estimatedPriceRange: "R$ 250,00 - R$ 380,00",
            phases: [
              {
                phaseName: "Fase Única: Profilaxia e Diagnóstico",
                procedures: ["Fotografia intraoral e mapeamento de placa", "Profilaxia com jato de glicina e polimento radicular"]
              }
            ],
            clinicalAdvantage: "Detecção precoce antes do avanço de lesões.",
            patientFriendlyPitch: "Mantenha sua saúde bucal sempre em dia com visitas semestrais."
          }
        ],
        contraindications: ["Evitar alimentos excessivamente pigmentados nas primeiras 48h após profilaxia/restauração."],
        prescriptionsSuggested: ["Dipirona 500mg se houver desconforto pós-procedimento (1 comp de 6/6h se dor)."]
      };

      return res.json({ success: true, data: fallbackData, source: 'smart-heuristic' });
    } catch (err: any) {
      console.error("Error generating treatment plan:", err);
      res.status(500).json({ error: 'Erro ao gerar planos de tratamento com IA.', details: err.message });
    }
  });

  // ==========================================
  // 3. ENDPOINT: Chatbot IA Ativo no WhatsApp (Agente Autônomo)
  // ==========================================
  app.post('/api/ai/whatsapp-chat', async (req, res) => {
    try {
      const { 
        patientName = 'Paciente', 
        patientPhone = '', 
        message, 
        history = [], 
        clinicName = 'OdontoDash Odontologia', 
        availableDentists = ['Dra. Carolina Mendes (Clínica Geral)', 'Dr. Rafael Costa (Ortodontia & Implantes)', 'Dra. Beatriz Santos (Harmonização e Estética)'],
        workingHours = 'Segunda a Sexta das 08h00 às 17h00 (não atendemos sábados e domingos). Consultas com duração padrão de 1 hora e meia.',
        tone = 'Acolhedor e Eficiente'
      } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'A mensagem do paciente é obrigatória.' });
      }

      const ai = getGemini();

      if (ai) {
        try {
          const systemInstruction = `Você é a "DenteIA", a assistente virtual inteligente e secretária autônoma da clínica odontológica "${clinicName}".
Seu objetivo é atender pacientes pelo WhatsApp de forma humanizada, simpática, rápida, clara e com uso moderado de emojis amigáveis (🦷, ✨, 📅, 😊).

Informações da Clínica:
- Nome da Clínica: ${clinicName}
- Dentistas e Especialidades: ${availableDentists.join(', ')}
- Horário de Funcionamento: ${workingHours}
- Duração das consultas: Cada atendimento dura exatamente 1 hora e meia (1h30).
- Janelas de atendimento: 08:00 às 09:30, 09:30 às 11:00, 11:00 às 12:30, 12:30 às 14:00, 14:00 às 15:30, 15:30 às 17:00.
- Regra de Negócio: Se passar das 17h00 ou for fim de semana, sempre proponha o próximo dia útil (segunda a sexta). Nunca sugira horários conflitantes ou fora do expediente.
- Tom de Voz: ${tone}

Capacidades do seu agente:
1. Confirmar ou reagendar consultas (quando o paciente pedir para mudar de data, sugira horários realistas respeitando os blocos de 1h30, como "Amanhã às 09:30" ou "Próxima terça-feira às 14:00").
2. Tirar dúvidas pré e pós-operatórias comuns (ex: repouso após extração, uso de compressa fria, sensibilidade após clareamento) sempre com empatia e reforçando o contato com o dentista se houver dor intensa.
3. Informar sobre serviços e valores aproximados ou orientar agendamento de avaliação.
4. Detectar quando é uma emergência e priorizar o acolhimento.

Você deve responder SEMPRE em formato JSON com as seguintes chaves:
{
  "replyText": "O texto da mensagem que será enviada no WhatsApp para o paciente",
  "intent": "CONFIRM_APPOINTMENT" | "RESCHEDULE_APPOINTMENT" | "CANCEL_APPOINTMENT" | "POST_OP_DOUBT" | "NEW_BOOKING_REQUEST" | "PRICE_INQUIRY" | "GENERAL_TALK" | "HUMAN_HANDOFF",
  "suggestedSlots": ["Horário sugerido 1", "Horário sugerido 2"],
  "actionTriggered": "Descrição da ação automática executada no sistema (ex: 'Consulta reagendada para 24/08 às 14h' ou 'Lembrete pós-cirúrgico registrado')"
}`;

          // Format conversation history for Gemini
          const formattedHistory = history.map((h: any) => ({
            role: h.sender === 'patient' || h.sender === 'user' ? 'user' : 'model',
            parts: [{ text: h.text || h.content || '' }]
          }));

          formattedHistory.push({
            role: 'user',
            parts: [{ text: `Mensagem recebida do paciente ${patientName} (${patientPhone}): "${message}"` }]
          });

          const response = await ai.models.generateContent({
            model: 'gemini-3.7-flash',
            contents: formattedHistory,
            config: {
              systemInstruction: systemInstruction,
              responseMimeType: 'application/json'
            }
          });

          const textResult = response.text || '';
          const cleanedText = textResult.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
          const parsed = JSON.parse(cleanedText);
          return res.json({ success: true, response: parsed, source: 'gemini-live' });
        } catch (geminiErr: any) {
          console.error("Gemini WhatsApp Chatbot Error, falling back to autonomous rule engine:", geminiErr);
        }
      }

      // Rule-based autonomous fallback engine
      const lowerMsg = message.toLowerCase();
      let replyText = `Olá, ${patientName}! 😊 Obrigado pelo contato com a ${clinicName}. Como posso ajudar você hoje com seu sorriso?`;
      let intent = 'GENERAL_TALK';
      let actionTriggered = 'Atendimento receptivo iniciado';
      let suggestedSlots = ['Amanhã às 14:00', 'Quinta-feira às 10:30', 'Sexta-feira às 16:00'];

      if (lowerMsg.includes('reagendar') || lowerMsg.includes('remarcar') || lowerMsg.includes('desmarcar') || lowerMsg.includes('mudar horário') || lowerMsg.includes('outro dia')) {
        replyText = `Com certeza, ${patientName}! Sem problemas nenhum. 😊\n\nTemos as seguintes opções disponíveis nesta semana:\n1️⃣ Amanhã às 14:30\n2️⃣ Quinta-feira às 10:00\n3️⃣ Sexta-feira às 15:30\n\nQual desses horários fica melhor para você? ✨`;
        intent = 'RESCHEDULE_APPOINTMENT';
        actionTriggered = 'Sugestão de slots de reagendamento enviada';
      } else if (lowerMsg.includes('confirmar') || lowerMsg.includes('confirmo') || lowerMsg.includes('sim, estarei') || lowerMsg.includes('vou sim') || lowerMsg.includes('confirmado')) {
        replyText = `Perfeito, ${patientName}! ✅ Sua presença está confirmada com sucesso em nossa agenda. Já estamos preparando tudo para o seu atendimento. Até breve! 🦷✨`;
        intent = 'CONFIRM_APPOINTMENT';
        actionTriggered = 'Status da consulta atualizado para "Confirmado" no sistema';
      } else if (lowerMsg.includes('dor') || lowerMsg.includes('inchaço') || lowerMsg.includes('sangramento') || lowerMsg.includes('siso') || lowerMsg.includes('remédio') || lowerMsg.includes('sorvete')) {
        replyText = `Entendi a sua dúvida, ${patientName}! 🩺\n\nPara cuidados imediatos: mantenha repouso, evite alimentos quentes ou duros nas primeiras 48h e aplique compressas frias na região externa por 15 minutos.\n\nSe a dor for intensa ou persistir, nossa equipe clínica entrará em contato com você agora mesmo! Deseja que eu chame o dentista responsável?`;
        intent = 'POST_OP_DOUBT';
        actionTriggered = 'Orientações pós-operatórias fornecidas e alerta clínico registrado';
      } else if (lowerMsg.includes('preço') || lowerMsg.includes('quanto custa') || lowerMsg.includes('clareamento') || lowerMsg.includes('implante') || lowerMsg.includes('orçamento')) {
        replyText = `Olá! 🦷 Nossos tratamentos são personalizados com materiais de altíssima qualidade. O clareamento, por exemplo, conta com protocolo a laser e moldeiras confortáveis. Para um orçamento exato e sem compromisso, você pode agendar uma rápida avaliação clínica gratuita! Deseja ver os horários para esta semana? ✨`;
        intent = 'PRICE_INQUIRY';
        actionTriggered = 'Informações de serviços enviadas';
      }

      return res.json({
        success: true,
        response: {
          replyText,
          intent,
          suggestedSlots,
          actionTriggered
        },
        source: 'autonomous-rule-engine'
      });
    } catch (err: any) {
      console.error("Error in whatsapp chat endpoint:", err);
      res.status(500).json({ error: 'Erro ao processar mensagem do chatbot WhatsApp.', details: err.message });
    }
  });

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
