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
import { Users, CalendarCheck, Save, Loader2 } from "lucide-react";

interface CustomerEmployee {
  id: string;
  customer_name: string;
}

interface AttendanceLog {
  id: string;
  customer_id: string;
  date: string;
  status: 'Hadir' | 'Izin' | 'Alpha';
  overtime_hours: number;
  customer_master?: CustomerEmployee; 
}

const Karyawan = () => {
  const { toast } = useToast();
  // Hanya ada 2 Tab sekarang
  const [activeTab, setActiveTab] = useState<"absen" | "laporan">("absen");
  const [loading, setLoading] = useState(false);

  // States Data
  const [employees, setEmployees] = useState<CustomerEmployee[]>([]);
  
  // States Absensi Input
  const [absenDate, setAbsenDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }));
  const [inputAttendance, setInputAttendance] = useState<{ [key: string]: { status: string; overtime: string } }>({});

  // States Laporan
  const [reportStartDate, setReportStartDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }));
  const [reportEndDate, setReportEndDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }));
  const [reportLogs, setReportLogs] = useState<AttendanceLog[]>([]);

  useEffect(() => { loadEmployees(); }, []);

  useEffect(() => {
    if (activeTab === "laporan") loadReport();
    if (activeTab === "absen") loadExistingAttendance();
  }, [activeTab, absenDate, reportStartDate, reportEndDate]);

  // --- LOAD DATA ---
  const loadEmployees = async () => {
    setLoading(true);
    const { data } = await supabase.from('customer_master').select('id, customer_name').eq('is_active', true).order('customer_name');
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
      const reset: any = {};
      employees.forEach(emp => {
        reset[emp.id] = { status: 'Hadir', overtime: '0' };
      });
      setInputAttendance(reset);
    }
  };

  const loadReport = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('attendance_logs')
      .select('*, customer_master(customer_name)') 
      .gte('date', reportStartDate)
      .lte('date', reportEndDate)
      .order('date', { ascending: false });
    
    if (error) console.error(error);
    setReportLogs(data || []);
    setLoading(false);
  };

  // --- SAVE ACTION ---
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

  // --- SUMMARY LOGIC (Tanpa Rupiah, Cuma Jam/Hari) ---
  const attendanceSummary = employees.map(emp => {
    const myLogs = reportLogs.filter(log => log.customer_id === emp.id);
    const hadirCount = myLogs.filter(l => l.status === 'Hadir').length;
    const izinCount = myLogs.filter(l => l.status === 'Izin').length;
    const alphaCount = myLogs.filter(l => l.status === 'Alpha').length;
    const totalOvertimeHours = myLogs.reduce((sum, l) => sum + (l.overtime_hours || 0), 0);
    
    return { name: emp.customer_name, hadir: hadirCount, izin: izinCount, alpha: alphaCount, lemburJam: totalOvertimeHours };
  });

  return (
    <Layout>
      <div className="space-y-6 pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div><h1 className="text-3xl font-bold text-gray-900">Manajemen Absensi</h1><p className="text-gray-600">Monitoring kehadiran karyawan (Pelanggan)</p></div>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button onClick={() => setActiveTab("absen")} className={`px-4 py-2 rounded text-sm font-medium ${activeTab === "absen" ? "bg-white text-blue-700 shadow" : "text-gray-500"}`}>Input Absensi</button>
            <button onClick={() => setActiveTab("laporan")} className={`px-4 py-2 rounded text-sm font-medium ${activeTab === "laporan" ? "bg-white text-green-700 shadow" : "text-gray-500"}`}>Laporan Kehadiran</button>
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
                <TableHeader className="bg-gray-50"><TableRow><TableHead>Nama Karyawan</TableHead><TableHead>Status Kehadiran</TableHead><TableHead>Jam Lembur</TableHead></TableRow></TableHeader>
                <TableBody>{employees.map(emp => {
                  const status = inputAttendance[emp.id]?.status || 'Hadir';
                  return (
                    <TableRow key={emp.id}>
                      <TableCell className="font-bold">{emp.customer_name}</TableCell>
                      <TableCell><Select value={status} onValueChange={(v) => handleInputChange(emp.id, 'status', v)}><SelectTrigger className="w-[150px]"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Hadir">Hadir</SelectItem><SelectItem value="Izin">Izin</SelectItem><SelectItem value="Alpha">Alpha</SelectItem></SelectContent></Select></TableCell>
                      <TableCell><div className="flex items-center gap-2"><Input type="number" className="w-20" value={inputAttendance[emp.id]?.overtime} onChange={(e) => handleInputChange(emp.id, 'overtime', e.target.value)} /><span>Jam</span></div></TableCell>
                    </TableRow>
                  )
                })}</TableBody>
              </Table>
              <Button onClick={saveAttendance} disabled={loading} className="w-full mt-4 bg-blue-600 hover:bg-blue-700">{loading ? <Loader2 className="animate-spin"/> : "Simpan Absensi"}</Button>
            </CardContent>
          </Card>
        )}

        {/* TAB 2: LAPORAN KEHADIRAN (Hanya Rekap Waktu) */}
        {activeTab === "laporan" && (
          <div className="space-y-6">
            <Card><CardContent className="p-4 flex gap-4 items-end"><div className="flex-1"><Label>Dari</Label><Input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)}/></div><div className="flex-1"><Label>Sampai</Label><Input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)}/></div></CardContent></Card>
            
            <Card>
              <CardHeader><CardTitle className="flex gap-2"><Users className="h-5 w-5"/> Rekap Kehadiran (Tanpa Gaji)</CardTitle></CardHeader>
              <CardContent className="p-0"><Table><TableHeader className="bg-green-50"><TableRow><TableHead>Nama</TableHead><TableHead className="text-center">Hadir</TableHead><TableHead className="text-center">Izin</TableHead><TableHead className="text-center">Alpha</TableHead><TableHead className="text-center">Total Lembur</TableHead></TableRow></TableHeader>
                <TableBody>{attendanceSummary.map((d, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="text-center"><Badge className="bg-green-100 text-green-800">{d.hadir}</Badge></TableCell>
                    <TableCell className="text-center">{d.izin}</TableCell>
                    <TableCell className="text-center text-red-500 font-bold">{d.alpha}</TableCell>
                    <TableCell className="text-center font-bold text-blue-600">{d.lemburJam} Jam</TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table></CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Karyawan;
