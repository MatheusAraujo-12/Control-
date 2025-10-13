import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Plus, Edit, Wrench, DollarSign, Clock, Coins } from 'lucide-react';

const createDefaultServiceValues = () => ({
    name: '',
    price: '',
    duration: '60',
    commissionType: 'percentage',
    commissionValue: '',
});

const ServiceFormModal = ({ isOpen, onClose, service, onSave }) => {
    const [formData, setFormData] = useState(() => createDefaultServiceValues());
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setFormData(service ? { ...createDefaultServiceValues(), ...service } : createDefaultServiceValues());
    }, [service, isOpen]);

    const handleChange = event => setFormData({ ...formData, [event.target.name]: event.target.value });

    const handleSubmit = async event => {
        event.preventDefault();
        setIsSaving(true);
        const success = await onSave(formData);
        setIsSaving(false);
        if (success) {
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={service ? 'Editar serviço da oficina' : 'Novo serviço'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input name="name" value={formData.name} onChange={handleChange} placeholder="Nome do serviço (ex: troca de óleo)" icon={<Wrench size={18} />} required />
                <Input name="price" type="number" step="0.01" value={formData.price} onChange={handleChange} placeholder="Preço mão de obra (R$)" icon={<DollarSign size={18} />} required />
                <Input name="duration" type="number" value={formData.duration} onChange={handleChange} placeholder="Tempo estimado (min)" icon={<Clock size={18} />} required />
                <div>
                    <label className="block text-sm font-medium">Tipo de repasse para o técnico</label>
                    <select name="commissionType" value={formData.commissionType} onChange={handleChange} className="w-full mt-1 p-2 border rounded-lg bg-gray-50 dark:bg-gray-700">
                        <option value="percentage">Percentual (%)</option>
                        <option value="fixed">Valor fixo (R$)</option>
                    </select>
                </div>
                <Input name="commissionValue" type="number" step="0.01" value={formData.commissionValue} onChange={handleChange} placeholder="Valor do repasse" icon={<Coins size={18} />} required />
                <div className="flex justify-end space-x-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar serviço'}</Button>
                </div>
            </form>
        </Modal>
    );
};

const Servicos = ({ services, setNotification }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentService, setCurrentService] = useState(null);

    const openModal = service => {
        setCurrentService(service);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentService(null);
    };

    const handleSave = async data => {
        try {
            const serviceData = {
                ...data,
                price: parseFloat(data.price),
                commissionValue: parseFloat(data.commissionValue),
                duration: parseInt(data.duration, 10),
            };

            if ([serviceData.price, serviceData.commissionValue, serviceData.duration].some(value => Number.isNaN(value))) {
                setNotification({ type: 'error', message: 'Preencha valores numéricos válidos.' });
                return false;
            }

            if (currentService) {
                await updateDoc(doc(db, 'services', currentService.id), serviceData);
                setNotification({ type: 'success', message: 'Serviço atualizado com sucesso!' });
            } else {
                await addDoc(collection(db, 'services'), serviceData);
                setNotification({ type: 'success', message: 'Serviço cadastrado com sucesso!' });
            }
            return true;
        } catch (error) {
            console.error('Erro ao salvar serviço:', error);
            setNotification({ type: 'error', message: 'Não foi possível salvar o serviço.' });
            return false;
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Serviços da oficina</h1>
                <Button onClick={() => openModal(null)} icon={<Plus size={18} />}>Novo serviço</Button>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="p-4 font-semibold">Serviço</th>
                            <th className="p-4 font-semibold">Preço mão de obra</th>
                            <th className="p-4 font-semibold">Repasse técnico</th>
                            <th className="p-4 font-semibold">Tempo (min)</th>
                            <th className="p-4 font-semibold">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {services.map(service => (
                            <tr key={service.id}>
                                <td className="p-4">{service.name}</td>
                                <td className="p-4">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.price)}</td>
                                <td className="p-4">{service.commissionType === 'percentage' ? `${service.commissionValue}%` : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.commissionValue)}</td>
                                <td className="p-4">{service.duration}</td>
                                <td className="p-4">
                                    <Button onClick={() => openModal(service)} variant="secondary"><Edit size={16} /></Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <ServiceFormModal isOpen={isModalOpen} onClose={closeModal} service={currentService} onSave={handleSave} />
        </div>
    );
};

export default Servicos;
