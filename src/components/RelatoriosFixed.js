import React from 'react';
import { Button } from './ui/Button';
import { FileText, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const RelatoriosFixed = ({ transactions = [], estoque = [] }) => {

    const generateCashFlowPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Relatório de Fluxo de Caixa', 14, 20);
        doc.setFontSize(10);
        doc.text(`Gerado em: ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()}`, 14, 28);

        const tableData = transactions.map(t => [
            new Date(t.date).toLocaleDateString(),
            t.description,
            t.category || '-',
            t.type === 'income' ? 'Receita' : 'Despesa',
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(t.amount))
        ]);

        autoTable(doc, {
            startY: 35,
            head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor']],
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [41, 128, 185] }
        });

        // Totais
        const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
        const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
        const balance = totalIncome - totalExpense;

        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.text(`Total Receitas: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalIncome)}`, 14, finalY);
        doc.text(`Total Despesas: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalExpense)}`, 14, finalY + 7);
        doc.setFont(undefined, 'bold');
        doc.text(`Saldo Final: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}`, 14, finalY + 14);

        doc.save('fluxo_de_caixa.pdf');
    };

    const generateStockPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Relatório de Estoque e Valorização', 14, 20);
        doc.setFontSize(10);
        doc.text(`Gerado em: ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()}`, 14, 28);

        const tableData = estoque.map(item => [
            item.name,
            item.stock,
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.cost || 0)),
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.price || 0)),
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.stock) * Number(item.cost || 0))
        ]);

        autoTable(doc, {
            startY: 35,
            head: [['Item', 'Qtd', 'Custo Unit.', 'Venda Unit.', 'Valor Total (Custo)']],
            body: tableData,
            theme: 'striped',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [39, 174, 96] }
        });

        const totalStockValue = estoque.reduce((acc, item) => acc + (Number(item.stock) * Number(item.cost || 0)), 0);
        const finalY = doc.lastAutoTable.finalY + 10;

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`Valor Total do Estoque (Custo): ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalStockValue)}`, 14, finalY);

        doc.save('relatorio_estoque.pdf');
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Relatórios</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Card Fluxo de Caixa */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between h-48">
                    <div>
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg w-fit mb-4">
                            <FileText className="text-blue-600 dark:text-blue-400" size={24} />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Fluxo de Caixa</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Relatório completo de receitas e despesas.</p>
                    </div>
                    <Button onClick={generateCashFlowPDF} className="w-full mt-4">
                        <Download size={18} className="mr-2" /> Baixar PDF
                    </Button>
                </div>

                {/* Card Estoque */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between h-48">
                    <div>
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg w-fit mb-4">
                            <FileText className="text-green-600 dark:text-green-400" size={24} />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Posição de Estoque</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Inventário atual com valorização de custo.</p>
                    </div>
                    <Button onClick={generateStockPDF} className="w-full mt-4" variant="secondary">
                        <Download size={18} className="mr-2" /> Baixar PDF
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default RelatoriosFixed;
