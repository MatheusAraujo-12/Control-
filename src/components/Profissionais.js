import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, updateDoc, deleteDoc, query, onSnapshot, orderBy, serverTimestamp } from 'firebase/firestore';
import { userCollectionRef, userDocRef } from '../firebase';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { User, Phone, Mail, Lock, Briefcase, Edit, Trash2, Plus, DollarSign, Calendar } from 'lucide-react';

const resolveDateString = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value.split('T')[0];
    if (value?.toDate) return value.toDate().toISOString().split('T')[0];
    if (value?.seconds) return new Date(value.seconds * 1000).toISOString().split('T')[0];
    return '';
};

const Profissionais = ({ userId, professionals = [], transactions = [], setNotification }) => {
    // Dados de profissionais
    const [fetchedProfessionals, setFetchedProfessionals] = useState([]);
    const [mergedProfessionals, setMergedProfessionals] = useState([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProfessional, setCurrentProfessional] = useState(null);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [professionalToDelete, setProfessionalToDelete] = useState(null);

    // Filtros de pagamento
    const [selectedProfessionalId, setSelectedProfessionalId] = useState('');
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    });
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentData, setPaymentData] = useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'Pix',
        notes: '',
    });

    // Formulário de profissional
    const [formData, setFormData] = useState({
        name: '',
        role: 'Mecanico',
        phone: '',
        email: '',
        password: '',
    });

    // Busca lista de profissionais no Firestore (coleção nova)
    useEffect(() => {
        if (!userId) return;
        const q = query(userCollectionRef(userId, 'professionals'), orderBy('name'));
        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                setFetchedProfessionals(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
            },
            (error) => console.error('Erro ao buscar professionals:', error),
        );
        return () => unsubscribe();
    }, [userId]);

    // Une lista recebida por props com a lista do Firestore
    useEffect(() => {
        const combined = [...professionals, ...fetchedProfessionals];
        const unique = combined.filter((item, index, self) => index === self.findIndex((t) => t.id === item.id));
        unique.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setMergedProfessionals(unique);
    }, [professionals, fetchedProfessionals]);

    useEffect(() => {
        if (currentProfessional) {
            setFormData({
                name: currentProfessional.name || '',
                role: currentProfessional.role || 'Mecanico',
                phone: currentProfessional.phone || '',
                email: currentProfessional.email || '',
                password: currentProfessional.password || '',
            });
        } else {
            setFormData({
                name: '',
                role: 'Mecanico',
                phone: '',
                email: '',
                password: '',
            });
        }
    }, [currentProfessional]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!userId) return;

        try {
            const dataToSave = { ...formData };

            if (currentProfessional) {
                await updateDoc(userDocRef(userId, 'professionals', currentProfessional.id), dataToSave).catch(async (err) => {
                    console.warn('Tentativa de atualizar falhou (provavelmente colecao antiga):', err);
                    setNotification?.({
                        type: 'warning',
                        message: 'Atencao: editando registro legado. As alteracoes podem nao persistir se a colecao for diferente.',
                    });
                });

                setNotification?.({ type: 'success', message: 'Profissional atualizado!' });
            } else {
                await addDoc(userCollectionRef(userId, 'professionals'), dataToSave);
                setNotification?.({ type: 'success', message: 'Profissional cadastrado!' });
            }
            setIsModalOpen(false);
            setCurrentProfessional(null);
        } catch (error) {
            console.error('Erro ao salvar profissional:', error);
            setNotification?.({ type: 'error', message: 'Erro ao salvar profissional.' });
        }
    };

    const handleDeleteClick = (id) => {
        setProfessionalToDelete(id);
        setIsConfirmDeleteOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!professionalToDelete || !userId) return;
        try {
            await deleteDoc(userDocRef(userId, 'professionals', professionalToDelete)).catch((err) => {
                console.warn('Erro ao deletar (pode ser legado):', err);
                setNotification?.({ type: 'error', message: 'Nao foi possivel remover este item (pode ser um registro antigo).' });
            });
            setNotification?.({ type: 'success', message: 'Profissional removido.' });
            setIsConfirmDeleteOpen(false);
            setProfessionalToDelete(null);
        } catch (error) {
            console.error('Erro ao remover profissional:', error);
            setNotification?.({ type: 'error', message: 'Erro ao remover.' });
        }
    };

    const rhPayments = useMemo(
        () =>
            transactions
                .filter(
                    (t) =>
                        t.type === 'expense' &&
                        (t.module === 'rh' || t.category === 'Pagamentos RH' || t.professionalId),
                )
                .map((t) => ({
                    ...t,
                    date: resolveDateString(t.date),
                    amount: Number(t.amount ?? t.totalAmount ?? 0),
                })),
        [transactions],
    );

    const filteredPayments = useMemo(() => {
        return rhPayments
            .filter((payment) => {
                const matchesProfessional =
                    !selectedProfessionalId || selectedProfessionalId === 'all'
                        ? true
                        : payment.professionalId === selectedProfessionalId;
                const paymentDate = resolveDateString(payment.date);
                const matchesDate =
                    (!dateRange.start || paymentDate >= dateRange.start) &&
                    (!dateRange.end || paymentDate <= dateRange.end);
                return matchesProfessional && matchesDate;
            })
            .sort((a, b) => new Date(b.date || '1970-01-01') - new Date(a.date || '1970-01-01'));
    }, [rhPayments, selectedProfessionalId, dateRange]);

    const totalPaidInPeriod = useMemo(
        () => filteredPayments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0),
        [filteredPayments],
    );

    const handleRegisterPayment = async () => {
        if (!userId) return;
        if (!selectedProfessionalId) {
            setNotification?.({ type: 'error', message: 'Selecione um profissional para registrar o pagamento.' });
            return;
        }

        const amountValue = Number(paymentData.amount);
        if (!amountValue || amountValue <= 0) {
            setNotification?.({ type: 'error', message: 'Informe um valor valido para o pagamento.' });
            return;
        }

        try {
            const professional = mergedProfessionals.find((p) => p.id === selectedProfessionalId);

            await addDoc(userCollectionRef(userId, 'transactions'), {
                description: `Pagamento RH - ${professional?.name || 'Profissional'}`,
                amount: amountValue,
                totalAmount: amountValue,
                type: 'expense',
                category: 'Pagamentos RH',
                date: paymentData.date,
                status: 'paid',
                paymentMethod: paymentData.paymentMethod || 'Pix',
                notes: paymentData.notes,
                professionalId: selectedProfessionalId,
                professionalName: professional?.name || '',
                module: 'rh',
                createdAt: serverTimestamp(),
            });

            setNotification?.({ type: 'success', message: 'Pagamento registrado e enviado ao financeiro.' });
            setIsPaymentModalOpen(false);
            setPaymentData({
                amount: '',
                date: new Date().toISOString().split('T')[0],
                paymentMethod: 'Pix',
                notes: '',
            });
        } catch (error) {
            console.error('Erro ao registrar pagamento:', error);
            setNotification?.({ type: 'error', message: 'Erro ao registrar pagamento.' });
        }
    };

    return (
        <div className="space-y-10">
            <div className="flex flex-wrap justify-between items-center gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Gestao de Profissionais</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Cadastre a equipe e registre pagamentos de RH.</p>
                </div>
                <Button onClick={() => { setCurrentProfessional(null); setIsModalOpen(true); }} icon={<Plus size={18} />}>
                    Novo Profissional
                </Button>
            </div>

            {/* Lista de profissionais */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Equipe cadastrada</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {mergedProfessionals.length === 0 && (
                        <div className="col-span-full text-center text-gray-500 py-8">Nenhum profissional cadastrado.</div>
                    )}
                    {mergedProfessionals.map((pro) => (
                        <div
                            key={pro.id}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-blue-500 hover:shadow-lg transition-shadow"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">{pro.name}</h3>
                                    <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                        {pro.role}
                                    </span>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => { setCurrentProfessional(pro); setIsModalOpen(true); }}
                                        className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteClick(pro.id)}
                                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                                <div className="flex items-center gap-2">
                                    <Phone size={16} className="text-gray-400" /> {pro.phone || 'Sem telefone'}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail size={16} className="text-gray-400" /> {pro.email || 'Sem e-mail'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Pagamentos RH */}
            <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Pagamentos RH</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Filtre e registre pagamentos por profissional e período.</p>
                    </div>
                    <Button
                        onClick={() => {
                            setPaymentData((prev) => ({ ...prev, amount: '' }));
                            setIsPaymentModalOpen(true);
                        }}
                        disabled={!selectedProfessionalId}
                        icon={<DollarSign size={18} />}
                    >
                        Registrar Pagamento
                    </Button>
                </div>

                {/* Filtros de Pagamentos */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Profissional</label>
                        <select
                            className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:text-white"
                            value={selectedProfessionalId}
                            onChange={(e) => setSelectedProfessionalId(e.target.value)}
                        >
                            <option value="">Todos</option>
                            {mergedProfessionals.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">De</label>
                        <Input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ate</label>
                        <Input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        />
                    </div>
                </div>

                {/* Resumo */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                        <h4 className="text-sm text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider">
                            Total pago no periodo
                        </h4>
                        <p className="text-2xl font-bold text-blue-800 dark:text-blue-200 mt-1">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPaidInPeriod)}
                        </p>
                    </div>
                </div>

                {/* Tabela de Pagamentos */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[640px]">
                            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-200 uppercase text-xs">
                                <tr>
                                    <th className="p-4">Data</th>
                                    <th className="p-4">Profissional</th>
                                    <th className="p-4">Forma</th>
                                    <th className="p-4">Valor</th>
                                    <th className="p-4">Observacoes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredPayments.length > 0 ? (
                                    filteredPayments.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="p-4 text-gray-500">
                                                {item.date ? new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR') : 'N/A'}
                                            </td>
                                            <td className="p-4">
                                                <div className="font-medium text-gray-800 dark:text-white">{item.professionalName || '-'}</div>
                                                <div className="text-xs text-gray-500">{item.category || 'Pagamentos RH'}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                                    {item.paymentMethod || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="p-4 font-bold text-red-600">
                                                -{' '}
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                                    Number(item.amount || 0),
                                                )}
                                            </td>
                                            <td className="p-4 text-gray-600 dark:text-gray-300 max-w-xs">
                                                {item.notes || '—'}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-gray-500">
                                            Nenhum pagamento encontrado para este filtro.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Modal de cadastro/edicao de profissional */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={currentProfessional ? 'Editar Profissional' : 'Novo Profissional'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Nome Completo"
                        icon={<User size={18} />}
                        required
                    />

                    <div className="relative">
                        <Briefcase className="absolute left-3 top-3 text-gray-400" size={18} />
                        <select
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className="w-full pl-10 p-2 border rounded bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="Mecanico">Mecanico</option>
                            <option value="Atendente">Atendente</option>
                            <option value="Gerente">Gerente</option>
                            <option value="Auxiliar">Auxiliar</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input name="phone" value={formData.phone} onChange={handleChange} placeholder="Telefone" icon={<Phone size={18} />} />
                        <Input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="E-mail de Login" icon={<Mail size={18} />} />
                    </div>

                    <Input
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Senha de Acesso"
                        icon={<Lock size={18} />}
                    />

                    <div className="flex justify-end pt-4">
                        <Button type="submit">Salvar</Button>
                    </div>
                </form>
            </Modal>

            {/* Modal de Pagamento */}
            <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Registrar Pagamento (RH)">
                <div className="space-y-4">
                    <div className="bg-yellow-50 p-3 rounded text-sm text-yellow-800 border border-yellow-200">
                        Isso cria uma despesa em Transacoes Financeiras vinculada ao profissional selecionado.
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-200">
                        Profissional:{' '}
                        <strong>{mergedProfessionals.find((p) => p.id === selectedProfessionalId)?.name || 'Selecione no filtro acima'}</strong>
                    </div>
                    <Input
                        label="Valor (R$)"
                        type="number"
                        value={paymentData.amount}
                        onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                        icon={<DollarSign size={18} />}
                    />
                    <Input
                        label="Data do Pagamento"
                        type="date"
                        value={paymentData.date}
                        onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })}
                        icon={<Calendar size={18} />}
                    />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Forma de Pagamento</label>
                        <select
                            className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:text-white"
                            value={paymentData.paymentMethod}
                            onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                        >
                            <option value="Pix">Pix</option>
                            <option value="Transferencia">Transferencia</option>
                            <option value="Dinheiro">Dinheiro</option>
                            <option value="Cartao">Cartao</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observacoes</label>
                        <textarea
                            className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:text-white"
                            rows="3"
                            value={paymentData.notes}
                            onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                            placeholder="Ex: Salario do mes, adiantamento, etc."
                        />
                    </div>
                    <div className="flex justify-end pt-4 gap-2">
                        <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleRegisterPayment}>Confirmar Pagamento</Button>
                    </div>
                </div>
            </Modal>

            {/* Modal de Confirmacao de Exclusao */}
            {isConfirmDeleteOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-sm shadow-xl">
                        <h3 className="text-lg font-bold mb-2 dark:text-white">Confirmar Exclusao</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            Tem certeza que deseja remover este profissional? Esta acao nao pode ser desfeita.
                        </p>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsConfirmDeleteOpen(false)}>
                                Cancelar
                            </Button>
                            <Button variant="danger" onClick={handleConfirmDelete}>
                                Confirmar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profissionais;
