import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { PreorderData, PurchaseData, SaleData, TABLE_NAMES } from "@/types/database";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  ShoppingCart, 
  Package,
  Loader2,
  Wallet, // Icon untuk Operasional
  Activity // Icon untuk Gaji Bersih
} from "lucide-react";

const Index = () => {
  const [preorders, setPreorders] = useState<PreorderData[]>([]);
  const [purchases, setPurchases] = useState<PurchaseData[]>([]);
  const [sales, setSales] = useState<SaleData[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]); // State untuk Pengeluaran
  const [loading, setLoading] = useState(true);

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Load data from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // 1. Load preorders
        const { data: preordersData } = await supabase
          .from(TABLE_NAMES.PREORDERS)
          .select('*')
          .order('date', { ascending: false });
        
        // 2. Load purchases
        const { data: purchasesData } = await supabase
          .from(TABLE_NAMES.PURCHASES)
          .select('*')
          .order('date', { ascending: false });
        
        // 3. Load sales
        const { data: salesData } = await supabase
          .from(TABLE_NAMES.SALES)
          .select('*')
          .order('date', { ascending: false });

        // 4. Load Operational Expenses (BARU)
        const { data: expensesData } = await supabase
          .from('operational_expenses')
          .select('*')
          .eq('date', today); // Ambil yang hari ini saja
        
        setPreorders(preordersData || []);
        setPurchases(purchasesData || []);
        setSales(salesData || []);
        setExpenses(expensesData || []);

      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter today's data
  const todayPreorders = preorders.filter(item => item.date === today);
  const todayPurchases = purchases.filter(item => item.date === today);
  const todaySales = sales.filter(item => item.date === today);

  // Calculate totals
  const totalPreorderQuantity = todayPreorders.reduce((sum, item) => sum + item.quantity, 0);
  
  const totalPurchaseQuantity = todayPurchases.reduce((sum, item) => sum + item.quantity, 0);
  const totalPurchaseWeight = todayPurchases.reduce((sum, item) => sum + item.weight, 0);
  const totalPurchasePrice = todayPurchases.reduce((sum, item) => sum + item.total_price, 0); // Modal Ayam
  
  const totalSalesQuantity = todaySales.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalSalesPrice = todaySales.reduce((sum, item) => sum + item.total_price, 0); // Omzet

  const totalOperational = expenses.reduce((sum, item) => sum + item.amount, 0); // Total Biaya Operasional

  // Calculate stock difference (purchased - sold)
  const stockDifference = totalPurchaseQuantity - totalSalesQuantity;
  const isStockPositive = stockDifference >= 0;

  // --- LOGIKA PROFIT BARU ---
  // Gaji Kotor = Penjualan - Modal Beli Ayam
  const grossProfit = totalSalesPrice - totalPurchasePrice;
  
  // Gaji Bersih = Gaji Kotor - Biaya Operasional
  const netProfit = grossProfit - totalOperational;

  const isGrossProfitable = grossProfit >= 0;
  const isNetProfitable = netProfit >= 0;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Monitoring hari ini - {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Memuat data...</span>
            </div>
          )}
        </div>

        {/* --- ROW 1: STATUS HARIAN --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Preorder */}
          <Card className="bg-blue-50 border-blue-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Preorder Masuk</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">{totalPreorderQuantity} Ekor</div>
              <p className="text-xs text-blue-600 mt-1">{todayPreorders.length} pelanggan</p>
            </CardContent>
          </Card>

          {/* Pembelian */}
          <Card className="bg-green-50 border-green-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Pembelian (Stok)</CardTitle>
              <ShoppingCart className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">{totalPurchaseQuantity} Ekor</div>
              <p className="text-xs text-green-600 mt-1">{totalPurchaseWeight.toFixed(1)} Kg</p>
            </CardContent>
          </Card>

          {/* Penjualan */}
          <Card className="bg-purple-50 border-purple-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700">Penjualan Hari Ini</CardTitle>
              <Package className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">{totalSalesQuantity} Ekor</div>
              <p className="text-xs text-purple-600 mt-1">{formatCurrency(totalSalesPrice)}</p>
            </CardContent>
          </Card>

          {/* Operasional (NEW) */}
          <Card className="bg-orange-50 border-orange-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-700">Biaya Operasional</CardTitle>
              <Wallet className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900">{formatCurrency(totalOperational)}</div>
              <p className="text-xs text-orange-600 mt-1">Gaji, Rokok, Plastik, dll</p>
            </CardContent>
          </Card>
        </div>

        {/* --- ROW 2: ANALISIS KEUNTUNGAN & STOK --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Selisih Stok */}
          <Card className={`bg-gradient-to-br ${isStockPositive ? 'from-gray-50 to-gray-100 border-gray-200' : 'from-red-50 to-red-100 border-red-200'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-sm font-medium ${isStockPositive ? 'text-gray-700' : 'text-red-700'}`}>Selisih Stok</CardTitle>
              <Package className={`h-4 w-4 ${isStockPositive ? 'text-gray-600' : 'text-red-600'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${isStockPositive ? 'text-gray-900' : 'text-red-900'}`}>
                {Math.abs(stockDifference)} Ekor
              </div>
              <Badge variant={isStockPositive ? "secondary" : "destructive"} className="mt-1">
                {isStockPositive ? "Sisa Stok" : "Kurang Stok / Input Salah"}
              </Badge>
            </CardContent>
          </Card>

          {/* Card 2: Gaji Kotor (Gross Profit) */}
          <Card className={`bg-gradient-to-br ${isGrossProfitable ? 'from-emerald-50 to-emerald-100 border-emerald-200' : 'from-red-50 to-red-100 border-red-200'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-sm font-bold ${isGrossProfitable ? 'text-emerald-700' : 'text-red-700'}`}>
                Gaji Kotor
              </CardTitle>
              <TrendingUp className={`h-4 w-4 ${isGrossProfitable ? 'text-emerald-600' : 'text-red-600'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${isGrossProfitable ? 'text-emerald-900' : 'text-red-900'}`}>
                {formatCurrency(grossProfit)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Penjualan - Modal Ayam</p>
            </CardContent>
          </Card>

          {/* Card 3: Gaji Bersih (Net Profit) - PALING PENTING */}
          <Card className={`bg-gradient-to-br ${isNetProfitable ? 'from-blue-50 to-blue-100 border-blue-200' : 'from-red-50 to-red-100 border-red-200'} shadow-md`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-sm font-bold ${isNetProfitable ? 'text-blue-700' : 'text-red-700'}`}>
                Gaji Bersih (Real)
              </CardTitle>
              <Activity className={`h-4 w-4 ${isNetProfitable ? 'text-blue-600' : 'text-red-600'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${isNetProfitable ? 'text-blue-900' : 'text-red-900'}`}>
                {formatCurrency(netProfit)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Gaji Kotor - Operasional</p>
            </CardContent>
          </Card>

        </div>
      </div>
    </Layout>
  );
};

export default Index;
