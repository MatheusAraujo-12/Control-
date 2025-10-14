import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { userCollectionRef, userDocRef } from '../firebase';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Car, ClipboardList, MapPin, AlertTriangle, Clock, CheckCircle, Trash2, Calendar as CalendarIcon, Plus } from 'lucide-react';

const statusOptions = [
    { value: 'recebido', label: 'Recebido no patio' },
    { value: 'diagnostico', label: 'Em diagnostico' },
    { value: 'aguardando_pecas', label: 'Aguardando pecas' },
    { value: 'manutencao', label: 'Em manutencao' },
    { value: 'lavagem', label: 'Em lavagem' },
    { value: 'liberado', label: 'Liberado para entrega' },
];

const priorityOptions = [
    { value: 'alta', label: 'Alta' },
    { value: 'normal', label: 'Normal' },
    { value: 'baixa', label: 'Baixa' },
];

const createEmptyRecord = () => ({
    clientId: '',
    clientName: '',
    vehiclePlate: '',
    vehicleModel: '',
    vehicleBrand: '',
    bay: '',
    status: 'recebido',
    priority: 'normal',
    notes: '',
    expectedDelivery: '',
    appointmentDate: '',
    professionalId: '',
    professionalName: '',
    appointmentId: '',
});

const normalizeForForm = (record) => ({
    ...record,
    appointmentDate: record.appointmentDate ? new Date(record.appointmentDate).toISOString().slice(0, 16) : '',
    expectedDelivery: record.expectedDelivery ? new Date(record.expectedDelivery).toISOString().slice(0, 16) : '',
});

const YardFormModal = ({ isOpen, onClose, vehicle, onSave, clients, professionals }) => {
    const [formData, setFormData] = useState(() => createEmptyRecord());

    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (vehicle) {
            setFormData(normalizeForForm({ ...createEmptyRecord(), ...vehicle }));
        } else {
            setFormData(createEmptyRecord());
        }
    }, [vehicle, isOpen]);

    const handleClientChange = (event) => {
        const clientId = event.target.value;
        const selectedClient = clients.find((client) => client.id === clientId);
        setFormData((prev) => ({
            ...prev,
            clientId,
            clientName: selectedClient?.name || prev.clientName,
            vehicleBrand: selectedClient?.vehicleBrand || prev.vehicleBrand,
            vehicleModel: selectedClient?.vehicleModel || prev.vehicleModel,
            vehiclePlate: selectedClient?.vehiclePlate || prev.vehiclePlate,
        }));
    };

    const handleProfessionalChange = (event) => {
        const professionalId = event.target.value;
        const selectedProfessional = professionals.find((prof) => prof.id === professionalId);
        setFormData((prev) => ({
            ...prev,
            professionalId,
            professionalName: selectedProfessional?.name || '',
        }));
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSaving(true);
        try {
            const success = await onSave(formData);
            if (success) {
                onClose();
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={vehicle ? 'Editar veiculo no patio' : 'Registrar entrada no patio'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium">Cliente</label>
                    <select
                        name="clientId"
                        value={formData.clientId}
                        onChange={handleClientChange}
                        className="w-full mt-1 p-2 border rounded-lg bg-gray-50 dark:bg-gray-700"
                        required
                    >
                        <option value="">Selecione um cliente</option>
                        {clients.map((client) => (
                            <option key={client.id} value={client.id}>
                                {client.name}
                            </option>
                        ))}
                    </select>
                </div>
                <Input name="clientName" value={formData.clientName} onChange={handleChange} placeholder="Nome do cliente" icon={<ClipboardList size={18} />} required />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input name="vehicleBrand" value={formData.vehicleBrand} onChange={handleChange} placeholder="Marca" icon={<Car size={18} />} />
                    <Input name="vehicleModel" value={formData.vehicleModel} onChange={handleChange} placeholder="Modelo" icon={<Car size={18} />} />
                    <Input name="vehiclePlate" value={formData.vehiclePlate} onChange={handleChange} placeholder="Placa" icon={<ClipboardList size={18} />} required />
                    <Input name="bay" value={formData.bay} onChange={handleChange} placeholder="Box/Setor" icon={<MapPin size={18} />} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Status</label>
                        <select name="status" value={formData.status} onChange={handleChange} className="w-full mt-1 p-2 border rounded-lg bg-gray-50 dark:bg-gray-700">
                            {statusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Prioridade</label>
                        <select name="priority" value={formData.priority} onChange={handleChange} className="w-full mt-1 p-2 border rounded-lg bg-gray-50 dark:bg-gray-700">
                            {priorityOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium">Tecnico responsavel</label>
                    <select
                        name="professionalId"
                        value={formData.professionalId}
                        onChange={handleProfessionalChange}
                        className="w-full mt-1 p-2 border rounded-lg bg-gray-50 dark:bg-gray-700"
                        required
                    >
                        <option value="">Selecione um tecnico</option>
                        {professionals.map((professional) => (
                            <option key={professional.id} value={professional.id}>
                                {professional.name}
                            </option>
                        ))}
                    </select>
                </div>
                <Input
                    name="appointmentDate"
                    type="datetime-local"
                    value={formData.appointmentDate}
                    onChange={handleChange}
                    placeholder="Data e hora do agendamento"
                    icon={<CalendarIcon size={18} />}
                    required
                />
                <Input
                    name="expectedDelivery"
                    type="datetime-local"
                    value={formData.expectedDelivery}
                    onChange={handleChange}
                    icon={<Clock size={18} />}
                />
                <div>
                    <label className="block text-sm font-medium">Observacoes</label>
                    <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        className="w-full mt-1 p-2 border rounded-lg bg-gray-50 dark:bg-gray-700"
                        rows={3}
                        placeholder="Anote aprovacoes, pendencias de pecas ou solicitacoes do cliente"
                    ></textarea>
                </div>
                <div className="flex justify-end gap-3">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</Button>
                </div>
            </form>
        </Modal>
    );
};

const Patio = ({ userId, vehicles, professionals, clients, setNotification }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState(null);

    const vehiclesOrdenados = useMemo(() => {
        const priorityWeight = { alta: 0, normal: 1, baixa: 2 };
        return [...vehicles]
            .filter((vehicle) => !vehicle.exitTime)
            .sort((a, b) => {
                const priorityDiff = (priorityWeight[a.priority] ?? 1) - (priorityWeight[b.priority] ?? 1);
                if (priorityDiff !== 0) {
                    return priorityDiff;
                }
                return new Date(a.entryTime) - new Date(b.entryTime);
            });
    }, [vehicles]);

    const historico = useMemo(() => vehicles.filter((vehicle) => !!vehicle.exitTime), [vehicles]);

    const toIsoOrNull = (value) => {
        if (!value) {
            return null;
        }
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return null;
        }
        return parsed.toISOString();
    };

    const handleSaveVehicle = async (data) => {
        if (!userId) {
            setNotification({ type: 'error', message: 'Sessao expirada. Faça login novamente.' });
            return;
        }
        try {
            const appointmentIso = toIsoOrNull(data.appointmentDate);
            if (!data.clientId || !data.professionalId || !appointmentIso) {
                setNotification({ type: 'error', message: 'Selecione cliente, tecnico e informe um horario valido.' });
                return;
            }

            const expectedDeliveryIso = toIsoOrNull(data.expectedDelivery) || '';
            const client = clients.find((item) => item.id === data.clientId);
            const professional = professionals.find((item) => item.id === data.professionalId);

            const yardPayload = {
                clientId: data.clientId,
                clientName: client?.name || data.clientName,
                vehiclePlate: data.vehiclePlate,
                vehicleModel: data.vehicleModel,
                vehicleBrand: data.vehicleBrand,
                bay: data.bay,
                status: data.status,
                priority: data.priority,
                notes: data.notes,
                expectedDelivery: expectedDeliveryIso,
                entryTime: selectedVehicle?.entryTime || new Date().toISOString(),
                appointmentDate: appointmentIso,
                professionalId: data.professionalId,
                professionalName: professional?.name || '',
                appointmentId: selectedVehicle?.appointmentId || '',
            };

            let yardDocId = selectedVehicle?.id;

            if (selectedVehicle) {
                await updateDoc(userDocRef(userId, 'yard', selectedVehicle.id), yardPayload);
            } else {
                const yardRef = await addDoc(userCollectionRef(userId, 'yard'), yardPayload);
                yardDocId = yardRef.id;
            }

            const appointmentPayload = {
                clientId: data.clientId,
                clientName: client?.name || data.clientName,
                professionalId: data.professionalId,
                professionalName: professional?.name || '',
                services: selectedVehicle?.services || [],
                date: appointmentIso,
                status: 'agendado',
                vehicleBrand: data.vehicleBrand,
                vehicleModel: data.vehicleModel,
                vehiclePlate: data.vehiclePlate,
                notes: data.notes,
                partsCost: selectedVehicle?.partsCost || 0,
                paymentMethod: selectedVehicle?.paymentMethod || 'pix',
                totalPrice: selectedVehicle?.totalPrice || 0,
            };

            let appointmentId = selectedVehicle?.appointmentId;
            if (appointmentId) {
                await updateDoc(userDocRef(userId, 'appointments', appointmentId), appointmentPayload);
            } else {
                const appointmentRef = await addDoc(userCollectionRef(userId, 'appointments'), appointmentPayload);
                appointmentId = appointmentRef.id;
                await updateDoc(userDocRef(userId, 'yard', yardDocId), { appointmentId });
            }

            setIsModalOpen(false);
            setSelectedVehicle(null);
            setNotification({ type: 'success', message: 'Veiculo registrado e agendamento criado!' });
        } catch (error) {
            console.error('Erro ao salvar registro do patio:', error);
            setNotification({ type: 'error', message: 'Nao foi possivel salvar o registro.' });
        }
    };

    const handleLiberarVeiculo = async (vehicle) => {
        if (!userId) {
            setNotification({ type: 'error', message: 'Sessao expirada. Faça login novamente.' });
            return;
        }
        try {
            await updateDoc(userDocRef(userId, 'yard', vehicle.id), {
                status: 'liberado',
                exitTime: new Date().toISOString(),
            });
            setNotification({ type: 'success', message: 'Veiculo liberado com sucesso!' });

            if (vehicle.appointmentId) {

                await updateDoc(userDocRef(userId, 'appointments', vehicle.appointmentId), { status: 'finalizado' });

            }
        } catch (error) {
            console.error('Erro ao liberar veiculo:', error);
            setNotification({ type: 'error', message: 'Nao foi possivel liberar o veiculo.' });
        }
    };

    const handleRemoverRegistro = async (vehicle) => {
        if (!userId) {
            setNotification({ type: 'error', message: 'Sessao expirada. Faça login novamente.' });
            return;
        }
        try {
            await deleteDoc(userDocRef(userId, 'yard', vehicle.id));
            setNotification({ type: 'success', message: 'Registro removido do patio.' });
        } catch (error) {
            console.error('Erro ao remover registro do patio:', error);
            setNotification({ type: 'error', message: 'Nao foi possivel remover o registro.' });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Controle de patio</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Organize os veiculos presentes na oficina e gere agendamentos automaticamente.</p>
                </div>
                <Button
                    onClick={() => { setSelectedVehicle(null); setIsModalOpen(true); }}
                    icon={<Plus size={18} />}
                    className="w-full md:w-auto"
                >
                    Registrar entrada
                </Button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Veiculos no patio ({vehiclesOrdenados.length})</h2>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Prioridade e permanencia</span>
                    </div>
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="p-4 font-semibold">Veiculo</th>
                                    <th className="p-4 font-semibold">Placa</th>
                                    <th className="p-4 font-semibold">Tecnico</th>
                                    <th className="p-4 font-semibold">Agendamento</th>
                                    <th className="p-4 font-semibold">Status</th>
                                    <th className="p-4 font-semibold">Box</th>
                                    <th className="p-4 font-semibold">Prioridade</th>
                                    <th className="p-4 font-semibold">Entrada</th>
                                    <th className="p-4 font-semibold">Acoes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {vehiclesOrdenados.length > 0 ? (
                                    vehiclesOrdenados.map((vehicle) => (
                                        <tr key={vehicle.id}>
                                            <td className="p-4">
                                                <p className="font-semibold text-gray-800 dark:text-gray-200">{vehicle.vehicleBrand} {vehicle.vehicleModel}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">{vehicle.clientName}</p>
                                            </td>
                                            <td className="p-4 font-mono">{vehicle.vehiclePlate}</td>
                                            <td className="p-4">{vehicle.professionalName || '--'}</td>
                                            <td className="p-4 text-sm">{vehicle.appointmentDate ? new Date(vehicle.appointmentDate).toLocaleString('pt-BR') : '--'}</td>
                                            <td className="p-4">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                                                    {statusOptions.find((option) => option.value === vehicle.status)?.label || vehicle.status}
                                                </span>
                                            </td>
                                            <td className="p-4">{vehicle.bay || '--'}</td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${vehicle.priority === 'alta' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' : vehicle.priority === 'baixa' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'}`}>
                                                    {priorityOptions.find((option) => option.value === vehicle.priority)?.label || vehicle.priority}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm">{vehicle.entryTime ? new Date(vehicle.entryTime).toLocaleString('pt-BR') : '--'}</td>
                                            <td className="p-4 space-x-2 whitespace-nowrap">
                                                <Button variant="secondary" className="px-3 py-1 text-sm" onClick={() => { setSelectedVehicle(vehicle); setIsModalOpen(true); }}>Editar</Button>
                                                <Button variant="success" className="px-3 py-1 text-sm" onClick={() => handleLiberarVeiculo(vehicle)} icon={<CheckCircle size={16} />}>Liberar</Button>
                                                <Button variant="danger" className="px-3 py-1 text-sm" onClick={() => handleRemoverRegistro(vehicle)} icon={<Trash2 size={16} />}>Remover</Button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td className="p-4 text-center text-gray-500" colSpan={9}>Nenhum veiculo registrado no patio.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="md:hidden border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
                        {vehiclesOrdenados.length === 0 ? (
                            <p className="text-sm text-center text-gray-500 dark:text-gray-400">Nenhum veiculo registrado no patio.</p>
                        ) : (
                            vehiclesOrdenados.map((vehicle) => {
                                const statusLabel = statusOptions.find((option) => option.value === vehicle.status)?.label || vehicle.status;
                                const priorityLabel = priorityOptions.find((option) => option.value === vehicle.priority)?.label || vehicle.priority;
                                return (
                                    <div key={vehicle.id} className="bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4 space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                                    {[vehicle.vehicleBrand, vehicle.vehicleModel].filter(Boolean).join(' ') || 'Veiculo sem descricao'}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{vehicle.clientName || 'Cliente nao informado'}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-mono text-sm text-gray-700 dark:text-gray-200">{vehicle.vehiclePlate || '--'}</span>
                                                {vehicle.bay ? (
                                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Box {vehicle.bay}</p>
                                                ) : null}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                                                {statusLabel}
                                            </span>
                                            <span
                                                className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold ${
                                                    vehicle.priority === 'alta'
                                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                                                        : vehicle.priority === 'baixa'
                                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                                                }`}
                                            >
                                                {priorityLabel}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2 text-xs text-gray-600 dark:text-gray-300">
                                            <div>
                                                <span className="block font-medium text-gray-500 dark:text-gray-400">Tecnico responsavel</span>
                                                <span>{vehicle.professionalName || '--'}</span>
                                            </div>
                                            <div>
                                                <span className="block font-medium text-gray-500 dark:text-gray-400">Agendamento</span>
                                                <span>{vehicle.appointmentDate ? new Date(vehicle.appointmentDate).toLocaleString('pt-BR') : '--'}</span>
                                            </div>
                                            <div>
                                                <span className="block font-medium text-gray-500 dark:text-gray-400">Entrada no patio</span>
                                                <span>{vehicle.entryTime ? new Date(vehicle.entryTime).toLocaleString('pt-BR') : '--'}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                variant="secondary"
                                                className="flex-1 min-w-[120px]"
                                                onClick={() => { setSelectedVehicle(vehicle); setIsModalOpen(true); }}
                                            >
                                                Editar
                                            </Button>
                                            <Button
                                                variant="success"
                                                className="flex-1 min-w-[120px]"
                                                onClick={() => handleLiberarVeiculo(vehicle)}
                                                icon={<CheckCircle size={16} />}
                                            >
                                                Liberar
                                            </Button>
                                            <Button
                                                variant="danger"
                                                className="flex-1 min-w-[120px]"
                                                onClick={() => handleRemoverRegistro(vehicle)}
                                                icon={<Trash2 size={16} />}
                                            >
                                                Remover
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-semibold">Resumo rapido</h2>
                    </div>
                    <div className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Total no patio</p>
                                <p className="text-2xl font-bold">{vehiclesOrdenados.length}</p>
                            </div>
                            <Car className="text-blue-500" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Status dos veiculos</p>
                            <div className="space-y-2">
                                {statusOptions.map((option) => {
                                    const count = vehiclesOrdenados.filter((vehicle) => vehicle.status === option.value).length;
                                    return (
                                        <div key={option.value} className="flex items-center justify-between text-sm">
                                            <span>{option.label}</span>
                                            <span className="font-semibold">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Prioridades</p>
                            <div className="space-y-2">
                                {priorityOptions.map((option) => {
                                    const count = vehiclesOrdenados.filter((vehicle) => vehicle.priority === option.value).length;
                                    return (
                                        <div key={option.value} className="flex items-center justify-between text-sm">
                                            <span>{option.label}</span>
                                            <span className="font-semibold">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                    <AlertTriangle className="text-yellow-500" />
                    <div>
                        <h2 className="text-xl font-semibold">Historico recente</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Ultimos veiculos liberados para consulta rapida.</p>
                    </div>
                </div>
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="p-4 font-semibold">Veiculo</th>
                                <th className="p-4 font-semibold">Placa</th>
                                <th className="p-4 font-semibold">Entrada</th>
                                <th className="p-4 font-semibold">Saida</th>
                                <th className="p-4 font-semibold">Notas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {historico.length > 0 ? (
                                historico.slice(-10).reverse().map((vehicle) => (
                                    <tr key={vehicle.id}>
                                        <td className="p-4">{vehicle.vehicleBrand} {vehicle.vehicleModel}</td>
                                        <td className="p-4">{vehicle.vehiclePlate}</td>
                                        <td className="p-4">{vehicle.entryTime ? new Date(vehicle.entryTime).toLocaleString('pt-BR') : '--'}</td>
                                        <td className="p-4">{vehicle.exitTime ? new Date(vehicle.exitTime).toLocaleString('pt-BR') : '--'}</td>
                                        <td className="p-4 text-sm text-gray-500 dark:text-gray-400">{vehicle.notes || '--'}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td className="p-4 text-center text-gray-500" colSpan={5}>Nao ha historico de saidas.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="md:hidden border-t border-gray-200 dark:border-gray-700 p-4 space-y-3">
                    {historico.length > 0 ? (
                        historico.slice(-10).reverse().map((vehicle) => (
                            <div key={vehicle.id} className="bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">{[vehicle.vehicleBrand, vehicle.vehicleModel].filter(Boolean).join(' ') || 'Veiculo'}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{vehicle.notes || 'Sem observacoes'}</p>
                                    </div>
                                    <span className="font-mono text-sm text-gray-700 dark:text-gray-200">{vehicle.vehiclePlate || '--'}</span>
                                </div>
                                <div className="grid grid-cols-1 gap-2 text-xs text-gray-600 dark:text-gray-300">
                                    <div>
                                        <span className="block font-medium text-gray-500 dark:text-gray-400">Entrada</span>
                                        <span>{vehicle.entryTime ? new Date(vehicle.entryTime).toLocaleString('pt-BR') : '--'}</span>
                                    </div>
                                    <div>
                                        <span className="block font-medium text-gray-500 dark:text-gray-400">Saida</span>
                                        <span>{vehicle.exitTime ? new Date(vehicle.exitTime).toLocaleString('pt-BR') : '--'}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-center text-gray-500 dark:text-gray-400">Nao ha historico de saidas.</p>
                    )}
                </div>
            </div>

            <YardFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                vehicle={selectedVehicle}
                onSave={handleSaveVehicle}
                clients={clients}
                professionals={professionals}
            />
        </div>
    );
};

export default Patio;

