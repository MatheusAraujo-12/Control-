import React, { useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { userCollectionRef, userDocRef } from '../firebase';
import { Modal } from './ui/Modal';
import { ConfirmModal } from './ui/ConfirmModal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Plus, Edit3, Trash2, Package, Wrench, FileText, DollarSign, User, Car as CarIcon, FileDown } from 'lucide-react';

const formatCurrency = value =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(value) ? value : Number(value) || 0);

const formatDate = value => {
    const parsed = value instanceof Date ? value : value?.seconds ? new Date(value.seconds * 1000) : value ? new Date(value) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) {
        return 'N/A';
    }
    return parsed.toLocaleDateString('pt-BR');
};

const STATUS_OPTIONS = [
    { value: 'draft', label: 'Rascunho' },
    { value: 'sent', label: 'Enviado' },
    { value: 'approved', label: 'Aprovado' },
    { value: 'rejected', label: 'Rejeitado' },
];

const STATUS_STYLES = {
    draft: 'bg-gray-100 text-gray-700',
    sent: 'bg-blue-100 text-blue-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
};

const createEmptyPart = () => ({
    id: `part-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name: '',
    quantity: '1',
    unitPrice: '0',
});

const createEmptyBudget = () => ({
    clientId: '',
    clientName: '',
    vehicleBrand: '',
    vehicleModel: '',
    vehiclePlate: '',
    laborCost: '0',
    discount: '0',
    notes: '',
    status: 'draft',
    budgetNumber: '',
    parts: [createEmptyPart()],
    services: [],
});

const toDate = value => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'object' && 'seconds' in value) {
        return new Date(value.seconds * 1000);
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const roundCurrency = value => Math.round((Number(value) || 0) * 100) / 100;

const getNextBudgetNumber = (existingBudgets = []) => {
    const numbers = existingBudgets
        .map(item => parseInt(item.budgetNumber, 10))
        .filter(Number.isFinite);
    const next = numbers.length ? Math.max(...numbers) + 1 : 1;
    return String(next).padStart(6, '0');
};
const Orcamentos = ({ userId, budgets = [], clients = [], services = [], appSettings = {}, setNotification }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null });
    const [currentBudget, setCurrentBudget] = useState(null);
    const [formData, setFormData] = useState(createEmptyBudget());
    const [selectedServiceId, setSelectedServiceId] = useState('');

    const sortedBudgets = useMemo(() => {
        return [...budgets].sort((a, b) => {
            const dateA = toDate(a?.updatedAt || a?.createdAt);
            const dateB = toDate(b?.updatedAt || b?.createdAt);
            return (dateB ? dateB.getTime() : 0) - (dateA ? dateA.getTime() : 0);
        });
    }, [budgets]);

    const totals = useMemo(() => {
        const partsTotal = formData.parts.reduce((sum, part) => sum + (Number(part.quantity) || 0) * (Number(part.unitPrice) || 0), 0);
        const servicesTotal = formData.services.reduce((sum, service) => sum + (Number(service.price) || 0), 0);
        const laborCost = Number(formData.laborCost) || 0;
        const subtotal = partsTotal + servicesTotal + laborCost;
        const discount = Math.min(Number(formData.discount) || 0, subtotal);
        const total = Math.max(subtotal - discount, 0);

        return {
            partsTotal,
            servicesTotal,
            laborCost,
            discount,
            subtotal,
            total,
        };
    }, [formData.parts, formData.services, formData.laborCost, formData.discount]);

    const resetForm = () => {
        setFormData(createEmptyBudget());
        setSelectedServiceId('');
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentBudget(null);
        resetForm();
    };

    const openNewBudgetModal = () => {
        resetForm();
        setCurrentBudget(null);
        setIsModalOpen(true);
    };

    const openEditBudgetModal = budget => {
        setCurrentBudget(budget);
        setFormData({
            clientId: budget.clientId || '',
            clientName: budget.clientName || '',
            vehicleBrand: budget.vehicleBrand || '',
            vehicleModel: budget.vehicleModel || '',
            vehiclePlate: budget.vehiclePlate || '',
            laborCost: String(budget.laborCost ?? 0),
            discount: String(budget.discount ?? 0),
            notes: budget.notes || '',
            status: budget.status || 'draft',
            budgetNumber: budget.budgetNumber || '',
            parts: (Array.isArray(budget.parts) && budget.parts.length ? budget.parts : [createEmptyPart()]).map(part => ({
                id: part.id || `part-${Math.random().toString(16).slice(2, 8)}`,
                name: part.name || '',
                quantity: String(part.quantity ?? 1),
                unitPrice: String(part.unitPrice ?? 0),
            })),
            services: Array.isArray(budget.services)
                ? budget.services.map(service => ({
                      id: service.id || `service-${Math.random().toString(16).slice(2, 8)}`,
                      name: service.name || '',
                      price: Number(service.price) || 0,
                  }))
                : [],
        });
        setSelectedServiceId('');
        setIsModalOpen(true);
    };

    const handleClientChange = event => {
        const { value } = event.target;
        const selectedClient = clients.find(client => client.id === value);
        setFormData(current => ({
            ...current,
            clientId: value,
            clientName: selectedClient ? selectedClient.name : '',
            vehicleBrand: selectedClient?.vehicleBrand || current.vehicleBrand,
            vehicleModel: selectedClient?.vehicleModel || current.vehicleModel,
            vehiclePlate: selectedClient?.vehiclePlate || current.vehiclePlate,
        }));
    };

    const handleInputChange = event => {
        const { name, value } = event.target;
        setFormData(current => ({ ...current, [name]: value }));
    };

    const handlePartChange = (id, field, value) => {
        setFormData(current => ({
            ...current,
            parts: current.parts.map(part => (part.id === id ? { ...part, [field]: value } : part)),
        }));
    };

    const handleAddPart = () => {
        setFormData(current => ({
            ...current,
            parts: [...current.parts, createEmptyPart()],
        }));
    };

    const handleRemovePart = id => {
        setFormData(current => ({
            ...current,
            parts: current.parts.filter(part => part.id !== id),
        }));
    };

    const handleAddService = () => {
        if (!selectedServiceId) {
            return;
        }
        const service = services.find(item => item.id === selectedServiceId);
        if (!service) {
            return;
        }
        setFormData(current => {
            if (current.services.some(existing => existing.id === service.id)) {
                return current;
            }
            return {
                ...current,
                services: [...current.services, { id: service.id, name: service.name || '', price: Number(service.price) || 0 }],
            };
        });
        setSelectedServiceId('');
    };

    const handleRemoveService = serviceId => {
        setFormData(current => ({
            ...current,
            services: current.services.filter(service => service.id !== serviceId),
        }));
    };
    const handleSubmit = async event => {
        event.preventDefault();

        if (!userId) {
            setNotification?.({ type: 'error', message: 'Sessao expirada. Faça login novamente.' });
            return;
        }

        if (!formData.clientName.trim()) {
            setNotification?.({ type: 'error', message: 'Informe o nome do cliente.' });
            return;
        }

        const partsPayload = formData.parts
            .filter(part => part.name.trim())
            .map(part => {
                const quantity = Number(part.quantity) || 0;
                const unitPrice = Number(part.unitPrice) || 0;
                return {
                    id: part.id,
                    name: part.name.trim(),
                    quantity,
                    unitPrice,
                    total: roundCurrency(quantity * unitPrice),
                };
            });

        const servicesPayload = formData.services.map(service => ({
            id: service.id,
            name: service.name,
            price: roundCurrency(service.price),
        }));

        const partsTotal = roundCurrency(partsPayload.reduce((sum, item) => sum + item.total, 0));
        const servicesTotal = roundCurrency(servicesPayload.reduce((sum, item) => sum + item.price, 0));
        const laborCost = roundCurrency(Number(formData.laborCost));
        const discount = roundCurrency(Number(formData.discount));
        const subtotal = roundCurrency(partsTotal + servicesTotal + laborCost);
        const total = roundCurrency(subtotal - discount);

        const payload = {
            clientId: formData.clientId,
            clientName: formData.clientName.trim(),
            vehicleBrand: formData.vehicleBrand.trim(),
            vehicleModel: formData.vehicleModel.trim(),
            vehiclePlate: formData.vehiclePlate.trim(),
            parts: partsPayload,
            services: servicesPayload,
            laborCost,
            partsTotal,
            servicesTotal,
            discount,
            total,
            notes: formData.notes.trim(),
            status: formData.status,
            updatedAt: serverTimestamp(),
        };

        try {
            if (currentBudget) {
                await updateDoc(userDocRef(userId, 'budgets', currentBudget.id), {
                    ...payload,
                    budgetNumber: currentBudget.budgetNumber || '',
                });
                setNotification?.({ type: 'success', message: 'Orçamento atualizado com sucesso!' });
            } else {
                const budgetNumber = getNextBudgetNumber(budgets);
                await addDoc(userCollectionRef(userId, 'budgets'), {
                    ...payload,
                    budgetNumber,
                    createdAt: serverTimestamp(),
                });
                setNotification?.({ type: 'success', message: 'Orçamento criado com sucesso!' });
            }
            closeModal();
        } catch (error) {
            console.error('Erro ao salvar orcamento:', error);
            setNotification?.({ type: 'error', message: 'Não foi possivel salvar o orçamento.' });
        }
    };

    const confirmDeleteBudget = budget => {
        setConfirmDelete({ isOpen: true, id: budget.id });
    };

    const handleDelete = async () => {
        if (!confirmDelete.id) {
            return;
        }
        if (!userId) {
            setNotification?.({ type: 'error', message: 'Sessao expirada. Faça login novamente.' });
            return;
        }
        try {
            await deleteDoc(userDocRef(userId, 'budgets', confirmDelete.id));
            setNotification?.({ type: 'success', message: 'Orçamento removido com sucesso.' });
        } catch (error) {
            console.error('Erro ao remover orçamento:', error);
            setNotification?.({ type: 'error', message: 'Nao foi possivel remover o orcamento.' });
        } finally {
            setConfirmDelete({ isOpen: false, id: null });
        }
    };
    const handleGeneratePdf = budget => {
        const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
        const marginLeft = 40;
        let cursorY = 60;

        if (appSettings.logoUrl) {
            try {
                pdf.addImage(appSettings.logoUrl, 'PNG', marginLeft, cursorY, 80, 80);
            } catch (error) {
                console.warn('Não foi possivel adicionar a logomarca ao PDF:', error);
            }
        }

        const companyInfoStartX = appSettings.logoUrl ? marginLeft + 100 : marginLeft;
        pdf.setFontSize(18);
        pdf.text(appSettings.companyName || 'Control+ Oficina', companyInfoStartX, cursorY + 20);
        pdf.setFontSize(11);
        const companyLines = [
            appSettings.companyDocument ? `Documento: ${appSettings.companyDocument}` : null,
            appSettings.companyAddress || null,
            appSettings.companyPhone ? `Telefone: ${appSettings.companyPhone}` : null,
            appSettings.companyEmail || null,
            appSettings.companyWebsite || null,
        ].filter(Boolean);
        companyLines.forEach((line, index) => {
            pdf.text(line, companyInfoStartX, cursorY + 40 + index * 14);
        });

        cursorY += Math.max(100, companyLines.length * 14 + 60);

        pdf.setFontSize(12);
        pdf.text(`Orcamento Numero ${budget.budgetNumber || budget.id}`, marginLeft, cursorY);
        pdf.text(`Data: ${formatDate(budget.updatedAt || budget.createdAt)}`, pdf.internal.pageSize.getWidth() - marginLeft, cursorY, {
            align: 'right',
        });
        cursorY += 20;

        const client = clients.find(item => item.id === budget.clientId);
        const clientLines = [
            `Cliente: ${budget.clientName}`,
            client?.phone ? `Telefone: ${client.phone}` : null,
            client?.email ? `E-mail: ${client.email}` : null,
            [budget.vehicleBrand, budget.vehicleModel, budget.vehiclePlate].filter(Boolean).length
                ? `Veiculo: ${[budget.vehicleBrand, budget.vehicleModel, budget.vehiclePlate].filter(Boolean).join(' ')}`
                : null,
        ].filter(Boolean);
        pdf.setFontSize(11);
        clientLines.forEach(line => {
            pdf.text(line, marginLeft, cursorY);
            cursorY += 16;
        });
        cursorY += 10;

        if (budget.services?.length) {
            autoTable(pdf, {
                startY: cursorY,
                head: [['Servico', 'Valor']],
                body: budget.services.map(service => [service.name, formatCurrency(service.price)]),
                theme: 'striped',
                styles: { fontSize: 10 },
                columnStyles: { 1: { halign: 'right' } },
                headStyles: { fillColor: [37, 99, 235] },
                margin: { left: marginLeft, right: marginLeft },
            });
            const servicesTableY = pdf.lastAutoTable?.finalY ?? cursorY;
            cursorY = servicesTableY + 20;
        }

        if (budget.parts?.length) {
            autoTable(pdf, {
                startY: cursorY,
                head: [['Peca', 'Qtd.', 'Valor unitario', 'Total']],
                body: budget.parts.map(part => [
                    part.name,
                    String(part.quantity),
                    formatCurrency(part.unitPrice),
                    formatCurrency(part.total ?? Number(part.quantity || 0) * Number(part.unitPrice || 0)),
                ]),
                theme: 'striped',
                styles: { fontSize: 10 },
                columnStyles: {
                    1: { halign: 'center' },
                    2: { halign: 'right' },
                    3: { halign: 'right' },
                },
                headStyles: { fillColor: [37, 99, 235] },
                margin: { left: marginLeft, right: marginLeft },
            });
            const partsTableY = pdf.lastAutoTable?.finalY ?? cursorY;
            cursorY = partsTableY + 20;
        }

        pdf.setFontSize(12);
        pdf.text('Resumo financeiro', marginLeft, cursorY);
        cursorY += 16;
        pdf.setFontSize(11);
        const summaryLines = [
            ['Pecas', formatCurrency(budget.partsTotal ?? 0)],
            ['Servicos', formatCurrency(budget.servicesTotal ?? 0)],
            ['Mao de obra', formatCurrency(budget.laborCost ?? 0)],
            ['Subtotal', formatCurrency((budget.partsTotal || 0) + (budget.servicesTotal || 0) + (budget.laborCost || 0))],
            ['Desconto', `- ${formatCurrency(budget.discount ?? 0)}`],
            ['Total', formatCurrency(budget.total ?? 0)],
        ];
        summaryLines.forEach(([label, value]) => {
            pdf.text(label, marginLeft, cursorY);
            pdf.text(value, pdf.internal.pageSize.getWidth() - marginLeft, cursorY, { align: 'right' });
            cursorY += 16;
        });

        if (budget.notes) {
            cursorY += 10;
            pdf.setFontSize(12);
            pdf.text('Observacoes', marginLeft, cursorY);
            cursorY += 14;
            pdf.setFontSize(11);
            const notes = pdf.splitTextToSize(budget.notes, pdf.internal.pageSize.getWidth() - marginLeft * 2);
            pdf.text(notes, marginLeft, cursorY);
        }

        pdf.save(`orcamento-${budget.budgetNumber || budget.id}.pdf`);
    };
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Orçamentos</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie e compartilhe propostas detalhadas com seus clientes.</p>
                </div>
                <Button onClick={openNewBudgetModal} icon={<Plus size={18} />}>Novo orçamento</Button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hidden md:block">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="p-4 font-semibold">Número</th>
                                <th className="p-4 font-semibold">Cliente</th>
                                <th className="p-4 font-semibold">Status</th>
                                <th className="p-4 font-semibold">Total</th>
                                <th className="p-4 font-semibold">Atualizado em</th>
                                <th className="p-4 font-semibold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {sortedBudgets.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-6 text-center text-gray-500 dark:text-gray-400">Nenhum orçamento cadastrado até o momento.</td>
                                </tr>
                            ) : (
                                sortedBudgets.map(budget => {
                                    const statusStyle = STATUS_STYLES[budget.status] || STATUS_STYLES.draft;
                                    const statusLabel = STATUS_OPTIONS.find(option => option.value === budget.status)?.label || 'Rascunho';
                                    return (
                                        <tr key={budget.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                            <td className="p-4 font-semibold text-gray-800 dark:text-gray-100">{budget.budgetNumber || 'N/A'}</td>
                                            <td className="p-4 text-sm text-gray-700 dark:text-gray-200">{budget.clientName || 'Cliente nao informado'}</td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyle}`}>{statusLabel}</span>
                                            </td>
                                            <td className="p-4 font-semibold text-gray-800 dark:text-gray-100">{formatCurrency(budget.total)}</td>
                                            <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{formatDate(budget.updatedAt || budget.createdAt)}</td>
                                            <td className="p-4">
                                                <div className="flex flex-wrap items-center justify-end gap-2">
                                                    <Button onClick={() => handleGeneratePdf(budget)} variant="secondary" className="px-3 py-1 text-sm" icon={<FileDown size={16} />}>Gerar PDF</Button>
                                                    <Button onClick={() => openEditBudgetModal(budget)} variant="secondary" className="px-3 py-1 text-sm" icon={<Edit3 size={16} />}>Editar</Button>
                                                    <Button onClick={() => confirmDeleteBudget(budget)} variant="danger" className="px-3 py-1 text-sm" icon={<Trash2 size={16} />}>Excluir</Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="space-y-4 md:hidden">
                {sortedBudgets.length === 0 ? (
                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md">
                        Nenhum orçamento cadastrado até o momento.
                    </p>
                ) : (
                    sortedBudgets.map(budget => {
                        const statusStyle = STATUS_STYLES[budget.status] || STATUS_STYLES.draft;
                        const statusLabel = STATUS_OPTIONS.find(option => option.value === budget.status)?.label || 'Rascunho';
                        return (
                            <div key={budget.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 space-y-3 border border-gray-200 dark:border-gray-700">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Orçamento #{budget.budgetNumber || 'N/A'}</p>
                                        <span className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusStyle}`}>{statusLabel}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Total</p>
                                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{formatCurrency(budget.total)}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
                                    <div>
                                        <span className="block font-medium text-gray-500 dark:text-gray-400">Cliente</span>
                                        <span>{budget.clientName || 'Cliente nao informado'}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block font-medium text-gray-500 dark:text-gray-400">Atualizado em</span>
                                        <span>{formatDate(budget.updatedAt || budget.createdAt)}</span>
                                    </div>
                                    <div>
                                        <span className="block font-medium text-gray-500 dark:text-gray-400">Veiculo</span>
                                        <span>{[budget.vehicleBrand, budget.vehicleModel, budget.vehiclePlate].filter(Boolean).join(' ') || 'Nao informado'}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block font-medium text-gray-500 dark:text-gray-400">Servicos</span>
                                        <span>{budget.services?.length || 0}</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 pt-2">
                                    <Button onClick={() => openEditBudgetModal(budget)} variant="secondary" className="flex-1 min-w-[120px]" icon={<Edit3 size={16} />}>
                                        Editar
                                    </Button>
                                    <Button onClick={() => confirmDeleteBudget(budget)} variant="danger" className="flex-1 min-w-[120px]" icon={<Trash2 size={16} />}>
                                        Excluir
                                    </Button>
                                    <Button onClick={() => handleGeneratePdf(budget)} variant="secondary" className="flex-1 min-w-[120px]" icon={<FileDown size={16} />}>
                                        PDF
                                    </Button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={currentBudget ? `Editar orcamento ${currentBudget.budgetNumber || ''}` : 'Novo orcamento'}
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Cliente vinculado</label>
                            <select
                                value={formData.clientId}
                                onChange={handleClientChange}
                                className="w-full border rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-200"
                            >
                                <option value="">Selecione um cliente</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Nome do cliente exibido</label>
                            <Input
                                name="clientName"
                                value={formData.clientName}
                                onChange={handleInputChange}
                                placeholder="Nome do cliente"
                                icon={<User size={18} />}
                                required
                            />
                        </div>
                        <Input
                            name="vehicleBrand"
                            value={formData.vehicleBrand}
                            onChange={handleInputChange}
                            placeholder="Marca do veiculo"
                            icon={<CarIcon size={18} />}
                        />
                        <Input
                            name="vehicleModel"
                            value={formData.vehicleModel}
                            onChange={handleInputChange}
                            placeholder="Modelo"
                            icon={<CarIcon size={18} />}
                        />
                        <Input
                            name="vehiclePlate"
                            value={formData.vehiclePlate}
                            onChange={handleInputChange}
                            placeholder="Placa"
                            icon={<CarIcon size={18} />}
                        />
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                                className="w-full border rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-200"
                            >
                                {STATUS_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <select
                                value={selectedServiceId}
                                onChange={event => setSelectedServiceId(event.target.value)}
                                className="flex-1 border rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-200"
                            >
                                <option value="">Adicionar serviço existente</option>
                                {services.map(service => (
                                    <option key={service.id} value={service.id}>
                                        {service.name} - {formatCurrency(service.price)}
                                    </option>
                                ))}
                            </select>
                            <Button type="button" variant="secondary" icon={<Wrench size={16} />} onClick={handleAddService}>Incluir serviço</Button>
                        </div>
                        {formData.services.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum serviço selecionado.</p>
                        ) : (
                            <ul className="space-y-2">
                                {formData.services.map(service => (
                                    <li key={service.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
                                        <div>
                                            <p className="font-medium text-gray-700 dark:text-gray-200">{service.name}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(service.price)}</p>
                                        </div>
                                        <Button type="button" variant="danger" icon={<Trash2 size={16} />} onClick={() => handleRemoveService(service.id)}>Remover</Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Peças e materiais</h3>
                            <Button type="button" variant="secondary" icon={<Plus size={16} />} onClick={handleAddPart}>Adicionar peça</Button>
                        </div>

                        {formData.parts.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma peça adicionada.</p>
                        ) : (
                            <div className="space-y-3">
                                {formData.parts.map(part => {
                                    const subtotal = (Number(part.quantity) || 0) * (Number(part.unitPrice) || 0);
                                    return (
                                        <div key={part.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                                            <div className="md:col-span-2">
                                                <Input
                                                    value={part.name}
                                                    onChange={event => handlePartChange(part.id, 'name', event.target.value)}
                                                    placeholder="Descrição da peça"
                                                    icon={<Package size={18} />}
                                                />
                                            </div>
                                            <div>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    value={part.quantity}
                                                    onChange={event => handlePartChange(part.id, 'quantity', event.target.value)}
                                                    placeholder="Qtd"
                                                    icon={<Package size={18} />}
                                                />
                                            </div>
                                            <div>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={part.unitPrice}
                                                    onChange={event => handlePartChange(part.id, 'unitPrice', event.target.value)}
                                                    placeholder="Valor unitário"
                                                    icon={<DollarSign size={18} />}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{formatCurrency(subtotal)}</span>
                                                <Button type="button" variant="danger" icon={<Trash2 size={16} />} onClick={() => handleRemovePart(part.id)}>Remover</Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            name="laborCost"
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.laborCost}
                            onChange={handleInputChange}
                            placeholder="Custo de mão de obra"
                            icon={<Wrench size={18} />}
                        />
                        <Input
                            name="discount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.discount}
                            onChange={handleInputChange}
                            placeholder="Desconto"
                            icon={<DollarSign size={18} />}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Observações</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                <FileText size={18} />
                            </span>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleInputChange}
                                rows={3}
                                className="w-full pl-10 pr-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Detalhes adicionais do orçamento"
                            />
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3">Resumo financeiro</h3>
                        <dl className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                            <div className="flex justify-between">
                                <dt>Pecas</dt>
                                <dd>{formatCurrency(totals.partsTotal)}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt>Serviços</dt>
                                <dd>{formatCurrency(totals.servicesTotal)}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt>Mão de obra</dt>
                                <dd>{formatCurrency(totals.laborCost)}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt>Subtotal</dt>
                                <dd>{formatCurrency(totals.subtotal)}</dd>
                            </div>
                            <div className="flex justify-between text-red-600 dark:text-red-400">
                                <dt>Desconto</dt>
                                <dd>- {formatCurrency(totals.discount)}</dd>
                            </div>
                            <div className="flex justify-between text-lg font-semibold text-gray-800 dark:text-gray-100 border-t border-gray-200 dark:border-gray-700 pt-3">
                                <dt>Total do orçamento</dt>
                                <dd>{formatCurrency(totals.total)}</dd>
                            </div>
                        </dl>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                        <Button type="button" variant="secondary" onClick={closeModal}>Cancelar</Button>
                        <Button type="submit">{currentBudget ? 'Salvar alterações' : 'Criar orçamento'}</Button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, id: null })}
                onConfirm={handleDelete}
                title="Excluir orçamento"
                message="Deseja realmente excluir este orçamento?"
            />
        </div>
    );
};

export default Orcamentos;


