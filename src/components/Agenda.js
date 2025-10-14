import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { addDoc, updateDoc } from 'firebase/firestore';
import { userCollectionRef, userDocRef } from '../firebase';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Clock, Plus, XCircle, Coins, Calendar as CalendarIcon, Hash, Car, ClipboardList } from 'lucide-react';

const statusOptions = [
    { value: 'agendado', label: 'Agendado' },
    { value: 'em_execucao', label: 'Em execução' },
    { value: 'aguardando_pecas', label: 'Aguardando peças' },
    { value: 'pronto', label: 'Pronto para entrega' },
    { value: 'finalizado', label: 'Finalizado' },
];

const statusColors = {
    agendado: 'bg-blue-200 border-blue-500 text-blue-800',
    em_execucao: 'bg-yellow-200 border-yellow-500 text-yellow-800',
    aguardando_pecas: 'bg-orange-200 border-orange-500 text-orange-800',
    pronto: 'bg-indigo-200 border-indigo-500 text-indigo-800',
    finalizado: 'bg-green-200 border-green-500 text-green-800',
};

const getStatusLabel = status => statusOptions.find(option => option.value === status)?.label || 'Agendado';

const CheckoutModal = ({ isOpen, onClose, appointment, onProcess }) => {
    const [partsCost, setPartsCost] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('pix');

    useEffect(() => {
        if (isOpen) {
            setPartsCost(appointment.partsCost || 0);
            setPaymentMethod(appointment.paymentMethod || 'pix');
        }
    }, [isOpen, appointment.partsCost, appointment.paymentMethod]);

    const totalServiceAmount = appointment.services?.reduce((sum, service) => sum + service.price, 0) || 0;
    const total = totalServiceAmount + parseFloat(partsCost || 0);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Fechamento da ordem de serviço">
            <div className="space-y-4">
                <p><strong>Cliente:</strong> {appointment.clientName}</p>
                <p><strong>Veículo:</strong> {appointment.vehiclePlate || 'Não informado'}</p>
                <div className="space-y-1">
                    {appointment.services?.map(service => (
                        <p key={service.id}><strong>Serviço:</strong> {service.name} - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.price)}</p>
                    ))}
                </div>
                <p><strong>Mão de obra:</strong> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalServiceAmount)}</p>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Valor de peças</label>
                    <Input type="number" value={partsCost} onChange={event => setPartsCost(event.target.value)} placeholder="0,00" icon={<Coins size={18} />} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Forma de pagamento</label>
                    <select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)} className="w-full mt-1 p-2 border rounded-lg bg-gray-50 dark:bg-gray-700">
                        <option value="pix">PIX</option>
                        <option value="dinheiro">Dinheiro</option>
                        <option value="credito">Cartão de crédito</option>
                        <option value="debito">Cartão de débito</option>
                        <option value="transferencia">Transferência</option>
                    </select>
                </div>
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xl font-bold text-right">Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}</p>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button variant="success" onClick={() => onProcess({ partsCost, paymentMethod })}>Confirmar faturamento</Button>
                </div>
            </div>
        </Modal>
    );
};

const AppointmentModal = ({ isOpen, onClose, appointment, onSave, clients, professionals, services, selectedTime, setNotification, userId }) => {
    const buildDefaultAppointment = useCallback(() => ({
        clientId: '',
        professionalId: '',
        services: [],
        date: selectedTime || new Date().toISOString(),
        status: 'agendado',
        vehicleBrand: '',
        vehicleModel: '',
        vehiclePlate: '',
        notes: '',
        partsCost: 0,
        paymentMethod: 'pix',
    }), [selectedTime]);

    const [formData, setFormData] = useState(() => buildDefaultAppointment());
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    useEffect(() => {
        if (appointment) {
            setFormData({ ...buildDefaultAppointment(), ...appointment, services: appointment.services || [] });
        } else {
            setFormData(buildDefaultAppointment());
        }
    }, [appointment, isOpen, buildDefaultAppointment]);

    const handleChange = event => {
        const { name, value } = event.target;
        if (name === 'clientId') {
            const selectedClient = clients.find(client => client.id === value);
            setFormData(prev => ({
                ...prev,
                clientId: value,
                vehicleBrand: selectedClient?.vehicleBrand || '',
                vehicleModel: selectedClient?.vehicleModel || '',
                vehiclePlate: selectedClient?.vehiclePlate || '',
            }));
            return;
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const addService = serviceId => {
        const serviceToAdd = services.find(service => service.id === serviceId);
        if (serviceToAdd && !formData.services.some(service => service.id === serviceId)) {
            setFormData(prev => ({ ...prev, services: [...prev.services, serviceToAdd] }));
        }
    };

    const removeService = serviceId => {
        setFormData(prev => ({ ...prev, services: prev.services.filter(service => service.id !== serviceId) }));
    };

    const totalAppointmentPrice = useMemo(() => formData.services?.reduce((sum, service) => sum + service.price, 0) || 0, [formData.services]);

    const handleSubmit = event => {
        event.preventDefault();
        const client = clients.find(c => c.id === formData.clientId);
        const professional = professionals.find(p => p.id === formData.professionalId);

        if (!client || !professional || formData.services.length === 0) {
            setNotification({ show: true, message: 'Selecione cliente, técnico e pelo menos um serviço.', type: 'error' });
            return;
        }

        onSave({
            ...formData,
            clientName: client.name,
            professionalName: professional.name,
            totalPrice: totalAppointmentPrice,
        });
    };

    const handleProcessCheckout = async checkoutData => {
        if (!appointment || !appointment.id) {
            setNotification({ show: true, message: 'Salve o agendamento antes de faturar.', type: 'error' });
            return;
        }

        const totalServiceAmount = totalAppointmentPrice;
        const parsedPartsCost = parseFloat(checkoutData.partsCost || 0);
        const totalAmount = totalServiceAmount + parsedPartsCost;

        const totalCommission = formData.services.reduce((sum, service) => {
            if (service.commissionType === 'percentage') {
                return sum + service.price * (service.commissionValue / 100);
            }
            return sum + service.commissionValue;
        }, 0);

        const transactionData = {
            appointmentId: appointment.id,
            clientId: appointment.clientId,
            clientName: appointment.clientName,
            professionalId: appointment.professionalId,
            professionalName: appointment.professionalName,
            services: formData.services,
            vehiclePlate: appointment.vehiclePlate,
            date: new Date().toISOString(),
            totalAmount,
            serviceAmount: totalServiceAmount,
            partsCost: parsedPartsCost,
            commission: totalCommission,
            paymentMethod: checkoutData.paymentMethod,
            type: 'receita',
        };

        if (!userId) {
            setNotification({ show: true, message: 'Sessao expirada. Faça login novamente.', type: 'error' });
            return;
        }

        try {
            await addDoc(userCollectionRef(userId, 'transactions'), transactionData);
            await updateDoc(userDocRef(userId, 'appointments', appointment.id), {
                status: 'finalizado',
                paymentMethod: checkoutData.paymentMethod,
                partsCost: parsedPartsCost,
                totalPrice: totalAmount,
                closedAt: new Date().toISOString(),
            });
            setIsCheckoutOpen(false);
            onClose();
            setNotification({ show: true, message: 'Ordem faturada com sucesso!', type: 'success' });
        } catch (error) {
            console.error('Erro ao processar faturamento:', error);
            setNotification({ show: true, message: 'Não foi possível finalizar o faturamento.', type: 'error' });
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={appointment ? 'Detalhes da ordem de serviço' : 'Novo agendamento'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <select name="clientId" value={formData.clientId || ''} onChange={handleChange} className="w-full mt-1 p-2 border rounded-lg">
                    <option value="">Selecione um cliente</option>
                    {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                </select>
                <select name="professionalId" value={formData.professionalId || ''} onChange={handleChange} className="w-full mt-1 p-2 border rounded-lg">
                    <option value="">Selecione um técnico</option>
                    {professionals.map(professional => (
                        <option key={professional.id} value={professional.id}>{professional.name}</option>
                    ))}
                </select>
                <Input type="datetime-local" name="date" value={formData.date ? new Date(formData.date).toISOString().substring(0, 16) : ''} onChange={handleChange} icon={<CalendarIcon size={18} />} />
                <div>
                    <label className="block text-sm font-medium">Status da ordem</label>
                    <select name="status" value={formData.status} onChange={handleChange} className="w-full mt-1 p-2 border rounded-lg bg-gray-50 dark:bg-gray-700">
                        {statusOptions.map(status => (
                            <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input name="vehicleBrand" value={formData.vehicleBrand} onChange={handleChange} placeholder="Marca" icon={<Car size={18} />} />
                    <Input name="vehicleModel" value={formData.vehicleModel} onChange={handleChange} placeholder="Modelo" icon={<ClipboardList size={18} />} />
                    <Input name="vehiclePlate" value={formData.vehiclePlate} onChange={handleChange} placeholder="Placa" icon={<Hash size={18} />} />
                </div>

                <div>
                    <label className="block text-sm font-medium">Serviços</label>
                    <div className="flex gap-2">
                        <select onChange={event => addService(event.target.value)} className="w-full mt-1 p-2 border rounded-lg">
                            <option value="">Adicionar serviço...</option>
                            {services.map(service => (
                                <option key={service.id} value={service.id}>{service.name} - R$ {service.price}</option>
                            ))}
                        </select>
                    </div>
                    <div className="mt-2 space-y-2">
                        {formData.services?.map(service => (
                            <div key={service.id} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                                <span>{service.name}</span>
                                <div className="flex items-center gap-4">
                                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.price)}</span>
                                    <button type="button" onClick={() => removeService(service.id)} className="text-red-500 hover:text-red-700"><XCircle size={18} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium">Observações</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} className="w-full mt-1 p-2 border rounded-lg bg-gray-50 dark:bg-gray-700" rows={3} placeholder="Observações sobre peças, diagnóstico ou aprovações"></textarea>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xl font-bold text-right">Total mão de obra: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAppointmentPrice)}</p>
                </div>

                <div className="flex justify-between items-center pt-4">
                    <Button type="submit">Salvar agendamento</Button>
                    {appointment && appointment.status !== 'finalizado' && (
                        <Button type="button" variant="success" onClick={() => setIsCheckoutOpen(true)}>Finalizar e faturar</Button>
                    )}
                </div>
            </form>
            {appointment && (
                <CheckoutModal
                    isOpen={isCheckoutOpen}
                    onClose={() => setIsCheckoutOpen(false)}
                    appointment={formData}
                    onProcess={handleProcessCheckout}
                />
            )}
        </Modal>
    );
};

const Agenda = ({ userId, appointments, professionals, clients, services, setNotification }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [selectedTime, setSelectedTime] = useState(null);

    const handleSaveAppointment = async appointmentData => {
        if (!userId) {
            setNotification({ show: true, message: 'Sessao expirada. Faça login novamente.', type: 'error' });
            return false;
        }
        try {
            if (selectedAppointment) {
                await updateDoc(userDocRef(userId, 'appointments', selectedAppointment.id), appointmentData);
            } else {
                await addDoc(userCollectionRef(userId, 'appointments'), appointmentData);
            }
            setIsModalOpen(false);
            setNotification({ show: true, message: 'Agendamento salvo com sucesso!', type: 'success' });
            return true;
        } catch (error) {
            console.error('Erro ao salvar agendamento:', error);
            setNotification({ show: true, message: 'Erro ao salvar agendamento.', type: 'error' });
            return false;
        }
    };

    const handleOpenModal = (appointment = null, time = null) => {
        setSelectedAppointment(appointment);
        if (time) {
            const [hour, minute] = time.split(':');
            const newDate = new Date(currentDate);
            newDate.setHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0);
            setSelectedTime(newDate.toISOString());
        } else {
            setSelectedTime(null);
        }
        setIsModalOpen(true);
    };

    const timeSlots = Array.from({ length: 12 * 2 }, (_, index) => {
        const hour = 8 + Math.floor(index / 2);
        const minute = (index % 2) * 30;
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    });

    const filteredAppointments = useMemo(() => {
        return appointments.filter(appointment => {
            const appointmentDate = new Date(appointment.date);
            return appointmentDate.toDateString() === currentDate.toDateString();
        });
    }, [appointments, currentDate]);

    const professionalsMap = useMemo(() => {
        const map = new Map();
        professionals.forEach(professional => {
            if (professional?.id) {
                map.set(professional.id, professional);
            }
        });
        return map;
    }, [professionals]);

    const sortedMobileAppointments = useMemo(
        () => [...filteredAppointments].sort((a, b) => new Date(a.date) - new Date(b.date)),
        [filteredAppointments]
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Agenda da oficina</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Navegue pelos dias e toque em um horario para gerenciar os agendamentos.</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3 md:justify-end md:w-auto w-full">
                    <div className="flex flex-wrap items-center gap-2 justify-between sm:justify-end w-full sm:w-auto">
                        <Button
                            variant="secondary"
                            className="flex-1 min-w-[130px] sm:flex-none"
                            onClick={() => setCurrentDate(prev => new Date(prev.getTime() - 86400000))}
                        >
                            Dia anterior
                        </Button>
                        <div className="px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center font-semibold text-sm text-gray-700 dark:text-gray-200 flex-1 min-w-[150px] sm:flex-none">
                            {currentDate.toLocaleDateString('pt-BR')}
                        </div>
                        <Button
                            variant="secondary"
                            className="flex-1 min-w-[130px] sm:flex-none"
                            onClick={() => setCurrentDate(prev => new Date(prev.getTime() + 86400000))}
                        >
                            Proximo dia
                        </Button>
                    </div>
                    <Button
                        onClick={() => handleOpenModal()}
                        icon={<Plus size={18} />}
                        className="w-full sm:w-auto"
                    >
                        Novo agendamento
                    </Button>
                </div>
            </div>
            <div className="hidden md:block overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                <div className="grid" style={{ gridTemplateColumns: `80px repeat(${professionals.length}, minmax(180px, 1fr))` }}>
                    <div className="sticky left-0 bg-gray-100 dark:bg-gray-900 z-10">
                        <div className="h-16 flex items-center justify-center border-b border-r border-gray-200 dark:border-gray-700"><Clock size={24} /></div>
                        {timeSlots.map(time => (
                            <div key={time} className="h-20 flex items-center justify-center border-b border-r border-gray-200 dark:border-gray-700 font-mono text-sm">{time}</div>
                        ))}
                    </div>
                    {professionals.map(professional => (
                        <div key={professional.id} className="border-r border-gray-200 dark:border-gray-700">
                            <div className="h-16 flex flex-col items-center justify-center border-b border-gray-200 dark:border-gray-700 text-center px-2">
                                <p className="font-bold">{professional.name}</p>
                                <p className="text-xs text-gray-500">{professional.specialty}</p>
                            </div>
                            <div className="relative">
                                {timeSlots.map(time => (
                                    <div
                                        key={time}
                                        className="h-20 border-b border-gray-200 dark:border-gray-700 relative group"
                                        onClick={() => handleOpenModal(null, time)}
                                    >
                                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center transition-opacity">
                                            <Plus size={24} className="text-blue-500" />
                                        </div>
                                    </div>
                                ))}
                                {filteredAppointments.filter(appointment => appointment.professionalId === professional.id).map(appointment => {
                                    const appointmentDate = new Date(appointment.date);
                                    const top = ((appointmentDate.getHours() - 8) * 2 + appointmentDate.getMinutes() / 30) * 80;
                                    const totalDuration = appointment.services?.reduce((sum, service) => sum + service.duration, 0) || 60;
                                    const height = (totalDuration / 30) * 80;
                                    const colorClasses = statusColors[appointment.status] || statusColors.agendado;
                                    return (
                                        <div
                                            key={appointment.id}
                                            style={{ top: `${top}px`, height: `${height}px` }}
                                            className={`absolute left-1 right-1 p-2 rounded-lg border-l-4 shadow-md cursor-pointer ${colorClasses}`}
                                            onClick={() => handleOpenModal(appointment)}
                                        >
                                            <p className="font-bold text-sm truncate">{appointment.clientName}</p>
                                            <p className="text-xs truncate">{appointment.vehiclePlate || 'Sem placa'}</p>
                                            <p className="text-xs truncate">{appointment.services?.map(service => service.name).join(', ')}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="space-y-4 md:hidden">
                {sortedMobileAppointments.length === 0 ? (
                    <p className="text-sm text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        Nenhum agendamento para este dia.
                    </p>
                ) : (
                    sortedMobileAppointments.map(appointment => {
                        const appointmentDate = new Date(appointment.date);
                        const professional = professionalsMap.get(appointment.professionalId);
                        const statusClass = statusColors[appointment.status] || statusColors.agendado;
                        const servicesList = appointment.services?.map(service => service.name).join(', ') || 'Sem servicos vinculados';
                        const vehicleInfo = [appointment.vehicleBrand, appointment.vehicleModel, appointment.vehiclePlate].filter(Boolean).join(' ') || 'Veiculo nao informado';
                        return (
                            <div key={appointment.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">{appointment.clientName}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{professional?.name || 'Profissional nao definido'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                            {appointmentDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                            {appointmentDate.toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${statusClass}`}>
                                        {getStatusLabel(appointment.status)}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">{appointment.vehiclePlate || 'Sem placa'}</span>
                                </div>
                                <div className="grid grid-cols-1 gap-2 text-xs text-gray-600 dark:text-gray-300">
                                    <div>
                                        <span className="block font-medium text-gray-500 dark:text-gray-400">Veiculo</span>
                                        <span>{vehicleInfo}</span>
                                    </div>
                                    <div>
                                        <span className="block font-medium text-gray-500 dark:text-gray-400">Servicos</span>
                                        <span>{servicesList}</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        onClick={() => handleOpenModal(appointment)}
                                        variant="secondary"
                                        className="flex-1 min-w-[140px]"
                                        icon={<ClipboardList size={16} />}
                                    >
                                        Ver detalhes
                                    </Button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            <AppointmentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                appointment={selectedAppointment}
                onSave={handleSaveAppointment}
                clients={clients}
                professionals={professionals}
                services={services}
                selectedTime={selectedTime}
                setNotification={setNotification}
                userId={userId}
            />
        </div>
    );
};

export default Agenda;

