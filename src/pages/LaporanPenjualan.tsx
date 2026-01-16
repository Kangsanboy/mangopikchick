import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SaleData, TABLE_NAMES } from "@/types/database";
import { Download, FileText, Filter, Loader2, Printer, Wallet, AlertCircle } from "lucide-react";

interface ExtendedSaleData extends SaleData {
  payment_status?: string;
  amount_paid?: number;
}

// Interface untuk Transaksi yang sudah digroup
interface GroupedTransaction {
  id: string;
  created_at: string;
  date: string;
  customer_name: string;
  items: ExtendedSaleData[];
  total_quantity: number;
  total_weight: number;
  total_price: number;
  total_paid: number;
  payment_status: string;
}

const LaporanPenjualan = () => {
  const { toast } = useToast();
  const [sales, setSales] = useState<ExtendedSaleData[]>([]);
  const [groupedTransactions, setGroupedTransactions] = useState<GroupedTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<GroupedTransaction[]>([]);
  
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [loading, setLoading] = useState(true);

  // States untuk Update Pembayaran
  const [selectedTx, setSelectedTx] = useState<GroupedTransaction | null>(null);
  const [inputPayment, setInputPayment] = useState(""); 
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);

  // LOAD DATA
  const loadSales = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from(TABLE_NAMES.SALES)
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      setSales(data || []);
      groupSales(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  // GROUPING LOGIC
  const groupSales = (data: ExtendedSaleData[]) => {
    const groups: { [key: string]: GroupedTransaction } = {};

    data.forEach(item => {
      const key = `${item.customer_name}-${item.created_at}`;
      
      if (!groups[key]) {
        groups[key] = {
          id: key,
          created_at: item.created_at,
          date: item.date,
          customer_name: item.customer_name,
          items: [],
          total_quantity: 0,
          total_weight: 0,
          total_price: 0,
          total_paid: 0,
          payment_status: item.payment_status || 'Belum Lunas'
        };
      }
      
      groups[key].items.push(item);
      groups[key].total_quantity += item.quantity || 0;
      groups[key].total_weight += item.weight || 0;
      groups[key].total_price += item.total_price || 0;
      groups[key].total_paid += item.amount_paid || 0;
    });

    const groupArray = Object.values(groups).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    setGroupedTransactions(groupArray);
    setFilteredTransactions(groupArray);
  };

  // FILTER LOGIC
  useEffect(() => {
    let filtered = [...groupedTransactions];
    if (startDate) filtered = filtered.filter(t => t.date >= startDate);
    if (endDate) filtered = filtered.filter(t => t.date <= endDate);
    if (customerFilter) {
      filtered = filtered.filter(t => 
        t.customer_name.toLowerCase().includes(customerFilter.toLowerCase())
      );
    }
    setFilteredTransactions(filtered);
  }, [groupedTransactions, startDate, endDate, customerFilter]);

  // UPDATE PAYMENT
  const handleUpdatePayment = async () => {
    if (!selectedTx) return;
    setUpdateLoading(true);

    try {
      const bayarTotal = parseInt(inputPayment.replace(/\D/g, '')) || 0;
      const totalTagihan = selectedTx.total_price;
      
      let status = "Belum Lunas";
      if (bayarTotal >= totalTagihan) status = "Lunas";

      const items = selectedTx.items;
      
      if (items.length > 0) {
        await supabase.from(TABLE_NAMES.SALES).update({
          payment_status: status,
          amount_paid: bayarTotal 
        }).eq('id', items[0].id);

        if (items.length > 1) {
          const otherIds = items.slice(1).map(i => i.id);
          await supabase.from(TABLE_NAMES.SALES).update({
            payment_status: status,
            amount_paid: 0 
          }).in('id', otherIds);
        }
      }

      toast({ title: "Pembayaran Disimpan", description: `Status: ${status} - Total Bayar: ${formatCurrency(bayarTotal)}` });
      setIsDialogOpen(false);
      loadSales(); 
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Gagal update pembayaran", variant: "destructive" });
    } finally {
      setUpdateLoading(false);
    }
  };

  // CETAK STRUK
  const handlePrint = (tx: GroupedTransaction) => {
    const sisa = tx.total_paid - tx.total_price;
    const statusText = sisa >= 0 ? "KEMBALI" : "SISA HUTANG";

    const itemsHtml = tx.items.map(item => `
      <div style="margin-bottom: 4px; border-bottom: 1px dotted #ccc; padding-bottom: 2px;">
        <div style="display:flex; justify-content:space-between; font-weight:bold; font-size: 10px;">
           <span>${item.product_type}</span><span>${formatCurrency(item.total_price)}</span>
        </div>
        <div style="font-size:9px; color:#333;">${item.quantity > 0 ? item.quantity + ' ekor x ' : ''}${item.weight} Kg @${formatCurrency(item.price_per_kg)}</div>
      </div>`).join('');

    const receiptContent = `
      <html><head><title>Struk</title><style>
        @page { size: 58mm auto; margin: 0; }
        body { font-family: 'Courier New', monospace; font-size: 10px; width: 58mm; margin: 0; padding: 5px; color: #000; background: #fff;}
        .header { text-align: center; margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom:5px;}
        .title { font-size: 12px; font-weight: 800; margin-bottom: 2px; }
        .address { font-size: 8px; word-wrap: break-word; line-height: 1.2; }
        .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
        .total-row { font-weight: 800; font-size: 11px; margin-top: 8px; border-top: 1px dashed #000; padding-top:5px; }
        .footer { text-align: center; margin-top: 15px; font-size: 8px; }
        .status-box { border: 1px solid #000; padding: 2px 4px; display: inline-block; margin-top: 5px; font-weight:bold; font-size: 10px; }
      </style></head><body>
      <div class="header">
        <div class="title">PA IYAT BROILER</div>
        <div class="address">Jl. Wr. Lobak, Gandasari, Kec. Katapang, Kab. Bandung 40921</div>
      </div>
      <div class="row"><span>Tgl: ${new Date(tx.date).toLocaleDateString('id-ID')}</span></div>
      <div class="row"><span>Plg: ${tx.customer_name}</span></div>
      <div class="row"><span>Jam: ${new Date(tx.created_at).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</span></div>
      <hr style="border-top: 1px dashed #000; border-bottom:0; margin: 5px 0;">
      ${itemsHtml}
      <div class="row total-row"><span>TOTAL</span><span>${formatCurrency(tx.total_price)}</span></div>
      <div class="row"><span>BAYAR</span><span>${formatCurrency(tx.total_paid)}</span></div>
      <div class="row"><span>${statusText}</span><span>${formatCurrency(Math.abs(sisa))}</span></div>
      <div class="header" style="border:none; margin-top:5px;"><div class="status-box">${tx.payment_status}</div></div>
      <div class="footer"><p>Terima Kasih & Berkah Selalu!</p></div>
      <script>window.onload = function() { window.print(); }</script></body></html>`;
    
    const printWindow = window.open('', '', 'width=350,height=600');
    if (printWindow) { printWindow.document.write(receiptContent); printWindow.document.close(); }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  
  // --- HITUNGAN RINGKASAN DATA ---
  const grandTotalRevenue = filteredTransactions.reduce((sum, t) => sum + t.total_price, 0);
  const grandTotalEkor = filteredTransactions.reduce((sum, t) => sum + t.total_quantity, 0);
  
  // LOGIKA TOTAL HUTANG (PIUTANG)
  const totalHutang = filteredTransactions.reduce((sum, t) => {
    const sisa = Math.max(0, t.total_price - t.total_paid);
    return sum + sisa;
  }, 0);

  const exportToExcel = () => {
    if (filteredTransactions.length === 0) {
      toast({ title: "Tidak ada data", description: "Tidak ada data untuk diekspor", variant: "destructive" });
      return;
    }
    const headers = ['Tanggal', 'Pelanggan', 'Total Item', 'Total Tagihan', 'Total Bayar', 'Sisa Hutang', 'Status'];
    const dataRows = filteredTransactions.map(tx => [
      new Date(tx.date).toLocaleDateString('id-ID'),
      `"${tx.customer_name}"`,
      tx.items.length,
      tx.total_price,
      tx.total_paid,
      Math.max(0, tx.total_price - tx.total_paid), // Tambahan kolom sisa hutang di excel
      `"${tx.payment_status}"`
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...dataRows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Laporan_Transaksi_Gacor_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <Layout>
      <div className="space-y-6 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Laporan Penjualan</h1>
            <p className="text-gray-600">Laporan per Transaksi & Piutang</p>
          </div>
          <Button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700">
            <Download className="h-4 w-4 mr-2" /> Unduh Excel
          </Button>
        </div>

        {/* --- SUMMARY CARDS (Sekarang 4 Kolom) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-blue-700">Total Transaksi</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-blue-900">{filteredTransactions.length}</div></CardContent>
          </Card>
          
          <Card className="bg-purple-50 border-purple-200">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-purple-700">Total Ekor</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-purple-900">{grandTotalEkor}</div></CardContent>
          </Card>
          
          <Card className="bg-orange-50 border-orange-200">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-orange-700">Pendapatan Kotor</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-orange-900">{formatCurrency(grandTotalRevenue)}</div></CardContent>
          </Card>

          {/* CARD BARU: TOTAL PIUTANG */}
          <Card className="bg-red-50 border-red-200 shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-bold text-red-700">Total Piutang (Hutang)</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-800">{formatCurrency(totalHutang)}</div>
              <p className="text-xs text-red-600 mt-1">Uang belum dibayar</p>
            </CardContent>
          </Card>
        </div>

        {/* FILTER */}
        <Card>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
             <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
             <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
             <Input placeholder="Cari Pelanggan..." value={customerFilter} onChange={e => setCustomerFilter(e.target.value)} />
             <Button variant="outline" onClick={() => {setStartDate(""); setEndDate(""); setCustomerFilter("")}}>Reset Filter</Button>
          </CardContent>
        </Card>

        {/* TABEL TRANSAKSI */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Detail Barang</TableHead>
                  <TableHead className="text-right">Total Tagihan</TableHead>
                  <TableHead className="text-right">Sudah Bayar</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((tx) => {
                  const sisa = Math.max(0, tx.total_price - tx.total_paid);
                  return (
                    <TableRow key={tx.id}>
                      <TableCell>{new Date(tx.date).toLocaleDateString('id-ID')}</TableCell>
                      <TableCell className="font-bold">{tx.customer_name}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {tx.items.map((item, idx) => (
                            <div key={idx} className="text-xs text-gray-600">
                              <span className="font-semibold text-gray-900">{item.product_type}</span>: {item.weight} Kg
                              {item.quantity > 0 && ` (${item.quantity} ekor)`}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(tx.total_price)}</TableCell>
                      <TableCell className={`text-right ${sisa <= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-medium'}`}>
                        {formatCurrency(tx.total_paid)}
                        {sisa > 0 && <div className="text-[10px] text-red-500">Kurang: {formatCurrency(sisa)}</div>}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={tx.payment_status === 'Lunas' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                          {tx.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handlePrint(tx)}>
                            <Printer className="h-4 w-4 text-gray-500" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => {
                            setSelectedTx(tx);
                            setInputPayment(tx.total_paid.toString());
                            setIsDialogOpen(true);
                          }}>
                            <Wallet className="h-4 w-4 mr-1" /> Bayar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* DIALOG PEMBAYARAN */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Update Pembayaran: {selectedTx?.customer_name}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
               <div className="p-3 bg-gray-50 rounded flex justify-between">
                 <span>Total Tagihan:</span>
                 <span className="font-bold">{selectedTx && formatCurrency(selectedTx.total_price)}</span>
               </div>
               <div>
                 <Label>Total Uang Masuk (Rp)</Label>
                 <Input type="number" value={inputPayment} onChange={e => setInputPayment(e.target.value)} />
                 <p className="text-xs text-gray-500 mt-1">*Masukkan nominal total yang sudah dibayar pelanggan</p>
               </div>
            </div>
            <DialogFooter>
               <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
               <Button onClick={handleUpdatePayment} disabled={updateLoading} className="bg-blue-600">{updateLoading ? <Loader2 className="animate-spin"/> : "Simpan"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default LaporanPenjualan;
