import React, { useEffect, useState } from 'react';
import { auth, verifyPasswordResetCode, confirmPasswordReset } from '../firebase';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { LockKeyhole, ShieldCheck, AlertTriangle, ArrowLeft } from 'lucide-react';

const ResetPassword = ({ oobCode, onBackToLogin, setNotification }) => {
    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isVerifying, setIsVerifying] = useState(true);
    const [verifyError, setVerifyError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const verify = async () => {
            if (!oobCode) {
                // Corrigido 'inválido' e 'redefinição'
                setVerifyError('Link inválido. Solicite um novo e-mail de redefinição.');
                setIsVerifying(false);
                return;
            }
            try {
                // Corrigido 'código de redefinição'
                const recoveredEmail = await verifyPasswordResetCode(auth, oobCode); 
                setEmail(recoveredEmail);
            } catch (error) {
                // Corrigido 'código de redefinição', 'expirado' e 'e-mail'
                console.error('Erro ao validar código de redefinição:', error);
                setVerifyError('Link expirado ou inválido. Solicite um novo e-mail.');
            } finally {
                setIsVerifying(false);
            }
        };
        verify();
    }, [oobCode]);

    const handleSubmit = async event => {
        event.preventDefault();
        if (isSubmitting || isVerifying || verifyError) return;
        if (newPassword.length < 6) {
            setNotification?.({ type: 'error', message: 'A senha precisa ter pelo menos 6 caracteres.' });
            return;
        }
        if (newPassword !== confirmPassword) {
            // Corrigido 'não'
            setNotification?.({ type: 'error', message: 'As senhas informadas não coincidem.' });
            return;
        }

        setIsSubmitting(true);
        try {
            await confirmPasswordReset(auth, oobCode, newPassword);
            // Corrigido 'sucesso' e 'Faça'
            setNotification?.({ type: 'success', message: 'Senha redefinida com sucesso! Faça login com a nova senha.' });
            onBackToLogin?.();
        } catch (error) {
            console.error('Erro ao redefinir senha:', error);
            const code = error?.code || '';
            const messages = {
                // Corrigido 'expirou' e 'e-mail'
                'auth/expired-action-code': 'O link expirou. Solicite um novo e-mail.',
                // Corrigido 'está inválido' e 'e-mail'
                'auth/invalid-action-code': 'O link está inválido. Solicite um novo e-mail.',
                'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
            };
            setNotification?.({
                type: 'error',
                // Corrigido 'Não foi possível'
                message: messages[code] || 'Não foi possível redefinir a senha. Solicite um novo link e tente novamente.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderContent = () => {
        if (isVerifying) {
            return (
                <div className="text-center text-gray-700 dark:text-gray-200 py-8">
                    Validando link...
                </div>
            );
        }

        if (verifyError) {
            return (
                <div className="space-y-4">
                    <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-sm p-3 flex items-start gap-2">
                        <AlertTriangle className="mt-0.5" size={18} />
                        <div>
                            <p className="font-semibold">Link indisponível</p>
                            <p className="text-amber-800">{verifyError}</p>
                        </div>
                    </div>
                    <Button
                        onClick={onBackToLogin}
                        variant="secondary"
                        className="w-full"
                        icon={<ArrowLeft size={16} />}
                    >
                        Voltar para login
                    </Button>
                </div>
            );
        }

        return (
            <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                    Redefinindo acesso para <strong>{email}</strong>
                </div>
                <Input
                    type="password"
                    name="newPassword"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Nova senha"
                    icon={<LockKeyhole size={18} />}
                    required
                    minLength={6}
                />
                <Input
                    type="password"
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirme a nova senha"
                    icon={<LockKeyhole size={18} />}
                    required
                    minLength={6}
                />
                <Button type="submit" disabled={isSubmitting} className="w-full">
                    {/* Corrigido 'Redefinindo' */}
                    {isSubmitting ? 'Redefinindo...' : 'Salvar nova senha'}
                </Button>
            </form>
        );
    };

    return (
        <div className="min-h-screen bg-slate-950 relative overflow-hidden flex items-center justify-center px-4 py-10">
            <div className="absolute inset-0">
                <div className="absolute -left-10 -top-10 w-72 h-72 bg-indigo-600/25 blur-3xl rotate-12" />
                <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-500/20 blur-3xl -rotate-6" />
            </div>

            <div className="relative w-full max-w-3xl bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-5">
                    <div className="md:col-span-2 bg-gradient-to-b from-indigo-600 to-blue-700 text-white p-8 flex flex-col justify-between gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-white/15">
                                    <ShieldCheck size={22} />
                                </div>
                                <span className="text-sm uppercase tracking-wide font-semibold">
                                    {/* Corrigido 'Redefinição' */}
                                    Redefinição segura
                                </span>
                            </div>
                            <h2 className="text-2xl font-bold leading-tight">
                                Defina uma nova senha para continuar
                            </h2>
                            <p className="text-sm text-blue-50 leading-relaxed">
                                Este link só funciona uma vez. Crie uma senha forte e mantenha-a em segurança.
                            </p>
                        </div>
                        <Button
                            onClick={onBackToLogin}
                            variant="secondary"
                            className="w-full bg-white/20 text-white hover:bg-white/30 border border-white/30"
                            icon={<ArrowLeft size={16} />}
                        >
                            Voltar para login
                        </Button>
                    </div>

                    <div className="md:col-span-3 p-8 space-y-6 bg-white/90 dark:bg-gray-900/80">
                        <header className="space-y-2">
                            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                                Resetar senha
                            </p>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                Criar nova senha
                            </h1>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                O link foi gerado para este dispositivo. Caso não funcione, solicite um novo e-mail.
                            </p>
                        </header>

                        {renderContent()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;