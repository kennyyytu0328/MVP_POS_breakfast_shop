import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, ShoppingBag, Trash2, FileText, X } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';

const API_URL = 'http://localhost:8787/api';

export default function TransactionHistory() {
    const { t } = useTranslation();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showReportModal, setShowReportModal] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [reportData, setReportData] = useState(null);

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        try {
            const res = await axios.get(`${API_URL}/transactions`);
            setTransactions(res.data);
        } catch (error) {
            console.error("Failed to fetch transactions", error);
        } finally {
            setLoading(false);
        }
    };

    const handleClearHistory = async () => {
        if (!confirm(t('transaction.clearConfirm'))) return;
        try {
            await axios.delete(`${API_URL}/transactions`);
            fetchTransactions();
        } catch (error) {
            console.error("Failed to clear history", error);
            alert(t('transaction.clearFailed'));
        }
    };

    const handleGenerateReport = async () => {
        try {
            const res = await axios.post(`${API_URL}/reports/monthly`, { month: selectedMonth });
            setReportData(res.data);
        } catch (error) {
            console.error("Failed to generate report", error);
            alert(t('transaction.reportFailed'));
        }
    };

    if (loading) return <div className="p-8 text-center">{t('transaction.loading')}</div>;

    return (
        <div className="max-w-4xl mx-auto relative">
            {/* Report Modal */}
            {showReportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">{t('transaction.monthlySalesReport')}</h3>
                            <button onClick={() => setShowReportModal(false)} className="text-gray-500 hover:text-gray-700">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex gap-4 mb-6 items-end">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('transaction.selectMonth')}</label>
                                <input
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="p-2 border rounded-md"
                                />
                            </div>
                            <button
                                onClick={handleGenerateReport}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                {t('transaction.generateReport')}
                            </button>
                        </div>

                        {reportData && (
                            <div className="space-y-6 animate-in fade-in">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-blue-50 p-4 rounded-lg">
                                        <div className="text-sm text-blue-600 font-medium">{t('transaction.totalSales')}</div>
                                        <div className="text-2xl font-bold text-blue-900">${reportData.total_sales}</div>
                                    </div>
                                    <div className="bg-green-50 p-4 rounded-lg">
                                        <div className="text-sm text-green-600 font-medium">{t('transaction.totalOrders')}</div>
                                        <div className="text-2xl font-bold text-green-900">{reportData.total_orders}</div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-semibold mb-3">{t('transaction.salesByCategory')}</h4>
                                    <div className="space-y-2">
                                        {Object.entries(reportData.category_sales).map(([cat, amount]) => (
                                            <div key={cat} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                                <span>{cat}</span>
                                                <span className="font-medium">${amount}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-semibold mb-3">{t('transaction.topSellingProducts')}</h4>
                                    <div className="space-y-2">
                                        {Object.entries(reportData.top_products).map(([prod, qty]) => (
                                            <div key={prod} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                                <span>{prod}</span>
                                                <span className="font-medium">{qty} {t('transaction.sold')}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Clock className="w-6 h-6" />
                    {t('transaction.title')}
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowReportModal(true)}
                        className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                    >
                        <FileText className="w-4 h-4" />
                        {t('transaction.monthlyReport')}
                    </button>
                    {transactions.length > 0 && (
                        <button
                            onClick={handleClearHistory}
                            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                        >
                            <Trash2 className="w-4 h-4" />
                            {t('transaction.clearHistory')}
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                {transactions.length === 0 ? (
                    <div className="text-center text-gray-500 py-8 bg-white rounded-lg shadow">
                        {t('transaction.noOrders')}
                    </div>
                ) : (
                    transactions.map(tx => (
                        <div key={tx.id} className="bg-white rounded-lg shadow overflow-hidden">
                            <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                                <div>
                                    <div className="text-sm text-gray-500">
                                        {t('transaction.order')} #{tx.id.slice(0, 8)}...
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        {new Date(tx.created_at).toLocaleString()}
                                    </div>
                                    <div className="mt-1 flex gap-2">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${tx.order_type === 'DINE_IN' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {tx.order_type === 'DINE_IN' ? t('transaction.dineIn') : t('transaction.takeOut')}
                                        </span>
                                        {tx.table_number && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                {t('transaction.table')} {tx.table_number}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-green-600">
                                        ${tx.total_amount}
                                    </div>
                                    <div className="text-xs text-gray-500 uppercase">
                                        {tx.payment_method}
                                    </div>
                                </div>
                            </div>
                            <div className="px-6 py-4">
                                <div className="space-y-2">
                                    {tx.items && tx.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2">
                                                <ShoppingBag className="w-4 h-4 text-gray-400" />
                                                <span className="font-medium">{item.product_name || `Product #${item.product_id}`}</span>
                                                <span className="text-gray-500">x{item.quantity}</span>
                                            </div>
                                            <div className="text-gray-600">
                                                ${item.subtotal}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
