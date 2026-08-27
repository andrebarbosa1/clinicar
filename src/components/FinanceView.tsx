import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Printer, 
  X, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Filter, 
  Search, 
  BarChart3, 
  Table as TableIcon,
  ChevronDown, 
  ArrowUpRight,
  Sparkles,
  FileText,
  Percent,
  Layers,
  Building2,
  User
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Cell 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DentalRecord } from '../types';
import { cn, formatCurrency } from '../lib/utils';

interface FinanceViewProps {
  data: DentalRecord[];
  patients: any[];
  onUpdatePayment: (id: string, status: any) => void;
  clinicName?: string;
  users?: any[];
  currentUser?: any;
}

const MONTH_NAMES = [
  { index: 0, short: 'Jan', full: 'Janeiro' },
  { index: 1, short: 'Fev', full: 'Fevereiro' },
  { index: 2, short: 'Mar', full: 'Março' },
  { index: 3, short: 'Abr', full: 'Abril' },
  { index: 4, short: 'Mai', full: 'Maio' },
  { index: 5, short: 'Jun', full: 'Junho' },
  { index: 6, short: 'Jul', full: 'Julho' },
  { index: 7, short: 'Ago', full: 'Agosto' },
  { index: 8, short: 'Set', full: 'Setembro' },
  { index: 9, short: 'Out', full: 'Outubro' },
  { index: 10, short: 'Nov', full: 'Novembro' },
  { index: 11, short: 'Dez', full: 'Dezembro' },
];

export default function FinanceView({
  data,
  patients,
  onUpdatePayment,
  clinicName = 'Oral Admin Odontologia',
  users = [],
  currentUser
}: FinanceViewProps) {
  const [selectedReceipt, setSelectedReceipt] = useState<DentalRecord | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterDentist, setFilterDentist] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [chartViewMode, setChartViewMode] = useState<'chart' | 'table'>('chart');
  const [activeMonthFilter, setActiveMonthFilter] = useState<number | null>(null);

  // Available years from records
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    years.add(currentYear - 1);

    data.forEach(r => {
      if (r.data && isValid(parseISO(r.data))) {
        years.add(parseISO(r.data).getFullYear());
      }
    });

    return Array.from(years).sort((a, b) => b - a);
  }, [data]);

  // Dentists list for filter
  const dentistList = useMemo(() => {
    const set = new Set<string>();
    data.forEach(r => {
      if (r.dentista) set.add(r.dentista);
    });
    return Array.from(set);
  }, [data]);

  // Overall statistics for all filtered records or current view
  const overallStats = useMemo(() => {
    const paid = data
      .filter(r => r.statusPagamento === 'Pago')
      .reduce((s, r) => s + (Number(r.valor) || 0), 0);
    const pending = data
      .filter(r => r.statusPagamento === 'Pendente')
      .reduce((s, r) => s + (Number(r.valor) || 0), 0);
    const overdue = data
      .filter(r => r.statusPagamento === 'Atrasado')
      .reduce((s, r) => s + (Number(r.valor) || 0), 0);
    const total = paid + pending + overdue;
    return { paid, pending, overdue, total };
  }, [data]);

  // Monthly data calculation for the selected year (comparing Previsto vs Recebido)
  const monthlyData = useMemo(() => {
    return MONTH_NAMES.map(m => {
      // Find records for this specific month & selected year
      const monthRecords = data.filter(r => {
        if (!r.data || !isValid(parseISO(r.data))) return false;
        const recordDate = parseISO(r.data);
        return recordDate.getFullYear() === selectedYear && recordDate.getMonth() === m.index;
      });

      // Filter by dentist if selected
      const filteredMonthRecords = filterDentist !== 'todos' 
        ? monthRecords.filter(r => r.dentista === filterDentist)
        : monthRecords;

      // Previsto: all valid expected values (excluding outright cancelados if necessary, but summing planned procedures)
      const previsto = filteredMonthRecords
        .filter(r => r.status !== 'Cancelado')
        .reduce((sum, r) => sum + (Number(r.valor) || 0), 0);

      // Recebido: explicitly marked as 'Pago'
      const recebido = filteredMonthRecords
        .filter(r => r.statusPagamento === 'Pago')
        .reduce((sum, r) => sum + (Number(r.valor) || 0), 0);

      // Pendente / Atrasado
      const pendente = filteredMonthRecords
        .filter(r => r.statusPagamento === 'Pendente')
        .reduce((sum, r) => sum + (Number(r.valor) || 0), 0);

      const atrasado = filteredMonthRecords
        .filter(r => r.statusPagamento === 'Atrasado')
        .reduce((sum, r) => sum + (Number(r.valor) || 0), 0);

      const saldoEmAberto = Math.max(0, previsto - recebido);
      const taxaRealizacao = previsto > 0 ? Math.min(100, Math.round((recebido / previsto) * 100)) : 0;
      const count = filteredMonthRecords.length;

      return {
        monthIndex: m.index,
        month: m.short,
        fullMonth: m.full,
        previsto,
        recebido,
        pendente,
        atrasado,
        saldoEmAberto,
        taxaRealizacao,
        count
      };
    });
  }, [data, selectedYear, filterDentist]);

  // Year totals from monthlyData
  const yearStats = useMemo(() => {
    const totalPrevisto = monthlyData.reduce((acc, m) => acc + m.previsto, 0);
    const totalRecebido = monthlyData.reduce((acc, m) => acc + m.recebido, 0);
    const totalPendente = monthlyData.reduce((acc, m) => acc + m.pendente, 0);
    const totalAtrasado = monthlyData.reduce((acc, m) => acc + m.atrasado, 0);
    const saldoTotal = Math.max(0, totalPrevisto - totalRecebido);
    const taxaGlobal = totalPrevisto > 0 ? (totalRecebido / totalPrevisto) * 100 : 0;

    // Find best month
    let bestMonth = monthlyData[0];
    monthlyData.forEach(m => {
      if (m.recebido > (bestMonth?.recebido || 0)) {
        bestMonth = m;
      }
    });

    return {
      totalPrevisto,
      totalRecebido,
      totalPendente,
      totalAtrasado,
      saldoTotal,
      taxaGlobal,
      bestMonth
    };
  }, [monthlyData]);

  // Filtered records for the payment list table
  const filteredRecords = useMemo(() => {
    return data.filter(r => {
      // Year filter if date is valid
      if (r.data && isValid(parseISO(r.data))) {
        const d = parseISO(r.data);
        if (d.getFullYear() !== selectedYear) return false;
        if (activeMonthFilter !== null && d.getMonth() !== activeMonthFilter) return false;
      }

      // Status filter
      if (filterStatus !== 'todos' && r.statusPagamento !== filterStatus) return false;

      // Dentist filter
      if (filterDentist !== 'todos' && r.dentista !== filterDentist) return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const patientMatch = (r.paciente || '').toLowerCase().includes(term);
        const procMatch = (r.procedimento || '').toLowerCase().includes(term);
        const dentistMatch = (r.dentista || '').toLowerCase().includes(term);
        return patientMatch || procMatch || dentistMatch;
      }

      return true;
    });
  }, [data, selectedYear, activeMonthFilter, filterStatus, filterDentist, searchTerm]);

  // Handle Receipt Printing
  const handlePrint = () => {
    const printContent = document.getElementById('receipt-content');
    if (!printContent) return;

    const printWindow = window.open('', '', 'height=650,width=850');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Recibo de Pagamento - ${selectedReceipt?.paciente || 'Paciente'}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 40px; color: #1e293b; background: #fff; line-height: 1.5; }
            .receipt-container { max-width: 750px; margin: 0 auto; border: 1px solid #cbd5e1; padding: 36px; border-radius: 16px; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0891b2; padding-bottom: 20px; margin-bottom: 24px; }
            .logo { font-size: 22px; font-weight: 800; color: #0891b2; letter-spacing: -0.5px; }
            .receipt-title { font-size: 26px; font-weight: 900; text-transform: uppercase; color: #0f172a; }
            .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
            .info-label { font-size: 10px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 4px; letter-spacing: 0.5px; }
            .info-value { font-size: 14px; font-weight: 700; color: #0f172a; }
            .main-content { background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 28px; border: 1px solid #e2e8f0; }
            .main-text { font-size: 14px; color: #334155; line-height: 1.7; }
            .amount-section { border-top: 1px dashed #cbd5e1; padding-top: 16px; margin-top: 16px; display: flex; justify-content: space-between; align-items: center; }
            .amount-label { font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; }
            .amount-value { font-size: 26px; font-weight: 900; color: #0891b2; }
            .signature-section { margin-top: 50px; display: flex; flex-direction: column; align-items: center; }
            .signature-line { width: 280px; border-top: 1px solid #475569; margin-bottom: 8px; }
            .signature-text { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
            .footer { margin-top: 30px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 12px; }
            @media print {
              body { padding: 0; background: #fff; }
              .receipt-container { border: none; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="header">
              <div class="logo">${clinicName}</div>
              <div class="receipt-title">RECIBO</div>
            </div>
            <div class="info-grid">
              <div>
                <p class="info-label">Paciente</p>
                <p class="info-value">${selectedReceipt?.paciente || 'Não informado'}</p>
                ${
                  patients.find(p => p.name === selectedReceipt?.paciente)?.cpf 
                    ? `<p style="font-size: 11px; color: #64748b; margin-top: 2px;">CPF: ${patients.find(p => p.name === selectedReceipt?.paciente)?.cpf}</p>` 
                    : ''
                }
              </div>
              <div style="text-align: right;">
                <p class="info-label">Data de Emissão</p>
                <p class="info-value">${selectedReceipt?.data ? format(parseISO(selectedReceipt.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : format(new Date(), "dd/MM/yyyy")}</p>
              </div>
            </div>
            <div class="main-content">
              <p class="main-text">
                Recebemos de <strong>${selectedReceipt?.paciente || 'Paciente'}</strong> a importância de <strong>${formatCurrency(selectedReceipt?.valor || 0)}</strong> referente aos serviços odontológicos de <strong>${selectedReceipt?.procedimento || 'Procedimento Odontológico'}</strong>, realizado por <strong>${selectedReceipt?.dentista || 'Cirurgião-Dentista'}</strong>.
              </p>
              <div class="amount-section">
                <span class="amount-label">Valor Total Pago</span>
                <span class="amount-value">${formatCurrency(selectedReceipt?.valor || 0)}</span>
              </div>
            </div>
            <div class="signature-section">
              <div class="signature-line"></div>
              <p class="signature-text">${selectedReceipt?.dentista || clinicName}</p>
              <p style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Assinatura / Carimbo do Profissional</p>
            </div>
            <div class="footer">
              Documento comprobatório gerado eletronicamente por ${clinicName}.
            </div>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  // Custom Chart Tooltip
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-xl border border-slate-800 text-xs min-w-[210px] space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-slate-300 capitalize">{dataPoint.fullMonth} / {selectedYear}</span>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {dataPoint.count} registro(s)
            </span>
          </div>

          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-sky-500" />
                <span className="text-slate-400">Previsto:</span>
              </div>
              <span className="font-black text-sky-300 font-mono">{formatCurrency(dataPoint.previsto)}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                <span className="text-slate-400">Efetivamente Recebido:</span>
              </div>
              <span className="font-black text-emerald-400 font-mono">{formatCurrency(dataPoint.recebido)}</span>
            </div>

            {dataPoint.saldoEmAberto > 0 && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
                <span className="text-amber-400 font-medium">Saldo a Realizar:</span>
                <span className="font-bold text-amber-300 font-mono">{formatCurrency(dataPoint.saldoEmAberto)}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1 text-[11px]">
              <span className="text-slate-400">Taxa de Realização:</span>
              <span className={cn(
                "font-black font-mono",
                dataPoint.taxaRealizacao >= 80 ? "text-emerald-400" :
                dataPoint.taxaRealizacao >= 50 ? "text-amber-400" : "text-rose-400"
              )}>
                {dataPoint.taxaRealizacao}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Context Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-brand-cyan/10 text-brand-cyan flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Gestão Financeira & Faturamento
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Acompanhamento de fluxo de caixa, comparativo de receitas previstas vs. recebidas e controle de pagamentos.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Year Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ano:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-white text-xs font-black text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs outline-none cursor-pointer"
            >
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Dentist Filter */}
          {dentistList.length > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <User className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
              <select
                value={filterDentist}
                onChange={(e) => setFilterDentist(e.target.value)}
                className="bg-white text-xs font-bold text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs outline-none cursor-pointer max-w-[150px] truncate"
              >
                <option value="todos">Todos os Dentistas</option>
                {dentistList.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards: Faturamento do Ano Corrente */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Previsto no Ano */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-sky-300 transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Faturamento Previsto ({selectedYear})
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {formatCurrency(yearStats.totalPrevisto)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="font-semibold text-slate-700">Total planejado</span> em consultas e tratamentos
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-sky-500/30 group-hover:bg-sky-500 transition-colors" />
        </div>

        {/* Total Efetivamente Recebido no Ano */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
              Efetivamente Recebido ({selectedYear})
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">
            {formatCurrency(yearStats.totalRecebido)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="font-semibold text-emerald-700">Receita confirmada</span> em caixa no período
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
        </div>

        {/* Taxa de Realização / Conversão % */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-brand-cyan/40 transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Taxa de Realização ({selectedYear})
            </span>
            <div className="w-8 h-8 rounded-xl bg-brand-cyan/10 text-brand-cyan flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono flex items-baseline gap-1.5">
            {yearStats.taxaGlobal.toFixed(1)}%
            <span className="text-xs font-bold text-slate-400">do previsto</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 h-2 rounded-full mt-2.5 overflow-hidden">
            <div 
              className="bg-brand-cyan h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, yearStats.taxaGlobal))}%` }}
            />
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-cyan/30 group-hover:bg-brand-cyan transition-colors" />
        </div>

        {/* Saldo Pendente a Realizar */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
              Saldo a Realizar ({selectedYear})
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono">
            {formatCurrency(yearStats.saldoTotal)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="font-semibold text-amber-700">Pendente / Atrasado:</span> {formatCurrency(yearStats.totalPendente + yearStats.totalAtrasado)}
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500/30 group-hover:bg-amber-500 transition-colors" />
        </div>
      </div>

      {/* COMPARATIVE MONTH-BY-MONTH BAR CHART SECTION */}
      <section className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Comparativo de Faturamento Mês a Mês ({selectedYear})
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparação direta entre o <strong className="text-sky-600">Valor Previsto</strong> e o <strong className="text-emerald-600">Valor Efetivamente Recebido</strong> ao longo dos 12 meses.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View switcher: Chart vs Table */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setChartViewMode('chart')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                  chartViewMode === 'chart'
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Gráfico</span>
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode('table')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                  chartViewMode === 'table'
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Tabela Mensal</span>
              </button>
            </div>
          </div>
        </div>

        {/* Legend & Month Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 pb-2">
          {/* Custom Legend */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-md bg-sky-500 shadow-xs" />
              <span className="font-bold text-slate-700">Valor Previsto (R$)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-md bg-emerald-500 shadow-xs" />
              <span className="font-bold text-slate-700">Efetivamente Recebido (R$)</span>
            </div>
          </div>

          {/* Filter by Month quick buttons */}
          <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-full">
            <button
              type="button"
              onClick={() => setActiveMonthFilter(null)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap border",
                activeMonthFilter === null
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
              )}
            >
              Ano Todo
            </button>
            {MONTH_NAMES.map(m => {
              const isSelected = activeMonthFilter === m.index;
              const hasData = monthlyData[m.index]?.previsto > 0;
              return (
                <button
                  key={m.index}
                  type="button"
                  onClick={() => setActiveMonthFilter(isSelected ? null : m.index)}
                  className={cn(
                    "px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap border",
                    isSelected
                      ? "bg-brand-cyan text-white border-brand-cyan"
                      : hasData
                      ? "bg-sky-50 hover:bg-sky-100/80 text-sky-800 border-sky-200"
                      : "bg-slate-50/60 text-slate-400 border-transparent hover:border-slate-200"
                  )}
                  title={`${m.full}: Previsto ${formatCurrency(monthlyData[m.index]?.previsto || 0)} | Recebido ${formatCurrency(monthlyData[m.index]?.recebido || 0)}`}
                >
                  {m.short}
                </button>
              );
            })}
          </div>
        </div>

        {/* View Mode: Recharts Bar Chart */}
        {chartViewMode === 'chart' ? (
          <div className="w-full h-80 sm:h-96 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyData}
                margin={{ top: 20, right: 15, left: 10, bottom: 5 }}
                barGap={4}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomChartTooltip />} />
                
                {/* Bar: Previsto */}
                <Bar 
                  dataKey="previsto" 
                  name="Valor Previsto" 
                  fill="#0ea5e9" 
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                >
                  {monthlyData.map((entry, index) => (
                    <Cell 
                      key={`cell-previsto-${index}`} 
                      fill={activeMonthFilter === null || activeMonthFilter === entry.monthIndex ? '#0ea5e9' : '#cbd5e1'} 
                      opacity={activeMonthFilter === null || activeMonthFilter === entry.monthIndex ? 1 : 0.4}
                    />
                  ))}
                </Bar>

                {/* Bar: Recebido */}
                <Bar 
                  dataKey="recebido" 
                  name="Efetivamente Recebido" 
                  fill="#10b981" 
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                >
                  {monthlyData.map((entry, index) => (
                    <Cell 
                      key={`cell-recebido-${index}`} 
                      fill={activeMonthFilter === null || activeMonthFilter === entry.monthIndex ? '#10b981' : '#a7f3d0'} 
                      opacity={activeMonthFilter === null || activeMonthFilter === entry.monthIndex ? 1 : 0.4}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          /* View Mode: Analytical Table */
          <div className="overflow-x-auto pt-3">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                  <th className="py-3 px-4">Mês</th>
                  <th className="py-3 px-4 text-right">Valor Previsto</th>
                  <th className="py-3 px-4 text-right">Efetivamente Recebido</th>
                  <th className="py-3 px-4 text-right">Saldo a Realizar</th>
                  <th className="py-3 px-4 text-center">Taxa de Realização</th>
                  <th className="py-3 px-4 text-center">Status do Mês</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {monthlyData.map((m) => {
                  const isCurrent = new Date().getFullYear() === selectedYear && new Date().getMonth() === m.monthIndex;
                  return (
                    <tr 
                      key={m.monthIndex} 
                      className={cn(
                        "hover:bg-slate-50/80 transition-colors",
                        isCurrent && "bg-sky-50/40 font-medium"
                      )}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{m.fullMonth}</span>
                          {isCurrent && (
                            <span className="text-[9px] font-black uppercase tracking-widest bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded">
                              Mês Atual
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-sky-700">
                        {formatCurrency(m.previsto)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        {formatCurrency(m.recebido)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {formatCurrency(m.saldoEmAberto)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1 font-mono font-bold text-xs">
                          <span className={cn(
                            m.taxaRealizacao >= 80 ? "text-emerald-600" :
                            m.taxaRealizacao >= 50 ? "text-amber-600" : "text-slate-400"
                          )}>
                            {m.taxaRealizacao}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {m.previsto === 0 ? (
                          <span className="text-[10px] text-slate-400 font-semibold">Sem registros</span>
                        ) : m.saldoEmAberto === 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            100% Concretizado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <Clock className="w-3 h-3" />
                            Em Aberto
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50/90 font-bold text-xs border-t-2 border-slate-200">
                <tr>
                  <td className="py-3 px-4 uppercase text-[10px] font-black text-slate-700">Total Anual ({selectedYear})</td>
                  <td className="py-3 px-4 text-right font-mono text-sky-800">{formatCurrency(yearStats.totalPrevisto)}</td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-800">{formatCurrency(yearStats.totalRecebido)}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700">{formatCurrency(yearStats.saldoTotal)}</td>
                  <td className="py-3 px-4 text-center font-mono text-slate-900">{yearStats.taxaGlobal.toFixed(1)}%</td>
                  <td className="py-3 px-4 text-center text-[10px] text-slate-500">—</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* CONTROLE DETALHADO DE PAGAMENTOS / RECIBOS SECTION */}
      <section className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
        {/* Table Controls Header */}
        <div className="bg-slate-50/70 border-b border-slate-200/80 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-cyan" />
              <span>Controle Detalhado de Pagamentos & Recibos</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Visualização dos lançamentos individuais com atualização em tempo real do status de pagamento.
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar paciente ou procedimento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/20"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl text-xs font-bold px-3 py-1.5 text-slate-700 outline-none cursor-pointer"
            >
              <option value="todos">Todos os Status</option>
              <option value="Pago">Pago</option>
              <option value="Pendente">Pendente</option>
              <option value="Atrasado">Atrasado</option>
            </select>
          </div>
        </div>

        {/* Table of Records */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Paciente</th>
                <th className="px-4 py-3">Procedimento</th>
                <th className="px-4 py-3">Profissional</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-center">Status Pagamento</th>
                <th className="px-4 py-3 text-center">Recibo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-sans">
              {filteredRecords.length > 0 ? (
                filteredRecords.slice(0, 30).map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                      {r.data ? format(parseISO(r.data), "dd/MM/yyyy") : '—'}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {r.paciente}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.procedimento}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-[11px]">
                      {r.dentista}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-black text-slate-900">
                      {formatCurrency(r.valor)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <select
                        value={r.statusPagamento}
                        onChange={(e) => onUpdatePayment(r.id, e.target.value)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-bold outline-none cursor-pointer border transition-all",
                          r.statusPagamento === 'Pago' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          r.statusPagamento === 'Pendente' ? "bg-amber-50 text-amber-700 border-amber-200" :
                          "bg-rose-50 text-rose-700 border-rose-200"
                        )}
                      >
                        <option value="Pago">Pago</option>
                        <option value="Pendente">Pendente</option>
                        <option value="Atrasado">Atrasado</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedReceipt(r)}
                        disabled={r.statusPagamento !== 'Pago'}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-all",
                          r.statusPagamento === 'Pago'
                            ? "bg-sky-50 text-sky-700 hover:bg-sky-100 cursor-pointer border border-sky-200"
                            : "text-slate-300 pointer-events-none"
                        )}
                        title={r.statusPagamento === 'Pago' ? "Emitir e Imprimir Recibo" : "Disponível apenas após confirmação do pagamento"}
                      >
                        <Printer className="w-3 h-3" />
                        <span>Recibo</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-xs">
                    Nenhum lançamento financeiro encontrado com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* RECEIPT MODAL */}
      <AnimatePresence>
        {selectedReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReceipt(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10 border border-slate-100"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-brand-cyan/10 text-brand-cyan rounded-2xl">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Emissão de Recibo</h3>
                    <p className="text-xs text-slate-500">Documento comprobatório de quitação do tratamento</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="px-3.5 py-1.5 bg-brand-cyan hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir</span>
                  </button>
                  <button
                    onClick={() => setSelectedReceipt(null)}
                    className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Receipt Preview Body */}
              <div className="p-6 sm:p-8 max-h-[70vh] overflow-y-auto">
                <div id="receipt-content" className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xs">
                  <div className="flex justify-between items-center border-b-2 border-brand-cyan pb-4">
                    <div className="font-black text-xl text-brand-cyan tracking-tight">
                      {clinicName}
                    </div>
                    <div className="text-2xl font-black text-slate-900 tracking-wider">
                      RECIBO
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Paciente</p>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">{selectedReceipt.paciente}</p>
                      {patients.find(p => p.name === selectedReceipt.paciente)?.cpf && (
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          CPF: {patients.find(p => p.name === selectedReceipt.paciente)?.cpf}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Data do Pagamento</p>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">
                        {selectedReceipt.data ? format(parseISO(selectedReceipt.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Hoje'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Recebemos de <strong className="text-slate-900">{selectedReceipt.paciente}</strong> a quantia de <strong className="text-brand-cyan">{formatCurrency(selectedReceipt.valor)}</strong>, referente aos procedimentos odontológicos de <strong className="text-slate-900">{selectedReceipt.procedimento}</strong>, realizado por <strong className="text-slate-900">{selectedReceipt.dentista}</strong>.
                    </p>

                    <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor Quitado</span>
                      <span className="text-2xl font-black text-brand-cyan font-mono">{formatCurrency(selectedReceipt.valor)}</span>
                    </div>
                  </div>

                  <div className="pt-6 flex flex-col items-center text-center">
                    <div className="w-56 border-t-2 border-slate-300 mb-1.5" />
                    <p className="text-xs font-bold text-slate-800">{selectedReceipt.dentista}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Cirurgião-Dentista / Responsável</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
