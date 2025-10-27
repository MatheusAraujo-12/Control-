import React, { useState, useEffect } from 'react';
import { addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { userCollectionRef, userDocRef } from '../firebase';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { UserPlus, Edit, User, FileText, Phone, Mail, Car, Hash, Wrench, Calendar as CalendarIcon } from 'lucide-react';

const emptyClient = {
    name: '',
    cpf: '',
    phone: '',
    email: '',
    vehicles: [{ brand: '', model: '', year: '', plate: '' }],
};

const ClientFormModal = ({ isOpen, onClose, client, onSave }) => {
    const [formData, setFormData] = useState(emptyClient);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (client) {
            // To maintain compatibility with the old data structure, we map old vehicle fields to the new structure.
            const vehicles = (client.vehicles && client.vehicles.length > 0)
                ? client.vehicles
                : [{
                    brand: client.vehicleBrand || '',
                    model: client.vehicleModel || '',
                    year: client.vehicleYear || '',
                    plate: client.vehiclePlate || '',
                }];

            setFormData({
                ...emptyClient,
                ...client,
                vehicles,
            });
        } else {
            setFormData(emptyClient);
        }
    }, [client, isOpen]);

    const handleChange = event => setFormData({ ...formData, [event.target.name]: event.target.value });

    const handleVehicleChange = (index, event) => {
        const newVehicles = [...formData.vehicles];
        newVehicles[index][event.target.name] = event.target.value;
        setFormData({ ...formData, vehicles: newVehicles });
    };

    const addVehicle = () => {
        setFormData({
            ...formData,
            vehicles: [...formData.vehicles, { brand: '', model: '', year: '', plate: '' }],
        });
    };

    const removeVehicle = index => {
        const newVehicles = formData.vehicles.filter((_, i) => i !== index);
        setFormData({ ...formData, vehicles: newVehicles });
    };

    const handleSubmit = async event => {
        event.preventDefault();
        if (isSaving) {
            return;
        }
        setIsSaving(true);
        try {
            // Before saving, remove the old single-vehicle properties if they exist
            const { vehicleBrand, vehicleModel, vehicleYear, vehiclePlate, ...clientData } = formData;
            const success = await onSave(clientData);
            if (success) {
                onClose();
            }
        } catch (error) {
            console.error("Erro ao salvar cliente:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={client ? 'Editar cliente' : 'Novo cliente'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input name="name" value={formData.name} onChange={handleChange} placeholder="Nome do cliente" icon={<User size={18} />} required />
                <Input name="cpf" value={formData.cpf} onChange={handleChange} placeholder="CPF" icon={<FileText size={18} />} />
                <Input name="phone" value={formData.phone} onChange={handleChange} placeholder="Telefone" icon={<Phone size={18} />} required />
                <Input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="E-mail" icon={<Mail size={18} />} />

                <h3 className="text-lg font-medium text-gray-900 dark:text-white border-t pt-4">Veículos</h3>
                {formData.vehicles.map((vehicle, index) => (
                    <div key={index} className="space-y-4 border p-4 rounded-md relative">
                         {formData.vehicles.length > 1 && (
                            <Button type="button" variant="danger" onClick={() => removeVehicle(index)} className="absolute top-2 right-2 px-2 py-1 text-xs">Remover</Button>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input name="brand" value={vehicle.brand} onChange={e => handleVehicleChange(index, e)} placeholder="Marca do veículo" icon={<Car size={18} />} />
                            <Input name="model" value={vehicle.model} onChange={e => handleVehicleChange(index, e)} placeholder="Modelo" icon={<Wrench size={18} />} />
                            <Input name="year" value={vehicle.year} onChange={e => handleVehicleChange(index, e)} placeholder="Ano" icon={<CalendarIcon size={18} />} />
                            <Input name="plate" value={vehicle.plate} onChange={e => handleVehicleChange(index, e)} placeholder="Placa" icon={<Hash size={18} />} />
                        </div>
                    </div>
                ))}

                <Button type="button" variant="outline" onClick={addVehicle} className="w-full">Adicionar outro veículo</Button>

                <div className="flex justify-end space-x-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" disabled={isSaving}>{isSaving ? "Salvando..." : client ? "Salvar alterações" : "Cadastrar cliente"}</Button>
                </div>
            </form>
        </Modal>
    );
};

const Clientes = ({ userId, clients, setNotification }) => {
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
        if (!userId) {
            setNotification({ type: 'error', message: 'Sessão expirada. Faça login novamente.' });
            return false;
        }
        try {
            if (currentClient) {
                await updateDoc(userDocRef(userId, 'clients', currentClient.id), clientData);
                setNotification({ type: 'success', message: 'Cliente atualizado com sucesso!' });
            } else {
                await addDoc(userCollectionRef(userId, 'clients'), { ...clientData, createdAt: serverTimestamp() });
                setNotification({ type: 'success', message: 'Cliente cadastrado com sucesso!' });
            }
            return true;
        } catch (error) {
            console.error('Erro ao salvar cliente:', error);
            const extra = error && error.code ? ` (${error.code})` : '';
            setNotification({ type: 'error', message: `Não foi possível salvar o cliente${extra}.` });
            return false;
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Clientes e veículos</h1>
                <Button onClick={() => openModal(null)} icon={<UserPlus size={18} />}>Novo cliente</Button>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hidden md:block">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="p-4 font-semibold">Cliente</th>
                                <th className="p-4 font-semibold">Telefone</th>
                                <th className="p-4 font-semibold">E-mail</th>
                                <th className="p-4 font-semibold">Veículo(s)</th>
                                <th className="p-4 font-semibold">Placa(s)</th>
                                <th className="p-4 font-semibold">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {clients.map(client => {
                                const vehicles = (client.vehicles && client.vehicles.length > 0)
                                    ? client.vehicles
                                    : [{
                                        brand: client.vehicleBrand,
                                        model: client.vehicleModel,
                                        year: client.vehicleYear,
                                        plate: client.vehiclePlate
                                    }];

                                const vehicleStr = vehicles.map(v => [v.brand, v.model, v.year].filter(Boolean).join(" ")).filter(Boolean).join(", ");
                                const plateStr = vehicles.map(v => v.plate).filter(Boolean).join(", ");

                                return (
                                    <tr key={client.id}>
                                        <td className="p-4">{client.name}</td>
                                        <td className="p-4">{client.phone}</td>
                                        <td className="p-4">{client.email}</td>
                                        <td className="p-4">{vehicleStr || 'Não informado'}</td>
                                        <td className="p-4">{plateStr || 'Sem placa'}</td>
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
            <div className="space-y-4 md:hidden">
                {clients.map(client => {
                    const vehicles = (client.vehicles && client.vehicles.length > 0)
                        ? client.vehicles
                        : [{
                            brand: client.vehicleBrand,
                            model: client.vehicleModel,
                            year: client.vehicleYear,
                            plate: client.vehiclePlate
                        }];

                    const vehicleStr = vehicles.map(v => [v.brand, v.model, v.year].filter(Boolean).join(' ')).filter(Boolean).join(", ");
                    const plateStr = vehicles.map(v => v.plate).filter(Boolean).join(", ");

                    let createdAtLabel = '--';
                    if (client.createdAt) {
                        const createdAtDate = typeof client.createdAt === 'object' && client.createdAt.seconds
                            ? new Date(client.createdAt.seconds * 1000)
                            : new Date(client.createdAt);
                        if (!Number.isNaN(createdAtDate.getTime())) {
                            createdAtLabel = createdAtDate.toLocaleDateString('pt-BR');
                        }
                    }
                    return (
                        <div key={client.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">{client.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{client.email || 'Sem email'}</p>
                                </div>
                                <Button onClick={() => openModal(client)} variant="secondary" className="px-3 py-1">
                                    <Edit size={16} />
                                </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
                                <div>
                                    <span className="block font-medium text-gray-500 dark:text-gray-400">Telefone</span>
                                    <span>{client.phone}</span>
                                </div>
                                <div>
                                    <span className="block font-medium text-gray-500 dark:text-gray-400">Veículo(s)</span>
                                    <span>{vehicleStr || 'Nao informado'}</span>
                                </div>
                                <div>
                                    <span className="block font-medium text-gray-500 dark:text-gray-400">Placa(s)</span>
                                    <span>{plateStr || 'Sem placa'}</span>
                                </div>
                                <div>
                                    <span className="block font-medium text-gray-500 dark:text-gray-400">Criado em</span>
                                    <span>{createdAtLabel}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <ClientFormModal isOpen={isModalOpen} onClose={closeModal} client={currentClient} onSave={handleSaveClient} />
        </div>
    );
};

export default Clientes;