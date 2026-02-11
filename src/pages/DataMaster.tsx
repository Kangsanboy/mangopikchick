import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database, Package, Users, Wallet, Trash2, Plus, Loader2, UserCircle, Edit } from "lucide-react";
import { TABLE_NAMES } from "@/types/database";

// Interface untuk Produk biar gampang di-edit
interface Product {
  id: string;
  product_name: string;
  price_per_kg: number;
  category: string;
  unit_type: string;
}

const DataMaster = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"produk" | "pelanggan" | "karyawan" | "biaya">("produk");
  const [loading, setLoading] = useState(false);

  // Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]); 
  const [expenseCats, setExpenseCats] = useState<any[]>([]);

  // Form States - ADD
  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdCat, setNewProdCat] = useState("utuh"); // Default Utuh
  const [newProdUnit, setNewProdUnit] = useState("kg");

  const [newCustName, setNewCustName] = useState("");
  const [newEmpName, setNewEmpName] = useState(""); 
  const [newExpName, setNewExpName] = useState("");
  const [newExpDefault, setNewExpDefault] = useState("");

  // Edit State (Khusus Produk)
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState<Product | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

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

  // --- ACTIONS ---

  const addProduct = async () => {
    if (!newProdName || !newProdPrice) return;
    await supabase.from(TABLE_NAMES.PRODUCT_MASTER).insert({
      product_name: newProdName,
      price_per_kg: parseInt(newProdPrice),
      category: newProdCat, // Masukkan Kategori
      unit_type: newProdUnit
    });
    toast({ title: "Produk Ditambahkan" });
    setNewProdName(""); setNewProdPrice(""); loadAllData();
  };

  const updateProduct = async () => {
    if (!editData) return;
    setLoading(true);
    const { error } = await supabase.from(TABLE_NAMES.PRODUCT_MASTER).update({
      product_name: editData.product_name,
      price_per_kg: editData.price_per_kg,
      category: editData.category,
      unit_type: editData.unit_type
    }).eq('id', editData.id);

    if (!error) {
      toast({ title: "Produk Diupdate", description: "Harga dan data berhasil diubah." });
      setIsEditOpen(false);
      loadAllData();
    } else {
      toast({ title: "Gagal Update", variant: "destructive" });
    }
    setLoading(false);
  };

  const openEditModal = (prod: Product) => {
    setEditData({ ...prod });
    setIsEditOpen(true);
  };

  const addCustomer = async () => {
    if (!newCustName) return;
    await supabase.from('customer_master').insert({ customer_name: newCustName });
    toast({ title: "Pelanggan Ditambahkan" });
    setNewCustName(""); loadAllData();
  };

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
              {activeTab === "produk" && "Kelola Produk & Harga"}
              {activeTab === "pelanggan" && "Kelola Data Pelanggan"}
              {activeTab === "karyawan" && "Kelola Data Karyawan"}
              {activeTab === "biaya" && "Kelola Kategori Operasional"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            
            {/* 1. PRODUK */}
            {activeTab === "produk" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-gray-50 p-4 rounded-lg border">
                  <div className="md:col-span-2">
                    <Label>Nama Produk</Label>
                    <Input value={newProdName} onChange={e => setNewProdName(e.target.value)} placeholder="Contoh: Ayam Hidup Besar" className="bg-white" />
                  </div>
                  <div>
                    <Label>Harga Jual</Label>
                    <Input type="number" value={newProdPrice} onChange={e => setNewProdPrice(e.target.value)} placeholder="0" className="bg-white" />
                  </div>
                  <div>
                    <Label>Tipe & Satuan</Label>
                    <div className="flex gap-2">
                       {/* KEMBALI LAGI: INPUT TIPE */}
                       <Select value={newProdCat} onValueChange={setNewProdCat}>
                         <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger>
                         <SelectContent>
                           <SelectItem value="utuh">Utuh</SelectItem>
                           <SelectItem value="parting">Parting/Jeroan</SelectItem>
                         </SelectContent>
                       </Select>
                       <Select value={newProdUnit} onValueChange={setNewProdUnit}>
                         <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger>
                         <SelectContent>
                           <SelectItem value="kg">Kg</SelectItem>
                           <SelectItem value="pcs">Pcs</SelectItem>
                         </SelectContent>
                       </Select>
                    </div>
                  </div>
                  <Button onClick={addProduct}><Plus className="mr-2 h-4 w-4"/> Tambah</Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Produk</TableHead>
                      <TableHead>Harga</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Satuan</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-bold">{p.product_name}</TableCell>
                      <TableCell>Rp {p.price_per_kg.toLocaleString()}</TableCell>
                      <TableCell><Badge variant="outline">{p.category}</Badge></TableCell>
                      <TableCell>{p.unit_type}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {/* TOMBOL EDIT */}
                          <Button variant="ghost" size="sm" className="text-blue-500 bg-blue-50" onClick={() => openEditModal(p)}>
                            <Edit className="h-4 w-4"/>
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500 bg-red-50" onClick={() => handleDelete(TABLE_NAMES.PRODUCT_MASTER, p.id)}>
                            <Trash2 className="h-4 w-4"/>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
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

            {/* 3. KARYAWAN */}
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

        {/* DIALOG EDIT PRODUK */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Produk</DialogTitle>
            </DialogHeader>
            {editData && (
              <div className="space-y-4 py-2">
                <div>
                  <Label>Nama Produk</Label>
                  <Input value={editData.product_name} onChange={(e) => setEditData({ ...editData, product_name: e.target.value })} />
                </div>
                <div>
                  <Label>Harga per Kg/Pcs</Label>
                  <Input type="number" value={editData.price_per_kg} onChange={(e) => setEditData({ ...editData, price_per_kg: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Kategori (Tipe)</Label>
                    <Select value={editData.category} onValueChange={(val) => setEditData({ ...editData, category: val })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utuh">Utuh</SelectItem>
                        <SelectItem value="parting">Parting/Jeroan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Satuan</Label>
                    <Select value={editData.unit_type} onValueChange={(val) => setEditData({ ...editData, unit_type: val })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">Kg</SelectItem>
                        <SelectItem value="pcs">Pcs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={updateProduct} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : "Simpan Perubahan"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
      </div>
    </Layout>
  );
};

export default DataMaster;
