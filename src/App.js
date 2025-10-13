import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, getDocs, doc, setDoc } from 'firebase/firestore';
import { db, auth, onAuthStateChanged, signOut } from './firebase';

import Dashboard from './components/Dashboard';
import Clientes from './components/Clientes';
import Profissionais from './components/Profissionais';
import Servicos from './components/Servicos';
import Agenda from './components/Agenda';
import Financeiro from './components/Financeiro';
import Patio from './components/Patio';
import Orcamentos from './components/Orcamentos';
import Configuracoes from './components/Configuracoes';
import { Toast } from './components/ui/Toast';
import { Button } from './components/ui/Button';

import { Gauge, Calendar, Users, UserCog, Wrench, PiggyBank, Car, Warehouse, ClipboardList, Settings as SettingsIcon, LogOut, Sun, Moon } from 'lucide-react';

const formatCurrency = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const normalizeClient = client => ({
    id: client.id,
    name: client.name || '',
    cpf: client.cpf || '',
    phone: client.phone || '',
    email: client.email || '',
    vehicleBrand: client.vehicleBrand || '',
    vehicleModel: client.vehicleModel || '',
    vehicleYear: client.vehicleYear || '',
    vehiclePlate: client.vehiclePlate || '',
    createdAt: client.createdAt || null,
});

const normalizeProfessional = professional => ({
    id: professional.id,
    name: professional.name || '',
    email: professional.email || '',
    specialty: professional.specialty || '',
});

const normalizeService = service => ({
    id: service.id,
    name: service.name || '',
    price: Number.isFinite(service.price) ? service.price : 0,
    duration: Number.isFinite(service.duration) ? service.duration : 60,
    commissionType: service.commissionType || 'percentage',
    commissionValue: Number.isFinite(service.commissionValue) ? service.commissionValue : 0,
});

const normalizeAppointment = appointment => ({
    id: appointment.id,
    clientId: appointment.clientId || '',
    clientName: appointment.clientName || '',
    professionalId: appointment.professionalId || '',
    professionalName: appointment.professionalName || '',
    services: Array.isArray(appointment.services) ? appointment.services : [],
    date: appointment.date || new Date().toISOString(),
    status: appointment.status || 'agendado',
    vehicleBrand: appointment.vehicleBrand || '',
    vehicleModel: appointment.vehicleModel || '',
    vehiclePlate: appointment.vehiclePlate || '',
    notes: appointment.notes || '',
    partsCost: Number.isFinite(appointment.partsCost) ? appointment.partsCost : 0,
    paymentMethod: appointment.paymentMethod || 'pix',
    totalPrice: Number.isFinite(appointment.totalPrice) ? appointment.totalPrice : 0,
});

const normalizeTransaction = transaction => ({
    id: transaction.id,
    description: transaction.description || '',
    appointmentId: transaction.appointmentId || '',
    clientId: transaction.clientId || '',
    clientName: transaction.clientName || '',
    professionalId: transaction.professionalId || '',
    professionalName: transaction.professionalName || '',
    services: Array.isArray(transaction.services) ? transaction.services : [],
    date: transaction.date || new Date().toISOString(),
    type: transaction.type || 'receita',
    totalAmount: Number.isFinite(transaction.totalAmount) ? transaction.totalAmount : Number(transaction.amount || 0),
    serviceAmount: Number.isFinite(transaction.serviceAmount) ? transaction.serviceAmount : Number(transaction.totalAmount || 0),
    partsCost: Number.isFinite(transaction.partsCost) ? transaction.partsCost : 0,
    commission: Number.isFinite(transaction.commission) ? transaction.commission : 0,
    tip: Number.isFinite(transaction.tip) ? transaction.tip : 0,
    paymentMethod: transaction.paymentMethod || '',
    manual: transaction.manual || false,
});

const normalizeBudget = budget => ({
    id: budget.id,
    clientId: budget.clientId || '',
    clientName: budget.clientName || '',
    vehiclePlate: budget.vehiclePlate || '',
    vehicleModel: budget.vehicleModel || '',
    vehicleBrand: budget.vehicleBrand || '',
    services: Array.isArray(budget.services) ? budget.services : [],
    parts: Array.isArray(budget.parts) ? budget.parts : [],
    laborCost: Number.isFinite(budget.laborCost) ? budget.laborCost : 0,
    partsTotal: Number.isFinite(budget.partsTotal) ? budget.partsTotal : 0,
    servicesTotal: Number.isFinite(budget.servicesTotal) ? budget.servicesTotal : 0,
    discount: Number.isFinite(budget.discount) ? budget.discount : 0,
    total: Number.isFinite(budget.total) ? budget.total : 0,
    notes: budget.notes || '',
    status: budget.status || 'draft',
    createdAt: budget.createdAt || null,
    updatedAt: budget.updatedAt || null,
});

const normalizeYardVehicle = vehicle => ({
    id: vehicle.id,
    clientId: vehicle.clientId || '',
    clientName: vehicle.clientName || '',
    vehiclePlate: vehicle.vehiclePlate || '',
    vehicleModel: vehicle.vehicleModel || '',
    vehicleBrand: vehicle.vehicleBrand || '',
    bay: vehicle.bay || '',
    entryTime: vehicle.entryTime || new Date().toISOString(),
    status: vehicle.status || 'recebido',
    priority: vehicle.priority || 'normal',
    notes: vehicle.notes || '',
    expectedDelivery: vehicle.expectedDelivery || '',
    exitTime: vehicle.exitTime || '',
    professionalId: vehicle.professionalId || '',
    professionalName: vehicle.professionalName || '',
    appointmentId: vehicle.appointmentId || '',
});

const legacyCollections = [
    { source: 'demo_clients', target: 'clients' },
    { source: 'demo_professionals', target: 'professionals' },
    { source: 'demo_services', target: 'services' },
    { source: 'demo_appointments', target: 'appointments' },
    { source: 'demo_transactions', target: 'transactions' },
    { source: 'demo_yard', target: 'yard' },
];

export default function App() {
    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        if (sessionStorage.getItem('legacyMigrationDone')) {
            return;
        }
        const migrateLegacyCollections = async () => {
            try {
                for (const { source, target } of legacyCollections) {
                    const sourceSnapshot = await getDocs(collection(db, source));
                    if (sourceSnapshot.empty) {
                        continue;
                    }
                    await Promise.all(sourceSnapshot.docs.map((docSnapshot) => setDoc(doc(db, target, docSnapshot.id), docSnapshot.data(), { merge: true })));
                }
                sessionStorage.setItem('legacyMigrationDone', '1');
            } catch (migrationError) {
                console.error('Erro ao migrar dados legados:', migrationError);
            }
        };

        migrateLegacyCollections();
    }, []);


    const [activePage, setActivePage] = useState('dashboard');
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [notification, setNotification] = useState({ show: false, message: '', type: '' });

    const [clients, setClients] = useState([]);
    const [professionals, setProfessionals] = useState([]);
    const [services, setServices] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [yardVehicles, setYardVehicles] = useState([]);
    const [budgets, setBudgets] = useState([]);
    const [appSettings, setAppSettings] = useState({ logoUrl: '' });
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const collectionsToWatch = [
            { name: 'clients', setter: setClients, normalizer: normalizeClient },
            { name: 'professionals', setter: setProfessionals, normalizer: normalizeProfessional },
            { name: 'services', setter: setServices, normalizer: normalizeService },
            { name: 'appointments', setter: setAppointments, normalizer: normalizeAppointment },
            { name: 'transactions', setter: setTransactions, normalizer: normalizeTransaction },
            { name: 'budgets', setter: setBudgets, normalizer: normalizeBudget },
            { name: 'yard', setter: setYardVehicles, normalizer: normalizeYardVehicle },
        ];

        const unsubscribers = collectionsToWatch.map(({ name, setter, normalizer }) =>
            onSnapshot(
                collection(db, name),
                snapshot => setter(snapshot.docs.map(docSnapshot => normalizer({ id: docSnapshot.id, ...docSnapshot.data() }))),
                error => console.error(`Erro ao buscar ${name}: `, error)
            )
        );

        return () => unsubscribers.forEach(unsub => unsub());
    }, []);

    useEffect(() => {
        const settingsRef = doc(db, 'settings', 'app');
        const unsubscribe = onSnapshot(
            settingsRef,
            snapshot => {
                if (!snapshot.exists()) {
                    setAppSettings({ logoUrl: '' });
                    return;
                }
                const data = snapshot.data() || {};
                setAppSettings({
                    logoUrl: data.logoUrl || '',
                });
            },
            error => {
                console.error('Erro ao buscar configuracoes: ', error);
            }
        );

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, user => {
            setCurrentUser(user);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDarkMode);
    }, [isDarkMode]);

    const notify = payload => {
        if (typeof payload === 'string') {
            setNotification({ show: true, message: payload, type: 'success' });
            return;
        }
        setNotification({ show: true, ...payload });
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            notify('Sessao encerrada.');
        } catch (error) {
            console.error('Erro ao encerrar sessao:', error);
            notify({ type: 'error', message: 'Nao foi possivel encerrar a sessao.' });
        }
    };

    const dashboardStats = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const toDate = value => {
            if (!value) return null;
            if (typeof value === 'object' && value.seconds) {
                return new Date(value.seconds * 1000);
            }
            return new Date(value);
        };

        const isSameCalendarDay = value => {
            const parsed = toDate(value);
            if (!parsed) return false;
            return parsed.getFullYear() === today.getFullYear()
                && parsed.getMonth() === today.getMonth()
                && parsed.getDate() === today.getDate();
        };

        const receitaHojeValue = transactions
            .filter(transaction => transaction.type === 'receita' && isSameCalendarDay(transaction.date))
            .reduce((sum, transaction) => sum + (transaction.totalAmount || 0), 0);

        const agendamentosHoje = appointments.filter(appointment => isSameCalendarDay(appointment.date)).length;

        const novosClientesMes = clients.filter(client => {
            const createdAt = toDate(client.createdAt);
            if (!createdAt) return false;
            return createdAt.getFullYear() === today.getFullYear() && createdAt.getMonth() === today.getMonth();
        }).length;

        const comissoesPendentesValue = transactions
            .filter(transaction => transaction.type === 'receita')
            .reduce((sum, transaction) => sum + (transaction.commission || 0), 0);

        const receitaPorDia = new Map();
        transactions
            .filter(transaction => transaction.type === 'receita')
            .forEach(transaction => {
                const parsed = toDate(transaction.date);
                if (!parsed) return;
                parsed.setHours(0, 0, 0, 0);
                const key = parsed.toISOString().slice(0, 10);
                const totalAtual = receitaPorDia.get(key) || 0;
                receitaPorDia.set(key, totalAtual + (transaction.totalAmount || 0));
            });

        const receitaSemanal = Array.from({ length: 7 }, (_, index) => {
            const day = new Date(today);
            day.setDate(day.getDate() - (6 - index));
            const key = day.toISOString().slice(0, 10);
            return {
                name: `${day.getDate().toString().padStart(2, '0')}/${(day.getMonth() + 1).toString().padStart(2, '0')}`,
                Receita: receitaPorDia.get(key) || 0,
            };
        });

        const proximosAgendamentos = appointments
            .map(appointment => ({ ...appointment, parsedDate: toDate(appointment.date) }))
            .filter(appointment => appointment.parsedDate && appointment.parsedDate >= today)
            .sort((a, b) => a.parsedDate - b.parsedDate)
            .slice(0, 5)
            .map(appointment => ({
                id: appointment.id,
                clientName: appointment.clientName,
                date: appointment.parsedDate.toISOString(),
                services: appointment.services || [],
                vehiclePlate: appointment.vehiclePlate || '',
            }));

        const rankingMap = new Map();
        transactions
            .filter(transaction => transaction.type === 'receita')
            .forEach(transaction => {
                const key = transaction.professionalId || transaction.professionalName || 'equipe';
                const current = rankingMap.get(key) || {
                    id: transaction.professionalId || key,
                    name: transaction.professionalName || 'Equipe da oficina',
                    total: 0,
                    orders: 0,
                };
                current.total += transaction.totalAmount || 0;
                current.orders += 1;
                rankingMap.set(key, current);
            });

        const rankingColaboradores = Array.from(rankingMap.values())
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        const veiculosNoPatio = yardVehicles.filter(vehicle => !vehicle.exitTime).length;

        return {
            receitaHoje: formatCurrency(receitaHojeValue),
            agendamentosHoje,
            novosClientesMes,
            comissoesPendentes: formatCurrency(comissoesPendentesValue),
            receitaSemanal,
            proximosAgendamentos,
            rankingColaboradores,
            veiculosNoPatio,
        };
    }, [transactions, appointments, clients, yardVehicles]);

    const renderPage = () => {
        switch (activePage) {
            case 'dashboard':
                return <Dashboard setActivePage={setActivePage} stats={dashboardStats} isDarkMode={isDarkMode} />;
            case 'clientes':
                return <Clientes clients={clients} setNotification={notify} />;
            case 'profissionais':
                return <Profissionais professionals={professionals} setNotification={notify} />;
            case 'servicos':
                return <Servicos services={services} setNotification={notify} />;
            case 'agenda':
                return (
                    <Agenda
                        appointments={appointments}
                        professionals={professionals}
                        clients={clients}
                        services={services}
                        setNotification={notify}
                    />
                );
            case 'orcamentos':
                return (
                    <Orcamentos
                        budgets={budgets}
                        clients={clients}
                        services={services}
                        setNotification={notify}
                    />
                );
            case 'financeiro':
                return <Financeiro transactions={transactions} professionals={professionals} setNotification={notify} />;
            case 'patio':
                return <Patio vehicles={yardVehicles} professionals={professionals} clients={clients} setNotification={notify} />;
            case 'configuracoes':
                return <Configuracoes appSettings={appSettings} setNotification={notify} />;
            default:
                return <Dashboard setActivePage={setActivePage} stats={dashboardStats} isDarkMode={isDarkMode} />;
        }
    };

    const navItems = [
        { id: 'dashboard', label: 'Painel', icon: <Gauge size={20} /> },
        { id: 'agenda', label: 'Agenda da oficina', icon: <Calendar size={20} /> },
        { id: 'clientes', label: 'Clientes e veículos', icon: <Users size={20} /> },
        { id: 'profissionais', label: 'Equipe técnica', icon: <UserCog size={20} /> },
        { id: 'servicos', label: 'Serviços da oficina', icon: <Wrench size={20} /> },
        { id: 'orcamentos', label: 'Orçamentos', icon: <ClipboardList size={20} /> },
        { id: 'patio', label: 'Controle de pátio', icon: <Warehouse size={20} /> },
        { id: 'financeiro', label: 'Financeiro', icon: <PiggyBank size={20} /> },
        { id: 'configuracoes', label: 'Configurações', icon: <SettingsIcon size={20} /> },
    ];

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            {notification.show && (
                <Toast
                    message={notification.message}
                    type={notification.type}
                    onDismiss={() => setNotification({ show: false, message: '', type: '' })}
                />
            )}
            <aside className="w-64 bg-white dark:bg-gray-800 shadow-xl flex flex-col">
                <div className="h-20 flex items-center justify-center border-b border-gray-200 dark:border-gray-700 space-x-3">
                    {appSettings.logoUrl ? (
                        <img src={appSettings.logoUrl} alt="Logomarca" className="h-10 w-10 object-contain rounded" />
                    ) : (
                        <Car className="h-8 w-8 text-blue-600" />
                    )}
                    <span className="text-2xl font-bold">Control+ Oficina</span>
                </div>
                <nav className="flex-1 px-4 py-6 space-y-2">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setActivePage(item.id)}
                            className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors text-left ${activePage === item.id ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                        >
                            {item.icon}
                            <span className="ml-4 font-medium">{item.label}</span>
                        </button>
                    ))}
                </nav>
            </aside>
            <main className="flex-1 flex flex-col">
                <header className="h-20 bg-white dark:bg-gray-800 shadow-md flex items-center justify-between px-8">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Bem-vindo(a) ao Control+ Oficina</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Painel de gestão para oficinas mecânicas</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        {currentUser && (
                            <span className="text-sm text-gray-500 dark:text-gray-400">{currentUser.email}</span>
                        )}
                        <Button onClick={handleLogout} variant="secondary" icon={<LogOut size={16} />}>
                            Sair
                        </Button>
                        <Button onClick={() => setIsDarkMode(!isDarkMode)} variant="secondary" className="p-2">
                            {isDarkMode ? <Sun /> : <Moon />}
                        </Button>
                    </div>
                </header>
                <div className="flex-1 p-8 overflow-y-auto">
                    {renderPage()}
                </div>
            </main>
        </div>
    );
}
