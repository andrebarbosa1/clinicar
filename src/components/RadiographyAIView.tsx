/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Scan, 
  Upload, 
  Sparkles, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Contrast, 
  Sun, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  ShieldAlert, 
  Layers, 
  Printer, 
  Share2, 
  User, 
  Calendar, 
  Brain, 
  Info,
  ChevronRight,
  Eye,
  RefreshCw,
  Sliders,
  Check,
  Download
} from 'lucide-react';
import { cn } from '../lib/utils';

interface RadiographyAIViewProps {
  currentUser?: any;
  patients: any[];
  onSaveToPatientRecord?: (patientId: string, analysisData: any) => void;
  onOpenTreatmentPlanModal?: (patientData: any) => void;
}

// Sample clinical sample radiographs for instant demonstration
const PRELOADED_SAMPLES = [
  {
    id: 'sample_panoramic',
    name: 'Panorâmica Digital - Terceiros Molares & Inclusão',
    type: 'Panorâmica',
    region: 'Arcada Completa',
    patientAge: '26 anos',
    notes: 'Avaliação pré-ortodôntica e queixa de dor no quadrante inferior direito.',
    imageUrl: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'sample_periapical',
    name: 'Periapical Digital - Dente 36 (Lesão Periapical)',
    type: 'Periapical',
    region: 'Região Molar Inferior Esquerda',
    patientAge: '42 anos',
    notes: 'Sensibilidade à percussão mastigatória e histórico de restauração profunda antiga.',
    imageUrl: 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'sample_bitewing',
    name: 'Interproximal (Bite-wing) - Triagem de Cáries Ocultas',
    type: 'Bite-wing',
    region: 'Pré-molares e Molares Superiores/Inferiores',
    patientAge: '31 anos',
    notes: 'Check-up de rotina para busca de lesões de cárie em ponto de contato.',
    imageUrl: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=800&q=80'
  }
];

export default function RadiographyAIView({ currentUser, patients, onSaveToPatientRecord, onOpenTreatmentPlanModal }: RadiographyAIViewProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(PRELOADED_SAMPLES[0].imageUrl);
  const [examType, setExamType] = useState<string>('Panorâmica');
  const [region, setRegion] = useState<string>('Arcada Completa');
  const [patientAge, setPatientAge] = useState<string>('26');
  const [clinicalNotes, setClinicalNotes] = useState<string>('Avaliação para planejamento odontológico.');
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || '');
  
  // Image Viewer Visual Controls
  const [zoom, setZoom] = useState<number>(1);
  const [invertColors, setInvertColors] = useState<boolean>(false);
  const [contrastLevel, setContrastLevel] = useState<number>(100);
  const [brightnessLevel, setBrightnessLevel] = useState<number>(100);
  const [filterMode, setFilterMode] = useState<'normal' | 'bone_dense' | 'edge_enhance'>('normal');

  // AI Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione um arquivo de imagem válido (JPG, PNG ou DICOM exportado).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSelectedImage(event.target.result as string);
        setAnalysisResult(null);
        setError(null);
        setSavedSuccess(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectSample = (sample: typeof PRELOADED_SAMPLES[0]) => {
    setSelectedImage(sample.imageUrl);
    setExamType(sample.type);
    setRegion(sample.region);
    setPatientAge(sample.patientAge.replace(/\D/g, ''));
    setClinicalNotes(sample.notes);
    setAnalysisResult(null);
    setError(null);
    setSavedSuccess(false);
  };

  const runAiAnalysis = async () => {
    if (!selectedImage) {
      setError('Faça o upload ou selecione um exame radiográfico primeiro.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setSavedSuccess(false);

    try {
      const response = await fetch('/api/ai/analyze-radiography', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: selectedImage,
          examType,
          patientAge,
          region,
          clinicalNotes
        })
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Falha ao processar análise radiográfica.');
      }

      setAnalysisResult(data.analysis);
    } catch (err: any) {
      console.error("AI Analysis Error:", err);
      setError(err.message || 'Erro ao conectar ao motor de IA.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleSaveToRecord = () => {
    if (!selectedPatientId) {
      setError('Selecione um paciente para vincular o laudo.');
      return;
    }
    if (onSaveToPatientRecord && analysisResult) {
      onSaveToPatientRecord(selectedPatientId, {
        type: 'Laudo Radiográfico IA',
        examType,
        region,
        date: new Date().toISOString(),
        analysis: analysisResult,
        imageSnapshot: selectedImage
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl px-4 py-2.5 text-white shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
              <Scan className="w-5 h-5 text-cyan-400" />
              <span>Leitura Inteligente de Radiografias & Exames (IA)</span>
            </h1>
            <span className="text-xs text-slate-500 font-semibold">•</span>
            <span className="text-xs text-cyan-300 font-medium">
              Visão Computacional Gemini
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              Upload de Exame
            </button>
            <button
              onClick={runAiAnalysis}
              disabled={isAnalyzing || !selectedImage}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer",
                isAnalyzing
                  ? "bg-slate-700 opacity-60 cursor-not-allowed"
                  : "bg-gradient-to-r from-brand-cyan to-cyan-500 hover:from-cyan-500 hover:to-brand-cyan active:scale-95"
              )}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Brain className="w-3.5 h-3.5 text-white" />
                  Analisar com IA
                </>
              )}
            </button>
          </div>
        </div>

        <input 
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Preloaded Samples Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <Layers className="w-4 h-4 text-brand-cyan" />
          <span>Casos Clínicos Pré-carregados para Demonstração:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRELOADED_SAMPLES.map((sample) => (
            <button
              key={sample.id}
              onClick={() => handleSelectSample(sample)}
              className={cn(
                "text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer",
                selectedImage === sample.imageUrl
                  ? "bg-brand-cyan/10 border-brand-cyan text-brand-cyan font-bold"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
              )}
            >
              {sample.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Radiograph Viewer on Left, AI Report & Controls on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive Radiograph Stage */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl p-4 overflow-hidden relative flex flex-col min-h-[480px]">
            
            {/* Viewer Control Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800 text-slate-300 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-slate-200 uppercase text-[10px] tracking-wider">Visualizador DICOM / Digital</span>
                <span className="text-slate-500 text-[10px]">({examType} - {region})</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setZoom(prev => Math.max(0.6, prev - 0.2))}
                  title="Diminuir Zoom"
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-mono px-1 text-slate-400">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={() => setZoom(prev => Math.min(2.5, prev + 0.2))}
                  title="Aumentar Zoom"
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-slate-800 mx-1" />
                <button
                  onClick={() => setInvertColors(prev => !prev)}
                  title="Inverter Cores (Negativo)"
                  className={cn(
                    "p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-semibold",
                    invertColors ? "bg-cyan-500 text-slate-950 font-bold" : "bg-slate-900 hover:bg-slate-800 text-slate-300"
                  )}
                >
                  <Contrast className="w-3.5 h-3.5" />
                  Inverter
                </button>
                <button
                  onClick={() => {
                    setZoom(1);
                    setInvertColors(false);
                    setContrastLevel(100);
                    setBrightnessLevel(100);
                    setFilterMode('normal');
                  }}
                  title="Resetar Ajustes"
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Stage Canvas */}
            <div className="flex-1 flex items-center justify-center relative overflow-hidden rounded-2xl bg-black min-h-[360px]">
              {selectedImage ? (
                <div 
                  className="transition-transform duration-150 ease-out flex items-center justify-center"
                  style={{
                    transform: `scale(${zoom})`,
                    filter: `
                      ${invertColors ? 'invert(100%)' : ''} 
                      contrast(${contrastLevel}%) 
                      brightness(${brightnessLevel}%)
                      ${filterMode === 'edge_enhance' ? 'drop-shadow(0 0 2px #38bdf8)' : ''}
                    `
                  }}
                >
                  <img 
                    src={selectedImage} 
                    alt="Radiografia Odontológica" 
                    className="max-h-[440px] w-auto object-contain rounded-lg select-none"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="text-center p-8 text-slate-500">
                  <Scan className="w-12 h-12 mx-auto mb-3 opacity-40 text-cyan-400" />
                  <p className="text-sm font-semibold">Nenhum exame carregado</p>
                  <p className="text-xs text-slate-600 mt-1">Selecione um caso de exemplo acima ou faça o upload de uma imagem.</p>
                </div>
              )}

              {/* Scanning Overlay Animation during AI Analysis */}
              {isAnalyzing && (
                <div className="absolute inset-0 bg-cyan-950/40 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 z-30">
                  <div className="w-16 h-16 rounded-2xl bg-brand-cyan/20 border border-brand-cyan/40 flex items-center justify-center animate-pulse">
                    <Brain className="w-8 h-8 text-cyan-300 animate-bounce" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-white tracking-wide">Gemini Vision em Execução</p>
                    <p className="text-xs text-cyan-200">Segmentando coroas, ápices e suporte ósseo...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Filter Radiographic Sliders */}
            <div className="pt-3 mt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 gap-3 text-[10px] text-slate-400">
              <div>
                <label className="block mb-1 font-semibold flex items-center justify-between">
                  <span>Contraste</span>
                  <span className="text-cyan-400">{contrastLevel}%</span>
                </label>
                <input 
                  type="range" 
                  min="50" 
                  max="200" 
                  value={contrastLevel}
                  onChange={(e) => setContrastLevel(parseInt(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>
              <div>
                <label className="block mb-1 font-semibold flex items-center justify-between">
                  <span>Brilho</span>
                  <span className="text-cyan-400">{brightnessLevel}%</span>
                </label>
                <input 
                  type="range" 
                  min="50" 
                  max="180" 
                  value={brightnessLevel}
                  onChange={(e) => setBrightnessLevel(parseInt(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>
              <div className="col-span-2 sm:col-span-1 flex items-end gap-1.5">
                <button
                  onClick={() => setFilterMode(prev => prev === 'edge_enhance' ? 'normal' : 'edge_enhance')}
                  className={cn(
                    "w-full py-1.5 px-2 rounded-lg border text-[10px] font-bold transition-all cursor-pointer",
                    filterMode === 'edge_enhance'
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  )}
                >
                  Realce de Bordas
                </button>
              </div>
            </div>
          </div>

          {/* Exam Context Configuration */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-brand-cyan" />
              Parâmetros Clínicos da Análise
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Tipo de Exame</label>
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-brand-cyan/20"
                >
                  <option value="Panorâmica">Panorâmica Digital</option>
                  <option value="Periapical">Periapical Completa</option>
                  <option value="Bite-wing">Interproximal (Bite-wing)</option>
                  <option value="Tomografia Cone Beam">Tomografia Cone Beam (TCFC)</option>
                  <option value="Fotografia Intraoral">Fotografia Clínica Intraoral</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Região Anatômica</label>
                <input 
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="Ex: Arcada Geral, Dente 36..."
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-brand-cyan/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Idade do Paciente</label>
                <input 
                  type="number"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  placeholder="Ex: 34"
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-brand-cyan/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Observações & Histórico Clínico</label>
              <textarea
                rows={2}
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Ex: Paciente relata dor à mastigação em molares inferiores esquerdos..."
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-brand-cyan/20 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Right Column: AI Analysis Report Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-lg flex flex-col h-full justify-between">
            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-cyan to-cyan-400 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Laudo Radiográfico Inteligente</h3>
                    <p className="text-xs text-slate-500">Geração automatizada por IA Multimodal</p>
                  </div>
                </div>

                {analysisResult?.urgencyLevel && (
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                    analysisResult.urgencyLevel === 'Alta' || analysisResult.urgencyLevel === 'Urgente'
                      ? "bg-rose-100 text-rose-700 border border-rose-200"
                      : analysisResult.urgencyLevel === 'Média'
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  )}>
                    Prioridade {analysisResult.urgencyLevel}
                  </span>
                )}
              </div>

              {error && (
                <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              {/* Analysis Content */}
              {analysisResult ? (
                <div className="space-y-4 mt-4">
                  {/* Summary Box */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Síntese do Diagnóstico Radiológico</span>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {analysisResult.summary}
                    </p>
                  </div>

                  {/* Identified Pathologies / Findings */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                      Achados & Elementos Dentários Identificados ({analysisResult.findings?.length || 0})
                    </span>
                    
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {analysisResult.findings?.map((finding: any, idx: number) => (
                        <div 
                          key={idx}
                          className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex items-start justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-slate-900">{finding.tooth}</span>
                              <span className={cn(
                                "text-[9px] font-bold px-1.5 py-0.5 rounded-md",
                                finding.category === 'Cárie' ? "bg-amber-100 text-amber-800" :
                                finding.category === 'Endodôntico' ? "bg-rose-100 text-rose-800" :
                                finding.category === 'Incluso/Impactado' ? "bg-purple-100 text-purple-800" :
                                "bg-slate-100 text-slate-700"
                              )}>
                                {finding.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-1 leading-snug">{finding.description}</p>
                          </div>

                          {finding.severity && (
                            <span className={cn(
                              "text-[9px] font-bold shrink-0 px-1.5 py-0.5 rounded-sm",
                              finding.severity === 'Severa' ? "text-rose-600 bg-rose-50" :
                              finding.severity === 'Moderada' ? "text-amber-600 bg-amber-50" :
                              "text-slate-500 bg-slate-100"
                            )}>
                              {finding.severity}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bone Level & Pre-existing */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-cyan-50/50 border border-cyan-100">
                      <span className="text-[9px] font-bold uppercase text-cyan-800 block mb-0.5">Suporte Ósseo Alveolar</span>
                      <p className="text-[11px] text-slate-700 leading-snug">{analysisResult.boneLevel}</p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[9px] font-bold uppercase text-slate-500 block mb-0.5">Tratamentos Anteriores</span>
                      <p className="text-[11px] text-slate-700 leading-snug">
                        {analysisResult.previousTreatments?.length > 0 
                          ? analysisResult.previousTreatments.join(', ')
                          : 'Nenhum tratamento prévio significativo identificado.'}
                      </p>
                    </div>
                  </div>

                  {/* Recommended Procedures */}
                  {analysisResult.recommendedProcedures?.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                        Procedimentos Clínicos Sugeridos
                      </span>
                      <div className="space-y-1">
                        {analysisResult.recommendedProcedures.map((proc: any, pIdx: number) => (
                          <div key={pIdx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs">
                            <span className="font-bold text-slate-800">{proc.procedure}</span>
                            <span className="text-[10px] font-semibold text-slate-500">{proc.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Disclaimer */}
                  <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/60 flex items-start gap-2 text-[10px] text-amber-800 leading-relaxed">
                    <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>{analysisResult.disclaimer}</span>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <Brain className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
                  <h4 className="text-sm font-bold text-slate-700">Aguardando Execução da IA</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed">
                    Clique no botão superior <strong>"Analisar com Gemini IA"</strong> para iniciar a varredura e detecção dos elementos radiográficos.
                  </p>
                </div>
              )}
            </div>

            {/* Actions & Linking to Patient */}
            {analysisResult && (
              <div className="pt-4 mt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="flex-1 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800"
                  >
                    <option value="">Selecione o paciente para vincular laudo...</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.name} {p.cpf ? `(${p.cpf})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveToRecord}
                    className="flex-1 py-2.5 rounded-xl bg-brand-cyan hover:bg-cyan-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Salvar no Prontuário
                  </button>

                  {onOpenTreatmentPlanModal && (
                    <button
                      onClick={() => {
                        const targetPat = patients.find(p => p.id === selectedPatientId);
                        onOpenTreatmentPlanModal({
                          patientName: targetPat?.name || 'Paciente',
                          clinicalFindings: `${analysisResult.summary} | Achados: ${analysisResult.findings?.map((f: any) => `${f.tooth}: ${f.description}`).join('; ')}`
                        });
                      }}
                      className="px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
                      title="Gerar Plano de Tratamento Inteligente"
                    >
                      <Brain className="w-4 h-4" />
                      <span>Gerar Plano IA</span>
                    </button>
                  )}

                  <button
                    onClick={handlePrintReport}
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center transition-all cursor-pointer"
                    title="Imprimir / Exportar Laudo em PDF"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>

                {savedSuccess && (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs font-bold text-emerald-700 flex items-center justify-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    Laudo e radiografia vinculados com sucesso ao prontuário!
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
