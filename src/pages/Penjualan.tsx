import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TABLE_NAMES } from "@/types/database";
import { Plus, Loader2, ShoppingCart, Trash2, Save } from "lucide-react";

interface CustomerMaster {
  id: string;
  customer_name: string;
  default_quantity: number;
}
interface ProductMaster {
  id: string;
  product_name: string;
  price_per_kg: number;
  category: string; // 'utuh' or 'jeroan'
}

// Tipe data untuk item di keranjang
interface CartItem {
  tempId: number;
  productName: string;
  productType: string; // utuh / jeroan
  quantity: number;
  weight: number;
  pricePerKg: number;
  totalPrice: number;
}

const Penjualan = () => {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Data Master
  const [products, setProducts] = useState<ProductMaster[]>([]);
  const [masterCustomers, setMasterCustomers] = useState<CustomerMaster[]>([]);
  
  // Form State
  const [customerName, setCustomerName] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ProductMaster | null>(null);
  
  // Input Values
  const [quantity, setQuantity] = useState(""); // Ekor
  const [weight, setWeight] = useState("");     // Kg atau Pcs
  const [pricePerKg, setPricePerKg] = useState("");

  // Cart State (Keranjang)
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    const { data: pData } = await supabase.from(TABLE_NAMES.PRODUCT_MASTER).select('*').eq('is_active', true).order('product_name');
    const { data: cData } = await supabase.from('customer_master').select('*').eq('is_active', true).order('customer_name');
    setProducts(pData || []);
    setMasterCustomers(cData || []);
  };

  const handleCustomerChange = (name: string) => {
    setCustomerName(name);
  };

  const handleProductChange = (pName: string) => {
    const prod = products.find(p => p.product_name === pName) || null;
    setSelectedProduct(prod);
    
    if (prod) {
      setPricePerKg(prod.price_per_kg.toString());
      setQuantity("");
      setWeight("");
      
      // Auto fill quantity HANYA jika kategori 'utuh' (jeroan tidak perlu ekor)
      if (prod.category === 'utuh' && customerName) {
        const cust = masterCustomers.find(c => c.customer_name === customerName);
        if (cust && cust.default_quantity) setQuantity(cust.default_quantity.toString());
      }
    }
  };

  const addToCart = () => {
    if (!selectedProduct) return;
    
    const qtyNum = quantity ? parseInt(quantity) : 0;
    const weightNum = weight ? parseFloat(weight) : 0;
    const priceNum = pricePerKg ? parseFloat(pricePerKg) : 0;
    
    if (!weightNum && !qtyNum) {
      toast({ title: "Gagal", description: "Masukkan Berat atau Jumlah", variant: "destructive" });
      return;
    }

    const total = Math.round(weightNum * priceNum); 

    const newItem: CartItem = {
      tempId: Date.now(),
      productName: selectedProduct.product_name,
      productType: selectedProduct.category || 'utuh',
      quantity: qtyNum,
      weight: weightNum,
      pricePerKg: priceNum,
      totalPrice: total
    };

    setCart([...cart, newItem]);
    
    // Reset Input Produk
    setSelectedProduct(null);
    setQuantity("");
    setWeight("");
    setPricePerKg("");
  };

  const removeFromCart = (tempId: number) => {
    setCart(cart.filter(item => item.tempId !== tempId));
  };

  const submitTransaction = async () => {
    if (!customerName || cart.length === 0) return;
    setLoading(true);

    try {
      const salesPayload = cart.map(item => ({
        date: selectedDate,
        customer_name: customerName,
        product_type: item.productName,
        quantity: item.quantity,
        weight: item.weight,
        price_per_kg: item.pricePerKg,
        total_price: item.totalPrice,
        payment_status: 'Belum Lunas',
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase.from(TABLE_NAMES.SALES).insert(salesPayload);
      if (error) throw error;

      toast({ title: "Sukses!", description: `${cart.length} item berhasil disimpan.` });
      
      setCart([]);
      setCustomerName("");
      setSelectedProduct(null);
    } catch (error) {
      toast({ title: "Error", description: "Gagal menyimpan transaksi", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  const grandTotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Penjualan (Kasir)</h1>

        <Card>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Tanggal Transaksi</Label>
              <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-blue-700 font-bold">Pilih Pelanggan</Label>
              <Select value={customerName} onValueChange={handleCustomerChange}>
                <SelectTrigger className="h-10 bg-blue-50 border-blue-200">
                  <SelectValue placeholder="-- Cari Pelanggan --" />
                </SelectTrigger>
                <SelectContent>
                  {masterCustomers.map(c => (
                    <SelectItem key={c.id} value={c.customer_name}>{c.customer_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {customerName && (
          <Card className="border-t-4 border-t-purple-500 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex justify-between">
                <span>Input Barang Belanjaan</span>
                {/* Badge Kategori tetap ada di sini biar kasir tau ini jenis apa, tapi di dropdown pilihan sudah bersih */}
                {selectedProduct && (
                  <Badge variant={selectedProduct.category === 'utuh' ? 'default' : 'secondary'}>
                    {selectedProduct.category === 'utuh' ? 'Ayam Utuh' : 'Jeroan / Parts'}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Pilih Produk</Label>
                <Select value={selectedProduct?.product_name || ""} onValueChange={handleProductChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="-- Pilih Produk --" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.product_name}>
                        {p.product_name} 
                        {/* Saya hapus bagian ({p.category}) disini sesuai request */}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProduct && (
                <div className="bg-purple-50 p-4 rounded-lg space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* INPUT JUMLAH EKOR (Hanya muncul jika kategori 'utuh') */}
                    {selectedProduct.category === 'utuh' && (
                      <div>
                        <Label>Jumlah Ekor</Label>
                        <Input 
                          type="number" 
                          placeholder="Ekor" 
                          value={quantity} 
                          onChange={e => setQuantity(e.target.value)} 
                          className="bg-white"
                          autoFocus
                        />
                      </div>
                    )}

                    <div>
                      <Label>{selectedProduct.category === 'jeroan' ? "Berat (Kg/Pcs)" : "Berat Total (Kg)"}</Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder={selectedProduct.category === 'jeroan' ? "Kg atau Pcs" : "Kg"}
                        value={weight} 
                        onChange={e => setWeight(e.target.value)}
                        className="bg-white" 
                      />
                    </div>

                    <div>
                      <Label>Harga per Satuan</Label>
                      <Input 
                        type="number" 
                        value={pricePerKg} 
                        onChange={e => setPricePerKg(e.target.value)}
                        className="bg-white" 
                      />
                    </div>
                  </div>

                  <Button onClick={addToCart} className="w-full bg-purple-600 hover:bg-purple-700">
                    <Plus className="mr-2 h-4 w-4" /> Masukkan Keranjang
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {cart.length > 0 && (
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <ShoppingCart className="h-5 w-5" /> Keranjang Belanja - {customerName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white rounded-md border shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-700 font-medium">
                    <tr>
                      <th className="p-3">Produk</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-center">Berat</th>
                      <th className="p-3 text-right">Harga</th>
                      <th className="p-3 text-right">Subtotal</th>
                      <th className="p-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item) => (
                      <tr key={item.tempId} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="p-3 font-medium">{item.productName}</td>
                        <td className="p-3 text-center">{item.productType === 'utuh' ? `${item.quantity} ekor` : '-'}</td>
                        <td className="p-3 text-center">{item.weight}</td>
                        <td className="p-3 text-right">{formatCurrency(item.pricePerKg)}</td>
                        <td className="p-3 text-right font-bold">{formatCurrency(item.totalPrice)}</td>
                        <td className="p-3 text-center">
                          <button onClick={() => removeFromCart(item.tempId)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-green-100 text-green-900 font-bold">
                    <tr>
                      <td colSpan={4} className="p-3 text-right">TOTAL TRANSAKSI:</td>
                      <td className="p-3 text-right text-lg">{formatCurrency(grandTotal)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="mt-6 flex justify-end">
                <Button 
                  size="lg" 
                  onClick={submitTransaction} 
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 font-bold shadow-lg"
                >
                  {loading ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 h-5 w-5" />}
                  SIMPAN TRANSAKSI
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Penjualan;
