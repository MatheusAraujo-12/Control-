import React, { useEffect, useRef, useState } from 'react';
import { setDoc } from 'firebase/firestore';
import { userDocRef } from '../firebase';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Image as ImageIcon, UploadCloud, Trash2, Save, Building2, Phone, IdCard, Mail, ShieldCheck, Lock } from 'lucide-react';
import { auth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from '../firebase';

const MAX_FILE_SIZE = 1024 * 1024 * 2; // 2MB

const defaultCompanyData = {
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    companyDocument: '',
    companyAddress: '',
    companyWebsite: '',
};

const Configuracoes = ({ userId, appSettings = {}, setNotification }) => {
    const fileInputRef = useRef(null);
    const [logoPreview, setLogoPreview] = useState(appSettings.logoUrl || '');
    const [logoFile, setLogoFile] = useState(null);
    const [isSavingLogo, setIsSavingLogo] = useState(false);
    const [isRemovingLogo, setIsRemovingLogo] = useState(false);
    const [companyData, setCompanyData] = useState(defaultCompanyData);
    const [isSavingCompany, setIsSavingCompany] = useState(false);
    const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    const notify = (type, message) => setNotification?.({ type, message });

    useEffect(() => {
        setCompanyData({
            companyName: appSettings.companyName || '',
            companyEmail: appSettings.companyEmail || '',
            companyPhone: appSettings.companyPhone || '',
            companyDocument: appSettings.companyDocument || '',
            companyAddress: appSettings.companyAddress || '',
            companyWebsite: appSettings.companyWebsite || '',
        });
    }, [
        appSettings.companyName,
        appSettings.companyEmail,
        appSettings.companyPhone,
        appSettings.companyDocument,
        appSettings.companyAddress,
        appSettings.companyWebsite,
    ]);

    useEffect(() => {
        if (!logoFile) {
            setLogoPreview(appSettings.logoUrl || '');
        }
    }, [appSettings.logoUrl, logoFile]);

    const handlePickFile = () => fileInputRef.current?.click();

    const handleFileChange = event => {
        const [file] = event.target.files || [];
        if (!file) {
            return;
        }
        if (!file.type.startsWith('image/')) {
            notify('error', 'Selecione um arquivo de imagem válido.');
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            notify('error', 'A imagem deve ter no máximo 2MB.');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            setLogoFile(file);
            setLogoPreview(reader.result?.toString() || '');
        };
        reader.onerror = () => {
            notify('error', 'Não foi possível ler o arquivo selecionado.');
        };
        reader.readAsDataURL(file);
    };

    const handleSaveLogo = async () => {
        if (!logoPreview) {
            return;
        }
        if (!userId) {
            notify('error', 'Sessão expirada. Faça login novamente.');
            return;
        }
        setIsSavingLogo(true);
        try {
            await setDoc(userDocRef(userId, 'settings', 'app'), { logoUrl: logoPreview }, { merge: true });
            notify('success', 'Logomarca atualizada com sucesso!');
            setLogoFile(null);
        } catch (error) {
            console.error('Erro ao salvar logomarca:', error);
            notify('error', 'Não foi possível salvar a logomarca.');
        } finally {
            setIsSavingLogo(false);
        }
    };

    const handleRemoveLogo = async () => {
        if (!logoPreview) {
            return;
        }
        if (!userId) {
            notify('error', 'Sessão expirada. Faça login novamente.');
            return;
        }
        setIsRemovingLogo(true);
        try {
            await setDoc(userDocRef(userId, 'settings', 'app'), { logoUrl: '' }, { merge: true });
            notify('success', 'Logomarca removida.');
            setLogoPreview('');
            setLogoFile(null);
        } catch (error) {
            console.error('Erro ao remover logomarca:', error);
            notify('error', 'Não foi possível remover a logomarca.');
        } finally {
            setIsRemovingLogo(false);
        }
    };

    const handleCompanyChange = event => {
        const { name, value } = event.target;
        setCompanyData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveCompany = async event => {
        event.preventDefault();
        if (!userId) {
            notify('error', 'Sessão expirada. Faça login novamente.');
            return;
        }
        setIsSavingCompany(true);
        try {
            await setDoc(userDocRef(userId, 'settings', 'app'), companyData, { merge: true });
            notify('success', 'Dados da empresa atualizados com sucesso!');
        } catch (error) {
            console.error('Erro ao atualizar dados da empresa:', error);
            notify('error', 'Não foi possível salvar os dados da empresa.');
        } finally {
            setIsSavingCompany(false);
        }
    };

    const handlePasswordsChange = event => {
        const { name, value } = event.target;
        setPasswords(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdatePassword = async event => {
        event.preventDefault();
        if (isUpdatingPassword) {
            return;
        }
        const { currentPassword, newPassword, confirmPassword } = passwords;
        if (!currentPassword || !newPassword || !confirmPassword) {
            notify('error', 'Complete todos os campos de senha.');
            return;
        }
        if (newPassword.length < 6) {
            notify('error', 'A nova senha deve ter pelo menos 6 caracteres.');
            return;
        }
        if (newPassword !== confirmPassword) {
            notify('error', 'A confirmação deve ser igual a nova senha.');
            return;
        }
        const user = auth.currentUser;
        if (!user || !user.email) {
            notify('error', 'Sessão expirada. Faça login novamente.');
            return;
        }
        setIsUpdatingPassword(true);
        try {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);
            setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
            notify('success', 'Senha atualizada com sucesso!');
        } catch (error) {
            console.error('Erro ao alterar senha:', error);
            let message = 'Não foi possível alterar a senha.';
            if (error?.code === 'auth/wrong-password') {
                message = 'Senha atual incorreta.';
            } else if (error?.code === 'auth/weak-password') {
                message = 'A nova senha é considerada fraca pelo provedor.';
            }
            notify('error', message);
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Configurações</h1>
                <p className="text-gray-600 dark:text-gray-400">Gerencie a identidade visual e as informacoes da sua oficina.</p>
            </header>

            <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6 space-y-6">
                <div className="flex items-center space-x-3">
                    <Building2 className="text-blue-500" size={24} />
                    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Dados da empresa</h2>
                </div>
                <form onSubmit={handleSaveCompany} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input name="companyName" value={companyData.companyName} onChange={handleCompanyChange} placeholder="Nome fantasia" icon={<Building2 size={18} />} required />
                        <Input name="companyDocument" value={companyData.companyDocument} onChange={handleCompanyChange} placeholder="CNPJ ou CPF" icon={<IdCard size={18} />} />
                        <Input name="companyEmail" type="email" value={companyData.companyEmail} onChange={handleCompanyChange} placeholder="Email comercial" icon={<Mail size={18} />} />
                        <Input name="companyPhone" value={companyData.companyPhone} onChange={handleCompanyChange} placeholder="Telefone comercial" icon={<Phone size={18} />} />
                        <Input name="companyWebsite" value={companyData.companyWebsite} onChange={handleCompanyChange} placeholder="Site ou redes sociais" icon={<ShieldCheck size={18} />} />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Endereço</label>
                        <textarea
                            name="companyAddress"
                            value={companyData.companyAddress}
                            onChange={handleCompanyChange}
                            rows={3}
                            className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Rua, número, bairro, cidade"
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit" disabled={isSavingCompany} icon={<Save size={18} />}>
                            {isSavingCompany ? 'Salvando...' : 'Salvar alterações'}
                        </Button>
                    </div>
                </form>
            </section>

            <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6 space-y-6">
                <div className="flex items-center space-x-3">
                    <Lock className="text-blue-500" size={24} />
                    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Segurança</h2>
                </div>
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                            name="currentPassword"
                            type="password"
                            value={passwords.currentPassword}
                            onChange={handlePasswordsChange}
                            placeholder="Senha atual"
                            icon={<Lock size={18} />}
                            required
                        />
                        <Input
                            name="newPassword"
                            type="password"
                            value={passwords.newPassword}
                            onChange={handlePasswordsChange}
                            placeholder="Nova senha"
                            icon={<Lock size={18} />}
                            required
                        />
                        <Input
                            name="confirmPassword"
                            type="password"
                            value={passwords.confirmPassword}
                            onChange={handlePasswordsChange}
                            placeholder="Confirmar nova senha"
                            icon={<Lock size={18} />}
                            required
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit" disabled={isUpdatingPassword} icon={<Save size={18} />}>
                            {isUpdatingPassword ? 'Atualizando...' : 'Alterar senha'}
                        </Button>
                    </div>
                </form>
            </section>

            <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6 space-y-6">
                <div className="flex items-center space-x-3">
                    <ImageIcon className="text-blue-500" size={24} />
                    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Logomarca</h2>
                </div>
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="w-40 h-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-gray-900/40 overflow-hidden">
                        {logoPreview ? (
                            <img src={logoPreview} alt="Logomarca" className="max-w-full max-h-full object-contain" />
                        ) : (
                            <div className="flex flex-col items-center text-gray-400">
                                <ImageIcon size={36} />
                                <span className="text-xs mt-2 text-center">Pre-visualização</span>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 space-y-4">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/svg+xml"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <div className="flex flex-wrap gap-3">
                            <Button type="button" variant="secondary" icon={<UploadCloud size={18} />} onClick={handlePickFile}>
                                Escolher imagem
                            </Button>
                            <Button type="button" onClick={handleSaveLogo} disabled={isSavingLogo || !logoPreview} icon={<Save size={18} />}>
                                {isSavingLogo ? 'Salvando...' : 'Salvar logomarca'}
                            </Button>
                            <Button type="button" variant="danger" onClick={handleRemoveLogo} disabled={isRemovingLogo || (!logoPreview && !logoFile)} icon={<Trash2 size={18} />}>
                                {isRemovingLogo ? 'Removendo...' : 'Remover'}
                            </Button>
                        </div>
                        <ul className="text-xs text-gray-500 dark:text-gray-400 list-disc list-inside space-y-1">
                            <li>Tamanho máximo permitido: 2MB.</li>
                            <li>Formatos aceitos: PNG, JPG, JPEG ou SVG.</li>
                            <li>A imagem e armazenada junto das configurações do app.</li>
                        </ul>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Configuracoes;
