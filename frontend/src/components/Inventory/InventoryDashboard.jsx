import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, Plus, Trash2, Edit } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';

const API_URL = 'http://localhost:8787/api';

export default function InventoryDashboard() {
    const { t } = useTranslation();
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [newMaterial, setNewMaterial] = useState({ name: '', unit: 'pcs', safety_stock: 10, cost_price: 0, current_stock: 0 });
    const [editingMaterial, setEditingMaterial] = useState(null);

    const [error, setError] = useState('');

    useEffect(() => {
        fetchMaterials();
    }, []);

    const fetchMaterials = async () => {
        try {
            const res = await axios.get(`${API_URL}/materials`);
            setMaterials(res.data);
        } catch (error) {
            console.error("Failed to fetch materials", error);
            setMaterials([
                { id: 1, name: 'Bread', current_stock: 5, safety_stock: 10, unit: 'pcs' },
                { id: 2, name: 'Eggs', current_stock: 50, safety_stock: 20, unit: 'pcs' },
                { id: 3, name: 'Ham', current_stock: 2, safety_stock: 5, unit: 'slices' },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddMaterial = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await axios.post(`${API_URL}/materials`, {
                ...newMaterial,
                category: 'RAW_MATERIAL'
            });
            setShowAddModal(false);
            setNewMaterial({ name: '', unit: 'pcs', safety_stock: 10, cost_price: 0, current_stock: 0 });
            fetchMaterials();
        } catch (error) {
            console.error("Add material error:", error);
            setError(error.response?.data?.error || error.message);
        }
    };

    const handleEditClick = (material) => {
        setEditingMaterial({ ...material });
        setShowEditModal(true);
        setError('');
    };

    const handleUpdateMaterial = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await axios.put(`${API_URL}/materials/${editingMaterial.id}`, {
                name: editingMaterial.name,
                unit: editingMaterial.unit,
                safety_stock: editingMaterial.safety_stock,
                cost_price: editingMaterial.cost_price,
            });
            setShowEditModal(false);
            setEditingMaterial(null);
            fetchMaterials();
        } catch (error) {
            console.error("Update material error:", error);
            setError(error.response?.data?.error || error.message);
        }
    };

    const handleRestock = async (id) => {
        const qtyStr = prompt(t('inventory.restockPrompt'));
        if (!qtyStr) return;
        const qty = parseFloat(qtyStr);
        if (isNaN(qty)) return;

        try {
            await axios.post(`${API_URL}/materials/restock`, {
                material_id: id,
                quantity: qty,
                reason: 'Manual Restock'
            });
            fetchMaterials();
        } catch (error) {
            console.error("Restock failed", error);
            alert(t('inventory.restockFailed') + (error.response?.data?.error || error.message));
        }
    };

    const handleDelete = async (id) => {
        if (!confirm(t('inventory.deleteConfirm'))) return;
        try {
            await axios.delete(`${API_URL}/materials/${id}`);
            fetchMaterials();
        } catch (error) {
            console.error("Delete failed", error);
            alert(t('inventory.deleteFailed') + (error.response?.data?.error || error.message));
        }
    };

    if (loading) return <div className="p-8">{t('inventory.loading')}</div>;

    return (
        <div className="p-4 relative">
            {/* Add Material Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold mb-4">{t('inventory.addNewMaterial')}</h3>
                        {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-4">{error}</div>}
                        <form onSubmit={handleAddMaterial} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('common.name')}</label>
                                <input
                                    type="text"
                                    value={newMaterial.name}
                                    onChange={e => setNewMaterial({ ...newMaterial, name: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">{t('inventory.unit')}</label>
                                    <input
                                        type="text"
                                        value={newMaterial.unit}
                                        onChange={e => setNewMaterial({ ...newMaterial, unit: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">{t('inventory.initialStock')}</label>
                                        <input
                                            type="number"
                                            value={newMaterial.current_stock}
                                            onChange={e => setNewMaterial({ ...newMaterial, current_stock: parseFloat(e.target.value) })}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">{t('inventory.costPrice')}</label>
                                        <input
                                            type="number"
                                            value={newMaterial.cost_price}
                                            onChange={e => setNewMaterial({ ...newMaterial, cost_price: parseFloat(e.target.value) })}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">{t('inventory.safetyStock')}</label>
                                    <input
                                        type="number"
                                        value={newMaterial.safety_stock}
                                        onChange={e => setNewMaterial({ ...newMaterial, safety_stock: parseFloat(e.target.value) })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                    {t('inventory.addMaterial')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Material Modal */}
            {showEditModal && editingMaterial && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold mb-4">{t('inventory.editMaterial')}</h3>
                        {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-4">{error}</div>}
                        <form onSubmit={handleUpdateMaterial} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('common.name')}</label>
                                <input
                                    type="text"
                                    value={editingMaterial.name}
                                    onChange={e => setEditingMaterial({ ...editingMaterial, name: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">{t('inventory.unit')}</label>
                                    <input
                                        type="text"
                                        value={editingMaterial.unit}
                                        onChange={e => setEditingMaterial({ ...editingMaterial, unit: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">{t('inventory.costPrice')}</label>
                                        <input
                                            type="number"
                                            value={editingMaterial.cost_price}
                                            onChange={e => setEditingMaterial({ ...editingMaterial, cost_price: parseFloat(e.target.value) })}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">{t('inventory.safetyStock')}</label>
                                    <input
                                        type="number"
                                        value={editingMaterial.safety_stock}
                                        onChange={e => setEditingMaterial({ ...editingMaterial, safety_stock: parseFloat(e.target.value) })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    {t('inventory.saveChanges')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">{t('inventory.title')}</h2>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
                >
                    <Plus className="w-4 h-4" />
                    {t('inventory.addMaterial')}
                </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.name')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('inventory.stock')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('inventory.unit')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.status')}</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {materials.map(material => {
                            const isLow = material.current_stock <= material.safety_stock;
                            return (
                                <tr key={material.id}>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium">{material.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{material.current_stock}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{material.unit}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {isLow ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                <AlertTriangle className="w-3 h-3 mr-1" />
                                                {t('inventory.lowStock')}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                {t('inventory.ok')}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-3">
                                            <button
                                                onClick={() => handleRestock(material.id)}
                                                className="text-indigo-600 hover:text-indigo-900"
                                            >
                                                {t('inventory.restock')}
                                            </button>
                                            <button
                                                onClick={() => handleEditClick(material)}
                                                className="text-blue-600 hover:text-blue-900"
                                                title={t('inventory.editMaterial')}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(material.id)}
                                                className="text-red-600 hover:text-red-900"
                                                title={t('common.delete')}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
