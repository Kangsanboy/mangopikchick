import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PurchaseData, ProductMaster, TABLE_NAMES } from "@/types/database";
import { CalendarDays, Plus, Loader2, ShoppingCart } from "lucide-react";

const Pembelian = () => {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [productType, setProductType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [weight, setWeight] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  
  // Data
  const [purchases, setPurchases] = useState<PurchaseData[]>([]);
  const [products, setProducts] = useState<ProductMaster[]>([]);

  // Load data from Supabase
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load purchases
      const { data: purchasesData, error: purchasesError } = await supabase
        .from(TABLE_NAMES.PURCHASES)
        .select('*')
        .order('date', { ascending: false });
      
      if (purchasesError) throw purchasesError;
      
      // Load products
      const { data: productsData, error: productsError } = await supabase
        .from(TABLE_NAMES.PRODUCT_MASTER)
        .select('*')
        .eq('is_active', true)
        .order('product_name', { ascending: true });
      
      if (productsError) throw productsError;
      
      setPurchases(purchasesData || []);
      setProducts(productsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data",
        variant: "destructive",
      });
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

  // Add purchase
  const addPurchase = async () => {
    if (!productType || !quantity || !weight || !pricePerKg) {
      toast({
        title: "Error",
        description: "Mohon lengkapi semua field pembelian",
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
        .from(TABLE_NAMES.PURCHASES)
        .insert({
          product_type: productType,
          quantity: quantityNum,
          weight: weightNum,
          price_per_kg: pricePerKgNum,
          total_price: totalPrice,
          date: selectedDate,
        });

      if (error) throw error;

      // Reset form
      setProductType("");
      setQuantity("");
      setWeight("");
      setPricePerKg("");

      // Refresh data
      await loadData();

      toast({
        title: "Berhasil",
        description: "Data pembelian berhasil ditambahkan",
      });
    } catch (error) {
      console.error('Error adding purchase:', error);
      toast({
        title: "Error",
        description: "Gagal menambahkan data pembelian",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Filter purchases for selected date
  const todayPurchases = purchases.filter(p => p.date === selectedDate);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pembelian</h1>
            <p className="text-gray-600 mt-1">Kelola data pembelian produk</p>
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

        {/* Purchase Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-green-700">Input Pembelian</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                      Belum ada produk di data master
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
                placeholder="Jumlah ekor"
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
              <div className="p-2 bg-green-50 rounded">
                <p className="text-sm text-green-700">
                  Total Harga: {formatCurrency(parseFloat(weight) * parseFloat(pricePerKg))}
                </p>
              </div>
            )}

            <Button onClick={addPurchase} className="w-full" disabled={loading || products.length === 0}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Tambah Pembelian
            </Button>

            {products.length === 0 && (
              <p className="text-sm text-amber-600 text-center">
                Silakan tambahkan produk di menu Data Master terlebih dahulu
              </p>
            )}
          </CardContent>
        </Card>

        {/* Purchase List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Pembelian Tanggal {new Date(selectedDate).toLocaleDateString('id-ID')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayPurchases.length > 0 ? (
              <div className="space-y-3">
                {todayPurchases.map((purchase) => (
                  <div key={purchase.id} className="p-4 bg-green-50 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Jenis Produk</p>
                        <p className="font-medium">{purchase.product_type || 'Ayam Utuh'}</p>
                      </div>
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
                        <p className="font-medium">{formatCurrency(purchase.price_per_kg)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Harga</p>
                        <p className="font-medium text-green-600">{formatCurrency(purchase.total_price)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <Separator />
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Total Transaksi</p>
                    <p className="font-medium">{todayPurchases.length}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Ekor</p>
                    <p className="font-medium">{todayPurchases.reduce((sum, p) => sum + p.quantity, 0)} ekor</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Berat</p>
                    <p className="font-medium">{todayPurchases.reduce((sum, p) => sum + p.weight, 0).toFixed(1)} Kg</p>
                  </div>
                  <div></div>
                  <div>
                    <p className="text-gray-600">Total Harga</p>
                    <p className="font-medium text-green-600">{formatCurrency(todayPurchases.reduce((sum, p) => sum + p.total_price, 0))}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Belum ada data pembelian untuk tanggal ini</p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Pembelian;