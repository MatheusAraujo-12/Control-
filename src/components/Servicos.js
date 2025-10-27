import React, { useState, useEffect } from 'react';
import { addDoc, updateDoc } from 'firebase/firestore';
import { userCollectionRef, userDocRef } from '../firebase';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Plus, Edit, Wrench, DollarSign, Clock, Coins, Upload, Download } from 'lucide-react';
import Papa from 'papaparse';

const createDefaultServiceValues = () => ({
    name: '',
    price: '',
    duration: '60',
    commissionType: 'percentage',
    commissionValue: '',
});

const ServiceFormModal = ({ isOpen, onClose, service, onSave }) => {
    const [formData, setFormData] = useState(() => createDefaultServiceValues());
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setFormData(service ? { ...createDefaultServiceValues(), ...service } : createDefaultServiceValues());
    }, [service, isOpen]);

    const handleChange = event => setFormData({ ...formData, [event.target.name]: event.target.value });

    const handleSubmit = async event => {
        event.preventDefault();
        if (isSaving) {
            return;
        }
        setIsSaving(true);
        try {
            const success = await onSave(formData);
            if (success) {
                onClose();
            }
        } catch (error) {
            console.error('Erro ao submeter serviço:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={service ? 'Editar serviço da oficina' : 'Novo serviço'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input name="name" value={formData.name} onChange={handleChange} placeholder="Nome do serviço (ex: troca de óleo)" icon={<Wrench size={18} />} required />
                <Input name="price" type="number" step="0.01" value={formData.price} onChange={handleChange} placeholder="Preço mão de obra (R$)" icon={<DollarSign size={18} />} required />
                <Input name="duration" type="number" value={formData.duration} onChange={handleChange} placeholder="Tempo estimado (min)" icon={<Clock size={18} />} required />
                <div>
                    <label className="block text-sm font-medium">Tipo de repasse para o técnico</label>
                    <select name="commissionType" value={formData.commissionType} onChange={handleChange} className="w-full mt-1 p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200">
                        <option value="percentage">Percentual (%)</option>
                        <option value="fixed">Valor fixo (R$)</option>
                    </select>
                </div>
                <Input name="commissionValue" type="number" step="0.01" value={formData.commissionValue} onChange={handleChange} placeholder="Valor do repasse" icon={<Coins size={18} />} required />
                <div className="flex justify-end space-x-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar serviço'}</Button>
                </div>
            </form>
        </Modal>
    );
};

const UploadModal = ({ isOpen, onClose, onUpload, setNotification }) => {
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = (event) => {
        setFile(event.target.files[0]);
    };

    const handleUpload = () => {
        if (!file) {
            setNotification({ type: 'error', message: 'Por favor, selecione um arquivo.' });
            return;
        }

        setIsUploading(true);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    await onUpload(results.data);
                    onClose();
                } catch (error) {
                    setNotification({ type: 'error', message: `Erro ao importar planilha: ${error.message}` });
                } finally {
                    setIsUploading(false);
                }
            },
            error: (error) => {
                setNotification({ type: 'error', message: `Erro ao ler o arquivo: ${error.message}` });
                setIsUploading(false);
            }
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Importar Serviços de Planilha CSV">
            <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">Selecione um arquivo CSV para importar os serviços. Certifique-se de que a planilha tenha as colunas: <strong>name, price, duration, commissionType, commissionValue</strong>.</p>
                <Input type="file" accept=".csv" onChange={handleFileChange} />
                <div className="flex justify-end space-x-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleUpload} disabled={isUploading}>{isUploading ? 'Importando...' : 'Importar'}</Button>
                </div>
            </div>
        </Modal>
    );
};

const Servicos = ({ userId, services, setNotification }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [currentService, setCurrentService] = useState(null);

    const openModal = service => {
        setCurrentService(service);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentService(null);
    };

    const handleSave = async data => {
        if (!userId) {
            setNotification({ type: 'error', message: 'Sessão expirada. Faça login novamente.' });
            return false;
        }
        try {
            const serviceData = {
                ...data,
                price: parseFloat(data.price),
                commissionValue: parseFloat(data.commissionValue),
                duration: parseInt(data.duration, 10),
            };

            if ([serviceData.price, serviceData.commissionValue, serviceData.duration].some(value => Number.isNaN(value))) {
                setNotification({ type: 'error', message: 'Preencha valores numéricos válidos.' });
                return false;
            }

            if (currentService) {
                await updateDoc(userDocRef(userId, 'services', currentService.id), serviceData);
                setNotification({ type: 'success', message: 'Serviço atualizado com sucesso!' });
            } else {
                await addDoc(userCollectionRef(userId, 'services'), serviceData);
                setNotification({ type: 'success', message: 'Serviço cadastrado com sucesso!' });
            }
            return true;
        } catch (error) {
            console.error('Erro ao salvar serviço:', error);
            const extra = error && error.code ? ` (${error.code})` : '';
            setNotification({ type: 'error', message: `Não foi possível salvar o serviços ${extra}.` });
            return false;
        }
    };

    const handleDownloadTemplate = () => {
        const headers = 'name,price,duration,commissionType,commissionValue';
        const csvContent = `data:text/csv;charset=utf-8,${headers}`;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'modelo_servicos.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUpload = async (data) => {
        if (!userId) {
            setNotification({ type: 'error', message: 'Sessão expirada. Faça login novamente.' });
            return;
        }

        const promises = data.map(service => {
            const serviceData = {
                name: service.name || '',
                price: parseFloat(service.price) || 0,
                duration: parseInt(service.duration, 10) || 60,
                commissionType: ['percentage', 'fixed'].includes(service.commissionType) ? service.commissionType : 'percentage',
                commissionValue: parseFloat(service.commissionValue) || 0,
            };
            return addDoc(userCollectionRef(userId, 'services'), serviceData);
        });

        await Promise.all(promises);
        setNotification({ type: 'success', message: `${data.length} serviços importados com sucesso!` });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Serviços da oficina</h1>
                <div className="flex space-x-2">
                    <Button onClick={() => setIsUploadModalOpen(true)} variant="outline" icon={<Upload size={18} />}>Importar de Planilha</Button>
                    <Button onClick={handleDownloadTemplate} variant="outline" icon={<Download size={18} />}>Baixar Modelo</Button>
                    <Button onClick={() => openModal(null)} icon={<Plus size={18} />}>Novo serviço</Button>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hidden md:block">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="p-4 font-semibold">Serviço</th>
                            <th className="p-4 font-semibold">Preço mão de obra</th>
                            <th className="p-4 font-semibold">Comissão</th>
                            <th className="p-4 font-semibold">Tempo (min)</th>
                            <th className="p-4 font-semibold">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {services.map(service => (
                            <tr key={service.id}>
                                <td className="p-4">{service.name}</td>
                                <td className="p-4">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.price)}</td>
                                <td className="p-4">{service.commissionType === 'percentage' ? `${service.commissionValue}%` : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.commissionValue)}</td>
                                <td className="p-4">{service.duration}</td>
                                <td className="p-4">
                                    <Button onClick={() => openModal(service)} variant="secondary"><Edit size={16} /></Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="space-y-4 md:hidden">
                {services.map(service => (
                    <div key={service.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400">{service.name}</h3>
                            <Button onClick={() => openModal(service)} variant="secondary" className="px-3 py-1">
                                <Edit size={16} />
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
                            <div>
                                <span className="block font-medium text-gray-500 dark:text-gray-400">Preço mão de obra</span>
                                <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.price)}</span>
                            </div>
                            <div>
                                <span className="block font-medium text-gray-500 dark:text-gray-400">Tempo estimado</span>
                                <span>{service.duration} min</span>
                            </div>
                            <div>
                                <span className="block font-medium text-gray-500 dark:text-gray-400">Comissão</span>
                                <span>
                                    {service.commissionType === 'percentage'
                                        ? `${service.commissionValue}%`
                                        : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.commissionValue)}
                                </span>
                            </div>
                            <div>
                                <span className="block font-medium text-gray-500 dark:text-gray-400">Tipo de repasse</span>
                                <span>{service.commissionType === 'percentage' ? 'Percentual' : 'Valor fixo'}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <ServiceFormModal isOpen={isModalOpen} onClose={closeModal} service={currentService} onSave={handleSave} />
            <UploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} onUpload={handleUpload} setNotification={setNotification} />
        </div>
    );
};

export default Servicos;