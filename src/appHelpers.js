// src/appHelpers.js
import { EMPLOYEE_PERMISSION_CATALOG, enhancePermissionsShape } from './components/EmployeePermissions';

export const formatCurrency = value =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

export const TECHNICIAN_PAGE_PERMISSIONS = Object.freeze({
  agenda: 'agenda',
  clientes: 'clientes',
  patio: 'patio',
  financeiro: 'financeiro',
});

export const PERMISSION_LABEL_LOOKUP = EMPLOYEE_PERMISSION_CATALOG.reduce((acc, item) => {
  acc[item.key] = item.label;
  return acc;
}, {});

const normalizeDateValue = value => {
  if (!value) return new Date().toISOString().split('T')[0];
  if (typeof value === 'string') return value.split('T')[0];
  if (value?.toDate) return value.toDate().toISOString().split('T')[0];
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (value?.seconds) return new Date(value.seconds * 1000).toISOString().split('T')[0];
  return new Date().toISOString().split('T')[0];
};

const resolveTrialEndDate = value => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const resolveSubscriptionInfo = source => {
  const status =
    (source && (source.subscriptionStatus || source.parentSubscriptionStatus)) || 'active';
  const plan =
    (source && (source.subscriptionPlan || source.parentSubscriptionPlan)) || 'starter';
  const trialEndsAt = resolveTrialEndDate(
    source && (source.trialEndsAt || source.parentTrialEndsAt),
  );
  const now = new Date();
  const isTrialing = status === 'trialing' && (!trialEndsAt || trialEndsAt > now);
  const isActive = status === 'active' || isTrialing;
  const trialDaysLeft =
    isTrialing && trialEndsAt
      ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;
  return {
    status,
    plan,
    trialEndsAt,
    isTrialing,
    isActive,
    trialDaysLeft,
  };
};

// Normalizers
export const normalizeClient = client => ({
  id: client.id,
  name: client.name || '',
  cpf: client.cpf || '',
  phone: client.phone || '',
  email: client.email || '',
  vehicles: client.vehicles || [],
  createdAt: client.createdAt || null,
});

export const normalizeProfessional = professional => ({
  id: professional.id,
  uid: professional.uid || professional.id || '',
  adminId: professional.adminId || '',
  name: professional.name || '',
  email: professional.email || '',
  specialty: professional.specialty || '',
  permissions: enhancePermissionsShape(professional.permissions || {}),
  mustChangePassword: professional.mustChangePassword || false,
  avatarUrl: professional.avatarUrl || '',
});

export const normalizeService = service => ({
  id: service.id,
  name: service.name || '',
  price: Number.isFinite(service.price) ? service.price : 0,
  duration: Number.isFinite(service.duration) ? service.duration : 60,
  commissionType: service.commissionType || 'percentage',
  commissionValue: Number.isFinite(service.commissionValue) ? service.commissionValue : 0,
});

export const normalizeAppointment = appointment => ({
  id: appointment.id,
  clientId: appointment.clientId || '',
  clientName: appointment.clientName || '',
  professionalId: appointment.professionalId || '',
  professionalName: appointment.professionalName || '',
  services: Array.isArray(appointment.services) ? appointment.services : [],
  date: appointment.date || new Date().toISOString(),
  status: appointment.status || 'agendado',
  vehicleBrand: appointment.vehicleBrand || '',
  vehicleModel: appointment.vehicleModel || '',
  vehiclePlate: appointment.vehiclePlate || '',
  notes: appointment.notes || '',
  partsCost: Number.isFinite(appointment.partsCost) ? appointment.partsCost : 0,
  paymentMethod: appointment.paymentMethod || 'pix',
  totalPrice: Number.isFinite(appointment.totalPrice) ? appointment.totalPrice : 0,
});

export const normalizeTransaction = transaction => {
  const amountValue = Number.isFinite(transaction.amount)
    ? transaction.amount
    : Number(transaction.totalAmount ?? 0);
  const rawType = String(transaction.type || '').toLowerCase();
  const normalizedType =
    rawType === 'income' || rawType === 'receita'
      ? 'income'
      : rawType === 'expense' || rawType === 'despesa'
        ? 'expense'
        : rawType || 'income';

  return {
    id: transaction.id,
    description: transaction.description || '',
    appointmentId: transaction.appointmentId || '',
    clientId: transaction.clientId || '',
    clientName: transaction.clientName || '',
    professionalId: transaction.professionalId || '',
    professionalName: transaction.professionalName || '',
    services: Array.isArray(transaction.services) ? transaction.services : [],
    date: normalizeDateValue(transaction.date),
    type: normalizedType,
    amount: amountValue,
    category: transaction.category || '',
    status: transaction.status || 'paid',
    paymentMethod: transaction.paymentMethod || transaction.method || '',
    notes: transaction.notes || '',
    module: transaction.module || '',
    totalAmount: Number.isFinite(transaction.totalAmount)
      ? transaction.totalAmount
      : amountValue,
    serviceAmount: Number.isFinite(transaction.serviceAmount)
      ? transaction.serviceAmount
      : Number(transaction.totalAmount ?? transaction.amount ?? 0),
    partsCost: Number.isFinite(transaction.partsCost) ? transaction.partsCost : 0,
    commission: Number.isFinite(transaction.commission) ? transaction.commission : 0,
    tip: Number.isFinite(transaction.tip) ? transaction.tip : 0,
    manual: transaction.manual || false,
  };
};

export const normalizeBudget = budget => ({
  id: budget.id,
  clientId: budget.clientId || '',
  clientName: budget.clientName || '',
  vehiclePlate: budget.vehiclePlate || '',
  vehicleModel: budget.vehicleModel || '',
  vehicleBrand: budget.vehicleBrand || '',
  services: Array.isArray(budget.services) ? budget.services : [],
  parts: Array.isArray(budget.parts) ? budget.parts : [],
  laborCost: Number.isFinite(budget.laborCost) ? budget.laborCost : 0,
  partsTotal: Number.isFinite(budget.partsTotal) ? budget.partsTotal : 0,
  servicesTotal: Number.isFinite(budget.servicesTotal) ? budget.servicesTotal : 0,
  discount: Number.isFinite(budget.discount) ? budget.discount : 0,
  total: Number.isFinite(budget.total) ? budget.total : 0,
  notes: budget.notes || '',
  status: budget.status || 'draft',
  budgetNumber: budget.budgetNumber || '',
  createdAt: budget.createdAt || null,
  updatedAt: budget.updatedAt || null,
});

export const normalizeYardVehicle = vehicle => ({
  id: vehicle.id,
  clientId: vehicle.clientId || '',
  clientName: vehicle.clientName || '',
  vehiclePlate: vehicle.vehiclePlate || '',
  vehicleModel: vehicle.vehicleModel || '',
  vehicleBrand: vehicle.vehicleBrand || '',
  bay: vehicle.bay || '',
  entryTime: vehicle.entryTime || new Date().toISOString(),
  status: vehicle.status || 'recebido',
  priority: vehicle.priority || 'normal',
  notes: vehicle.notes || '',
  expectedDelivery: vehicle.expectedDelivery || '',
  exitTime: vehicle.exitTime || '',
  professionalId: vehicle.professionalId || '',
  professionalName: vehicle.professionalName || '',
  appointmentId: vehicle.appointmentId || '',
});

export const normalizeOrdemDeServico = ordem => ({
  id: ordem.id,
  clientId: ordem.clientId || '',
  clientName: ordem.clientName || '',
  vehiclePlate: ordem.vehiclePlate || '',
  vehicleModel: ordem.vehicleModel || '',
  vehicleBrand: ordem.vehicleBrand || '',
  professionalId: ordem.professionalId || '',
  professionalName: ordem.professionalName || '',
  services: Array.isArray(ordem.services) ? ordem.services : [],
  parts: Array.isArray(ordem.parts) ? ordem.parts : [],
  status: ordem.status || 'Pendente',
  notes: ordem.notes || '',
  createdAt: ordem.createdAt || null,
  totalPrice: Number.isFinite(ordem.totalPrice) ? ordem.totalPrice : 0,
});

export const normalizeEstoqueItem = item => ({
  id: item.id,
  name: item.name || '',
  description: item.description || '',
  quantity: Number.isFinite(item.quantity) ? item.quantity : 0,
  price: Number.isFinite(item.price) ? item.price : 0,
  supplier: item.supplier || '',
});
