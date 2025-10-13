import React, { useEffect } from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';

export const Toast = ({ message, type, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss();
        }, 3000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
    const icon = type === 'success' ? <CheckCircle /> : <AlertTriangle />;

    return (
        <div className={`fixed bottom-5 right-5 flex items-center p-4 rounded-lg text-white shadow-lg z-50 ${bgColor}`}>
            <span className="mr-3">{icon}</span>
            {message}
        </div>
    );
};