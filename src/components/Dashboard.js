import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { DollarSign, Wrench, Coins, Car, Award, Users, ClipboardList } from 'lucide-react';
import { Card, StatCard } from './ui/Card';

const TooltipWrapper = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-2 bg-gray-700 text-white rounded-md border border-gray-600 shadow-lg">
                <p className="label font-bold">{label}</p>
                {payload.map((pld, index) => (
                    <p key={index} style={{ color: pld.color }}>
                        {`${pld.name}: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pld.value)}`}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const Dashboard = ({
    setActivePage,
    stats,
    isDarkMode,
    isEmployeeView = false,
    employee,
    canFilter = false,
    professionals = [],
    selectedProfessionalId = 'all',
    onProfessionalChange,
}) => {
    const labels = stats.labels || {};
    const heading =
        labels.painelTitulo ||
        (isEmployeeView ? `Painel do profissional${employee?.name ? ` - ${employee.name.split(' ')[0]}` : ''}` : 'Painel da oficina');
    const chartSeriesKey = stats.chartSeriesKey || 'Receita';
    const chartSeriesLabel = stats.chartSeriesLabel || 'Receita';
    const rankingCtaText = labels.rankingCta || 'Ver detalhes no financeiro';
    const rankingCtaTarget = labels.rankingCtaTarget || 'financeiro';
    const proximosTitulo = labels.proximosAgendamentos || 'Proximos servicos';
    const selectedName = stats.selectedProfessionalName || '';

    const selectableProfessionals = [];
    const seenProfessionalIds = new Set();
    professionals.forEach(pro => {
        const id = pro && (pro.uid || pro.id);
        if (!id || seenProfessionalIds.has(id)) {
            return;
        }
        seenProfessionalIds.add(id);
        selectableProfessionals.push(pro);
    });
    const handleFilterChange = event => onProfessionalChange?.(event.target.value);

    const summaryCards = [
        {
            key: 'monthlyRevenue',
            title: labels.receitaMes || 'Receita do mes',
            value: stats.monthlyRevenue || 'R$ 0,00',
            icon: <DollarSign className="text-white" />,
            color: 'bg-emerald-500',
        },
        {
            key: 'monthlyCommission',
            title: labels.comissoesMes || 'Comissoes do mes',
            value: stats.monthlyCommission || 'R$ 0,00',
            icon: <Coins className="text-white" />,
            color: 'bg-purple-500',
        },
        {
            key: 'veiculosNoPatio',
            title: labels.veiculosNoPatio || 'Veiculos no patio',
            value: stats.veiculosNoPatio ?? 0,
            icon: <Car className="text-white" />,
            color: 'bg-orange-500',
        },
        {
            key: 'pendingBudgets',
            title: labels.orcamentosPendentes || 'Orcamentos pendentes',
            value: stats.pendingBudgets ?? 0,
            icon: <ClipboardList className="text-white" />,
            color: 'bg-rose-500',
        },
    ];

    const activityCards = [
        {
            key: 'receitaHoje',
            title: labels.receitaHoje || 'Receita de servicos (hoje)',
            value: stats.receitaHoje || 'R$ 0,00',
            icon: <DollarSign className="text-white" />,
            color: 'bg-blue-500',
        },
        {
            key: 'agendamentosHoje',
            title: labels.agendamentosHoje || 'Ordens do dia',
            value: stats.agendamentosHoje ?? 0,
            icon: <Wrench className="text-white" />,
            color: 'bg-sky-500',
        },
        {
            key: 'novosClientesMes',
            title: labels.novosClientes || 'Novos clientes (mes)',
            value: stats.novosClientesMes ?? 0,
            icon: <Users className="text-white" />,
            color: 'bg-indigo-500',
        },
        {
            key: 'comissoesPendentes',
            title: labels.comissoesPendentes || 'Repasses pendentes',
            value: stats.comissoesPendentes || 'R$ 0,00',
            icon: <Coins className="text-white" />,
            color: 'bg-yellow-500',
        },
    ];

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{heading}</h1>
                    {!isEmployeeView && selectedProfessionalId !== 'all' && selectedName && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Mostrando dados de {selectedName}
                        </p>
                    )}
                </div>
                {canFilter && (
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-300">
                            {labels.filtroTecnicos || 'Filtrar por tecnico'}
                        </label>
                        <select
                            value={selectedProfessionalId}
                            onChange={handleFilterChange}
                            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">Todos os tecnicos</option>
                            {selectableProfessionals.map(pro => {
                                const value = pro.uid || pro.id;
                                const label = pro.name || pro.email || value;
                                return (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
                {summaryCards.map(card => (
                    <StatCard
                        key={card.key}
                        title={card.title}
                        value={card.value}
                        icon={card.icon}
                        color={card.color}
                    />
                ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                {activityCards.map(card => (
                    <StatCard
                        key={card.key}
                        title={card.title}
                        value={card.value}
                        icon={card.icon}
                        color={card.color}
                    />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3">
                    <Card>
                        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">{labels.grafico || 'Faturamento da oficina (7 dias)'}</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={stats.receitaSemanal}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.3)" />
                                <XAxis dataKey="name" stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                                <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} tickFormatter={value => `R$${value}`} />
                                <Tooltip content={<TooltipWrapper />} />
                                <Legend />
                                <Line type="monotone" dataKey={chartSeriesKey} name={chartSeriesLabel} stroke="#3b82f6" strokeWidth={2} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Card>
                </div>
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">{proximosTitulo}</h2>
                        <div className="space-y-4 max-h-80 overflow-y-auto">
                            {stats.proximosAgendamentos.length > 0 ? (
                                stats.proximosAgendamentos.map(ag => (
                                    <div key={ag.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                        <div>
                                            <p className="font-semibold text-gray-800 dark:text-white">{ag.clientName}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{ag.vehiclePlate ? `Placa ${ag.vehiclePlate}` : 'Veiculo nao informado'}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{ag.services?.map(s => s.name).join(', ') || 'Servicos nao definidos'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-blue-600 dark:text-blue-400">{new Date(ag.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(ag.date).toLocaleDateString('pt-BR')}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 dark:text-gray-400">Nenhum servio agendado.</p>
                            )}
                        </div>
                    </Card>
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">{labels.ranking || 'Ranking de colaboradores'}</h2>
                            <Award className="text-yellow-500" />
                        </div>
                        {stats.rankingColaboradores.length > 0 ? (
                            <ul className="space-y-3">
                                {stats.rankingColaboradores.map((colab, index) => (
                                    <li key={colab.id} className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-gray-800 dark:text-white">{index + 1}. {colab.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Ordens finalizadas: {colab.orders}</p>
                                        </div>
                                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-300">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(colab.total)}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500 dark:text-gray-400">Sem dados de faturamento para exibir.</p>
                        )}
                        <div className="mt-6 text-right">
                            <button type="button" className="text-sm text-blue-600 hover:underline" onClick={() => setActivePage(rankingCtaTarget)}>
                                {rankingCtaText}
                            </button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
