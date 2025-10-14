import React, { useState, useEffect, useMemo } from 'react';
import { addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { userCollectionRef, userDocRef } from '../firebase';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { ArrowUpCircle, ArrowDownCircle, FileText, DollarSign, Calendar, Edit, Trash2 } from 'lucide-react';

const LancamentoManualModal = ({ isOpen, onClose, onSave, type, initialData }) => {
    const [formData, setFormData] = useState({ description: '', amount: '', date: new Date().toISOString().split('T')[0] });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    description: initialData.description || '',
                    amount: initialData.totalAmount?.toString() || initialData.amount?.toString() || '',
                    date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                });
            } else {
                setFormData({ description: '', amount: '', date: new Date().toISOString().split('T')[0] });
            }
        }
    }, [isOpen, initialData]);

    const handleSubmit = async event => {
        event.preventDefault();
        setIsSaving(true);
        try {
            const success = await onSave({ ...formData, type });
            if (success) {
                onClose();
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = event => setFormData({ ...formData, [event.target.name]: event.target.value });

    const isEditing = Boolean(initialData);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar lançamento manual' : type === 'receita' ? 'Adicionar entrada manual' : 'Adicionar despesa manual'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input name="description" value={formData.description} onChange={handleChange} placeholder="Descrição (ex: venda de serviço, compra de peças)" icon={<FileText size={18} />} required />
                <Input name="amount" type="number" step="0.01" value={formData.amount} onChange={handleChange} placeholder="Valor (R$)" icon={<DollarSign size={18} />} required />
                <Input name="date" type="date" value={formData.date} onChange={handleChange} icon={<Calendar size={18} />} required />
                <div className="flex justify-end space-x-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" disabled={isSaving}>{isSaving ? 'Salvando...' : isEditing ? 'Atualizar lançamento' : 'Salvar lançamento'}</Button>
                </div>
            </form>
        </Modal>
    );
};

const formatCurrency = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const formatDate = value => {
    if (!value) return 'N/A';
    if (typeof value === 'object' && value.seconds) {
        return new Date(value.seconds * 1000).toLocaleDateString('pt-BR');
    }
    return new Date(value).toLocaleDateString('pt-BR');
};

const RelatorioGeral = ({ transactions, onOpenModal, onEditTransaction, onDeleteTransaction }) => {
    const { totalReceitas, totalDespesas, saldo, sortedTransactions } = useMemo(() => {
        const sorted = [...transactions].sort((a, b) => {
            const dateA = a.date ? new Date(a.date) : new Date(0);
            const dateB = b.date ? new Date(b.date) : new Date(0);
            return dateB - dateA;
        });
        const receitas = sorted.filter(t => t.type === 'receita').reduce((sum, t) => sum + (t.totalAmount || t.amount || 0), 0);
        const despesas = sorted.filter(t => t.type === 'despesa').reduce((sum, t) => sum + (t.totalAmount || t.amount || 0), 0);
        return { totalReceitas: receitas, totalDespesas: despesas, saldo: receitas - despesas, sortedTransactions: sorted };
    }, [transactions]);

    const renderTipo = tipo => (tipo === 'receita' ? 'Entrada' : 'Saída');

    return (
        <div>
            <Card className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total de entradas</p>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(totalReceitas)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total de saídas</p>
                        <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDespesas)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Saldo geral</p>
                        <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(saldo)}</p>
                    </div>
                </div>
            </Card>
            <Card className="mb-6 flex justify-end gap-4">
                <Button onClick={() => onOpenModal('receita')} icon={<ArrowUpCircle size={18} />} variant="success">Adicionar entrada</Button>
                <Button onClick={() => onOpenModal('despesa')} icon={<ArrowDownCircle size={18} />} variant="danger">Adicionar despesa</Button>
            </Card>
            <Card>
                <h2 className="text-xl font-bold mb-4">Movimentações da oficina</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="p-4 font-semibold">Data</th>
                                <th className="p-4 font-semibold">Descrição</th>
                                <th className="p-4 font-semibold">Tipo</th>
                                <th className="p-4 font-semibold">Forma de pagamento</th>
                                <th className="p-4 font-semibold text-right">Mão de obra</th>
                                <th className="p-4 font-semibold text-right">Peças</th>
                                <th className="p-4 font-semibold text-right">Total</th>
                                <th className="p-4 font-semibold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {sortedTransactions.length > 0 ? (
                                sortedTransactions.map(transaction => {
                                    const isManual = transaction.manual || (!transaction.appointmentId && !transaction.services?.length);
                                    return (
                                        <tr key={transaction.id || `${transaction.date}-${transaction.description}`}>
                                            <td className="p-4">{formatDate(transaction.date)}</td>
                                            <td className="p-4">{transaction.description || transaction.services?.map(s => s.name).join(', ') || 'Sem descrição'}</td>
                                            <td className="p-4">{renderTipo(transaction.type)}</td>
                                            <td className="p-4">{transaction.paymentMethod ? transaction.paymentMethod.toUpperCase() : '--'}</td>
                                            <td className="p-4 text-right">{transaction.serviceAmount !== undefined ? formatCurrency(transaction.serviceAmount) : '--'}</td>
                                            <td className="p-4 text-right">{transaction.partsCost !== undefined ? formatCurrency(transaction.partsCost) : '--'}</td>
                                            <td className="p-4 text-right">{formatCurrency(transaction.totalAmount || transaction.amount)}</td>
                                            <td className="p-4 text-right space-x-2">
                                                {isManual ? (
                                                    <>
                                                        <Button variant="secondary" className="px-3 py-1 text-sm" onClick={() => onEditTransaction(transaction)} icon={<Edit size={16} />}>Editar</Button>
                                                        <Button variant="danger" className="px-3 py-1 text-sm" onClick={() => onDeleteTransaction(transaction)} icon={<Trash2 size={16} />}>Excluir</Button>
                                                    </>
                                                ) : (
                                                    <span className="text-sm text-gray-400">Integrado</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td className="p-4 text-center text-gray-500" colSpan={8}>Nenhuma movimentação registrada.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

const RelatorioRepasses = ({ transactions, professionals }) => {
    const repasses = useMemo(() => {
        const base = professionals.reduce((acc, prof) => {
            acc[prof.id] = { name: prof.name, total: 0 };
            return acc;
        }, {});

        transactions.filter(t => t.type === 'receita' && t.commission > 0).forEach(t => {
            if (t.professionalId && base[t.professionalId]) {
                base[t.professionalId].total += t.commission;
            }
        });

        return Object.values(base);
    }, [transactions, professionals]);

    const possuiDados = repasses.some(item => item.total > 0);

    return (
        <Card>
            <h2 className="text-xl font-bold mb-4">Repasses por técnico</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="p-4 font-semibold">Técnico</th>
                            <th className="p-4 font-semibold text-right">Total a pagar</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {possuiDados ? (
                            repasses.map(repasse => (
                                <tr key={repasse.name}>
                                    <td className="p-4">{repasse.name}</td>
                                    <td className="p-4 text-right font-medium text-blue-600">{formatCurrency(repasse.total)}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td className="p-4 text-center text-gray-500" colSpan={2}>Nenhum repasse registrado até o momento.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

const Financeiro = ({ userId, transactions, professionals, setNotification }) => {
    const [activeTab, setActiveTab] = useState('geral');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [transactionType, setTransactionType] = useState('receita');
    const [editingTransaction, setEditingTransaction] = useState(null);

    const handleOpenModal = type => {
        setTransactionType(type);
        setEditingTransaction(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingTransaction(null);
    };

    const handleSaveManualTransaction = async data => {
        if (!userId) {
            setNotification({ type: 'error', message: 'Sessao expirada. Faça login novamente.' });
            return false;
        }
        try {
            const amount = parseFloat(data.amount);
            if (!Number.isFinite(amount) || amount <= 0) {
                setNotification({ type: 'error', message: 'O valor deve ser maior que zero.' });
                return false;
            }

            const transactionData = {
                description: data.description,
                totalAmount: amount,
                date: new Date(data.date).toISOString(),
                manual: true,
                type: data.type,
                serviceAmount: data.type === 'receita' ? amount : 0,
                partsCost: data.type === 'despesa' ? amount : 0,
            };

            if (editingTransaction) {
                await updateDoc(userDocRef(userId, 'transactions', editingTransaction.id), transactionData);
                setNotification({ type: 'success', message: 'Lançamento atualizado com sucesso!' });
            } else {
                await addDoc(userCollectionRef(userId, 'transactions'), transactionData);
                setNotification({ type: 'success', message: 'Lançamento registrado com sucesso!' });
            }

            return true;
        } catch (error) {
            console.error('Erro ao salvar lançamento manual:', error);
            setNotification({ type: 'error', message: 'Não foi possível registrar o lançamento.' });
            return false;
        }
    };

    const handleEditTransaction = transaction => {
        setTransactionType(transaction.type);
        setEditingTransaction(transaction);
        setIsModalOpen(true);
    };

    const handleDeleteTransaction = async transaction => {
        if (!transaction.id) return;
        if (!userId) {
            setNotification({ type: 'error', message: 'Sessao expirada. Faça login novamente.' });
            return;
        }
        try {
            await deleteDoc(userDocRef(userId, 'transactions', transaction.id));
            setNotification({ type: 'success', message: 'Lançamento removido com sucesso.' });
        } catch (error) {
            console.error('Erro ao excluir lançamento:', error);
            setNotification({ type: 'error', message: 'Não foi possível excluir o lançamento.' });
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Financeiro da oficina</h1>
            <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('geral')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'geral' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Resumo financeiro
                    </button>
                    <button onClick={() => setActiveTab('repasses')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'repasses' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Repasses da equipe
                    </button>
                </nav>
            </div>

            {activeTab === 'geral' && (
                <RelatorioGeral
                    transactions={transactions}
                    onOpenModal={handleOpenModal}
                    onEditTransaction={handleEditTransaction}
                    onDeleteTransaction={handleDeleteTransaction}
                />
            )}
            {activeTab === 'repasses' && <RelatorioRepasses transactions={transactions} professionals={professionals} />}

            <LancamentoManualModal
                isOpen={isModalOpen}
                onClose={closeModal}
                onSave={handleSaveManualTransaction}
                type={transactionType}
                initialData={editingTransaction}
            />
        </div>
    );
};

export default Financeiro;

