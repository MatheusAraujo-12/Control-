import React, { useState, useEffect } from 'react';
import { query, getDocs, addDoc, updateDoc, orderBy, serverTimestamp } from 'firebase/firestore';
import { userCollectionRef, userDocRef } from '../firebase';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { Car, Clock, CheckCircle, LogIn, LogOut, AlertCircle, Search } from 'lucide-react';

const Patio = ({ userId }) => {
    const [vehicles, setVehicles] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentVehicle, setCurrentVehicle] = useState(null);

    const [formData, setFormData] = useState({
        clientName: '',
        vehiclePlate: '',
        vehicleModel: '',
        vehicleBrand: '',
        vehicleColor: '',
        notes: '',
        status: 'Na Oficina'
    });

    // Carregar veículos no pátio
    useEffect(() => {
        const fetchPatio = async () => {
            if (!userId) return;
            try {
                // Buscar veículos ordenados por entrada
                const q = query(userCollectionRef(userId, 'patio'), orderBy('entryDate', 'desc'));
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setVehicles(data);
            } catch (error) {
                console.error("Erro ao buscar pátio:", error);
            }
        };

        fetchPatio();
    }, [userId, isModalOpen]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!userId) return;

        try {
            if (currentVehicle) {
                await updateDoc(userDocRef(userId, 'patio', currentVehicle.id), formData);
            } else {
                await addDoc(userCollectionRef(userId, 'patio'), {
                    ...formData,
                    entryDate: serverTimestamp(),
                    osLinked: false // Manual
                });
            }
            setIsModalOpen(false);
            setCurrentVehicle(null);
            setFormData({ clientName: '', vehiclePlate: '', vehicleModel: '', vehicleBrand: '', vehicleColor: '', notes: '', status: 'Na Oficina' });
        } catch (error) {
            console.error("Erro ao salvar veículo:", error);
        }
    };

    const handleExit = async (vehicle) => {
        if (!window.confirm(`Confirmar saída do veículo ${vehicle.vehiclePlate}?`)) return;
        try {
            await updateDoc(userDocRef(userId, 'patio', vehicle.id), {
                status: 'Saída',
                exitDate: serverTimestamp()
            });
            // Atualizar lista localmente
            setVehicles(prev => prev.map(v => v.id === vehicle.id ? { ...v, status: 'Saída', exitDate: { seconds: Date.now() / 1000 } } : v));
        } catch (error) {
            console.error("Erro ao registrar saída:", error);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Na Oficina': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Em Serviço': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Aguardando Peças': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'Pronto': return 'bg-green-100 text-green-800 border-green-200';
            case 'Saída': return 'bg-gray-100 text-gray-600 border-gray-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const filteredVehicles = vehicles.filter(v =>
        v.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.vehiclePlate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.vehicleModel?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const activeVehicles = filteredVehicles.filter(v => v.status !== 'Saída');
    const historyVehicles = filteredVehicles.filter(v => v.status === 'Saída');

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Controle de Pátio</h1>
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar placa, cliente..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700"
                        />
                    </div>
                    <Button onClick={() => { setCurrentVehicle(null); setIsModalOpen(true); }} icon={<LogIn size={18} />}>Entrada Manual</Button>
                </div>
            </div>

            {/* Veículos no Pátio (Cards) */}
            <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Car className="text-blue-600" /> Veículos no Pátio ({activeVehicles.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeVehicles.map(vehicle => (
                        <Card key={vehicle.id} className="border-l-4 border-l-blue-500 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2">
                                <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(vehicle.status)}`}>
                                    {vehicle.status}
                                </span>
                            </div>

                            <div className="mb-4">
                                <h3 className="text-lg font-bold">{vehicle.vehicleModel} - {vehicle.vehicleBrand}</h3>
                                <p className="text-2xl font-mono text-gray-700 dark:text-gray-300 my-1">{vehicle.vehiclePlate}</p>
                                <p className="text-sm text-gray-500">{vehicle.clientName}</p>
                                {vehicle.vehicleColor && <p className="text-xs text-gray-400 mt-1">Cor: {vehicle.vehicleColor}</p>}
                            </div>

                            {/* Timeline Simplificada */}
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-4 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                <Clock size={14} />
                                <span>Entrada: {vehicle.entryDate ? new Date(vehicle.entryDate.seconds * 1000).toLocaleString() : 'N/A'}</span>
                            </div>

                            {vehicle.notes && (
                                <div className="mb-4 text-sm bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded text-yellow-800 dark:text-yellow-200 flex gap-2">
                                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                    <p>{vehicle.notes}</p>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 mt-auto">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setCurrentVehicle(vehicle);
                                        setFormData({
                                            clientName: vehicle.clientName,
                                            vehiclePlate: vehicle.vehiclePlate,
                                            vehicleModel: vehicle.vehicleModel,
                                            vehicleBrand: vehicle.vehicleBrand,
                                            vehicleColor: vehicle.vehicleColor || '',
                                            notes: vehicle.notes || '',
                                            status: vehicle.status
                                        });
                                        setIsModalOpen(true);
                                    }}
                                >
                                    Editar
                                </Button>
                                <Button variant="danger" size="sm" onClick={() => handleExit(vehicle)} icon={<LogOut size={16} />}>
                                    Saída
                                </Button>
                            </div>
                        </Card>
                    ))}
                    {activeVehicles.length === 0 && (
                        <div className="col-span-full text-center p-8 text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300">
                            Nenhum veículo no pátio no momento.
                        </div>
                    )}
                </div>
            </div>

            {/* Histórico Recente (Tabela) */}
            {historyVehicles.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <CheckCircle className="text-green-600" /> Histórico de Saídas
                    </h2>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                        <table className="min-w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="p-3">Veículo</th>
                                    <th className="p-3">Placa</th>
                                    <th className="p-3">Cliente</th>
                                    <th className="p-3">Entrada</th>
                                    <th className="p-3">Saída</th>
                                    <th className="p-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {historyVehicles.slice(0, 10).map(v => (
                                    <tr key={v.id}>
                                        <td className="p-3">{v.vehicleBrand} {v.vehicleModel}</td>
                                        <td className="p-3 font-mono">{v.vehiclePlate}</td>
                                        <td className="p-3">{v.clientName}</td>
                                        <td className="p-3">{v.entryDate ? new Date(v.entryDate.seconds * 1000).toLocaleDateString() : '--'}</td>
                                        <td className="p-3">{v.exitDate ? new Date(v.exitDate.seconds * 1000).toLocaleDateString() : '--'}</td>
                                        <td className="p-3"><span className="px-2 py-1 bg-gray-100 rounded-full text-xs">Saída</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal de Entrada/Edição */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={currentVehicle ? 'Atualizar Veículo' : 'Registrar Entrada'}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <Input
                        name="clientName"
                        value={formData.clientName}
                        onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                        placeholder="Nome do Cliente"
                        required
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            name="vehiclePlate"
                            value={formData.vehiclePlate}
                            onChange={e => setFormData({ ...formData, vehiclePlate: e.target.value.toUpperCase() })}
                            placeholder="Placa"
                            required
                        />
                        <Input
                            name="vehicleColor"
                            value={formData.vehicleColor}
                            onChange={e => setFormData({ ...formData, vehicleColor: e.target.value })}
                            placeholder="Cor"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            name="vehicleBrand"
                            value={formData.vehicleBrand}
                            onChange={e => setFormData({ ...formData, vehicleBrand: e.target.value })}
                            placeholder="Marca"
                        />
                        <Input
                            name="vehicleModel"
                            value={formData.vehicleModel}
                            onChange={e => setFormData({ ...formData, vehicleModel: e.target.value })}
                            placeholder="Modelo"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Status Atual</label>
                        <select
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                            className="w-full p-2 border rounded bg-white dark:bg-gray-700"
                        >
                            <option value="Na Oficina">Na Oficina</option>
                            <option value="Em Serviço">Em Serviço</option>
                            <option value="Aguardando Peças">Aguardando Peças</option>
                            <option value="Pronto">Pronto</option>
                            <option value="Saída">Saída (Finalizar)</option>
                        </select>
                    </div>

                    <textarea
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Observações (avarias, nível de combustível, etc)"
                        className="w-full p-2 border rounded bg-white dark:bg-gray-700 h-24"
                    />

                    <div className="flex justify-end pt-4">
                        <Button type="submit">Salvar</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Patio;
