import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  ShoppingCart, 
  Package,
  DollarSign
} from "lucide-react";

interface PreorderData {
  id: string;
  customerName: string;
  quantity: number;
  date: string;
}

interface PurchaseData {
  id: string;
  quantity: number;
  weight: number;
  pricePerKg: number;
  totalPrice: number;
  date: string;
}

interface SaleData {
  id: string;
  customerName: string;
  quantity: number;
  weight: number;
  pricePerKg: number;
  totalPrice: number;
  date: string;
}

const Index = () => {
  const [preorders, setPreorders] = useState<PreorderData[]>([]);
  const [purchases, setPurchases] = useState<PurchaseData[]>([]);
  const [sales, setSales] = useState<SaleData[]>([]);

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Load data from localStorage
  useEffect(() => {
    const savedPreorders = localStorage.getItem('preorders');
    const savedPurchases = localStorage.getItem('purchases');
    const savedSales = localStorage.getItem('sales');

    if (savedPreorders) setPreorders(JSON.parse(savedPreorders));
    if (savedPurchases) setPurchases(JSON.parse(savedPurchases));
    if (savedSales) setSales(JSON.parse(savedSales));
  }, []);

  // Filter today's data
  const todayPreorders = preorders.filter(item => item.date === today);
  const todayPurchases = purchases.filter(item => item.date === today);
  const todaySales = sales.filter(item => item.date === today);

  // Calculate totals
  const totalPreorderQuantity = todayPreorders.reduce((sum, item) => sum + item.quantity, 0);
  const totalPurchaseQuantity = todayPurchases.reduce((sum, item) => sum + item.quantity, 0);
  const totalPurchaseWeight = todayPurchases.reduce((sum, item) => sum + item.weight, 0);
  const totalPurchasePrice = todayPurchases.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalSalesPrice = todaySales.reduce((sum, item) => sum + item.totalPrice, 0);

  // Calculate profit/loss
  const profitLoss = totalSalesPrice - totalPurchasePrice;
  const isProfitable = profitLoss > 0;

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
            <p className="text-gray-600 mt-1">Monitoring penjualan hari ini - {new Date().toLocaleDateString('id-ID')}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Total Preorder</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">{totalPreorderQuantity} Ekor</div>
              <p className="text-xs text-blue-600 mt-1">{todayPreorders.length} pelanggan</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Pembelian Hari Ini</CardTitle>
              <ShoppingCart className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">{totalPurchaseQuantity} Ekor</div>
              <p className="text-xs text-green-600 mt-1">{totalPurchaseWeight.toFixed(1)} Kg</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700">Penjualan Hari Ini</CardTitle>
              <Package className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">{todaySales.length} Transaksi</div>
              <p className="text-xs text-purple-600 mt-1">{formatCurrency(totalSalesPrice)}</p>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${isProfitable ? 'from-green-50 to-green-100 border-green-200' : 'from-red-50 to-red-100 border-red-200'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-sm font-medium ${isProfitable ? 'text-green-700' : 'text-red-700'}`}>Profit/Loss</CardTitle>
              {isProfitable ? 
                <TrendingUp className="h-4 w-4 text-green-600" /> : 
                <TrendingDown className="h-4 w-4 text-red-600" />
              }
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${isProfitable ? 'text-green-900' : 'text-red-900'}`}>
                {formatCurrency(Math.abs(profitLoss))}
              </div>
              <Badge variant={isProfitable ? "default" : "destructive"} className="mt-1">
                {isProfitable ? "Untung" : "Rugi"}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Data Preorder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Data Preorder Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayPreorders.length > 0 ? (
              <div className="space-y-3">
                {todayPreorders.map((preorder) => (
                  <div key={preorder.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{preorder.customerName}</p>
                      <p className="text-sm text-gray-600">{preorder.quantity} ekor</p>
                    </div>
                  </div>
                ))}
                <div className="border-t pt-3 mt-3">
                  <p className="text-sm font-medium text-gray-700">
                    Total: {totalPreorderQuantity} ekor dari {todayPreorders.length} pelanggan
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Belum ada data preorder hari ini</p>
            )}
          </CardContent>
        </Card>

        {/* Data Pembelian */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Data Pembelian Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayPurchases.length > 0 ? (
              <div className="space-y-3">
                {todayPurchases.map((purchase) => (
                  <div key={purchase.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Jumlah Ekor</p>
                        <p className="font-medium">{purchase.quantity} ekor</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Berat Total</p>
                        <p className="font-medium">{purchase.weight} Kg</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Harga per Kg</p>
                        <p className="font-medium">{formatCurrency(purchase.pricePerKg)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Harga</p>
                        <p className="font-medium text-green-600">{formatCurrency(purchase.totalPrice)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="border-t pt-3 mt-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Total Ekor</p>
                      <p className="font-medium">{totalPurchaseQuantity} ekor</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total Berat</p>
                      <p className="font-medium">{totalPurchaseWeight.toFixed(1)} Kg</p>
                    </div>
                    <div></div>
                    <div>
                      <p className="text-gray-600">Total Harga</p>
                      <p className="font-medium text-green-600">{formatCurrency(totalPurchasePrice)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Belum ada data pembelian hari ini</p>
            )}
          </CardContent>
        </Card>

        {/* Data Penjualan per Pelanggan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Data Penjualan per Pelanggan Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todaySales.length > 0 ? (
              <div className="space-y-3">
                {todaySales.map((sale) => (
                  <div key={sale.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{sale.customerName}</h4>
                      <Badge variant="outline">{formatCurrency(sale.totalPrice)}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Jumlah Ekor</p>
                        <p className="font-medium">{sale.quantity} ekor</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Berat Total</p>
                        <p className="font-medium">{sale.weight} Kg</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Harga per Kg</p>
                        <p className="font-medium">{formatCurrency(sale.pricePerKg)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="border-t pt-3 mt-3">
                  <p className="text-sm font-medium text-gray-700">
                    Total Penjualan: {formatCurrency(totalSalesPrice)} dari {todaySales.length} pelanggan
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Belum ada data penjualan hari ini</p>
            )}
          </CardContent>
        </Card>

        {/* Profit/Loss Analysis */}
        <Card className={`${isProfitable ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isProfitable ? 'text-green-700' : 'text-red-700'}`}>
              {isProfitable ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              Analisis Keuntungan Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Pembelian</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(totalPurchasePrice)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Penjualan</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalSalesPrice)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">{isProfitable ? 'Keuntungan' : 'Kerugian'}</p>
                <p className={`text-2xl font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(profitLoss))}
                </p>
                <Badge variant={isProfitable ? "default" : "destructive"} className="mt-2">
                  {isProfitable ? "UNTUNG" : "RUGI"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Index;
