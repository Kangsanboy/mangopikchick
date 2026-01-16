import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TABLE_NAMES } from "@/types/database";
import { Plus, Edit, Trash2, Package, Users, Loader2, Save, X } from "lucide-react";

// Update Interface Lokal
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
  const [products, setProducts] = useState<any[]>([]);
  const [productName, setProductName] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [category, setCategory] = useState("utuh"); // Default Utuh

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
  const [editingValue, setEditingValue] = useState("");
  const [editingCategory, setEditingCategory] = useState("");

  useEffect(() => {
    if (activeTab === "products") loadProducts();
    else loadCustomers();
  }, [activeTab]);

  // ==================== FUNGSI PRODUK ====================
  const loadProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(TABLE_NAMES.PRODUCT_MASTER)
      .select('*')
      .eq('is_active', true)
      .order('product_name', { ascending: true });
    if (!error) setProducts(data || []);
    setLoading(false);
  };

  const addProduct = async () => {
    if (!productName.trim() || !pricePerKg) return;
    setSaving(true);
    try {
      const { error } = await supabase.from(TABLE_NAMES.PRODUCT_MASTER).insert({
        product_name: productName.trim(),
        price_per_kg: parseInt(pricePerKg),
        category: category // Simpan Kategori
      });
      if (error) throw error;
      setProductName(""); setPricePerKg(""); setCategory("utuh");
      await loadProducts();
      toast({ title: "Berhasil", description: "Produk ditambahkan" });
    } catch (error) {
      toast({ title: "Error", description: "Gagal menambah produk", variant: "destructive" });
    } finally { setSaving(false); }
  };

  // ==================== FUNGSI PELANGGAN ====================
  const loadCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customer_master')
      .select('*')
      .eq('is_active', true)
      .order('customer_name', { ascending: true });
    if (!error) setCustomers(data || []);
    setLoading(false);
  };

  const addCustomer = async () => {
    if (!custName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('customer_master').insert({
        customer_name: custName.trim(),
        default_quantity: custQty ? parseInt(custQty) : 0,
      });
      if (error) throw error;
      setCustName(""); setCustQty("");
      await loadCustomers();
      toast({ title: "Berhasil", description: "Pelanggan ditambahkan" });
    } catch (error) {
      toast({ title: "Error", description: "Gagal menambah pelanggan", variant: "destructive" });
    } finally { setSaving(false); }
  };

  // ==================== FUNGSI DELETE & EDIT ====================
  const deleteItem = async (id: string, table: string, isProduct: boolean) => {
    if (!confirm("Hapus data ini?")) return;
    const { error } = await supabase.from(table).update({ is_active: false }).eq('id', id);
    if (!error) {
      isProduct ? loadProducts() : loadCustomers();
      toast({ title: "Dihapus", description: "Data berhasil dihapus" });
    }
  };

  const saveEdit = async (isProduct: boolean) => {
    if (!editingId) return;
    setSaving(true);
    try {
      const updateData = isProduct 
        ? { product_name: editingName, price_per_kg: parseInt(editingValue), category: editingCategory }
        : { customer_name: editingName, default_quantity: parseInt(editingValue) };
      
      const table = isProduct ? TABLE_NAMES.PRODUCT_MASTER : 'customer_master';
      const { error } = await supabase.from(table).update(updateData).eq('id', editingId);

      if (error) throw error;
      setEditingId(null);
      isProduct ? await loadProducts() : await loadCustomers();
      toast({ title: "Berhasil", description: "Data diperbarui" });
    } catch (error) {
      toast({ title: "Error", description: "Gagal update", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Data Master</h1>
            <p className="text-gray-600 mt-1">{activeTab === "products" ? "Kelola Produk & Kategori" : "Kelola Pelanggan"}</p>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button onClick={() => setActiveTab("products")} className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex gap-2 ${activeTab === "products" ? "bg-white text-green-700 shadow" : "text-gray-500"}`}><Package className="h-4 w-4" /> Produk</button>
            <button onClick={() => setActiveTab("customers")} className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex gap-2 ${activeTab === "customers" ? "bg-white text-blue-700 shadow" : "text-gray-500"}`}><Users className="h-4 w-4" /> Pelanggan</button>
          </div>
        </div>

        {activeTab === "products" && (
          <>
            <Card className="border-t-4 border-t-green-500">
              <CardHeader><CardTitle className="text-green-700 flex gap-2"><Plus className="h-5 w-5"/> Tambah Produk</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <Label>Nama Produk</Label>
                    <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Contoh: Ayam Utuh, Ceker" />
                  </div>
                  <div>
                    <Label>Kategori</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utuh">Ayam Utuh</SelectItem>
                        <SelectItem value="jeroan">Jeroan / Parts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Harga per Kg</Label>
                    <Input type="number" value={pricePerKg} onChange={(e) => setPricePerKg(e.target.value)} placeholder="0" />
                  </div>
                  <div className="md:col-span-4">
                    <Button onClick={addProduct} className="w-full bg-green-600 hover:bg-green-700" disabled={saving}>{saving ? <Loader2 className="animate-spin"/> : "Simpan Produk"}</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Produk</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="text-right">Harga/Kg</TableHead>
                      <TableHead className="text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{editingId === p.id ? <Input value={editingName} onChange={e => setEditingName(e.target.value)} /> : p.product_name}</TableCell>
                        <TableCell>
                          {editingId === p.id ? (
                             <Select value={editingCategory} onValueChange={setEditingCategory}>
                               <SelectTrigger><SelectValue /></SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="utuh">Ayam Utuh</SelectItem>
                                 <SelectItem value="jeroan">Jeroan / Parts</SelectItem>
                               </SelectContent>
                             </Select>
                          ) : (
                            <Badge variant={p.category === 'utuh' ? 'default' : 'secondary'}>{p.category === 'utuh' ? 'Ayam Utuh' : 'Jeroan'}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{editingId === p.id ? <Input type="number" value={editingValue} onChange={e => setEditingValue(e.target.value)} /> : formatCurrency(p.price_per_kg)}</TableCell>
                        <TableCell className="text-center">
                          {editingId === p.id ? (
                            <div className="flex justify-center gap-2"><Button size="sm" onClick={() => saveEdit(true)}><Save className="h-3 w-3"/></Button><Button size="sm" variant="outline" onClick={() => setEditingId(null)}><X className="h-3 w-3"/></Button></div>
                          ) : (
                            <div className="flex justify-center gap-2"><Button size="sm" variant="ghost" onClick={() => { setEditingId(p.id); setEditingName(p.product_name); setEditingValue(p.price_per_kg); setEditingCategory(p.category || 'utuh'); }}><Edit className="h-4 w-4"/></Button><Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteItem(p.id, TABLE_NAMES.PRODUCT_MASTER, true)}><Trash2 className="h-4 w-4"/></Button></div>
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

        {/* --- TAB CUSTOMERS --- */}
        {activeTab === "customers" && (
           <Card className="border-t-4 border-t-blue-500">
             <CardHeader><CardTitle className="text-blue-700 flex gap-2"><Plus className="h-5 w-5"/> Tambah Pelanggan</CardTitle></CardHeader>
             <CardContent>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div><Label>Nama</Label><Input value={custName} onChange={e => setCustName(e.target.value)} /></div>
                 <div><Label>Default Ekor</Label><Input type="number" value={custQty} onChange={e => setCustQty(e.target.value)} /></div>
                 <div className="flex items-end"><Button onClick={addCustomer} className="w-full bg-blue-600">Simpan</Button></div>
               </div>
             </CardContent>
             <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Default</TableHead><TableHead className="text-center">Aksi</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {customers.map(c => (
                      <TableRow key={c.id}>
                        <TableCell>{editingId === c.id ? <Input value={editingName} onChange={e => setEditingName(e.target.value)}/> : c.customer_name}</TableCell>
                        <TableCell>{editingId === c.id ? <Input value={editingValue} onChange={e => setEditingValue(e.target.value)}/> : c.default_quantity}</TableCell>
                        <TableCell className="text-center">
                          {editingId === c.id ? 
                            <Button size="sm" onClick={() => saveEdit(false)}><Save className="h-3 w-3"/></Button> : 
                            <div className="flex justify-center gap-2"><Button size="sm" variant="ghost" onClick={() => {setEditingId(c.id); setEditingName(c.customer_name); setEditingValue(c.default_quantity.toString())}}><Edit className="h-4 w-4"/></Button><Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteItem(c.id, 'customer_master', false)}><Trash2 className="h-4 w-4"/></Button></div>
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
             </CardContent>
           </Card>
        )}
      </div>
    </Layout>
  );
};

export default DataMaster;
