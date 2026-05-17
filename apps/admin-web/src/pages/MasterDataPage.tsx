import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save,
  Search,
  Edit3,
  Trash2,
  RotateCcw,
  ShieldCheck,
  XCircle,
  Eye,
} from 'lucide-react';
import { Button, Card, Input } from '@amaravathi/shared-ui';
import { api, endpoints } from '../lib/api';
import { ViewDetailsModal } from '../components/ViewDetailsModal';
import { useNotification } from '../components/NotificationContext';

// --------------------------------------------------------
// 1. Leaf Categories Page (No Price Field)
// --------------------------------------------------------
export const LeafCategoriesPage = () => {
  const queryClient = useQueryClient();
  const { showToast, showError, confirm } = useNotification();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'deleted'>('all');
  const [viewingCategory, setViewingCategory] = useState<any | null>(null);

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ name: string; email: string; role: string }>('/auth/me'),
  });
  const isAdmin = me?.role === 'admin';
  const canEdit = me?.role === 'admin' || me?.role === 'pricing_manager';

  const { data, isLoading } = useQuery({
    queryKey: [endpoints.leafCategories, searchQuery, statusFilter],
    queryFn: () =>
      api<{ items: any[] }>(`${endpoints.leafCategories}?q=${encodeURIComponent(searchQuery)}&status=${statusFilter}&sortBy=name&sortOrder=asc`),
  });
  const items = data?.items ?? [];

  const saveMutation = useMutation({
    mutationFn: (payload: any) => editingId
      ? api(`${endpoints.leafCategories}/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) })
      : api(endpoints.leafCategories, { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      resetForm();
      queryClient.invalidateQueries({ queryKey: [endpoints.leafCategories] });
      showToast('Leaf Category saved successfully!', 'success');
    },
    onError: (err: any) => {
      showError(err);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`${endpoints.leafCategories}/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoints.leafCategories] });
      showToast('Leaf Category deleted successfully!', 'success');
    },
    onError: (err: any) => {
      showError(err);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => api(`${endpoints.leafCategories}/${id}/restore`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoints.leafCategories] });
      showToast('Leaf Category restored successfully!', 'success');
    },
    onError: (err: any) => {
      showError(err);
    },
  });

  const resetForm = () => {
    setName('');
    setDescription('');
    setActive(true);
    setEditingId(null);
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setName(item.name);
    setDescription(item.description ?? '');
    setActive(item.active);
  };

  const handleRestore = async (id: string) => {
    const confirmed = await confirm({
      title: 'Restore Leaf Category',
      message: 'Are you sure you want to restore this leaf category?',
    });
    if (confirmed) {
      restoreMutation.mutate(id);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Leaf Category',
      message: 'Are you sure you want to delete this leaf category?',
      variant: 'danger',
    });
    if (confirmed) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    saveMutation.mutate({ name: name.trim(), description: description.trim(), active });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <Card className="h-max p-5 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col gap-4">
        <h3 className="text-lg font-bold text-slate-800">{editingId ? 'Edit Leaf Category' : 'Add Leaf Category'}</h3>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            <span>Name</span>
            <Input type="text" placeholder="e.g. Royal Gold" value={name} onChange={(e) => setName(e.target.value)} required disabled={!canEdit} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            <span>Description</span>
            <textarea className="min-h-20 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" placeholder="Enter description..." value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canEdit} />
          </label>
          <div className="flex items-center justify-between text-sm font-medium text-slate-700">
            <span>Status</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} disabled={!canEdit} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              <span className="ml-2 text-slate-600">{active ? 'Active' : 'Inactive'}</span>
            </label>
          </div>
          {saveMutation.error && <p className="text-sm text-red-600 font-medium">{(saveMutation.error as any).message}</p>}
          <div className="flex gap-2 mt-2">
            {editingId && <Button type="button" onClick={resetForm} variant="secondary" className="flex-1 h-10 text-sm font-medium">Cancel</Button>}
            <Button type="submit" variant="add" className="flex-1 h-10 text-sm font-medium" disabled={saveMutation.isPending || !canEdit}>
              <Save className="h-4 w-4 text-current" />
              <span>{editingId ? 'Update' : 'Save'}</span>
            </Button>
          </div>
        </form>
      </Card>
      
      <Card className="min-w-0 p-5 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Leaf Category Records</h3>
            <p className="text-xs text-slate-400">Total blended settings and adjustment prices</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs font-semibold text-slate-600">
              {(['all', 'active', 'inactive', 'deleted'] as const).map((status) => (
                <button key={status} onClick={() => setStatusFilter(status)} className={`px-3 py-1.5 rounded-md transition-all ${statusFilter === status ? 'bg-white text-emerald-700 shadow-sm' : 'hover:text-slate-900'}`}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
            <div className="relative flex items-center">
              <Search className="absolute left-3 text-slate-400 pointer-events-none" size={16} />
              <Input className="pl-9 h-9 text-sm font-normal w-full sm:max-w-xs" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="overflow-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide">Description</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide text-center">Status</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic text-sm">Loading records...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic text-sm">No records found matching filters.</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-700">{item.name}</td>
                    <td className="px-4 py-3 text-sm font-normal text-slate-500 max-w-xs truncate">{item.description || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      {item.deletedAt ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700"><XCircle size={12} /> Deleted</span>
                      ) : item.active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700"><ShieldCheck size={12} /> Active</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {item.deletedAt ? (
                          <button type="button" onClick={() => handleRestore(item.id)} disabled={!isAdmin} className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600"><RotateCcw size={14} /></button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setViewingCategory(item)}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 transition-colors"
                              title="View details"
                            >
                              <Eye size={14} />
                            </button>
                            <button type="button" onClick={() => handleEdit(item)} disabled={!canEdit} className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-slate-50 text-slate-500"><Edit3 size={14} /></button>
                            <button type="button" onClick={() => handleDelete(item.id)} disabled={!isAdmin} className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-slate-50 text-slate-500"><Trash2 size={14} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {viewingCategory && (
        <ViewDetailsModal
          title={viewingCategory.name}
          subtitle="Leaf Category Details"
          onClose={() => setViewingCategory(null)}
          fields={[
            {
              label: 'Category Name',
              value: viewingCategory.name,
            },
            {
              label: 'Description',
              value: viewingCategory.description || '—',
            },
            {
              label: 'Status',
              value: viewingCategory.deletedAt ? 'Deleted' : viewingCategory.active ? 'Active' : 'Inactive',
              type: 'badge',
              badgeColor: viewingCategory.deletedAt ? 'red' : viewingCategory.active ? 'green' : 'slate',
            },
          ]}
        />
      )}
    </div>
  );
};

// --------------------------------------------------------
// 2. Cutting Types Page (With Leaf Category Link & Base Price)
// --------------------------------------------------------
export const CuttingTypesPage = () => {
  const queryClient = useQueryClient();
  const { showToast, showError, confirm } = useNotification();
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  const [name, setName] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [leafCategoryId, setLeafCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'deleted'>('all');
  const [viewingCuttingType, setViewingCuttingType] = useState<any | null>(null);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => api<{ role: string }>('/auth/me') });
  const isAdmin = me?.role === 'admin';
  const canEdit = me?.role === 'admin' || me?.role === 'pricing_manager';

  // Fetch Leaves for dropdown
  const { data: leafData } = useQuery({
    queryKey: [endpoints.leafCategories],
    queryFn: () => api<{ items: any[] }>(`${endpoints.leafCategories}?status=active&limit=100`),
  });
  const leafCategories = leafData?.items ?? [];

  const { data, isLoading } = useQuery({
    queryKey: [endpoints.cuttingTypes, searchQuery, statusFilter],
    queryFn: () =>
      api<{ items: any[] }>(`${endpoints.cuttingTypes}?q=${encodeURIComponent(searchQuery)}&status=${statusFilter}&sortBy=name&sortOrder=asc`),
  });
  const items = data?.items ?? [];

  const saveMutation = useMutation({
    mutationFn: (payload: any) => editingId
      ? api(`${endpoints.cuttingTypes}/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) })
      : api(endpoints.cuttingTypes, { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      resetForm();
      queryClient.invalidateQueries({ queryKey: [endpoints.cuttingTypes] });
      showToast('Cutting Type saved successfully!', 'success');
    },
    onError: (err: any) => {
      showError(err);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`${endpoints.cuttingTypes}/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoints.cuttingTypes] });
      showToast('Cutting Type deleted successfully!', 'success');
    },
    onError: (err: any) => {
      showError(err);
    },
  });
  
  const restoreMutation = useMutation({
    mutationFn: (id: string) => api(`${endpoints.cuttingTypes}/${id}/restore`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoints.cuttingTypes] });
      showToast('Cutting Type restored successfully!', 'success');
    },
    onError: (err: any) => {
      showError(err);
    },
  });

  const resetForm = () => {
    setName('');
    setBasePrice('');
    setLeafCategoryId('');
    setDescription('');
    setActive(true);
    setEditingId(null);
    setFormErrors({});
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setName(item.name);
    setBasePrice(String(item.basePrice ?? ''));
    setLeafCategoryId(typeof item.leafCategoryId === 'object' ? item.leafCategoryId?.id || '' : item.leafCategoryId || '');
    setDescription(item.description ?? '');
    setActive(item.active);
    setFormErrors({});
  };

  const handleRestore = async (id: string) => {
    const confirmed = await confirm({
      title: 'Restore Cutting Type',
      message: 'Are you sure you want to restore this cutting type?',
    });
    if (confirmed) {
      restoreMutation.mutate(id);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Cutting Type',
      message: 'Are you sure you want to delete this cutting type?',
      variant: 'danger',
    });
    if (confirmed) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !leafCategoryId) return;
    const numericPrice = parseFloat(basePrice);
    if (isNaN(numericPrice) || numericPrice < 0) {
      setFormErrors({ basePrice: true });
      showToast('Please enter a valid positive base price.', 'error');
      setTimeout(() => {
        const firstInvalidField = document.querySelector('.border-rose-500, input.border-rose-500');
        if (firstInvalidField) {
          firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
      return;
    }
    setFormErrors({});
    saveMutation.mutate({ name: name.trim(), basePrice: numericPrice, leafCategoryId, description: description.trim(), active });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <Card className="h-max p-5 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col gap-4">
        <h3 className="text-lg font-bold text-slate-800">{editingId ? 'Edit Cutting Type' : 'Add Cutting Type'}</h3>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            <span>Parent Leaf Category</span>
            <select className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white" value={leafCategoryId} onChange={(e) => setLeafCategoryId(e.target.value)} required disabled={!canEdit}>
              <option value="">Select a Leaf Category...</option>
              {leafCategories.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            <span>Cutting Type</span>
            <Input type="text" placeholder="e.g. BOP" value={name} onChange={(e) => setName(e.target.value)} required disabled={!canEdit} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            <span>Base Price (₹/kg)</span>
            <Input
              className={
                formErrors.basePrice ? 'border-rose-500 ring-1 ring-rose-500 animate-pulse' : 'border-slate-200'
              }
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 180"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              required
              disabled={!canEdit}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            <span>Description</span>
            <textarea className="min-h-20 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" placeholder="Enter description..." value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canEdit} />
          </label>
          <div className="flex items-center justify-between text-sm font-medium text-slate-700">
            <span>Status</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} disabled={!canEdit} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              <span className="ml-2 text-slate-600">{active ? 'Active' : 'Inactive'}</span>
            </label>
          </div>
          {saveMutation.error && <p className="text-sm text-red-600 font-medium">{(saveMutation.error as any).message}</p>}
          <div className="flex gap-2 mt-2">
            {editingId && <Button type="button" onClick={resetForm} variant="secondary" className="flex-1 h-10 text-sm font-medium">Cancel</Button>}
            <Button type="submit" variant="add" className="flex-1 h-10 text-sm font-medium" disabled={saveMutation.isPending || !canEdit}>
              <Save className="h-4 w-4 text-current" />
              <span>{editingId ? 'Update' : 'Save'}</span>
            </Button>
          </div>
        </form>
      </Card>
      
      <Card className="min-w-0 p-5 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Cutting Type Records</h3>
            <p className="text-xs text-slate-400">Total blended settings and adjustment prices</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs font-semibold text-slate-600">
              {(['all', 'active', 'inactive', 'deleted'] as const).map((status) => (
                <button key={status} onClick={() => setStatusFilter(status)} className={`px-3 py-1.5 rounded-md transition-all ${statusFilter === status ? 'bg-white text-emerald-700 shadow-sm' : 'hover:text-slate-900'}`}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
            <div className="relative flex items-center">
              <Search className="absolute left-3 text-slate-400 pointer-events-none" size={16} />
              <Input className="pl-9 h-9 text-sm font-normal w-full sm:max-w-xs" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="overflow-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide">Leaf Category</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide">Base Price</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide text-center">Status</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic text-sm">Loading records...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic text-sm">No records found matching filters.</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-700">{item.name}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-600">
                      {typeof item.leafCategoryId === 'object' ? item.leafCategoryId?.name : item.leafCategoryId || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-600">₹{Number(item.basePrice).toFixed(2)}/kg</td>
                    <td className="px-4 py-3 text-center">
                      {item.deletedAt ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700"><XCircle size={12} /> Deleted</span>
                      ) : item.active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700"><ShieldCheck size={12} /> Active</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {item.deletedAt ? (
                          <button type="button" onClick={() => handleRestore(item.id)} disabled={!isAdmin} className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600"><RotateCcw size={14} /></button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setViewingCuttingType(item)}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 transition-colors"
                              title="View details"
                            >
                              <Eye size={14} />
                            </button>
                            <button type="button" onClick={() => handleEdit(item)} disabled={!canEdit} className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-slate-50 text-slate-500"><Edit3 size={14} /></button>
                            <button type="button" onClick={() => handleDelete(item.id)} disabled={!isAdmin} className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-slate-50 text-slate-500"><Trash2 size={14} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {viewingCuttingType && (
        <ViewDetailsModal
          title={viewingCuttingType.name}
          subtitle="Cutting Type Details"
          onClose={() => setViewingCuttingType(null)}
          fields={[
            {
              label: 'Cutting Type Name',
              value: viewingCuttingType.name,
            },
            {
              label: 'Leaf Category',
              value: typeof viewingCuttingType.leafCategoryId === 'object' ? viewingCuttingType.leafCategoryId?.name : viewingCuttingType.leafCategoryId || '—',
            },
            {
              label: 'Base Price',
              value: `₹${Number(viewingCuttingType.basePrice || 0).toFixed(2)}/kg`,
            },
            {
              label: 'Description',
              value: viewingCuttingType.description || '—',
            },
            {
              label: 'Status',
              value: viewingCuttingType.deletedAt ? 'Deleted' : viewingCuttingType.active ? 'Active' : 'Inactive',
              type: 'badge',
              badgeColor: viewingCuttingType.deletedAt ? 'red' : viewingCuttingType.active ? 'green' : 'slate',
            },
          ]}
        />
      )}
    </div>
  );
};
