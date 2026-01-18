import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PurchaseData, ProductMaster, TABLE_NAMES } from "@/types/database";
import { CalendarDays, Plus, Loader2, ShoppingCart, Trash2, Edit, Save } from "lucide-react";

const Pembelian = () => {
  const { toast } = useToast();
  // PERBAIKAN: Set Default Tanggal WIB
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }));
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [productType, setProductType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [weight, setWeight] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  
  // Data
  const [purchases, setPurchases] = useState<PurchaseData[]>([]);
  const [products, setProducts] = useState<ProductMaster[]>([]);

  // Edit States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState<PurchaseData | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // Load data from Supabase
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: purchasesData, error: purchasesError } = await supabase
        .from(TABLE_NAMES.PURCHASES)
        .select('*')
        .order('date', { ascending: false });
      
      if (purchasesError) throw purchasesError;
      
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
      toast({ title: "Error", description: "Gagal memuat data", variant: "destructive" });
    }
  };

  const handleProductChange = (productName: string) => {
    setProductType(productName);
    const selectedProduct = products.find(p => p.product_name === productName);
    if (selectedProduct) {
      setPricePerKg(selectedProduct.price_per_kg.toString());
    }
  };

  const addPurchase = async () => {
    if (!productType || !quantity || !weight || !pricePerKg) {
      toast({ title: "Error", description: "Mohon lengkapi semua field pembelian", variant: "destructive" });
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

      setProductType(""); setQuantity(""); setWeight(""); setPricePerKg("");
      await loadData();
      toast({ title: "Berhasil", description: "Data pembelian berhasil ditambahkan" });
    } catch (error) {
      console.error('Error adding purchase:', error);
      toast({ title: "Error", description: "Gagal menambahkan data pembelian", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, product: string) => {
    if (!confirm(`Yakin ingin menghapus pembelian "${product}" ini?`)) return;
    try {
      const { error } = await supabase.from(TABLE_NAMES.PURCHASES).delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Dihapus", description: "Data pembelian dihapus" });
      loadData();
    } catch (error) {
      toast({ title: "Error", description: "Gagal hapus data", variant: "destructive" });
    }
  };

  const openEditModal = (purchase: PurchaseData) => {
    setEditData({ ...purchase });
    setIsEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editData) return;
    setEditLoading(true);
    try {
      const newTotal = Math.round(editData.weight * editData.price_per_kg);
      const { error } = await supabase.from(TABLE_NAMES.PURCHASES).update({
        quantity: editData.quantity,
        weight: editData.weight,
        price_per_kg: editData.price_per_kg,
        total_price: newTotal
      }).eq('id', editData.id);

      if (error) throw error;
      setIsEditOpen(false);
      loadData();
      toast({ title: "Update Berhasil", description: "Data pembelian diperbarui" });
    } catch (error) {
      toast({ title: "Error", description: "Gagal update data", variant: "destructive" });
    } finally {
      setEditLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  const todayPurchases = purchases.filter(p => p.date === selectedDate);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-3xl font-bold text-gray-900">Pembelian</h1><p className="text-gray-600 mt-1">Kelola data pembelian produk (Stok Masuk)</p></div>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" /> Pilih Tanggal</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Label htmlFor="date">Tanggal:</Label>
              <Input id="date" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-auto" />
              <p className="text-sm text-gray-600">Data akan disimpan untuk tanggal: {new Date(selectedDate).toLocaleDateString('id-ID')}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg font-semibold text-green-700">Input Pembelian</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="product-type">Jenis Produk</Label>
              <Select value={productType} onValueChange={handleProductChange}>
                <SelectTrigger><SelectValue placeholder="Pilih jenis produk" /></SelectTrigger>
                <SelectContent>
                  {products.length > 0 ? (
                    products.map((product) => (
                      <SelectItem key={product.id} value={product.product_name}>{product.product_name} - {formatCurrency(product.price_per_kg)}/Kg</SelectItem>
                    ))
                  ) : (<SelectItem value="none" disabled>Belum ada produk di data master</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label htmlFor="quantity">Jumlah Ekor</Label><Input id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Jumlah ekor" min="1" /></div>
              <div><Label htmlFor="weight">Jumlah Berat Ekor (Kg)</Label><Input id="weight" type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Berat dalam Kg" min="0.1" /></div>
              <div><Label htmlFor="price-per-kg">Harga Beli per Kg</Label><Input id="price-per-kg" type="number" value={pricePerKg} onChange={(e) => setPricePerKg(e.target.value)} placeholder="Harga Beli" min="1" /></div>
            </div>

            {weight && pricePerKg && (
              <div className="p-2 bg-green-50 rounded text-center"><p className="text-sm text-green-700 font-bold">Total Modal: {formatCurrency(parseFloat(weight) * parseFloat(pricePerKg))}</p></div>
            )}

            <Button onClick={addPurchase} className="w-full bg-green-600 hover:bg-green-700" disabled={loading || products.length === 0}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Tambah Pembelian
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> Pembelian Tanggal {new Date(selectedDate).toLocaleDateString('id-ID')}</CardTitle></CardHeader>
          <CardContent>
            {todayPurchases.length > 0 ? (
              <div className="space-y-3">
                {todayPurchases.map((purchase) => (
                  <div key={purchase.id} className="p-4 bg-white border border-green-100 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 flex-1 w-full text-sm">
                        <div><p className="text-gray-500 text-xs">Produk</p><p className="font-bold text-gray-900">{purchase.product_type || 'Ayam Utuh'}</p></div>
                        <div><p className="text-gray-500 text-xs">Jumlah</p><p className="font-medium">{purchase.quantity} ekor</p></div>
                        <div><p className="text-gray-500 text-xs">Berat</p><p className="font-medium">{purchase.weight} Kg</p></div>
                        <div><p className="text-gray-500 text-xs">Harga/Kg</p><p className="font-medium">{formatCurrency(purchase.price_per_kg)}</p></div>
                        <div><p className="text-gray-500 text-xs">Total</p><p className="font-bold text-green-700">{formatCurrency(purchase.total_price)}</p></div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button size="icon" variant="outline" className="h-8 w-8 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => openEditModal(purchase)}><Edit className="h-4 w-4" /></Button>
                        <Button size="icon" variant="outline" className="h-8 w-8 text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDelete(purchase.id, purchase.product_type)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
                <Separator className="my-4" />
                <div className="p-4 bg-green-50 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
                   <div><p className="text-gray-600">Total Transaksi</p><p className="font-bold text-lg">{todayPurchases.length}</p></div>
                   <div><p className="text-gray-600">Total Ekor</p><p className="font-bold text-lg">{todayPurchases.reduce((sum, p) => sum + p.quantity, 0)}</p></div>
                   <div><p className="text-gray-600">Total Berat</p><p className="font-bold text-lg">{todayPurchases.reduce((sum, p) => sum + p.weight, 0).toFixed(1)} Kg</p></div>
                   <div><p className="text-gray-600">Total Modal</p><p className="font-bold text-lg text-green-700">{formatCurrency(todayPurchases.reduce((sum, p) => sum + p.total_price, 0))}</p></div>
                </div>
              </div>
            ) : (<p className="text-gray-500 text-center py-8">Belum ada data pembelian untuk tanggal ini</p>)}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Data Pembelian</DialogTitle></DialogHeader>
          {editData && (
            <div className="space-y-4 py-2">
              <div className="p-2 bg-green-50 rounded text-sm text-green-800 font-medium border border-green-200">Produk: {editData.product_type}</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Jumlah Ekor</Label><Input type="number" value={editData.quantity} onChange={(e) => setEditData({...editData, quantity: parseInt(e.target.value) || 0})} /></div>
                <div className="space-y-2"><Label>Berat (Kg)</Label><Input type="number" step="0.1" value={editData.weight} onChange={(e) => setEditData({...editData, weight: parseFloat(e.target.value) || 0})} /></div>
              </div>
              <div className="space-y-2"><Label>Harga Beli per Kg</Label><Input type="number" value={editData.price_per_kg} onChange={(e) => setEditData({...editData, price_per_kg: parseFloat(e.target.value) || 0})} /></div>
              <div className="text-right font-bold text-gray-700 pt-2 border-t">Total Baru: {formatCurrency(Math.round((editData.weight || 0) * (editData.price_per_kg || 0)))}</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button>
            <Button onClick={handleEditSave} disabled={editLoading} className="bg-green-600 hover:bg-green-700">{editLoading ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4 mr-2"/>} Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Pembelian;
