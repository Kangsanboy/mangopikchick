import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, CalendarCheck, Banknote, Save, Loader2, Check, X, Minus, ChevronLeft, ChevronRight, Edit, Trash2, Wallet, ArrowRight } from "lucide-react";

interface Employee {
  id: string;
  name: string;
  daily_base_salary: number;
  overtime_rate: number;
}

interface AttendanceLog {
  id: string;
  employee_id: string;
  date: string;
  status: 'Hadir' | 'Izin' | 'Alpha';
  overtime_type: 'NONE' | 'HALF' | 'FULL';
}

const Karyawan = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // --- STATES ---
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  // State Tanggal Absen (Untuk Input Harian)
  const [absenDate, setAbsenDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }));
  
  // State Tanggal Gaji (Range Filter)
  const [salaryStartDate, setSalaryStartDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }));
  const [salaryEndDate, setSalaryEndDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }));

  const [currentWeekStart, setCurrentWeekStart] = useState(new Date()); 

  // Data
  const [inputAttendance, setInputAttendance] = useState<{ [key: string]: { status: string, overtime: string } }>({});
  const [weeklyLogs, setWeeklyLogs] = useState<AttendanceLog[]>([]);
  
  // PERBAIKAN: State khusus untuk menampung log absen sesuai range tanggal gaji (bukan ambil dari operasional lagi)
  const [salaryLogs, setSalaryLogs] = useState<AttendanceLog[]>([]); 

  // State Dialog Edit
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AttendanceLog | null>(null);
  const [editStatus, setEditStatus] = useState("Hadir");
  const [editOvertimeType, setEditOvertimeType] = useState("NONE");

  useEffect(() => { 
    loadEmployees(); 
    // Init mingguan (Senin minggu ini)
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(today.setDate(diff));
    setCurrentWeekStart(monday);
  }, []);

  // Sync Salary Date with Absen Date (Auto set mingguan)
  useEffect(() => {
    const d = new Date(absenDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Cari Senin
    
    const monday = new Date(d);
    monday.setDate(diff);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6); // Cari Minggu

    setSalaryStartDate(monday.toLocaleDateString('en-CA'));
    setSalaryEndDate(sunday.toLocaleDateString('en-CA'));
    setCurrentWeekStart(monday);
  }, [absenDate]);

  useEffect(() => {
    if (employees.length > 0) {
      loadWeeklyData();
      loadDailyInputData();
    }
  }, [employees, absenDate, currentWeekStart]);

  // Load Data Absen untuk Monitor Gaji setiap kali Range Tanggal berubah
  useEffect(() => {
    if (employees.length > 0) {
      loadSalaryLogs();
    }
  }, [salaryStartDate, salaryEndDate, employees]);

  // --- 1. LOAD DATA ---
  const loadEmployees = async () => {
    setLoading(true);
    const { data } = await supabase.from('employees').select('*').eq('is_active', true).order('name');
    setEmployees(data || []);
    
    const initialInput: any = {};
    data?.forEach(emp => {
      initialInput[emp.id] = { status: 'Hadir', overtime: 'NONE' };
    });
    setInputAttendance(prev => ({ ...initialInput, ...prev }));
    setLoading(false);
  };

  const loadWeeklyData = async () => {
    const startStr = currentWeekStart.toLocaleDateString('en-CA');
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    const endStr = end.toLocaleDateString('en-CA');

    const { data } = await supabase.from('attendance_logs').select('*').gte('date', startStr).lte('date', endStr);
    setWeeklyLogs(data || []);
  };

  const loadDailyInputData = async () => {
    const { data: logs } = await supabase.from('attendance_logs').select('*').eq('date', absenDate);
    if (logs && logs.length > 0) {
      const loaded: any = {};
      logs.forEach(log => { 
        loaded[log.employee_id] = { status: log.status, overtime: log.overtime_type || 'NONE' }; 
      });
      setInputAttendance(prev => ({ ...prev, ...loaded }));
    } else {
      const reset: any = {};
      employees.forEach(emp => { reset[emp.id] = { status: 'Hadir', overtime: 'NONE' }; });
      setInputAttendance(reset);
    }
  };

  // PERBAIKAN: Ambil Log Absen untuk perhitungan gaji (BUKAN ambil data expenses)
  const loadSalaryLogs = async () => {
    const { data } = await supabase.from('attendance_logs')
      .select('*')
      .gte('date', salaryStartDate)
      .lte('date', salaryEndDate);
    setSalaryLogs(data || []);
  };

  // --- 2. LOGIC MINGGUAN ---
  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  };
  const changeWeek = (offset: number) => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + (offset * 7));
    setCurrentWeekStart(newStart);
  };
  const weekDays = getWeekDays();

  // --- 3. CLICK HANDLER (EDIT) ---
  const handleCellClick = (log: AttendanceLog | undefined) => {
    if (log) { 
      setSelectedLog(log); 
      setEditStatus(log.status); 
      setEditOvertimeType(log.overtime_type || 'NONE');
      setIsEditOpen(true); 
    } 
    else { toast({ title: "Info", description: "Input absen di form bawah dulu." }); }
  };

  const updateLog = async () => {
    if (!selectedLog) return;
    setLoading(true);
    const { error } = await supabase.from('attendance_logs').update({ 
      status: editStatus,
      overtime_type: editOvertimeType 
    }).eq('id', selectedLog.id);
    
    if (!error) { 
      toast({ title: "Update Berhasil" }); 
      setIsEditOpen(false); 
      loadWeeklyData(); 
      loadDailyInputData();
      loadSalaryLogs(); // Refresh Monitor Gaji
    }
    setLoading(false);
  };

  const deleteLog = async () => {
    if (!selectedLog || !confirm("Hapus absen ini?")) return;
    setLoading(true);
    const { error } = await supabase.from('attendance_logs').delete().eq('id', selectedLog.id);
    if (!error) { 
      toast({ title: "Dihapus" }); 
      setIsEditOpen(false); 
      loadWeeklyData(); 
      loadDailyInputData();
      loadSalaryLogs(); // Refresh Monitor Gaji
    }
    setLoading(false);
  };

  // --- 4. SIMPAN ABSEN ---
  const saveAttendance = async () => {
    setLoading(true);
    const updates = employees.map(emp => ({
      employee_id: emp.id,
      date: absenDate,
      status: inputAttendance[emp.id]?.status || 'Hadir',
      overtime_type: inputAttendance[emp.id]?.overtime || 'NONE'
    }));

    const { error } = await supabase.from('attendance_logs').upsert(updates, { onConflict: 'employee_id,date' });
    if (error) toast({ title: "Gagal", description: error.message, variant: "destructive" });
    else { 
      toast({ title: "Berhasil", description: "Absensi tersimpan!" }); 
      loadWeeklyData(); 
      loadSalaryLogs(); // Refresh gaji realtime
    }
    setLoading(false);
  };

  const handleInputChange = (id: string, field: 'status' | 'overtime', value: string) => {
    setInputAttendance(prev => ({ 
      ...prev, 
      [id]: { ...prev[id], [field]: value } 
    }));
  };

  const formatRp = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  // --- KALKULASI TOTAL GAJI (REALTIME DARI DATA MASTER) ---
  const totalSalaryEstimate = employees.reduce((sum, emp) => {
    const myLogs = salaryLogs.filter(l => l.employee_id === emp.id);
    let empTotal = 0;
    myLogs.forEach(log => {
      // Hitung Pokok
      if (log.status === 'Hadir') empTotal += emp.daily_base_salary;
      // Hitung Lembur
      if (log.overtime_type === 'FULL') empTotal += emp.overtime_rate;
      if (log.overtime_type === 'HALF') empTotal += (emp.overtime_rate / 2);
    });
    return sum + empTotal;
  }, 0);

  return (
    <Layout>
      <div className="space-y-8 pb-20">
        <div className="flex justify-between items-center">
          <div><h1 className="text-3xl font-bold text-gray-900">Karyawan & Gaji</h1><p className="text-gray-600">Monitoring Absensi & Kalkulasi Gaji</p></div>
        </div>

        {/* --- MONITOR ABSEN MINGGUAN --- */}
        <Card className="border-t-4 border-t-indigo-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-5 w-5 text-indigo-600" /> Monitor Absensi Mingguan</CardTitle>
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-md">
              <Button variant="ghost" size="sm" onClick={() => changeWeek(-1)}><ChevronLeft className="h-4 w-4"/></Button>
              <span className="text-xs font-medium w-32 text-center">{weekDays[0].toLocaleDateString('id-ID', {day:'numeric', month:'short'})} - {weekDays[6].toLocaleDateString('id-ID', {day:'numeric', month:'short'})}</span>
              <Button variant="ghost" size="sm" onClick={() => changeWeek(1)}><ChevronRight className="h-4 w-4"/></Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-indigo-50"><TableRow><TableHead className="w-[200px] font-bold text-indigo-900">Nama</TableHead>{weekDays.map((d, i) => (<TableHead key={i} className={`text-center text-xs w-[100px] ${d.toLocaleDateString('en-CA') === absenDate ? 'bg-indigo-100 border-b-2 border-indigo-500 text-indigo-800 font-bold' : ''}`}><div className="uppercase">{d.toLocaleDateString('id-ID', { weekday: 'short' })}</div><div>{d.getDate()}</div></TableHead>))}</TableRow></TableHeader>
              <TableBody>
                {employees.map(emp => (
                  <TableRow key={emp.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium border-r bg-gray-50/50">{emp.name}</TableCell>
                    {weekDays.map((d, i) => {
                      const dateStr = d.toLocaleDateString('en-CA');
                      const log = weeklyLogs.find(l => l.employee_id === emp.id && l.date === dateStr);
                      let Icon = <Minus className="h-3 w-3 text-gray-200 mx-auto" />;
                      let bgColor = "cursor-pointer hover:bg-gray-100"; 
                      let OvertimeBadge = null;

                      if (log) {
                        if (log.status === 'Hadir') { 
                          Icon = <Check className="h-4 w-4 text-green-600 mx-auto font-bold" />; 
                          bgColor = "bg-green-50/50 cursor-pointer hover:bg-green-100"; 
                        } 
                        else if (log.status === 'Izin') { Icon = <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded">I</span>; bgColor = "cursor-pointer hover:bg-gray-100"; } 
                        else if (log.status === 'Alpha') { Icon = <X className="h-4 w-4 text-red-500 mx-auto" />; bgColor = "bg-red-50/50 cursor-pointer hover:bg-red-100"; }
                        
                        if (log.overtime_type === 'FULL') OvertimeBadge = <span className="text-[9px] bg-blue-600 text-white px-1 rounded block mt-1">FULL</span>;
                        if (log.overtime_type === 'HALF') OvertimeBadge = <span className="text-[9px] bg-blue-300 text-blue-900 px-1 rounded block mt-1">HALF</span>;
                      }
                      return <TableCell key={i} className={`text-center p-2 border-r last:border-0 ${bgColor} ${dateStr === absenDate ? 'ring-1 ring-indigo-200 ring-inset' : ''}`} onClick={() => handleCellClick(log)}>{Icon}{OvertimeBadge}</TableCell>;
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* --- GRID INPUT & HASIL GAJI --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* KIRI: FORM INPUT ABSENSI */}
          <Card className="border-t-4 border-t-blue-500 h-full">
            <CardHeader className="flex flex-row items-center justify-between bg-blue-50/30 pb-4 border-b">
              <div className="space-y-1"><CardTitle className="flex items-center gap-2 text-blue-800"><CalendarCheck className="h-5 w-5"/> Input Absensi</CardTitle><p className="text-xs text-gray-500">Pilih status kerja & lembur</p></div>
              <div className="flex items-center gap-2 bg-white p-1 rounded border shadow-sm"><Label className="pl-2 text-xs font-bold text-gray-500">TANGGAL:</Label><Input type="date" value={absenDate} onChange={e => setAbsenDate(e.target.value)} className="w-auto h-8 border-none focus-visible:ring-0" /></div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-100"><TableRow><TableHead className="w-[40%]">Nama Karyawan</TableHead><TableHead className="w-[30%]">Kerja</TableHead><TableHead className="w-[30%]">Lembur</TableHead></TableRow></TableHeader>
                <TableBody>
                  {employees.map(emp => {
                    const status = inputAttendance[emp.id]?.status || 'Hadir';
                    const overtime = inputAttendance[emp.id]?.overtime || 'NONE';
                    return (
                      <TableRow key={emp.id} className="hover:bg-blue-50/30 transition-colors">
                        <TableCell className="font-bold text-gray-700">{emp.name}</TableCell>
                        <TableCell>
                          <Select value={status} onValueChange={(v) => handleInputChange(emp.id, 'status', v)}>
                            <SelectTrigger className={`h-8 w-full border-0 shadow-sm ${status === 'Hadir' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}><SelectValue/></SelectTrigger>
                            <SelectContent><SelectItem value="Hadir">Hadir</SelectItem><SelectItem value="Izin">Izin</SelectItem><SelectItem value="Alpha">Alpha</SelectItem></SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={overtime} onValueChange={(v) => handleInputChange(emp.id, 'overtime', v)}>
                            <SelectTrigger className={`h-8 w-full border-0 shadow-sm ${overtime === 'FULL' ? 'bg-blue-100 text-blue-800' : overtime === 'HALF' ? 'bg-blue-50 text-blue-600' : ''}`}><SelectValue/></SelectTrigger>
                            <SelectContent><SelectItem value="NONE">-</SelectItem><SelectItem value="HALF">Setengah</SelectItem><SelectItem value="FULL">Full</SelectItem></SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              <div className="p-4 bg-gray-50 border-t"><Button onClick={saveAttendance} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 h-10 shadow-md font-bold tracking-wide">{loading ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 h-4 w-4"/>} SIMPAN ABSEN</Button></div>
            </CardContent>
          </Card>

          {/* KANAN: MONITOR GAJI RANGE (PERBAIKAN LOGIKA) */}
          <Card className="border-t-4 border-t-emerald-500 h-full">
            <CardHeader className="bg-emerald-50/30 pb-4 border-b">
              <div className="flex justify-between items-center mb-3">
                <CardTitle className="flex items-center gap-2 text-emerald-800"><Wallet className="h-5 w-5"/> Monitor Gaji (Estimasi)</CardTitle>
                <Badge variant="outline" className="bg-white border-emerald-200 text-emerald-700">Auto Sync</Badge>
              </div>
              
              {/* DATE RANGE FILTER */}
              <div className="flex items-center gap-2 text-sm bg-white p-2 rounded border border-emerald-100">
                <div className="flex items-center gap-1">
                  <Label className="text-xs text-gray-500">Dari:</Label>
                  <Input type="date" value={salaryStartDate} onChange={e => setSalaryStartDate(e.target.value)} className="h-7 w-auto text-xs px-2" />
                </div>
                <ArrowRight className="h-3 w-3 text-gray-400" />
                <div className="flex items-center gap-1">
                  <Label className="text-xs text-gray-500">Sampai:</Label>
                  <Input type="date" value={salaryEndDate} onChange={e => setSalaryEndDate(e.target.value)} className="h-7 w-auto text-xs px-2" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-100"><TableRow><TableHead>Nama</TableHead><TableHead className="text-right">Gaji Pokok</TableHead><TableHead className="text-right">Lembur</TableHead><TableHead className="text-right font-bold">Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {employees.map(emp => {
                    // Filter log absensi yang masuk range tanggal terpilih untuk karyawan ini
                    const myLogs = salaryLogs.filter(l => l.employee_id === emp.id);
                    let estimatedPokok = 0;
                    let estimatedLembur = 0;

                    myLogs.forEach(log => {
                      // 1. Hitung Gaji Pokok (Hadir * Rate Master)
                      if (log.status === 'Hadir') {
                        estimatedPokok += emp.daily_base_salary;
                      }
                      
                      // 2. Hitung Lembur (Tipe * Rate Master)
                      if (log.overtime_type === 'FULL') {
                        estimatedLembur += emp.overtime_rate;
                      } else if (log.overtime_type === 'HALF') {
                        estimatedLembur += (emp.overtime_rate / 2);
                      }
                    });

                    const grandTotal = estimatedPokok + estimatedLembur;
                    
                    return (
                      <TableRow key={emp.id} className="hover:bg-emerald-50/30">
                        <TableCell className="font-medium text-gray-700">{emp.name}</TableCell>
                        <TableCell className="text-right text-gray-600">{estimatedPokok > 0 ? formatRp(estimatedPokok) : '-'}</TableCell>
                        <TableCell className="text-right text-orange-600 font-medium">{estimatedLembur > 0 ? formatRp(estimatedLembur) : '-'}</TableCell>
                        <TableCell className="text-right font-bold text-emerald-700">{grandTotal > 0 ? formatRp(grandTotal) : '-'}</TableCell>
                      </TableRow>
                    )
                  })}
                  
                  {/* TOTAL FOOTER */}
                  <TableRow className="bg-gray-50 border-t-2 border-gray-200">
                    <TableCell className="font-bold text-gray-900">TOTAL ESTIMASI</TableCell>
                    <TableCell colSpan={3} className="text-right font-bold text-lg text-emerald-800">
                      {formatRp(totalSalaryEstimate)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

        </div>

        {/* DIALOG EDIT ABSEN */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}><DialogContent><DialogHeader><DialogTitle>Edit Absen</DialogTitle></DialogHeader>
            <div className="py-2 space-y-4">
              <div><Label>Status Kerja</Label><Select value={editStatus} onValueChange={setEditStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Hadir">Hadir</SelectItem><SelectItem value="Izin">Izin</SelectItem><SelectItem value="Alpha">Alpha</SelectItem></SelectContent></Select></div>
              <div><Label>Lembur</Label><Select value={editOvertimeType} onValueChange={(v:any) => setEditOvertimeType(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NONE">-</SelectItem><SelectItem value="HALF">Setengah</SelectItem><SelectItem value="FULL">Full</SelectItem></SelectContent></Select></div>
            </div>
            <DialogFooter><Button variant="destructive" onClick={deleteLog} disabled={loading}>{loading ? <Loader2 className="animate-spin"/> : <Trash2 className="h-4 w-4 mr-2"/>} Hapus Data</Button><Button onClick={updateLog} disabled={loading}>{loading ? <Loader2 className="animate-spin"/> : <Save className="h-4 w-4 mr-2"/>} Simpan Perubahan</Button></DialogFooter>
        </DialogContent></Dialog>
      </div>
    </Layout>
  );
};

export default Karyawan;
