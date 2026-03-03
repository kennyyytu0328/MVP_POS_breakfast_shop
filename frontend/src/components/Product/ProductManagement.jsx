import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Save, Trash2, Utensils } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';

const API_URL = 'http://localhost:8787/api';

export default function ProductManagement() {
    const { t } = useTranslation();
    const [products, setProducts] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);

    // New Product Form State
    const [newProduct, setNewProduct] = useState({ name: '', price: '', category: 'Sandwich' });

    // Recipe Editing State
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [recipeItems, setRecipeItems] = useState([]);

    // Delete Confirmation State
    const [deleteConfirmation, setDeleteConfirmation] = useState({ show: false, id: null });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [prodRes, matRes] = await Promise.all([
                axios.get(`${API_URL}/products`),
                axios.get(`${API_URL}/materials`)
            ]);
            setProducts(prodRes.data);
            setMaterials(matRes.data);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProduct = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/products`, {
                ...newProduct,
                price: parseFloat(newProduct.price),
                is_active: 1
            });
            setNewProduct({ name: '', price: '', category: 'Sandwich' });
            fetchData();
            alert(t('product.productCreated'));
        } catch (error) {
            console.error("Create product error:", error);
            alert(t('product.createFailed') + (error.response?.data?.error || error.message));
        }
    };

    const confirmDelete = (id) => {
        setDeleteConfirmation({ show: true, id });
    };

    const executeDelete = async () => {
        if (!deleteConfirmation.id) return;
        try {
            await axios.delete(`${API_URL}/products/${deleteConfirmation.id}`);
            fetchData();
            if (selectedProduct?.id === deleteConfirmation.id) {
                setSelectedProduct(null);
                setRecipeItems([]);
            }
            setDeleteConfirmation({ show: false, id: null });
        } catch (error) {
            alert(t('product.deleteFailed'));
        }
    };

    const handleSelectProduct = async (product) => {
        setSelectedProduct(product);
        try {
            const res = await axios.get(`${API_URL}/products/${product.id}/recipe`);
            if (res.data && res.data.length > 0) {
                setRecipeItems(res.data);
            } else {
                setRecipeItems([{ material_id: '', quantity_required: '' }]);
            }
        } catch (error) {
            console.error("Failed to fetch recipe", error);
            setRecipeItems([{ material_id: '', quantity_required: '' }]);
        }
    };

    const handleAddRecipeItem = () => {
        setRecipeItems([...recipeItems, { material_id: '', quantity_required: '' }]);
    };

    const handleRecipeItemChange = (index, field, value) => {
        const newItems = [...recipeItems];
        newItems[index][field] = value;
        setRecipeItems(newItems);
    };

    const handleRemoveRecipeItem = (index) => {
        setRecipeItems(recipeItems.filter((_, i) => i !== index));
    };

    const handleSaveRecipe = async () => {
        if (!selectedProduct) return;

        const items = recipeItems
            .filter(item => item.material_id && item.quantity_required)
            .map(item => ({
                material_id: parseInt(item.material_id),
                quantity_required: parseFloat(item.quantity_required)
            }));

        if (items.length === 0) {
            alert(t('product.recipeMinOne'));
            return;
        }

        try {
            await axios.post(`${API_URL}/products/${selectedProduct.id}/recipe`, { items });
            alert(t('product.recipeSaved'));
            setSelectedProduct(null);
            setRecipeItems([]);
        } catch (error) {
            alert(t('product.recipeSaveFailed'));
        }
    };

    if (loading) return <div className="p-8">{t('product.loading')}</div>;

    return (
        <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
            {/* Delete Confirmation Modal */}
            {deleteConfirmation.show && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                        <h3 className="text-lg font-bold mb-4">{t('product.confirmDeletion')}</h3>
                        <p className="text-gray-600 mb-6">{t('product.deleteConfirm')}</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteConfirmation({ show: false, id: null })}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={executeDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                                {t('common.delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Left Column: Product List & Create */}
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold mb-4">{t('product.createNew')}</h2>
                    <form onSubmit={handleCreateProduct} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">{t('common.name')}</label>
                            <input
                                type="text"
                                value={newProduct.name}
                                onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('product.price')}</label>
                                <input
                                    type="number"
                                    value={newProduct.price}
                                    onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('product.category')}</label>
                                <select
                                    value={newProduct.category}
                                    onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                >
                                    <option value="Sandwich">{t('product.categorySandwich')}</option>
                                    <option value="Hamburger">{t('product.categoryHamburger')}</option>
                                    <option value="Rice Ball">{t('product.categoryRiceBall')}</option>
                                    <option value="Toast">{t('product.categoryToast')}</option>
                                    <option value="Omelet">{t('product.categoryOmelet')}</option>
                                    <option value="Beverage">{t('product.categoryBeverage')}</option>
                                    <option value="Side">{t('product.categorySide')}</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                            {t('product.createProduct')}
                        </button>
                    </form>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold mb-4">{t('product.productList')}</h2>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {products.map(product => (
                            <div key={product.id} className="flex justify-between items-center p-3 border rounded hover:bg-gray-50">
                                <div>
                                    <div className="font-medium">{product.name}</div>
                                    <div className="text-sm text-gray-500">${product.price} - {product.category}</div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleSelectProduct(product)}
                                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                    >
                                        <Utensils className="w-4 h-4" />
                                        {t('product.editRecipe')}
                                    </button>
                                    <button
                                        onClick={() => confirmDelete(product.id)}
                                        className="text-red-600 hover:text-red-800 flex items-center gap-1"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        {t('common.delete')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Column: Recipe Editor */}
            <div className="bg-white p-6 rounded-lg shadow h-fit">
                <h2 className="text-xl font-bold mb-4">
                    {selectedProduct ? `${t('product.recipeFor')}${selectedProduct.name}` : t('product.selectProduct')}
                </h2>

                {selectedProduct ? (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            {recipeItems.map((item, index) => (
                                <div key={index} className="flex gap-2 items-end">
                                    <div className="flex-1">
                                        <label className="block text-xs text-gray-500">{t('product.material')}</label>
                                        <select
                                            value={item.material_id}
                                            onChange={e => handleRecipeItemChange(index, 'material_id', e.target.value)}
                                            className="w-full border rounded p-2"
                                        >
                                            <option value="">{t('product.selectMaterial')}</option>
                                            {materials.map(m => (
                                                <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-24">
                                        <label className="block text-xs text-gray-500">{t('product.qty')}</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={item.quantity_required}
                                            onChange={e => handleRecipeItemChange(index, 'quantity_required', e.target.value)}
                                            className="w-full border rounded p-2"
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleRemoveRecipeItem(index)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleAddRecipeItem}
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                        >
                            <Plus className="w-4 h-4" /> {t('product.addMaterial')}
                        </button>

                        <div className="pt-4 border-t flex justify-end gap-2">
                            <button
                                onClick={() => setSelectedProduct(null)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleSaveRecipe}
                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
                            >
                                <Save className="w-4 h-4" /> {t('product.saveRecipe')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-gray-400 text-center py-12">
                        <Utensils className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>{t('product.selectProductHint')}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
