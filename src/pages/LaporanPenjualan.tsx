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
import { Download, Printer, Wallet, AlertCircle, Loader2, Filter, CheckSquare, Square, Calendar } from "lucide-react";

interface ExtendedSaleData extends SaleData {
  payment_status?: string;
  amount_paid?: number;
  unit_type?: string; 
}

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
  
  // Filter States
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  
  // Product Filter Logic
  const [availableProducts, setAvailableProducts] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);

  // Payment Update States
  const [selectedTx, setSelectedTx] = useState<GroupedTransaction | null>(null);
  const [inputPayment, setInputPayment] = useState(""); 
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);

  useEffect(() => { loadSales(); }, []);

  const loadSales = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from(TABLE_NAMES.SALES).select('*').order('date', { ascending: false });
      if (error) throw error;
      
      const salesData = data || [];
      setSales(salesData);

      // 1. Ambil list produk unik untuk filter
      const uniqueProds = Array.from(new Set(salesData.map(item => item.product_type))).sort();
      setAvailableProducts(uniqueProds);
      setSelectedProducts(uniqueProds); // Default: Ceklis semua

      // 2. Grouping awal
      processData(salesData, uniqueProds, startDate, endDate, customerFilter);

    } catch (error) { console.error('Error:', error); } 
    finally { setLoading(false); }
  };

  // Fungsi Proses Data (Filter & Grouping)
  const processData = (
    rawData: ExtendedSaleData[], 
    activeProducts: string[], 
    start: string, 
    end: string, 
    cust: string
  ) => {
    // A. FILTER ITEM LEVEL (Hanya ambil item yang produknya diceklis)
    const validItems = rawData.filter(item => activeProducts.includes(item.product_type));

    // B. FILTER TRANSACTION LEVEL (Date & Customer)
    // Kita filter dulu itemnya berdasarkan tanggal & customer
    const filteredItems = validItems.filter(item => {
      const matchDate = (!start || item.date >= start) && (!end || item.date <= end);
      const matchCust = !cust || item.customer_name.toLowerCase().includes(cust.toLowerCase());
      return matchDate && matchCust;
    });

    // C. GROUPING (Berdasarkan item yang lolos filter)
    const groups: { [key: string]: GroupedTransaction } = {};
    
    // Note: Kita butuh akses ke data pembayaran (amount_paid) yang biasanya nempel di item pertama transaksi asli.
    // Jadi kita harus hati-hati agar info pembayaran tidak hilang kalau item pertama di-uncheck.
    // Solusi: Kita ambil info pembayaran dari rawData transaksi yang sesuai.

    filteredItems.forEach(item => {
      const key = `${item.customer_name}-${item.created_at}`;
      
      if (!groups[key]) {
        // Cari total bayar asli dari transaksi ini (dari raw data biar ga ilang)
        const originalTxItems = rawData.filter(x => x.customer_name === item.customer_name && x.created_at === item.created_at);
        const totalPaidReal = originalTxItems.reduce((sum, x) => sum + (x.amount_paid || 0), 0);
        const statusReal = originalTxItems[0]?.payment_status || 'Belum Lunas';

        groups[key] = {
          id: key, created_at: item.created_at, date: item.date, customer_name: item.customer_name,
          items: [], total_quantity: 0, total_weight: 0, total_price: 0, 
          total_paid: totalPaidReal, // Pakai pembayaran asli
          payment_status: statusReal
        };
      }
      
      groups[key].items.push(item);
      groups[key].total_quantity += (item.quantity || 0); // Hanya jumlahkan item yang diceklis
      groups[key].total_weight += (item.weight || 0);
      groups[key].total_price += (item.total_price || 0); // Hanya harga item yang diceklis
    });

    const groupArray = Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setFilteredTransactions(groupArray);
    
    // Simpan raw grouped untuk keperluan lain jika perlu, tapi disini kita main filtered langsung
    setGroupedTransactions(groupArray); 
  };

  // Re-run processData ketika filter berubah
  useEffect(() => {
    processData(sales, selectedProducts, startDate, endDate, customerFilter);
  }, [startDate, endDate, customerFilter, selectedProducts]); // Hapus 'sales' dari dependency biar ga loop, sales cuma initial

  // Toggle Checkbox Produk
  const toggleProduct = (prod: string) => {
    setSelectedProducts(prev => 
      prev.includes(prod) ? prev.filter(p => p !== prod) : [...prev, prod]
    );
  };

  const handleUpdatePayment = async () => {
    if (!selectedTx) return;
    setUpdateLoading(true);
    try {
      // Logic pembayaran tetap update ke database
      // Hati-hati: Pembayaran diupdate ke ID transaksi asli
      const bayarTotal = parseInt(inputPayment.replace(/\D/g, '')) || 0;
      
      // Kita perlu ID dari salah satu item di transaksi ini untuk update
      // Ambil item pertama dari transaksi yang TAMPIL (atau cari di DB)
      if (selectedTx.items.length > 0) {
        // Cari semua item di transaksi asli di DB (bukan yang difilter) untuk update status
        const { data: originalItems } = await supabase
          .from(TABLE_NAMES.SALES)
          .select('id, total_price')
          .eq('customer_name', selectedTx.customer_name)
          .eq('created_at', selectedTx.created_at);

        if (originalItems && originalItems.length > 0) {
           const realTotalPrice = originalItems.reduce((sum, i) => sum + i.total_price, 0);
           const status = bayarTotal >= realTotalPrice ? "Lunas" : "Belum Lunas";

           await supabase.from(TABLE_NAMES.SALES).update({ payment_status: status, amount_paid: bayarTotal }).eq('id', originalItems[0].id);
           if (originalItems.length > 1) {
             await supabase.from(TABLE_NAMES.SALES).update({ payment_status: status, amount_paid: 0 }).in('id', originalItems.slice(1).map(i => i.id));
           }
           toast({ title: "Pembayaran Disimpan", description: `Status: ${status}` });
           setIsDialogOpen(false); 
           loadSales(); // Reload semua data
        }
      }
    } catch (error) { toast({ title: "Error", description: "Gagal update", variant: "destructive" }); }
    finally { setUpdateLoading(false); }
  };

  const handlePrint = (tx: GroupedTransaction) => {
    // Print struk tetap pakai data yang tampil
    const sisaNotaIni = Math.max(0, tx.total_price - tx.total_paid);
    // Hutang lama logika sederhana (ambil dari sisa filtered)
    const hutangLama = 0; // Disable fitur hutang lama di mode filter produk agar tidak bingung
    const totalTagihan = sisaNotaIni; // Fokus tagihan transaksi ini

    const itemsHtml = tx.items.map(item => {
      const isPcs = item.unit_type === 'pcs' || (item.weight === 0 && item.quantity > 0);
      let detailText = isPcs 
        ? `${item.quantity} Pcs @${formatCurrency(item.price_per_kg)}`
        : `${item.quantity > 0 ? item.quantity + ' ekor x ' : ''}${item.weight} Kg @${formatCurrency(item.price_per_kg)}`;

      return `
      <div style="margin-bottom: 4px; border-bottom: 1px dotted #ccc; padding-bottom: 2px;">
        <div style="display:flex; justify-content:space-between; font-weight:bold; font-size: 10px;">
           <span>${item.product_type}</span><span>${formatCurrency(item.total_price)}</span>
        </div>
        <div style="font-size:9px; color:#333;">${detailText}</div>
      </div>`;
    }).join('');

    const receiptContent = `
      <html><head><title>Struk</title><style>
        @page { size: 58mm auto; margin: 0; }
        body { font-family: 'Courier New', monospace; font-size: 10px; width: 58mm; margin: 0; padding: 5px; color: #000; background: #fff;}
        .header { text-align: center; margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom:5px;}
        .title { font-size: 12px; font-weight: 800; margin-bottom: 2px; }
        .address { font-size: 8px; word-wrap: break-word; line-height: 1.2; }
        .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
        .total-row { font-weight: 800; font-size: 11px; margin-top: 5px; border-top: 1px dashed #000; padding-top:5px; }
        .footer { text-align: center; margin-top: 15px; font-size: 8px; }
      </style></head><body>
      <div class="header"><div class="title">PA IYAT BROILER</div><div class="address">Jl. Wr. Lobak, Gandasari, Kec. Katapang, Kab. Bandung 40921</div></div>
      <div class="row"><span>Tgl: ${new Date(tx.date).toLocaleDateString('id-ID')}</span></div>
      <div class="row"><span>Plg: ${tx.customer_name}</span></div>
      <hr style="border-top: 1px dashed #000; border-bottom:0; margin: 5px 0;">
      ${itemsHtml}
      <div class="row total-row"><span>TOTAL (Filtered)</span><span>${formatCurrency(tx.total_price)}</span></div>
      <div class="footer"><p>Terima Kasih & Berkah Selalu!</p></div>
      <script>window.onload = function() { window.print(); }</script></body></html>`;
    
    const printWindow = window.open('', '', 'width=350,height=600');
    if (printWindow) { printWindow.document.write(receiptContent); printWindow.document.close(); }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  
  // --- HITUNG SUMMARY ---
  
  // 1. Total Terfilter (Sesuai tanggal & produk yang dipilih)
  const grandTotalRevenue = filteredTransactions.reduce((sum, t) => sum + t.total_price, 0);
  const grandTotalEkor = filteredTransactions.reduce((sum, t) => {
    // Hitung ekor hanya dari item yang filtered dan BUKAN PCS
    return sum + t.items.reduce((s, i) => (i.unit_type === 'pcs' ? s : s + (i.quantity||0)), 0);
  }, 0);
  
  // Hutang dihitung dari: (Total Harga Filtered) - (Total Bayar * Proporsi)? 
  // Agar tidak pusing, Total Piutang kita hitung sederhana: Total Harga - Total Bayar (Real). 
  // Jika minus (karena filter produk), kita nol kan saja biar ga aneh.
  const totalHutang = filteredTransactions.reduce((sum, t) => sum + Math.max(0, t.total_price - t.total_paid), 0);

  // 2. Total HARI INI (Realtime) - Mengabaikan filter tanggal, tapi menghormati filter produk
  const todayWIB = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  const todayRevenue = sales
    .filter(item => item.date === todayWIB && selectedProducts.includes(item.product_type))
    .reduce((sum, item) => sum + item.total_price, 0);

  const exportToExcel = () => {
    if (filteredTransactions.length === 0) return toast({ title: "Kosong", variant: "destructive" });
    const headers = ['Tanggal', 'Pelanggan', 'Detail Item', 'Total Tagihan', 'Status'];
    const rows = filteredTransactions.map(tx => [
      new Date(tx.date).toLocaleDateString('id-ID'), `"${tx.customer_name}"`, 
      `"${tx.items.map(i => i.product_type).join(', ')}"`,
      tx.total_price, `"${tx.payment_status}"`
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
    link.download = `Laporan_Filter_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <Layout>
      <div className="space-y-6 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div><h1 className="text-3xl font-bold text-gray-900">Laporan Penjualan</h1><p className="text-gray-600">Analisa Pendapatan & Filter Produk</p></div>
          <Button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700"><Download className="h-4 w-4 mr-2"/> Excel</Button>
        </div>

        {/* --- AREA FILTER PRODUK (Checklist) --- */}
        <Card className="bg-white border-blue-200 shadow-sm">
          <CardHeader className="pb-3 border-b bg-blue-50/50">
            <CardTitle className="text-sm font-bold text-blue-800 flex items-center gap-2">
              <Filter className="h-4 w-4" /> Filter Jenis Produk (Pendapatan dihitung berdasarkan yang diceklis)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-3">
              {availableProducts.map(prod => (
                <div key={prod} 
                  className={`cursor-pointer px-3 py-2 rounded-md border flex items-center gap-2 transition-all select-none ${selectedProducts.includes(prod) ? 'bg-blue-100 border-blue-300 text-blue-800 font-medium' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                  onClick={() => toggleProduct(prod)}
                >
                  {selectedProducts.includes(prod) ? <CheckSquare className="h-4 w-4 text-blue-600"/> : <Square className="h-4 w-4"/>}
                  <span className="text-xs uppercase">{prod}</span>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="text-xs text-blue-600 underline" onClick={() => setSelectedProducts(availableProducts)}>Pilih Semua</Button>
              <Button variant="ghost" size="sm" className="text-xs text-gray-500 underline" onClick={() => setSelectedProducts([])}>Hapus Semua</Button>
            </div>
          </CardContent>
        </Card>

        {/* --- SUMMARY CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* CARD BARU: PENDAPATAN HARI INI */}
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-emerald-700 flex items-center gap-2"><Calendar className="h-4 w-4"/> Pendapatan HARI INI</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-900">{formatCurrency(todayRevenue)}</div>
              <p className="text-xs text-emerald-600 mt-1">Realtime (Sesuai Produk yg diceklis)</p>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-200">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-orange-700">Pendapatan (Terfilter)</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900">{formatCurrency(grandTotalRevenue)}</div>
              <p className="text-xs text-orange-600 mt-1">Sesuai Tanggal & Produk</p>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-purple-700">Total Ekor (Terfilter)</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">{grandTotalEkor}</div>
              <p className="text-xs text-purple-600 mt-1">Hanya Ayam Utuh</p>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0"><CardTitle className="text-sm font-bold text-red-700">Sisa Tagihan</CardTitle><AlertCircle className="h-4 w-4 text-red-600"/></CardHeader>
            <CardContent><div className="text-2xl font-bold text-red-800">{formatCurrency(totalHutang)}</div><p className="text-xs text-red-600 mt-1">Dari item yang tampil</p></CardContent>
          </Card>
        </div>

        {/* --- FILTER TANGGAL --- */}
        <Card>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
             <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
             <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
             <Input placeholder="Cari Pelanggan..." value={customerFilter} onChange={e => setCustomerFilter(e.target.value)} />
             <Button variant="outline" onClick={() => {setStartDate(""); setEndDate(""); setCustomerFilter("")}}>Reset Tanggal</Button>
          </CardContent>
        </Card>

        {/* --- TABEL --- */}
        <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Pelanggan</TableHead><TableHead>Detail Barang (Diceklis)</TableHead><TableHead className="text-right">Total (Diceklis)</TableHead><TableHead className="text-center">Status Asli</TableHead><TableHead className="text-center">Aksi</TableHead></TableRow></TableHeader>
          <TableBody>{filteredTransactions.length > 0 ? filteredTransactions.map((tx) => {
            return (
              <TableRow key={tx.id}>
                <TableCell>{new Date(tx.date).toLocaleDateString('id-ID')}</TableCell>
                <TableCell className="font-bold">{tx.customer_name}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {tx.items.map((item, idx) => {
                      const isPcs = item.unit_type === 'pcs' || (item.weight === 0 && item.quantity > 0);
                      return (
                        <div key={idx} className="text-xs text-gray-600 border-b border-gray-100 last:border-0 pb-1 mb-1">
                          <span className="font-semibold text-gray-900">{item.product_type}</span>: 
                          {isPcs ? ` ${item.quantity} Pcs` : ` ${item.weight} Kg`} 
                          <span className="text-gray-400 ml-1">(@{formatCurrency(item.total_price)})</span>
                        </div>
                      );
                    })}
                  </div>
                </TableCell>
                <TableCell className="text-right font-bold text-green-700">{formatCurrency(tx.total_price)}</TableCell>
                <TableCell className="text-center"><Badge variant="outline" className={tx.payment_status === 'Lunas' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>{tx.payment_status}</Badge></TableCell>
                <TableCell className="text-center"><div className="flex justify-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handlePrint(tx)}><Printer className="h-4 w-4 text-gray-500" /></Button>
                  <Button size="sm" variant="outline" onClick={() => {setSelectedTx(tx); setInputPayment(tx.total_paid.toString()); setIsDialogOpen(true)}}><Wallet className="h-4 w-4 mr-1" /> Bayar</Button>
                </div></TableCell>
              </TableRow>
            )
          }) : <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-400">Tidak ada data sesuai filter</TableCell></TableRow>}
          </TableBody></Table></CardContent></Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}><DialogContent><DialogHeader><DialogTitle>Update Pembayaran</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
             <div className="p-3 bg-gray-50 rounded flex justify-between"><span>Tagihan (Item Terpilih):</span><span className="font-bold">{selectedTx && formatCurrency(selectedTx.total_price)}</span></div>
             <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">Perhatian: Pembayaran akan diupdate ke transaksi induk di database.</div>
             <div><Label>Total Uang Masuk (Rp)</Label><Input type="number" value={inputPayment} onChange={e => setInputPayment(e.target.value)} /></div>
          </div>
          <DialogFooter><Button onClick={handleUpdatePayment} disabled={updateLoading} className="bg-blue-600">{updateLoading ? <Loader2 className="animate-spin"/> : "Simpan"}</Button></DialogFooter>
        </DialogContent></Dialog>
      </div>
    </Layout>
  );
};

export default LaporanPenjualan;
