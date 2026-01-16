import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Loader2, Trash2, Wallet } from "lucide-react";

interface ExpenseData {
  id: string;
  category_name: string;
  note: string;
  amount: number;
}

const Operasional = () => {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  
  // Data
  const [categories, setCategories] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);

  // Form Inputs
  const [catName, setCatName] = useState("");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => { loadCategories(); }, []);
  useEffect(() => { loadExpenses(); }, [selectedDate]);

  const loadCategories = async () => {
    const { data } = await supabase.from('expense_categories').select('*').eq('is_active', true).order('name');
    setCategories(data || []);
  };

  const loadExpenses = async () => {
    const { data } = await supabase.from('operational_expenses').select('*').eq('date', selectedDate).order('created_at', { ascending: false });
    setExpenses(data || []);
  };

  // Saat kategori dipilih, otomatis isi harga default
  const handleCategoryChange = (name: string) => {
    setCatName(name);
    const selected = categories.find(c => c.name === name);
    if (selected && selected.default_amount) {
      setAmount(selected.default_amount.toString());
    } else {
      setAmount("");
    }
  };

  const addExpense = async () => {
    if (!catName || !amount) { toast({ title: "Error", description: "Lengkapi data!", variant: "destructive" }); return; }
    setLoading(true);
    const { error } = await supabase.from('operational_expenses').insert({
      category_name: catName,
      note: note,
      amount: parseInt(amount),
      date: selectedDate
    });
    if (error) toast({ title: "Gagal", variant: "destructive" });
    else {
      toast({ title: "Berhasil", description: "Pengeluaran dicatat." });
      setCatName(""); setNote(""); setAmount("");
      loadExpenses();
    }
    setLoading(false);
  };

  const deleteExpense = async (id: string) => {
    if(!confirm("Hapus data ini?")) return;
    await supabase.from('operational_expenses').delete().eq('id', id);
    loadExpenses();
  };

  const formatRp = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
  const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Operasional</h1>
          <div className="bg-red-100 px-4 py-2 rounded-lg border border-red-200">
            <p className="text-sm text-red-600">Total Pengeluaran Hari Ini</p>
            <p className="text-xl font-bold text-red-800">{formatRp(totalExpense)}</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Label>Tanggal:</Label>
              <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-auto" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <Label>Kategori</Label>
                <Select value={catName} onValueChange={handleCategoryChange}>
                  <SelectTrigger><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Keterangan (Opsional)</Label>
                <Input placeholder="Contoh: Beli bensin, Rokok Surya 1 slop" value={note} onChange={e => setNote(e.target.value)} />
              </div>
              <div>
                <Label>Nominal (Rp)</Label>
                <Input type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
            </div>
            <Button onClick={addExpense} disabled={loading} className="w-full mt-4 bg-red-600 hover:bg-red-700">
              {loading ? <Loader2 className="animate-spin mr-2"/> : <Plus className="mr-2 h-4 w-4"/>} Tambah Pengeluaran
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex gap-2"><Wallet className="h-5 w-5"/> Riwayat {new Date(selectedDate).toLocaleDateString('id-ID')}</CardTitle></CardHeader>
          <CardContent>
            {expenses.length > 0 ? (
              <Table>
                <TableHeader><TableRow><TableHead>Kategori</TableHead><TableHead>Keterangan</TableHead><TableHead className="text-right">Jumlah</TableHead><TableHead className="text-center">Aksi</TableHead></TableRow></TableHeader>
                <TableBody>{expenses.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.category_name}</TableCell>
                    <TableCell className="text-gray-500">{e.note || "-"}</TableCell>
                    <TableCell className="text-right font-bold text-red-600">{formatRp(e.amount)}</TableCell>
                    <TableCell className="text-center">
                      <Button size="icon" variant="ghost" className="text-red-500" onClick={() => deleteExpense(e.id)}><Trash2 className="h-4 w-4"/></Button>
                    </TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            ) : <p className="text-center py-8 text-gray-400">Belum ada pengeluaran.</p>}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Operasional;
