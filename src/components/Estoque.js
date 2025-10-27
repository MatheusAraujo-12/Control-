import React, { useState, useEffect } from 'react';
import { addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { userCollectionRef, userDocRef } from '../firebase';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Plus, Edit, Upload, Download } from 'lucide-react';
import Papa from 'papaparse';

const emptyEstoqueItem = {
    name: '',
    description: '',
    quantity: 0,
    price: 0,
    supplier: '',
};

const EstoqueFormModal = ({ isOpen, onClose, item, onSave }) => {
    const [formData, setFormData] = useState(emptyEstoqueItem);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setFormData(item ? { ...emptyEstoqueItem, ...item } : emptyEstoqueItem);
    }, [item, isOpen]);

    const handleChange = event => {
        const { name, value } = event.target;
        setFormData({ ...formData, [name]: value });
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
            console.error("Erro ao salvar item do estoque:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={item ? 'Editar Item' : 'Novo Item no Estoque'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input name="name" value={formData.name} onChange={handleChange} placeholder="Nome do item" required />
                <Input name="description" value={formData.description} onChange={handleChange} placeholder="Descrição" />
                <Input name="quantity" type="number" value={formData.quantity} onChange={handleChange} placeholder="Quantidade" required />
                <Input name="price" type="number" value={formData.price} onChange={handleChange} placeholder="Preço" />
                <Input name="supplier" value={formData.supplier} onChange={handleChange} placeholder="Fornecedor" />

                <div className="flex justify-end space-x-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" disabled={isSaving}>{isSaving ? "Salvando..." : "Salvar"}</Button>
                </div>
            </form>
        </Modal>
    );
};

const EstoqueUploadModal = ({ isOpen, onClose, onUpload, setNotification }) => {
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = (event) => {
        setFile(event.target.files[0]);
    };

    const handleUpload = () => {
        if (!file) {
            setNotification({ type: 'error', message: 'Por favor, selecione um arquivo.' });
            return;
        }

        setIsUploading(true);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    await onUpload(results.data);
                    onClose();
                } catch (error) {
                    setNotification({ type: 'error', message: `Erro ao importar planilha: ${error.message}` });
                } finally {
                    setIsUploading(false);
                }
            },
            error: (error) => {
                setNotification({ type: 'error', message: `Erro ao ler o arquivo: ${error.message}` });
                setIsUploading(false);
            }
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Importar Itens de Estoque de Planilha CSV">
            <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">Selecione um arquivo CSV para importar os itens de estoque. Certifique-se de que a planilha tenha as colunas: <strong>name, description, quantity, price, supplier</strong>.</p>
                <Input type="file" accept=".csv" onChange={handleFileChange} />
                <div className="flex justify-end space-x-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleUpload} disabled={isUploading}>{isUploading ? 'Importando...' : 'Importar'}</Button>
                </div>
            </div>
        </Modal>
    );
};

const Estoque = ({ userId, estoque, setNotification }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);

    const openModal = item => {
        setCurrentItem(item);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentItem(null);
    };

    const handleSave = async itemData => {
        if (!userId) {
            setNotification({ type: 'error', message: 'Sessão expirada. Faça login novamente.' });
            return false;
        }
        try {
            const parsedItemData = {
                ...itemData,
                quantity: parseInt(itemData.quantity, 10),
                price: parseFloat(itemData.price),
            };

            if ([parsedItemData.quantity, parsedItemData.price].some(value => Number.isNaN(value))) {
                setNotification({ type: 'error', message: 'Preencha valores numéricos válidos para quantidade e preço.' });
                return false;
            }

            if (currentItem) {
                await updateDoc(userDocRef(userId, 'estoque', currentItem.id), parsedItemData);
                setNotification({ type: 'success', message: 'Item atualizado com sucesso!' });
            } else {
                await addDoc(userCollectionRef(userId, 'estoque'), { ...parsedItemData, createdAt: serverTimestamp() });
                setNotification({ type: 'success', message: 'Item adicionado ao estoque com sucesso!' });
            }
            return true;
        } catch (error) {
            console.error('Erro ao salvar item do estoque:', error);
            setNotification({ type: 'error', message: 'Não foi possível salvar o item.' });
            return false;
        }
    };

    const handleDownloadTemplate = () => {
        const headers = 'name,description,quantity,price,supplier';
        const csvContent = `data:text/csv;charset=utf-8,${headers}`;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'modelo_estoque.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUpload = async (data) => {
        if (!userId) {
            setNotification({ type: 'error', message: 'Sessão expirada. Faça login novamente.' });
            return;
        }

        const promises = data.map(item => {
            const itemData = {
                name: item.name || '',
                description: item.description || '',
                quantity: parseInt(item.quantity, 10) || 0,
                price: parseFloat(item.price) || 0,
                supplier: item.supplier || '',
            };
            return addDoc(userCollectionRef(userId, 'estoque'), { ...itemData, createdAt: serverTimestamp() });
        });

        await Promise.all(promises);
        setNotification({ type: 'success', message: `${data.length} itens de estoque importados com sucesso!` });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Controle de Estoque</h1>
                <div className="flex space-x-2">
                    <Button onClick={() => setIsUploadModalOpen(true)} variant="outline" icon={<Upload size={18} />}>Importar de Planilha</Button>
                    <Button onClick={handleDownloadTemplate} variant="outline" icon={<Download size={18} />}>Baixar Modelo</Button>
                    <Button onClick={() => openModal(null)} icon={<Plus size={18} />}>Novo Item</Button>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="p-4 font-semibold">Item</th>
                                <th className="p-4 font-semibold">Descrição</th>
                                <th className="p-4 font-semibold">Quantidade</th>
                                <th className="p-4 font-semibold">Preço</th>
                                <th className="p-4 font-semibold">Fornecedor</th>
                                <th className="p-4 font-semibold">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {estoque.map(item => (
                                <tr key={item.id}>
                                    <td className="p-4">{item.name}</td>
                                    <td className="p-4">{item.description}</td>
                                    <td className="p-4">{item.quantity}</td>
                                    <td className="p-4">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}</td>
                                    <td className="p-4">{item.supplier}</td>
                                    <td className="p-4">
                                        <Button onClick={() => openModal(item)} variant="secondary"><Edit size={16} /></Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <EstoqueFormModal
                isOpen={isModalOpen}
                onClose={closeModal}
                item={currentItem}
                onSave={handleSave}
            />
            <EstoqueUploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} onUpload={handleUpload} setNotification={setNotification} />
        </div>
    );
};

export default Estoque;
