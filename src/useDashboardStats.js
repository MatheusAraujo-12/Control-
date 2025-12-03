// src/useDashboardStats.js
import { useMemo } from 'react';
import { formatCurrency } from './appHelpers';

export default function useDashboardStats({
  transactions,
  appointments,
  clients,
  yardVehicles,
  budgets,
  currentEmployee,
  userProfile,
  professionals,
  selectedProfessionalId,
}) {
  return useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const toDate = value => {
      if (!value) return null;
      if (typeof value === 'object' && value.seconds) {
        return new Date(value.seconds * 1000);
      }
      return new Date(value);
    };

    const isSameCalendarDay = value => {
      const parsed = toDate(value);
      if (!parsed) return false;
      return (
        parsed.getFullYear() === today.getFullYear() &&
        parsed.getMonth() === today.getMonth() &&
        parsed.getDate() === today.getDate()
      );
    };

    const isSameMonth = value => {
      const parsed = toDate(value);
      if (!parsed) return false;
      return (
        parsed.getFullYear() === today.getFullYear() &&
        parsed.getMonth() === today.getMonth()
      );
    };

    const isEmployeeView = Boolean(currentEmployee && !userProfile);
    const employeeUid = currentEmployee?.uid || currentEmployee?.id || null;

    const adminSelectedProfessional =
      !isEmployeeView && selectedProfessionalId !== 'all'
        ? professionals.find(pro => (pro?.uid || pro?.id) === selectedProfessionalId)
        : null;

    const selectedProfessionalUid = isEmployeeView
      ? employeeUid
      : adminSelectedProfessional?.uid || adminSelectedProfessional?.id || null;
    const selectedProfessionalName = isEmployeeView
      ? currentEmployee?.name || ''
      : adminSelectedProfessional?.name || '';
    const shouldFilterByProfessional = Boolean(selectedProfessionalUid);

    const matchesProfessional = item => {
      if (!shouldFilterByProfessional) {
        return true;
      }
      const candidateId =
        item?.professionalId ||
        item?.uid ||
        item?.technicianId ||
        item?.employeeId ||
        item?.assignedProfessionalId ||
        item?.responsibleId ||
        null;
      if (candidateId && candidateId === selectedProfessionalUid) {
        return true;
      }
      const candidateName =
        item?.professionalName ||
        item?.technicianName ||
        item?.assignedProfessionalName ||
        item?.responsibleName ||
        null;
      if (selectedProfessionalName && candidateName) {
        return candidateName === selectedProfessionalName;
      }
      return false;
    };

    const relevantTransactions = transactions.filter(matchesProfessional);
    const relevantAppointments = appointments.filter(matchesProfessional);
    const relevantYardVehicles = yardVehicles.filter(matchesProfessional);
    const relevantBudgets = budgets.filter(matchesProfessional);

    const revenueTransactions = relevantTransactions.filter(
      transaction => transaction.type === 'receita',
    );

    const totalCommissionValue = revenueTransactions.reduce(
      (sum, transaction) => sum + (transaction.commission || 0),
      0,
    );

    const totalRevenueValue = revenueTransactions.reduce(
      (sum, transaction) => sum + (transaction.totalAmount || 0),
      0,
    );

    const receitaHojeValue = revenueTransactions
      .filter(transaction => isSameCalendarDay(transaction.date))
      .reduce(
        (sum, transaction) =>
          sum +
          (isEmployeeView ? transaction.commission || 0 : transaction.totalAmount || 0),
        0,
      );

    const receitaMesValue = revenueTransactions
      .filter(transaction => isSameMonth(transaction.date))
      .reduce((sum, transaction) => sum + (transaction.totalAmount || 0), 0);

    const comissoesMesValue = revenueTransactions
      .filter(transaction => isSameMonth(transaction.date))
      .reduce((sum, transaction) => sum + (transaction.commission || 0), 0);

    const agendamentosHoje = relevantAppointments.filter(appointment =>
      isSameCalendarDay(appointment.date),
    ).length;

    const isScopedToProfessional = shouldFilterByProfessional;

    const novosClientesMes = isScopedToProfessional
      ? (() => {
          const servedClients = new Set();
          relevantAppointments.forEach(appointment => {
            const parsed = toDate(appointment.date);
            if (!parsed) return;
            if (
              parsed.getFullYear() === today.getFullYear() &&
              parsed.getMonth() === today.getMonth()
            ) {
              servedClients.add(
                appointment.clientId || appointment.clientName || appointment.id,
              );
            }
          });
          return servedClients.size;
        })()
      : clients.filter(client => {
          const createdAt = toDate(client.createdAt);
          if (!createdAt) return false;
          return (
            createdAt.getFullYear() === today.getFullYear() &&
            createdAt.getMonth() === today.getMonth()
          );
        }).length;

    const chartSeriesKey = isEmployeeView ? 'Comissao' : 'Receita';
    const chartSeriesLabel = isEmployeeView ? 'Comissão' : 'Receita';

    const receitaPorDia = new Map();
    revenueTransactions.forEach(transaction => {
      const parsed = toDate(transaction.date);
      if (!parsed) return;
      parsed.setHours(0, 0, 0, 0);
      const key = parsed.toISOString().slice(0, 10);
      const valor = isEmployeeView
        ? transaction.commission || 0
        : transaction.totalAmount || 0;
      receitaPorDia.set(key, (receitaPorDia.get(key) || 0) + valor);
    });

    const receitaSemanal = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(today);
      day.setDate(day.getDate() - (6 - index));
      const key = day.toISOString().slice(0, 10);
      return {
        name: `${day
          .getDate()
          .toString()
          .padStart(2, '0')}/${(day.getMonth() + 1)
          .toString()
          .padStart(2, '0')}`,
        [chartSeriesKey]: receitaPorDia.get(key) || 0,
      };
    });

    const proximosAgendamentos = relevantAppointments
      .map(appointment => ({ ...appointment, parsedDate: toDate(appointment.date) }))
      .filter(appointment => appointment.parsedDate && appointment.parsedDate >= today)
      .sort((a, b) => a.parsedDate - b.parsedDate)
      .slice(0, 5)
      .map(appointment => ({
        id: appointment.id,
        clientName: appointment.clientName,
        date: appointment.parsedDate.toISOString(),
        services: appointment.services || [],
        vehiclePlate: appointment.vehiclePlate || '',
      }));

    const rankingColaboradores = (() => {
      if (isScopedToProfessional) {
        const orders = revenueTransactions.length;
        const totalForDisplay = isEmployeeView ? totalCommissionValue : totalRevenueValue;
        if (!orders && !totalForDisplay) {
          return [];
        }
        return [
          {
            id: selectedProfessionalUid || 'professional',
            name: selectedProfessionalName || (isEmployeeView ? 'Voce' : 'Profissional'),
            total: totalForDisplay,
            orders,
          },
        ];
      }

      const rankingMap = new Map();
      revenueTransactions.forEach(transaction => {
        const key = transaction.professionalId || transaction.professionalName || 'equipe';
        const current = rankingMap.get(key) || {
          id: transaction.professionalId || key,
          name: transaction.professionalName || 'Equipe da oficina',
          total: 0,
          orders: 0,
        };
        current.total += transaction.totalAmount || 0;
        current.orders += 1;
        rankingMap.set(key, current);
      });

      return Array.from(rankingMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
    })();

    const veiculosNoPatio = relevantYardVehicles.filter(vehicle => !vehicle.exitTime).length;
    const pendingBudgetsCount = relevantBudgets.filter(budget =>
      ['draft', 'sent'].includes(budget.status),
    ).length;

    const labels = isEmployeeView
      ? {
          painelTitulo: 'Painel do profissional',
          receitaHoje: 'Comissao (hoje)',
          receitaMes: 'Receita (mes)',
          comissoesMes: 'Comissao (mes)',
          agendamentosHoje: 'Ordens do dia',
          veiculosNoPatio: 'Veiculos sob seus cuidados',
          novosClientes: 'Clientes atendidos (mes)',
          comissoesPendentes: 'Total de comissoes',
          orcamentosPendentes: 'Orcamentos pendentes',
          grafico: 'Comissao (7 dias)',
          ranking: 'Seu ranking',
          rankingCta: 'Ver suas ordens',
          rankingCtaTarget: 'agenda',
          proximosAgendamentos: 'Seus proximos servicos',
        }
      : {
          painelTitulo: 'Painel da oficina',
          receitaHoje: 'Receita de servicos (hoje)',
          receitaMes: 'Receita do mes',
          comissoesMes: 'Comissoes do mes',
          agendamentosHoje: 'Ordens do dia',
          veiculosNoPatio: 'Veiculos no patio',
          novosClientes: 'Novos clientes (mes)',
          comissoesPendentes: 'Repasses pendentes',
          orcamentosPendentes: 'Orcamentos pendentes',
          grafico: 'Faturamento da oficina (7 dias)',
          ranking: 'Ranking de colaboradores',
          rankingCta: 'Ver detalhes no financeiro',
          rankingCtaTarget: 'financeiro',
          proximosAgendamentos: 'Proximos servicos',
          filtroTecnicos: 'Filtrar por tecnico',
        };

    return {
      receitaHoje: formatCurrency(receitaHojeValue),
      monthlyRevenue: formatCurrency(receitaMesValue),
      monthlyCommission: formatCurrency(comissoesMesValue),
      agendamentosHoje,
      novosClientesMes,
      comissoesPendentes: formatCurrency(totalCommissionValue),
      pendingBudgets: pendingBudgetsCount,
      receitaSemanal,
      proximosAgendamentos,
      rankingColaboradores,
      veiculosNoPatio,
      labels,
      chartSeriesKey,
      chartSeriesLabel,
      selectedProfessionalName,
    };
  }, [
    transactions,
    appointments,
    clients,
    yardVehicles,
    budgets,
    currentEmployee,
    userProfile,
    professionals,
    selectedProfessionalId,
  ]);
}
