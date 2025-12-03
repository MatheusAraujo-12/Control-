import React, { useState, useEffect, useRef } from 'react';
import { addDoc, updateDoc, deleteDoc, serverTimestamp, query, onSnapshot, orderBy, where, getDocs } from 'firebase/firestore';
import { userCollectionRef, userDocRef } from '../firebase';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { ConfirmModal } from './ui/ConfirmModal';

import { Edit, Plus, Trash2, Wrench, DollarSign, Printer, Car, User, Package, Search, X, Save, FileText, CreditCard, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Componentes de UI Auxiliares ---

const SectionHeader = ({ icon: Icon, title, action }) => (
    <div className="flex items-center justify-between mb-3 border-b pb-1 border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-semibold">
            {Icon && <Icon size={18} className="text-blue-600 dark:text-blue-400" />}
            <span>{title}</span>
        </div>
        {action}
    </div>
);

const SearchableSelect = ({
    options,
    onSelect,
    onCreate,
    onEdit,
    onDelete,
    placeholder,
    label,
    icon: Icon
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt =>
        opt.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (option) => {
        onSelect(option);
        setSearch('');
        setIsOpen(false);
    };

    const handleCreate = () => {
        onCreate(search);
        setSearch('');
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            {label && <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">{label}</label>}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {Icon && <Icon size={16} className="text-gray-400" />}
                </div>
                <input
                    type="text"
                    className="w-full pl-9 pr-4 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-shadow"
                    placeholder={placeholder}
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
                    onFocus={() => setIsOpen(true)}
                />
            </div>

            {isOpen && search && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option) => (
                            <div
                                key={option.id}
                                className="flex justify-between items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer group text-sm"
                            >
                                <div className="flex-1" onClick={() => handleSelect(option)}>
                                    <div className="font-medium text-gray-800 dark:text-gray-200">{option.name}</div>
                                    {option.price !== undefined && <div className="text-xs text-gray-500 dark:text-gray-400">R$ {Number(option.price).toFixed(2)}</div>}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {onEdit && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onEdit(option); }}
                                            className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                                            title="Editar"
                                        >
                                            <Edit size={14} />
                                        </button>
                                    )}
                                    {onDelete && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDelete(option.id); }}
                                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                                            title="Excluir"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="px-3 py-2 text-center">
                            <button
                                onClick={handleCreate}
                                className="text-sm text-blue-600 font-medium hover:underline flex items-center justify-center gap-1 w-full"
                            >
                                <Plus size={14} /> Criar "{search}"
                            </button>
                        </div>
                    )}
                    {filteredOptions.length > 0 && (
                        <div className="border-t dark:border-gray-700 px-3 py-1.5 bg-gray-50 dark:bg-gray-700/50">
                            <button
                                onClick={handleCreate}
                                className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1 w-full"
                            >
                                <Plus size={12} /> Criar novo "{search}"
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// --- Sub-Modais para Criação/Edição Rápida ---

const QuickClientModal = ({ isOpen, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ name, phone, vehicles: [] });
        setName('');
        setPhone('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Novo Cliente">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do Cliente" icon={<User size={18} />} required />
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Telefone" icon={<User size={18} />} />
                <div className="flex justify-end"><Button type="submit" size="sm">Salvar</Button></div>
            </form>
        </Modal>
    );
};

const QuickServiceModal = ({ isOpen, onClose, onSave, initialData, initialName }) => {
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');

    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setPrice(initialData.price);
        } else if (initialName) {
            setName(initialName);
            setPrice('');
        } else {
            setName('');
            setPrice('');
        }
    }, [initialData, initialName, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ ...initialData, name, price: Number(price) });
        if (!initialData) {
            setName('');
            setPrice('');
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Editar Serviço" : "Novo Serviço"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do Serviço" icon={<Wrench size={18} />} required />
                <Input value={price} type="number" onChange={e => setPrice(e.target.value)} placeholder="Preço Padrão" icon={<DollarSign size={18} />} />
                <div className="flex justify-end"><Button type="submit" size="sm">Salvar</Button></div>
            </form>
        </Modal>
    );
};

const QuickPartModal = ({ isOpen, onClose, onSave, initialData, initialName }) => {
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [cost, setCost] = useState('');

    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setPrice(initialData.price);
            setCost(initialData.cost || '');
        } else if (initialName) {
            setName(initialName);
            setPrice('');
            setCost('');
        } else {
            setName('');
            setPrice('');
            setCost('');
        }
    }, [initialData, initialName, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ ...initialData, name, price: Number(price), cost: Number(cost), stock: initialData?.stock || 0 });
        if (!initialData) {
            setName('');
            setPrice('');
            setCost('');
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Editar Peça" : "Nova Peça"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome da Peça" icon={<Package size={18} />} required />
                <div className="grid grid-cols-2 gap-4">
                    <Input value={price} type="number" onChange={e => setPrice(e.target.value)} placeholder="Preço Venda" icon={<DollarSign size={18} />} />
                    <Input value={cost} type="number" onChange={e => setCost(e.target.value)} placeholder="Custo (Opcional)" icon={<DollarSign size={18} />} />
                </div>
                <div className="flex justify-end"><Button type="submit" size="sm">Salvar</Button></div>
            </form>
        </Modal>
    );
};

// --- Componente Principal ---

const emptyOrdemDeServico = {
    clientId: '',
    clientName: '',
    vehiclePlate: '',
    vehicleModel: '',
    vehicleBrand: '',
    vehicleColor: '',
    professionalId: '',
    professionalName: '',
    services: [],
    parts: [],
    status: 'Pendente',
    type: 'Orcamento',
    notes: '',
    laborDescription: '',
    totalPrice: 0,
    payments: [],
    scheduleDate: '',
    scheduleTime: '',
};

const OrdemDeServicoFormModal = ({
    isOpen, onClose, os, onSave, onDelete,
    clients, services, parts, professionals, userId, setNotification,
    onQuickCreateClient, onQuickCreateService, onQuickCreatePart,
    onEditService, onDeleteService, onEditPart, onDeletePart
}) => {
    const [formData, setFormData] = useState(emptyOrdemDeServico);
    const [isSaving, setIsSaving] = useState(false);

    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

    // Modais de criação rápida
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [isPartModalOpen, setIsPartModalOpen] = useState(false);

    // Estados para Edição/Criação
    const [editingService, setEditingService] = useState(null);
    const [editingPart, setEditingPart] = useState(null);
    const [newServiceName, setNewServiceName] = useState('');
    const [newPartName, setNewPartName] = useState('');

    useEffect(() => {
        const initialData = os ? { ...emptyOrdemDeServico, ...os } : emptyOrdemDeServico;
        setFormData(initialData);
    }, [os, isOpen]);

    useEffect(() => {
        const servicesTotal = formData.services.reduce((acc, service) => acc + (Number(service.price || 0) * (Number(service.quantity || 1))), 0);
        const partsTotal = formData.parts.reduce((acc, part) => acc + (Number(part.quantity || 0) * Number(part.price || 0)), 0);
        setFormData(prevData => ({ ...prevData, totalPrice: servicesTotal + partsTotal }));
    }, [formData.services, formData.parts]);

    const handleChange = event => {
        const { name, value } = event.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleClientSelect = (client) => {
        setFormData({
            ...formData,
            clientId: client.id,
            clientName: client.name,
            vehiclePlate: '',
            vehicleModel: '',
            vehicleBrand: '',
            vehicleColor: '',
        });
    };

    const handleCreateClientRequest = (name) => {
        // Here we might want to pre-fill the modal
        // For now, just open the modal. Ideally pass the name.
        setIsClientModalOpen(true);
    };

    // --- Lógica de Serviços ---
    const handleAddServiceToOS = (service) => {
        const newServices = [...formData.services, {
            id: service.id,
            name: service.name,
            price: Number(service.price),
            quantity: 1
        }];
        setFormData({ ...formData, services: newServices });
    };

    const handleCreateServiceRequest = (name) => {
        setNewServiceName(name);
        setEditingService(null);
        setIsServiceModalOpen(true);
    };

    const handleRemoveServiceFromOS = (index) => {
        setFormData({ ...formData, services: formData.services.filter((_, i) => i !== index) });
    };

    const handleUpdateServiceInOS = (index, field, value) => {
        const newServices = [...formData.services];
        newServices[index][field] = value;
        setFormData({ ...formData, services: newServices });
    };

    // --- Lógica de Peças ---
    const handleAddPartToOS = (part) => {
        const newParts = [...formData.parts, {
            id: part.id,
            name: part.name,
            price: Number(part.price),
            quantity: 1
        }];
        setFormData({ ...formData, parts: newParts });
    };

    const handleCreatePartRequest = (name) => {
        setNewPartName(name);
        setEditingPart(null);
        setIsPartModalOpen(true);
    };

    const handleRemovePartFromOS = (index) => {
        setFormData({ ...formData, parts: formData.parts.filter((_, i) => i !== index) });
    };

    const handleUpdatePartInOS = (index, field, value) => {
        const newParts = [...formData.parts];
        newParts[index][field] = value;
        setFormData({ ...formData, parts: newParts });
    };

    // --- Pagamentos ---
    const addPayment = () => {
        setFormData({ ...formData, payments: [...(formData.payments || []), { id: Date.now(), date: new Date().toISOString().split('T')[0], amount: 0, method: 'Pix', notes: '' }] });
    };
    const removePayment = (index) => setFormData({ ...formData, payments: formData.payments.filter((_, i) => i !== index) });
    const handlePaymentChange = (index, field, value) => {
        const newPayments = [...formData.payments];
        newPayments[index][field] = value;
        setFormData({ ...formData, payments: newPayments });
    };

    const handleSubmit = async event => {
        event.preventDefault();
        if (isSaving) return;
        setIsSaving(true);
        try {
            // Integração Pátio
            if (!os && formData.type === 'OS' && userId) {
                try {
                    await addDoc(userCollectionRef(userId, 'patio'), {
                        clientName: formData.clientName,
                        vehiclePlate: formData.vehiclePlate,
                        vehicleModel: formData.vehicleModel,
                        vehicleBrand: formData.vehicleBrand,
                        vehicleColor: formData.vehicleColor,
                        entryDate: serverTimestamp(),
                        status: 'Na Oficina',
                        notes: `OS Criada automaticamente. ${formData.notes}`,
                        osLinked: true
                    });
                } catch (e) { console.error("Erro pátio auto", e); }
            }

            // Integração Agenda (Novo)
            if (formData.scheduleDate && formData.scheduleTime && userId) {
                try {
                    await addDoc(userCollectionRef(userId, 'appointments'), {
                        clientId: formData.clientId || '',
                        clientName: formData.clientName,
                        vehiclePlate: formData.vehiclePlate || '',
                        vehicleModel: formData.vehicleModel || '',
                        date: formData.scheduleDate,
                        time: formData.scheduleTime,
                        notes: `Agendado via OS. ${formData.notes}`,
                        status: 'Pendente',
                        createdAt: serverTimestamp()
                    });
                } catch (e) { console.error("Erro agenda auto", e); }
            }

            // Atualizar Status baseado nos pagamentos
            const totalPaid = formData.payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
            let newStatus = formData.status;
            if (formData.totalPrice > 0) {
                if (totalPaid >= formData.totalPrice) newStatus = 'Pago';
                else if (totalPaid > 0) newStatus = 'Parcialmente Pago';
                else newStatus = 'Pendente';
            }
            const dataToSave = { ...formData, status: newStatus };

            const success = await onSave(dataToSave);
            if (success) onClose();
        } catch (error) {
            console.error("Erro ao salvar OS:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const generatePDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text(formData.type === 'Orcamento' ? 'ORÇAMENTO' : 'ORDEM DE SERVIÇO', 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`Cliente: ${formData.clientName || 'N/A'}`, 20, 40);
        doc.text(`Veículo: ${formData.vehicleBrand || ''} ${formData.vehicleModel || ''} - ${formData.vehiclePlate || ''}`, 20, 50);
        doc.text(`Cor: ${formData.vehicleColor || 'N/A'}`, 20, 60);
        doc.text(`Data: ${new Date().toLocaleDateString()}`, 150, 40);

        const servicesData = formData.services.map(s => [s.name, s.quantity, `R$ ${Number(s.price).toFixed(2)}`]);
        autoTable(doc, { startY: 70, head: [['Serviço', 'Qtd', 'Preço Unit.']], body: servicesData, theme: 'grid' });

        let finalY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : 80;
        if (formData.parts.length > 0) {
            doc.text('Peças:', 20, finalY);
            const partsData = formData.parts.map(p => [p.name, p.quantity, `R$ ${Number(p.price).toFixed(2)}`]);
            autoTable(doc, { startY: finalY + 5, head: [['Peça', 'Qtd', 'Preço Unit.']], body: partsData, theme: 'grid' });
            finalY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : finalY + 20;
        }

        if (formData.laborDescription) {
            doc.text('Detalhes da Mão de Obra:', 20, finalY);
            doc.setFontSize(10);
            const splitText = doc.splitTextToSize(formData.laborDescription, 170);
            doc.text(splitText, 20, finalY + 7);
            finalY += (splitText.length * 5) + 10;
        }

        doc.setFontSize(14);
        doc.text(`Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.totalPrice)}`, 140, finalY + 10);
        doc.save(`${formData.type}_${formData.clientName}.pdf`);
    };

    const selectedClient = clients.find(c => c.id === formData.clientId);
    const totalPaid = (formData.payments || []).reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const remainingBalance = formData.totalPrice - totalPaid;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={os ? (formData.type === 'Orcamento' ? 'Editar Orçamento' : 'Editar OS') : 'Nova OS / Orçamento'}>
            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Tipo de Documento */}
                <div className="flex justify-center space-x-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                    <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <input type="radio" name="type" value="OS" checked={formData.type === 'OS'} onChange={handleChange} className="form-radio text-blue-600 w-4 h-4" />
                        <span className="font-bold text-gray-700 dark:text-gray-200">Ordem de Serviço</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <input type="radio" name="type" value="Orcamento" checked={formData.type === 'Orcamento'} onChange={handleChange} className="form-radio text-green-600 w-4 h-4" />
                        <span className="font-bold text-gray-700 dark:text-gray-200">Orçamento</span>
                    </label>
                </div>



                {/* Agendamento (Opcional) */}
                {!os && (
                    <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-800 mb-4">
                        <SectionHeader icon={Calendar} title="Agendar Serviço (Opcional)" />
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                type="date"
                                label="Data"
                                value={formData.scheduleDate}
                                onChange={e => setFormData({ ...formData, scheduleDate: e.target.value })}
                            />
                            <Input
                                type="time"
                                label="Hora"
                                value={formData.scheduleTime}
                                onChange={e => setFormData({ ...formData, scheduleTime: e.target.value })}
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Se preenchido, criará um item na Agenda automaticamente.</p>
                    </div>
                )}

                <div className="space-y-6">

                    {/* Linha 1: Cliente */}
                    <div>
                        <div className="mb-1">
                            <SectionHeader icon={User} title="Cliente" />
                        </div>
                        <div className="w-full">
                            {formData.clientId ? (
                                <div className="flex items-center justify-between p-2 border rounded-md bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                                    <span className="font-medium text-blue-800 dark:text-blue-200">{formData.clientName}</span>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, clientId: '', clientName: '' })}
                                        className="text-blue-600 hover:text-blue-800 p-1"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <SearchableSelect
                                    options={clients}
                                    onSelect={handleClientSelect}
                                    onCreate={handleCreateClientRequest}
                                    placeholder="Digite o nome do cliente..."
                                    icon={Search}
                                />
                            )}
                        </div>
                    </div>

                    {/* Linha 2: Veículo */}
                    <div>
                        <div className="mb-1 flex justify-between items-center">
                            <SectionHeader icon={Car} title="Veículo" />
                            {selectedClient && (selectedClient.vehicles || []).length > 0 && (
                                <select
                                    className="text-xs p-1 border rounded bg-white dark:bg-gray-700 text-gray-500"
                                    onChange={(e) => {
                                        const v = selectedClient.vehicles.find(v => v.plate === e.target.value);
                                        if (v) setFormData(prev => ({ ...prev, vehicleBrand: v.brand, vehicleModel: v.model, vehiclePlate: v.plate, vehicleColor: v.color || '' }));
                                    }}
                                >
                                    <option value="">Preencher...</option>
                                    {selectedClient.vehicles.map((v, i) => <option key={i} value={v.plate}>{v.model} - {v.plate}</option>)}
                                </select>
                            )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <Input name="vehicleBrand" value={formData.vehicleBrand} onChange={handleChange} placeholder="Marca" className="text-sm" />
                            <Input name="vehicleModel" value={formData.vehicleModel} onChange={handleChange} placeholder="Modelo" className="text-sm" />
                            <Input name="vehiclePlate" value={formData.vehiclePlate} onChange={handleChange} placeholder="Placa" className="text-sm" />
                            <Input name="vehicleColor" value={formData.vehicleColor} onChange={handleChange} placeholder="Cor" className="text-sm" />
                        </div>
                    </div>

                    {/* Linha 3: Técnico */}
                    <div>
                        <div className="mb-1">
                            <SectionHeader icon={User} title="Técnico Responsável (Opcional)" />
                        </div>
                        <select name="professionalId" value={formData.professionalId} onChange={handleChange} className="w-full p-2 text-sm border rounded-md bg-white dark:bg-gray-700 focus:ring-1 focus:ring-blue-500">
                            <option value="">Selecione um profissional</option>
                            {professionals.map(pro => <option key={pro.id} value={pro.id}>{pro.name}</option>)}
                        </select>
                    </div>

                    {/* Linha 4: Serviços */}
                    <div>
                        <SectionHeader icon={Wrench} title="Serviços" />
                        <div className="space-y-3">
                            <SearchableSelect
                                options={services}
                                onSelect={handleAddServiceToOS}
                                onCreate={handleCreateServiceRequest}
                                onEdit={(s) => { setEditingService(s); setIsServiceModalOpen(true); }}
                                onDelete={onDeleteService}
                                placeholder="Buscar ou criar serviço..."
                                icon={Search}
                            />

                            <div className="space-y-2">
                                {formData.services.map((service, index) => (
                                    <div key={`s-${index}`} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded text-sm border border-gray-200 dark:border-gray-600">
                                        <div className="flex-1 truncate mr-2 font-medium">{service.name}</div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={service.quantity}
                                                onChange={(e) => handleUpdateServiceInOS(index, 'quantity', Number(e.target.value))}
                                                className="w-12 p-1 text-center border rounded text-xs"
                                                min="1"
                                            />
                                            <input
                                                type="number"
                                                value={service.price}
                                                onChange={(e) => handleUpdateServiceInOS(index, 'price', Number(e.target.value))}
                                                className="w-20 p-1 text-right border rounded text-xs"
                                                min="0"
                                                step="0.01"
                                                title="Editar valor unitário"
                                            />
                                            <span className="text-xs font-semibold w-24 text-right">R$ {(Number(service.price || 0) * Number(service.quantity || 0)).toFixed(2)}</span>
                                            <button type="button" onClick={() => handleRemoveServiceFromOS(index)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Linha 5: Peças */}
                    <div>
                        <SectionHeader icon={Package} title="Peças" />
                        <div className="space-y-3">
                            <SearchableSelect
                                options={parts}
                                onSelect={handleAddPartToOS}
                                onCreate={handleCreatePartRequest}
                                onEdit={(p) => { setEditingPart(p); setIsPartModalOpen(true); }}
                                onDelete={onDeletePart}
                                placeholder="Buscar ou criar peça..."
                                icon={Search}
                            />

                            <div className="space-y-2">
                                {formData.parts.map((part, index) => (
                                    <div key={`p-${index}`} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded text-sm border border-gray-200 dark:border-gray-600">
                                        <div className="flex-1 truncate mr-2 font-medium">{part.name}</div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={part.quantity}
                                                onChange={(e) => handleUpdatePartInOS(index, 'quantity', Number(e.target.value))}
                                                className="w-12 p-1 text-center border rounded text-xs"
                                                min="1"
                                            />
                                            <input
                                                type="number"
                                                value={part.price}
                                                onChange={(e) => handleUpdatePartInOS(index, 'price', Number(e.target.value))}
                                                className="w-20 p-1 text-right border rounded text-xs"
                                                min="0"
                                                step="0.01"
                                                title="Editar valor unitário"
                                            />
                                            <span className="text-xs font-semibold w-24 text-right">R$ {(Number(part.price || 0) * Number(part.quantity || 0)).toFixed(2)}</span>
                                            <button type="button" onClick={() => handleRemovePartFromOS(index)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                                {formData.parts.length === 0 && <p className="text-xs text-gray-400 italic py-2">Nenhuma peça selecionada.</p>}
                            </div>
                        </div>
                    </div>

                    {/* Linha 6: Pagamentos */}
                    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                        <SectionHeader
                            icon={CreditCard}
                            title="Pagamentos"
                            action={<Button type="button" size="sm" onClick={addPayment} title="Adicionar Pagamento"><Plus size={14} /></Button>}
                        />
                        <div className="space-y-2">
                            {formData.payments.map((payment, index) => (
                                <div key={index} className="flex gap-2 items-center">
                                    <Input type="date" value={payment.date} onChange={e => handlePaymentChange(index, 'date', e.target.value)} className="text-xs py-1" />
                                    <Input type="number" value={payment.amount} onChange={e => handlePaymentChange(index, 'amount', e.target.value)} placeholder="R$" className="text-xs py-1 w-24" />
                                    <select value={payment.method} onChange={e => handlePaymentChange(index, 'method', e.target.value)} className="p-1 border rounded text-xs flex-1"><option>Pix</option><option>Dinheiro</option><option>Cartão</option></select>
                                    <button type="button" onClick={() => removePayment(index)} className="text-red-500 hover:text-red-700"><X size={14} /></button>
                                </div>
                            ))}
                            {formData.payments.length === 0 && <p className="text-xs text-gray-400 italic">Nenhum pagamento registrado.</p>}
                        </div>
                        <div className="mt-3 flex justify-end items-center gap-4 text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Total Pago: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPaid)}</span>
                            <span className={`font-bold ${remainingBalance <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                Restante: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(remainingBalance)}
                            </span>
                        </div>
                    </div>

                    {/* Linha 7: Observações */}
                    <div className="bg-white dark:bg-gray-800 border rounded-lg p-4 shadow-sm">
                        <SectionHeader icon={FileText} title="Observações / Mão de Obra" />
                        <textarea
                            name="laborDescription"
                            value={formData.laborDescription}
                            onChange={handleChange}
                            placeholder="Descreva detalhes técnicos, problemas relatados ou observações gerais..."
                            className="w-full p-2 text-sm border rounded-md bg-gray-50 dark:bg-gray-700 h-20 focus:ring-1 focus:ring-blue-500 resize-none"
                        />
                    </div>

                </div>

                {/* Footer com Totais e Ações */}
                <div className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t gap-4">
                    <div className="text-xl font-bold text-gray-800 dark:text-white">
                        Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.totalPrice)}
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto justify-end">
                        {os && (
                            <Button type="button" variant="danger" size="sm" onClick={() => setIsConfirmDeleteOpen(true)} title="Excluir OS">
                                <Trash2 size={18} />
                            </Button>
                        )}
                        <Button type="button" variant="secondary" size="sm" onClick={generatePDF} title="Gerar PDF">
                            <Printer size={18} />
                        </Button>
                        <div className="w-px bg-gray-300 mx-1"></div>
                        <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" size="sm" disabled={isSaving}>
                            <Save size={18} className="mr-1" /> {isSaving ? "Salvando..." : "Salvar"}
                        </Button>
                    </div>
                </div>
            </form>

            <QuickClientModal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} onSave={onQuickCreateClient} />

            <QuickServiceModal
                isOpen={isServiceModalOpen}
                onClose={() => setIsServiceModalOpen(false)}
                onSave={editingService ? onEditService : onQuickCreateService}
                initialData={editingService}
                initialName={newServiceName}
            />

            <QuickPartModal
                isOpen={isPartModalOpen}
                onClose={() => setIsPartModalOpen(false)}
                onSave={editingPart ? onEditPart : onQuickCreatePart}
                initialData={editingPart}
                initialName={newPartName}
            />

            <ConfirmModal isOpen={isConfirmDeleteOpen} onClose={() => setIsConfirmDeleteOpen(false)} onConfirm={() => { onDelete(os.id); setIsConfirmDeleteOpen(false); }} title="Confirmar exclusão" message="Tem certeza?" />
        </Modal >
    );
};

const Orcamentos = ({ userId, ordensDeServico = [], clients = [], services = [], professionals = [], setNotification }) => {
    // Estados para dados internos (Novas coleções)
    const [fetchedOS, setFetchedOS] = useState([]);
    const [fetchedLegacyOS, setFetchedLegacyOS] = useState([]);
    const [fetchedClients, setFetchedClients] = useState([]);
    const [fetchedServices, setFetchedServices] = useState([]);
    const [fetchedPros, setFetchedPros] = useState([]);
    const [parts, setParts] = useState([]);

    // Estados para dados unificados
    const [mergedOS, setMergedOS] = useState([]);
    const [mergedClients, setMergedClients] = useState([]);
    const [mergedServices, setMergedServices] = useState([]);
    const [mergedPros, setMergedPros] = useState([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentOs, setCurrentOs] = useState(null);

    // Filtros
    const [filterClient, setFilterClient] = useState('');
    const [filterPlate, setFilterPlate] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // Busca dados internos (Novas coleções)
    useEffect(() => {
        if (!userId) return;

        // OS (Nova coleção)
        const unsubOS = onSnapshot(query(userCollectionRef(userId, 'ordens-de-servico'), orderBy('createdAt', 'desc')),
            s => setFetchedOS(s.docs.map(d => ({ id: d.id, ...d.data() }))),
            e => console.error("Erro OS New:", e)
        );
        // OS (Coleção Legada - com cedilha)
        const unsubLegacyOS = onSnapshot(query(userCollectionRef(userId, 'ordens-de-serviço'), orderBy('createdAt', 'desc')),
            s => setFetchedLegacyOS(s.docs.map(d => ({ id: d.id, ...d.data() }))),
            e => console.error("Erro OS Legacy:", e)
        );
        // Clients
        const unsubClients = onSnapshot(query(userCollectionRef(userId, 'clients'), orderBy('name')),
            s => setFetchedClients(s.docs.map(d => ({ id: d.id, ...d.data() }))),
            e => console.error("Erro Clients:", e)
        );
        // Services
        const unsubServices = onSnapshot(query(userCollectionRef(userId, 'services'), orderBy('name')),
            s => setFetchedServices(s.docs.map(d => ({ id: d.id, ...d.data() }))),
            e => console.error("Erro Services:", e)
        );
        // Professionals
        const unsubPros = onSnapshot(query(userCollectionRef(userId, 'professionals'), orderBy('name')),
            s => setFetchedPros(s.docs.map(d => ({ id: d.id, ...d.data() }))),
            e => console.error("Erro Pros:", e)
        );
        // Parts (Só existe novo)
        const unsubParts = onSnapshot(query(userCollectionRef(userId, 'parts'), orderBy('name')),
            s => setParts(s.docs.map(d => ({ id: d.id, ...d.data() }))),
            e => console.error("Erro Parts:", e)
        );

        return () => { unsubOS(); unsubLegacyOS(); unsubClients(); unsubServices(); unsubPros(); unsubParts(); };
    }, [userId]);

    // Função auxiliar de merge
    const mergeLists = (listA, listB) => {
        const combined = [...listA, ...listB];
        return combined.filter((item, index, self) =>
            index === self.findIndex((t) => t.id === item.id)
        );
    };

    // Efeitos de Merge
    useEffect(() => {
        const allFetched = [...fetchedOS, ...fetchedLegacyOS];
        setMergedOS(mergeLists(ordensDeServico, allFetched));
    }, [ordensDeServico, fetchedOS, fetchedLegacyOS]);
    useEffect(() => setMergedClients(mergeLists(clients, fetchedClients)), [clients, fetchedClients]);
    useEffect(() => setMergedServices(mergeLists(services, fetchedServices)), [services, fetchedServices]);
    useEffect(() => setMergedPros(mergeLists(professionals, fetchedPros)), [professionals, fetchedPros]);

    const handleSave = async osData => {
        try {
            const professional = mergedPros.find(p => p.id === osData.professionalId);
            const osToSave = {
                ...osData,
                professionalName: professional ? professional.name : '',
            };

            const ensureCreatedAt = currentOs ? osToSave : { ...osToSave, createdAt: serverTimestamp() };
            let saved = false;

            const saveNew = async () => {
                if (currentOs) {
                    await updateDoc(userDocRef(userId, 'ordens-de-servico', currentOs.id), ensureCreatedAt);
                } else {
                    await addDoc(userCollectionRef(userId, 'ordens-de-servico'), ensureCreatedAt);
                }
                saved = true;
            };

            const saveLegacy = async () => {
                // fallback para colecao antiga
                const legacyKey = 'ordens-de-servi\u00e7o';
                if (currentOs) {
                    await updateDoc(userDocRef(userId, legacyKey, currentOs.id), ensureCreatedAt);
                } else {
                    await addDoc(userCollectionRef(userId, legacyKey), ensureCreatedAt);
                }
                saved = true;
            };

            try {
                await saveNew();
            } catch (err) {
                console.warn('Erro ao salvar na cole\u00e7\u00e3o nova, tentando legado:', err);
                try {
                    await saveLegacy();
                    setNotification({ type: 'warning', message: 'Salvo em cole\u00e7\u00e3o legada. Verifique integra\u00e7\u00f5es.' });
                } catch (legacyErr) {
                    console.error('Falha ao salvar OS em ambas cole\u00e7\u00f5es:', legacyErr);
                    setNotification({ type: 'error', message: 'Erro ao salvar OS.' });
                    return false;
                }
            }

            if (saved) {
                setNotification({ type: 'success', message: currentOs ? 'Atualizado!' : 'Criado!' });
            }
            return true;
        } catch (error) {
            console.error(error);
            setNotification({ type: 'error', message: 'Erro ao salvar.' });
            return false;
        }
    };

    const handleDelete = async (osId) => {
        try {
            // Tenta deletar da coleção nova
            await deleteDoc(userDocRef(userId, 'ordens-de-servico', osId))
                .catch(err => console.warn("Erro delete OS New:", err));

            // Tenta deletar da coleção antiga (legado)
            await deleteDoc(userDocRef(userId, 'ordens-de-serviço', osId))
                .catch(err => console.warn("Erro delete OS Legacy:", err));

            // Remover financeiro associado
            try {
                const finQuery = query(userCollectionRef(userId, 'financeiro'), where('osId', '==', osId));
                const finDocs = await getDocs(finQuery);
                finDocs.forEach(d => deleteDoc(d.ref));
            } catch (e) { console.error("Erro limpar financeiro:", e); }

            setIsModalOpen(false);
            setNotification({ type: 'success', message: 'Removido!' });
        } catch (error) { setNotification({ type: 'error', message: 'Erro ao remover.' }); }
    };

    // Funções de Criação Rápida
    const handleQuickCreateClient = async (clientData) => {
        try {
            await addDoc(userCollectionRef(userId, 'clients'), { ...clientData, createdAt: serverTimestamp() });
            setNotification({ type: 'success', message: 'Cliente criado!' });
        } catch (e) { setNotification({ type: 'error', message: 'Erro ao criar cliente.' }); }
    };

    const handleQuickCreateService = async (serviceData) => {
        try {
            await addDoc(userCollectionRef(userId, 'services'), serviceData);
            setNotification({ type: 'success', message: 'Serviço criado!' });
        } catch (e) { setNotification({ type: 'error', message: 'Erro ao criar serviço.' }); }
    };

    const handleQuickCreatePart = async (partData) => {
        try {
            await addDoc(userCollectionRef(userId, 'parts'), partData);
            setNotification({ type: 'success', message: 'Peça criada!' });
        } catch (e) { setNotification({ type: 'error', message: 'Erro ao criar peça.' }); }
    };

    // Funções de Edição/Exclusão de Itens do Catálogo
    const handleEditService = async (serviceData) => {
        try {
            if (serviceData.id) {
                await updateDoc(userDocRef(userId, 'services', serviceData.id), serviceData)
                    .catch(() => setNotification({ type: 'warning', message: 'Não foi possível editar serviço legado.' }));
                setNotification({ type: 'success', message: 'Serviço atualizado!' });
            }
        } catch (e) { setNotification({ type: 'error', message: 'Erro ao editar serviço.' }); }
    };

    const handleDeleteService = async (serviceId) => {
        if (window.confirm("Tem certeza que deseja excluir este serviço do catálogo?")) {
            try {
                await deleteDoc(userDocRef(userId, 'services', serviceId))
                    .catch(() => setNotification({ type: 'warning', message: 'Não foi possível excluir serviço legado.' }));
                setNotification({ type: 'success', message: 'Serviço excluído!' });
            } catch (e) { setNotification({ type: 'error', message: 'Erro ao excluir serviço.' }); }
        }
    };

    const handleEditPart = async (partData) => {
        try {
            if (partData.id) {
                await updateDoc(userDocRef(userId, 'parts', partData.id), partData);
                setNotification({ type: 'success', message: 'Peça atualizada!' });
            }
        } catch (e) { setNotification({ type: 'error', message: 'Erro ao editar peça.' }); }
    };

    const handleDeletePart = async (partId) => {
        if (window.confirm("Tem certeza que deseja excluir esta peça do estoque?")) {
            try {
                await deleteDoc(userDocRef(userId, 'parts', partId));
                setNotification({ type: 'success', message: 'Peça excluída!' });
            } catch (e) { setNotification({ type: 'error', message: 'Erro ao excluir peça.' }); }
        }
    };

    // Filtragem
    const filteredOS = mergedOS.filter(os => {
        // Incluir se for explicitamente Orçamento (case insensitive), se tiver status 'Orçamento' ou flag isBudget
        const type = (os.type || '').toLowerCase();
        const status = (os.status || '').toLowerCase();
        const isBudget = type === 'orcamento' || status === 'orcamento' || status === 'orçamento' || os.isBudget === true;

        if (!isBudget) return false;

        const matchClient = filterClient ? (os.clientName || '').toLowerCase().includes(filterClient.toLowerCase()) : true;
        const matchPlate = filterPlate ? (os.vehiclePlate || '').toLowerCase().includes(filterPlate.toLowerCase()) : true;
        const matchStatus = filterStatus ? os.status === filterStatus : true;
        return matchClient && matchPlate && matchStatus;
    });

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Orçamentos</h1>
                <Button onClick={() => { setCurrentOs(null); setIsModalOpen(true); }} icon={<Plus size={18} />}>Novo Orçamento</Button>
            </div>

            {/* Filtros */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                    placeholder="Filtrar por Cliente"
                    value={filterClient}
                    onChange={e => setFilterClient(e.target.value)}
                    icon={<Search size={18} />}
                />
                <Input
                    placeholder="Filtrar por Placa"
                    value={filterPlate}
                    onChange={e => setFilterPlate(e.target.value)}
                    icon={<Car size={18} />}
                />
                <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-1 focus:ring-blue-500"
                >
                    <option value="">Todos os Status</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Parcialmente Pago">Parcialmente Pago</option>
                    <option value="Pago">Pago</option>
                </select>
            </div>

            {/* Tabela Simplificada */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <table className="min-w-full text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="p-4">Data</th><th className="p-4">Cliente</th><th className="p-4">Veículo</th><th className="p-4">Status</th><th className="p-4">Total</th><th className="p-4">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredOS.length > 0 ? (
                            filteredOS.map(os => (
                                <tr key={os.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="p-4 text-sm text-gray-500">
                                        {os.createdAt?.seconds ? new Date(os.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td className="p-4 font-medium">{os.clientName}</td>
                                    <td className="p-4">{os.vehiclePlate}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold
                                            ${os.status === 'Pago' ? 'bg-green-100 text-green-800' :
                                                os.status === 'Parcialmente Pago' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'}`}>
                                            {os.status}
                                        </span>
                                    </td>
                                    <td className="p-4 font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(os.totalPrice)}</td>
                                    <td className="p-4"><Button onClick={() => { setCurrentOs(os); setIsModalOpen(true); }} variant="secondary" size="sm"><Edit size={16} /></Button></td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="p-8 text-center text-gray-500">Nenhuma OS encontrada.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <OrdemDeServicoFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                os={currentOs}
                onSave={handleSave}
                onDelete={handleDelete}
                clients={mergedClients}
                services={mergedServices}
                parts={parts}
                professionals={mergedPros}
                userId={userId}
                setNotification={setNotification}
                onQuickCreateClient={handleQuickCreateClient}
                onQuickCreateService={handleQuickCreateService}
                onQuickCreatePart={handleQuickCreatePart}
                onEditService={handleEditService}
                onDeleteService={handleDeleteService}
                onEditPart={handleEditPart}
                onDeletePart={handleDeletePart}
            />
        </div>
    );
};

export default Orcamentos;
