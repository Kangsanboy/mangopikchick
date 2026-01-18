import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { PreorderData, PurchaseData, SaleData, TABLE_NAMES } from "@/types/database";
import { 
  TrendingUp, Users, ShoppingCart, Package, Loader2, 
  Wallet, Activity, DollarSign, ArrowUpRight 
} from "lucide-react";

// 1. FUNGSI KHUSUS: Ambil Tanggal WIB (Asia/Jakarta)
// Supaya jam 00:01 sudah ganti tanggal, gak nunggu jam 7 pagi (UTC).
const getTodayWIB = () => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }); // Format: YYYY-MM-DD
};

const Index = () => {
  // State Data
  const [preorders, setPreorders] = useState<PreorderData[]>([]);
  const [purchases, setPurchases] = useState<PurchaseData[]>([]);
  const [sales, setSales] = useState<SaleData[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);

  // State Tanggal (Default pakai WIB)
  const [currentDate, setCurrentDate] = useState(getTodayWIB());

  // 2. AUTO REFRESH: Cek setiap 1 menit
  useEffect(() => {
    const interval = setInterval(() => {
      const cekHari = getTodayWIB();
      // Kalau tanggal di sistem berubah (misal dari tgl 19 ke 20), refresh halaman otomatis
      if (cekHari !== currentDate) {
        window.location.reload(); 
      }
    }, 60000); // 60.000 ms = 1 menit

    return () => clearInterval(interval);
  }, [currentDate]);

  // 3. LOAD DATA DATABASE
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Ambil semua data (diurutkan tanggal terbaru)
        const { data: preordersData } = await supabase.from(TABLE_NAMES.PREORDERS).select('*').order('date', { ascending: false });
        const { data: purchasesData } = await supabase.from(TABLE_NAMES.PURCHASES).select('*').order('date', { ascending: false });
        const { data: salesData } = await supabase.from(TABLE_NAMES.SALES).select('*').order('date', { ascending: false });
        const { data: expensesData } = await supabase.from('operational_expenses').select('*').order('date', { ascending: false });
        
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

  // 4. FILTER DATA HARI INI (Pakai Variable currentDate / WIB)
  const todayPreorders = preorders.filter(item => item.date === currentDate);
  const todayPurchases = purchases.filter(item => item.date === currentDate);
  const todaySales = sales.filter(item => item.date === currentDate);
  const todayExpenses = expenses.filter(item => item.date === currentDate);

  // 5. HITUNG-HITUNGAN TOTAL
  const totalPreorderQty = todayPreorders.reduce((sum, item) => sum + item.quantity, 0);
  
  const totalPurchaseQty = todayPurchases.reduce((sum, item) => sum + item.quantity, 0);
  const totalPurchaseWeight = todayPurchases.reduce((sum, item) => sum + item.weight, 0);
  const totalPurchasePrice = todayPurchases.reduce((sum, item) => sum + item.total_price, 0); // Modal Pembelian
  
  const totalSalesQty = todaySales.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalSalesPrice = todaySales.reduce((sum, item) => sum + item.total_price, 0); // Omzet Penjualan

  const totalOperational = todayExpenses.reduce((sum, item) => sum + item.amount, 0); // Biaya Operasional

  // Logic Keuntungan
  const grossProfit = totalSalesPrice - totalPurchasePrice; // Gaji Kotor (Omzet - Modal Ayam)
  const netProfit = grossProfit - totalOperational; // Gaji Bersih (Kotor - Operasional)
  
  // Logic Stok
  const isStockPositive = (totalPurchaseQty - totalSalesQty) >= 0;
  const stockDiff = Math.abs(totalPurchaseQty - totalSalesQty);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Monitoring hari ini - {new Date(currentDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          {loading && <div className="flex items-center gap-2 text-gray-600"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">Memuat data...</span></div>}
        </div>

        {/* --- ROW 1: KARTU UTAMA --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-blue-50 border-blue-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Preorder Masuk</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">{totalPreorderQty} Ekor</div>
              <p className="text-xs text-blue-600 mt-1">{todayPreorders.length} pelanggan</p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Pembelian (Stok)</CardTitle>
              <ShoppingCart className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">{totalPurchaseQty} Ekor</div>
              <p className="text-xs text-green-600 mt-1">{totalPurchaseWeight.toFixed(1)} Kg</p>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700">Penjualan</CardTitle>
              <Package className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">{totalSalesQty} Ekor</div>
              <p className="text-xs text-purple-600 mt-1">{formatCurrency(totalSalesPrice)}</p>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-700">Biaya Operasional</CardTitle>
              <Wallet className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900">{formatCurrency(totalOperational)}</div>
              <p className="text-xs text-orange-600 mt-1">Total Pengeluaran Hari Ini</p>
            </CardContent>
          </Card>
        </div>

        {/* --- ROW 2: ANALISIS PROFIT --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className={`bg-gradient-to-br ${isStockPositive ? 'from-gray-50 to-gray-100 border-gray-200' : 'from-red-50 to-red-100 border-red-200'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-sm font-medium ${isStockPositive ? 'text-gray-700' : 'text-red-700'}`}>Selisih Stok</CardTitle>
              <Package className={`h-4 w-4 ${isStockPositive ? 'text-gray-600' : 'text-red-600'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${isStockPositive ? 'text-gray-900' : 'text-red-900'}`}>{stockDiff} Ekor</div>
              <Badge variant={isStockPositive ? "secondary" : "destructive"} className="mt-1">{isStockPositive ? "Sisa Stok" : "Kurang Stok / Input Salah"}</Badge>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-emerald-700">Gaji Kotor</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-900">{formatCurrency(grossProfit)}</div>
              <p className="text-xs text-gray-500 mt-1">Penjualan - Modal Ayam</p>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${netProfit >= 0 ? 'from-blue-50 to-blue-100 border-blue-200' : 'from-red-50 to-red-100 border-red-200'} shadow-md`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-sm font-bold ${netProfit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>Gaji Bersih (Real)</CardTitle>
              <Activity className={`h-4 w-4 ${netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-900' : 'text-red-900'}`}>{formatCurrency(netProfit)}</div>
              <p className="text-xs text-gray-500 mt-1">Gaji Kotor - Operasional</p>
            </CardContent>
          </Card>
        </div>

        {/* --- ROW 3: DETAIL TABEL MONITORING --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* TABEL PREORDER */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Users className="h-4 w-4"/> Data Preorder Hari Ini</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {todayPreorders.length > 0 ? todayPreorders.map(p => (
                <div key={p.id} className="flex justify-between p-2 bg-gray-50 rounded text-sm">
                  <span className="font-medium">{p.customer_name}</span><span>{p.quantity} ekor</span>
                </div>
              )) : <p className="text-gray-400 text-sm text-center py-2">Tidak ada preorder</p>}
            </CardContent>
          </Card>

          {/* TABEL PEMBELIAN */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><ShoppingCart className="h-4 w-4"/> Data Pembelian Hari Ini</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {todayPurchases.length > 0 ? todayPurchases.map(p => (
                <div key={p.id} className="flex justify-between p-2 bg-gray-50 rounded text-sm">
                  <span>{p.product_type}</span><span>{p.quantity} ekor / {p.weight} kg</span>
                </div>
              )) : <p className="text-gray-400 text-sm text-center py-2">Tidak ada pembelian</p>}
            </CardContent>
          </Card>

          {/* TABEL PENJUALAN */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><DollarSign className="h-4 w-4"/> Data Penjualan Hari Ini</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {todaySales.length > 0 ? todaySales.map(s => (
                <div key={s.id} className="flex justify-between p-2 bg-gray-50 rounded text-sm">
                  <span className="font-medium">{s.customer_name}</span>
                  <span className="text-green-600 font-bold">{formatCurrency(s.total_price)}</span>
                </div>
              )) : <p className="text-gray-400 text-sm text-center py-2">Tidak ada penjualan</p>}
            </CardContent>
          </Card>

          {/* TABEL OPERASIONAL */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-sm text-orange-700"><Wallet className="h-4 w-4"/> Data Operasional Hari Ini</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {todayExpenses.length > 0 ? todayExpenses.map(e => (
                <div key={e.id} className="flex justify-between p-2 bg-orange-50 rounded text-sm border border-orange-100">
                  <span className="font-medium text-orange-900">{e.category_name} <span className="text-xs text-gray-500">({e.note})</span></span>
                  <span className="text-orange-700 font-bold">{formatCurrency(e.amount)}</span>
                </div>
              )) : <p className="text-gray-400 text-sm text-center py-2">Tidak ada pengeluaran</p>}
            </CardContent>
          </Card>

        </div>
      </div>
    </Layout>
  );
};

export default Index;
