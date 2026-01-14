import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SaleData, TABLE_NAMES } from "@/types/database";
import { 
  Download, 
  FileText, 
  Calendar,
  Users,
  TrendingUp,
  Filter,
  Loader2,
  Printer,       // Icon Baru
  CheckCircle2,  // Icon Baru
  XCircle,       // Icon Baru
  Clock          // Icon Baru
} from "lucide-react";

// Kita perluaas tipe data biar typescript ga protes soal kolom baru
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

  // States untuk Update Status (Fitur Baru)
  const [selectedSale, setSelectedSale] = useState<ExtendedSaleData | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);

  // Load data from Supabase
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
      console.error('Error loading sales data:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data penjualan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  // Filter sales data logic (Fitur Lama - Dipertahankan)
  useEffect(() => {
    let filtered = [...sales];

    if (startDate) {
      filtered = filtered.filter(sale => sale.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(sale => sale.date <= endDate);
    }
    if (customerFilter) {
      filtered = filtered.filter(sale => 
        sale.customer_name.toLowerCase().includes(customerFilter.toLowerCase())
      );
    }
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setFilteredSales(filtered);
  }, [sales, startDate, endDate, customerFilter]);

  // --- FUNGSI BARU: Update Status Pembayaran ---
  const handleUpdateStatus = async () => {
    if (!selectedSale || !newStatus) return;
    setUpdateLoading(true);

    try {
      const { error } = await supabase
        .from(TABLE_NAMES.SALES)
        .update({ payment_status: newStatus })
        .eq('id', selectedSale.id);

      if (error) throw error;

      toast({ title: "Berhasil", description: "Status pembayaran diperbarui" });
      setIsDialogOpen(false);
      loadSales(); // Refresh data tabel
    } catch (error) {
      toast({ title: "Error", description: "Gagal update status", variant: "destructive" });
    } finally {
      setUpdateLoading(false);
    }
  };

  // --- FUNGSI BARU: Cetak Resi ---
  const handlePrint = (sale: ExtendedSaleData) => {
    const receiptContent = `
      <html>
        <head>
          <title>Resi Penjualan - Ayam Potong Gacor</title>
          <style>
            body { font-family: 'Courier New', monospace; font-size: 12px; width: 300px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .title { font-size: 16px; font-weight: bold; }
            .info { margin-bottom: 10px; }
            .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .total { border-top: 1px dashed #000; margin-top: 10px; padding-top: 10px; font-weight: bold; font-size: 14px; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">AYAM POTONG GACOR</div>
            <div>Struk Penjualan Resmi</div>
          </div>
          <div class="info">
            <div>Tgl: ${new Date(sale.date).toLocaleDateString('id-ID')}</div>
            <div>Pelanggan: ${sale.customer_name}</div>
            <div>Status: ${sale.payment_status || 'Belum Lunas'}</div>
          </div>
          <div class="items">
             <div class="item">
                <span>${sale.product_type || 'Ayam'} (${sale.quantity} ekor)</span>
             </div>
             <div class="item">
                <span>Berat: ${sale.weight} Kg x ${formatCurrency(sale.price_per_kg)}</span>
             </div>
          </div>
          <div class="item total">
            <span>TOTAL</span>
            <span>${formatCurrency(sale.total_price)}</span>
          </div>
          <div class="footer">
            <p>Terima Kasih!</p>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;
    const printWindow = window.open('', '', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(receiptContent);
      printWindow.document.close();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  const getStatusColor = (status: string) => {
    if (status === 'Lunas') return "bg-green-100 text-green-800 border-green-200 hover:bg-green-200";
    if (status === 'Sebagian') return "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200";
    return "bg-red-100 text-red-800 border-red-200 hover:bg-red-200";
  };

  // Calculate totals (Fitur Lama)
  const totalQuantity = filteredSales.reduce((sum, sale) => sum + sale.quantity, 0);
  const totalWeight = filteredSales.reduce((sum, sale) => sum + sale.weight, 0);
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total_price, 0);
  const uniqueCustomers = new Set(filteredSales.map(sale => sale.customer_name)).size;

  // Export Excel (Diupdate biar kolom baru ikut ke-download)
  const exportToExcel = () => {
    if (filteredSales.length === 0) {
      toast({ title: "Tidak ada data", description: "Tidak ada data penjualan untuk diekspor", variant: "destructive" });
      return;
    }

    const headers = [
      'Tanggal',
      'Nama Pelanggan',
      'Jenis Produk',     // UPDATE
      'Status Pembayaran', // UPDATE
      'Jumlah Ekor',
      'Berat Total (Kg)',
      'Harga per Kg (Rp)',
      'Total Harga (Rp)'
    ];

    const dataRows = filteredSales.map(sale => [
      new Date(sale.date).toLocaleDateString('id-ID'),
      `"${sale.customer_name}"`,
      `"${sale.product_type || '-'}"`,        // UPDATE
      `"${sale.payment_status || 'Belum Lunas'}"`, // UPDATE
      sale.quantity,
      sale.weight.toFixed(1),
      sale.price_per_kg.toLocaleString('id-ID'),
      sale.total_price.toLocaleString('id-ID')
    ]);

    const csvRows = [headers.join(','), ...dataRows.map(row => row.join(','))];
    const summaryRows = [
      '', '=== RINGKASAN LAPORAN ===',
      `Total Transaksi,${filteredSales.length}`,
      `Total Pendapatan (Rp),${totalRevenue.toLocaleString('id-ID')}`,
      '', 'Generated by Ayam Potong Gacor'
    ];
    
    const allRows = [...csvRows, ...summaryRows];
    const csvContent = '\uFEFF' + allRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Laporan_Gacor_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast({ title: "Berhasil Export!", description: "File Excel berhasil diunduh" });
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setCustomerFilter("");
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Laporan Penjualan</h1>
            <p className="text-gray-600 mt-1">Lihat riwayat transaksi, status pembayaran, dan cetak resi</p>
            {loading && (
              <div className="flex items-center gap-2 text-gray-600 mt-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Memuat data...</span>
              </div>
            )}
          </div>
          <Button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700" disabled={loading}>
            <Download className="h-4 w-4 mr-2" />
            Unduh Excel
          </Button>
        </div>

        {/* Summary Cards (Fitur Lama) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Total Transaksi</CardTitle>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">{filteredSales.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Total Pelanggan</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">{uniqueCustomers}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700">Total Ekor</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">{totalQuantity}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-700">Total Pendapatan</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900">{formatCurrency(totalRevenue)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters (Fitur Lama) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" /> Filter Laporan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Tanggal Mulai</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label>Tanggal Akhir</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div>
                <Label>Nama Pelanggan</Label>
                <Input placeholder="Cari..." value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters} className="w-full">Reset Filter</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales Table (GABUNGAN FITUR) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5" /> Detail Penjualan
              </span>
              <Badge variant="outline">{filteredSales.length} transaksi</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredSales.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Nama Pelanggan</TableHead>
                      <TableHead>Jenis Produk</TableHead> {/* NEW */}
                      <TableHead className="text-center">Jumlah</TableHead>
                      <TableHead className="text-right">Total Harga</TableHead>
                      <TableHead className="text-center">Status</TableHead> {/* NEW */}
                      <TableHead className="text-center">Cetak</TableHead> {/* NEW */}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            {new Date(sale.date).toLocaleDateString('id-ID')}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{sale.customer_name}</TableCell>
                        <TableCell>
                           <Badge variant="outline" className="font-normal text-gray-600">
                             {sale.product_type || '-'}
                           </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="text-sm font-semibold">{sale.quantity} Ekor</div>
                          <div className="text-xs text-gray-500">{sale.weight} Kg</div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(sale.total_price)}
                        </TableCell>

                        {/* FITUR BARU: Kolom Status (Klik untuk Ubah) */}
                        <TableCell className="text-center">
                          <Dialog open={isDialogOpen && selectedSale?.id === sale.id} onOpenChange={(open) => {
                            setIsDialogOpen(open);
                            if (!open) setSelectedSale(null);
                          }}>
                            <DialogTrigger asChild>
                              <div 
                                onClick={() => { setSelectedSale(sale); setNewStatus(sale.payment_status || 'Belum Lunas'); }}
                                className={`cursor-pointer inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${getStatusColor(sale.payment_status || 'Belum Lunas')}`}
                              >
                                {sale.payment_status || 'Belum Lunas'}
                              </div>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Update Pembayaran</DialogTitle>
                              </DialogHeader>
                              <div className="py-4 space-y-4">
                                <p className="text-sm text-gray-500">Pelanggan: <b>{selectedSale?.customer_name}</b></p>
                                <div>
                                  <Label>Status Pembayaran</Label>
                                  <Select value={newStatus} onValueChange={setNewStatus}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Belum Lunas">
                                        <div className="flex items-center gap-2"><XCircle className="h-4 w-4 text-red-500"/> Belum Lunas</div>
                                      </SelectItem>
                                      <SelectItem value="Sebagian">
                                        <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-yellow-500"/> Bayar Sebagian</div>
                                      </SelectItem>
                                      <SelectItem value="Lunas">
                                        <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500"/> Lunas</div>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                                <Button onClick={handleUpdateStatus} disabled={updateLoading}>
                                  {updateLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : "Simpan"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>

                        {/* FITUR BARU: Kolom Cetak */}
                        <TableCell className="text-center">
                           <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-gray-500 hover:text-blue-600"
                            onClick={() => handlePrint(sale)}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Summary Row */}
                <div className="border-t mt-4 pt-4">
                  <div className="grid grid-cols-6 gap-4 text-sm font-medium">
                    <div className="col-span-2 text-gray-700">TOTAL</div>
                    <div className="col-span-2 text-center text-gray-700">{totalQuantity} ekor / {totalWeight.toFixed(1)} Kg</div>
                    <div className="text-right text-green-600 font-bold">{formatCurrency(totalRevenue)}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">Tidak ada data penjualan</div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default LaporanPenjualan;
