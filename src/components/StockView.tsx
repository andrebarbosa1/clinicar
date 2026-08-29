import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Package, Plus, Search, Filter, AlertTriangle, ArrowDownRight,
  ArrowUpRight, History, Trash2, Edit2, ShieldAlert,
  Check, X, TrendingDown, DollarSign, Layers
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';

interface StockItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  priceUnit: number;
  supplier: string;
  location: string;
  lastUpdated: string;
}

interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: 'in' | 'out' | 'loss';
  quantity: number;
  date: string;
  reason: string;
  userName: string;
}

const DEFAULT_STOCK: StockItem[] = [
  { id: 'st-1', name: 'Luvas de Procedimento (M)', category: 'Descartáveis', quantity: 15, minQuantity: 5, unit: 'Caixas', priceUnit: 35.5, supplier: 'Dental Cremer', location: 'Armário A1', lastUpdated: new Date().toISOString() },
  { id: 'st-2', name: 'Máscaras Cirúrgicas Triplas', category: 'Descartáveis', quantity: 8, minQuantity: 10, unit: 'Caixas', priceUnit: 22.0, supplier: 'Dental Cremer', location: 'Armário A1', lastUpdated: new Date().toISOString() },
  { id: 'st-3', name: 'Anestésico Lidocaína 2%', category: 'Medicamentos', quantity: 4, minQuantity: 6, unit: 'Tubetes (Cx)', priceUnit: 85.0, supplier: 'DFL', location: 'Geladeira / Gaveta B', lastUpdated: new Date().toISOString() },
  { id: 'st-4', name: 'Resina Composta Z250 A2', category: 'Dentística', quantity: 12, minQuantity: 3, unit: 'Seringas', priceUnit: 95.0, supplier: '3M ESPE', location: 'Gaveteiro C2', lastUpdated: new Date().toISOString() },
  { id: 'st-5', name: 'Babador Descartável Odontológico', category: 'Descartáveis', quantity: 2, minQuantity: 4, unit: 'Pacotes', priceUnit: 28.0, supplier: 'Surya Dental', location: 'Armário A2', lastUpdated: new Date().toISOString() },
  { id: 'st-6', name: 'Álcool 70% 1L', category: 'Biossegurança', quantity: 10, minQuantity: 4, unit: 'Frascos', priceUnit: 9.5, supplier: 'Distribuidora Central', location: 'Almoxarifado', lastUpdated: new Date().toISOString() }
];

export function StockView({ currentUser }: { currentUser?: any }) {
  const [items, setItems] = useState<StockItem[]>(() => {
    const saved = localStorage.getItem('odonto_stock_items');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return DEFAULT_STOCK;
  });

  const [movements, setMovements] = useState<StockMovement[]>(() => {
    const saved = localStorage.getItem('odonto_stock_movements');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('odonto_stock_items', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('odonto_stock_movements', JSON.stringify(movements));
  }, [movements]);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [selectedItemForMove, setSelectedItemForMove] = useState<StockItem | null>(null);
  const [movementType, setMovementType] = useState<'in' | 'out' | 'loss'>('in');
  const [movementQuantity, setMovementQuantity] = useState('');
  const [movementReason, setMovementReason] = useState('Consumo rotina clínica');
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [activeTab, setActiveTab] = useState<'items' | 'history'>('items');

  const [formData, setFormData] = useState({
    name: '',
    category: 'Descartáveis',
    quantity: '',
    minQuantity: '',
    unit: 'Unidades',
    priceUnit: '',
    supplier: '',
    location: ''
  });

  const lowStockCount = useMemo(() => items.filter(i => i.quantity <= i.minQuantity).length, [items]);
  const totalStockValue = useMemo(() => items.reduce((acc, i) => acc + (i.quantity * i.priceUnit), 0), [items]);
  const categories = useMemo(() => ['Todos', ...Array.from(new Set(items.map(i => i.category)))], [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'Todos' || item.category === categoryFilter;
      let matchesStatus = true;
      if (statusFilter === 'Baixo') matchesStatus = item.quantity <= item.minQuantity;
      if (statusFilter === 'Adequado') matchesStatus = item.quantity > item.minQuantity;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, searchTerm, categoryFilter, statusFilter]);

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingItem) {
      setItems(items.map(i => i.id === editingItem.id ? {
        ...i,
        name: formData.name.trim(),
        category: formData.category,
        quantity: Math.max(0, parseInt(formData.quantity) || 0),
        minQuantity: Math.max(0, parseInt(formData.minQuantity) || 0),
        unit: formData.unit,
        priceUnit: Math.max(0, parseFloat(formData.priceUnit) || 0),
        supplier: formData.supplier.trim() || 'Não especificado',
        location: formData.location.trim() || 'Almoxarifado',
        lastUpdated: new Date().toISOString()
      } : i));
    } else {
      const newItem: StockItem = {
        id: `st-${Date.now()}`,
        name: formData.name.trim(),
        category: formData.category,
        quantity: Math.max(0, parseInt(formData.quantity) || 0),
        minQuantity: Math.max(0, parseInt(formData.minQuantity) || 0),
        unit: formData.unit,
        priceUnit: Math.max(0, parseFloat(formData.priceUnit) || 0),
        supplier: formData.supplier.trim() || 'Não especificado',
        location: formData.location.trim() || 'Almoxarifado',
        lastUpdated: new Date().toISOString()
      };
      setItems([newItem, ...items]);
    }

    setIsItemModalOpen(false);
    setEditingItem(null);
    setFormData({ name: '', category: 'Descartáveis', quantity: '', minQuantity: '', unit: 'Unidades', priceUnit: '', supplier: '', location: '' });
  };

  const handleApplyMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForMove) return;
    const qty = Math.max(1, parseInt(movementQuantity) || 1);

    let newQty = selectedItemForMove.quantity;
    if (movementType === 'in') {
      newQty += qty;
    } else {
      newQty = Math.max(0, newQty - qty);
    }

    setItems(items.map(i => i.id === selectedItemForMove.id ? { ...i, quantity: newQty, lastUpdated: new Date().toISOString() } : i));

    const newMov: StockMovement = {
      id: `mov-${Date.now()}`,
      itemId: selectedItemForMove.id,
      itemName: selectedItemForMove.name,
      type: movementType,
      quantity: qty,
      date: new Date().toISOString(),
      reason: movementReason,
      userName: currentUser?.name || currentUser?.username || 'Profissional'
    };
    setMovements([newMov, ...movements]);

    setIsMovementModalOpen(false);
    setSelectedItemForMove(null);
    setMovementQuantity('');
  };

  const handleDeleteItem = (id: string) => {
    if (window.confirm('Tem certeza de que deseja remover este item do estoque?')) {
      setItems(items.filter(i => i.id !== id));
    }
  };

  const openEditModal = (item: StockItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      quantity: String(item.quantity),
      minQuantity: String(item.minQuantity),
      unit: item.unit,
      priceUnit: String(item.priceUnit),
      supplier: item.supplier,
      location: item.location
    });
    setIsItemModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 flex items-center gap-2.5">
            <Package className="w-7 h-7 text-brand-cyan" />
            Controle de Estoque & Insumos
          </h1>
          <p className="text-xs text-slate-500 font-medium">Gerencie materiais, níveis mínimos e histórico de movimentações</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingItem(null);
              setFormData({ name: '', category: 'Descartáveis', quantity: '', minQuantity: '', unit: 'Unidades', priceUnit: '', supplier: '', location: '' });
              setIsItemModalOpen(true);
            }}
            className="px-4 py-2.5 bg-brand-cyan hover:bg-brand-cyan/90 text-slate-900 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-brand-cyan/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Novo Material
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center text-brand-cyan">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total de Itens Cadastrados</p>
            <p className="text-2xl font-black text-slate-800">{items.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${lowStockCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Alertas de Estoque Crítico</p>
            <p className={`text-2xl font-black ${lowStockCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{lowStockCount} itens</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Valor Estimado em Estoque</p>
            <p className="text-2xl font-black text-slate-800">{formatCurrency(totalStockValue)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('items')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'items' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Materiais ({items.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'history' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Histórico ({movements.length})
            </button>
          </div>

          {activeTab === 'items' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar material, fornecedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-brand-cyan w-48 sm:w-60"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
              >
                <option value="Todos">Todos Níveis</option>
                <option value="Baixo">Apenas Baixo / Crítico</option>
                <option value="Adequado">Estoque Adequado</option>
              </select>
            </div>
          )}
        </div>

        {activeTab === 'items' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Material</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4 text-center">Qtd Atual</th>
                  <th className="py-3 px-4 text-center">Mínimo</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Valor Unit.</th>
                  <th className="py-3 px-4">Localização</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-medium text-slate-700">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400 font-bold">
                      Nenhum material encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isLow = item.quantity <= item.minQuantity;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-800">{item.name}</td>
                        <td className="py-3.5 px-4"><span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">{item.category}</span></td>
                        <td className="py-3.5 px-4 text-center font-black text-sm text-slate-900">{item.quantity} <span className="text-[10px] text-slate-400 font-normal">{item.unit}</span></td>
                        <td className="py-3.5 px-4 text-center text-slate-400 font-bold">{item.minQuantity} {item.unit}</td>
                        <td className="py-3.5 px-4">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertTriangle className="w-3 h-3" /> Crítico
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Normal
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-bold">{formatCurrency(item.priceUnit)}</td>
                        <td className="py-3.5 px-4 text-slate-500">{item.location}</td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedItemForMove(item);
                                setMovementType('in');
                                setIsMovementModalOpen(true);
                              }}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors title='Entrada de Estoque'"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedItemForMove(item);
                                setMovementType('out');
                                setIsMovementModalOpen(true);
                              }}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors title='Saída de Estoque'"
                            >
                              <ArrowDownRight className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Material</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4 text-center">Qtd</th>
                  <th className="py-3 px-4">Motivo</th>
                  <th className="py-3 px-4">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-medium text-slate-700">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400 font-bold">
                      Nenhuma movimentação registrada até o momento.
                    </td>
                  </tr>
                ) : (
                  movements.map((mov) => (
                    <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-slate-500">{new Date(mov.date).toLocaleString('pt-BR')}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{mov.itemName}</td>
                      <td className="py-3 px-4">
                        {mov.type === 'in' && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded-full">Entrada</span>}
                        {mov.type === 'out' && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-bold text-[10px] rounded-full">Saída</span>}
                        {mov.type === 'loss' && <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-bold text-[10px] rounded-full">Perda/Avaria</span>}
                      </td>
                      <td className="py-3 px-4 text-center font-black">{mov.quantity}</td>
                      <td className="py-3 px-4 text-slate-600">{mov.reason}</td>
                      <td className="py-3 px-4 text-slate-500 font-bold">{mov.userName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Item */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">{editingItem ? 'Editar Material' : 'Novo Material'}</h3>
              <button onClick={() => setIsItemModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveItem} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Nome do Material *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Luvas de Procedimento (M)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-brand-cyan"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Categoria</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="Descartáveis">Descartáveis</option>
                    <option value="Dentística">Dentística</option>
                    <option value="Endodontia">Endodontia</option>
                    <option value="Ortodontia">Ortodontia</option>
                    <option value="Cirurgia">Cirurgia</option>
                    <option value="Medicamentos">Medicamentos</option>
                    <option value="Biossegurança">Biossegurança</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Unidade de Medida</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="Caixas, Unidades, Seringas"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Qtd Inicial</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="0"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Qtd Mínima</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minQuantity}
                    onChange={(e) => setFormData({ ...formData, minQuantity: e.target.value })}
                    placeholder="5"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Preço Unit. (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.priceUnit}
                    onChange={(e) => setFormData({ ...formData, priceUnit: e.target.value })}
                    placeholder="0.00"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Fornecedor Principal</label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="Ex: Dental Cremer"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Localização / Armário</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Ex: Armário A1"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsItemModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-brand-cyan rounded-xl transition-all">
                  Salvar Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Movimentação */}
      {isMovementModalOpen && selectedItemForMove && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Movimentação de Estoque</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{selectedItemForMove.name}</p>
              </div>
              <button onClick={() => setIsMovementModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleApplyMovement} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Tipo de Movimentação</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMovementType('in')}
                    className={`py-2 text-xs font-black rounded-xl border transition-all ${
                      movementType === 'in' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    + Entrada
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementType('out')}
                    className={`py-2 text-xs font-black rounded-xl border transition-all ${
                      movementType === 'out' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    - Saída
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementType('loss')}
                    className={`py-2 text-xs font-black rounded-xl border transition-all ${
                      movementType === 'loss' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Perda
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Quantidade ({selectedItemForMove.unit}) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={movementQuantity}
                  onChange={(e) => setMovementQuantity(e.target.value)}
                  placeholder="Ex: 2"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-brand-cyan"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Motivo / Observação</label>
                <input
                  type="text"
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  placeholder="Ex: Reposição de estoque semanal"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsMovementModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-brand-cyan rounded-xl transition-all">
                  Confirmar Movimentação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default StockView;
