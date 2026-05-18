import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Search, Edit3, Trash2, Eye, X } from 'lucide-react';
import { Button, Card, Input } from '@amaravathi/shared-ui';
import { api, endpoints } from '../lib/api';
import { DataModule } from '../components/DataModule';
import { ViewDetailsModal } from '../components/ViewDetailsModal';
import { useNotification } from '../components/NotificationContext';
import { useDebounce } from '../hooks/useDebounce';

export const TeaPowderTypesPage = () => {
  const queryClient = useQueryClient();
  const { showError, confirm } = useNotification();
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const qParam = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(qParam);

  useEffect(() => {
    setSearchQuery(qParam);
  }, [qParam]);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [viewingType, setViewingType] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Fetch current user details for role-based actions
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () =>
      api<{ name: string; email: string; role: string }>('/auth/me'),
  });
  const isAdmin = me?.role === 'admin';
  const canEdit = me?.role === 'admin' || me?.role === 'pricing_manager';

  // Fetch list
  const { data } = useQuery({
    queryKey: [endpoints.teaPowderTypes, debouncedSearchQuery],
    queryFn: () =>
      api<{ items: { id: string; name: string }[] }>(
        `${endpoints.teaPowderTypes}?q=${encodeURIComponent(debouncedSearchQuery)}`,
      ),
  });
  const items = data?.items ?? [];

  // Create or Update Mutation
  const saveMutation = useMutation({
    mutationFn: (payload: { name: string }) => {
      if (editingId) {
        return api(`${endpoints.teaPowderTypes}/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return api(endpoints.teaPowderTypes, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      setName('');
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: [endpoints.teaPowderTypes] });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api(`${endpoints.teaPowderTypes}/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoints.teaPowderTypes] });
    },
    onError: (err: any) => {
      showError(err);
    },
  });

  const handleEdit = (item: { id: string; name: string }) => {
    setEditingId(item.id);
    setName(item.name);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Tea Powder Type',
      message: 'Are you sure you want to delete this tea powder type?',
      variant: 'danger',
    });
    if (confirmed) {
      deleteMutation.mutate(id);
    }
  };

  const handleCancel = () => {
    setName('');
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    saveMutation.mutate({ name: name.trim() });
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      {/* Left Form: Add/Edit Tea Powder Type */}
      <Card className="h-max p-5 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col gap-4">
        <h3 className="text-lg font-bold text-slate-800">
          {editingId ? 'Edit Tea Powder Type' : 'Add Tea Powder Type'}
        </h3>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            <span>Name</span>
            <Input
              type="text"
              placeholder="e.g. Fine Dust"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={!canEdit}
              title={
                !canEdit
                  ? 'Only admins or pricing managers can create/edit'
                  : ''
              }
            />
          </label>

          {saveMutation.error && (
            <p className="text-sm text-red-600 font-medium">
              {saveMutation.error.message}
            </p>
          )}

          <div className="flex gap-2 mt-2">
            {editingId && (
              <Button
                type="button"
                onClick={handleCancel}
                variant="secondary"
                className="flex-1 h-10 text-sm font-medium transition-colors hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              variant="add"
              className="flex-1 h-10 text-sm font-medium transition-colors hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
              disabled={saveMutation.isPending || !canEdit}
            >
              <Save className="h-4 w-4 text-current" />
              <span>{editingId ? 'Update' : 'Save'}</span>
            </Button>
          </div>
        </form>
      </Card>

      {/* Right Table: Searchable records */}
      <Card className="min-w-0 p-5 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col gap-4">
        <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-bold text-slate-800">
            Tea Powder Type Records
          </h3>
        </div>

        <div className="overflow-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                  Tea Powder Type Name
                </th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={2}
                    className="px-4 py-8 text-center text-slate-400 italic text-sm"
                  >
                    No tea powder types found.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-normal text-slate-700">
                      {item.name}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewingType(item)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 transition-all duration-200 active:scale-95 focus:outline-none"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          disabled={!canEdit}
                          className={`inline-flex items-center justify-center h-8 w-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 transition-all duration-200 ${
                            canEdit
                              ? 'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 active:scale-95'
                              : 'opacity-40 cursor-not-allowed'
                          } focus:outline-none`}
                          title={
                            canEdit
                              ? 'Edit'
                              : 'Only admins or pricing managers can edit'
                          }
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          disabled={!isAdmin}
                          className={`inline-flex items-center justify-center h-8 w-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 transition-all duration-200 ${
                            isAdmin
                              ? 'hover:bg-red-50 hover:text-red-600 hover:border-red-300 active:scale-95'
                              : 'opacity-40 cursor-not-allowed'
                          } focus:outline-none`}
                          title={isAdmin ? 'Delete' : 'Only admins can delete'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {viewingType && (
        <ViewDetailsModal
          title={viewingType.name}
          subtitle="Tea Powder Type Details"
          onClose={() => setViewingType(null)}
          fields={[
            {
              label: 'Tea Powder Type ID',
              value: viewingType.id,
            },
            {
              label: 'Type Name',
              value: viewingType.name,
            },
          ]}
        />
      )}
    </div>
  );
};

export const SellersPage = () => {
  const queryClient = useQueryClient();
  const { showError, confirm } = useNotification();
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const qParam = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(qParam);

  useEffect(() => {
    setSearchQuery(qParam);
  }, [qParam]);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [viewingSeller, setViewingSeller] = useState<{
    id: string;
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
  } | null>(null);

  // Fetch current user details for role-based actions
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () =>
      api<{ name: string; email: string; role: string }>('/auth/me'),
  });
  const isAdmin = me?.role === 'admin';
  const canEdit = me?.role === 'admin' || me?.role === 'pricing_manager';

  // Fetch list
  const { data } = useQuery({
    queryKey: [endpoints.sellers, debouncedSearchQuery],
    queryFn: () =>
      api<{
        items: {
          id: string;
          name: string;
          contactPerson?: string;
          phone?: string;
          email?: string;
        }[];
      }>(`${endpoints.sellers}?q=${encodeURIComponent(debouncedSearchQuery)}`),
  });
  const items = data?.items ?? [];

  // Create or Update Mutation
  const saveMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      contactPerson?: string;
      phone?: string;
      email?: string;
    }) => {
      if (editingId) {
        return api(`${endpoints.sellers}/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return api(endpoints.sellers, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      setName('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: [endpoints.sellers] });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api(`${endpoints.sellers}/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoints.sellers] });
    },
    onError: (err: any) => {
      showError(err);
    },
  });

  const handleEdit = (item: {
    id: string;
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
  }) => {
    setEditingId(item.id);
    setName(item.name);
    setContactPerson(item.contactPerson ?? '');
    setPhone(item.phone ?? '');
    setEmail(item.email ?? '');
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Seller',
      message: 'Are you sure you want to delete this seller (supplier)?',
      variant: 'danger',
    });
    if (confirmed) {
      deleteMutation.mutate(id);
    }
  };

  const handleCancel = () => {
    setName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    saveMutation.mutate({
      name: name.trim(),
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      email: email.trim(),
    });
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      {/* Left Form: Add/Edit Seller */}
      <Card className="h-max p-5 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col gap-4">
        <h3 className="text-lg font-bold text-slate-800">
          {editingId ? 'Edit Seller (Supplier)' : 'Add Seller (Supplier)'}
        </h3>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            <span>Name</span>
            <Input
              type="text"
              placeholder="e.g. ABC Tea Traders"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={!canEdit}
              title={
                !canEdit
                  ? 'Only admins or pricing managers can create/edit'
                  : ''
              }
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            <span>Contact Person</span>
            <Input
              type="text"
              placeholder="e.g. John Doe"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              disabled={!canEdit}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            <span>Phone</span>
            <Input
              type="tel"
              placeholder="e.g. +91 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={!canEdit}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            <span>Email</span>
            <Input
              type="email"
              placeholder="e.g. contact@supplier.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!canEdit}
            />
          </label>

          {saveMutation.error && (
            <p className="text-sm text-red-600 font-medium">
              {saveMutation.error.message}
            </p>
          )}

          <div className="flex gap-2 mt-2">
            {editingId && (
              <Button
                type="button"
                onClick={handleCancel}
                variant="secondary"
                className="flex-1 h-10 text-sm font-medium transition-colors hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              variant="add"
              className="flex-1 h-10 text-sm font-medium transition-colors hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
              disabled={saveMutation.isPending || !canEdit}
            >
              <Save className="h-4 w-4 text-current" />
              <span>{editingId ? 'Update' : 'Save'}</span>
            </Button>
          </div>
        </form>
      </Card>

      {/* Right Table: Searchable records */}
      <Card className="min-w-0 p-5 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col gap-4">
        <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-bold text-slate-800">Seller Records</h3>
        </div>

        <div className="overflow-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                  Seller Name
                </th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                  Contact Person
                </th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                  Phone
                </th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                  Email
                </th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-slate-400 italic text-sm"
                  >
                    No sellers (suppliers) found.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-normal text-slate-700">
                      {item.name}
                    </td>
                    <td className="px-4 py-3 text-sm font-normal text-slate-600">
                      {item.contactPerson || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-normal text-slate-500">
                      {item.phone || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-normal text-slate-500">
                      {item.email || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewingSeller(item)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 transition-all duration-200 active:scale-95 focus:outline-none"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          disabled={!canEdit}
                          className={`inline-flex items-center justify-center h-8 w-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 transition-all duration-200 ${
                            canEdit
                              ? 'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 active:scale-95'
                              : 'opacity-40 cursor-not-allowed'
                          } focus:outline-none`}
                          title={
                            canEdit
                              ? 'Edit'
                              : 'Only admins or pricing managers can edit'
                          }
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          disabled={!isAdmin}
                          className={`inline-flex items-center justify-center h-8 w-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 transition-all duration-200 ${
                            isAdmin
                              ? 'hover:bg-red-50 hover:text-red-600 hover:border-red-300 active:scale-95'
                              : 'opacity-40 cursor-not-allowed'
                          } focus:outline-none`}
                          title={isAdmin ? 'Delete' : 'Only admins can delete'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {viewingSeller && (
        <ViewDetailsModal
          title={viewingSeller.name}
          subtitle="Seller / Supplier Details"
          onClose={() => setViewingSeller(null)}
          fields={[
            {
              label: 'Seller/Supplier Name',
              value: viewingSeller.name,
            },
            {
              label: 'Contact Person',
              value: viewingSeller.contactPerson || '—',
            },
            {
              label: 'Phone Number',
              value: viewingSeller.phone || '—',
            },
            {
              label: 'Email Address',
              value: viewingSeller.email || '—',
            },
          ]}
        />
      )}
    </div>
  );
};

export { AddPurchaseBatchPage } from './AddPurchaseBatchPage';

export const UsersPage = () => (
  <DataModule
    title="User"
    endpoint={endpoints.users}
    fields={[
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'password', label: 'Password', type: 'text' },
      {
        key: 'role',
        label: 'Role',
        type: 'select',
        defaultValue: 'viewer',
        options: [
          { label: 'Admin', value: 'admin' },
          { label: 'Pricing Manager', value: 'pricing_manager' },
          { label: 'Viewer', value: 'viewer' },
          { label: 'Operator', value: 'operator' },
        ],
      },
    ]}
  />
);

export const CustomersPage = () => {
  const queryClient = useQueryClient();
  const { showError, confirm } = useNotification();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const qParam = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(qParam);

  useEffect(() => {
    setSearchQuery(qParam);
  }, [qParam]);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [viewingCustomer, setViewingCustomer] = useState<{
    id: string;
    name: string;
    address?: string;
    mobileNumber?: string;
  } | null>(null);

  const { data: customerFormulasData } = useQuery({
    queryKey: ['customer-formulas', viewingCustomer?.id],
    queryFn: () =>
      viewingCustomer
         ? api<{ items: any[] }>(
            `${endpoints.customerTeaFormulas}?customerId=${viewingCustomer.id}`,
          )
        : Promise.resolve({ items: [] }),
    enabled: !!viewingCustomer,
  });
  const customerFormulas = customerFormulasData?.items ?? [];

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () =>
      api<{ name: string; email: string; role: string }>('/auth/me'),
  });
  const isAdmin = me?.role === 'admin';
  const canEdit = me?.role === 'admin' || me?.role === 'pricing_manager';

  const { data } = useQuery({
    queryKey: [endpoints.customers, debouncedSearchQuery],
    queryFn: () =>
      api<{
        items: {
          id: string;
          name: string;
          address?: string;
          mobileNumber?: string;
        }[];
      }>(`${endpoints.customers}?q=${encodeURIComponent(debouncedSearchQuery)}`),
  });
  const items = data?.items ?? [];

  const saveMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      address?: string;
      mobileNumber?: string;
    }) => {
      if (editingId) {
        return api(`${endpoints.customers}/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return api(endpoints.customers, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      setName('');
      setAddress('');
      setMobileNumber('');
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: [endpoints.customers] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api(`${endpoints.customers}/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoints.customers] });
    },
    onError: (err: any) => {
      showError(err);
    },
  });

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setName(item.name);
    setAddress(item.address ?? '');
    setMobileNumber(item.mobileNumber ?? '');
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Customer',
      message: 'Are you sure you want to delete this customer?',
      variant: 'danger',
    });
    if (confirmed) {
      deleteMutation.mutate(id);
    }
  };

  const handleCancel = () => {
    setName('');
    setAddress('');
    setMobileNumber('');
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    saveMutation.mutate({
      name: name.trim(),
      address: address.trim(),
      mobileNumber: mobileNumber.trim(),
    });
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <Card className="h-max p-5 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col gap-4">
        <h3 className="text-lg font-bold text-slate-800">
          {editingId ? 'Edit Customer' : 'Add Customer'}
        </h3>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            <span>Name</span>
            <Input
              type="text"
              placeholder="e.g. Acme Corp"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={!canEdit}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            <span>Address</span>
            <Input
              type="text"
              placeholder="e.g. 123 Main St"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={!canEdit}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            <span>Mobile Number</span>
            <Input
              type="tel"
              placeholder="e.g. +91 9876543210"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              disabled={!canEdit}
            />
          </label>

          {saveMutation.error && (
            <p className="text-sm text-red-600 font-medium">
              {saveMutation.error.message}
            </p>
          )}

          <div className="flex gap-2 mt-2">
            {editingId && (
              <Button
                type="button"
                onClick={handleCancel}
                variant="secondary"
                className="flex-1 h-10 text-sm font-medium"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              variant="add"
              className="flex-1 h-10 text-sm font-medium"
              disabled={saveMutation.isPending || !canEdit}
            >
              <Save className="h-4 w-4 text-current" />
              <span>{editingId ? 'Update' : 'Save'}</span>
            </Button>
          </div>
        </form>
      </Card>

      <Card className="min-w-0 p-5 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col gap-4">
        <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-bold text-slate-800">Customer Records</h3>
        </div>

        <div className="overflow-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                  Name
                </th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                  Address
                </th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                  Mobile Number
                </th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-slate-400 italic text-sm"
                  >
                    No customers found.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-normal text-slate-700">
                      {item.name}
                    </td>
                    <td className="px-4 py-3 text-sm font-normal text-slate-600">
                      {item.address || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-normal text-slate-500">
                      {item.mobileNumber || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewingCustomer(item)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 transition-colors"
                          title="View Customized Formulas"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          disabled={!canEdit}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          disabled={!isAdmin}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Viewing Customer Formulas Details Modal */}
      {viewingCustomer && (
        <ViewDetailsModal
          title={viewingCustomer.name}
          subtitle="Customer Customizations"
          onClose={() => setViewingCustomer(null)}
          fields={[
            {
              label: 'Customer Name',
              value: viewingCustomer.name,
            },
            {
              label: 'Mobile Number',
              value: viewingCustomer.mobileNumber || '—',
            },
            {
              label: 'Address',
              value: viewingCustomer.address || '—',
            },
          ]}
          customBody={
            <div className="flex flex-col gap-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Customized Recipes
              </span>
              {customerFormulas.length === 0 ? (
                <div className="py-8 text-center text-slate-400 italic text-sm border border-slate-100 rounded-xl bg-slate-50/50">
                  No customized formulas set for this customer yet.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {customerFormulas.map((formula: any) => {
                    const isNewFormula =
                      formula.lineItems && formula.lineItems.length > 0;
                    const finalPriceDisplay = isNewFormula
                      ? formula.costPerKg
                      : formula.finalPrice;

                    return (
                      <div
                        key={formula.id}
                        className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col gap-3"
                      >
                        <div className="flex justify-between items-start border-b border-slate-200/60 pb-2">
                          <div>
                            <span className="text-xs font-mono font-bold text-slate-500 block">
                              {formula.formulaCode}
                            </span>
                            <span className="font-bold text-slate-800 text-sm">
                              {formula.formulaName}
                            </span>
                          </div>
                          <span className="text-lg font-black text-emerald-800">
                            ₹{(Number(finalPriceDisplay) || 0).toFixed(2)}/kg
                          </span>
                        </div>

                        {!isNewFormula ? (
                          <>
                            <div className="grid grid-cols-1 gap-4 text-xs">
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                  Leaf Category
                                </span>
                                <span className="font-semibold text-slate-700">
                                  {typeof formula.leafCategoryId === 'object'
                                    ? formula.leafCategoryId.name
                                    : '-'}
                                </span>
                              </div>
                            </div>

                            {formula.addons && formula.addons.length > 0 && (
                              <div className="border-t border-slate-200/40 pt-2 text-xs">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                  Add-Ons Added
                                </span>
                                <div className="flex flex-col gap-1.5 pl-2 border-l-2 border-emerald-400">
                                  {formula.addons.map(
                                    (addon: any, idx: number) => (
                                      <div
                                        key={idx}
                                        className="flex justify-between text-slate-600 font-medium"
                                      >
                                        <span>
                                          {addon.name} ({addon.gramsPerKg}g/kg)
                                        </span>
                                        <span>
                                          ₹{addon.price.toFixed(2)}/kg
                                        </span>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                  Tea Powder Type
                                </span>
                                <span className="font-semibold text-slate-700">
                                  {formula.teaPowderType || '-'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                  Total Weight
                                </span>
                                <span className="font-semibold text-slate-700">
                                  {formula.totalWeight || 0} g
                                </span>
                              </div>
                            </div>

                            {formula.lineItems &&
                              formula.lineItems.length > 0 && (
                                <div className="border-t border-slate-200/40 pt-2 text-xs">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                    Blend Ingredients
                                  </span>
                                  <div className="flex flex-col gap-1.5 pl-2 border-l-2 border-emerald-400">
                                    {formula.lineItems.map(
                                      (item: any, idx: number) => (
                                        <div
                                          key={idx}
                                          className="flex justify-between text-slate-600 font-medium"
                                        >
                                          <span>
                                            {item.ingredientName} (
                                            {item.purchaseBatchCode})
                                          </span>
                                          <span>
                                            {item.quantityInGrams}g @ ₹
                                            {item.pricePerGram.toFixed(4)}/g
                                          </span>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </div>
                              )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          }
        />
      )}
    </div>
  );
};
