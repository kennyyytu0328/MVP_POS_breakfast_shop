
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import PosTerminal from './components/POS/PosTerminal';
import InventoryDashboard from './components/Inventory/InventoryDashboard';
import ProductManagement from './components/Product/ProductManagement';
import TransactionHistory from './components/Transactions/TransactionHistory';
import { LayoutGrid, ShoppingCart, Settings, History } from 'lucide-react';
import { LanguageProvider, useTranslation } from './i18n/LanguageContext';

function LanguageToggle() {
  const { language, setLanguage } = useTranslation();
  return (
    <button
      onClick={() => setLanguage(language === 'zh-TW' ? 'en' : 'zh-TW')}
      className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-100 text-gray-700 transition-colors"
    >
      {language === 'zh-TW' ? 'EN' : '中文'}
    </button>
  );
}

function AppContent() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">🥞{t('nav.title')}</h1>
        <div className="flex items-center space-x-4">
          <Link to="/" className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
            <ShoppingCart className="w-4 h-4 mr-2" />
            {t('nav.pos')}
          </Link>
          <Link to="/transactions" className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
            <History className="w-4 h-4 mr-2" />
            {t('nav.history')}
          </Link>
          <Link to="/inventory" className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
            <LayoutGrid className="w-4 h-4 mr-2" />
            {t('nav.inventory')}
          </Link>
          <Link to="/products" className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
            <Settings className="w-4 h-4 mr-2" />
            {t('nav.products')}
          </Link>
          <LanguageToggle />
        </div>
      </nav>

      <main className="flex-1 p-4 overflow-auto">
        <Routes>
          <Route path="/" element={<PosTerminal />} />
          <Route path="/inventory" element={<InventoryDashboard />} />
          <Route path="/products" element={<ProductManagement />} />
          <Route path="/transactions" element={<TransactionHistory />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </Router>
  );
}

export default App;
