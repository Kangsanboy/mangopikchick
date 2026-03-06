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
import { Download, Printer, Wallet, AlertCircle, Loader2, Package, Image as ImageIcon } from "lucide-react";

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
  
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [loading, setLoading] = useState(true);

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
      setSales(data || []);
      groupSales(data || []);
    } catch (error) { console.error('Error:', error); } 
    finally { setLoading(false); }
  };

  const groupSales = (data: ExtendedSaleData[]) => {
    const groups: { [key: string]: GroupedTransaction } = {};
    data.forEach(item => {
      const key = `${item.customer_name}-${item.created_at}`;
      if (!groups[key]) {
        groups[key] = {
          id: key, created_at: item.created_at, date: item.date, customer_name: item.customer_name,
          items: [], total_quantity: 0, total_weight: 0, total_price: 0, total_paid: 0,
          payment_status: item.payment_status || 'Belum Lunas'
        };
      }
      groups[key].items.push(item);
      groups[key].total_quantity += item.quantity || 0;
      groups[key].total_weight += item.weight || 0;
      groups[key].total_price += item.total_price || 0;
      groups[key].total_paid += item.amount_paid || 0;
    });
    const groupArray = Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setGroupedTransactions(groupArray);
    setFilteredTransactions(groupArray);
  };

  useEffect(() => {
    let filtered = [...groupedTransactions];
    if (startDate) filtered = filtered.filter(t => t.date >= startDate);
    if (endDate) filtered = filtered.filter(t => t.date <= endDate);
    if (customerFilter) filtered = filtered.filter(t => t.customer_name.toLowerCase().includes(customerFilter.toLowerCase()));
    setFilteredTransactions(filtered);
  }, [groupedTransactions, startDate, endDate, customerFilter]);

  const handleUpdatePayment = async () => {
    if (!selectedTx) return;
    setUpdateLoading(true);
    try {
      const bayarTotal = parseInt(inputPayment.replace(/\D/g, '')) || 0;
      const status = bayarTotal >= selectedTx.total_price ? "Lunas" : "Belum Lunas";
      const items = selectedTx.items;
      
      if (items.length > 0) {
        await supabase.from(TABLE_NAMES.SALES).update({ payment_status: status, amount_paid: bayarTotal }).eq('id', items[0].id);
        if (items.length > 1) {
          await supabase.from(TABLE_NAMES.SALES).update({ payment_status: status, amount_paid: 0 }).in('id', items.slice(1).map(i => i.id));
        }
      }
      toast({ title: "Pembayaran Disimpan", description: `Status: ${status}` });
      setIsDialogOpen(false); loadSales(); 
    } catch (error) { toast({ title: "Error", description: "Gagal update", variant: "destructive" }); }
    finally { setUpdateLoading(false); }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  // --- LOGIC PRINT HTML A4 FORMAL ---
  const handlePrint = (tx: GroupedTransaction) => {
    const sisaNotaIni = Math.max(0, tx.total_price - tx.total_paid);
    const hutangLama = groupedTransactions
      .filter(t => t.customer_name === tx.customer_name && t.id !== tx.id && new Date(t.created_at) < new Date(tx.created_at))
      .reduce((sum, t) => sum + Math.max(0, t.total_price - t.total_paid), 0);
    const totalTagihan = sisaNotaIni + hutangLama;

    // Mapping item untuk tabel baru
    const itemsHtml = tx.items.map((item, index) => {
      const isPcs = item.unit_type === 'pcs' || (item.weight === 0 && item.quantity > 0);
      const qtyText = isPcs ? `${item.quantity} Pcs` : (item.quantity > 0 ? `${item.quantity} Ekor` : '-');
      const weightText = !isPcs && item.weight > 0 ? `${item.weight} Kg` : '-';
      
      return `
        <tr>
          <td style="text-align:center;">${index + 1}</td>
          <td>${item.product_type}</td>
          <td>${qtyText}</td>
          <td>${weightText}</td>
          <td>${formatCurrency(item.price_per_kg)}</td>
          <td style="text-align:right;">${formatCurrency(item.total_price)}</td>
        </tr>
      `;
    }).join('');

    const receiptContent = `
      <html>
      <head>
        <title>Nota Penjualan - ${tx.customer_name}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: Arial, sans-serif; color: #000; margin: 0; padding: 20px; font-size: 14px; }
          .header { display: flex; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 15px; }
          .logo { width: 80px; height: 80px; object-fit: contain; margin-right: 20px; }
          .company-info h1 { margin: 0 0 5px 0; font-size: 26px; font-weight: bold; text-transform: uppercase; }
          .company-info p { margin: 0; font-size: 14px; color: #333; }
          .info-table { margin-bottom: 20px; }
          .info-table td { padding: 4px 8px 4px 0; font-weight: bold; font-size: 14px; }
          .data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .data-table th, .data-table td { border: 1px solid #000; padding: 10px 8px; text-align: left; font-size: 14px; }
          .data-table th { background-color: #f5f5f5; font-weight: bold; text-align: center; }
          .summary-container { display: flex; justify-content: flex-end; width: 100%; margin-bottom: 30px; }
          .summary { width: 350px; }
          .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-weight: bold; font-size: 14px;}
          .signatures { display: flex; justify-content: space-between; text-align: center; margin-top: 50px; padding: 0 50px;}
          .sign-box { width: 200px; font-size: 14px; }
          .sign-line { margin-top: 80px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="/logo ayam.png" class="logo" alt="Logo" />
          <div class="company-info">
            <h1>PA IYAT BROILER</h1>
            <p>Jl. Wr. Lobak, Gandasari, Kec. Katapang, Kab. Bandung 40921</p>
          </div>
        </div>

        <table class="info-table">
          <tr><td>Tanggal</td><td>: ${new Date(tx.date).toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'})}</td></tr>
          <tr><td>Pelanggan</td><td>: ${tx.customer_name}</td></tr>
        </table>

        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 5%;">No</th>
              <th style="width: 25%;">Nama barang</th>
              <th style="width: 15%;">Jumlah</th>
              <th style="width: 15%;">Berat</th>
              <th style="width: 20%;">Harga per kg/pcs</th>
              <th style="width: 20%; text-align:right;">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="summary-container">
          <div class="summary">
            <div class="summary-row"><span>Total Nota</span><span>${formatCurrency(tx.total_price)}</span></div>
            <div class="summary-row"><span>Bayar</span><span>${formatCurrency(tx.total_paid)}</span></div>
            <div class="summary-row"><span>Sisa Nota ini</span><span>${formatCurrency(sisaNotaIni)}</span></div>
            ${hutangLama > 0 ? `
              <div class="summary-row" style="margin-top: 10px; border-top: 1px dashed #ccc; padding-top: 10px;"><span>Hutang Lama</span><span>${formatCurrency(hutangLama)}</span></div>
              <div class="summary-row" style="font-size: 16px; margin-top: 5px;"><span>Total Tagihan</span><span>${formatCurrency(totalTagihan)}</span></div>
            ` : ''}
          </div>
        </div>

        <div class="signatures">
          <div class="sign-box">
            <div>Yang menerima</div>
            <div class="sign-line">(............................)</div>
          </div>
          <div class="sign-box">
            <div>Hormat kami</div>
            <div class="sign-line">(............................)</div>
          </div>
        </div>

        <script>
          window.onload = function() { 
            setTimeout(function(){ window.print(); }, 800); 
          }
        </script>
      </body>
      </html>
    `;
    const printWindow = window.open('', '', 'width=900,height=700');
    if (printWindow) { 
      printWindow.document.write(receiptContent); 
      printWindow.document.close(); 
    } else {
      toast({title: "Gagal Membuka Tab Baru", description: "Izinkan pop-up browser untuk mencetak.", variant: "destructive"});
    }
  };

  // --- LOGIC DOWNLOAD JPG CANVAS (FORMAT A4) ---
  const handleDownloadImage = (tx: GroupedTransaction) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sisaNotaIni = Math.max(0, tx.total_price - tx.total_paid);
    const hutangLama = groupedTransactions
      .filter(t => t.customer_name === tx.customer_name && t.id !== tx.id && new Date(t.created_at) < new Date(tx.created_at))
      .reduce((sum, t) => sum + Math.max(0, t.total_price - t.total_paid), 0);
    const totalTagihan = sisaNotaIni + hutangLama;

    // Lebar dokumen layaknya kertas A4
    const width = 800; 
    let height = 480 + (tx.items.length * 40) + (hutangLama > 0 ? 60 : 0);
    
    canvas.width = width;
    canvas.height = height;
    
    // Background Putih
    ctx.fillStyle = "#ffffff"; 
    ctx.fillRect(0, 0, width, height);
    
    // Fungsi inti untuk menggambar isi
    const drawContent = () => {
      ctx.fillStyle = "#000000"; 
      
      // Teks Kop Surat
      ctx.textAlign = "left";
      ctx.font = "bold 26px Arial";
      ctx.fillText("PA IYAT BROILER", 140, 60);
      ctx.font = "14px Arial";
      ctx.fillText("Jl. Wr. Lobak, Gandasari, Kec. Katapang, Kab. Bandung 40921", 140, 85);

      // Garis Bawah Header
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(40, 110);
      ctx.lineTo(760, 110);
      ctx.stroke();

      // Info Transaksi
      ctx.font = "bold 14px Arial";
      ctx.fillText(`Tanggal   : ${new Date(tx.date).toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'})}`, 40, 150);
      ctx.fillText(`Pelanggan : ${tx.customer_name}`, 40, 175);

      // --- Header Tabel ---
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, 200); ctx.lineTo(760, 200);
      ctx.moveTo(40, 235); ctx.lineTo(760, 235);
      ctx.stroke();

      ctx.fillText("No", 50, 222);
      ctx.fillText("Nama barang", 100, 222);
      ctx.fillText("Jumlah", 300, 222);
      ctx.fillText("Berat", 420, 222);
      ctx.fillText("Harga per kg/pcs", 520, 222);
      ctx.textAlign = "right";
      ctx.fillText("Jumlah", 750, 222);

      // --- Isi Tabel ---
      ctx.textAlign = "left";
      ctx.font = "14px Arial";
      let y = 265;
      
      tx.items.forEach((item, index) => {
        const isPcs = item.unit_type === 'pcs' || (item.weight === 0 && item.quantity > 0);
        const qtyText = isPcs ? `${item.quantity} Pcs` : (item.quantity > 0 ? `${item.quantity} Ekor` : '-');
        const weightText = !isPcs && item.weight > 0 ? `${item.weight} Kg` : '-';

        ctx.fillText(`${index + 1}`, 50, y);
        ctx.fillText(item.product_type, 100, y);
        ctx.fillText(qtyText, 300, y);
        ctx.fillText(weightText, 420, y);
        ctx.fillText(formatCurrency(item.price_per_kg), 520, y);
        
        ctx.textAlign = "right";
        ctx.fillText(formatCurrency(item.total_price), 750, y);
        ctx.textAlign = "left"; // Kembalikan ke left untuk iterasi selanjutnya
        
        y += 35;
      });

      // Garis Tutup Tabel
      ctx.beginPath();
      ctx.moveTo(40, y - 15); 
      ctx.lineTo(760, y - 15);
      ctx.stroke();

      // --- Summary Total ---
      y += 15;
      ctx.font = "bold 14px Arial";
      ctx.fillText("Total Nota", 480, y); ctx.textAlign="right"; ctx.fillText(formatCurrency(tx.total_price), 750, y); ctx.textAlign="left"; y += 25;
      ctx.fillText("Bayar", 480, y); ctx.textAlign="right"; ctx.fillText(formatCurrency(tx.total_paid), 750, y); ctx.textAlign="left"; y += 25;
      ctx.fillText("Sisa Nota ini", 480, y); ctx.textAlign="right"; ctx.fillText(formatCurrency(sisaNotaIni), 750, y); ctx.textAlign="left"; y += 25;

      if (hutangLama > 0) {
          y += 10;
          ctx.beginPath(); ctx.moveTo(480, y-20); ctx.lineTo(760, y-20); ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillText("Hutang Lama", 480, y); ctx.textAlign="right"; ctx.fillText(formatCurrency(hutangLama), 750, y); ctx.textAlign="left"; y += 25;
          ctx.font = "bold 16px Arial";
          ctx.fillText("Total Tagihan", 480, y); ctx.textAlign="right"; ctx.fillText(formatCurrency(totalTagihan), 750, y); ctx.textAlign="left"; y += 25;
      }

      // --- Tanda Tangan ---
      y += 50;
      ctx.textAlign = "center";
      ctx.font = "14px Arial";
      ctx.fillText("Yang menerima", 150, y);
      ctx.fillText("Hormat kami", 650, y);
      y += 70;
      ctx.fillText("(............................)", 150, y);
      ctx.fillText("(............................)", 650, y);

      // Download Eksekusi
      const link = document.createElement('a');
      link.download = `Nota-${tx.customer_name.replace(/\s+/g, '-')}-${new Date().getTime()}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.9);
      link.click();
    };

    // Load Image Logo Dulu Sebelum Menggambar
    const logoImg = new Image();
    logoImg.src = '/logo ayam.png';
    logoImg.onload = () => {
      // Jika logo berhasil dimuat, gambar logonya lalu jalankan drawContent
      ctx.drawImage(logoImg, 40, 30, 80, 80);
      drawContent();
    };
    logoImg.onerror = () => {
      // Jika logo gagal dimuat (misal typo nama file), tetap buat struk tanpa gambar
      console.warn("Gagal memuat logo ayam.png");
      drawContent();
    };
  };
  
  // --- HITUNG SUMMARY ---
  let calculatedTotalEkor = 0;
  let calculatedTotalAti = 0;
  const partingKeywords = ['kepala', 'ceker', 'sayap', 'paha', 'dada', 'ati', 'ampela', 'usus', 'kulit', 'jantung', 'bon', 'tulangan'];

  filteredTransactions.forEach(tx => {
    tx.items.forEach(item => {
      const pName = item.product_type.toLowerCase();
      if (pName.includes('ati')) calculatedTotalAti += (item.quantity || 0);
      const isParting = partingKeywords.some(keyword => pName.includes(keyword));
      if (!isParting) calculatedTotalEkor += (item.quantity || 0);
    });
  });

  const grandTotalRevenue = filteredTransactions.reduce((sum, t) => sum + t.total_price, 0);
  const totalHutang = filteredTransactions.reduce((sum, t) => sum + Math.max(0, t.total_price - t.total_paid), 0);

  const exportToExcel = () => {
    if (filteredTransactions.length === 0) return toast({ title: "Kosong", variant: "destructive" });
    const headers = ['Tanggal', 'Pelanggan', 'Total Item', 'Total Tagihan', 'Total Bayar', 'Sisa Hutang', 'Status'];
    const rows = filteredTransactions.map(tx => [
      new Date(tx.date).toLocaleDateString('id-ID'), `"${tx.customer_name}"`, tx.items.length,
      tx.total_price, tx.total_paid, Math.max(0, tx.total_price - tx.total_paid), `"${tx.payment_status}"`
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
    link.download = `Laporan_Penjualan_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <Layout>
      <div className="space-y-6 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div><h1 className="text-3xl font-bold text-gray-900">Laporan Penjualan</h1><p className="text-gray-600">Laporan per Transaksi & Piutang</p></div>
          <Button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700"><Download className="h-4 w-4 mr-2"/> Excel</Button>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-blue-50 border-blue-200"><CardHeader className="pb-2"><CardTitle className="text-sm text-blue-700">Total Transaksi</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-900">{filteredTransactions.length}</div></CardContent></Card>
          <Card className="bg-purple-50 border-purple-200"><CardHeader className="pb-2"><CardTitle className="text-sm text-purple-700">Total Ekor</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-purple-900">{calculatedTotalEkor}</div><p className="text-[10px] text-purple-600 mt-1">Ayam Utuh / Hidup</p></CardContent></Card>
          <Card className="bg-indigo-50 border-indigo-200"><CardHeader className="pb-2 flex items-center gap-2"><CardTitle className="text-sm text-indigo-700">Total Ati</CardTitle><Package className="h-4 w-4 text-indigo-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-indigo-900">{calculatedTotalAti}</div><p className="text-[10px] text-indigo-600 mt-1">Pcs (Khusus Ati)</p></CardContent></Card>
          <Card className="bg-orange-50 border-orange-200"><CardHeader className="pb-2"><CardTitle className="text-sm text-orange-700">Pendapatan Kotor</CardTitle></CardHeader><CardContent><div className="text-lg font-bold text-orange-900">{formatCurrency(grandTotalRevenue)}</div></CardContent></Card>
          <Card className="bg-red-50 border-red-200 shadow-sm"><CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0"><CardTitle className="text-sm font-bold text-red-700">Piutang</CardTitle><AlertCircle className="h-4 w-4 text-red-600"/></CardHeader><CardContent><div className="text-lg font-bold text-red-800">{formatCurrency(totalHutang)}</div><p className="text-[10px] text-red-600 mt-1">Belum Dibayar</p></CardContent></Card>
        </div>

        {/* --- FILTER --- */}
        <Card>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
             <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
             <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
             <Input placeholder="Cari Pelanggan..." value={customerFilter} onChange={e => setCustomerFilter(e.target.value)} />
             <Button variant="outline" onClick={() => {setStartDate(""); setEndDate(""); setCustomerFilter("")}}>Reset Filter</Button>
          </CardContent>
        </Card>

        {/* --- TABEL --- */}
        <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Pelanggan</TableHead><TableHead>Detail Barang</TableHead><TableHead className="text-right">Total Tagihan</TableHead><TableHead className="text-right">Sudah Bayar</TableHead><TableHead className="text-center">Status</TableHead><TableHead className="text-center">Aksi</TableHead></TableRow></TableHeader>
          <TableBody>{filteredTransactions.map((tx) => {
            const sisa = Math.max(0, tx.total_price - tx.total_paid);
            return (
              <TableRow key={tx.id}>
                <TableCell>{new Date(tx.date).toLocaleDateString('id-ID')}</TableCell>
                <TableCell className="font-bold">{tx.customer_name}</TableCell>
                <TableCell><div className="space-y-1">{tx.items.map((item, idx) => {
                  const isPcs = item.unit_type === 'pcs' || (item.weight === 0 && item.quantity > 0);
                  return (<div key={idx} className="text-xs text-gray-600"><span className="font-semibold text-gray-900">{item.product_type}</span>: {isPcs ? ` ${item.quantity} Pcs` : ` ${item.weight} Kg (${item.quantity} Ekor)`}</div>);
                })}</div></TableCell>
                <TableCell className="text-right font-bold">{formatCurrency(tx.total_price)}</TableCell>
                <TableCell className={`text-right ${sisa <= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-medium'}`}>{formatCurrency(tx.total_paid)}{sisa > 0 && <div className="text-[10px] text-red-500">Kurang: {formatCurrency(sisa)}</div>}</TableCell>
                <TableCell className="text-center"><Badge variant="outline" className={tx.payment_status === 'Lunas' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>{tx.payment_status}</Badge></TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center gap-1">
                    {/* Tombol Download JPG */}
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => handleDownloadImage(tx)}><ImageIcon className="h-4 w-4" /></Button>
                    {/* Tombol Print A4 */}
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-500" onClick={() => handlePrint(tx)}><Printer className="h-4 w-4" /></Button>
                    {/* Tombol Bayar */}
                    <Button size="icon" variant="outline" className="h-8 w-8 border-green-200 text-green-600 hover:bg-green-50" onClick={() => {setSelectedTx(tx); setInputPayment(tx.total_paid.toString()); setIsDialogOpen(true)}}><Wallet className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}</TableBody></Table></CardContent></Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}><DialogContent><DialogHeader><DialogTitle>Update Pembayaran: {selectedTx?.customer_name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
             <div className="p-3 bg-gray-50 rounded flex justify-between"><span>Total Tagihan:</span><span className="font-bold">{selectedTx && formatCurrency(selectedTx.total_price)}</span></div>
             <div><Label>Total Uang Masuk (Rp)</Label><Input type="number" value={inputPayment} onChange={e => setInputPayment(e.target.value)} /><p className="text-xs text-gray-500 mt-1">*Masukkan nominal total yang sudah dibayar pelanggan</p></div>
          </div>
          <DialogFooter><Button onClick={handleUpdatePayment} disabled={updateLoading} className="bg-blue-600">{updateLoading ? <Loader2 className="animate-spin"/> : "Simpan"}</Button></DialogFooter>
        </DialogContent></Dialog>
      </div>
    </Layout>
  );
};

export default LaporanPenjualan;
