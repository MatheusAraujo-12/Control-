import React, { useState } from 'react';
import { updatePassword } from 'firebase/auth';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

const ChangePassword = ({ user, setNotification, onPasswordChanged }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChanging, setIsChanging] = useState(false);

    const handleSubmit = async event => {
        event.preventDefault();
        if (newPassword !== confirmPassword) {
            setNotification({ type: 'error', message: 'As senhas não conferem.' });
            return;
        }
        setIsChanging(true);
        try {
            await updatePassword(user, newPassword);
            setNotification({ type: 'success', message: 'Senha alterada com sucesso!' });
            onPasswordChanged();
        } catch (error) {
            console.error('Erro ao alterar senha:', error);
            setNotification({ type: 'error', message: 'Erro ao alterar senha. Tente novamente.' });
        } finally {
            setIsChanging(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
                <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">Alterar Senha</h2>
                <p className="text-center text-gray-600 dark:text-gray-400">Por favor, altere sua senha provisória.</p>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                        type="password"
                        placeholder="Nova Senha"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        required
                    />
                    <Input
                        type="password"
                        placeholder="Confirmar Nova Senha"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                    />
                    <Button type="submit" disabled={isChanging} className="w-full">
                        {isChanging ? 'Alterando...' : 'Alterar Senha'}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default ChangePassword;
