import React, { useState } from 'react';
import { auth, sendPasswordResetEmail } from '../firebase';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Mail, ShieldCheck, ArrowLeft } from 'lucide-react';

const PasswordRecovery = ({ onBackToLogin, setNotification }) => {
    const [email, setEmail] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async event => {
        event.preventDefault();
        if (isSending) return;
        if (!email.trim()) {
            // Corrigido 'e-mail'
            setNotification?.({ type: 'error', message: 'Informe o e-mail cadastrado.' });
            return;
        }

        setIsSending(true);
        try {
            // Configuração para tratar o código na própria aplicação
            const actionCodeSettings = {
                url: `${window.location.origin}${window.location.pathname}?mode=resetPassword`,
                handleCodeInApp: true,
            };
            // Corrigido a chamada do Firebase com actionCodeSettings
            await sendPasswordResetEmail(auth, email.trim().toLowerCase(), actionCodeSettings); 
            setSent(true);
            setNotification?.({
                type: 'success',
                // Corrigido 'Enviamos', 'redefinição' e 'e-mail'
                message: 'Enviamos um link de redefinição para o seu e-mail.',
            });
        } catch (error) {
            console.error('Erro ao solicitar redefinição:', error);
            const code = error?.code || '';
            const messages = {
                // Corrigido 'E-mail inválido'
                'auth/invalid-email': 'E-mail inválido.',
                'auth/user-not-found': 'Nenhuma conta encontrada com este e-mail.',
                'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns instantes e tente de novo.',
            };
            setNotification?.({
                type: 'error',
                // Corrigido 'Não foi possível enviar'
                message: messages[code] || 'Não foi possível enviar o link. Tente novamente.',
            });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 relative overflow-hidden flex items-center justify-center px-4 py-10">
            <div className="absolute inset-0">
                <div className="absolute -left-10 -top-10 w-72 h-72 bg-blue-600/20 blur-3xl rotate-12" />
                <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-500/20 blur-3xl -rotate-6" />
            </div>

            <div className="relative w-full max-w-3xl bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-5">
                    <div className="md:col-span-2 bg-gradient-to-b from-blue-600 to-indigo-700 text-white p-8 flex flex-col justify-between gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-white/15">
                                    <ShieldCheck size={22} />
                                </div>
                                <span className="text-sm uppercase tracking-wide font-semibold">
                                    {/* Corrigido 'Recuperação segura' */}
                                    Recuperação segura
                                </span>
                            </div>
                            <h2 className="text-2xl font-bold leading-tight">
                                Volte ao controle com um novo acesso
                            </h2>
                            <p className="text-sm text-blue-100 leading-relaxed">
                                {/* Corrigido 'e-mail' e 'também' */}
                                Informe o e-mail cadastrado e enviaremos um link para redefinir a senha.
                                Verifique também a caixa de spam ou promoções.
                            </p>
                        </div>
                        <div className="text-xs text-blue-100/80 space-y-1">
                            {/* Corrigido 'técnicos' */}
                            <p>Funciona para administradores e técnicos.</p>
                            {/* Corrigido 'não reconheceu' e 'e-mail' */}
                            <p>Se não reconheceu esta solicitação, ignore o e-mail.</p>
                        </div>
                    </div>

                    <div className="md:col-span-3 p-8 space-y-6 bg-white/90 dark:bg-gray-900/80">
                        <header className="space-y-2">
                            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                                Recuperar senha
                            </p>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                {/* Corrigido 'redefinição' */}
                                Enviar link de redefinição
                            </h1>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                Digite o e-mail que você usa para entrar na plataforma.
                            </p>
                        </header>

                        {sent && (
                            <div className="rounded-lg border border-green-200 bg-green-50 text-green-800 text-sm p-3 flex items-start gap-2">
                                <ShieldCheck className="mt-0.5" size={18} />
                                <div>
                                    <p className="font-semibold">E-mail enviado</p>
                                    <p className="text-green-700">
                                        Verifique sua caixa de entrada e siga o link para criar uma nova senha.
                                    </p>
                                </div>
                            </div>
                        )}

                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <Input
                                type="email"
                                name="recoveryEmail"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="Seu e-mail de acesso"
                                icon={<Mail size={18} />}
                                required
                            />
                            <Button type="submit" disabled={isSending} className="w-full">
                                {isSending ? 'Enviando...' : 'Receber link de redefinição'}
                            </Button>
                        </form>

                        <div className="flex items-center justify-between text-sm">
                            <div className="text-gray-600 dark:text-gray-300">
                                {/* Corrigido 'Já lembrou' */}
                                Já lembrou a senha?
                            </div>
                            <Button
                                onClick={onBackToLogin}
                                variant="secondary"
                                className="px-3 py-1"
                                icon={<ArrowLeft size={16} />}
                            >
                                Voltar para login
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PasswordRecovery;