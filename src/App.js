import React, { useState, useEffect, useMemo } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { auth, onAuthStateChanged, signOut, userCollectionRef, userDocRef } from './firebase';

import Dashboard from './components/Dashboard';
import Clientes from './components/Clientes';
import Profissionais from './components/Profissionais';
import Servicos from './components/Servicos';
import Agenda from './components/Agenda';
import Financeiro from './components/Financeiro';
import Patio from './components/Patio';
import Orcamentos from './components/Orcamentos';
import Configuracoes from './components/Configuracoes';
import Auth from './components/Auth';
import { Toast } from './components/ui/Toast';
import { Button } from './components/ui/Button';

import {
    Gauge,
    Calendar,
    Users,
    UserCog,
    Wrench,
    PiggyBank,
    Car,
    Warehouse,
    ClipboardList,
    Settings as SettingsIcon,
    LogOut,
    Sun,
    Moon,
    Menu,
    X,
} from 'lucide-react';

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
    budgetNumber: budget.budgetNumber || '',
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

export default function App() {
    const [activePage, setActivePage] = useState('dashboard');
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [notification, setNotification] = useState({ show: false, message: '', type: '' });

    const [clients, setClients] = useState([]);
    const [professionals, setProfessionals] = useState([]);
    const [services, setServices] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [yardVehicles, setYardVehicles] = useState([]);
    const [budgets, setBudgets] = useState([]);
    const [appSettings, setAppSettings] = useState({
        logoUrl: '',
        companyName: '',
        companyEmail: '',
        companyPhone: '',
        companyDocument: '',
        companyAddress: '',
        companyWebsite: '',
    });
    const [userProfile, setUserProfile] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    useEffect(() => {
        if (!currentUser) {
            setClients([]);
            setProfessionals([]);
            setServices([]);
            setAppointments([]);
            setTransactions([]);
            setBudgets([]);
            setYardVehicles([]);
            return undefined;
        }

        const collectionsToWatch = [
            { name: 'clients', setter: setClients, normalizer: normalizeClient },
            { name: 'professionals', setter: setProfessionals, normalizer: normalizeProfessional },
            { name: 'services', setter: setServices, normalizer: normalizeService },
            { name: 'appointments', setter: setAppointments, normalizer: normalizeAppointment },
            { name: 'transactions', setter: setTransactions, normalizer: normalizeTransaction },
            { name: 'budgets', setter: setBudgets, normalizer: normalizeBudget },
            { name: 'yard', setter: setYardVehicles, normalizer: normalizeYardVehicle },
        ];

        const unsubscribers = collectionsToWatch.map(({ name, setter, normalizer }) => {
            try {
                const collectionRef = userCollectionRef(currentUser.uid, name);
                return onSnapshot(
                    collectionRef,
                    snapshot => setter(snapshot.docs.map(docSnapshot => normalizer({ id: docSnapshot.id, ...docSnapshot.data() }))),
                    error => console.error(`Erro ao buscar ${name}: `, error)
                );
            } catch (error) {
                console.error(`Erro ao inicializar listener de ${name}:`, error);
                setter([]);
                return () => {};
            }
        });

        return () => unsubscribers.forEach(unsub => unsub());
    }, [currentUser]);

    useEffect(() => {
        if (!currentUser) {
            setAppSettings({
                logoUrl: '',
                companyName: '',
                companyEmail: '',
                companyPhone: '',
                companyDocument: '',
                companyAddress: '',
                companyWebsite: '',
            });
            return undefined;
        }

        const settingsRef = userDocRef(currentUser.uid, 'settings', 'app');
        const unsubscribe = onSnapshot(
            settingsRef,
            snapshot => {
                if (!snapshot.exists()) {
                    setAppSettings({
                        logoUrl: '',
                        companyName: '',
                        companyEmail: '',
                        companyPhone: '',
                        companyDocument: '',
                        companyAddress: '',
                        companyWebsite: '',
                    });
                    return;
                }
                const data = snapshot.data() || {};
                setAppSettings({
                    logoUrl: data.logoUrl || '',
                    companyName: data.companyName || '',
                    companyEmail: data.companyEmail || '',
                    companyPhone: data.companyPhone || '',
                    companyDocument: data.companyDocument || '',
                    companyAddress: data.companyAddress || '',
                    companyWebsite: data.companyWebsite || '',
                });
            },
            error => {
                console.error('Erro ao buscar configuracoes: ', error);
            }
        );

        return () => unsubscribe();
    }, [currentUser]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, user => {
            setCurrentUser(user);
            setIsAuthReady(true);
            if (!user) {
                setActivePage('dashboard');
                setIsSidebarOpen(false);
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!currentUser) {
            setUserProfile(null);
            return;
        }

        const unsubscribe = onSnapshot(
            userDocRef(currentUser.uid),
            snapshot => {
                if (!snapshot.exists()) {
                    setUserProfile(null);
                    return;
                }
                setUserProfile({ id: snapshot.id, ...snapshot.data() });
            },
            error => {
                console.error('Erro ao buscar dados do usuário:', error);
            }
        );

        return () => unsubscribe();
    }, [currentUser]);

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

    const toggleSidebar = () => setIsSidebarOpen(previous => !previous);

    const closeSidebarOnMobile = () => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setIsSidebarOpen(false);
        }
    };

    const handleNavigate = pageId => {
        setActivePage(pageId);
        closeSidebarOnMobile();
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            notify('Sessão encerrada.');
        } catch (error) {
            console.error('Erro ao encerrar sessão:', error);
            notify({ type: 'error', message: 'Não foi possível encerrar a sessão.' });
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
                return <Clientes userId={currentUser?.uid} clients={clients} setNotification={notify} />;
            case 'profissionais':
                return <Profissionais userId={currentUser?.uid} professionals={professionals} setNotification={notify} />;
            case 'servicos':
                return <Servicos userId={currentUser?.uid} services={services} setNotification={notify} />;
            case 'agenda':
                return (
                    <Agenda
                        userId={currentUser?.uid}
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
                        userId={currentUser?.uid}
                        budgets={budgets}
                        clients={clients}
                        services={services}
                        appSettings={appSettings}
                        setNotification={notify}
                    />
                );
            case 'financeiro':
                return <Financeiro userId={currentUser?.uid} transactions={transactions} professionals={professionals} setNotification={notify} />;
            case 'patio':
                return <Patio userId={currentUser?.uid} vehicles={yardVehicles} professionals={professionals} clients={clients} setNotification={notify} />;
            case 'configuracoes':
                return (
                    <Configuracoes
                        userId={currentUser?.uid}
                        appSettings={appSettings}
                        setNotification={notify}
                        currentUser={currentUser}
                        userProfile={userProfile}
                    />
                );
            default:
                return <Dashboard setActivePage={setActivePage} stats={dashboardStats} isDarkMode={isDarkMode} />;
        }
    };


    const toastElement = notification.show ? (
        <Toast
            message={notification.message}
            type={notification.type}
            onDismiss={() => setNotification({ show: false, message: '', type: '' })}
        />
    ) : null;

    if (!isAuthReady) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-200">
                {toastElement}
                <span className="text-base font-medium">Carregando...</span>
            </div>
        );
    }

    if (!currentUser) {
        return (
            <>
                {toastElement}
                <Auth setNotification={notify} />
            </>
        );
    }

    const navItems = [
        { id: 'dashboard', label: 'Painel', icon: <Gauge size={20} /> },
        { id: 'agenda', label: 'Agenda da oficina', icon: <Calendar size={20} /> },
        { id: 'clientes', label: 'Clientes e veiculos', icon: <Users size={20} /> },
        { id: 'profissionais', label: 'Equipe tecnica', icon: <UserCog size={20} /> },
        { id: 'servicos', label: 'Servicos da oficina', icon: <Wrench size={20} /> },
        { id: 'orcamentos', label: 'Orcamentos', icon: <ClipboardList size={20} /> },
        { id: 'patio', label: 'Controle de patio', icon: <Warehouse size={20} /> },
        { id: 'financeiro', label: 'Financeiro', icon: <PiggyBank size={20} /> },
        { id: 'configuracoes', label: 'Configuracoes', icon: <SettingsIcon size={20} /> },
    ];

    return (
        <div className="min-h-screen w-full bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 flex flex-col md:flex-row">
            {toastElement}
            {isSidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={closeSidebarOnMobile} aria-hidden="true" />}
            <aside
                className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-white dark:bg-gray-800 shadow-xl flex flex-col transition-transform duration-300 md:static md:translate-x-0 md:shadow-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:flex`}
            >
                <div className="h-20 flex items-center justify-center border-b border-gray-200 dark:border-gray-700 space-x-3 px-4">
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
                            onClick={() => handleNavigate(item.id)}
                            className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors text-left ${activePage === item.id ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                        >
                            {item.icon}
                            <span className="ml-4 font-medium">{item.label}</span>
                        </button>
                    ))}
                </nav>
            </aside>
            <main className="flex-1 flex flex-col min-h-screen w-full overflow-x-hidden">
                <header className="bg-white dark:bg-gray-800 shadow-md flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button
                            type="button"
                            onClick={toggleSidebar}
                            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 md:hidden focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label={isSidebarOpen ? 'Fechar menu' : 'Abrir menu'}
                        >
                            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                        <div>
                            <h1 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Bem-vindo(a) ao Control+ Oficina</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Painel de gestão para oficinas mecânicas</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
                        {currentUser && (
                            <span className="hidden sm:inline text-sm text-gray-500 dark:text-gray-400">{currentUser.email}</span>
                        )}
                        <Button onClick={handleLogout} variant="secondary" icon={<LogOut size={16} />}>
                            Sair
                        </Button>
                        <Button onClick={() => setIsDarkMode(!isDarkMode)} variant="secondary" className="p-2">
                            {isDarkMode ? <Sun /> : <Moon />}
                        </Button>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto">
                    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8 space-y-6">
                        {renderPage()}
                    </div>
                </div>
            </main>
        </div>
    );

    }
