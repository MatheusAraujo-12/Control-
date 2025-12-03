import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet, PieChart, BarChart3 } from 'lucide-react';

const Card = ({ title, value, icon: Icon, color, subValue }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                <h3 className="text-2xl font-bold mt-2 text-gray-800 dark:text-white">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                </h3>
                {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
            </div>
            <div className={`p-3 rounded-lg ${color}`}>
                <Icon size={24} className="text-white" />
            </div>
        </div>
    </div>
);

const FinanceiroFixed = ({ transactions = [] }) => {
    // Cálculos do Dashboard
    const stats = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let totalBalance = 0;
        let monthIncome = 0;
        let monthExpense = 0;
        const categoryTotals = {};

        transactions.forEach(t => {
            const val = Number(t.amount || 0);
            const date = new Date(t.date + 'T12:00:00'); // Ajuste fuso simples

            if (t.type === 'income') {
                totalBalance += val;
                if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
                    monthIncome += val;
                }
            } else {
                totalBalance -= val;
                if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
                    monthExpense += val;
                }
            }

            // Categorias (apenas despesas do mês para o gráfico de pizza)
            if (t.type === 'expense' && date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
                const cat = t.category || 'Outros';
                categoryTotals[cat] = (categoryTotals[cat] || 0) + val;
            }
        });

        // Ordenar categorias
        const sortedCategories = Object.entries(categoryTotals)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5); // Top 5

        return {
            totalBalance,
            monthIncome,
            monthExpense,
            monthBalance: monthIncome - monthExpense,
            topCategories: sortedCategories
        };
    }, [transactions]);

    // Mini Gráfico de Barras (CSS puro)
    const maxVal = Math.max(stats.monthIncome, stats.monthExpense, 1);
    const incomePercent = (stats.monthIncome / maxVal) * 100;
    const expensePercent = (stats.monthExpense / maxVal) * 100;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Visão Geral Financeira</h2>
                <span className="text-sm text-gray-500 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                    {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </span>
            </div>

            {/* Cards Principais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card
                    title="Saldo Total"
                    value={stats.totalBalance}
                    icon={Wallet}
                    color="bg-blue-600"
                    subValue="Acumulado geral"
                />
                <Card
                    title="Receitas (Mês)"
                    value={stats.monthIncome}
                    icon={TrendingUp}
                    color="bg-green-500"
                    subValue="Entradas este mês"
                />
                <Card
                    title="Despesas (Mês)"
                    value={stats.monthExpense}
                    icon={TrendingDown}
                    color="bg-red-500"
                    subValue="Saídas este mês"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfico Barras Simplificado */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-6">
                        <BarChart3 className="text-gray-500" size={20} />
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Balanço Mensal</h3>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600 dark:text-gray-300">Receitas</span>
                                <span className="font-bold text-green-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.monthIncome)}</span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3">
                                <div className="bg-green-500 h-3 rounded-full transition-all duration-500" style={{ width: `${incomePercent}%` }}></div>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600 dark:text-gray-300">Despesas</span>
                                <span className="font-bold text-red-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.monthExpense)}</span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3">
                                <div className="bg-red-500 h-3 rounded-full transition-all duration-500" style={{ width: `${expensePercent}%` }}></div>
                            </div>
                        </div>

                        <div className="pt-4 border-t dark:border-gray-700 flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Resultado do Mês</span>
                            <span className={`text-lg font-bold ${stats.monthBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.monthBalance)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Top Despesas */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-6">
                        <PieChart className="text-gray-500" size={20} />
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Top Despesas (Mês)</h3>
                    </div>

                    <div className="space-y-4">
                        {stats.topCategories.length > 0 ? (
                            stats.topCategories.map(([cat, val], idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                        <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">{cat}</span>
                                    </div>
                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-400 text-center py-8">Nenhuma despesa registrada este mês.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinanceiroFixed;
