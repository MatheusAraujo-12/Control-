import React, { useState, useEffect } from 'react';
import { addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { userCollectionRef, userDocRef } from '../firebase';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { ConfirmModal } from './ui/ConfirmModal';
import { Plus, Edit, Trash2, Search, ArrowUpCircle, ArrowDownCircle, Calendar } from 'lucide-react';

const TransacoesFixed = ({ userId, transactions = [], setNotification }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentTransaction, setCurrentTransaction] = useState(null);
    const [transactionToDelete, setTransactionToDelete] = useState(null);

    // Filtros
    const [filterType, setFilterType] = useState('all'); // all, income, expense
    const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        type: 'expense', // income, expense
        category: '',
        date: new Date().toISOString().split('T')[0],
        status: 'paid', // paid, pending
        paymentMethod: 'Pix'
    });

    // Categorias Sugeridas
    const incomeCategories = ['Venda', 'Serviço', 'Comissão', 'Outros'];
    const expenseCategories = ['Aluguel', 'Energia', 'Água', 'Internet', 'Salário', 'Fornecedor', 'Manutenção', 'Impostos', 'Outros'];

    useEffect(() => {
        if (currentTransaction) {
            setFormData(currentTransaction);
        } else {
            setFormData({
                description: '',
                amount: '',
                type: 'expense',
                category: '',
                date: new Date().toISOString().split('T')[0],
                status: 'paid',
                paymentMethod: 'Pix'
            });
        }
    }, [currentTransaction, isModalOpen]);

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const dataToSave = {
                ...formData,
                amount: Number(formData.amount),
                updatedAt: serverTimestamp()
            };

            if (currentTransaction) {
                await updateDoc(userDocRef(userId, 'transactions', currentTransaction.id), dataToSave);
                setNotification({ type: 'success', message: 'Transação atualizada!' });
            } else {
                await addDoc(userCollectionRef(userId, 'transactions'), {
                    ...dataToSave,
                    createdAt: serverTimestamp()
                });
                setNotification({ type: 'success', message: 'Transação criada!' });
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error("Erro ao salvar transação:", error);
            setNotification({ type: 'error', message: 'Erro ao salvar.' });
        }
    };

    const handleDelete = async () => {
        if (!transactionToDelete) return;
        try {
            await deleteDoc(userDocRef(userId, 'transactions', transactionToDelete));
            setNotification({ type: 'success', message: 'Transação excluída!' });
            setIsDeleteModalOpen(false);
        } catch (error) {
            console.error("Erro ao excluir:", error);
            setNotification({ type: 'error', message: 'Erro ao excluir.' });
        }
    };

    // Filtragem
    const filteredTransactions = transactions.filter(t => {
        const matchesType = filterType === 'all' || t.type === filterType;
        const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.category || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesMonth = t.date.startsWith(filterMonth);

        return matchesType && matchesSearch && matchesMonth;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Receitas e Despesas</h2>
                <Button onClick={() => { setCurrentTransaction(null); setIsModalOpen(true); }}>
                    <Plus size={20} className="mr-2" /> Nova Transação
                </Button>
            </div>

            {/* Barra de Filtros */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-2 rounded-lg border dark:border-gray-600">
                    <Calendar size={18} className="text-gray-500" />
                    <input
                        type="month"
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 text-sm text-gray-700 dark:text-gray-200"
                    />
                </div>

                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-2 rounded-lg border dark:border-gray-600 flex-1 min-w-[200px]">
                    <Search size={18} className="text-gray-500" />
                    <input
                        type="text"
                        placeholder="Buscar descrição ou categoria..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 text-sm w-full text-gray-700 dark:text-gray-200"
                    />
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setFilterType('all')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterType === 'all' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'}`}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => setFilterType('income')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterType === 'income' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'}`}
                    >
                        Receitas
                    </button>
                    <button
                        onClick={() => setFilterType('expense')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterType === 'expense' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'}`}
                    >
                        Despesas
                    </button>
                </div>
            </div>

            {/* Lista de Transações */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-3 font-medium">Data</th>
                                <th className="px-6 py-3 font-medium">Descrição</th>
                                <th className="px-6 py-3 font-medium">Categoria</th>
                                <th className="px-6 py-3 font-medium">Valor</th>
                                <th className="px-6 py-3 font-medium">Status</th>
                                <th className="px-6 py-3 font-medium text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredTransactions.length > 0 ? (
                                filteredTransactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                            {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-800 dark:text-white">
                                            <div className="flex items-center gap-2">
                                                {t.type === 'income' ? <ArrowUpCircle size={16} className="text-green-500" /> : <ArrowDownCircle size={16} className="text-red-500" />}
                                                {t.description}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                            <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-xs">
                                                {t.category || 'Geral'}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 font-bold whitespace-nowrap ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                            {t.type === 'expense' ? '-' : '+'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(t.amount))}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${t.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                                                {t.status === 'paid' ? 'Pago/Recebido' : 'Pendente'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => { setCurrentTransaction(t); setIsModalOpen(true); }}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => { setTransactionToDelete(t.id); setIsDeleteModalOpen(true); }}
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
                                        Nenhuma transação encontrada para este filtro.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Criação/Edição */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={currentTransaction ? "Editar Transação" : "Nova Transação"}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="flex gap-4">
                        <label className="flex-1 cursor-pointer">
                            <input
                                type="radio"
                                name="type"
                                value="income"
                                checked={formData.type === 'income'}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="peer sr-only"
                            />
                            <div className="p-2 text-center border rounded-lg peer-checked:bg-green-50 peer-checked:border-green-500 peer-checked:text-green-700 hover:bg-gray-50 transition-all">
                                Receita
                            </div>
                        </label>
                        <label className="flex-1 cursor-pointer">
                            <input
                                type="radio"
                                name="type"
                                value="expense"
                                checked={formData.type === 'expense'}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="peer sr-only"
                            />
                            <div className="p-2 text-center border rounded-lg peer-checked:bg-red-50 peer-checked:border-red-500 peer-checked:text-red-700 hover:bg-gray-50 transition-all">
                                Despesa
                            </div>
                        </label>
                    </div>

                    <Input
                        label="Descrição"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        required
                        placeholder="Ex: Pagamento de Luz"
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Valor (R$)"
                            type="number"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            required
                            step="0.01"
                        />
                        <Input
                            label="Data"
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Selecione...</option>
                                {(formData.type === 'income' ? incomeCategories : expenseCategories).map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="paid">{formData.type === 'income' ? 'Recebido' : 'Pago'}</option>
                                <option value="pending">Pendente</option>
                            </select>
                        </div>
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
                title="Excluir Transação"
                message="Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita."
            />
        </div>
    );
};

export default TransacoesFixed;
