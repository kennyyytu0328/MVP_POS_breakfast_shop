import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';

const API_URL = 'http://localhost:8787/api';

// Category color mapping
const CATEGORY_COLORS = {
    'Sandwich': { bg: 'bg-amber-300', hover: 'hover:bg-amber-200', border: 'border-amber-500', text: 'text-amber-800' },
    'Hamburger': { bg: 'bg-orange-100', hover: 'hover:bg-orange-200', border: 'border-orange-300', text: 'text-orange-800' },
    'Rice Ball': { bg: 'bg-emerald-100', hover: 'hover:bg-emerald-200', border: 'border-emerald-300', text: 'text-emerald-800' },
    'Toast': { bg: 'bg-yellow-100', hover: 'hover:bg-yellow-200', border: 'border-yellow-300', text: 'text-yellow-800' },
    'Omelet': { bg: 'bg-rose-100', hover: 'hover:bg-rose-200', border: 'border-rose-300', text: 'text-rose-800' },
    'Beverage': { bg: 'bg-sky-100', hover: 'hover:bg-sky-200', border: 'border-sky-300', text: 'text-sky-800' },
    'Side': { bg: 'bg-purple-100', hover: 'hover:bg-purple-200', border: 'border-purple-300', text: 'text-purple-800' },
    'default': { bg: 'bg-gray-100', hover: 'hover:bg-gray-200', border: 'border-gray-300', text: 'text-gray-800' }
};

const getCategoryColor = (category) => CATEGORY_COLORS[category] || CATEGORY_COLORS['default'];

export default function PosTerminal() {
    const { t } = useTranslation();
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [receivedAmount, setReceivedAmount] = useState('');
    const [orderType, setOrderType] = useState('TAKE_OUT');
    const [tableNumber, setTableNumber] = useState('');

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await axios.get(`${API_URL}/products`);
            setProducts(res.data);
        } catch (error) {
            console.error("Failed to fetch products", error);
            setProducts([
                { id: 1, name: 'Ham Sandwich', price: 50, category: 'Sandwich' },
                { id: 2, name: 'Coffee', price: 30, category: 'Beverage' },
                { id: 3, name: 'Egg Toast', price: 40, category: 'Sandwich' },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product_id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.product_id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { product_id: product.id, name: product.name, price: product.price, quantity: 1 }];
        });
    };

    const updateQuantity = (productId, delta) => {
        setCart(prev => prev.map(item => {
            if (item.product_id === productId) {
                const newQty = Math.max(0, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setProcessing(true);

        const payload = {
            order_type: orderType,
            payment_method: 'CASH',
            staff_name: 'Staff',
            table_number: orderType === 'DINE_IN' ? parseInt(tableNumber) : null,
            items: cart.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity,
                modifiers: ''
            }))
        };

        try {
            await axios.post(`${API_URL}/transactions`, payload);
            alert(t('pos.orderSuccess'));
            setCart([]);
            setReceivedAmount('');
            setTableNumber('');
            setOrderType('TAKE_OUT');
        } catch (error) {
            console.error("Checkout failed", error);
            alert(t('pos.checkoutFailed') + (error.response?.data?.detail || error.message));
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div className="p-8 text-center">{t('pos.loading')}</div>;

    return (
        <div className="flex h-[calc(100vh-100px)] gap-4">
            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold mb-4">{t('pos.menu')}</h2>
                <div className="space-y-8">
                    {Object.entries(products.reduce((acc, product) => {
                        const cat = product.category || 'Other';
                        if (!acc[cat]) acc[cat] = [];
                        acc[cat].push(product);
                        return acc;
                    }, {})).map(([category, items]) => {
                        const headerColors = getCategoryColor(category);
                        return (
                        <div key={category}>
                            <h3 className={`text-lg font-bold mb-3 border-b-2 pb-2 ${headerColors.text} ${headerColors.border}`}>{t(`pos.category.${category}`) || category}</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {items.map(product => {
                                    const colors = getCategoryColor(product.category);
                                    return (
                                        <button
                                            key={product.id}
                                            onClick={() => addToCart(product)}
                                            className={`p-4 border-2 rounded-lg ${colors.bg} ${colors.hover} ${colors.border} transition-colors flex flex-col items-start shadow-sm`}
                                        >
                                            <span className={`font-medium text-lg ${colors.text}`}>{product.name}</span>
                                            <span className="text-gray-600 font-semibold">${product.price}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );})}
                </div>
            </div>

            {/* Cart Sidebar */}
            <div className="w-96 bg-white rounded-lg shadow flex flex-col">
                <div className="p-4 border-b space-y-3">
                    <h2 className="text-lg font-semibold">{t('pos.currentOrder')}</h2>

                    {/* Order Type Selector */}
                    <div className="flex rounded-md shadow-sm" role="group">
                        <button
                            type="button"
                            onClick={() => setOrderType('TAKE_OUT')}
                            className={`flex-1 px-4 py-2 text-sm font-medium border rounded-l-lg ${orderType === 'TAKE_OUT'
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            {t('pos.takeOut')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setOrderType('DINE_IN')}
                            className={`flex-1 px-4 py-2 text-sm font-medium border rounded-r-lg ${orderType === 'DINE_IN'
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            {t('pos.dineIn')}
                        </button>
                    </div>

                    {/* Table Number Input (Only for Dine In) */}
                    {orderType === 'DINE_IN' && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">{t('pos.tableNo')}</label>
                            <input
                                type="number"
                                value={tableNumber}
                                onChange={(e) => setTableNumber(e.target.value)}
                                className="flex-1 p-2 border rounded-md text-sm"
                                placeholder={t('pos.enterTableNumber')}
                                required
                            />
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {cart.length === 0 ? (
                        <div className="text-gray-400 text-center py-8">{t('pos.cartEmpty')}</div>
                    ) : (
                        cart.map(item => (
                            <div key={item.product_id} className="flex justify-between items-center">
                                <div>
                                    <div className="font-medium">{item.name}</div>
                                    <div className="text-sm text-gray-500">${item.price} x {item.quantity}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => updateQuantity(item.product_id, -1)} className="p-1 hover:bg-gray-100 rounded">
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="w-6 text-center">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.product_id, 1)} className="p-1 hover:bg-gray-100 rounded">
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t bg-gray-50">
                    <div className="flex justify-between text-xl font-bold mb-4">
                        <span>{t('pos.total')}</span>
                        <span>${totalAmount}</span>
                    </div>

                    <div className="space-y-3 mb-4 border-t pt-4">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">{t('pos.received')}</span>
                            <input
                                type="number"
                                value={receivedAmount}
                                onChange={(e) => setReceivedAmount(e.target.value)}
                                className="w-32 p-2 border rounded text-right text-lg"
                                placeholder={t('pos.amount')}
                            />
                        </div>
                        <div className="flex justify-between items-center text-xl font-bold text-green-600">
                            <span>{t('pos.change')}</span>
                            <span>${receivedAmount ? Math.max(0, parseFloat(receivedAmount) - totalAmount) : 0}</span>
                        </div>
                    </div>
                    <button
                        onClick={handleCheckout}
                        disabled={cart.length === 0 || processing}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {processing ? t('pos.processing') : t('pos.checkout')}
                    </button>
                </div>
            </div>
        </div>
    );
}
