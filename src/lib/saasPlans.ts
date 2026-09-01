import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';

export interface SaaSPlanConfig {
  id: string;
  name: string;
  price: number;
  period: string;
  tagline: string;
  limits: {
    dentists: number;
    patients: number;
  };
  flag?: string;
  color?: string;
  badgeColor?: string;
  features: string[];
  active?: boolean;
}

export const DEFAULT_SAAS_PLANS: SaaSPlanConfig[] = [
  {
    id: 'Lite',
    name: 'Lite',
    price: 149,
    period: 'mês',
    color: 'from-blue-500 to-indigo-600',
    badgeColor: 'bg-blue-50 text-blue-600 border-blue-100',
    tagline: 'Ideal para profissionais autônomos iniciando.',
    limits: { dentists: 1, patients: 100 },
    features: [
      'Apenas 1 dentista cadastrado',
      'Limite de até 100 pacientes ativos',
      'Agenda clínica completa em tempo real',
      'Prontuário Odontológico Digital',
      'Relatório de faturamento básico',
      'Suporte por e-mail em horário comercial'
    ],
    active: true
  },
  {
    id: 'Pro',
    name: 'Pro',
    price: 299,
    period: 'mês',
    color: 'from-brand-cyan to-blue-600',
    badgeColor: 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20',
    tagline: 'O plano ideal para clínicas em expansão.',
    limits: { dentists: 5, patients: 1000 },
    flag: 'Mais Vendido',
    features: [
      'Até 5 dentistas integrados na mesma conta',
      'Limite estendido de até 1.000 pacientes',
      'Odontograma virtual interativo ilimitado',
      'Módulo financeiro automatizado + contas',
      'Lembretes inteligentes de consulta',
      'Disparo manual de avisos via WhatsApp',
      'Suporte prioritário via chat online'
    ],
    active: true
  },
  {
    id: 'Platinum',
    name: 'Platinum',
    price: 599,
    period: 'mês',
    color: 'from-slate-800 to-slate-900',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
    tagline: 'Gestão robusta e ilimitada para clínicas grandes.',
    limits: { dentists: 9999, patients: 99999 },
    features: [
      'Preenchimento de faturamento ilimitado',
      'Dentistas e pacientes ilimitados',
      'Personalização total da clínica (Marca Própria)',
      'Módulo de Estoque & Controle de Insumos',
      'Backups diários automatizados exportáveis',
      'Suporte dedicado 24h + assessoria de faturamento',
      'Treinamento online gratuito para a equipe'
    ],
    active: true
  }
];

export const PLANS_CONFIG_DOC = 'saas_plans';
export const SAAS_PIX_CONFIG_DOC = 'saas_pix_config';

export interface SaaSPixConfig {
  key: string;
  name: string;
  city: string;
  bank?: string;
  description?: string;
}

export const DEFAULT_SAAS_PIX: SaaSPixConfig = {
  key: '',
  name: 'ODONTODASH SAAS',
  city: 'SAO PAULO',
  bank: '',
  description: 'Assinatura Plano Odonto'
};

/**
 * Subscribes to real-time global SaaS PIX configuration in Firestore.
 */
export function subscribeSaaSPixConfig(
  db: any,
  callback: (config: SaaSPixConfig) => void
): () => void {
  if (!db) {
    callback(DEFAULT_SAAS_PIX);
    return () => {};
  }

  try {
    const pixDocRef = doc(db, 'system_settings', SAAS_PIX_CONFIG_DOC);
    const unsubscribe = onSnapshot(pixDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        callback({
          key: data.key || '',
          name: data.name || 'ODONTODASH SAAS',
          city: data.city || 'SAO PAULO',
          bank: data.bank || '',
          description: data.description || 'Assinatura Plano Odonto'
        });
        return;
      }
      callback(DEFAULT_SAAS_PIX);
    }, (error) => {
      console.warn("Could not load real-time SaaS PIX config:", error);
      callback(DEFAULT_SAAS_PIX);
    });

    return unsubscribe;
  } catch (err) {
    console.warn("Failed to subscribe to SaaS PIX config:", err);
    callback(DEFAULT_SAAS_PIX);
    return () => {};
  }
}

/**
 * Persists global SaaS PIX configuration in Firestore.
 */
export async function saveSaaSPixConfig(db: any, config: SaaSPixConfig): Promise<boolean> {
  if (!db) return false;
  try {
    const pixDocRef = doc(db, 'system_settings', SAAS_PIX_CONFIG_DOC);
    await setDoc(pixDocRef, {
      ...config,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (err) {
    console.error("Error saving SaaS PIX config:", err);
    throw err;
  }
}

/**
 * Subscribes to real-time SaaS plans configuration in Firestore.
 */
export function subscribeSaaSPlans(
  db: any, 
  callback: (plans: SaaSPlanConfig[]) => void
): () => void {
  if (!db) {
    callback(DEFAULT_SAAS_PLANS);
    return () => {};
  }

  try {
    const plansDocRef = doc(db, 'system_settings', PLANS_CONFIG_DOC);
    const unsubscribe = onSnapshot(plansDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.plans) && data.plans.length > 0) {
          callback(data.plans);
          return;
        }
      }
      callback(DEFAULT_SAAS_PLANS);
    }, (error) => {
      console.warn("Could not load real-time SaaS plans config:", error);
      callback(DEFAULT_SAAS_PLANS);
    });

    return unsubscribe;
  } catch (err) {
    console.warn("Failed to subscribe to SaaS plans:", err);
    callback(DEFAULT_SAAS_PLANS);
    return () => {};
  }
}

/**
 * Persists updated SaaS plans in Firestore.
 */
export async function saveSaaSPlans(db: any, plans: SaaSPlanConfig[]): Promise<boolean> {
  if (!db) return false;
  try {
    const plansDocRef = doc(db, 'system_settings', PLANS_CONFIG_DOC);
    await setDoc(plansDocRef, {
      plans,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (err) {
    console.error("Error saving SaaS plans configuration:", err);
    throw err;
  }
}

/**
 * Resets SaaS plans to default values in Firestore.
 */
export async function resetSaaSPlans(db: any): Promise<boolean> {
  return saveSaaSPlans(db, DEFAULT_SAAS_PLANS);
}
