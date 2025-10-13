import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { UserPlus, Edit, User, FileText, Phone, Mail, Car, Hash, Wrench, Calendar as CalendarIcon } from 'lucide-react';

const emptyClient = {
    name: '',
    cpf: '',
    phone: '',
    email: '',
    vehicleBrand: '',
    vehicleModel: '',
    vehicleYear: '',
    vehiclePlate: '',
};

const ClientFormModal = ({ isOpen, onClose, client, onSave }) => {
    const [formData, setFormData] = useState(emptyClient);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setFormData(client ? { ...emptyClient, ...client } : emptyClient);
    }, [client, isOpen]);

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
        <Modal isOpen={isOpen} onClose={onClose} title={client ? 'Editar cliente' : 'Novo cliente'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input name="name" value={formData.name} onChange={handleChange} placeholder="Nome do cliente" icon={<User size={18} />} required />
                <Input name="cpf" value={formData.cpf} onChange={handleChange} placeholder="CPF" icon={<FileText size={18} />} />
                <Input name="phone" value={formData.phone} onChange={handleChange} placeholder="Telefone" icon={<Phone size={18} />} required />
                <Input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="E-mail" icon={<Mail size={18} />} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input name="vehicleBrand" value={formData.vehicleBrand} onChange={handleChange} placeholder="Marca do veículo" icon={<Car size={18} />} />
                    <Input name="vehicleModel" value={formData.vehicleModel} onChange={handleChange} placeholder="Modelo" icon={<Wrench size={18} />} />
                    <Input name="vehicleYear" value={formData.vehicleYear} onChange={handleChange} placeholder="Ano" icon={<CalendarIcon size={18} />} />
                    <Input name="vehiclePlate" value={formData.vehiclePlate} onChange={handleChange} placeholder="Placa" icon={<Hash size={18} />} />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" disabled={isSaving}>{isSaving ? 'Salvando...' : client ? 'Salvar alterações' : 'Cadastrar cliente'}</Button>
                </div>
            </form>
        </Modal>
    );
};

const Clientes = ({ clients, setNotification }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentClient, setCurrentClient] = useState(null);

    const openModal = client => {
        setCurrentClient(client);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentClient(null);
    };

    const handleSaveClient = async clientData => {
        try {
            if (currentClient) {
                await updateDoc(doc(db, 'clients', currentClient.id), clientData);
                setNotification({ type: 'success', message: 'Cliente atualizado com sucesso!' });
            } else {
                await addDoc(collection(db, 'clients'), { ...clientData, createdAt: serverTimestamp() });
                setNotification({ type: 'success', message: 'Cliente cadastrado com sucesso!' });
            }
            return true;
        } catch (error) {
            console.error('Erro ao salvar cliente:', error);
            setNotification({ type: 'error', message: 'Não foi possível salvar o cliente.' });
            return false;
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Clientes e veículos</h1>
                <Button onClick={() => openModal(null)} icon={<UserPlus size={18} />}>Novo cliente</Button>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="p-4 font-semibold">Cliente</th>
                                <th className="p-4 font-semibold">Telefone</th>
                                <th className="p-4 font-semibold">E-mail</th>
                                <th className="p-4 font-semibold">Veículo</th>
                                <th className="p-4 font-semibold">Placa</th>
                                <th className="p-4 font-semibold">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {clients.map(client => {
                                const vehicle = [client.vehicleBrand, client.vehicleModel, client.vehicleYear].filter(Boolean).join(' ');
                                return (
                                    <tr key={client.id}>
                                        <td className="p-4">{client.name}</td>
                                        <td className="p-4">{client.phone}</td>
                                        <td className="p-4">{client.email}</td>
                                        <td className="p-4">{vehicle || 'Não informado'}</td>
                                        <td className="p-4">{client.vehiclePlate || 'Sem placa'}</td>
                                        <td className="p-4">
                                            <Button onClick={() => openModal(client)} variant="secondary"><Edit size={16} /></Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            <ClientFormModal isOpen={isModalOpen} onClose={closeModal} client={currentClient} onSave={handleSaveClient} />
        </div>
    );
};

export default Clientes;
