import React from 'react';
import { Calendar, Users, Warehouse, ShieldCheck, PiggyBank } from 'lucide-react';

export const EMPLOYEE_PERMISSION_CATALOG = [
    {
        key: 'agenda',
        label: 'Agenda da oficina',
        description: 'Permite visualizar e gerenciar os agendamentos do dia.',
        icon: Calendar,
        navId: 'agenda',
        showInNav: true,
    },
    {
        key: 'clientes',
        label: 'Clientes e veículos',
        description: 'Autoriza o acesso ao cadastro e consulta de clientes.',
        icon: Users,
        navId: 'clientes',
        showInNav: true,
    },
    {
        key: 'patio',
        label: 'Controle de pátio',
        description: 'Permite visualizar os veículos que estão na oficina.',
        icon: Warehouse,
        navId: 'patio',
        showInNav: true,
    },
    {
        key: 'patio_edit',
        label: 'Editar pátio',
        description: 'Libera registrar entradas, editar e liberar veículos.',
        icon: ShieldCheck,
        dependsOn: 'patio',
        showInNav: false,
    },
    {
        key: 'financeiro',
        label: 'Financeiro',
        description: 'Disponibiliza a aba Financeiro com receitas e despesas.',
        icon: PiggyBank,
        navId: 'financeiro',
        showInNav: true,
    },
];

export const enhancePermissionsShape = (permissions = {}) =>
    EMPLOYEE_PERMISSION_CATALOG.reduce(
        (accumulator, item) => ({
            ...accumulator,
            [item.key]: Boolean(permissions[item.key]),
        }),
        {},
    );

export const getEmployeeNavItems = permissions =>
    EMPLOYEE_PERMISSION_CATALOG.filter(item => item.showInNav && permissions?.[item.key]).map(item => {
        const Icon = item.icon;
        return {
            id: item.navId,
            label: item.label,
            icon: <Icon size={20} />,
        };
    });

const EmployeePermissions = ({ value = {}, onChange, disabled = false }) => {
    const permissions = enhancePermissionsShape(value);

    const handleToggle = (key, checked) => {
        if (!onChange) {
            return;
        }
        const next = {
            ...permissions,
            [key]: checked,
        };
        if (key === 'patio' && !checked) {
            next.patio_edit = false;
        }
        onChange(next);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {EMPLOYEE_PERMISSION_CATALOG.map(item => {
                const Icon = item.icon;
                const isDisabled =
                    disabled ||
                    (item.dependsOn && !permissions[item.dependsOn]);
                return (
                    <label
                        key={item.key}
                        className={`flex items-start gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 ${
                            disabled ? 'cursor-default' : 'cursor-pointer'
                        }`}
                    >
                        <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            checked={permissions[item.key]}
                            onChange={event => handleToggle(item.key, event.target.checked)}
                            disabled={isDisabled}
                        />
                        <div>
                            <div className="flex items-center gap-2">
                                <Icon size={16} className="text-indigo-500" />
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                    {item.label}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {item.description}
                            </p>
                        </div>
                    </label>
                );
            })}
        </div>
    );
};

export default EmployeePermissions;
