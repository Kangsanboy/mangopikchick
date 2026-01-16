import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator"; // Pastikan import ini ada
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"; 
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SaleData, TABLE_NAMES } from "@/types/database";
import { Plus, Loader2, ShoppingCart, Trash2, Save, Edit, CalendarDays } from "lucide-react";

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

interface TransactionGroup {
  id: string;
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
  const [groupedSales, setGroupedSales] = useState<TransactionGroup[]>([]); 
  const [rawSales, setRawSales] = useState<SaleData[]>([]); // Data mentah untuk hitung total
  
  const [customerName, setCustomerName] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ProductMaster | null>(null);
  const [quantity, setQuantity] = useState("");
  const [weight, setWeight] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Edit State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState<SaleData | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => { loadMasterData(); }, []);
  useEffect(() => { loadSalesHistory(); }, [selectedDate]);

  const loadMasterData = async () => {
    const { data: pData } = await supabase.from(TABLE_NAMES.PRODUCT_MASTER).select('*').eq('is_active', true).order('product_name');
    const { data: cData } = await supabase.from('customer_master').select('*').eq('is_active', true).order('customer_name');
    setProducts(pData || []);
    setMasterCustomers(cData || []);
  };

  const loadSalesHistory = async () => {
    const { data, error } = await supabase
      .from(TABLE_NAMES.SALES)
      .select('*')
      .eq('date', selectedDate)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setRawSales(data); // Simpan data mentah
      const groups: { [key: string]: TransactionGroup } = {};
      
      data.forEach((item) => {
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
      setQuantity(""); setWeight("");
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
    
    if (!weightNum && !qtyNum) { toast({ title: "Gagal", description: "Masukkan Berat atau Jumlah", variant: "destructive" }); return; }

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

  const removeFromCart = (tempId: number) => setCart(cart.filter(item => item.tempId !== tempId));

  const submitTransaction = async () => {
    if (!customerName || cart.length === 0) return;
    setLoading(true);
    try {
      const timestamp = new Date().toISOString();
      const salesPayload = cart.map(item => ({
        date: selectedDate,
        customer_name: customerName,
        product_type: item.productName,
        quantity: item.quantity,
        weight: item.weight,
        price_per_kg: item.pricePerKg,
        total_price: item.totalPrice,
        payment_status: 'Belum Lunas',
        created_at: timestamp
      }));
      const { error } = await supabase.from(TABLE_NAMES.SALES).insert(salesPayload);
      if (error) throw error;
      toast({ title: "Sukses!", description: "Transaksi tersimpan." });
      setCart([]); setCustomerName(""); setSelectedProduct(null);
      loadSalesHistory();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleDeleteGroup = async (group: TransactionGroup) => {
    if (!confirm(`Hapus seluruh transaksi ${group.customer_name}?`)) return;
    const idsToDelete = group.items.map(i => i.id);
    try {
      const { error } = await supabase.from(TABLE_NAMES.SALES).delete().in('id', idsToDelete);
      if (error) throw error;
      toast({ title: "Dihapus", description: "Transaksi dihapus" });
      loadSalesHistory();
    } catch (error) {
      toast({ title: "Error", description: "Gagal hapus data", variant: "destructive" });
    }
  };

  const openEditModal = (sale: SaleData) => { setEditData({ ...sale }); setIsEditOpen(true); };

  const handleEditSave = async () => {
    if (!editData) return;
    setEditLoading(true);
    try {
      const newTotal = Math.round(editData.weight * editData.price_per_kg);
      await supabase.from(TABLE_NAMES.SALES).update({
        quantity: editData.quantity,
        weight: editData.weight,
        price_per_kg: editData.price_per_kg,
        total_price: newTotal
      }).eq('id', editData.id);
      setIsEditOpen(false);
      loadSalesHistory();
      toast({ title: "Update Berhasil" });
    } catch (error) { toast({ title: "Error", description: "Gagal update", variant: "destructive" }); } finally { setEditLoading(false); }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  const grandTotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  
  // TOTAL UNTUK SUMMARY BOX
  const totalHariIni = rawSales.reduce((sum, s) => sum + s.total_price, 0);
  const totalEkorHariIni = rawSales.reduce((sum, s) => sum + (s.quantity || 0), 0);
  const totalBeratHariIni = rawSales.reduce((sum, s) => sum + (s.weight || 0), 0);

  return (
    <Layout>
      <div className="space-y-6 pb-20">
        <h1 className="text-3xl font-bold text-gray-900">Penjualan (Kasir)</h1>

        {/* PILIH TANGGAL & PELANGGAN */}
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
                <SelectContent>{masterCustomers.map(c => <SelectItem key={c.id} value={c.customer_name}>{c.customer_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* INPUT BARANG */}
        {customerName && (
          <Card className="border-t-4 border-t-purple-500 shadow-md">
            <CardHeader className="pb-2"><CardTitle className="text-lg flex justify-between"><span>Input Barang</span>{selectedProduct && <Badge>{selectedProduct.category === 'utuh' ? 'Ayam Utuh' : 'Jeroan'}</Badge>}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Pilih Produk</Label>
                <Select value={selectedProduct?.product_name || ""} onValueChange={handleProductChange}>
                  <SelectTrigger><SelectValue placeholder="-- Pilih Produk --" /></SelectTrigger>
                  <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.product_name}>{p.product_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {selectedProduct && (
                <div className="bg-purple-50 p-4 rounded-lg space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedProduct.category === 'utuh' && <div><Label>Jumlah Ekor</Label><Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="bg-white" autoFocus /></div>}
                    <div><Label>Berat (Kg/Pcs)</Label><Input type="number" step="0.01" value={weight} onChange={e => setWeight(e.target.value)} className="bg-white" /></div>
                    <div><Label>Harga Satuan</Label><Input type="number" value={pricePerKg} onChange={e => setPricePerKg(e.target.value)} className="bg-white" /></div>
                  </div>
                  <Button onClick={addToCart} className="w-full bg-purple-600 hover:bg-purple-700"><Plus className="mr-2 h-4 w-4" /> Masukkan Keranjang</Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* KERANJANG BELANJA */}
        {cart.length > 0 && (
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader><CardTitle className="flex items-center gap-2 text-green-800"><ShoppingCart className="h-5 w-5" /> Keranjang - {customerName}</CardTitle></CardHeader>
            <CardContent>
              <div className="bg-white rounded-md border shadow-sm overflow-hidden mb-4">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 font-medium"><tr><th className="p-3">Produk</th><th className="p-3 text-center">Qty</th><th className="p-3 text-center">Berat</th><th className="p-3 text-right">Subtotal</th><th className="p-3 text-center">Aksi</th></tr></thead>
                  <tbody>{cart.map((item) => (
                    <tr key={item.tempId} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="p-3 font-medium">{item.productName}</td>
                      <td className="p-3 text-center">{item.productType === 'utuh' ? item.quantity : '-'}</td>
                      <td className="p-3 text-center">{item.weight}</td>
                      <td className="p-3 text-right font-bold">{formatCurrency(item.totalPrice)}</td>
                      <td className="p-3 text-center"><button onClick={() => removeFromCart(item.tempId)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <Button size="lg" onClick={submitTransaction} disabled={loading} className="w-full bg-green-600 hover:bg-green-700 font-bold shadow-lg">{loading ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 h-5 w-5" />} SIMPAN TRANSAKSI ({formatCurrency(grandTotal)})</Button>
            </CardContent>
          </Card>
        )}

        {/* RIWAYAT PENJUALAN & SUMMARY BOX */}
        <Card className="border-t-4 border-t-gray-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" /> Riwayat {new Date(selectedDate).toLocaleDateString('id-ID')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {groupedSales.length > 0 ? (
              <>
                <div className="space-y-4">
                  {groupedSales.map((group) => (
                    <div key={group.id} className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg text-gray-900">{group.customer_name}</h3>
                        <div className="text-right">
                           <span className="block font-bold text-green-700 text-lg">{formatCurrency(group.total_price)}</span>
                           <span className="text-xs text-gray-400">{new Date(group.items[0].created_at).toLocaleTimeString('id-ID')}</span>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 rounded p-3 text-sm space-y-2">
                        {group.items.map((item) => (
                          <div key={item.id} className="flex justify-between border-b border-gray-200 last:border-0 pb-1 last:pb-0 items-center">
                             <div className="flex-1">
                               <span className="font-medium">{item.product_type}</span> 
                               <span className="text-gray-500 ml-2 text-xs">
                                 {item.quantity > 0 ? `${item.quantity} ekor, ` : ''}{item.weight} Kg
                               </span>
                             </div>
                             <div className="flex items-center gap-3">
                               <span className="text-gray-700 font-medium">{formatCurrency(item.total_price)}</span>
                               <button onClick={() => openEditModal(item)} className="text-blue-500 hover:text-blue-700"><Edit className="h-3 w-3"/></button>
                             </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 flex justify-end">
                        <Button size="sm" variant="destructive" className="h-8 text-xs bg-red-50 text-red-600 border border-red-200 hover:bg-red-100" onClick={() => handleDeleteGroup(group)}>
                          <Trash2 className="h-3 w-3 mr-1" /> Hapus Transaksi
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                {/* SUMMARY BOX (TAMPILAN BARU YANG GANTENG) */}
                <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-sm text-green-600">Total Transaksi</p>
                      <p className="font-bold text-lg text-green-900">{groupedSales.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-green-600">Total Ekor Terjual</p>
                      <p className="font-bold text-lg text-green-900">{totalEkorHariIni}</p>
                    </div>
                    <div>
                      <p className="text-sm text-green-600">Total Berat Terjual</p>
                      <p className="font-bold text-lg text-green-900">{totalBeratHariIni.toFixed(1)} Kg</p>
                    </div>
                    <div>
                      <p className="text-sm text-green-600">Total Omzet Hari Ini</p>
                      <p className="font-bold text-xl text-green-900">{formatCurrency(totalHariIni)}</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-lg border border-dashed">Belum ada transaksi hari ini.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* MODAL EDIT DATA */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Item Penjualan</DialogTitle></DialogHeader>
          {editData && (
            <div className="space-y-4 py-2">
              <div className="p-2 bg-blue-50 rounded text-sm text-blue-800 font-medium">{editData.customer_name} - {editData.product_type}</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Jumlah Ekor</Label><Input type="number" value={editData.quantity} onChange={(e) => setEditData({...editData, quantity: parseInt(e.target.value) || 0})} /></div>
                <div className="space-y-2"><Label>Berat (Kg/Pcs)</Label><Input type="number" step="0.01" value={editData.weight} onChange={(e) => setEditData({...editData, weight: parseFloat(e.target.value) || 0})} /></div>
              </div>
              <div className="space-y-2"><Label>Harga Satuan</Label><Input type="number" value={editData.price_per_kg} onChange={(e) => setEditData({...editData, price_per_kg: parseFloat(e.target.value) || 0})} /></div>
              <div className="text-right font-bold text-gray-700 pt-2 border-t">Total Baru: {formatCurrency(Math.round((editData.weight || 0) * (editData.price_per_kg || 0)))}</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button>
            <Button onClick={handleEditSave} disabled={editLoading} className="bg-blue-600 hover:bg-blue-700">{editLoading ? <Loader2 className="animate-spin" /> : "Simpan Perubahan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Penjualan;
