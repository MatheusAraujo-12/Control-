import React, { useEffect, useRef, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Button } from './ui/Button';
import { Image as ImageIcon, UploadCloud, Trash2, Save } from 'lucide-react';

const MAX_FILE_SIZE = 1024 * 1024 * 2; // 2MB

const Configuracoes = ({ appSettings = {}, setNotification }) => {
    const fileInputRef = useRef(null);
    const [logoPreview, setLogoPreview] = useState(appSettings.logoUrl || '');
    const [logoFile, setLogoFile] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);

    useEffect(() => {
        if (!logoFile) {
            setLogoPreview(appSettings.logoUrl || '');
        }
    }, [appSettings, logoFile]);

    const handlePickFile = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = event => {
        const [file] = event.target.files || [];
        if (!file) {
            return;
        }

        if (!file.type.startsWith('image/')) {
            setNotification?.({ type: 'error', message: 'Selecione um arquivo de imagem válido.' });
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            setNotification?.({ type: 'error', message: 'A imagem deve ter no máximo 2MB.' });
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setLogoFile(file);
            setLogoPreview(reader.result?.toString() || '');
        };
        reader.onerror = () => {
            setNotification?.({ type: 'error', message: 'Não foi possível ler o arquivo selecionado.' });
        };
        reader.readAsDataURL(file);
    };

    const handleSaveLogo = async () => {
        if (!logoPreview) {
            setNotification?.({ type: 'error', message: 'Escolha uma imagem antes de salvar.' });
            return;
        }

        setIsSaving(true);
        try {
            await setDoc(doc(db, 'settings', 'app'), { logoUrl: logoPreview }, { merge: true });
            setNotification?.({ type: 'success', message: 'Logomarca atualizada com sucesso!' });
            setLogoFile(null);
        } catch (error) {
            console.error('Erro ao salvar logomarca:', error);
            setNotification?.({ type: 'error', message: 'Não foi possível salvar a logomarca.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveLogo = async () => {
        if (!logoPreview) {
            return;
        }
        setIsRemoving(true);
        try {
            await setDoc(doc(db, 'settings', 'app'), { logoUrl: '' }, { merge: true });
            setNotification?.({ type: 'success', message: 'Logomarca removida.' });
            setLogoPreview('');
            setLogoFile(null);
        } catch (error) {
            console.error('Erro ao remover logomarca:', error);
            setNotification?.({ type: 'error', message: 'Não foi possível remover a logomarca.' });
        } finally {
            setIsRemoving(false);
        }
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Configurações do aplicativo</h1>
                <p className="text-gray-600 dark:text-gray-400">Personalize a identidade visual exibida no painel.</p>
            </header>

            <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Logomarca</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Recomendamos imagens quadradas (preferencialmente 256x256) nos formatos PNG ou SVG.
                </p>

                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="w-40 h-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-gray-900/40 overflow-hidden">
                        {logoPreview ? (
                            <img src={logoPreview} alt="Logomarca" className="max-w-full max-h-full object-contain" />
                        ) : (
                            <div className="flex flex-col items-center text-gray-400">
                                <ImageIcon size={36} />
                                <span className="text-xs mt-2 text-center">Pré-visualização</span>
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
                            <Button
                                type="button"
                                onClick={handleSaveLogo}
                                disabled={isSaving || !logoPreview}
                                icon={<Save size={18} />}
                            >
                                {isSaving ? 'Salvando...' : 'Salvar logomarca'}
                            </Button>
                            <Button
                                type="button"
                                variant="danger"
                                onClick={handleRemoveLogo}
                                disabled={isRemoving || (!logoPreview && !logoFile)}
                                icon={<Trash2 size={18} />}
                            >
                                {isRemoving ? 'Removendo...' : 'Remover'}
                            </Button>
                        </div>
                        <ul className="text-xs text-gray-500 dark:text-gray-400 list-disc list-inside space-y-1">
                            <li>Tamanho máximo permitido: 2MB.</li>
                            <li>Formatos aceitos: PNG, JPG, JPEG ou SVG.</li>
                            <li>A imagem é armazenada de forma segura junto às configurações do app.</li>
                        </ul>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Configuracoes;

