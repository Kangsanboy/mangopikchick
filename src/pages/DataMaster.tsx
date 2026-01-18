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
import { Plus, Edit, Trash2, Package, Users, Save, WalletCards, Scale } from "lucide-react";

// Interfaces
interface CustomerMaster { id: string; customer_name: string; default_quantity: number; }
interface ProductMaster { 
  id: string; 
  product_name: string; 
  price_per_kg: number; 
  category: string; 
  unit_type: string; // Tambahan field Satuan
}
interface ExpenseCategory { id: string; name: string; default_amount: number; }

const DataMaster = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"products" | "customers" | "expenses">("products");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // States Data
  const [products, setProducts] = useState<ProductMaster[]>([]);
  const [customers, setCustomers] = useState<CustomerMaster[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);

  // Inputs Produk
  const [prodName, setProdName] = useState(""); 
  const [prodPrice, setProdPrice] = useState(""); 
  const [prodCat, setProdCat] = useState("utuh");
  const [prodUnit, setProdUnit] = useState("kg"); // Input Satuan Baru

  // Inputs Lain
  const [custName, setCustName] = useState(""); const [custQty, setCustQty] = useState("");
  const [expName, setExpName] = useState(""); const [expAmount, setExpAmount] = useState("");

  // Edit Inputs
  const [editName, setEditName] = useState(""); 
  const [editValue, setEditValue] = useState(""); 
  const [editCat, setEditCat] = useState("");
  const [editUnit, setEditUnit] = useState(""); // Edit Satuan Baru

  useEffect(() => {
    if (activeTab === "products") loadProducts();
    else if (activeTab === "customers") loadCustomers();
    else loadExpenses();
  }, [activeTab]);

  // --- LOAD DATA ---
  const loadProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from(TABLE_NAMES.PRODUCT_MASTER).select('*').eq('is_active', true).order('product_name');
    setProducts(data || []); setLoading(false);
  };
  const loadCustomers = async () => {
    setLoading(true);
    const { data } = await supabase.from('customer_master').select('*').eq('is_active', true).order('customer_name');
    setCustomers(data || []); setLoading(false);
  };
  const loadExpenses = async () => {
    setLoading(true);
    const { data } = await supabase.from('expense_categories').select('*').eq('is_active', true).order('name');
    setExpenseCategories(data || []); setLoading(false);
  };

  // --- ADD FUNCTIONS ---
  const addProduct = async () => {
    if (!prodName || !prodPrice) return;
    setSaving(true);
    await supabase.from(TABLE_NAMES.PRODUCT_MASTER).insert({ 
      product_name: prodName, 
      price_per_kg: parseInt(prodPrice), 
      category: prodCat,
      unit_type: prodUnit // Simpan Satuan
    });
    setProdName(""); setProdPrice(""); loadProducts(); setSaving(false);
    toast({ title: "Produk Ditambahkan" });
  };

  const addCustomer = async () => {
    if (!custName) return;
    setSaving(true);
    await supabase.from('customer_master').insert({ customer_name: custName, default_quantity: parseInt(custQty) || 0 });
    setCustName(""); setCustQty(""); loadCustomers(); setSaving(false);
    toast({ title: "Pelanggan Ditambahkan" });
  };

  const addExpenseCat = async () => {
    if (!expName) return;
    setSaving(true);
    await supabase.from('expense_categories').insert({ name: expName, default_amount: parseInt(expAmount) || 0 });
    setExpName(""); setExpAmount(""); loadExpenses(); setSaving(false);
    toast({ title: "Item Operasional Ditambahkan" });
  };

  // --- EDIT & DELETE ---
  const deleteItem = async (id: string, table: string) => {
    if (!confirm("Hapus data ini?")) return;
    await supabase.from(table).update({ is_active: false }).eq('id', id);
    if (activeTab === 'products') loadProducts();
    else if (activeTab === 'customers') loadCustomers();
    else loadExpenses();
    toast({ title: "Data Dihapus" });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    if (activeTab === 'products') {
      await supabase.from(TABLE_NAMES.PRODUCT_MASTER).update({ 
        product_name: editName, 
        price_per_kg: parseInt(editValue), 
        category: editCat,
        unit_type: editUnit // Update Satuan
      }).eq('id', editingId);
      loadProducts();
    } else if (activeTab === 'customers') {
      await supabase.from('customer_master').update({ customer_name: editName, default_quantity: parseInt(editValue) }).eq('id', editingId);
      loadCustomers();
    } else {
      await supabase.from('expense_categories').update({ name: editName, default_amount: parseInt(editValue) }).eq('id', editingId);
      loadExpenses();
    }
    setEditingId(null); setSaving(false);
    toast({ title: "Data Diperbarui" });
  };

  const formatRp = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div><h1 className="text-3xl font-bold">Data Master</h1><p className="text-gray-500">Kelola Produk, Pelanggan & Operasional</p></div>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button onClick={() => setActiveTab("products")} className={`px-4 py-2 rounded text-sm font-medium ${activeTab === "products" ? "bg-white text-green-700 shadow" : "text-gray-500"}`}>Produk</button>
            <button onClick={() => setActiveTab("customers")} className={`px-4 py-2 rounded text-sm font-medium ${activeTab === "customers" ? "bg-white text-blue-700 shadow" : "text-gray-500"}`}>Pelanggan</button>
            <button onClick={() => setActiveTab("expenses")} className={`px-4 py-2 rounded text-sm font-medium ${activeTab === "expenses" ? "bg-white text-orange-700 shadow" : "text-gray-500"}`}>Operasional</button>
          </div>
        </div>

        {activeTab === "products" && (
          <Card className="border-t-4 border-t-green-500">
            <CardHeader><CardTitle className="flex gap-2"><Plus className="h-5 w-5"/> Tambah Produk</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                <div className="md:col-span-2"><Input placeholder="Nama Produk" value={prodName} onChange={e => setProdName(e.target.value)} /></div>
                
                {/* Pilih Kategori */}
                <Select value={prodCat} onValueChange={setProdCat}>
                  <SelectTrigger><SelectValue placeholder="Kategori" /></SelectTrigger>
                  <SelectContent><SelectItem value="utuh">Ayam Utuh</SelectItem><SelectItem value="jeroan">Jeroan</SelectItem></SelectContent>
                </Select>

                {/* Pilih Satuan (BARU) */}
                <Select value={prodUnit} onValueChange={setProdUnit}>
                  <SelectTrigger><SelectValue placeholder="Satuan" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">Kg (Kiloan)</SelectItem>
                    <SelectItem value="pcs">Pcs (Satuan)</SelectItem>
                  </SelectContent>
                </Select>

                <Input type="number" placeholder="Harga" value={prodPrice} onChange={e => setProdPrice(e.target.value)} />
                <Button onClick={addProduct} disabled={saving} className="md:col-span-5 bg-green-600">Simpan</Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Satuan</TableHead> {/* Kolom Baru */}
                    <TableHead className="text-right">Harga</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{products.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>{editingId === p.id ? <Input value={editName} onChange={e => setEditName(e.target.value)}/> : p.product_name}</TableCell>
                    
                    {/* Edit Kategori */}
                    <TableCell>{editingId === p.id ? 
                      <Select value={editCat} onValueChange={setEditCat}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="utuh">Ayam Utuh</SelectItem><SelectItem value="jeroan">Jeroan</SelectItem></SelectContent></Select> 
                      : <Badge variant={p.category==='utuh'?'default':'secondary'}>{p.category}</Badge>}
                    </TableCell>

                    {/* Edit Satuan */}
                    <TableCell>{editingId === p.id ? 
                      <Select value={editUnit} onValueChange={setEditUnit}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="kg">Kg</SelectItem><SelectItem value="pcs">Pcs</SelectItem></SelectContent></Select> 
                      : <div className="flex items-center gap-1 text-gray-600"><Scale className="h-3 w-3"/> {p.unit_type || 'kg'}</div>}
                    </TableCell>

                    <TableCell className="text-right">{editingId === p.id ? <Input value={editValue} onChange={e => setEditValue(e.target.value)}/> : formatRp(p.price_per_kg)}</TableCell>
                    
                    <TableCell className="text-center">
                      {editingId === p.id ? <Button size="sm" onClick={saveEdit}><Save className="h-4 w-4"/></Button> : 
                      <div className="flex justify-center gap-2">
                        <Button size="sm" variant="ghost" onClick={() => {
                          setEditingId(p.id); 
                          setEditName(p.product_name); 
                          setEditValue(p.price_per_kg.toString()); 
                          setEditCat(p.category);
                          setEditUnit(p.unit_type || 'kg'); // Load unit saat edit
                        }}><Edit className="h-4 w-4"/></Button>
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteItem(p.id, TABLE_NAMES.PRODUCT_MASTER)}><Trash2 className="h-4 w-4"/></Button>
                      </div>}
                    </TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Tab Pelanggan (Tidak berubah) */}
        {activeTab === "customers" && (
          <Card className="border-t-4 border-t-blue-500">
            <CardHeader><CardTitle className="flex gap-2"><Users className="h-5 w-5"/> Tambah Pelanggan</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <Input placeholder="Nama Pelanggan" value={custName} onChange={e => setCustName(e.target.value)} />
                <Input type="number" placeholder="Default Ekor" value={custQty} onChange={e => setCustQty(e.target.value)} />
                <Button onClick={addCustomer} disabled={saving} className="bg-blue-600">Simpan</Button>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Default</TableHead><TableHead className="text-center">Aksi</TableHead></TableRow></TableHeader>
                <TableBody>{customers.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>{editingId === c.id ? <Input value={editName} onChange={e => setEditName(e.target.value)}/> : c.customer_name}</TableCell>
                    <TableCell>{editingId === c.id ? <Input value={editValue} onChange={e => setEditValue(e.target.value)}/> : c.default_quantity}</TableCell>
                    <TableCell className="text-center">{editingId === c.id ? <Button size="sm" onClick={saveEdit}><Save className="h-4 w-4"/></Button> : <div className="flex justify-center gap-2"><Button size="sm" variant="ghost" onClick={() => {setEditingId(c.id); setEditName(c.customer_name); setEditValue(c.default_quantity.toString())}}><Edit className="h-4 w-4"/></Button><Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteItem(c.id, 'customer_master')}><Trash2 className="h-4 w-4"/></Button></div>}</TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Tab Operasional (Tidak berubah) */}
        {activeTab === "expenses" && (
          <Card className="border-t-4 border-t-orange-500">
            <CardHeader><CardTitle className="flex gap-2"><WalletCards className="h-5 w-5"/> Kategori Operasional</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="md:col-span-2"><Input placeholder="Nama Item (ex: Rokok, Gaji)" value={expName} onChange={e => setExpName(e.target.value)} /></div>
                <div><Input type="number" placeholder="Harga Default (Rp)" value={expAmount} onChange={e => setExpAmount(e.target.value)} /></div>
                <Button onClick={addExpenseCat} disabled={saving} className="bg-orange-600">Simpan</Button>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Nama Kategori</TableHead><TableHead className="text-right">Harga Default</TableHead><TableHead className="text-center">Aksi</TableHead></TableRow></TableHeader>
                <TableBody>{expenseCategories.map(e => (
                  <TableRow key={e.id}>
                    <TableCell>{editingId === e.id ? <Input value={editName} onChange={e => setEditName(e.target.value)}/> : e.name}</TableCell>
                    <TableCell className="text-right">{editingId === e.id ? <Input value={editValue} onChange={e => setEditValue(e.target.value)}/> : formatRp(e.default_amount || 0)}</TableCell>
                    <TableCell className="text-center">{editingId === e.id ? <Button size="sm" onClick={saveEdit}><Save className="h-4 w-4"/></Button> : <div className="flex justify-center gap-2"><Button size="sm" variant="ghost" onClick={() => {setEditingId(e.id); setEditName(e.name); setEditValue((e.default_amount || 0).toString())}}><Edit className="h-4 w-4"/></Button><Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteItem(e.id, 'expense_categories')}><Trash2 className="h-4 w-4"/></Button></div>}</TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default DataMaster;
