import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
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
        setIsSaving(true);
        const success = await onSave(formData);
        setIsSaving(false);
        if (success) {
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={professional ? 'Editar técnico' : 'Novo técnico'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input name="name" value={formData.name} onChange={handleChange} placeholder="Nome completo" icon={<User size={18} />} required />
                <Input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="E-mail" icon={<Mail size={18} />} />
                <Input name="specialty" value={formData.specialty} onChange={handleChange} placeholder="Especialidade (ex: elétrica, mecânica pesada)" icon={<Wrench size={18} />} />
                <div className="flex justify-end space-x-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar técnico'}</Button>
                </div>
            </form>
        </Modal>
    );
};

const Profissionais = ({ professionals, setNotification }) => {
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
        try {
            if (currentProfessional) {
                await updateDoc(doc(db, 'professionals', currentProfessional.id), data);
                setNotification({ type: 'success', message: 'Técnico atualizado com sucesso!' });
            } else {
                await addDoc(collection(db, 'professionals'), data);
                setNotification({ type: 'success', message: 'Técnico cadastrado com sucesso!' });
            }
            return true;
        } catch (error) {
            console.error('Erro ao salvar técnico:', error);
            setNotification({ type: 'error', message: 'Não foi possível salvar o técnico.' });
            return false;
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Equipe técnica</h1>
                <Button onClick={() => openModal(null)} icon={<UserPlus size={18} />}>Novo técnico</Button>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="p-4 font-semibold">Nome</th>
                                <th className="p-4 font-semibold">E-mail</th>
                                <th className="p-4 font-semibold">Especialidade</th>
                                <th className="p-4 font-semibold">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {professionals.map(prof => (
                                <tr key={prof.id}>
                                    <td className="p-4">{prof.name}</td>
                                    <td className="p-4">{prof.email || 'Sem e-mail'}</td>
                                    <td className="p-4">{prof.specialty || 'Não informado'}</td>
                                    <td className="p-4">
                                        <Button onClick={() => openModal(prof)} variant="secondary"><Edit size={16} /></Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <ProfessionalFormModal isOpen={isModalOpen} onClose={closeModal} professional={currentProfessional} onSave={handleSave} />
        </div>
    );
};

export default Profissionais;
