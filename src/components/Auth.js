import React, { useMemo, useState } from 'react';
import {
    auth,
    db,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    serverTimestamp,
    doc,
    setDoc,
} from '../firebase';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Mail, LockKeyhole, Phone, IdCard, Calendar, UserPlus } from 'lucide-react';

const TRIAL_DURATION_DAYS = 14;

const initialFormState = {
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    birthDate: '',
    cpfCnpj: '',
    phone: '',
};

const toErrorMessage = code => {
    const messages = {
        'auth/email-already-in-use': 'Este e-mail já está cadastrado. Tente fazer login.',
        'auth/invalid-email': 'Informe um e-mail válido.',
        'auth/invalid-password': 'A senha precisa ter pelo menos 6 caracteres.',
        'auth/user-not-found': 'Usuário não encontrado. Verifique o e-mail digitado.',
        'auth/wrong-password': 'Senha incorreta. Tente novamente.',
        'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
        'auth/too-many-requests': 'Muitas tentativas realizadas. Aguarde alguns instantes e tente novamente.',
    };
    return messages[code] || 'Não foi possível concluir a operação. Tente novamente em instantes.';
};

const Auth = ({ setNotification }) => {
    const [mode, setMode] = useState('login');
    const [formData, setFormData] = useState(initialFormState);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isRegister = mode === 'register';

    const title = useMemo(
        () => (isRegister ? 'Crie sua conta' : 'Acesse sua conta'),
        [isRegister]
    );

    const handleChange = event => {
        const { name, value } = event.target;
        setFormData(current => ({ ...current, [name]: value }));
    };

    const resetForm = () => {
        setFormData(initialFormState);
    };

    const handleSubmit = async event => {
        event.preventDefault();
        if (isSubmitting) {
            return;
        }

        setIsSubmitting(true);
        try {
            if (isRegister) {
                if (formData.password !== formData.confirmPassword) {
                    throw new Error('auth/password-mismatch');
                }
                const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
                if (formData.fullName.trim()) {
                    await updateProfile(userCredential.user, { displayName: formData.fullName.trim() });
                }
                const trialEndsAt = new Date(Date.now() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);
                await setDoc(
                    doc(db, 'users', userCredential.user.uid),
                    {
                        uid: userCredential.user.uid,
                        role: 'admin',
                        fullName: formData.fullName.trim(),
                        email: formData.email.trim().toLowerCase(),
                        birthDate: formData.birthDate,
                        cpfCnpj: formData.cpfCnpj.trim(),
                        phone: formData.phone.trim(),
                        subscriptionPlan: 'trial',
                        subscriptionStatus: 'trialing',
                        trialStartsAt: serverTimestamp(),
                        trialEndsAt,
                        subscriptionUpdatedAt: serverTimestamp(),
                        createdAt: serverTimestamp(),
                    },
                    { merge: true }
                );
                setNotification?.({ type: 'success', message: 'Cadastro realizado com sucesso!' });
                resetForm();
            } else {
                await signInWithEmailAndPassword(auth, formData.email, formData.password);
                setNotification?.({ type: 'success', message: 'Login realizado com sucesso!' });
            }
        } catch (error) {
            if (error.message === 'auth/password-mismatch') {
                setNotification?.({ type: 'error', message: 'As senhas informadas não coincidem.' });
            } else {
                setNotification?.({ type: 'error', message: toErrorMessage(error.code) });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleMode = () => {
        setMode(current => (current === 'login' ? 'register' : 'login'));
        resetForm();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center px-4 py-8">
            <div className="max-w-md w-full bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                <div className="px-8 py-10 space-y-6">
                    <header className="text-center space-y-2">
                        <h1 className="text-3xl font-bold text-white">{title}</h1>
                        <p className="text-gray-300 text-sm">
                            {isRegister
                                ? 'Informe seus dados para criar o acesso à plataforma.'
                                : 'Entre com seu e-mail e senha cadastrados.'}
                        </p>
                    </header>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        {isRegister && (
                            <Input
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                placeholder="Nome completo"
                                icon={<UserPlus size={18} />}
                                required
                            />
                        )}
                        <Input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="E-mail"
                            icon={<Mail size={18} />}
                            required
                        />
                        <Input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Senha"
                            icon={<LockKeyhole size={18} />}
                            required
                            minLength={6}
                        />
                        {isRegister && (
                            <>
                                <Input
                                    type="password"
                                name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Confirme a senha"
                                    icon={<LockKeyhole size={18} />}
                                    required
                                    minLength={6}
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <Input
                                        type="date"
                                        name="birthDate"
                                        value={formData.birthDate}
                                        onChange={handleChange}
                                        placeholder="Data de nascimento"
                                        icon={<Calendar size={18} />}
                                        required
                                    />
                                    <Input
                                        name="cpfCnpj"
                                        value={formData.cpfCnpj}
                                        onChange={handleChange}
                                        placeholder="CPF ou CNPJ"
                                        icon={<IdCard size={18} />}
                                        required
                                    />
                                </div>
                                <Input
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="Número de telefone"
                                    icon={<Phone size={18} />}
                                    required
                                />
                            </>
                        )}

                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting
                                ? 'Processando...'
                                : isRegister
                                    ? 'Cadastrar'
                                    : 'Entrar'}
                        </Button>
                    </form>

                    <footer className="text-center text-sm text-gray-200">
                        {isRegister ? (
                            <p>
                                Já possui uma conta?{' '}
                                <button type="button" onClick={toggleMode} className="text-blue-400 hover:text-blue-200 font-semibold">
                                    Fazer login
                                </button>
                            </p>
                        ) : (
                            <p>
                                Ainda não possui conta?{' '}
                                <button type="button" onClick={toggleMode} className="text-blue-400 hover:text-blue-200 font-semibold">
                                    Criar cadastro
                                </button>
                            </p>
                        )}
                    </footer>
                </div>
            </div>
        </div>
    );
};

export default Auth;
