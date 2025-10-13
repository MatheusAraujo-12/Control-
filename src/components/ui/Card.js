import React from 'react';

export const Card = ({ children, className = '' }) => (
    <div className={`bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg transition-shadow hover:shadow-2xl ${className}`}>
        {children}
    </div>
);

export const StatCard = ({ title, value, icon, color }) => (
    <Card>
        <div className="flex items-center">
            <div className={`p-3 rounded-full mr-4 ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            </div>
        </div>
    </Card>
);
