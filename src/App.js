import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  collectionGroup,
  query,
  where,
  setDoc,
} from 'firebase/firestore';
import {
  auth,
  onAuthStateChanged,
  signOut,
  db,
  userCollectionRef,
  userDocRef,
} from './firebase';

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
import ChangePassword from './components/ChangePassword';
import TechnicianAccessGate from './components/TechnicianAccessGate';
import { Toast } from './components/ui/Toast';
import { Button } from './components/ui/Button';
import OrdensDeServico from './components/OrdensDeServico';

import FinanceiroFixed from './components/Financeiro'; // Mantendo Financeiro.js pois parece existir
import TransacoesFixed from './components/TransacoesFixed'; // Ajustado para Fixed
import NotasFiscaisFixed from './components/NotasFiscaisFixed'; // Ajustado para Fixed
import EstoqueFixed from './components/EstoqueFixed'; // Ajustado para Fixed
import RelatoriosFixed from './components/RelatoriosFixed'; // Ajustado para Fixed

import {
  Gauge,
  UserCog,
  PiggyBank,
  Car,
  Settings as SettingsIcon,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  ClipboardPaste,
} from 'lucide-react';

import useDashboardStats from './useDashboardStats';
import {
  TECHNICIAN_PAGE_PERMISSIONS,
  PERMISSION_LABEL_LOOKUP,

  normalizeClient,
  normalizeProfessional,
  normalizeService,
  normalizeAppointment,
  normalizeTransaction,
  normalizeBudget,
  normalizeYardVehicle,
  normalizeOrdemDeServico,
  normalizeEstoqueItem,
} from './appHelpers';

export default function App() {
  // Página de conteúdo (agenda, OS, etc.)
  const [activePage, setActivePage] = useState('dashboard');
  // Seção principal do menu (apenas admin)
  const [activeMainSection, setActiveMainSection] = useState('dashboard');

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: '',
  });
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

  // Carregamento das coleções do owner
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
      {
        name: 'appointments',
        setter: setAppointments,
        normalizer: normalizeAppointment,
      },
      {
        name: 'transactions',
        setter: setTransactions,
        normalizer: normalizeTransaction,
      },
      { name: 'budgets', setter: setBudgets, normalizer: normalizeBudget },
      { name: 'yard', setter: setYardVehicles, normalizer: normalizeYardVehicle },
      {
        name: 'ordens-de-servico',
        setter: setOrdensDeServico,
        normalizer: normalizeOrdemDeServico,
      },
      { name: 'estoque', setter: setEstoque, normalizer: normalizeEstoqueItem },
    ];

    const unsubscribers = collectionsToWatch.map(({ name, setter, normalizer }) => {
      try {
        const collectionRef = collection(db, 'users', ownerUid, name);
        return onSnapshot(
          collectionRef,
          snapshot =>
            setter(
              snapshot.docs.map(docSnapshot =>
                normalizer({ id: docSnapshot.id, ...docSnapshot.data() }),
              ),
            ),
          error => console.error(`Erro ao buscar ${name}: `, error),
        );
      } catch (error) {
        console.error(`Erro ao inicializar listener de ${name}:`, error);
        setter([]);
        return () => { };
      }
    });

    try {
      const professionalsRef = userCollectionRef(ownerUid, 'employees');
      const unsubscribeProfessionals = onSnapshot(
        professionalsRef,
        snapshot =>
          setProfessionals(
            snapshot.docs.map(docSnapshot =>
              normalizeProfessional({ id: docSnapshot.id, ...docSnapshot.data() }),
            ),
          ),
        error => console.error('Erro ao buscar equipe tecnica:', error),
      );
      unsubscribers.push(unsubscribeProfessionals);
    } catch (error) {
      console.error('Erro ao inicializar listener de profissionais:', error);
    }

    return () => unsubscribers.forEach(unsub => unsub());
  }, [isAuthReady, currentUser, currentEmployee]);

  // Configurações da empresa
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
      },
    );

    return () => unsubscribe();
  }, [isAuthReady, currentUser, currentEmployee]);

  // Auth / perfil / funcionário
  useEffect(() => {
    const syncLegacyProfile = async authUser => {
      try {
        const directSnapshot = await getDoc(userDocRef(authUser.uid));
        if (directSnapshot.exists()) {
          const directData = directSnapshot.data() || {};
          if (directData.role === 'employee') {
            setCurrentEmployee(
              normalizeProfessional({ id: directSnapshot.id, ...directData }),
            );
          } else {
            setUserProfile({ id: directSnapshot.id, ...directData });
          }
          return true;
        }
      } catch (error) {
        if (error?.code !== 'permission-denied') {
          console.error(
            'Erro ao acessar perfil principal do usuario autenticado:',
            error,
          );
        } else {
          console.warn('Permissao negada ao acessar perfil primario do usuario.');
        }
      }

      try {
        const legacyRef = doc(db, 'employees', authUser.uid);
        const legacySnapshot = await getDoc(legacyRef);
        if (legacySnapshot.exists()) {
          const legacyData = legacySnapshot.data() || {};
          const normalizedEmployee = normalizeProfessional({
            id: legacySnapshot.id,
            ...legacyData,
          });
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
        const employeesQuery = query(
          collectionGroup(db, 'employees'),
          where('uid', '==', authUser.uid),
        );
        const employeesSnapshot = await getDocs(employeesQuery);
        if (!employeesSnapshot.empty) {
          const employeeDoc = employeesSnapshot.docs[0];
          const legacyData = employeeDoc.data() || {};
          const adminId =
            legacyData.adminId || employeeDoc.ref.parent?.parent?.id || '';
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
              { merge: true },
            );
          } catch (writeError) {
            if (writeError?.code !== 'permission-denied') {
              console.warn(
                'Falha ao sincronizar perfil individual de tecnico:',
                writeError,
              );
            }
          }
          return true;
        }
      } catch (error) {
        if (error?.code !== 'permission-denied') {
          console.error(
            'Erro ao acessar perfil do tecnico nas colecoes de administradores:',
            error,
          );
        } else {
          console.warn(
            'Permissao negada ao acessar perfil do tecnico nas colecoes de administradores.',
          );
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
              setCurrentEmployee(
                normalizeProfessional({ id: user.uid, ...profileData }),
              );
            } else {
              setUserProfile({ id: profileSnapshot.id, ...profileData });
            }
            resolved = true;
          }
        } catch (error) {
          if (error?.code !== 'permission-denied') {
            console.error('Erro ao acessar perfil do usuario autenticado:', error);
          } else {
            console.warn(
              'Permissao negada ao acessar perfil primario do usuario.',
            );
          }
        }

        if (!resolved) {
          await syncLegacyProfile(user);
        }
      } else {
        setActivePage('dashboard');
        setActiveMainSection('dashboard');
        setIsSidebarOpen(false);
      }

      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // Observa mudanças no próprio doc de usuário
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
          setCurrentEmployee(
            normalizeProfessional({ id: snapshot.id, ...data }),
          );
        } else {
          setCurrentEmployee(null);
          setUserProfile({ id: snapshot.id, ...data });
        }
      },
      error => {
        console.error('Erro ao observar perfil atual:', error);
      },
    );
    return () => unsubscribe();
  }, [currentUser]);

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  // Reset filtro de profissional se sair do modo admin
  useEffect(() => {
    if (!userProfile && selectedProfessionalId !== 'all') {
      setSelectedProfessionalId('all');
    }
  }, [userProfile, selectedProfessionalId]);

  // Garante que profissional selecionado ainda existe
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

  // Deriva seção principal (apenas admin) a partir da página ativa
  useEffect(() => {
    if (!userProfile) return;

    const sectionMap = {
      dashboard: 'dashboard',

      'ordens-de-servico': 'ordens',
      patio: 'ordens',
      'pagamentos-os': 'ordens',
      orcamentos: 'ordens',
      agenda: 'ordens',

      profissionais: 'rh',
      'pagamentos-rh': 'rh',

      financeiro: 'financeiro',
      'transacoes-financeiras': 'financeiro',
      'notas-fiscais': 'financeiro',
      estoque: 'financeiro',
      servicos: 'financeiro',
      'relatorios-financeiros': 'financeiro',

      configuracoes: 'configuracoes',
    };

    const section = sectionMap[activePage] || 'dashboard';
    setActiveMainSection(section);
  }, [activePage, userProfile]);

  const handleNavigate = pageId => {
    // Admin: navega por seções principais
    if (userProfile) {
      if (pageId === 'dashboard') {
        setActivePage('dashboard');
        closeSidebarOnMobile();
        return;
      }
      if (pageId === 'ordens') {
        setActivePage('ordens-de-servico');
        closeSidebarOnMobile();
        return;
      }
      if (pageId === 'rh') {
        setActivePage('profissionais');
        closeSidebarOnMobile();
        return;
      }
      if (pageId === 'financeiro') {
        setActivePage('financeiro');
        closeSidebarOnMobile();
        return;
      }
      if (pageId === 'configuracoes') {
        setActivePage('configuracoes');
        closeSidebarOnMobile();
        return;
      }
    }

    // Técnico: mantém navegação por página
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
      const tasks = [updateDoc(doc(db, 'users', currentUser.uid), updates)];
      if (currentEmployee?.adminId) {
        tasks.push(
          updateDoc(
            userDocRef(currentEmployee.adminId, 'employees', currentUser.uid),
            updates,
          ),
        );
      }
      await Promise.allSettled(tasks);
      setCurrentEmployee(prev =>
        prev ? { ...prev, mustChangePassword: false } : prev,
      );
    } catch (error) {
      console.error(
        'Erro ao atualizar status de alteracao de senha:',
        error,
      );
    }
  };

  const dashboardStats = useDashboardStats({
    transactions,
    appointments,
    clients,
    yardVehicles,
    budgets,
    currentEmployee,
    userProfile,
    professionals,
    selectedProfessionalId,
  });

  const userPermissions = useMemo(
    () => enhancePermissionsShape(currentEmployee?.permissions || {}),
    [currentEmployee?.permissions],
  );

  const isAdminUser = Boolean(userProfile);
  // const isEmployeeUser = Boolean(currentEmployee && !userProfile); // Unused

  const subscriptionState = useMemo(() => {
    // BYPASS TRIAL: Always return active subscription
    return {
      isActive: true,
      isTrialing: false,
      plan: 'premium',
      trialDaysLeft: 999,
    };
  }, []);

  // Gate de permissão do técnico (funcionário)
  useEffect(() => {
    if (userProfile || !currentEmployee) {
      lastPermissionWarningRef.current = null;
      return;
    }
    const requiredPermission = TECHNICIAN_PAGE_PERMISSIONS[activePage];
    if (requiredPermission && !userPermissions[requiredPermission]) {
      const label =
        PERMISSION_LABEL_LOOKUP[requiredPermission] || 'esta area';
      if (lastPermissionWarningRef.current !== requiredPermission) {
        setNotification({
          show: true,
          type: 'error',
          message: `Acesso a ${label} nao esta liberado para seu perfil.`,
        });
        lastPermissionWarningRef.current = requiredPermission;
      }
      if (activePage !== 'dashboard') {
        setActivePage('dashboard');
      }
    } else {
      lastPermissionWarningRef.current = null;
    }
  }, [activePage, userPermissions, currentEmployee, userProfile]);

  // Abas secundárias (apenas admin)
  const renderSubTabs = () => {
    if (!userProfile) return null;
    const current = activePage;

    if (activeMainSection === 'ordens') {
      return (
        <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 mb-4">
          <button
            type="button"
            className={`px-3 py-2 text-sm font-medium border-b-2 ${current === 'ordens-de-servico'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            onClick={() => setActivePage('ordens-de-servico')}
          >
            Ordens
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-sm font-medium border-b-2 ${current === 'patio'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            onClick={() => setActivePage('patio')}
          >
            Pátio
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-sm font-medium border-b-2 ${current === 'pagamentos-os'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            onClick={() => setActivePage('pagamentos-os')}
          >
            Pagamentos
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-sm font-medium border-b-2 ${current === 'orcamentos'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            onClick={() => setActivePage('orcamentos')}
          >
            Orçamentos
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-sm font-medium border-b-2 ${current === 'agenda'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            onClick={() => setActivePage('agenda')}
          >
            Agenda
          </button>
        </div>
      );
    }

    if (activeMainSection === 'rh') {
      return (
        <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 mb-4">
          <button
            type="button"
            className={`px-3 py-2 text-sm font-medium border-b-2 ${current === 'profissionais'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            onClick={() => setActivePage('profissionais')}
          >
            Profissionais
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-sm font-medium border-b-2 ${current === 'pagamentos-rh'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            onClick={() => setActivePage('pagamentos-rh')}
          >
            Pagamentos
          </button>
        </div>
      );
    }

    if (activeMainSection === 'financeiro') {
      return (
        <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 mb-4">
          <button
            type="button"
            className={`px-3 py-2 text-sm font-medium border-b-2 ${current === 'financeiro'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            onClick={() => setActivePage('financeiro')}
          >
            Visão Geral
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-sm font-medium border-b-2 ${current === 'transacoes-financeiras'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            onClick={() => setActivePage('transacoes-financeiras')}
          >
            Transações Financeiras
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-sm font-medium border-b-2 ${current === 'notas-fiscais'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            onClick={() => setActivePage('notas-fiscais')}
          >
            Notas fiscais
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-sm font-medium border-b-2 ${current === 'estoque'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            onClick={() => setActivePage('estoque')}
          >
            Estoque
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-sm font-medium border-b-2 ${current === 'servicos'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            onClick={() => setActivePage('servicos')}
          >
            Catálogo de serviços
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-sm font-medium border-b-2 ${current === 'relatorios-financeiros'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            onClick={() => setActivePage('relatorios-financeiros')}
          >
            Relatórios
          </button>
        </div>
      );
    }

    if (activeMainSection === 'configuracoes') {
      return (
        <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 mb-4">
          <button
            type="button"
            className={`px-3 py-2 text-sm font-medium border-b-2 ${current === 'configuracoes'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            onClick={() => setActivePage('configuracoes')}
          >
            Empresa
          </button>
        </div>
      );
    }

    return null;
  };

  const renderPage = () => {
    if (currentEmployee && currentEmployee.mustChangePassword) {
      return (
        <ChangePassword
          user={currentUser}
          setNotification={notify}
          onPasswordChanged={handlePasswordChanged}
        />
      );
    }

    if (!subscriptionState.isActive && activePage !== 'configuracoes') {
      const title = isAdminUser ? 'Plano inativo' : 'Plano indisponivel';
      const description = isAdminUser
        ? 'Seu plano foi desativado. Acesse a area de configuracoes para regularizar sua assinatura.'
        : 'O administrador da sua equipe precisa regularizar o plano para que o acesso seja restabelecido.';
      return (
        <div className="py-12">
          <div className="max-w-xl mx-auto bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-400 rounded-xl shadow-lg p-8 space-y-4 text-center">
            <h2 className="text-2xl font-semibold text-amber-600 dark:text-amber-300">
              {title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {description}
            </p>
            {subscriptionState.isTrialing &&
              subscriptionState.trialDaysLeft > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Periodo de teste: {subscriptionState.trialDaysLeft} dia(s){' '}
                  restante(s).
                </p>
              )}
            {isAdminUser && (
              <Button
                onClick={() => setActivePage('configuracoes')}
                icon={<SettingsIcon size={16} />}
              >
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
        render: () => (
          <Clientes
            userId={currentUser?.uid}
            clients={clients}
            setNotification={notify}
          />
        ),
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
        const label = permission
          ? PERMISSION_LABEL_LOOKUP[permission] || 'esta area'
          : 'esta area';
        return (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <p className="font-semibold">Acesso indisponivel</p>
              <p className="text-sm mt-1">
                Solicite ao administrador a liberacao para{' '}
                {label.toLowerCase()}.
              </p>
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

      // ORDENS (seção Ordens de Serviço)
      case 'ordens-de-servico':
        return (
          <OrdensDeServico
            userId={currentUser?.uid}
            ordensDeServico={ordensDeServico}
            clients={clients}
            services={services}
            professionals={professionals}
            setNotification={notify}
          />
        );
      case 'patio':
        return isAdminUser || userPermissions.patio ? (
          <Patio
            userId={currentUser?.uid}
            vehicles={yardVehicles}
            professionals={professionals}
            clients={clients}
            setNotification={notify}
            canEdit={isAdminUser || userPermissions.patio_edit}
          />
        ) : null;
      case 'pagamentos-os':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
            <h2 className="text-lg font-semibold mb-2">
              Pagamentos de Ordens de Serviço
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Aqui você poderá controlar os pagamentos das ordens de serviço
              (recebidos, pendentes, forma de pagamento, etc.), integrando
              com o módulo Financeiro. <br />
              Por enquanto, esta seção está em estruturação.
            </p>
          </div>
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
      case 'agenda':
        return isAdminUser || userPermissions.agenda ? (
          <Agenda
            userId={currentUser?.uid}
            appointments={appointments}
            professionals={professionals}
            clients={clients}
            services={services}
            setNotification={notify}
          />
        ) : null;

      // RH
      case 'profissionais':
        return isAdminUser ? (
          <Profissionais
            userId={currentUser?.uid}
            professionals={professionals}
            transactions={transactions}
            setNotification={notify}
            subscriptionInfo={subscriptionState}
            initialTab="list"
          />
        ) : null;
      case 'pagamentos-rh':
        return isAdminUser ? (
          <Profissionais
            userId={currentUser?.uid}
            professionals={professionals}
            transactions={transactions}
            setNotification={notify}
            subscriptionInfo={subscriptionState}
            initialTab="payments"
          />
        ) : null;

      case 'financeiro':
        return isAdminUser || userPermissions.financeiro ? (
          <FinanceiroFixed
            userId={currentUser?.uid}
            transactions={transactions}
          />
        ) : null;
      case 'transacoes-financeiras':
        return (
          <TransacoesFixed
            userId={currentUser?.uid}
            transactions={transactions}
            setNotification={notify}
          />
        );
      case 'notas-fiscais':
        return (
          <NotasFiscaisFixed
            userId={currentUser?.uid}
            setNotification={notify}
          />
        );
      case 'estoque':
        return (
          <EstoqueFixed
            userId={currentUser?.uid}
            setNotification={notify}
          />
        );
      case 'servicos':
        return (
          <Servicos
            userId={currentUser?.uid}
            services={services}
            setNotification={notify}
          />
        );
      case 'relatorios-financeiros':
        return (
          <RelatoriosFixed
            transactions={transactions}
            estoque={estoque}
          />
        );

      // CLIENTES (acessível por atalho, se quiser ligar em outro lugar)
      case 'clientes':
        return isAdminUser || userPermissions.clientes ? (
          <Clientes
            userId={currentUser?.uid}
            clients={clients}
            setNotification={notify}
          />
        ) : null;

      // CONFIGURAÇÕES
      case 'configuracoes':
        return isAdminUser ? (
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
        return (
          <Dashboard
            setActivePage={setActivePage}
            stats={dashboardStats}
            isDarkMode={isDarkMode}
            isEmployeeView={Boolean(currentEmployee && !userProfile)}
            employee={currentEmployee}
          />
        );
    }
  };

  const toastElement = notification.show ? (
    <Toast
      message={notification.message}
      type={notification.type}
      onDismiss={() =>
        setNotification({ show: false, message: '', type: '' })
      }
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

  // Novo menu lateral (admin): 5 seções
  const adminNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Gauge size={20} /> },
    { id: 'ordens', label: 'Ordens de Serviço', icon: <ClipboardPaste size={20} /> },
    { id: 'rh', label: 'RH', icon: <UserCog size={20} /> },
    { id: 'financeiro', label: 'Financeiro', icon: <PiggyBank size={20} /> },
    { id: 'configuracoes', label: 'Configurações', icon: <SettingsIcon size={20} /> },
  ];

  const navItems = userProfile ? adminNavItems : employeeNavItems;

  return (
    <div className="min-h-screen w-full bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 flex flex-col md:flex-row">
      {toastElement}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={closeSidebarOnMobile}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-white dark:bg-gray-800 shadow-xl flex flex-col transition-transform duration-300 md:static md:translate-x-0 md:shadow-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } md:flex`}
      >
        <div className="h-20 flex items-center justify-center border-b border-gray-200 dark:border-gray-700 space-x-3 px-4">
          {appSettings.logoUrl ? (
            <img
              src={appSettings.logoUrl}
              alt="Logomarca"
              className="h-10 w-10 object-contain rounded"
            />
          ) : (
            <Car className="h-8 w-8 text-blue-600" />
          )}
          <span className="text-2xl font-bold">Control+ Oficina</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map(item => {
            const isActive = userProfile
              ? activeMainSection === item.id
              : activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors text-left ${isActive
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
              >
                {item.icon}
                <span className="ml-4 font-medium">{item.label}</span>
              </button>
            );
          })}
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
              <h1 className="text-xl font-semibold text-gray-700 dark:text-gray-200">
                Bem-vindo(a) ao Control+ Oficina
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Painel de gestão para oficinas mecânicas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
            {currentUser && (
              <span className="hidden sm:inline text-sm text-gray-500 dark:text-gray-400">
                {currentUser.email}
              </span>
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
            <Button
              onClick={handleLogout}
              variant="secondary"
              icon={<LogOut size={16} />}
            >
              Sair
            </Button>
            <Button
              onClick={() => setIsDarkMode(!isDarkMode)}
              variant="secondary"
              className="p-2"
            >
              {isDarkMode ? <Sun /> : <Moon />}
            </Button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Abas secundárias (apenas admin) */}
            {userProfile && renderSubTabs()}
            {renderPage()}
          </div>
        </div>
      </main>
    </div>
  );
}