import React, { useState, useEffect } from 'react';
import { query, getDocs } from 'firebase/firestore';
import { userCollectionRef } from '../firebase';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

const Financeiro = ({ userId, transactions = [] }) => {
    const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [summary, setSummary] = useState({ revenue: 0, expenses: 0, profit: 0 });
    const [osPayments, setOsPayments] = useState([]);

    // Buscar pagamentos de OS do mês (Receitas de Serviços)
    useEffect(() => {
        const fetchOSPayments = async () => {
            if (!userId) return;
            try {
                const qOS = query(userCollectionRef(userId, 'ordens-de-serviço'));
                const osSnapshot = await getDocs(qOS);
                const payments = [];
                osSnapshot.docs.forEach(doc => {
                    const os = doc.data();
                    if (os.payments && Array.isArray(os.payments)) {
                        os.payments.forEach(pay => {
                            if (pay.date && pay.date.startsWith(filterDate)) {
                                payments.push({
                                    id: `${doc.id}_${pay.id}`,
                                    amount: Number(pay.amount),
                                    type: 'income',
                                    date: pay.date,
                                    source: 'os'
                                });
                            }
                        });
                    }
                });
                setOsPayments(payments);
            } catch (error) {
                console.error("Erro ao buscar pagamentos de OS:", error);
            }
        };

        fetchOSPayments();
    }, [userId, filterDate]);

    // Calcular Resumo (Transações Manuais + OS)
    useEffect(() => {
        // Filtrar transações manuais pelo mês selecionado
        const filteredTransactions = transactions.filter(t => t.date.startsWith(filterDate));

        // Combinar tudo
        const allItems = [...filteredTransactions, ...osPayments];

        const rev = allItems.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
        const exp = allItems.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);

        setSummary({ revenue: rev, expenses: exp, profit: rev - exp });
    }, [transactions, osPayments, filterDate]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Visão Geral Financeira</h1>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Input
                        type="month"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="w-full sm:w-40"
                    />
                </div>
            </div>

            {/* Cards Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-green-600 dark:text-green-400 font-medium">Receitas</p>
                            <h3 className="text-2xl font-bold text-green-800 dark:text-green-300">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.revenue)}
                            </h3>
                            <p className="text-xs text-green-600/70 mt-1">Inclui pagamentos de OS</p>
                        </div>
                        <div className="p-3 bg-green-100 dark:bg-green-800 rounded-full text-green-600 dark:text-green-200"><TrendingUp size={24} /></div>
                    </div>
                </Card>
                <Card className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-red-600 dark:text-red-400 font-medium">Despesas</p>
                            <h3 className="text-2xl font-bold text-red-800 dark:text-red-300">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.expenses)}
                            </h3>
                        </div>
                        <div className="p-3 bg-red-100 dark:bg-red-800 rounded-full text-red-600 dark:text-red-200"><TrendingDown size={24} /></div>
                    </div>
                </Card>
                <Card className={`border-2 ${summary.profit >= 0 ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800'}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 font-medium">Lucro Líquido</p>
                            <h3 className={`text-2xl font-bold ${summary.profit >= 0 ? 'text-blue-800 dark:text-blue-300' : 'text-orange-800 dark:text-orange-300'}`}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.profit)}
                            </h3>
                        </div>
                        <div className="p-3 bg-white dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300"><DollarSign size={24} /></div>
                    </div>
                </Card>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-800 text-center text-sm text-blue-800 dark:text-blue-200">
                Para visualizar detalhes ou lançar novas receitas e despesas, acesse a aba <strong>Transações Financeiras</strong>.
            </div>
        </div>
    );
};

export default Financeiro;
