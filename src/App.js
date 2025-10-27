import React, { useState, useEffect, useMemo, useRef } from 'react';
import { onSnapshot, doc, getDoc, getDocs, updateDoc, collection, collectionGroup, query, where, setDoc } from 'firebase/firestore';
import { auth, onAuthStateChanged, signOut, db, userCollectionRef, userDocRef } from './firebase';

import Dashboard from './components/Dashboard';
import Clientes from './components/Clientes';
import Profissionais from './components/Profissionais';
import Servicos from './components/Servicos';
import Agenda from './components/Agenda';
import Financeiro from './components/Financeiro';
import Patio from './components/Patio';
import Orcamentos from './components/Orcamentos';
import Configuracoes from './components/Configuracoes';
import ContaTecnico from './components/ContaTecnico';
import Auth from './components/Auth';
import { getEmployeeNavItems, enhancePermissionsShape, EMPLOYEE_PERMISSION_CATALOG } from './components/EmployeePermissions';
import ChangePassword from './components/ChangePassword';
import TechnicianAccessGate from './components/TechnicianAccessGate';
import { Toast } from './components/ui/Toast';
import { Button } from './components/ui/Button';
import OrdensDeServico from './components/OrdensDeServico';
import Estoque from './components/Estoque';

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
    ClipboardPaste,
    Archive,
} from 'lucide-react';

const formatCurrency = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const TECHNICIAN_PAGE_PERMISSIONS = Object.freeze({
    agenda: 'agenda',
    clientes: 'clientes',
    patio: 'patio',
    financeiro: 'financeiro',
});

const PERMISSION_LABEL_LOOKUP = EMPLOYEE_PERMISSION_CATALOG.reduce((accumulator, item) => {
    accumulator[item.key] = item.label;
    return accumulator;
}, {});

const resolveTrialEndDate = value => {
    if (!value) {
        return null;
    }
    if (typeof value.toDate === 'function') {
        return value.toDate();
    }
    if (value instanceof Date) {
        return value;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const resolveSubscriptionInfo = source => {
    const status =
        (source && (source.subscriptionStatus || source.parentSubscriptionStatus)) || 'active';
    const plan =
        (source && (source.subscriptionPlan || source.parentSubscriptionPlan)) || 'starter';
    const trialEndsAt = resolveTrialEndDate(
        source && (source.trialEndsAt || source.parentTrialEndsAt),
    );
    const now = new Date();
    const isTrialing = status === 'trialing' && (!trialEndsAt || trialEndsAt > now);
    const isActive = status === 'active' || isTrialing;
    const trialDaysLeft =
        isTrialing && trialEndsAt
            ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
            : 0;
    return {
        status,
        plan,
        trialEndsAt,
        isTrialing,
        isActive,
        trialDaysLeft,
    };
};

const normalizeClient = client => ({
    id: client.id,
    name: client.name || '',
    cpf: client.cpf || '',
    phone: client.phone || '',
    email: client.email || '',
    vehicles: client.vehicles || [],
    createdAt: client.createdAt || null,
});

const normalizeProfessional = professional => ({
    id: professional.id,
    uid: professional.uid || professional.id || '',
    adminId: professional.adminId || '',
    name: professional.name || '',
    email: professional.email || '',
    specialty: professional.specialty || '',
    permissions: enhancePermissionsShape(professional.permissions || {}),
    mustChangePassword: professional.mustChangePassword || false,
    avatarUrl: professional.avatarUrl || '',
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

const normalizeOrdemDeServico = ordem => ({
    id: ordem.id,
    clientId: ordem.clientId || '',
    clientName: ordem.clientName || '',
    vehiclePlate: ordem.vehiclePlate || '',
    vehicleModel: ordem.vehicleModel || '',
    vehicleBrand: ordem.vehicleBrand || '',
    professionalId: ordem.professionalId || '',
    professionalName: ordem.professionalName || '',
    services: Array.isArray(ordem.services) ? ordem.services : [],
    parts: Array.isArray(ordem.parts) ? ordem.parts : [],
    status: ordem.status || 'Pendente',
    notes: ordem.notes || '',
    createdAt: ordem.createdAt || null,
    totalPrice: Number.isFinite(ordem.totalPrice) ? ordem.totalPrice : 0,
});

const normalizeEstoqueItem = item => ({
    id: item.id,
    name: item.name || '',
    description: item.description || '',
    quantity: Number.isFinite(item.quantity) ? item.quantity : 0,
    price: Number.isFinite(item.price) ? item.price : 0,
    supplier: item.supplier || '',
});

export default function App() {
    const [activePage, setActivePage] = useState('dashboard');
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [notification, setNotification] = useState({ show: false, message: '', type: '' });
    const lastPermissionWarningRef = useRef(null);

    const [clients, setClients] = useState([]);
    const [professionals, setProfessionals] = useState([]);
    const [services, setServices] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [yardVehicles, setYardVehicles] = useState([]);
    const [budgets, setBudgets] = useState([]);
    const [ordensDeServico, setOrdensDeServico] = useState([]);
    const [estoque, setEstoque] = useState([]);
    const [selectedProfessionalId, setSelectedProfessionalId] = useState('all');
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
    const [currentEmployee, setCurrentEmployee] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    useEffect(() => {
        if (!isAuthReady || !currentUser) {
            setClients([]);
            setProfessionals([]);
            setServices([]);
            setAppointments([]);
            setTransactions([]);
            setBudgets([]);
            setYardVehicles([]);
            setOrdensDeServico([]);
            setEstoque([]);
            return undefined;
        }

        const ownerUid = currentEmployee?.adminId || currentUser.uid;
        if (!ownerUid) {
            return undefined;
        }

        const collectionsToWatch = [
            { name: 'clients', setter: setClients, normalizer: normalizeClient },
            { name: 'services', setter: setServices, normalizer: normalizeService },
            { name: 'appointments', setter: setAppointments, normalizer: normalizeAppointment },
            { name: 'transactions', setter: setTransactions, normalizer: normalizeTransaction },
            { name: 'budgets', setter: setBudgets, normalizer: normalizeBudget },
            { name: 'yard', setter: setYardVehicles, normalizer: normalizeYardVehicle },
            { name: 'ordens-de-servico', setter: setOrdensDeServico, normalizer: normalizeOrdemDeServico },
            { name: 'estoque', setter: setEstoque, normalizer: normalizeEstoqueItem },
        ];

        const unsubscribers = collectionsToWatch.map(({ name, setter, normalizer }) => {
            try {
                const collectionRef = collection(db, 'users', ownerUid, name);
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

        try {
            const professionalsRef = userCollectionRef(ownerUid, 'employees');
            const unsubscribeProfessionals = onSnapshot(
                professionalsRef,
                snapshot => setProfessionals(snapshot.docs.map(docSnapshot => normalizeProfessional({ id: docSnapshot.id, ...docSnapshot.data() }))),
                error => console.error('Erro ao buscar equipe tecnica:', error)
            );
            unsubscribers.push(unsubscribeProfessionals);
        } catch (error) {
            console.error('Erro ao inicializar listener de profissionais:', error);
        }

        return () => unsubscribers.forEach(unsub => unsub());
    }, [isAuthReady, currentUser, currentEmployee]);

    useEffect(() => {
        if (!isAuthReady || !currentUser) {
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

        const ownerUid = currentEmployee?.adminId || currentUser.uid;
        if (!ownerUid) {
            return undefined;
        }

        const settingsRef = doc(db, 'users', ownerUid, 'settings', 'app');
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
    }, [isAuthReady, currentUser, currentEmployee]);

    useEffect(() => {
        const syncLegacyProfile = async authUser => {
            try {
                const directSnapshot = await getDoc(userDocRef(authUser.uid));
                if (directSnapshot.exists()) {
                    const directData = directSnapshot.data() || {};
                    if (directData.role === 'employee') {
                        setCurrentEmployee(normalizeProfessional({ id: directSnapshot.id, ...directData }));
                    } else {
                        setUserProfile({ id: directSnapshot.id, ...directData });
                    }
                    return true;
                }
            } catch (error) {
                if (error?.code !== 'permission-denied') {
                    console.error('Erro ao acessar perfil principal do usuario autenticado:', error);
                } else {
                    console.warn('Permissao negada ao acessar perfil primario do usuario.');
                }
            }

            try {
                const legacyRef = doc(db, 'employees', authUser.uid);
                const legacySnapshot = await getDoc(legacyRef);
                if (legacySnapshot.exists()) {
                    const legacyData = legacySnapshot.data() || {};
                    const normalizedEmployee = normalizeProfessional({ id: legacySnapshot.id, ...legacyData });
                    setCurrentEmployee(normalizedEmployee);
                    return true;
                }
            } catch (error) {
                if (error?.code !== 'permission-denied') {
                    console.error('Erro ao acessar registro legacy de tecnico:', error);
                } else {
                    console.warn('Permissao negada ao acessar registro legacy de tecnico.');
                }
            }

            try {
                const employeesQuery = query(collectionGroup(db, 'employees'), where('uid', '==', authUser.uid));
                const employeesSnapshot = await getDocs(employeesQuery);
                if (!employeesSnapshot.empty) {
                    const employeeDoc = employeesSnapshot.docs[0];
                    const legacyData = employeeDoc.data() || {};
                    const adminId = legacyData.adminId || employeeDoc.ref.parent?.parent?.id || '';
                    const normalizedEmployee = normalizeProfessional({
                        id: employeeDoc.id,
                        adminId,
                        ...legacyData,
                    });
                    setCurrentEmployee(normalizedEmployee);
                    const { initialPassword: _, ...publicData } = legacyData;
                    try {
                        await setDoc(
                            doc(db, 'users', authUser.uid),
                            {
                                ...publicData,
                                adminId,
                                uid: authUser.uid,
                                role: 'employee',
                            },
                            { merge: true }
                        );
                    } catch (writeError) {
                        if (writeError?.code !== 'permission-denied') {
                            console.warn('Falha ao sincronizar perfil individual de tecnico:', writeError);
                        }
                    }
                    return true;
                }
            } catch (error) {
                if (error?.code !== 'permission-denied') {
                    console.error('Erro ao acessar perfil do tecnico nas colecoes de administradores:', error);
                } else {
                    console.warn('Permissao negada ao acessar perfil do tecnico nas colecoes de administradores.');
                }
            }

            return false;
        };

        const unsubscribe = onAuthStateChanged(auth, async user => {
            setIsAuthReady(false);
            setCurrentUser(user);
            setCurrentEmployee(null);
            setUserProfile(null);

            if (user) {
                let resolved = false;
                try {
                    const profileSnapshot = await getDoc(userDocRef(user.uid));
                    if (profileSnapshot.exists()) {
                        const profileData = profileSnapshot.data() || {};
                        if (profileData.role === 'employee') {
                            setCurrentEmployee(normalizeProfessional({ id: user.uid, ...profileData }));
                        } else {
                            setUserProfile({ id: profileSnapshot.id, ...profileData });
                        }
                        resolved = true;
                    }
                } catch (error) {
                    if (error?.code !== 'permission-denied') {
                        console.error('Erro ao acessar perfil do usuario autenticado:', error);
                    } else {
                        console.warn('Permissao negada ao acessar perfil primario do usuario.');
                    }
                }

                if (!resolved) {
                    await syncLegacyProfile(user);
                }
            } else {
                setActivePage('dashboard');
                setIsSidebarOpen(false);
            }

            setIsAuthReady(true);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!currentUser) {
            return undefined;
        }
        const unsubscribe = onSnapshot(
            userDocRef(currentUser.uid),
            snapshot => {
                if (!snapshot.exists()) {
                    return;
                }
                const data = snapshot.data() || {};
                if (data.role === 'employee') {
                    setUserProfile(null);
                    setCurrentEmployee(normalizeProfessional({ id: snapshot.id, ...data }));
                } else {
                    setCurrentEmployee(null);
                    setUserProfile({ id: snapshot.id, ...data });
                }
            },
            error => {
                console.error('Erro ao observar perfil atual:', error);
            }
        );
        return () => unsubscribe();
    }, [currentUser]);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDarkMode);
    }, [isDarkMode]);

    useEffect(() => {
        if (!userProfile && selectedProfessionalId !== 'all') {
            setSelectedProfessionalId('all');
        }
    }, [userProfile, selectedProfessionalId]);

    useEffect(() => {
        if (
            selectedProfessionalId !== 'all' &&
            !professionals.some(pro => (pro?.uid || pro?.id) === selectedProfessionalId)
        ) {
            setSelectedProfessionalId('all');
        }
    }, [professionals, selectedProfessionalId]);

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

    const handlePasswordChanged = async () => {
        if (!currentUser) {
            return;
        }
        const updates = { mustChangePassword: false };
        try {
            const tasks = [
                updateDoc(doc(db, 'users', currentUser.uid), updates),
            ];
            if (currentEmployee?.adminId) {
                tasks.push(updateDoc(userDocRef(currentEmployee.adminId, 'employees', currentUser.uid), updates));
            }
            await Promise.allSettled(tasks);
            setCurrentEmployee(prev => (prev ? { ...prev, mustChangePassword: false } : prev));
        } catch (error) {
            console.error('Erro ao atualizar status de alteracao de senha:', error);
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

        const isSameMonth = value => {
            const parsed = toDate(value);
            if (!parsed) return false;
            return parsed.getFullYear() === today.getFullYear()
                && parsed.getMonth() === today.getMonth();
        };

        const isEmployeeView = Boolean(currentEmployee && !userProfile);
        const employeeUid = currentEmployee?.uid || currentEmployee?.id || null;

        const adminSelectedProfessional = !isEmployeeView && selectedProfessionalId !== 'all'
            ? professionals.find(pro => (pro?.uid || pro?.id) === selectedProfessionalId)
            : null;

        const selectedProfessionalUid = isEmployeeView
            ? employeeUid
            : adminSelectedProfessional?.uid || adminSelectedProfessional?.id || null;
        const selectedProfessionalName = isEmployeeView
            ? currentEmployee?.name || ''
            : adminSelectedProfessional?.name || '';
        const shouldFilterByProfessional = Boolean(selectedProfessionalUid);

        const matchesProfessional = item => {
            if (!shouldFilterByProfessional) {
                return true;
            }
            const candidateId =
                item?.professionalId ||
                item?.uid ||
                item?.technicianId ||
                item?.employeeId ||
                item?.assignedProfessionalId ||
                item?.responsibleId ||
                null;
            if (candidateId && candidateId === selectedProfessionalUid) {
                return true;
            }
            const candidateName =
                item?.professionalName ||
                item?.technicianName ||
                item?.assignedProfessionalName ||
                item?.responsibleName ||
                null;
            if (selectedProfessionalName && candidateName) {
                return candidateName === selectedProfessionalName;
            }
            return false;
        };

        const relevantTransactions = transactions.filter(matchesProfessional);
        const relevantAppointments = appointments.filter(matchesProfessional);
        const relevantYardVehicles = yardVehicles.filter(matchesProfessional);
        const relevantBudgets = budgets.filter(matchesProfessional);

        const revenueTransactions = relevantTransactions.filter(transaction => transaction.type === 'receita');

        const totalCommissionValue = revenueTransactions
            .reduce((sum, transaction) => sum + (transaction.commission || 0), 0);

        const totalRevenueValue = revenueTransactions
            .reduce((sum, transaction) => sum + (transaction.totalAmount || 0), 0);

        const receitaHojeValue = revenueTransactions
            .filter(transaction => isSameCalendarDay(transaction.date))
            .reduce((sum, transaction) => sum + (isEmployeeView ? (transaction.commission || 0) : (transaction.totalAmount || 0)), 0);

        const receitaMesValue = revenueTransactions
            .filter(transaction => isSameMonth(transaction.date))
            .reduce((sum, transaction) => sum + (transaction.totalAmount || 0), 0);

        const comissoesMesValue = revenueTransactions
            .filter(transaction => isSameMonth(transaction.date))
            .reduce((sum, transaction) => sum + (transaction.commission || 0), 0);

        const agendamentosHoje = relevantAppointments.filter(appointment => isSameCalendarDay(appointment.date)).length;

        const isScopedToProfessional = shouldFilterByProfessional;

        const novosClientesMes = isScopedToProfessional
            ? (() => {
                const servedClients = new Set();
                relevantAppointments.forEach(appointment => {
                    const parsed = toDate(appointment.date);
                    if (!parsed) {
                        return;
                    }
                    if (parsed.getFullYear() === today.getFullYear() && parsed.getMonth() === today.getMonth()) {
                        servedClients.add(appointment.clientId || appointment.clientName || appointment.id);
                    }
                });
                return servedClients.size;
            })()
            : clients.filter(client => {
                const createdAt = toDate(client.createdAt);
                if (!createdAt) return false;
                return createdAt.getFullYear() === today.getFullYear() && createdAt.getMonth() === today.getMonth();
            }).length;

        const chartSeriesKey = isEmployeeView ? 'Comissao' : 'Receita';
        const chartSeriesLabel = isEmployeeView ? 'Comissão' : 'Receita';

        const receitaPorDia = new Map();
        revenueTransactions.forEach(transaction => {
            const parsed = toDate(transaction.date);
            if (!parsed) return;
            parsed.setHours(0, 0, 0, 0);
            const key = parsed.toISOString().slice(0, 10);
            const valor = isEmployeeView ? (transaction.commission || 0) : (transaction.totalAmount || 0);
            receitaPorDia.set(key, (receitaPorDia.get(key) || 0) + valor);
        });

        const receitaSemanal = Array.from({ length: 7 }, (_, index) => {
            const day = new Date(today);
            day.setDate(day.getDate() - (6 - index));
            const key = day.toISOString().slice(0, 10);
            return {
                name: `${day.getDate().toString().padStart(2, '0')}/${(day.getMonth() + 1).toString().padStart(2, '0')}`,
                [chartSeriesKey]: receitaPorDia.get(key) || 0,
            };
        });

        const proximosAgendamentos = relevantAppointments
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

        const rankingColaboradores = (() => {
            if (isScopedToProfessional) {
                const orders = revenueTransactions.length;
                const totalForDisplay = isEmployeeView ? totalCommissionValue : totalRevenueValue;
                if (!orders && !totalForDisplay) {
                    return [];
                }
                return [
                    {
                        id: selectedProfessionalUid || 'professional',
                        name: selectedProfessionalName || (isEmployeeView ? 'Voce' : 'Profissional'),
                        total: totalForDisplay,
                        orders,
                    },
                ];
            }

            const rankingMap = new Map();
            revenueTransactions.forEach(transaction => {
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

            return Array.from(rankingMap.values())
                .sort((a, b) => b.total - a.total)
                .slice(0, 5);
        })();

        const veiculosNoPatio = relevantYardVehicles.filter(vehicle => !vehicle.exitTime).length;
        const pendingBudgetsCount = relevantBudgets.filter(budget => ['draft', 'sent'].includes(budget.status)).length;

        const labels = isEmployeeView
            ? {
                painelTitulo: 'Painel do profissional',
                receitaHoje: 'Comissao (hoje)',
                receitaMes: 'Receita (mes)',
                comissoesMes: 'Comissao (mes)',
                agendamentosHoje: 'Ordens do dia',
                veiculosNoPatio: 'Veiculos sob seus cuidados',
                novosClientes: 'Clientes atendidos (mes)',
                comissoesPendentes: 'Total de comissoes',
                orcamentosPendentes: 'Orcamentos pendentes',
                grafico: 'Comissao (7 dias)',
                ranking: 'Seu ranking',
                rankingCta: 'Ver suas ordens',
                rankingCtaTarget: 'agenda',
                proximosAgendamentos: 'Seus proximos servicos',
            }
            : {
                painelTitulo: 'Painel da oficina',
                receitaHoje: 'Receita de servicos (hoje)',
                receitaMes: 'Receita do mes',
                comissoesMes: 'Comissoes do mes',
                agendamentosHoje: 'Ordens do dia',
                veiculosNoPatio: 'Veiculos no patio',
                novosClientes: 'Novos clientes (mes)',
                comissoesPendentes: 'Repasses pendentes',
                orcamentosPendentes: 'Orcamentos pendentes',
                grafico: 'Faturamento da oficina (7 dias)',
                ranking: 'Ranking de colaboradores',
                rankingCta: 'Ver detalhes no financeiro',
                rankingCtaTarget: 'financeiro',
                proximosAgendamentos: 'Proximos servicos',
                filtroTecnicos: 'Filtrar por tecnico',
            };

        return {
            receitaHoje: formatCurrency(receitaHojeValue),
            monthlyRevenue: formatCurrency(receitaMesValue),
            monthlyCommission: formatCurrency(comissoesMesValue),
            agendamentosHoje,
            novosClientesMes,
            comissoesPendentes: formatCurrency(totalCommissionValue),
            pendingBudgets: pendingBudgetsCount,
            receitaSemanal,
            proximosAgendamentos,
            rankingColaboradores,
            veiculosNoPatio,
            labels,
            chartSeriesKey,
            chartSeriesLabel,
            selectedProfessionalName,
        };
    }, [transactions, appointments, clients, yardVehicles, budgets, currentEmployee, userProfile, professionals, selectedProfessionalId]);

    const userPermissions = useMemo(
        () => enhancePermissionsShape(currentEmployee?.permissions || {}),
        [currentEmployee?.permissions],
    );

    const isAdminUser = Boolean(userProfile);
    const isEmployeeUser = Boolean(currentEmployee && !userProfile);

    const subscriptionState = useMemo(() => {
        if (isAdminUser) {
            return resolveSubscriptionInfo(userProfile);
        }
        if (isEmployeeUser) {
            return resolveSubscriptionInfo(currentEmployee);
        }
        return resolveSubscriptionInfo(null);
    }, [isAdminUser, isEmployeeUser, userProfile, currentEmployee]);

    useEffect(() => {
        if (userProfile || !currentEmployee) {
            lastPermissionWarningRef.current = null;
            return;
        }
        const requiredPermission = TECHNICIAN_PAGE_PERMISSIONS[activePage];
        if (requiredPermission && !userPermissions[requiredPermission]) {
            const label = PERMISSION_LABEL_LOOKUP[requiredPermission] || 'esta area';
            if (lastPermissionWarningRef.current !== requiredPermission) {
                setNotification({ show: true, type: 'error', message: `Acesso a ${label} nao esta liberado para seu perfil.` });
                lastPermissionWarningRef.current = requiredPermission;
            }
            if (activePage !== 'dashboard') {
                setActivePage('dashboard');
            }
        } else {
            lastPermissionWarningRef.current = null;
        }
    }, [activePage, userPermissions, currentEmployee, userProfile, setActivePage, setNotification]);

    const renderPage = () => {
        if (currentEmployee && currentEmployee.mustChangePassword) {
            return <ChangePassword user={currentUser} setNotification={notify} onPasswordChanged={handlePasswordChanged} />;
        }

        if (!subscriptionState.isActive && activePage !== 'configuracoes') {
            const title = isAdminUser ? 'Plano inativo' : 'Plano indisponivel';
            const description = isAdminUser
                ? 'Seu plano foi desativado. Acesse a area de configuracoes para regularizar sua assinatura.'
                : 'O administrador da sua equipe precisa regularizar o plano para que o acesso seja restabelecido.';
            return (
                <div className="py-12">
                    <div className="max-w-xl mx-auto bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-400 rounded-xl shadow-lg p-8 space-y-4 text-center">
                        <h2 className="text-2xl font-semibold text-amber-600 dark:text-amber-300">{title}</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
                        {subscriptionState.isTrialing && subscriptionState.trialDaysLeft > 0 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Periodo de teste: {subscriptionState.trialDaysLeft} dia(s) restante(s).
                            </p>
                        )}
                        {isAdminUser && (
                            <Button onClick={() => setActivePage('configuracoes')} icon={<SettingsIcon size={16} />}>
                                Ir para configuracoes
                            </Button>
                        )}
                    </div>
                </div>
            );
        }

        const technicianFeatureMap = {
            dashboard: {
                permission: null,
                render: () => (
                    <Dashboard
                        setActivePage={setActivePage}
                        stats={dashboardStats}
                        isDarkMode={isDarkMode}
                        isEmployeeView
                        employee={currentEmployee}
                    />
                ),
            },
            agenda: {
                permission: 'agenda',
                render: () => (
                    <Agenda
                        userId={currentUser?.uid}
                        appointments={appointments}
                        professionals={professionals}
                        clients={clients}
                        services={services}
                        setNotification={notify}
                    />
                ),
            },
            clientes: {
                permission: 'clientes',
                render: () => <Clientes userId={currentUser?.uid} clients={clients} setNotification={notify} />,
            },
            patio: {
                permission: 'patio',
                render: () => (
                    <Patio
                        userId={currentUser?.uid}
                        vehicles={yardVehicles}
                        professionals={professionals}
                        clients={clients}
                        setNotification={notify}
                        canEdit={userPermissions.patio_edit}
                    />
                ),
            },
            financeiro: {
                permission: 'financeiro',
                render: () => (
                    <Financeiro
                        userId={currentUser?.uid}
                        transactions={transactions}
                        professionals={professionals}
                        setNotification={notify}
                    />
                ),
            },
            configuracoes: {
                permission: null,
                render: () => (
                    <ContaTecnico
                        userId={currentUser?.uid}
                        setNotification={notify}
                        currentUser={currentUser}
                        currentEmployee={currentEmployee}
                        userProfile={userProfile}
                    />
                ),
            },
        };

        technicianFeatureMap.default = technicianFeatureMap.dashboard;

        if (currentEmployee && !userProfile) {
            const fallback = ({ permission }) => {
                const label = permission ? (PERMISSION_LABEL_LOOKUP[permission] || 'esta area') : 'esta area';
                return (
                    <div className="space-y-4">
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
                            <p className="font-semibold">Acesso indisponivel</p>
                            <p className="text-sm mt-1">Solicite ao administrador a liberacao para {label.toLowerCase()}.</p>
                        </div>
                        {technicianFeatureMap.dashboard.render()}
                    </div>
                );
            };
            return (
                <TechnicianAccessGate
                    pageId={activePage}
                    permissions={userPermissions}
                    features={technicianFeatureMap}
                    fallback={fallback}
                />
            );
        }

        switch (activePage) {
            case 'dashboard':
                return (
                    <Dashboard
                        setActivePage={setActivePage}
                        stats={dashboardStats}
                        isDarkMode={isDarkMode}
                        isEmployeeView={Boolean(currentEmployee && !userProfile)}
                        employee={currentEmployee}
                        canFilter={Boolean(userProfile)}
                        professionals={professionals}
                        selectedProfessionalId={selectedProfessionalId}
                        onProfessionalChange={setSelectedProfessionalId}
                    />
                );
            case 'clientes':
                return userProfile || userPermissions.clientes ? <Clientes userId={currentUser?.uid} clients={clients} setNotification={notify} /> : null;
            case 'profissionais':
                return userProfile ? (
                    <Profissionais
                        userId={currentUser?.uid}
                        professionals={professionals}
                        setNotification={notify}
                        subscriptionInfo={subscriptionState}
                    />
                ) : null;
            case 'servicos':
                return <Servicos userId={currentUser?.uid} services={services} setNotification={notify} />;
            case 'agenda':
                return userProfile || userPermissions.agenda ? <Agenda
                        userId={currentUser?.uid}
                        appointments={appointments}
                        professionals={professionals}
                        clients={clients}
                        services={services}
                        setNotification={notify}
                    /> : null;
            case 'ordens-de-servico':
                return <OrdensDeServico
                    userId={currentUser?.uid}
                    ordensDeServico={ordensDeServico}
                    clients={clients}
                    services={services}
                    professionals={professionals}
                    setNotification={notify}
                />;
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
            case 'patio':
                return userProfile || userPermissions.patio ? <Patio userId={currentUser?.uid} vehicles={yardVehicles} professionals={professionals} clients={clients} setNotification={notify} canEdit={userProfile || userPermissions.patio_edit} /> : null;
            case 'estoque':
                return <Estoque userId={currentUser?.uid} estoque={estoque} setNotification={notify} />;
            case 'financeiro':
                return userProfile || userPermissions.financeiro ? <Financeiro userId={currentUser?.uid} transactions={transactions} professionals={professionals} setNotification={notify} /> : null;
            case 'configuracoes':
                return userProfile ? (
                    <Configuracoes
                        userId={currentUser?.uid}
                        appSettings={appSettings}
                        setNotification={notify}
                    />
                ) : (
                    <ContaTecnico
                        userId={currentUser?.uid}
                        setNotification={notify}
                        currentUser={currentUser}
                        currentEmployee={currentEmployee}
                        userProfile={userProfile}
                    />
                );
            default:
                return <Dashboard setActivePage={setActivePage} stats={dashboardStats} isDarkMode={isDarkMode} isEmployeeView={Boolean(currentEmployee && !userProfile)} employee={currentEmployee} />;
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

    const employeeNavItems = [
        { id: 'dashboard', label: 'Painel', icon: <Gauge size={20} /> },
        ...getEmployeeNavItems(userPermissions),
        { id: 'configuracoes', label: 'Minha conta', icon: <SettingsIcon size={20} /> },
    ];
    const navItems = userProfile ? [
        { id: 'dashboard', label: 'Painel', icon: <Gauge size={20} /> },
        { id: 'agenda', label: 'Agenda da oficina', icon: <Calendar size={20} /> },
        { id: 'ordens-de-servico', label: 'Ordens de Serviço', icon: <ClipboardPaste size={20} /> },
        { id: 'orcamentos', label: 'Orcamentos', icon: <ClipboardList size={20} /> },
        { id: 'patio', label: 'Controle de patio', icon: <Warehouse size={20} /> },
        { id: 'clientes', label: 'Clientes e veiculos', icon: <Users size={20} /> },
        { id: 'profissionais', label: 'Equipe tecnica', icon: <UserCog size={20} /> },
        { id: 'servicos', label: 'Servicos da oficina', icon: <Wrench size={20} /> },
        { id: 'estoque', label: 'Estoque', icon: <Archive size={20} /> },
        { id: 'financeiro', label: 'Financeiro', icon: <PiggyBank size={20} /> },
        { id: 'configuracoes', label: 'Configuracoes', icon: <SettingsIcon size={20} /> },
    ] : employeeNavItems;

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
                        {subscriptionState.isTrialing && subscriptionState.isActive && (
                            <span className="text-xs font-semibold text-amber-600 bg-amber-100 border border-amber-200 px-2 py-1 rounded-md">
                                {isAdminUser
                                    ? `Teste: ${subscriptionState.trialDaysLeft} dia(s)`
                                    : `Plano em teste (${subscriptionState.trialDaysLeft} dia(s))`}
                            </span>
                        )}
                        {!subscriptionState.isActive && (
                            <span className="text-xs font-semibold text-red-600 bg-red-100 border border-red-200 px-2 py-1 rounded-md">
                                {isAdminUser ? 'Plano inativo' : 'Plano do administrador inativo'}
                            </span>
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
