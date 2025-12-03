import React, { useState, useEffect } from 'react';
import { addDoc, updateDoc, deleteDoc, serverTimestamp, query, onSnapshot, orderBy } from 'firebase/firestore';
import { userCollectionRef, userDocRef } from '../firebase';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { ConfirmModal } from './ui/ConfirmModal';
import { Plus, Edit, Trash2, Search, Package, AlertTriangle } from 'lucide-react';

const EstoqueFixed = ({ userId, setNotification }) => {
    const [items, setItems] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        price: '', // Preço de Venda
        cost: '',  // Preço de Custo
        stock: 0,
        minStock: 5
    });

    // Fetch Estoque (Peças)
    useEffect(() => {
        if (!userId) return;
        const q = query(userCollectionRef(userId, 'parts'), orderBy('name'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [userId]);

    useEffect(() => {
        if (currentItem) {
            setFormData(currentItem);
        } else {
            setFormData({
                name: '',
                price: '',
                cost: '',
                stock: 0,
                minStock: 5
            });
        }
    }, [currentItem, isModalOpen]);

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const dataToSave = {
                ...formData,
                price: Number(formData.price),
                cost: Number(formData.cost || 0),
                stock: Number(formData.stock),
                minStock: Number(formData.minStock),
                updatedAt: serverTimestamp()
            };

            if (currentItem) {
                await updateDoc(userDocRef(userId, 'parts', currentItem.id), dataToSave);
                setNotification({ type: 'success', message: 'Item atualizado!' });
            } else {
                await addDoc(userCollectionRef(userId, 'parts'), {
                    ...dataToSave,
                    createdAt: serverTimestamp()
                });
                setNotification({ type: 'success', message: 'Item criado!' });
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error("Erro ao salvar item:", error);
            setNotification({ type: 'error', message: 'Erro ao salvar.' });
        }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        try {
            await deleteDoc(userDocRef(userId, 'parts', itemToDelete));
            setNotification({ type: 'success', message: 'Item excluído!' });
            setIsDeleteModalOpen(false);
        } catch (error) {
            console.error("Erro ao excluir:", error);
            setNotification({ type: 'error', message: 'Erro ao excluir.' });
        }
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Controle de Estoque</h2>
                <Button onClick={() => { setCurrentItem(null); setIsModalOpen(true); }}>
                    <Plus size={20} className="mr-2" /> Novo Item
                </Button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-2 rounded-lg border dark:border-gray-600 w-full md:w-1/2">
                    <Search size={18} className="text-gray-500" />
                    <input
                        type="text"
                        placeholder="Buscar peça..."
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
                                <th className="px-6 py-3 font-medium">Nome</th>
                                <th className="px-6 py-3 font-medium">Estoque</th>
                                <th className="px-6 py-3 font-medium">Custo (R$)</th>
                                <th className="px-6 py-3 font-medium">Venda (R$)</th>
                                <th className="px-6 py-3 font-medium">Margem</th>
                                <th className="px-6 py-3 font-medium text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredItems.length > 0 ? (
                                filteredItems.map((item) => {
                                    const margin = item.price - (item.cost || 0);
                                    const marginPercent = item.cost > 0 ? (margin / item.cost) * 100 : 100;
                                    const isLowStock = item.stock <= (item.minStock || 5);

                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-800 dark:text-white">
                                                {item.name}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-bold ${isLowStock ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                                                        {item.stock}
                                                    </span>
                                                    {isLowStock && <AlertTriangle size={14} className="text-red-500" title="Estoque Baixo" />}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.cost || 0))}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-800 dark:text-white">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.price))}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${margin > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {marginPercent.toFixed(0)}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => { setCurrentItem(item); setIsModalOpen(true); }}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => { setItemToDelete(item.id); setIsDeleteModalOpen(true); }}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                                        Nenhum item encontrado.
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
                title={currentItem ? "Editar Item" : "Novo Item"}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <Input
                        label="Nome da Peça"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        icon={<Package size={18} />}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Preço de Custo (R$)"
                            type="number"
                            value={formData.cost}
                            onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                            step="0.01"
                        />
                        <Input
                            label="Preço de Venda (R$)"
                            type="number"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            required
                            step="0.01"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Estoque Atual"
                            type="number"
                            value={formData.stock}
                            onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                            required
                        />
                        <Input
                            label="Estoque Mínimo"
                            type="number"
                            value={formData.minStock}
                            onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                            required
                        />
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit">Salvar</Button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Excluir Item"
                message="Tem certeza que deseja excluir este item do estoque?"
            />
        </div>
    );
};

export default EstoqueFixed;
