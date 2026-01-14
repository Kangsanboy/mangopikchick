import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SaleData, TABLE_NAMES } from "@/types/database";
import { 
  Download, 
  FileText, 
  Calendar,
  Filter,
  Loader2,
  Printer,
  Edit,
  Wallet,
  ChevronRight
} from "lucide-react";

interface ExtendedSaleData extends SaleData {
  payment_status?: string;
  amount_paid?: number;
  product_type?: string;
}

const LaporanPenjualan = () => {
  const { toast } = useToast();
  const [sales, setSales] = useState<ExtendedSaleData[]>([]);
  const [filteredSales, setFilteredSales] = useState<ExtendedSaleData[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [loading, setLoading] = useState(true);

  // States untuk Update Pembayaran
  const [selectedSale, setSelectedSale] = useState<ExtendedSaleData | null>(null);
  const [inputPayment, setInputPayment] = useState(""); // Input uang yang dibayar
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);

  const loadSales = async () => {
    try {
      setLoading(true);
      const { data: salesData, error } = await supabase
        .from(TABLE_NAMES.SALES)
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      setSales(salesData || []);
      setFilteredSales(salesData || []);
    } catch (error) {
      console.error('Error:', error);
      toast({ title: "Error", description: "Gagal memuat data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  // Filter Logic
  useEffect(() => {
    let filtered = [...sales];
    if (startDate) filtered = filtered.filter(sale => sale.date >= startDate);
    if (endDate) filtered = filtered.filter(sale => sale.date <= endDate);
    if (customerFilter) {
      filtered = filtered.filter(sale => 
        sale.customer_name.toLowerCase().includes(customerFilter.toLowerCase())
      );
    }
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setFilteredSales(filtered);
  }, [sales, startDate, endDate, customerFilter]);

  // --- LOGIKA PEMBAYARAN BARU ---
  const handleUpdatePayment = async () => {
    if (!selectedSale) return;
    setUpdateLoading(true);

    try {
      const bayar = parseInt(inputPayment.replace(/\D/g, '')) || 0; // Hapus karakter non-angka
      const totalTagihan = selectedSale.total_price;
      
      // Tentukan status otomatis
      let statusOtomatis = "Belum Lunas";
      if (bayar >= totalTagihan) {
        statusOtomatis = "Lunas";
      }

      const { error } = await supabase
        .from(TABLE_NAMES.SALES)
        .update({ 
          payment_status: statusOtomatis,
          amount_paid: bayar 
        })
        .eq('id', selectedSale.id);

      if (error) throw error;

      toast({ 
        title: "Pembayaran Berhasil", 
        description: `Status: ${statusOtomatis}. Sisa Tagihan: ${formatCurrency(Math.max(0, totalTagihan - bayar))}` 
      });
      
      setIsDialogOpen(false);
      loadSales(); 
    } catch (error) {
      toast({ title: "Error", description: "Gagal simpan pembayaran", variant: "destructive" });
    } finally {
      setUpdateLoading(false);
    }
  };

  // --- STRUK GANTENG ---
  const handlePrint = (sale: ExtendedSaleData) => {
    const bayar = sale.amount_paid || 0;
    const total = sale.total_price;
    const sisa = bayar - total;
    const statusText = sisa >= 0 ? "KEMBALI" : "SISA HUTANG";

    const receiptContent = `
      <html>
        <head>
          <title>Resi - Ayam Potong Gacor</title>
          <style>
            body { font-family: 'Courier New', monospace; font-size: 12px; width: 100%; margin: 0; padding: 10px; }
            .container { max-width: 300px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 10px; }
            .title { font-size: 16px; font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .total-row { font-weight: bold; font-size: 14px; margin-top: 5px; }
            .footer { text-align: center; margin-top: 15px; font-size: 10px; }
            .lunas { border: 1px solid #000; padding: 2px 5px; border-radius: 4px; display: inline-block; margin-top: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="title">AYAM POTONG GACOR</div>
              <div>Jalan Pesantren No. 1</div>
            </div>
            
            <div class="divider"></div>
            
            <div class="row">
              <span>Tgl: ${new Date(sale.date).toLocaleDateString('id-ID')}</span>
              <span>${new Date().toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            <div class="row">
              <span>Plg: ${sale.customer_name}</span>
            </div>

            <div class="divider"></div>

            <div class="row">
              <span>${sale.product_type || 'Ayam'}</span>
            </div>
            <div class="row">
              <span>${sale.quantity} Ekor x ${formatCurrency(sale.price_per_kg)}</span>
              <span>${sale.weight} Kg</span>
            </div>
            
            <div class="divider"></div>
            
            <div class="row total-row">
              <span>TOTAL TAGIHAN</span>
              <span>${formatCurrency(total)}</span>
            </div>
            <div class="row">
              <span>BAYAR</span>
              <span>${formatCurrency(bayar)}</span>
            </div>
            <div class="row" style="margin-top:5px;">
              <span>${statusText}</span>
              <span>${formatCurrency(Math.abs(sisa))}</span>
            </div>

            <div class="header">
              <div class="lunas">${sale.payment_status || 'BELUM LUNAS'}</div>
            </div>

            <div class="footer">
              <p>Terima Kasih & Berkah Selalu!</p>
            </div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;
    const printWindow = window.open('', '', 'width=350,height=500');
    if (printWindow) {
      printWindow.document.write(receiptContent);
      printWindow.document.close();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  const getStatusColor = (status: string) => {
    if (status === 'Lunas') return "bg-green-100 text-green-700 border-green-200";
    return "bg-red-100 text-red-700 border-red-200";
  };

  const exportToExcel = () => {
    if (filteredSales.length === 0) return toast({ title: "Kosong", description: "Tidak ada data", variant: "destructive" });
    
    // Logic export sederhana (CSV)
    const headers = ['Tanggal', 'Pelanggan', 'Produk', 'Jumlah', 'Total Harga', 'Sudah Bayar', 'Status'];
    const rows = filteredSales.map(s => [
      s.date, s.customer_name, s.product_type, s.quantity, s.total_price, s.amount_paid || 0, s.payment_status
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Gacor_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <Layout>
      <div className="space-y-4 pb-20"> {/* pb-20 biar ga ketutupan di HP */}
        
        {/* Header Compact */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Laporan Penjualan</h1>
            <p className="text-gray-600 text-sm">Kelola pembayaran dan riwayat transaksi</p>
          </div>
          <Button onClick={exportToExcel} size="sm" className="bg-green-600 hover:bg-green-700 w-full md:w-auto">
            <Download className="h-4 w-4 mr-2" /> Export Excel
          </Button>
        </div>

        {/* Filter (Collapsible di Mobile bisa jadi ide, tapi ini standar dulu) */}
        <Card>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full" />
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full" />
            <Input placeholder="Cari Pelanggan..." value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} className="w-full" />
            <Button variant="outline" onClick={() => {setStartDate(""); setEndDate(""); setCustomerFilter("")}}>Reset</Button>
          </CardContent>
        </Card>

        {/* TAMPILAN MOBILE (Card View) - Hanya muncul di HP */}
        <div className="md:hidden space-y-3">
          {loading ? <div className="text-center p-4">Loading...</div> : filteredSales.map((sale) => (
            <Card key={sale.id} className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{sale.customer_name}</h3>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {new Date(sale.date).toLocaleDateString('id-ID')}
                    </div>
                  </div>
                  <Badge variant="outline" className={getStatusColor(sale.payment_status || 'Belum Lunas')}>
                    {sale.payment_status || 'Belum Lunas'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm mb-3 bg-gray-50 p-2 rounded">
                  <div>
                    <p className="text-gray-500 text-xs">Produk</p>
                    <p className="font-medium">{sale.product_type} ({sale.quantity} Ekor)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 text-xs">Total Tagihan</p>
                    <p className="font-bold text-gray-900">{formatCurrency(sale.total_price)}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t">
                  <div className="text-xs">
                    <p className="text-gray-500">Sudah Bayar:</p>
                    <p className={`font-semibold ${(sale.amount_paid || 0) < sale.total_price ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(sale.amount_paid || 0)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                     <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handlePrint(sale)}>
                        <Printer className="h-4 w-4" />
                     </Button>
                     <Button size="sm" className="bg-blue-600 h-8 text-xs" onClick={() => {
                        setSelectedSale(sale);
                        setInputPayment((sale.amount_paid || 0).toString());
                        setIsDialogOpen(true);
                     }}>
                        <Wallet className="h-3 w-3 mr-1" /> Bayar
                     </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* TAMPILAN DESKTOP (Table View) - Hidden di HP */}
        <Card className="hidden md:block">
          <CardHeader className="py-4">
            <CardTitle className="text-lg">Detail Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Sudah Bayar</TableHead>
                  <TableHead className="text-right">Sisa Hutang</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => {
                  const sisa = Math.max(0, sale.total_price - (sale.amount_paid || 0));
                  return (
                    <TableRow key={sale.id}>
                      <TableCell>{new Date(sale.date).toLocaleDateString('id-ID')}</TableCell>
                      <TableCell className="font-medium">{sale.customer_name}</TableCell>
                      <TableCell>{sale.product_type} <span className="text-gray-400 text-xs">({sale.quantity})</span></TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(sale.total_price)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(sale.amount_paid || 0)}</TableCell>
                      <TableCell className="text-right text-red-600 font-medium">
                        {sisa > 0 ? formatCurrency(sisa) : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={getStatusColor(sale.payment_status || 'Belum Lunas')}>
                          {sale.payment_status || 'Belum Lunas'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                          <Button size="icon" variant="ghost" onClick={() => handlePrint(sale)}>
                            <Printer className="h-4 w-4 text-gray-500" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => {
                            setSelectedSale(sale);
                            setInputPayment((sale.amount_paid || 0).toString());
                            setIsDialogOpen(true);
                          }}>
                            <Edit className="h-4 w-4 mr-1" /> Atur
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* DIALOG UPDATE PEMBAYARAN */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Update Pembayaran</DialogTitle>
              <p className="text-sm text-gray-500">Pelanggan: {selectedSale?.customer_name}</p>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Tagihan:</span>
                  <span className="font-bold">{selectedSale && formatCurrency(selectedSale.total_price)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Sudah Masuk:</span>
                  <span>{selectedSale && formatCurrency(selectedSale.amount_paid || 0)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nominal Pembayaran Baru (Total)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">Rp</span>
                  <Input 
                    type="number" 
                    placeholder="0"
                    className="pl-10 text-lg font-semibold"
                    value={inputPayment}
                    onChange={(e) => setInputPayment(e.target.value)}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  *Masukkan total uang yang diterima dari awal sampai sekarang.
                  <br/>Contoh: Jika cicil 50rb lalu bayar lagi 50rb, masukkan 100000.
                </p>
              </div>

              {selectedSale && inputPayment && (
                 <div className="text-right text-sm">
                    Sisa Hutang / Kembalian: <br/>
                    <span className={`font-bold text-lg ${
                       (parseInt(inputPayment) - selectedSale.total_price) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                       {formatCurrency(parseInt(inputPayment) - selectedSale.total_price)}
                    </span>
                 </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
              <Button onClick={handleUpdatePayment} disabled={updateLoading} className="bg-blue-600">
                {updateLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : "Simpan Pembayaran"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </Layout>
  );
};

export default LaporanPenjualan;
