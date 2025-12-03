import React, { useState, useEffect } from 'react';
import { addDoc, updateDoc, deleteDoc, serverTimestamp, query, onSnapshot, orderBy } from 'firebase/firestore';
import { userCollectionRef, userDocRef } from '../firebase';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { ConfirmModal } from './ui/ConfirmModal';
import { Plus, Edit, Trash2, Search } from 'lucide-react';

const NotasFiscaisFixed = ({ userId, setNotification }) => {
    const [invoices, setInvoices] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentInvoice, setCurrentInvoice] = useState(null);
    const [invoiceToDelete, setInvoiceToDelete] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        number: '',
        provider: '',
        date: new Date().toISOString().split('T')[0],
        value: '',
        accessKey: '',
        description: ''
    });

    // Fetch Notas
    useEffect(() => {
        if (!userId) return;
        const q = query(userCollectionRef(userId, 'invoices'), orderBy('date', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [userId]);

    useEffect(() => {
        if (currentInvoice) {
            setFormData(currentInvoice);
        } else {
            setFormData({
                number: '',
                provider: '',
                date: new Date().toISOString().split('T')[0],
                value: '',
                accessKey: '',
                description: ''
            });
        }
    }, [currentInvoice, isModalOpen]);

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const dataToSave = {
                ...formData,
                value: Number(formData.value),
                updatedAt: serverTimestamp()
            };

            if (currentInvoice) {
                await updateDoc(userDocRef(userId, 'invoices', currentInvoice.id), dataToSave);
                setNotification({ type: 'success', message: 'Nota atualizada!' });
            } else {
                await addDoc(userCollectionRef(userId, 'invoices'), {
                    ...dataToSave,
                    createdAt: serverTimestamp()
                });
                setNotification({ type: 'success', message: 'Nota registrada!' });
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error("Erro ao salvar nota:", error);
            setNotification({ type: 'error', message: 'Erro ao salvar.' });
        }
    };

    const handleDelete = async () => {
        if (!invoiceToDelete) return;
        try {
            await deleteDoc(userDocRef(userId, 'invoices', invoiceToDelete));
            setNotification({ type: 'success', message: 'Nota excluída!' });
            setIsDeleteModalOpen(false);
        } catch (error) {
            console.error("Erro ao excluir:", error);
            setNotification({ type: 'error', message: 'Erro ao excluir.' });
        }
    };

    const filteredInvoices = invoices.filter(inv =>
        inv.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.number.includes(searchTerm) ||
        (inv.accessKey || '').includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Notas Fiscais (Entrada)</h2>
                <Button onClick={() => { setCurrentInvoice(null); setIsModalOpen(true); }}>
                    <Plus size={20} className="mr-2" /> Registrar Nota
                </Button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-2 rounded-lg border dark:border-gray-600 w-full md:w-1/2">
                    <Search size={18} className="text-gray-500" />
                    <input
                        type="text"
                        placeholder="Buscar por fornecedor, número ou chave..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 text-sm w-full text-gray-700 dark:text-gray-200"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-3 font-medium">Emissão</th>
                                <th className="px-6 py-3 font-medium">Número</th>
                                <th className="px-6 py-3 font-medium">Fornecedor</th>
                                <th className="px-6 py-3 font-medium">Valor</th>
                                <th className="px-6 py-3 font-medium">Chave de Acesso</th>
                                <th className="px-6 py-3 font-medium text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredInvoices.length > 0 ? (
                                filteredInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                            {new Date(inv.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-800 dark:text-white">
                                            {inv.number}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                            {inv.provider}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-800 dark:text-white">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(inv.value))}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500 font-mono">
                                            {inv.accessKey || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => { setCurrentInvoice(inv); setIsModalOpen(true); }}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => { setInvoiceToDelete(inv.id); setIsDeleteModalOpen(true); }}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                                        Nenhuma nota fiscal encontrada.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={currentInvoice ? "Editar Nota Fiscal" : "Registrar Nota Fiscal"}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Número da Nota"
                            value={formData.number}
                            onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                            placeholder="Nº da nota fiscal"
                            required
                        />
                        <Input
                            label="Data de Emissão"
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            placeholder="Data de emissão"
                            required
                        />
                    </div>

                    <Input
                        label="Fornecedor"
                        value={formData.provider}
                        onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                        placeholder="Fornecedor"
                        required
                    />

                    <Input
                        label="Valor Total (R$)"
                        type="number"
                        value={formData.value}
                        onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                        placeholder="Valor total da nota fiscal"
                        required
                        step="0.01"
                    />

                    <Input
                        label="Chave de Acesso (44 dígitos)"
                        value={formData.accessKey}
                        onChange={(e) => setFormData({ ...formData, accessKey: e.target.value })}
                        placeholder="Chave de acesso (44 dígitos)"
                        maxLength={44}
                    />

                    <Input
                        label="Descrição / Observações"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Descrição / Observações"
                    />

                    <div className="flex justify-end pt-4">
                        <Button type="submit">Salvar</Button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Excluir Nota"
                message="Tem certeza que deseja excluir esta nota fiscal?"
            />
        </div>
    );
};

export default NotasFiscaisFixed;
