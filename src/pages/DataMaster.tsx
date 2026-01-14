import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SaleData, ProductMaster, TABLE_NAMES } from "@/types/database";
import { CalendarDays, Plus, Loader2, DollarSign } from "lucide-react";

// Definisikan type lokal jika belum ada
interface CustomerMaster {
  id: string;
  customer_name: string;
  default_quantity: number;
}

const Penjualan = () => {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [customerName, setCustomerName] = useState("");
  const [productType, setProductType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [weight, setWeight] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  
  // Data
  const [sales, setSales] = useState<SaleData[]>([]);
  const [products, setProducts] = useState<ProductMaster[]>([]);
  const [masterCustomers, setMasterCustomers] = useState<CustomerMaster[]>([]); // Ganti dari availableCustomers

  // Load data from Supabase
  useEffect(() => {
    loadData();
  }, []); // Load sekali saat mount

  // Load sales jika tanggal berubah
  useEffect(() => {
    loadSalesForDate();
  }, [selectedDate]);

  const loadData = async () => {
    try {
      // 1. Load Products
      const { data: productsData } = await supabase
        .from(TABLE_NAMES.PRODUCT_MASTER)
        .select('*')
        .eq('is_active', true)
        .order('product_name', { ascending: true });
      
      // 2. Load Customer Master (NEW SOURCE)
      const { data: customersData } = await supabase
        .from('customer_master') // Pastikan nama tabel sesuai
        .select('*')
        .eq('is_active', true)
        .order('customer_name', { ascending: true });

      setProducts(productsData || []);
      setMasterCustomers(customersData || []);
      
    } catch (error) {
      console.error('Error loading master data:', error);
    }
  };

  const loadSalesForDate = async () => {
    const { data: salesData, error } = await supabase
        .from(TABLE_NAMES.SALES)
        .select('*')
        .order('created_at', { ascending: false }); // Load semua atau filter by date di query kalau mau lebih cepat

    if (!error && salesData) {
        setSales(salesData);
    }
  };

  // Handle product selection
  const handleProductChange = (productName: string) => {
    setProductType(productName);
    const selectedProduct = products.find(p => p.product_name === productName);
    if (selectedProduct) {
      setPricePerKg(selectedProduct.price_per_kg.toString());
    }
  };

  // Handle Customer Selection (Auto-fill Quantity)
  const handleCustomerChange = (name: string) => {
    setCustomerName(name);
    const customer = masterCustomers.find(c => c.customer_name === name);
    if (customer && customer.default_quantity) {
      setQuantity(customer.default_quantity.toString());
    }
  };

  // Add sale
  const addSale = async () => {
    if (!customerName || !productType || !quantity || !weight || !pricePerKg) {
      toast({
        title: "Error",
        description: "Mohon lengkapi semua field penjualan",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const quantityNum = parseInt(quantity);
      const weightNum = parseFloat(weight);
      const pricePerKgNum = parseFloat(pricePerKg);
      const totalPrice = Math.round(weightNum * pricePerKgNum);

      const { error } = await supabase
        .from(TABLE_NAMES.SALES)
        .insert({
          customer_name: customerName,
          product_type: productType,
          quantity: quantityNum,
          weight: weightNum,
          price_per_kg: pricePerKgNum,
          total_price: totalPrice,
          date: selectedDate,
        });

      if (error) throw error;

      // Reset form (kecuali tanggal)
      setCustomerName("");
      setProductType("");
      setQuantity("");
      setWeight("");
      setPricePerKg("");

      // Refresh Sales Data
      await loadSalesForDate();

      toast({
        title: "Berhasil",
        description: "Data penjualan berhasil ditambahkan",
      });
    } catch (error) {
      console.error('Error adding sale:', error);
      toast({
        title: "Error",
        description: "Gagal menambahkan data penjualan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Filter sales for selected date
  const todaySales = sales.filter(s => s.date === selectedDate);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Penjualan</h1>
            <p className="text-gray-600 mt-1">Kelola data penjualan produk</p>
          </div>
        </div>

        {/* Date Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Pilih Tanggal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Label htmlFor="date">Tanggal:</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
              <p className="text-sm text-gray-600">
                Data akan disimpan untuk tanggal: {new Date(selectedDate).toLocaleDateString('id-ID')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sale Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-purple-700">Input Penjualan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="customer-name">Nama Pelanggan</Label>
              <Select value={customerName} onValueChange={handleCustomerChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih pelanggan dari Data Master" />
                </SelectTrigger>
                <SelectContent>
                  {masterCustomers.length > 0 ? (
                    masterCustomers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.customer_name}>
                        {customer.customer_name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      Belum ada pelanggan di Data Master
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="product-type">Jenis Produk</Label>
              <Select value={productType} onValueChange={handleProductChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis produk" />
                </SelectTrigger>
                <SelectContent>
                  {products.length > 0 ? (
                    products.map((product) => (
                      <SelectItem key={product.id} value={product.product_name}>
                        {product.product_name} - {formatCurrency(product.price_per_kg)}/Kg
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      Belum ada produk di Data Master
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="quantity">Jumlah Ekor</Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Jumlah ekor (Otomatis dari Master)"
                min="1"
              />
            </div>

            <div>
              <Label htmlFor="weight">Jumlah Berat Ekor (Kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Berat dalam Kg"
                min="0.1"
              />
            </div>

            <div>
              <Label htmlFor="price-per-kg">Harga per Kg</Label>
              <Input
                id="price-per-kg"
                type="number"
                value={pricePerKg}
                onChange={(e) => setPricePerKg(e.target.value)}
                placeholder="Harga per Kg"
                min="1"
              />
            </div>

            {weight && pricePerKg && (
              <div className="p-2 bg-purple-50 rounded">
                <p className="text-sm text-purple-700">
                  Total Harga: {formatCurrency(parseFloat(weight) * parseFloat(pricePerKg))}
                </p>
              </div>
            )}

            <Button 
              onClick={addSale} 
              className="w-full" 
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Tambah Penjualan
            </Button>
          </CardContent>
        </Card>

        {/* Sale List (List Penjualan Harian) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Penjualan Tanggal {new Date(selectedDate).toLocaleDateString('id-ID')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todaySales.length > 0 ? (
              <div className="space-y-3">
                {todaySales.map((sale) => (
                  <div key={sale.id} className="p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{sale.customer_name}</h4>
                      <Badge variant="outline">{formatCurrency(sale.total_price)}</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Jenis Produk</p>
                        <p className="font-medium">{sale.product_type || 'Ayam Utuh'}</p>
                      </div>
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
                        <p className="font-medium">{formatCurrency(sale.price_per_kg)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Total Harga</p>
                        <p className="font-medium text-purple-600">{formatCurrency(sale.total_price)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <Separator />
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">
                    Total Penjualan: {formatCurrency(todaySales.reduce((sum, s) => sum + s.total_price, 0))} dari {todaySales.length} pelanggan
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Belum ada data penjualan untuk tanggal ini</p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Penjualan;
