import React, { useState, useEffect, useRef } from 'react';
import { addDoc, updateDoc, deleteDoc, query, onSnapshot, orderBy, serverTimestamp } from 'firebase/firestore';
import { userCollectionRef, userDocRef } from '../firebase';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Calendar, Clock, User, Car, FileText, Plus, Edit, Trash2, Search, X } from 'lucide-react';

// --- Componentes Auxiliares (Reutilizados de Orcamentos) ---

const SectionHeader = ({ icon: Icon, title, action }) => (
  <div className="flex items-center justify-between mb-3 border-b pb-1 border-gray-200 dark:border-gray-700">
    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-semibold">
      {Icon && <Icon size={18} className="text-blue-600 dark:text-blue-400" />}
      <span>{title}</span>
    </div>
    {action}
  </div>
);

const SearchableSelect = ({ options, onSelect, onCreate, placeholder, label, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => opt.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative" ref={wrapperRef}>
      {label && <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">{label}</label>}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {Icon && <Icon size={16} className="text-gray-400" />}
        </div>
        <input
          type="text"
          className="w-full pl-9 pr-4 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder={placeholder}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
        />
      </div>
      {isOpen && search && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <div key={option.id} className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-sm" onClick={() => { onSelect(option); setSearch(''); setIsOpen(false); }}>
                <div className="font-medium text-gray-800 dark:text-gray-200">{option.name}</div>
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-center">
              <button onClick={() => { onCreate(search); setSearch(''); setIsOpen(false); }} className="text-sm text-blue-600 hover:underline flex items-center justify-center gap-1 w-full">
                <Plus size={14} /> Criar "{search}"
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- Modal de Agendamento ---

const AppointmentModal = ({ isOpen, onClose, appointment, onSave, onDelete, clients, userId }) => {
  const [formData, setFormData] = useState({
    clientId: '',
    clientName: '',
    vehiclePlate: '',
    vehicleModel: '',
    date: '',
    time: '',
    notes: '',
    status: 'Pendente'
  });

  useEffect(() => {
    if (appointment) {
      setFormData(appointment);
    } else {
      setFormData({
        clientId: '',
        clientName: '',
        vehiclePlate: '',
        vehicleModel: '',
        date: new Date().toISOString().split('T')[0],
        time: '08:00',
        notes: '',
        status: 'Pendente'
      });
    }
  }, [appointment, isOpen]);

  const handleClientSelect = (client) => {
    setFormData(prev => ({ ...prev, clientId: client.id, clientName: client.name }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const selectedClient = clients.find(c => c.id === formData.clientId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={appointment ? "Editar Agendamento" : "Novo Agendamento"}>
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Cliente */}
        <div>
          <SectionHeader icon={User} title="Cliente" />
          {formData.clientId ? (
            <div className="flex items-center justify-between p-2 border rounded-md bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <span className="font-medium text-blue-800 dark:text-blue-200">{formData.clientName}</span>
              <button type="button" onClick={() => setFormData({ ...formData, clientId: '', clientName: '', vehiclePlate: '', vehicleModel: '' })} className="text-blue-600 hover:text-blue-800 p-1">
                <X size={16} />
              </button>
            </div>
          ) : (
            <SearchableSelect
              options={clients}
              onSelect={handleClientSelect}
              onCreate={(name) => handleClientSelect({ id: 'temp_' + Date.now(), name })} // Simplificado para exemplo
              placeholder="Buscar cliente..."
              icon={Search}
            />
          )}
        </div>

        {/* Veículo */}
        <div>
          <SectionHeader icon={Car} title="Veículo" />
          {selectedClient && (selectedClient.vehicles || []).length > 0 && (
            <div className="mb-2">
              <select
                className="w-full text-sm p-2 border rounded bg-white dark:bg-gray-700"
                onChange={(e) => {
                  const v = selectedClient.vehicles.find(v => v.plate === e.target.value);
                  if (v) setFormData(prev => ({ ...prev, vehicleModel: v.model, vehiclePlate: v.plate }));
                }}
                value={formData.vehiclePlate}
              >
                <option value="">Selecione um veículo cadastrado...</option>
                {selectedClient.vehicles.map((v, i) => <option key={i} value={v.plate}>{v.model} - {v.plate}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input
              placeholder="Modelo"
              value={formData.vehicleModel}
              onChange={e => setFormData({ ...formData, vehicleModel: e.target.value })}
            />
            <Input
              placeholder="Placa"
              value={formData.vehiclePlate}
              onChange={e => setFormData({ ...formData, vehiclePlate: e.target.value })}
            />
          </div>
        </div>

        {/* Data e Hora */}
        <div>
          <SectionHeader icon={Calendar} title="Data e Hora" />
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
              required
            />
            <Input
              type="time"
              value={formData.time}
              onChange={e => setFormData({ ...formData, time: e.target.value })}
              required
            />
          </div>
        </div>

        {/* Observações */}
        <div>
          <SectionHeader icon={FileText} title="Observações" />
          <textarea
            className="w-full p-2 text-sm border rounded-md bg-gray-50 dark:bg-gray-700 h-20 resize-none focus:ring-1 focus:ring-blue-500"
            placeholder="Detalhes do serviço..."
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
          <div className="flex gap-2">
            {['Pendente', 'Confirmado', 'Concluído', 'Cancelado'].map(status => (
              <button
                key={status}
                type="button"
                onClick={() => setFormData({ ...formData, status })}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${formData.status === status
                  ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                  }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-700">
          {appointment && (
            <Button type="button" variant="danger" onClick={() => onDelete(appointment.id)}>
              <Trash2 size={18} />
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit">Salvar</Button>
        </div>
      </form>
    </Modal>
  );
};

// --- Componente Principal Agenda ---

const Agenda = ({ userId, setNotification }) => {
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!userId) return;

    // Buscar Agendamentos
    const qApp = query(userCollectionRef(userId, 'appointments'), orderBy('date'), orderBy('time'));
    const unsubApp = onSnapshot(qApp, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Buscar Clientes (para o select)
    const qCli = query(userCollectionRef(userId, 'clients'), orderBy('name'));
    const unsubCli = onSnapshot(qCli, (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubApp(); unsubCli(); };
  }, [userId]);

  const handleSave = async (data) => {
    try {
      if (data.id) {
        await updateDoc(userDocRef(userId, 'appointments', data.id), data);
      } else {
        await addDoc(userCollectionRef(userId, 'appointments'), { ...data, createdAt: serverTimestamp() });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Erro ao salvar agendamento:", error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir este agendamento?")) {
      try {
        await deleteDoc(userDocRef(userId, 'appointments', id));
        setIsModalOpen(false);
      } catch (error) {
        console.error("Erro ao excluir:", error);
      }
    }
  };

  const filteredAppointments = appointments.filter(a => a.date === filterDate);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Calendar className="text-blue-600" /> Agenda
        </h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
          <Button onClick={() => { setSelectedAppointment(null); setIsModalOpen(true); }} icon={<Plus size={18} />}>
            Novo Agendamento
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {filteredAppointments.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Nenhum agendamento para este dia.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredAppointments.map(app => (
              <div key={app.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors flex items-center justify-between group">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center min-w-[60px] p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-700 dark:text-blue-300">
                    <Clock size={18} className="mb-1" />
                    <span className="font-bold text-sm">{app.time}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white">{app.clientName}</h3>
                    <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                      {app.vehicleModel && (
                        <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">
                          <Car size={12} /> {app.vehicleModel} {app.vehiclePlate && `(${app.vehiclePlate})`}
                        </span>
                      )}
                    </div>
                    {app.notes && <p className="text-xs text-gray-400 mt-1 italic">{app.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${app.status === 'Concluído' ? 'bg-green-100 text-green-800 border-green-200' :
                    app.status === 'Cancelado' ? 'bg-red-100 text-red-800 border-red-200' :
                      app.status === 'Confirmado' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        'bg-yellow-100 text-yellow-800 border-yellow-200'
                    }`}>
                    {app.status}
                  </span>
                  <button
                    onClick={() => { setSelectedAppointment(app); setIsModalOpen(true); }}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                  >
                    <Edit size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        appointment={selectedAppointment}
        onSave={handleSave}
        onDelete={handleDelete}
        clients={clients}
        userId={userId}
      />
    </div>
  );
};

export default Agenda;
