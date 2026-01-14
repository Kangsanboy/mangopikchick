import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"; // NEW
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SaleData, TABLE_NAMES } from "@/types/database";
import { 
  CalendarDays, 
  Plus, 
  Loader2, 
  DollarSign, 
  Trash2, // Icon Hapus
  Edit,   // Icon Edit
  Save
} from "lucide-react";

// Tipe data untuk Master Customer & Product
interface CustomerMaster {
  id: string;
  customer_name: string;
  default_quantity: number;
}
interface ProductMaster {
  id: string;
  product_name: string;
  price_per_kg: number;
}

const Penjualan = () => {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  
  // Form Input States
  const [customerName, setCustomerName] = useState("");
  const [productType, setProductType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [weight, setWeight] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  
  // Data States
  const [sales, setSales] = useState<SaleData[]>([]);
  const [products, setProducts] = useState<ProductMaster[]>([]);
  const [masterCustomers, setMasterCustomers] = useState<CustomerMaster[]>([]);

  // Edit States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState<SaleData | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // Load Data Awal
  useEffect(() => {
    loadMasterData();
  }, []);

  useEffect(() => {
    loadSalesForDate();
  }, [selectedDate]);

  const loadMasterData = async () => {
    try {
      const { data: productsData } = await supabase
        .from(TABLE_NAMES.PRODUCT_MASTER)
        .select('*').eq('is_active', true).order('product_name', { ascending: true });
      
      const { data: customersData } = await supabase
        .from('customer_master')
        .select('*').eq('is_active', true).order('customer_name', { ascending: true });

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
        .eq('date', selectedDate)
        .order('created_at', { ascending: false });

    if (!error && salesData) setSales(salesData);
  };

  // --- LOGIKA FORM INPUT UTAMA ---
  const handleProductChange = (productName: string) => {
    setProductType(productName);
    const selectedProduct = products.find(p => p.product_name === productName);
    if (selectedProduct) setPricePerKg(selectedProduct.price_per_kg.toString());
  };

  const handleCustomerChange = (name: string) => {
    setCustomerName(name);
    const customer = masterCustomers.find(c => c.customer_name === name);
    if (customer && customer.default_quantity) setQuantity(customer.default_quantity.toString());
  };

  const addSale = async () => {
    if (!customerName || !productType || !quantity || !weight || !pricePerKg) {
      toast({ title: "Error", description: "Lengkapi semua field!", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const totalPrice = Math.round(parseFloat(weight) * parseFloat(pricePerKg));
      const { error } = await supabase.from(TABLE_NAMES.SALES).insert({
        customer_name: customerName,
        product_type: productType,
        quantity: parseInt(quantity),
        weight: parseFloat(weight),
        price_per_kg: parseFloat(pricePerKg),
        total_price: totalPrice,
        date: selectedDate,
        payment_status: 'Belum Lunas' // Default status
      });
      if (error) throw error;
      
      // Reset Form
      setCustomerName(""); setProductType(""); setQuantity(""); setWeight(""); setPricePerKg("");
      await loadSalesForDate();
      toast({ title: "Berhasil", description: "Penjualan ditambahkan" });
    } catch (error) {
      toast({ title: "Error", description: "Gagal menambah data", variant: "destructive" });
    } finally { setLoading(false); }
  };

  // --- LOGIKA HAPUS (DELETE) ---
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Yakin ingin menghapus data penjualan "${name}"?`)) return;
    try {
      const { error } = await supabase.from(TABLE_NAMES.SALES).delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Dihapus", description: "Data berhasil dihapus" });
      loadSalesForDate();
    } catch (error) {
      toast({ title: "Error", description: "Gagal menghapus data", variant: "destructive" });
    }
  };

  // --- LOGIKA EDIT ---
  const openEditModal = (sale: SaleData) => {
    setEditData({ ...sale }); // Copy data ke state edit
    setIsEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editData) return;
    setEditLoading(true);
    try {
      // Hitung ulang total harga based on edit
      const newTotal = Math.round(editData.weight * editData.price_per_kg);
      
      const { error } = await supabase.from(TABLE_NAMES.SALES).update({
        quantity: editData.quantity,
        weight: editData.weight,
        price_per_kg: editData.price_per_kg,
        total_price: newTotal
      }).eq('id', editData.id);

      if (error) throw error;
      
      setIsEditOpen(false);
      loadSalesForDate();
      toast({ title: "Update Berhasil", description: "Data penjualan diperbarui" });
    } catch (error) {
      toast({ title: "Error", description: "Gagal update data", variant: "destructive" });
    } finally { setEditLoading(false); }
  };

  // Utility Rupiah
  const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Penjualan Harian</h1>
            <p className="text-gray-600 mt-1">Input data penjualan hari ini</p>
          </div>
        </div>

        {/* Date Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" /> Pilih Tanggal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Label>Tanggal:</Label>
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-auto" />
              <p className="text-sm text-gray-600">Data tanggal: {new Date(selectedDate).toLocaleDateString('id-ID')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Form Input */}
        <Card>
          <CardHeader><CardTitle className="text-lg font-semibold text-purple-700">Input Penjualan Baru</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nama Pelanggan</Label>
              <Select value={customerName} onValueChange={handleCustomerChange}>
                <SelectTrigger><SelectValue placeholder="Pilih Pelanggan" /></SelectTrigger>
                <SelectContent>
                  {masterCustomers.map((c) => (<SelectItem key={c.id} value={c.customer_name}>{c.customer_name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Jenis Produk</Label>
              <Select value={productType} onValueChange={handleProductChange}>
                <SelectTrigger><SelectValue placeholder="Pilih Produk" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (<SelectItem key={p.id} value={p.product_name}>{p.product_name} - {formatCurrency(p.price_per_kg)}/Kg</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Jumlah Ekor</Label><Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
              <div><Label>Berat (Kg)</Label><Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} /></div>
              <div><Label>Harga/Kg</Label><Input type="number" value={pricePerKg} onChange={(e) => setPricePerKg(e.target.value)} /></div>
            </div>
            {weight && pricePerKg && (
              <div className="p-2 bg-purple-50 rounded text-center font-bold text-purple-800">
                Total: {formatCurrency(parseFloat(weight) * parseFloat(pricePerKg))}
              </div>
            )}
            <Button onClick={addSale} className="w-full" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Tambah Penjualan
            </Button>
          </CardContent>
        </Card>

        {/* List Penjualan Hari Ini */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Riwayat {new Date(selectedDate).toLocaleDateString('id-ID')}</CardTitle></CardHeader>
          <CardContent>
            {sales.length > 0 ? (
              <div className="space-y-3">
                {sales.map((sale) => (
                  <div key={sale.id} className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-lg text-gray-900">{sale.customer_name}</h4>
                        <p className="text-sm text-gray-500">{sale.product_type} • {sale.quantity} Ekor</p>
                      </div>
                      <Badge variant="outline" className="text-base px-3 py-1 font-bold border-purple-200 text-purple-700 bg-purple-50">
                        {formatCurrency(sale.total_price)}
                      </Badge>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium text-gray-900">{sale.weight} Kg</span> x {formatCurrency(sale.price_per_kg)}
                      </div>
                      
                      {/* TOMBOL EDIT & HAPUS */}
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => openEditModal(sale)}>
                          <Edit className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-200" onClick={() => handleDelete(sale.id, sale.customer_name)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center">
                  <p className="font-medium text-gray-700">
                    Total Hari Ini: {formatCurrency(sales.reduce((sum, s) => sum + s.total_price, 0))} 
                    <span className="text-gray-400 text-sm ml-1">({sales.length} Transaksi)</span>
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Belum ada penjualan hari ini.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* MODAL EDIT DATA */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Data Penjualan</DialogTitle></DialogHeader>
          {editData && (
            <div className="space-y-4 py-2">
              <div className="p-2 bg-blue-50 rounded text-sm text-blue-800 font-medium">
                Pelanggan: {editData.customer_name} <br/> Produk: {editData.product_type}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Jumlah Ekor</Label>
                  <Input type="number" value={editData.quantity} onChange={(e) => setEditData({...editData, quantity: parseInt(e.target.value) || 0})} />
                </div>
                <div className="space-y-2">
                  <Label>Berat (Kg)</Label>
                  <Input type="number" step="0.1" value={editData.weight} onChange={(e) => setEditData({...editData, weight: parseFloat(e.target.value) || 0})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Harga per Kg</Label>
                <Input type="number" value={editData.price_per_kg} onChange={(e) => setEditData({...editData, price_per_kg: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="text-right font-bold text-gray-700">
                Total Baru: {formatCurrency(Math.round((editData.weight || 0) * (editData.price_per_kg || 0)))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button>
            <Button onClick={handleEditSave} disabled={editLoading}>{editLoading ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4 mr-2"/>} Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Layout>
  );
};

export default Penjualan;
