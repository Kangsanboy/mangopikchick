import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator"; 
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Loader2, Trash2, Wallet, CalendarDays, User } from "lucide-react";

interface ExpenseData {
  id: string;
  category_name: string;
  note: string;
  amount: number;
  employee_id?: string;
  employees?: { name: string }; // Join ke tabel employees
}

interface Employee {
  id: string;
  name: string;
}

const Operasional = () => {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }));
  const [loading, setLoading] = useState(false);
  
  const [categories, setCategories] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]); // Data dari tabel employees

  const [catName, setCatName] = useState("");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");

  useEffect(() => { 
    loadCategories(); 
    loadEmployees();
  }, []);
  
  useEffect(() => { loadExpenses(); }, [selectedDate]);

  const loadCategories = async () => {
    const { data } = await supabase.from('expense_categories').select('*').eq('is_active', true).order('name');
    if (data) setCategories(data);
  };

  // LOAD DARI TABEL EMPLOYEES (BUKAN CUSTOMER LAGI)
  const loadEmployees = async () => {
    const { data } = await supabase.from('employees').select('id, name').eq('is_active', true).order('name');
    if (data) setEmployees(data);
  };

  const loadExpenses = async () => {
    const { data, error } = await supabase
      .from('operational_expenses')
      .select('*, employees(name)') // Join ke tabel employees
      .eq('date', selectedDate)
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      setExpenses(data);
    }
  };

  const handleCategoryChange = (name: string) => {
    setCatName(name);
    setSelectedEmployee("");
    
    const selected = categories.find(c => c.name === name);
    if (selected && selected.default_amount) {
      setAmount(selected.default_amount.toString());
    } else {
      setAmount("");
    }
  };

  const addExpense = async () => {
    if (!catName || !amount) { 
      toast({ title: "Error", description: "Lengkapi data kategori dan nominal!", variant: "destructive" }); 
      return; 
    }

    const isSalaryInput = catName.toLowerCase().includes("gaji") || catName.toLowerCase().includes("bonus");
    if (isSalaryInput && !selectedEmployee) {
      toast({ title: "Error", description: "Pilih karyawan untuk kategori Gaji!", variant: "destructive" });
      return;
    }

    setLoading(true);
    const nominal = parseInt(amount);
    
    try {
      const { error } = await supabase.from('operational_expenses').insert({
        category_name: catName,
        note: note,
        amount: nominal,
        date: selectedDate,
        employee_id: selectedEmployee || null 
      });

      if (error) throw error;

      toast({ title: "Berhasil", description: "Pengeluaran berhasil dicatat." });
      setCatName(""); 
      setNote(""); 
      setAmount("");
      setSelectedEmployee("");
      loadExpenses();
    } catch (error: any) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const deleteExpense = async (id: string) => {
    if(!confirm("Yakin ingin menghapus data pengeluaran ini?")) return;
    try {
      const { error } = await supabase.from('operational_expenses').delete().eq('id', id);
      if (error) throw error;
      loadExpenses();
      toast({ title: "Dihapus", description: "Data berhasil dihapus" });
    } catch (error) {
      toast({ title: "Error", description: "Gagal menghapus data", variant: "destructive" });
    }
  };

  const formatRp = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
  const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);

  const isSalaryInput = catName.toLowerCase().includes("gaji") || catName.toLowerCase().includes("bonus");

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-3xl font-bold text-gray-900">Operasional & Gaji</h1><p className="text-gray-600 mt-1">Catat biaya operasional dan penggajian harian</p></div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-orange-700 flex items-center gap-2"><Plus className="h-5 w-5" /> Input Pengeluaran</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-orange-50 rounded-lg border border-orange-100">
              <CalendarDays className="h-5 w-5 text-orange-600" />
              <Label>Tanggal:</Label>
              <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-auto bg-white" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kategori Pengeluaran</Label>
                <Select value={catName} onValueChange={handleCategoryChange}>
                  <SelectTrigger><SelectValue placeholder="Pilih Kategori (misal: Bensin, Gaji Pokok)" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                    <SelectItem value="Gaji Pokok Karyawan">Gaji Pokok Karyawan</SelectItem>
                    <SelectItem value="Gaji Lembur Karyawan">Gaji Lembur Karyawan</SelectItem>
                    <SelectItem value="Bonus Karyawan">Bonus Karyawan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isSalaryInput && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <Label className="text-blue-700 font-bold">Pilih Karyawan Penerima</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger className="bg-blue-50 border-blue-200"><SelectValue placeholder="-- Pilih Karyawan --" /></SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Nominal (Rp)</Label>
                <Input type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Keterangan (Opsional)</Label>
                <Input placeholder="Contoh: Lembur malam minggu" value={note} onChange={e => setNote(e.target.value)} />
              </div>
            </div>

            <Button onClick={addExpense} disabled={loading} className="w-full mt-4 bg-orange-600 hover:bg-orange-700">
              {loading ? <Loader2 className="animate-spin mr-2"/> : <Plus className="mr-2 h-4 w-4"/>} Simpan Transaksi
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex gap-2 text-gray-800"><Wallet className="h-5 w-5 text-orange-600"/> Riwayat {new Date(selectedDate).toLocaleDateString('id-ID')}</CardTitle></CardHeader>
          <CardContent>
            {expenses.length > 0 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  {expenses.map((e) => (
                    <div key={e.id} className="flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-sm transition-all">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-800">{e.category_name}</p>
                          {e.employees && (
                            <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">
                              <User className="h-3 w-3"/> {e.employees.name}
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{e.note || "-"}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-orange-700">{formatRp(e.amount)}</span>
                        <Button size="icon" variant="outline" className="h-8 w-8 text-red-500 hover:bg-red-50 border-red-200" onClick={() => deleteExpense(e.id)}><Trash2 className="h-4 w-4"/></Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg">
                  <div className="flex justify-between items-center text-orange-900">
                    <div><p className="text-sm text-orange-600">Total Transaksi</p><p className="font-bold text-xl">{expenses.length} item</p></div>
                    <div className="text-right"><p className="text-sm text-orange-600">Total Pengeluaran</p><p className="font-bold text-2xl">{formatRp(totalExpense)}</p></div>
                  </div>
                </div>
              </div>
            ) : (<p className="text-center py-10 text-gray-400 bg-gray-50 rounded-lg border border-dashed">Belum ada pengeluaran hari ini.</p>)}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Operasional;
