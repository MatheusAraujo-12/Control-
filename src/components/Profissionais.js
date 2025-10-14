import React, { useState, useEffect } from 'react';
import { addDoc, updateDoc } from 'firebase/firestore';
import { userCollectionRef, userDocRef } from '../firebase';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { UserPlus, Edit, User, Mail, Wrench } from 'lucide-react';

const emptyProfessional = {
    name: '',
    email: '',
    specialty: '',
};

const ProfessionalFormModal = ({ isOpen, onClose, professional, onSave }) => {
    const [formData, setFormData] = useState(emptyProfessional);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setFormData(professional ? { ...emptyProfessional, ...professional } : emptyProfessional);
    }, [professional, isOpen]);

    const handleChange = event => setFormData({ ...formData, [event.target.name]: event.target.value });

    const handleSubmit = async event => {
        event.preventDefault();
        if (isSaving) {
            return;
        }
        setIsSaving(true);
        try {
            const success = await onSave(formData);
            if (success) {
                onClose();
            }
        } catch (error) {
            console.error("Erro ao submeter tecnico:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={professional ? 'Editar tecnico' : 'Novo tecnico'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input name="name" value={formData.name} onChange={handleChange} placeholder="Nome completo" icon={<User size={18} />} required />
                <Input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="E-mail" icon={<Mail size={18} />} />
                <Input name="specialty" value={formData.specialty} onChange={handleChange} placeholder="Especialidade (ex: eletrica, mecanica pesada)" icon={<Wrench size={18} />} />
                <div className="flex justify-end space-x-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar tecnico'}</Button>
                </div>
            </form>
        </Modal>
    );
};

const Profissionais = ({ userId, professionals, setNotification }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProfessional, setCurrentProfessional] = useState(null);

    const openModal = professional => {
        setCurrentProfessional(professional);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentProfessional(null);
    };

    const handleSave = async data => {
        if (!userId) {
            setNotification({ type: 'error', message: 'Sessao expirada. Faça login novamente.' });
            return false;
        }
        try {
            if (currentProfessional) {
                await updateDoc(userDocRef(userId, 'professionals', currentProfessional.id), data);
                setNotification({ type: 'success', message: 'Tecnico atualizado com sucesso!' });
            } else {
                await addDoc(userCollectionRef(userId, 'professionals'), data);
                setNotification({ type: 'success', message: 'Tecnico cadastrado com sucesso!' });
            }
            return true;
        } catch (error) {
            console.error('Erro ao salvar tecnico:', error);
            const extra = error && error.code ? ` (${error.code})` : '';
            setNotification({ type: 'error', message: `Nao foi possivel salvar o tecnico${extra}.` });
            return false;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Equipe tecnica</h1>
                <Button onClick={() => openModal(null)} icon={<UserPlus size={18} />}>Novo tecnico</Button>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hidden md:block">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="p-4 font-semibold">Nome</th>
                                <th className="p-4 font-semibold">E-mail</th>
                                <th className="p-4 font-semibold">Especialidade</th>
                                <th className="p-4 font-semibold">Acoes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {professionals.map(prof => (
                                <tr key={prof.id}>
                                    <td className="p-4">{prof.name}</td>
                                    <td className="p-4">{prof.email || "Sem e-mail"}</td>
                                    <td className="p-4">{prof.specialty || "Nao informado"}</td>
                                    <td className="p-4">
                                        <Button onClick={() => openModal(prof)} variant="secondary"><Edit size={16} /></Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="space-y-4 md:hidden">
                {professionals.map(prof => (
                    <div key={prof.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">{prof.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{prof.email || 'Sem email'}</p>
                            </div>
                            <Button onClick={() => openModal(prof)} variant="secondary" className="px-3 py-1">
                                <Edit size={16} />
                            </Button>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">
                            <span className="block font-medium text-gray-500 dark:text-gray-400">Especialidade</span>
                            <span>{prof.specialty || 'Nao informado'}</span>
                        </div>
                    </div>
                ))}
            </div>
            <ProfessionalFormModal isOpen={isModalOpen} onClose={closeModal} professional={currentProfessional} onSave={handleSave} />
        </div>
    );
};

export default Profissionais;
