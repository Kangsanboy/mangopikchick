import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, CalendarCheck, Banknote, Save, Loader2, Edit } from "lucide-react";

// Tipe data sesuai tabel customer_master
interface CustomerEmployee {
  id: string;
  customer_name: string; // Pakai customer_name
  daily_base_salary: number;
  overtime_rate: number;
}

interface AttendanceLog {
  id: string;
  customer_id: string;
  date: string;
  status: 'Hadir' | 'Izin' | 'Alpha';
  overtime_hours: number;
  customer_master?: CustomerEmployee; // Relasi join
}

const Karyawan = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"absen" | "laporan" | "gaji">("absen");
  const [loading, setLoading] = useState(false);

  // States Data
  const [employees, setEmployees] = useState<CustomerEmployee[]>([]);
  
  // States Absensi Input
  const [absenDate, setAbsenDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }));
  const [inputAttendance, setInputAttendance] = useState<{ [key: string]: { status: string; overtime: string } }>({});

  // States Laporan & Edit Gaji
  const [reportStartDate, setReportStartDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }));
  const [reportEndDate, setReportEndDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }));
  const [reportLogs, setReportLogs] = useState<AttendanceLog[]>([]);
  
  // State Edit Gaji
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBase, setEditBase] = useState("");
  const [editOvertime, setEditOvertime] = useState("");

  useEffect(() => { loadEmployees(); }, []);

  useEffect(() => {
    if (activeTab === "laporan") loadReport();
    if (activeTab === "absen") loadExistingAttendance();
  }, [activeTab, absenDate, reportStartDate, reportEndDate]);

  // --- 1. LOAD DATA ---
  const loadEmployees = async () => {
    setLoading(true);
    // Ambil dari customer_master
    const { data } = await supabase.from('customer_master').select('*').eq('is_active', true).order('customer_name');
    setEmployees(data || []);
    
    const initialInput: any = {};
    data?.forEach(emp => {
      initialInput[emp.id] = { status: 'Hadir', overtime: '0' };
    });
    setInputAttendance(prev => ({ ...initialInput, ...prev }));
    setLoading(false);
  };

  const loadExistingAttendance = async () => {
    const { data } = await supabase.from('attendance_logs').select('*').eq('date', absenDate);
    if (data && data.length > 0) {
      const loaded: any = {};
      data.forEach(log => {
        loaded[log.customer_id] = { status: log.status, overtime: log.overtime_hours.toString() };
      });
      setInputAttendance(prev => ({ ...prev, ...loaded }));
    } else {
      // Reset kalau hari baru
      const reset: any = {};
      employees.forEach(emp => {
        reset[emp.id] = { status: 'Hadir', overtime: '0' };
      });
      setInputAttendance(reset);
    }
  };

  const loadReport = async () => {
    setLoading(true);
    // Join ke customer_master
    const { data, error } = await supabase
      .from('attendance_logs')
      .select('*, customer_master(*)') 
      .gte('date', reportStartDate)
      .lte('date', reportEndDate)
      .order('date', { ascending: false });
    
    if (error) console.error(error);
    setReportLogs(data || []);
    setLoading(false);
  };

  // --- 2. UPDATE GAJI ---
  const updateSalary = async (id: string) => {
    await supabase.from('customer_master').update({
      daily_base_salary: parseInt(editBase) || 0,
      overtime_rate: parseInt(editOvertime) || 0
    }).eq('id', id);
    setEditingId(null);
    loadEmployees();
    toast({ title: "Tersimpan", description: "Nominal gaji diperbarui" });
  };

  // --- 3. SIMPAN ABSEN ---
  const saveAttendance = async () => {
    setLoading(true);
    const updates = employees.map(emp => ({
      customer_id: emp.id,
      date: absenDate,
      status: inputAttendance[emp.id]?.status || 'Hadir',
      overtime_hours: parseFloat(inputAttendance[emp.id]?.overtime || '0')
    }));

    const { error } = await supabase.from('attendance_logs').upsert(updates, { onConflict: 'customer_id,date' });
    
    if (error) toast({ title: "Gagal", description: error.message, variant: "destructive" });
    else toast({ title: "Berhasil", description: "Data absensi tersimpan!" });
    
    setLoading(false);
  };

  const handleInputChange = (id: string, field: 'status' | 'overtime', value: string) => {
    setInputAttendance(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const formatRp = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  // --- 4. HITUNG GAJI ---
  const salarySummary = employees.map(emp => {
    const myLogs = reportLogs.filter(log => log.customer_id === emp.id);
    const hadirCount = myLogs.filter(l => l.status === 'Hadir').length;
    const totalOvertimeHours = myLogs.reduce((sum, l) => sum + (l.overtime_hours || 0), 0);
    
    const totalGajiPokok = hadirCount * (emp.daily_base_salary || 0);
    const totalGajiLembur = totalOvertimeHours * (emp.overtime_rate || 0);
    const grandTotal = totalGajiPokok + totalGajiLembur;

    return { name: emp.customer_name, hadir: hadirCount, lemburJam: totalOvertimeHours, totalGajiPokok, totalGajiLembur, grandTotal };
  });

  const totalPayout = salarySummary.reduce((sum, s) => sum + s.grandTotal, 0);

  return (
    <Layout>
      <div className="space-y-6 pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div><h1 className="text-3xl font-bold text-gray-900">Manajemen Karyawan</h1><p className="text-gray-600">Data diambil dari Database Pelanggan</p></div>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button onClick={() => setActiveTab("absen")} className={`px-4 py-2 rounded text-sm font-medium ${activeTab === "absen" ? "bg-white text-blue-700 shadow" : "text-gray-500"}`}>Absensi</button>
            <button onClick={() => setActiveTab("laporan")} className={`px-4 py-2 rounded text-sm font-medium ${activeTab === "laporan" ? "bg-white text-green-700 shadow" : "text-gray-500"}`}>Laporan Gaji</button>
            <button onClick={() => setActiveTab("gaji")} className={`px-4 py-2 rounded text-sm font-medium ${activeTab === "gaji" ? "bg-white text-gray-900 shadow" : "text-gray-500"}`}>Setting Gaji</button>
          </div>
        </div>

        {/* TAB 1: INPUT ABSEN */}
        {activeTab === "absen" && (
          <Card className="border-t-4 border-t-blue-500">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><CalendarCheck className="h-5 w-5"/> Input Absensi Harian</CardTitle>
              <div className="flex items-center gap-2"><Label>Tanggal:</Label><Input type="date" value={absenDate} onChange={e => setAbsenDate(e.target.value)} className="w-auto h-9" /></div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className="bg-gray-50"><TableRow><TableHead>Nama Karyawan</TableHead><TableHead>Status</TableHead><TableHead>Lembur (Jam)</TableHead><TableHead className="text-right">Estimasi Upah</TableHead></TableRow></TableHeader>
                <TableBody>{employees.map(emp => {
                  const status = inputAttendance[emp.id]?.status || 'Hadir';
                  const lembur = parseFloat(inputAttendance[emp.id]?.overtime || '0');
                  const est = (status === 'Hadir' ? (emp.daily_base_salary||0) : 0) + (lembur * (emp.overtime_rate||0));
                  return (
                    <TableRow key={emp.id}>
                      <TableCell className="font-bold">{emp.customer_name}</TableCell>
                      <TableCell><Select value={status} onValueChange={(v) => handleInputChange(emp.id, 'status', v)}><SelectTrigger className="w-[120px]"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Hadir">Hadir</SelectItem><SelectItem value="Izin">Izin</SelectItem><SelectItem value="Alpha">Alpha</SelectItem></SelectContent></Select></TableCell>
                      <TableCell><Input type="number" className="w-20" value={inputAttendance[emp.id]?.overtime} onChange={(e) => handleInputChange(emp.id, 'overtime', e.target.value)} /></TableCell>
                      <TableCell className="text-right text-gray-600">{formatRp(est)}</TableCell>
                    </TableRow>
                  )
                })}</TableBody>
              </Table>
              <Button onClick={saveAttendance} disabled={loading} className="w-full mt-4 bg-blue-600 hover:bg-blue-700">{loading ? <Loader2 className="animate-spin"/> : "Simpan Absensi"}</Button>
            </CardContent>
          </Card>
        )}

        {/* TAB 2: LAPORAN GAJI */}
        {activeTab === "laporan" && (
          <div className="space-y-6">
            <Card><CardContent className="p-4 flex gap-4 items-end"><div className="flex-1"><Label>Dari</Label><Input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)}/></div><div className="flex-1"><Label>Sampai</Label><Input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)}/></div><div className="text-right"><p className="text-sm text-gray-500">Total Gaji Dibayarkan</p><p className="text-2xl font-bold text-green-700">{formatRp(totalPayout)}</p></div></CardContent></Card>
            
            <Card>
              <CardHeader><CardTitle className="flex gap-2"><Banknote className="h-5 w-5"/> Rekap Gaji</CardTitle></CardHeader>
              <CardContent className="p-0"><Table><TableHeader className="bg-green-50"><TableRow><TableHead>Nama</TableHead><TableHead className="text-center">Hadir</TableHead><TableHead className="text-center">Lembur</TableHead><TableHead className="text-right">Gaji Pokok</TableHead><TableHead className="text-right">Upah Lembur</TableHead><TableHead className="text-right font-bold">TOTAL</TableHead></TableRow></TableHeader>
                <TableBody>{salarySummary.map((d, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="text-center">{d.hadir} Hari</TableCell>
                    <TableCell className="text-center">{d.lemburJam} Jam</TableCell>
                    <TableCell className="text-right">{formatRp(d.totalGajiPokok)}</TableCell>
                    <TableCell className="text-right">{formatRp(d.totalGajiLembur)}</TableCell>
                    <TableCell className="text-right font-bold text-green-700 bg-green-50/30">{formatRp(d.grandTotal)}</TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table></CardContent>
            </Card>
          </div>
        )}

        {/* TAB 3: SETTING GAJI (Langsung Edit Customer Master) */}
        {activeTab === "gaji" && (
          <Card>
            <CardHeader><CardTitle className="flex gap-2"><Users className="h-5 w-5"/> Atur Gaji Karyawan (Pelanggan)</CardTitle></CardHeader>
            <CardContent><Table><TableHeader><TableRow><TableHead>Nama Karyawan</TableHead><TableHead>Gaji Pokok / Hari</TableHead><TableHead>Lembur / Jam</TableHead><TableHead className="text-center">Aksi</TableHead></TableRow></TableHeader>
              <TableBody>{employees.map(emp => (
                <TableRow key={emp.id}>
                  <TableCell className="font-bold">{emp.customer_name}</TableCell>
                  <TableCell>{editingId === emp.id ? <Input type="number" value={editBase} onChange={e => setEditBase(e.target.value)}/> : formatRp(emp.daily_base_salary || 0)}</TableCell>
                  <TableCell>{editingId === emp.id ? <Input type="number" value={editOvertime} onChange={e => setEditOvertime(e.target.value)}/> : formatRp(emp.overtime_rate || 0)}</TableCell>
                  <TableCell className="text-center">
                    {editingId === emp.id ? (
                      <Button size="sm" onClick={() => updateSalary(emp.id)} className="bg-green-600">Simpan</Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => { setEditingId(emp.id); setEditBase(emp.daily_base_salary?.toString()||"0"); setEditOvertime(emp.overtime_rate?.toString()||"0"); }}><Edit className="h-4 w-4"/></Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}</TableBody>
            </Table></CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Karyawan;
