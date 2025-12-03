import React from 'react';
import {
    LayoutDashboard,
    ClipboardList,
    Users,
    DollarSign,
    Settings,
    Briefcase,
    Calendar,
    FileText,
    Truck,
    CreditCard,
    BarChart3,
    Package,
    FileSpreadsheet,
    Building2
} from 'lucide-react';
import SidebarItem from './SidebarItem';
import styles from './Sidebar.module.css';

const AdminMenu = ({ expanded }) => {
    const menuItems = [
        {
            label: 'Dashboard',
            icon: LayoutDashboard,
            path: '/',
            subItems: []
        },
        {
            label: 'Ordens de Serviço',
            icon: ClipboardList,
            subItems: [
                { label: 'Nova OS', path: '/os' },
                { label: 'Pátio', path: '/patio' },
                { label: 'Orçamentos', path: '/orcamentos' },
            ]
        },
        {
            label: 'Financeiro',
            icon: DollarSign,
            subItems: [
                { label: 'Visão Geral', path: '/financeiro' },
                { label: 'Lançamentos', path: '/financeiro' }, // Pode ser a mesma rota com tab diferente ou parametro
            ]
        },
        {
            label: 'Equipe',
            icon: Users,
            subItems: [
                { label: 'Profissionais', path: '/equipe' },
                { label: 'Comissões', path: '/financeiro' } // Assumindo que está no financeiro por enquanto
            ]
        },
        {
            label: 'Configurações',
            icon: Settings,
            path: '/configuracoes',
            subItems: []
        }
    ];

    return (
        <div className={styles.menuList}>
            {menuItems.map((item, index) => (
                <SidebarItem
                    key={index}
                    icon={item.icon}
                    label={item.label}
                    path={item.path}
                    subItems={item.subItems}
                    expanded={expanded}
                />
            ))}
        </div>
    );
};

export default AdminMenu;
