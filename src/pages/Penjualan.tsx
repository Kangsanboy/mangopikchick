import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SaleData, TABLE_NAMES } from "@/types/database";
import { Plus, Loader2, ShoppingCart, Trash2, Save, CalendarDays } from "lucide-react";

interface CustomerMaster {
  id: string;
  customer_name: string;
  default_quantity: number;
}
interface ProductMaster {
  id: string;
  product_name: string;
  price_per_kg: number;
  category: string;
}

interface CartItem {
  tempId: number;
  productName: string;
  productType: string;
  quantity: number;
  weight: number;
  pricePerKg: number;
  totalPrice: number;
}

// Tipe data untuk Group Transaksi
interface TransactionGroup {
  id: string; // Menggunakan timestamp sebagai ID unik grup
  customer_name: string;
  date: string;
  total_price: number;
  items: SaleData[];
}

const Penjualan = () => {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [products, setProducts] = useState<ProductMaster[]>([]);
  const [masterCustomers, setMasterCustomers] = useState<CustomerMaster[]>([]);
  const [groupedSales, setGroupedSales] = useState<TransactionGroup[]>([]); // Data Grouped
  
  const [customerName, setCustomerName] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ProductMaster | null>(null);
  const [quantity, setQuantity] = useState("");
  const [weight, setWeight] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMasterData();
  }, []);

  useEffect(() => {
    loadSalesHistory();
  }, [selectedDate]);

  const loadMasterData = async () => {
    const { data: pData } = await supabase.from(TABLE_NAMES.PRODUCT_MASTER).select('*').eq('is_active', true).order('product_name');
    const { data: cData } = await supabase.from('customer_master').select('*').eq('is_active', true).order('customer_name');
    setProducts(pData || []);
    setMasterCustomers(cData || []);
  };

  // --- LOGIKA LOAD & GROUPING DATA ---
  const loadSalesHistory = async () => {
    const { data, error } = await supabase
      .from(TABLE_NAMES.SALES)
      .select('*')
      .eq('date', selectedDate)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      // Grouping Logic: Gabungkan item berdasarkan created_at (waktu input)
      const groups: { [key: string]: TransactionGroup } = {};
      
      data.forEach((item) => {
        // Key pengelompokan: NamaCustomer + WaktuInput
        const groupKey = `${item.customer_name}-${item.created_at}`;
        
        if (!groups[groupKey]) {
          groups[groupKey] = {
            id: groupKey,
            customer_name: item.customer_name,
            date: item.date,
            total_price: 0,
            items: []
          };
        }
        groups[groupKey].items.push(item);
        groups[groupKey].total_price += item.total_price;
      });

      setGroupedSales(Object.values(groups));
    }
  };

  const handleProductChange = (pName: string) => {
    const prod = products.find(p => p.product_name === pName) || null;
    setSelectedProduct(prod);
    
    if (prod) {
      setPricePerKg(prod.price_per_kg.toString());
      setQuantity("");
      setWeight("");
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
    setSelectedProduct(null); setQuantity(""); setWeight(""); setPricePerKg("");
  };

  const removeFromCart = (tempId: number) => {
    setCart(cart.filter(item => item.tempId !== tempId));
  };

  const submitTransaction = async () => {
    if (!customerName || cart.length === 0) return;
    setLoading(true);

    try {
      const timestamp = new Date().toISOString(); // Waktu yang SAMA untuk semua item
      const salesPayload = cart.map(item => ({
        date: selectedDate,
        customer_name: customerName,
        product_type: item.productName,
        quantity: item.quantity,
        weight: item.weight,
        price_per_kg: item.pricePerKg,
        total_price: item.totalPrice,
        payment_status: 'Belum Lunas',
        created_at: timestamp // Kunci grouping
      }));

      const { error } = await supabase.from(TABLE_NAMES.SALES).insert(salesPayload);
      if (error) throw error;

      toast({ title: "Sukses!", description: "Transaksi tersimpan." });
      
      setCart([]);
      setCustomerName("");
      setSelectedProduct(null);
      loadSalesHistory();

    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // --- DELETE TRANSACTION GROUP ---
  const handleDeleteGroup = async (group: TransactionGroup) => {
    if (!confirm(`Hapus seluruh transaksi ${group.customer_name} (Rp ${formatCurrency(group.total_price)})?`)) return;
    
    // Ambil semua ID dalam grup ini
    const idsToDelete = group.items.map(i => i.id);

    try {
      const { error } = await supabase.from(TABLE_NAMES.SALES).delete().in('id', idsToDelete);
      if (error) throw error;
      toast({ title: "Dihapus", description: "Seluruh item transaksi dihapus" });
      loadSalesHistory();
    } catch (error) {
      toast({ title: "Error", description: "Gagal hapus data", variant: "destructive" });
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  const grandTotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalHariIni = groupedSales.reduce((sum, g) => sum + g.total_price, 0);

  return (
    <Layout>
      <div className="space-y-6 pb-20">
        <h1 className="text-3xl font-bold text-gray-900">Penjualan (Kasir)</h1>

        {/* 1. Pilih Tanggal & Pelanggan */}
        <Card>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Tanggal Transaksi</Label>
              <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-blue-700 font-bold">Pilih Pelanggan</Label>
              <Select value={customerName} onValueChange={setCustomerName}>
                <SelectTrigger className="h-10 bg-blue-50 border-blue-200"><SelectValue placeholder="-- Cari Pelanggan --" /></SelectTrigger>
                <SelectContent>
                  {masterCustomers.map(c => <SelectItem key={c.id} value={c.customer_name}>{c.customer_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 2. Input Produk */}
        {customerName && (
          <Card className="border-t-4 border-t-purple-500 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex justify-between">
                <span>Input Barang</span>
                {selectedProduct && <Badge>{selectedProduct.category === 'utuh' ? 'Ayam Utuh' : 'Jeroan'}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Pilih Produk</Label>
                <Select value={selectedProduct?.product_name || ""} onValueChange={handleProductChange}>
                  <SelectTrigger><SelectValue placeholder="-- Pilih Produk --" /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => <SelectItem key={p.id} value={p.product_name}>{p.product_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {selectedProduct && (
                <div className="bg-purple-50 p-4 rounded-lg space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedProduct.category === 'utuh' && (
                      <div><Label>Jumlah Ekor</Label><Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="bg-white" autoFocus /></div>
                    )}
                    <div><Label>Berat (Kg/Pcs)</Label><Input type="number" step="0.01" value={weight} onChange={e => setWeight(e.target.value)} className="bg-white" /></div>
                    <div><Label>Harga Satuan</Label><Input type="number" value={pricePerKg} onChange={e => setPricePerKg(e.target.value)} className="bg-white" /></div>
                  </div>
                  <Button onClick={addToCart} className="w-full bg-purple-600 hover:bg-purple-700"><Plus className="mr-2 h-4 w-4" /> Masukkan Keranjang</Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 3. Keranjang Belanja */}
        {cart.length > 0 && (
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader><CardTitle className="flex items-center gap-2 text-green-800"><ShoppingCart className="h-5 w-5" /> Keranjang - {customerName}</CardTitle></CardHeader>
            <CardContent>
              <div className="bg-white rounded-md border shadow-sm overflow-hidden mb-4">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 font-medium">
                    <tr><th className="p-3">Produk</th><th className="p-3 text-center">Qty</th><th className="p-3 text-center">Berat</th><th className="p-3 text-right">Subtotal</th><th className="p-3 text-center">Aksi</th></tr>
                  </thead>
                  <tbody>
                    {cart.map((item) => (
                      <tr key={item.tempId} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="p-3 font-medium">{item.productName}</td>
                        <td className="p-3 text-center">{item.productType === 'utuh' ? item.quantity : '-'}</td>
                        <td className="p-3 text-center">{item.weight}</td>
                        <td className="p-3 text-right font-bold">{formatCurrency(item.totalPrice)}</td>
                        <td className="p-3 text-center"><button onClick={() => removeFromCart(item.tempId)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button size="lg" onClick={submitTransaction} disabled={loading} className="w-full bg-green-600 hover:bg-green-700 font-bold shadow-lg">
                {loading ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 h-5 w-5" />} SIMPAN TRANSAKSI ({formatCurrency(grandTotal)})
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 4. RIWAYAT (GROUPED VIEW) */}
        <Card className="border-t-4 border-t-gray-500">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><CalendarDays className="h-5 w-5" /> Riwayat {new Date(selectedDate).toLocaleDateString('id-ID')}</span>
              <Badge variant="outline" className="text-lg px-3 py-1 bg-gray-100">Total: {formatCurrency(totalHariIni)}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {groupedSales.length > 0 ? (
              groupedSales.map((group) => (
                <div key={group.id} className="border rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-gray-900">{group.customer_name}</h3>
                    <div className="text-right">
                       <span className="block font-bold text-green-700 text-lg">{formatCurrency(group.total_price)}</span>
                       <span className="text-xs text-gray-400">{new Date(group.items[0].created_at).toLocaleTimeString('id-ID')}</span>
                    </div>
                  </div>
                  
                  {/* List Item dalam 1 Transaksi */}
                  <div className="bg-gray-50 rounded p-3 text-sm space-y-2">
                    {group.items.map((item, idx) => (
                      <div key={item.id} className="flex justify-between border-b border-gray-200 last:border-0 pb-1 last:pb-0">
                         <span>
                           <span className="font-medium">{item.product_type}</span> 
                           <span className="text-gray-500 ml-1 text-xs">
                             ({item.quantity > 0 ? `${item.quantity} ekor, ` : ''}{item.weight} Kg)
                           </span>
                         </span>
                         <span className="text-gray-700">{formatCurrency(item.total_price)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex justify-end">
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      className="h-8 text-xs"
                      onClick={() => handleDeleteGroup(group)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Hapus Transaksi
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-gray-400">Belum ada transaksi hari ini.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Penjualan;
