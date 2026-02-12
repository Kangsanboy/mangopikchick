import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Package, Users, Wallet, Trash2, Plus, Loader2, UserCircle, Edit } from "lucide-react";
import { TABLE_NAMES } from "@/types/database";

// Interface
interface Product { id: string; product_name: string; price_per_kg: number; category: string; unit_type: string; }
interface Employee { id: string; name: string; daily_base_salary: number; overtime_rate: number; }

const DataMaster = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"produk" | "pelanggan" | "karyawan" | "biaya">("produk");
  const [loading, setLoading] = useState(false);

  // Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]); 
  const [expenseCats, setExpenseCats] = useState<any[]>([]);

  // Form States - ADD
  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdCat, setNewProdCat] = useState("utuh");
  const [newProdUnit, setNewProdUnit] = useState("kg");

  const [newCustName, setNewCustName] = useState("");
  
  // Form Karyawan Baru
  const [newEmpName, setNewEmpName] = useState(""); 
  const [newEmpBase, setNewEmpBase] = useState("");
  const [newEmpOvertime, setNewEmpOvertime] = useState("");

  const [newExpName, setNewExpName] = useState("");
  const [newExpDefault, setNewExpDefault] = useState("");

  // Edit State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEmpEditOpen, setIsEmpEditOpen] = useState(false); // Modal Edit Karyawan
  const [editData, setEditData] = useState<Product | null>(null);
  const [editEmpData, setEditEmpData] = useState<Employee | null>(null);

  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    setLoading(true);
    const { data: pData } = await supabase.from(TABLE_NAMES.PRODUCT_MASTER).select('*').eq('is_active', true).order('product_name');
    const { data: cData } = await supabase.from('customer_master').select('*').eq('is_active', true).order('customer_name');
    const { data: eData } = await supabase.from('employees').select('*').eq('is_active', true).order('name'); 
    const { data: exData } = await supabase.from('expense_categories').select('*').eq('is_active', true).order('name');
    
    setProducts(pData || []);
    setCustomers(cData || []);
    setEmployees(eData || []);
    setExpenseCats(exData || []);
    setLoading(false);
  };

  // --- ACTIONS PRODUK ---
  const addProduct = async () => {
    if (!newProdName || !newProdPrice) return;
    await supabase.from(TABLE_NAMES.PRODUCT_MASTER).insert({ product_name: newProdName, price_per_kg: parseInt(newProdPrice), category: newProdCat, unit_type: newProdUnit });
    toast({ title: "Produk Ditambahkan" }); setNewProdName(""); setNewProdPrice(""); loadAllData();
  };

  const updateProduct = async () => {
    if (!editData) return;
    setLoading(true);
    await supabase.from(TABLE_NAMES.PRODUCT_MASTER).update({ product_name: editData.product_name, price_per_kg: editData.price_per_kg, category: editData.category, unit_type: editData.unit_type }).eq('id', editData.id);
    setIsEditOpen(false); loadAllData(); setLoading(false);
  };

  // --- ACTIONS KARYAWAN (BARU) ---
  const addEmployee = async () => {
    if (!newEmpName) return;
    await supabase.from('employees').insert({ 
      name: newEmpName,
      daily_base_salary: parseInt(newEmpBase) || 0,
      overtime_rate: parseInt(newEmpOvertime) || 0
    });
    toast({ title: "Karyawan Ditambahkan" });
    setNewEmpName(""); setNewEmpBase(""); setNewEmpOvertime(""); loadAllData();
  };

  const updateEmployee = async () => {
    if (!editEmpData) return;
    setLoading(true);
    await supabase.from('employees').update({ 
      name: editEmpData.name,
      daily_base_salary: editEmpData.daily_base_salary,
      overtime_rate: editEmpData.overtime_rate
    }).eq('id', editEmpData.id);
    setIsEmpEditOpen(false); loadAllData(); setLoading(false);
    toast({ title: "Data Karyawan Diupdate" });
  };

  // --- ACTIONS UMUM ---
  const addCustomer = async () => {
    if (!newCustName) return;
    await supabase.from('customer_master').insert({ customer_name: newCustName });
    toast({ title: "Pelanggan Ditambahkan" }); setNewCustName(""); loadAllData();
  };

  const addExpenseCat = async () => {
    if (!newExpName) return;
    await supabase.from('expense_categories').insert({ name: newExpName, default_amount: newExpDefault ? parseInt(newExpDefault) : null });
    toast({ title: "Kategori Ditambahkan" }); setNewExpName(""); setNewExpDefault(""); loadAllData();
  };

  const handleDelete = async (table: string, id: string) => {
    if(!confirm("Hapus data ini?")) return;
    await supabase.from(table).update({ is_active: false }).eq('id', id);
    loadAllData();
  };

  const formatRp = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  return (
    <Layout>
      <div className="space-y-6 pb-20">
        <h1 className="text-3xl font-bold text-gray-900">Data Master</h1>
        <div className="flex flex-wrap gap-2 bg-white p-2 rounded-lg shadow-sm border">
          <Button variant={activeTab === "produk" ? "default" : "ghost"} onClick={() => setActiveTab("produk")}><Package className="mr-2 h-4 w-4"/> Produk</Button>
          <Button variant={activeTab === "pelanggan" ? "default" : "ghost"} onClick={() => setActiveTab("pelanggan")}><Users className="mr-2 h-4 w-4"/> Pelanggan</Button>
          <Button variant={activeTab === "karyawan" ? "default" : "ghost"} onClick={() => setActiveTab("karyawan")} className={activeTab==="karyawan" ? "bg-indigo-600 hover:bg-indigo-700" : ""}><UserCircle className="mr-2 h-4 w-4"/> Karyawan</Button>
          <Button variant={activeTab === "biaya" ? "default" : "ghost"} onClick={() => setActiveTab("biaya")} className={activeTab==="biaya" ? "bg-orange-600 hover:bg-orange-700" : ""}><Wallet className="mr-2 h-4 w-4"/> Biaya</Button>
        </div>

        <Card>
          <CardHeader><CardTitle>Form Kelola Data</CardTitle></CardHeader>
          <CardContent>
            {activeTab === "produk" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-gray-50 p-4 rounded-lg border">
                  <div className="md:col-span-2"><Label>Nama Produk</Label><Input value={newProdName} onChange={e => setNewProdName(e.target.value)} placeholder="Contoh: Ayam Hidup Besar" className="bg-white" /></div>
                  <div><Label>Harga Jual</Label><Input type="number" value={newProdPrice} onChange={e => setNewProdPrice(e.target.value)} placeholder="0" className="bg-white" /></div>
                  <div><Label>Tipe & Satuan</Label><div className="flex gap-2"><Select value={newProdCat} onValueChange={setNewProdCat}><SelectTrigger className="bg-white"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="utuh">Utuh</SelectItem><SelectItem value="parting">Parting</SelectItem></SelectContent></Select><Select value={newProdUnit} onValueChange={setNewProdUnit}><SelectTrigger className="bg-white"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="kg">Kg</SelectItem><SelectItem value="pcs">Pcs</SelectItem></SelectContent></Select></div></div>
                  <Button onClick={addProduct}><Plus className="mr-2 h-4 w-4"/> Tambah</Button>
                </div>
                <Table><TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Harga</TableHead><TableHead>Tipe</TableHead><TableHead>Satuan</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
                  <TableBody>{products.map(p => (<TableRow key={p.id}><TableCell className="font-bold">{p.product_name}</TableCell><TableCell>{formatRp(p.price_per_kg)}</TableCell><TableCell><Badge variant="outline">{p.category}</Badge></TableCell><TableCell>{p.unit_type}</TableCell><TableCell className="text-right"><div className="flex justify-end gap-2"><Button variant="ghost" size="sm" className="text-blue-500 bg-blue-50" onClick={() => {setEditData({...p}); setIsEditOpen(true)}}><Edit className="h-4 w-4"/></Button><Button variant="ghost" size="sm" className="text-red-500 bg-red-50" onClick={() => handleDelete(TABLE_NAMES.PRODUCT_MASTER, p.id)}><Trash2 className="h-4 w-4"/></Button></div></TableCell></TableRow>))}</TableBody>
                </Table>
              </div>
            )}

            {activeTab === "pelanggan" && (
              <div className="space-y-6">
                <div className="flex gap-4 items-end bg-gray-50 p-4 rounded-lg"><div className="flex-1"><Label>Nama Pelanggan</Label><Input value={newCustName} onChange={e => setNewCustName(e.target.value)} placeholder="Nama Pembeli..." /></div><Button onClick={addCustomer}><Plus className="mr-2 h-4 w-4"/> Tambah</Button></div>
                <Table><TableHeader><TableRow><TableHead>Nama</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader><TableBody>{customers.map(c => (<TableRow key={c.id}><TableCell className="font-bold">{c.customer_name}</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete('customer_master', c.id)}><Trash2 className="h-4 w-4"/></Button></TableCell></TableRow>))}</TableBody></Table>
              </div>
            )}

            {/* TAB KARYAWAN DIPERBAIKI */}
            {activeTab === "karyawan" && (
              <div className="space-y-6 animate-in fade-in">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                  <div className="md:col-span-1"><Label>Nama Karyawan</Label><Input value={newEmpName} onChange={e => setNewEmpName(e.target.value)} className="bg-white" /></div>
                  <div><Label>Gaji Pokok (Harian)</Label><Input type="number" value={newEmpBase} onChange={e => setNewEmpBase(e.target.value)} placeholder="0" className="bg-white" /></div>
                  <div><Label>Lembur Full (Hari)</Label><Input type="number" value={newEmpOvertime} onChange={e => setNewEmpOvertime(e.target.value)} placeholder="0" className="bg-white" /></div>
                  <Button onClick={addEmployee} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="mr-2 h-4 w-4"/> Simpan</Button>
                </div>
                <Table><TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Gaji Pokok</TableHead><TableHead>Lembur (Full)</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
                  <TableBody>{employees.length > 0 ? employees.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="font-bold text-indigo-900">{e.name}</TableCell>
                      <TableCell>{formatRp(e.daily_base_salary)}</TableCell>
                      <TableCell>{formatRp(e.overtime_rate)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" className="text-blue-500 bg-blue-50" onClick={() => {setEditEmpData({...e}); setIsEmpEditOpen(true)}}><Edit className="h-4 w-4"/></Button>
                          <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete('employees', e.id)}><Trash2 className="h-4 w-4"/></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : <TableRow><TableCell colSpan={4} className="text-center text-gray-400">Belum ada data karyawan</TableCell></TableRow>}</TableBody>
                </Table>
              </div>
            )}

            {activeTab === "biaya" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-orange-50 p-4 rounded-lg border border-orange-100"><div><Label>Nama Kategori</Label><Input value={newExpName} onChange={e => setNewExpName(e.target.value)} placeholder="Misal: Bensin" /></div><div><Label>Default Nominal</Label><Input type="number" value={newExpDefault} onChange={e => setNewExpDefault(e.target.value)} placeholder="0" /></div><Button onClick={addExpenseCat} className="bg-orange-600 hover:bg-orange-700"><Plus className="mr-2 h-4 w-4"/> Tambah</Button></div>
                <Table><TableHeader><TableRow><TableHead>Kategori</TableHead><TableHead>Default</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader><TableBody>{expenseCats.map(e => (<TableRow key={e.id}><TableCell className="font-bold">{e.name}</TableCell><TableCell>{e.default_amount ? formatRp(e.default_amount) : '-'}</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete('expense_categories', e.id)}><Trash2 className="h-4 w-4"/></Button></TableCell></TableRow>))}</TableBody></Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* DIALOG EDIT PRODUK */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}><DialogContent><DialogHeader><DialogTitle>Edit Produk</DialogTitle></DialogHeader>
            {editData && (<div className="space-y-4 py-2"><div><Label>Nama</Label><Input value={editData.product_name} onChange={(e) => setEditData({ ...editData, product_name: e.target.value })} /></div><div><Label>Harga</Label><Input type="number" value={editData.price_per_kg} onChange={(e) => setEditData({ ...editData, price_per_kg: parseInt(e.target.value) || 0 })} /></div><div className="grid grid-cols-2 gap-4"><div><Label>Kategori</Label><Select value={editData.category} onValueChange={(val) => setEditData({ ...editData, category: val })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="utuh">Utuh</SelectItem><SelectItem value="parting">Parting</SelectItem></SelectContent></Select></div><div><Label>Satuan</Label><Select value={editData.unit_type} onValueChange={(val) => setEditData({ ...editData, unit_type: val })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="kg">Kg</SelectItem><SelectItem value="pcs">Pcs</SelectItem></SelectContent></Select></div></div></div>)}
            <DialogFooter><Button onClick={updateProduct} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : "Simpan"}</Button></DialogFooter>
        </DialogContent></Dialog>

        {/* DIALOG EDIT KARYAWAN (BARU) */}
        <Dialog open={isEmpEditOpen} onOpenChange={setIsEmpEditOpen}><DialogContent><DialogHeader><DialogTitle>Edit Karyawan</DialogTitle></DialogHeader>
            {editEmpData && (
              <div className="space-y-4 py-2">
                <div><Label>Nama Karyawan</Label><Input value={editEmpData.name} onChange={(e) => setEditEmpData({ ...editEmpData, name: e.target.value })} /></div>
                <div><Label>Gaji Pokok (Harian)</Label><Input type="number" value={editEmpData.daily_base_salary} onChange={(e) => setEditEmpData({ ...editEmpData, daily_base_salary: parseInt(e.target.value) || 0 })} /></div>
                <div><Label>Gaji Lembur (Rate Full Day)</Label><Input type="number" value={editEmpData.overtime_rate} onChange={(e) => setEditEmpData({ ...editEmpData, overtime_rate: parseInt(e.target.value) || 0 })} /></div>
                <p className="text-xs text-gray-500 bg-gray-100 p-2 rounded">Note: Gaji lembur setengah hari akan otomatis dihitung 50% dari harga Full.</p>
              </div>
            )}
            <DialogFooter><Button onClick={updateEmployee} disabled={loading} className="bg-indigo-600">{loading ? <Loader2 className="animate-spin" /> : "Simpan Perubahan"}</Button></DialogFooter>
        </DialogContent></Dialog>
        
      </div>
    </Layout>
  );
};

export default DataMaster;
