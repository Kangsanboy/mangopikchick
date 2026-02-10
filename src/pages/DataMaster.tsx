import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database, Package, Users, Wallet, Trash2, Plus, Loader2, UserCircle } from "lucide-react";
import { TABLE_NAMES } from "@/types/database";

const DataMaster = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"produk" | "pelanggan" | "karyawan" | "biaya">("produk");
  const [loading, setLoading] = useState(false);

  // Data States
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]); // New State Karyawan
  const [expenseCats, setExpenseCats] = useState<any[]>([]);

  // Form States
  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdCat, setNewProdCat] = useState("utuh");
  const [newProdUnit, setNewProdUnit] = useState("kg");

  const [newCustName, setNewCustName] = useState("");
  
  const [newEmpName, setNewEmpName] = useState(""); // Form Karyawan

  const [newExpName, setNewExpName] = useState("");
  const [newExpDefault, setNewExpDefault] = useState("");

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    const { data: pData } = await supabase.from(TABLE_NAMES.PRODUCT_MASTER).select('*').eq('is_active', true).order('product_name');
    const { data: cData } = await supabase.from('customer_master').select('*').eq('is_active', true).order('customer_name');
    const { data: eData } = await supabase.from('employees').select('*').eq('is_active', true).order('name'); // Load Karyawan
    const { data: exData } = await supabase.from('expense_categories').select('*').eq('is_active', true).order('name');
    
    setProducts(pData || []);
    setCustomers(cData || []);
    setEmployees(eData || []);
    setExpenseCats(exData || []);
    setLoading(false);
  };

  // --- ACTIONS ---

  const addProduct = async () => {
    if (!newProdName || !newProdPrice) return;
    await supabase.from(TABLE_NAMES.PRODUCT_MASTER).insert({
      product_name: newProdName,
      price_per_kg: parseInt(newProdPrice),
      category: newProdCat,
      unit_type: newProdUnit
    });
    toast({ title: "Produk Ditambahkan" });
    setNewProdName(""); setNewProdPrice(""); loadAllData();
  };

  const addCustomer = async () => {
    if (!newCustName) return;
    await supabase.from('customer_master').insert({ customer_name: newCustName });
    toast({ title: "Pelanggan Ditambahkan" });
    setNewCustName(""); loadAllData();
  };

  // TAMBAH KARYAWAN (BARU)
  const addEmployee = async () => {
    if (!newEmpName) return;
    await supabase.from('employees').insert({ name: newEmpName });
    toast({ title: "Karyawan Ditambahkan" });
    setNewEmpName(""); loadAllData();
  };

  const addExpenseCat = async () => {
    if (!newExpName) return;
    await supabase.from('expense_categories').insert({
      name: newExpName,
      default_amount: newExpDefault ? parseInt(newExpDefault) : null
    });
    toast({ title: "Kategori Biaya Ditambahkan" });
    setNewExpName(""); setNewExpDefault(""); loadAllData();
  };

  // Delete Actions (Soft Delete)
  const handleDelete = async (table: string, id: string) => {
    if(!confirm("Hapus data ini?")) return;
    await supabase.from(table).update({ is_active: false }).eq('id', id);
    loadAllData();
  };

  return (
    <Layout>
      <div className="space-y-6 pb-20">
        <h1 className="text-3xl font-bold text-gray-900">Data Master</h1>
        
        {/* TAB NAVIGATION */}
        <div className="flex flex-wrap gap-2 bg-white p-2 rounded-lg shadow-sm border">
          <Button variant={activeTab === "produk" ? "default" : "ghost"} onClick={() => setActiveTab("produk")}><Package className="mr-2 h-4 w-4"/> Produk Ayam</Button>
          <Button variant={activeTab === "pelanggan" ? "default" : "ghost"} onClick={() => setActiveTab("pelanggan")}><Users className="mr-2 h-4 w-4"/> Pelanggan</Button>
          <Button variant={activeTab === "karyawan" ? "default" : "ghost"} onClick={() => setActiveTab("karyawan")} className={activeTab==="karyawan" ? "bg-indigo-600 hover:bg-indigo-700" : ""}><UserCircle className="mr-2 h-4 w-4"/> Karyawan</Button>
          <Button variant={activeTab === "biaya" ? "default" : "ghost"} onClick={() => setActiveTab("biaya")} className={activeTab==="biaya" ? "bg-orange-600 hover:bg-orange-700" : ""}><Wallet className="mr-2 h-4 w-4"/> Kategori Biaya</Button>
        </div>

        {/* CONTENT */}
        <Card>
          <CardHeader>
            <CardTitle>
              {activeTab === "produk" && "Kelola Produk Jualan"}
              {activeTab === "pelanggan" && "Kelola Data Pelanggan"}
              {activeTab === "karyawan" && "Kelola Data Karyawan"}
              {activeTab === "biaya" && "Kelola Kategori Operasional"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            
            {/* 1. PRODUK */}
            {activeTab === "produk" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-gray-50 p-4 rounded-lg">
                  <div className="md:col-span-2"><Label>Nama Produk</Label><Input value={newProdName} onChange={e => setNewProdName(e.target.value)} placeholder="Contoh: Ayam Hidup Besar" /></div>
                  <div><Label>Harga Dasar</Label><Input type="number" value={newProdPrice} onChange={e => setNewProdPrice(e.target.value)} placeholder="0" /></div>
                  <div><Label>Satuan</Label><Select value={newProdUnit} onValueChange={setNewProdUnit}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="kg">Kiloan (Kg)</SelectItem><SelectItem value="pcs">Satuan (Pcs)</SelectItem></SelectContent></Select></div>
                  <Button onClick={addProduct}><Plus className="mr-2 h-4 w-4"/> Tambah</Button>
                </div>
                <Table><TableHeader><TableRow><TableHead>Nama Produk</TableHead><TableHead>Harga/Satuan</TableHead><TableHead>Tipe</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
                  <TableBody>{products.map(p => (
                    <TableRow key={p.id}><TableCell className="font-bold">{p.product_name}</TableCell><TableCell>Rp {p.price_per_kg.toLocaleString()}/{p.unit_type}</TableCell><TableCell>{p.category}</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(TABLE_NAMES.PRODUCT_MASTER, p.id)}><Trash2 className="h-4 w-4"/></Button></TableCell></TableRow>
                  ))}</TableBody>
                </Table>
              </div>
            )}

            {/* 2. PELANGGAN */}
            {activeTab === "pelanggan" && (
              <div className="space-y-6">
                <div className="flex gap-4 items-end bg-gray-50 p-4 rounded-lg">
                  <div className="flex-1"><Label>Nama Pelanggan</Label><Input value={newCustName} onChange={e => setNewCustName(e.target.value)} placeholder="Nama Pembeli..." /></div>
                  <Button onClick={addCustomer}><Plus className="mr-2 h-4 w-4"/> Tambah</Button>
                </div>
                <Table><TableHeader><TableRow><TableHead>Nama Pelanggan</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
                  <TableBody>{customers.map(c => (
                    <TableRow key={c.id}><TableCell className="font-bold">{c.customer_name}</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete('customer_master', c.id)}><Trash2 className="h-4 w-4"/></Button></TableCell></TableRow>
                  ))}</TableBody>
                </Table>
              </div>
            )}

            {/* 3. KARYAWAN (NEW) */}
            {activeTab === "karyawan" && (
              <div className="space-y-6 animate-in fade-in">
                <div className="flex gap-4 items-end bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                  <div className="flex-1"><Label>Nama Karyawan</Label><Input value={newEmpName} onChange={e => setNewEmpName(e.target.value)} placeholder="Nama Karyawan..." className="bg-white" /></div>
                  <Button onClick={addEmployee} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="mr-2 h-4 w-4"/> Tambah Karyawan</Button>
                </div>
                <Table><TableHeader><TableRow><TableHead>Nama Karyawan</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
                  <TableBody>{employees.length > 0 ? employees.map(e => (
                    <TableRow key={e.id}><TableCell className="font-bold text-indigo-900">{e.name}</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete('employees', e.id)}><Trash2 className="h-4 w-4"/></Button></TableCell></TableRow>
                  )) : <TableRow><TableCell colSpan={2} className="text-center text-gray-400">Belum ada data karyawan</TableCell></TableRow>}</TableBody>
                </Table>
              </div>
            )}

            {/* 4. BIAYA */}
            {activeTab === "biaya" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-orange-50 p-4 rounded-lg border border-orange-100">
                  <div><Label>Nama Kategori</Label><Input value={newExpName} onChange={e => setNewExpName(e.target.value)} placeholder="Misal: Bensin" /></div>
                  <div><Label>Default Nominal (Opsional)</Label><Input type="number" value={newExpDefault} onChange={e => setNewExpDefault(e.target.value)} placeholder="0" /></div>
                  <Button onClick={addExpenseCat} className="bg-orange-600 hover:bg-orange-700"><Plus className="mr-2 h-4 w-4"/> Tambah</Button>
                </div>
                <Table><TableHeader><TableRow><TableHead>Kategori Biaya</TableHead><TableHead>Default Rp</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
                  <TableBody>{expenseCats.map(e => (
                    <TableRow key={e.id}><TableCell className="font-bold">{e.name}</TableCell><TableCell>{e.default_amount ? `Rp ${e.default_amount.toLocaleString()}` : '-'}</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete('expense_categories', e.id)}><Trash2 className="h-4 w-4"/></Button></TableCell></TableRow>
                  ))}</TableBody>
                </Table>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default DataMaster;
