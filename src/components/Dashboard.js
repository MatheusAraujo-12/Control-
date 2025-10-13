import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { DollarSign, Wrench, Coins, Car, Award, Users } from 'lucide-react';
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

const Dashboard = ({ setActivePage, stats, isDarkMode }) => (
    <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Painel da oficina</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6 mb-8">
            <StatCard title="Receita de serviços (hoje)" value={stats.receitaHoje} icon={<DollarSign className="text-white" />} color="bg-green-500" />
            <StatCard title="Ordens do dia" value={stats.agendamentosHoje} icon={<Wrench className="text-white" />} color="bg-blue-500" />
            <StatCard title="Veículos no pátio" value={stats.veiculosNoPatio} icon={<Car className="text-white" />} color="bg-orange-500" />
            <StatCard title="Novos clientes (mês)" value={stats.novosClientesMes} icon={<Users className="text-white" />} color="bg-indigo-500" />
            <StatCard title="Repasses pendentes" value={stats.comissoesPendentes} icon={<Coins className="text-white" />} color="bg-yellow-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3">
                <Card>
                    <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Faturamento da oficina (7 dias)</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={stats.receitaSemanal}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.3)" />
                            <XAxis dataKey="name" stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                            <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} tickFormatter={value => `R$${value}`} />
                            <Tooltip content={<TooltipWrapper />} />
                            <Legend />
                            <Line type="monotone" dataKey="Receita" stroke="#3b82f6" strokeWidth={2} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </Card>
            </div>
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Próximos serviços</h2>
                    <div className="space-y-4 max-h-80 overflow-y-auto">
                        {stats.proximosAgendamentos.length > 0 ? (
                            stats.proximosAgendamentos.map(ag => (
                                <div key={ag.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <div>
                                        <p className="font-semibold text-gray-800 dark:text-white">{ag.clientName}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{ag.vehiclePlate ? `Placa ${ag.vehiclePlate}` : 'Veículo não informado'}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{ag.services?.map(s => s.name).join(', ') || 'Serviços não definidos'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-blue-600 dark:text-blue-400">{new Date(ag.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(ag.date).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500 dark:text-gray-400">Nenhum serviço agendado.</p>
                        )}
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Ranking de colaboradores</h2>
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
                        <button type="button" className="text-sm text-blue-600 hover:underline" onClick={() => setActivePage('financeiro')}>
                            Ver detalhes no financeiro
                        </button>
                    </div>
                </Card>
            </div>
        </div>
    </div>
);

export default Dashboard;
