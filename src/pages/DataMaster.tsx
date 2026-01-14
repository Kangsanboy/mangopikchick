import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ProductMaster, TABLE_NAMES } from "@/types/database";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Package,
  Users, // Icon baru untuk pelanggan
  Loader2,
  Save,
  X
} from "lucide-react";

// Tipe data lokal untuk Pelanggan (sesuai tabel customer_master)
interface CustomerMaster {
  id: string;
  customer_name: string;
  default_quantity: number;
  is_active: boolean;
}

const DataMaster = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"products" | "customers">("products");
  
  // --- STATE PRODUK ---
  const [products, setProducts] = useState<ProductMaster[]>([]);
  const [productName, setProductName] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  
  // --- STATE PELANGGAN ---
  const [customers, setCustomers] = useState<CustomerMaster[]>([]);
  const [custName, setCustName] = useState("");
  const [custQty, setCustQty] = useState("");

  // --- STATE UMUM ---
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // State Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingValue, setEditingValue] = useState(""); // Bisa harga atau qty

  useEffect(() => {
    if (activeTab === "products") {
      loadProducts();
    } else {
      loadCustomers();
    }
  }, [activeTab]);

  // ==================== FUNGSI PRODUK ====================
  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from(TABLE_NAMES.PRODUCT_MASTER)
        .select('*')
        .eq('is_active', true)
        .order('product_name', { ascending: true });
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      toast({ title: "Error", description: "Gagal memuat data produk", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addProduct = async () => {
    if (!productName.trim() || !pricePerKg) return;
    setSaving(true);
    try {
      const { error } = await supabase.from(TABLE_NAMES.PRODUCT_MASTER).insert({
        product_name: productName.trim(),
        price_per_kg: parseInt(pricePerKg),
      });
      if (error) throw error;
      setProductName(""); setPricePerKg("");
      await loadProducts();
      toast({ title: "Berhasil", description: "Produk berhasil ditambahkan" });
    } catch (error: any) {
      toast({ title: "Error", description: "Gagal menambah produk", variant: "destructive" });
    } finally { setSaving(false); }
  };

  // ==================== FUNGSI PELANGGAN ====================
  const loadCustomers = async () => {
    try {
      setLoading(true);
      // Pastikan nama tabel di Supabase sudah benar: customer_master
      const { data, error } = await supabase
        .from('customer_master') 
        .select('*')
        .eq('is_active', true)
        .order('customer_name', { ascending: true });
      
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast({ title: "Error", description: "Gagal memuat data pelanggan", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addCustomer = async () => {
    if (!custName.trim() || !custQty) {
      toast({ title: "Error", description: "Lengkapi nama dan jumlah ekor", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('customer_master').insert({
        customer_name: custName.trim(), // Pastikan kolom di DB namanya customer_name
        default_quantity: parseInt(custQty),
      });
      if (error) throw error;
      setCustName(""); setCustQty("");
      await loadCustomers();
      toast({ title: "Berhasil", description: "Pelanggan berhasil ditambahkan" });
    } catch (error: any) {
      console.error(error);
      toast({ title: "Error", description: "Gagal menambah pelanggan", variant: "destructive" });
    } finally { setSaving(false); }
  };

  // ==================== FUNGSI UMUM (DELETE & EDIT) ====================
  const deleteItem = async (id: string, table: string, isProduct: boolean) => {
    if (!confirm("Yakin ingin menghapus data ini?")) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from(table)
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
      
      if (isProduct) await loadProducts();
      else await loadCustomers();

      toast({ title: "Berhasil", description: "Data berhasil dihapus" });
    } catch (error) {
      toast({ title: "Error", description: "Gagal menghapus data", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const saveEdit = async (isProduct: boolean) => {
    if (!editingId) return;
    setSaving(true);
    try {
      const updateData = isProduct 
        ? { product_name: editingName, price_per_kg: parseInt(editingValue) }
        : { customer_name: editingName, default_quantity: parseInt(editingValue) };
      
      const table = isProduct ? TABLE_NAMES.PRODUCT_MASTER : 'customer_master';

      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', editingId);

      if (error) throw error;
      setEditingId(null); setEditingName(""); setEditingValue("");
      
      if (isProduct) await loadProducts();
      else await loadCustomers();

      toast({ title: "Berhasil", description: "Data berhasil diperbarui" });
    } catch (error) {
      toast({ title: "Error", description: "Gagal update data", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header & Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Data Master</h1>
            <p className="text-gray-600 mt-1">Kelola data produk dan pelanggan tetap</p>
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("products")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === "products" 
                  ? "bg-white text-green-700 shadow-sm" 
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" /> Produk
              </div>
            </button>
            <button
              onClick={() => setActiveTab("customers")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === "customers" 
                  ? "bg-white text-blue-700 shadow-sm" 
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" /> Pelanggan
              </div>
            </button>
          </div>
        </div>

        {/* ================= CONTENT PRODUK ================= */}
        {activeTab === "products" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <Plus className="h-5 w-5" /> Tambah Produk
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Nama Produk</Label>
                    <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Contoh: Paha, Dada" />
                  </div>
                  <div>
                    <Label>Harga per Kg (Rp)</Label>
                    <Input type="number" value={pricePerKg} onChange={(e) => setPricePerKg(e.target.value)} placeholder="25000" />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addProduct} className="w-full bg-green-600 hover:bg-green-700" disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Simpan
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Daftar Produk</span>
                  <Badge variant="outline">{products.length} item</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Produk</TableHead>
                      <TableHead className="text-right">Harga / Kg</TableHead>
                      <TableHead className="text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          {editingId === p.id ? <Input value={editingName} onChange={e => setEditingName(e.target.value)} /> : p.product_name}
                        </TableCell>
                        <TableCell className="text-right">
                          {editingId === p.id ? <Input type="number" value={editingValue} onChange={e => setEditingValue(e.target.value)} className="w-32 ml-auto" /> : formatCurrency(p.price_per_kg)}
                        </TableCell>
                        <TableCell className="text-center">
                          {editingId === p.id ? (
                            <div className="flex justify-center gap-2">
                              <Button size="sm" onClick={() => saveEdit(true)}><Save className="h-3 w-3" /></Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                            </div>
                          ) : (
                            <div className="flex justify-center gap-2">
                              <Button size="sm" variant="outline" onClick={() => { setEditingId(p.id); setEditingName(p.product_name); setEditingValue(p.price_per_kg.toString()); }}><Edit className="h-3 w-3" /></Button>
                              <Button size="sm" variant="destructive" onClick={() => deleteItem(p.id, TABLE_NAMES.PRODUCT_MASTER, true)}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        {/* ================= CONTENT PELANGGAN ================= */}
        {activeTab === "customers" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <Plus className="h-5 w-5" /> Tambah Pelanggan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Nama Pelanggan</Label>
                    <Input value={custName} onChange={(e) => setCustName(e.target.value)} placeholder="Contoh: Pak Haji Asep" />
                  </div>
                  <div>
                    <Label>Default Jumlah Ekor</Label>
                    <Input type="number" value={custQty} onChange={(e) => setCustQty(e.target.value)} placeholder="Misal: 10" />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addCustomer} className="w-full bg-blue-600 hover:bg-blue-700" disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Simpan
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Daftar Pelanggan</span>
                  <Badge variant="outline">{customers.length} orang</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Pelanggan</TableHead>
                      <TableHead className="text-center">Default Ekor</TableHead>
                      <TableHead className="text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          {editingId === c.id ? <Input value={editingName} onChange={e => setEditingName(e.target.value)} /> : c.customer_name}
                        </TableCell>
                        <TableCell className="text-center">
                          {editingId === c.id ? <Input type="number" value={editingValue} onChange={e => setEditingValue(e.target.value)} className="w-20 mx-auto" /> : `${c.default_quantity || 0} ekor`}
                        </TableCell>
                        <TableCell className="text-center">
                          {editingId === c.id ? (
                            <div className="flex justify-center gap-2">
                              <Button size="sm" onClick={() => saveEdit(false)}><Save className="h-3 w-3" /></Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                            </div>
                          ) : (
                            <div className="flex justify-center gap-2">
                              <Button size="sm" variant="outline" onClick={() => { setEditingId(c.id); setEditingName(c.customer_name); setEditingValue((c.default_quantity || 0).toString()); }}><Edit className="h-3 w-3" /></Button>
                              <Button size="sm" variant="destructive" onClick={() => deleteItem(c.id, 'customer_master', false)}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
};

export default DataMaster;
