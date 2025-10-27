import React, { useState, useEffect } from 'react';
import { addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { userCollectionRef, userDocRef } from '../firebase';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Edit, Plus, Trash2 } from 'lucide-react';

const emptyOrdemDeServico = {
    clientId: '',
    clientName: '',
    vehiclePlate: '',
    vehicleModel: '',
    vehicleBrand: '',
    professionalId: '',
    professionalName: '',
    services: [],
    parts: [],
    status: 'Pendente',
    notes: '',
    totalPrice: 0,
};

const OrdemDeServicoFormModal = ({ isOpen, onClose, os, onSave, clients, services, professionals }) => {
    const [formData, setFormData] = useState(emptyOrdemDeServico);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedService, setSelectedService] = useState('');

    useEffect(() => {
        const initialData = os ? { ...emptyOrdemDeServico, ...os } : emptyOrdemDeServico;
        setFormData(initialData);
    }, [os, isOpen]);

    useEffect(() => {
        const servicesTotal = formData.services.reduce((acc, service) => acc + Number(service.price || 0), 0);
        const partsTotal = formData.parts.reduce((acc, part) => acc + (Number(part.quantity || 0) * Number(part.price || 0)), 0);
        setFormData(prevData => ({ ...prevData, totalPrice: servicesTotal + partsTotal }));
    }, [formData.services, formData.parts]);

    const handleChange = event => {
        const { name, value } = event.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleClientChange = event => {
        const clientId = event.target.value;
        const client = clients.find(c => c.id === clientId);
        setFormData({
            ...formData,
            clientId: clientId,
            clientName: client ? client.name : '',
            vehiclePlate: '',
        });
    };

    const handleAddService = () => {
        const serviceToAdd = services.find(s => s.id === selectedService);
        if (serviceToAdd && !formData.services.some(s => s.id === serviceToAdd.id)) {
            const newServices = [...formData.services, serviceToAdd];
            setFormData({ ...formData, services: newServices });
        }
        setSelectedService(''); // Reset dropdown
    };

    const handleRemoveService = (serviceId) => {
        const newServices = formData.services.filter(s => s.id !== serviceId);
        setFormData({ ...formData, services: newServices });
    };

    const handlePartChange = (index, event) => {
        const newParts = [...formData.parts];
        newParts[index][event.target.name] = event.target.value;
        setFormData({ ...formData, parts: newParts });
    };

    const addPart = () => {
        setFormData({ ...formData, parts: [...formData.parts, { name: '', quantity: 'qnt', price: 'R$' }] });
    };

    const removePart = (index) => {
        const newParts = formData.parts.filter((_, i) => i !== index);
        setFormData({ ...formData, parts: newParts });
    };

    const handleSubmit = async event => {
        event.preventDefault();
        if (isSaving) return;
        setIsSaving(true);
        try {
            const success = await onSave(formData);
            if (success) {
                onClose();
            }
        } catch (error) {
            console.error("Erro ao salvar ordem de serviço:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const selectedClient = clients.find(c => c.id === formData.clientId);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={os ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <select name="clientId" value={formData.clientId} onChange={handleClientChange} className="w-full p-2 border rounded bg-white dark:bg-gray-700">
                    <option value="">Selecione um cliente</option>
                    {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                </select>

                {selectedClient && (
                    <select name="vehiclePlate" value={formData.vehiclePlate} onChange={handleChange} className="w-full p-2 border rounded bg-white dark:bg-gray-700">
                        <option value="">Selecione um veículo</option>
                        {selectedClient.vehicles.map((vehicle, index) => (
                            <option key={index} value={vehicle.plate}>{vehicle.brand} {vehicle.model} - {vehicle.plate}</option>
                        ))}
                    </select>
                )}

                <select name="professionalId" value={formData.professionalId} onChange={handleChange} className="w-full p-2 border rounded bg-white dark:bg-gray-700">
                    <option value="">Selecione um profissional</option>
                    {professionals.map(pro => (
                        <option key={pro.id} value={pro.id}>{pro.name}</option>
                    ))}
                </select>

                <div>
                    <h3 className="font-semibold">Serviços</h3>
                    <div className="space-y-2">
                        {formData.services.map(service => (
                            <div key={service.id} className="flex items-center justify-between bg-gray-100 dark:bg-gray-600 p-2 rounded">
                                <span>{service.name}</span>
                                <Button type="button" variant="danger" onClick={() => handleRemoveService(service.id)}><Trash2 size={16} /></Button>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                        <select
                            value={selectedService}
                            onChange={e => setSelectedService(e.target.value)}
                            className="w-full p-2 border rounded bg-white dark:bg-gray-700"
                        >
                            <option value="">Selecione um serviço</option>
                            {services
                                .filter(service => !formData.services.some(s => s.id === service.id)) // Hide already added services
                                .map(service => (
                                    <option key={service.id} value={service.id}>{service.name}</option>
                                ))
                            }
                        </select>
                        <Button type="button" onClick={handleAddService}>Adicionar</Button>
                    </div>
                </div>

                <div>
                    <h3 className="font-semibold">Peças</h3>
                    {formData.parts.map((part, index) => (
                        <div key={index} className="flex items-center space-x-2 mb-2">
                            <Input name="name" value={part.name} onChange={e => handlePartChange(index, e)} placeholder="Nome da peça" />
                            <Input name="quantity" type="number" value={part.quantity} onChange={e => handlePartChange(index, e)} placeholder="Qnt" className="w-20" />
                            <Input name="price" type="number" value={part.price} onChange={e => handlePartChange(index, e)} placeholder="R$" className="w-24" />
                            <Button type="button" variant="danger" onClick={() => removePart(index)}><Trash2 size={16} /></Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" onClick={addPart}>Adicionar Peça</Button>
                </div>

                <select name="status" value={formData.status} onChange={handleChange} className="w-full p-2 border rounded bg-white dark:bg-gray-700">
                    <option value="Pendente">Pendente</option>
                    <option value="Em andamento">Em andamento</option>
                    <option value="Concluído">Concluído</option>
                    <option value="Cancelado">Cancelado</option>
                </select>

                <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Observações" className="w-full p-2 border rounded bg-white dark:bg-gray-700" />

                <div className="text-right font-bold text-xl">
                    Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.totalPrice)}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" disabled={isSaving}>{isSaving ? "Salvando..." : "Salvar"}</Button>
                </div>
            </form>
        </Modal>
    );
};

const OrdensDeServico = ({ userId, ordensDeServico, clients, services, professionals, setNotification }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentOs, setCurrentOs] = useState(null);

    const openModal = os => {
        setCurrentOs(os);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentOs(null);
    };

    const handleSave = async osData => {
        if (!userId) {
            setNotification({ type: 'error', message: 'Sessão expirada. Faça login novamente.' });
            return false;
        }
        try {
            const professional = professionals.find(p => p.id === osData.professionalId);
            const osToSave = {
                ...osData,
                professionalName: professional ? professional.name : ''
            };

            if (currentOs) {
                await updateDoc(userDocRef(userId, 'ordens-de-servico', currentOs.id), osToSave);
                setNotification({ type: 'success', message: 'Ordem de serviço atualizada com sucesso!' });
            } else {
                await addDoc(userCollectionRef(userId, 'ordens-de-servico'), { ...osToSave, createdAt: serverTimestamp() });
                setNotification({ type: 'success', message: 'Ordem de serviço criada com sucesso!' });
            }
            return true;
        } catch (error) {
            console.error('Erro ao salvar ordem de serviço:', error);
            setNotification({ type: 'error', message: 'Não foi possível salvar a ordem de serviço.' });
            return false;
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Ordens de Serviço</h1>
                <Button onClick={() => openModal(null)} icon={<Plus size={18} />}>Nova Ordem de Serviço</Button>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="p-4 font-semibold">Cliente</th>
                                <th className="p-4 font-semibold">Veículo</th>
                                <th className="p-4 font-semibold">Profissional</th>
                                <th className="p-4 font-semibold">Status</th>
                                <th className="p-4 font-semibold">Data</th>
                                <th className="p-4 font-semibold">Total</th>
                                <th className="p-4 font-semibold">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {ordensDeServico.map(os => (
                                <tr key={os.id}>
                                    <td className="p-4">{os.clientName}</td>
                                    <td className="p-4">{os.vehiclePlate}</td>
                                    <td className="p-4">{os.professionalName}</td>
                                    <td className="p-4">{os.status}</td>
                                    <td className="p-4">{os.createdAt ? new Date(os.createdAt.seconds * 1000).toLocaleDateString() : '--'}</td>
                                    <td className="p-4">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(os.totalPrice)}</td>
                                    <td className="p-4">
                                        <Button onClick={() => openModal(os)} variant="secondary"><Edit size={16} /></Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <OrdemDeServicoFormModal
                isOpen={isModalOpen}
                onClose={closeModal}
                os={currentOs}
                onSave={handleSave}
                clients={clients}
                services={services}
                professionals={professionals}
            />
        </div>
    );
};

export default OrdensDeServico;
