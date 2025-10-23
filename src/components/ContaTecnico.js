import React, { useEffect, useRef, useState } from 'react';
import { setDoc } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile } from 'firebase/auth';
import { Image as ImageIcon, UploadCloud, Trash2, Save, User, Phone, IdCard, Calendar, Mail, ShieldCheck, Lock } from 'lucide-react';

import { Button } from './ui/Button';
import { Input } from './ui/Input';
import EmployeePermissions, { enhancePermissionsShape } from './EmployeePermissions';
import { userDocRef } from '../firebase';

const MAX_FILE_SIZE = 1024 * 1024 * 2; // 2MB

const defaultPersonalData = {
    fullName: '',
    email: '',
    birthDate: '',
    cpfCnpj: '',
    phone: '',
};

const ContaTecnico = ({ userId, setNotification, currentUser, currentEmployee, userProfile }) => {
    const avatarInputRef = useRef(null);
    const [avatarPreview, setAvatarPreview] = useState('');
    const [avatarFile, setAvatarFile] = useState(null);
    const [isSavingAvatar, setIsSavingAvatar] = useState(false);
    const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);

    const [personalData, setPersonalData] = useState(defaultPersonalData);
    const [isSavingPersonal, setIsSavingPersonal] = useState(false);

    const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const permissions = enhancePermissionsShape(currentEmployee?.permissions || userProfile?.permissions);
    const hasAnyPermission = Object.values(permissions).some(Boolean);
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    const notify = (type, message) => setNotification?.({ type, message });

    useEffect(() => {
        if (!avatarFile) {
            const source = userProfile?.avatarUrl || currentEmployee?.avatarUrl || currentUser?.photoURL || '';
            setAvatarPreview(source || '');
        }
    }, [userProfile, currentEmployee, currentUser, avatarFile]);

    useEffect(() => {
        if (!userProfile && !currentEmployee && !currentUser) {
            setPersonalData(defaultPersonalData);
            return;
        }
        setPersonalData({
            fullName: userProfile?.fullName || currentEmployee?.name || currentUser?.displayName || '',
            email: currentUser?.email || userProfile?.email || currentEmployee?.email || '',
            birthDate: userProfile?.birthDate || currentEmployee?.birthDate || '',
            cpfCnpj: userProfile?.cpfCnpj || currentEmployee?.cpfCnpj || '',
            phone: userProfile?.phone || currentEmployee?.phone || '',
        });
    }, [userProfile, currentEmployee, currentUser]);

    const persistPersonalData = async payload => {
        const adminId = currentEmployee?.adminId;
        const tasks = [
            setDoc(userDocRef(userId), payload, { merge: true }),
        ];
        if (adminId) {
            tasks.push(setDoc(userDocRef(adminId, 'employees', currentUser.uid), payload, { merge: true }));
        }
        await Promise.all(tasks);
    };

    const handlePickAvatar = () => avatarInputRef.current?.click();

    const handleAvatarChange = event => {
        const [file] = event.target.files || [];
        if (!file) {
            return;
        }
        if (!file.type.startsWith('image/')) {
            notify('error', 'Selecione um arquivo de imagem valido.');
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            notify('error', 'A imagem deve ter no maximo 2MB.');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            setAvatarFile(file);
            setAvatarPreview(reader.result?.toString() || '');
        };
        reader.onerror = () => {
            notify('error', 'Nao foi possivel ler o arquivo selecionado.');
        };
        reader.readAsDataURL(file);
    };

    const handleSaveAvatar = async () => {
        if (!currentUser) {
            notify('error', 'Usuario nao autenticado.');
            return;
        }
        if (!userId) {
            notify('error', 'Sessao expirada. Faca login novamente.');
            return;
        }
        if (!avatarPreview) {
            notify('error', 'Selecione uma imagem para continuar.');
            return;
        }
        setIsSavingAvatar(true);
        const payload = { avatarUrl: avatarPreview, updatedAt: new Date().toISOString() };
        try {
            await persistPersonalData(payload);
            await updateProfile(currentUser, { photoURL: avatarPreview });
            notify('success', 'Foto de perfil atualizada com sucesso!');
            setAvatarFile(null);
        } catch (error) {
            console.error('Erro ao salvar foto de perfil:', error);
            notify('error', 'Nao foi possivel salvar a foto de perfil.');
        } finally {
            setIsSavingAvatar(false);
        }
    };

    const handleRemoveAvatar = async () => {
        if (!currentUser) {
            notify('error', 'Usuario nao autenticado.');
            return;
        }
        if (!userId) {
            notify('error', 'Sessao expirada. Faca login novamente.');
            return;
        }
        if (!avatarPreview) {
            return;
        }
        setIsRemovingAvatar(true);
        const payload = { avatarUrl: '', updatedAt: new Date().toISOString() };
        try {
            await persistPersonalData(payload);
            await updateProfile(currentUser, { photoURL: '' });
            setAvatarPreview('');
            setAvatarFile(null);
            notify('success', 'Foto de perfil removida.');
        } catch (error) {
            console.error('Erro ao remover foto de perfil:', error);
            notify('error', 'Nao foi possivel remover a foto de perfil.');
        } finally {
            setIsRemovingAvatar(false);
        }
    };

    const handlePersonalChange = event => {
        const { name, value } = event.target;
        setPersonalData(prev => ({ ...prev, [name]: value }));
    };

    const handleSavePersonal = async event => {
        event.preventDefault();
        if (!currentUser) {
            notify('error', 'Usuario nao autenticado.');
            return;
        }
        if (!userId) {
            notify('error', 'Sessao expirada. Faca login novamente.');
            return;
        }
        setIsSavingPersonal(true);
        const payload = {
            fullName: personalData.fullName.trim(),
            birthDate: personalData.birthDate,
            cpfCnpj: personalData.cpfCnpj.trim(),
            phone: personalData.phone.trim(),
            email: personalData.email.trim().toLowerCase(),
            updatedAt: new Date().toISOString(),
        };
        try {
            await persistPersonalData(payload);
            if (personalData.fullName && personalData.fullName !== currentUser.displayName) {
                await updateProfile(currentUser, { displayName: personalData.fullName.trim() });
            }
            notify('success', 'Dados pessoais atualizados com sucesso!');
        } catch (error) {
            console.error('Erro ao atualizar dados pessoais:', error);
            notify('error', 'Nao foi possivel salvar os dados pessoais.');
        } finally {
            setIsSavingPersonal(false);
        }
    };

    const handlePasswordsChange = event => {
        const { name, value } = event.target;
        setPasswords(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdatePassword = async event => {
        event.preventDefault();
        if (!currentUser?.email) {
            notify('error', 'Usuario nao autenticado.');
            return;
        }
        if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
            notify('error', 'Preencha todos os campos de senha.');
            return;
        }
        if (passwords.newPassword !== passwords.confirmPassword) {
            notify('error', 'As senhas informadas nao coincidem.');
            return;
        }
        setIsUpdatingPassword(true);
        try {
            const credential = EmailAuthProvider.credential(currentUser.email, passwords.currentPassword);
            await reauthenticateWithCredential(currentUser, credential);
            await updatePassword(currentUser, passwords.newPassword);
            setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
            notify('success', 'Senha atualizada com sucesso!');
        } catch (error) {
            console.error('Erro ao atualizar senha:', error);
            const message =
                error.code === 'auth/wrong-password'
                    ? 'A senha atual informada esta incorreta.'
                    : 'Nao foi possivel atualizar a senha. Tente novamente.';
            notify('error', message);
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Minha conta</h1>
                <p className="text-gray-600 dark:text-gray-400">Atualize seus dados pessoais e mantenha sua conta protegida.</p>
            </header>

            <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6 space-y-4">
                <div className="flex items-center space-x-3">
                    <ShieldCheck className="text-blue-500" size={24} />
                    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Funcionalidades liberadas</h2>
                </div>
                {hasAnyPermission ? (
                    <EmployeePermissions value={permissions} disabled />
                ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma funcionalidade foi liberada para sua conta ainda. Fale com o administrador para solicitar acesso.</p>
                )}
            </section>

            <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6 space-y-6">
                <div className="flex items-center space-x-3">
                    <ImageIcon className="text-blue-500" size={24} />
                    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Foto de perfil</h2>
                </div>
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="w-32 h-32 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-900/40 overflow-hidden">
                        {avatarPreview ? (
                            <img src={avatarPreview} alt="Foto do perfil" className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex flex-col items-center text-gray-400">
                                <ImageIcon size={32} />
                                <span className="text-xs mt-2 text-center">Pre-visualizacao</span>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 space-y-4">
                        <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/svg+xml"
                            className="hidden"
                            onChange={handleAvatarChange}
                        />
                        <div className="flex flex-wrap gap-3">
                            <Button type="button" variant="secondary" icon={<UploadCloud size={18} />} onClick={handlePickAvatar}>
                                Escolher foto
                            </Button>
                            <Button
                                type="button"
                                onClick={handleSaveAvatar}
                                disabled={isSavingAvatar || !avatarPreview}
                                icon={<Save size={18} />}
                            >
                                {isSavingAvatar ? 'Salvando...' : 'Salvar foto'}
                            </Button>
                            <Button
                                type="button"
                                variant="danger"
                                onClick={handleRemoveAvatar}
                                disabled={isRemovingAvatar || !avatarPreview}
                                icon={<Trash2 size={18} />}
                            >
                                {isRemovingAvatar ? 'Removendo...' : 'Remover'}
                            </Button>
                        </div>
                        <ul className="text-xs text-gray-500 dark:text-gray-400 list-disc list-inside space-y-1">
                            <li>Tamanho maximo permitido: 2MB.</li>
                            <li>Formatos aceitos: PNG, JPG, JPEG ou SVG.</li>
                            <li>A imagem aparece no ranking e no seu perfil.</li>
                        </ul>
                    </div>
                </div>
            </section>

            <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6 space-y-6">
                <div className="flex items-center space-x-3">
                    <User className="text-blue-500" size={24} />
                    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Dados pessoais</h2>
                </div>
                <form onSubmit={handleSavePersonal} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input name="fullName" value={personalData.fullName} onChange={handlePersonalChange} placeholder="Nome completo" icon={<User size={18} />} required />
                        <Input name="email" type="email" value={personalData.email} onChange={handlePersonalChange} placeholder="Email" icon={<Mail size={18} />} disabled />
                        <Input name="birthDate" type="date" value={personalData.birthDate} onChange={handlePersonalChange} icon={<Calendar size={18} />} />
                        <Input name="cpfCnpj" value={personalData.cpfCnpj} onChange={handlePersonalChange} placeholder="CPF ou CNPJ" icon={<IdCard size={18} />} />
                        <Input name="phone" value={personalData.phone} onChange={handlePersonalChange} placeholder="Telefone" icon={<Phone size={18} />} />
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit" disabled={isSavingPersonal} icon={<Save size={18} />}>
                            {isSavingPersonal ? 'Salvando...' : 'Salvar dados pessoais'}
                        </Button>
                    </div>
                </form>
            </section>

            <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6 space-y-6">
                <div className="flex items-center space-x-3">
                    <ShieldCheck className="text-blue-500" size={24} />
                    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Seguranca</h2>
                </div>
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input name="currentPassword" type="password" value={passwords.currentPassword} onChange={handlePasswordsChange} placeholder="Senha atual" icon={<Lock size={18} />} required />
                        <Input name="newPassword" type="password" value={passwords.newPassword} onChange={handlePasswordsChange} placeholder="Nova senha" icon={<Lock size={18} />} required />
                        <Input name="confirmPassword" type="password" value={passwords.confirmPassword} onChange={handlePasswordsChange} placeholder="Confirmar nova senha" icon={<Lock size={18} />} required />
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit" disabled={isUpdatingPassword}>
                            {isUpdatingPassword ? 'Atualizando...' : 'Alterar senha'}
                        </Button>
                    </div>
                </form>
            </section>
        </div>
    );
};

export default ContaTecnico;
