import React, { useState, useEffect } from 'react';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, userDocRef, getSecondaryAuth } from '../firebase';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { UserPlus, Edit, User, Mail, Wrench, Trash2 } from 'lucide-react';
import EmployeePermissions, { enhancePermissionsShape } from './EmployeePermissions';

const emptyProfessional = {
    name: '',
    email: '',
    specialty: '',
    password: '',
    initialPassword: '',
    permissions: enhancePermissionsShape(),
};

const ProfessionalFormModal = ({ isOpen, onClose, professional, onSave }) => {
    const [formData, setFormData] = useState(emptyProfessional);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (professional) {
            setFormData({
                ...emptyProfessional,
                ...professional,
                permissions: enhancePermissionsShape(professional.permissions),
            });
        } else {
            setFormData(emptyProfessional);
        }
    }, [professional, isOpen]);

    const handleChange = event => {
        const { name, value, type, checked } = event.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handlePermissionsChange = permissions => {
        setFormData(prev => ({
            ...prev,
            permissions: enhancePermissionsShape(permissions),
        }));
    };

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
            console.error("Erro ao submeter técnico:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={professional ? 'Editar técnico' : 'Novo técnico'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input name="name" value={formData.name} onChange={handleChange} placeholder="Nome completo" icon={<User size={18} />} required />
                <Input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="E-mail" icon={<Mail size={18} />} required/>
                <Input name="specialty" value={formData.specialty} onChange={handleChange} placeholder="Especialidade (ex: eletrica, mecanica pesada)" icon={<Wrench size={18} />} />
                {!professional && (
                    <Input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Senha provisória" required />
                )}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Permissões</label>
                    <EmployeePermissions value={formData.permissions} onChange={handlePermissionsChange} />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar técnico'}</Button>
                </div>
            </form>
        </Modal>
    );
};

const Profissionais = ({ userId, professionals, setNotification, subscriptionInfo = {} }) => {
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

    const encodePassword = (value = '') => {
        if (!value) {
            return '';
        }
        try {
            if (typeof btoa === 'function') {
                return btoa(value);
            }
        } catch (_) {
            // ignore
        }
        if (typeof Buffer !== 'undefined') {
            try {
                return Buffer.from(value, 'utf-8').toString('base64');
            } catch (__error) {
                console.warn('Nao foi possivel codificar a senha inicial do tecnico.');
            }
        }
        return value;
    };

    const decodePassword = (value = '') => {
        if (!value) {
            return '';
        }
        try {
            if (typeof atob === 'function') {
                return atob(value);
            }
        } catch (_) {
            // ignore
        }
        if (typeof Buffer !== 'undefined') {
            try {
                return Buffer.from(value, 'base64').toString('utf-8');
            } catch (__error) {
                console.warn('Não foi possível decodificar a senha inicial do técnico.');
            }
        }
        return '';
    };

    const persistProfessionalDocs = async (uid, baseData, profileOverrides = {}) => {
        let trialEndsAtIso = '';
        if (subscriptionInfo?.trialEndsAt) {
            if (subscriptionInfo.trialEndsAt instanceof Date) {
                trialEndsAtIso = subscriptionInfo.trialEndsAt.toISOString();
            } else {
                const parsed = new Date(subscriptionInfo.trialEndsAt);
                if (!Number.isNaN(parsed.getTime())) {
                    trialEndsAtIso = parsed.toISOString();
                }
            }
        }
        const parentSubscriptionSnapshot = {
            parentSubscriptionStatus: subscriptionInfo?.status || 'active',
            parentSubscriptionPlan: subscriptionInfo?.plan || 'starter',
            parentTrialEndsAt: trialEndsAtIso,
        };
        const adminPayload = { ...baseData, ...profileOverrides, ...parentSubscriptionSnapshot };
        const { initialPassword, ...sanitizedPayload } = adminPayload;
        const operations = [
            () => setDoc(userDocRef(userId, 'employees', uid), adminPayload, { merge: true }),
            () => setDoc(doc(db, 'users', uid), sanitizedPayload, { merge: true }),
        ];
        for (const operation of operations) {
            try {
                await operation();
            } catch (error) {
                if (error?.code === 'permission-denied' || error?.code === 'not-found') {
                    continue;
                }
                throw error;
            }
        }
    };

    const deleteAuthAccount = async professional => {
        if (!professional?.email || !professional?.initialPassword) {
            return;
        }
        const decodedPassword = decodePassword(professional.initialPassword);
        if (!decodedPassword) {
            return;
        }
        const secondaryAuth = getSecondaryAuth();
        try {
            const { user } = await signInWithEmailAndPassword(secondaryAuth, professional.email, decodedPassword);
            await user.delete();
        } catch (error) {
            if (error?.code === 'auth/user-not-found' || error?.code === 'auth/wrong-password') {
                console.warn('Não foi possível remover usuário da autenticação:', error);
            } else {
                throw error;
            }
        } finally {
            await signOut(secondaryAuth).catch(() => {});
        }
    };

    const handleSave = async data => {
        if (!userId) {
            setNotification({ type: 'error', message: 'Sessão expirada. Faça login novamente.' });
            return false;
        }
        try {
            if (currentProfessional) {
                const { password, ...updates } = data;
                const targetUid = currentProfessional.uid || currentProfessional.id;
                const initialPassword = currentProfessional.initialPassword || data.initialPassword || '';
                const basePayload = {
                    ...updates,
                    adminId: currentProfessional.adminId || userId,
                    uid: targetUid,
                    initialPassword,
                    permissions: enhancePermissionsShape(updates.permissions),
                };
                const profilePayload = { role: 'employee' };
                if (typeof currentProfessional.mustChangePassword === 'boolean') {
                    basePayload.mustChangePassword = currentProfessional.mustChangePassword;
                    profilePayload.mustChangePassword = currentProfessional.mustChangePassword;
                }
                await persistProfessionalDocs(targetUid, basePayload, profilePayload);
                setNotification({ type: 'success', message: 'Técnico atualizado com sucesso!' });
            } else {
                const { password, ...rest } = data;
                const secondaryAuth = getSecondaryAuth();
                const { user } = await createUserWithEmailAndPassword(secondaryAuth, rest.email, password);
                await signOut(secondaryAuth).catch(() => {});
                const professionalData = {
                    ...rest,
                    adminId: userId,
                    uid: user.uid,
                    role: 'employee',
                    mustChangePassword: true,
                    initialPassword: encodePassword(password),
                };
                await persistProfessionalDocs(user.uid, professionalData);
                setNotification({ type: 'success', message: 'Técnico cadastrado com sucesso!' });
            }
            return true;
        } catch (error) {
            console.error('Erro ao salvar tecnico:', error);
            if (error?.code === 'auth/email-already-in-use') {
                setNotification({ type: 'error', message: 'Já existe um usuário com este e-mail.' });
            } else {
                const extra = error?.code ? ` (${error.code})` : '';
                setNotification({ type: 'error', message: `Não foi possível salvar o técnico${extra}.` });
            }
            return false;
        }
    };

    const handleDelete = async professionalId => {
        if (!userId) {
            setNotification({ type: 'error', message: 'Sessão expirada. Faça login novamente.' });
            return;
        }
        if (!window.confirm('Tem certeza que deseja excluir este técnico?')) {
            return;
        }
        const safeDelete = async reference => {
            try {
                await deleteDoc(reference);
            } catch (error) {
                if (error?.code === 'permission-denied' || error?.code === 'not-found') {
                    return;
                } else {
                    throw error;
                }
            }
        };
        try {
            const professional = professionals.find(prof => prof.id === professionalId);
            await deleteAuthAccount(professional);
            await safeDelete(userDocRef(userId, 'employees', professionalId));
            await safeDelete(doc(db, 'users', professionalId));
            setNotification({ type: 'success', message: 'Técnico excluído com sucesso!' });
        } catch (error) {
            console.error('Erro ao excluir tecnico:', error);
            const extra = error && error.code ? ` (${error.code})` : '';
            setNotification({ type: 'error', message: `Não foi possível excluir o técnico${extra}.` });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Equipe técnica</h1>
                <Button onClick={() => openModal(null)} icon={<UserPlus size={18} />}>Novo técnico</Button>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hidden md:block">
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
                                    <td className="p-4">{prof.email || "Sem e-mail"}</td>
                                    <td className="p-4">{prof.specialty || "Não informado"}</td>
                                    <td className="p-4">
                                        <Button onClick={() => openModal(prof)} variant="secondary"><Edit size={16} /></Button>
                                        <Button onClick={() => handleDelete(prof.id)} variant="danger" className="ml-2"><Trash2 size={16} /></Button>
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
                                <p className="text-xs text-gray-500 dark:text-gray-400">{prof.email || 'Sem e-mail'}</p>
                            </div>
                            <div>
                                <Button onClick={() => openModal(prof)} variant="secondary" className="px-3 py-1">
                                    <Edit size={16} />
                                </Button>
                                <Button onClick={() => handleDelete(prof.id)} variant="danger" className="px-3 py-1 ml-2">
                                    <Trash2 size={16} />
                                </Button>
                            </div>
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
