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
import { Users, CalendarCheck, Banknote, Save, Loader2, Check, X, Minus, ChevronLeft, ChevronRight, Edit, Trash2 } from "lucide-react";

interface CustomerEmployee {
  id: string;
  customer_name: string;
  daily_base_salary: number;
}

interface AttendanceLog {
  id: string;
  customer_id: string;
  date: string;
  status: 'Hadir' | 'Izin' | 'Alpha';
  overtime_hours: number; // Tetap ada di DB tapi kita isi 0
}

interface ExpenseData {
  id: string;
  category_name: string;
  amount: number;
  employee_id: string;
}

const Karyawan = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // --- STATES ---
  const [employees, setEmployees] = useState<CustomerEmployee[]>([]);
  
  // State Tanggal
  const [absenDate, setAbsenDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }));
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date()); 

  // Data
  const [inputAttendance, setInputAttendance] = useState<{ [key: string]: { status: string } }>({});
  const [weeklyLogs, setWeeklyLogs] = useState<AttendanceLog[]>([]);
  const [dailyExpenses, setDailyExpenses] = useState<ExpenseData[]>([]);

  // State Dialog Edit Absen
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AttendanceLog | null>(null);
  const [editStatus, setEditStatus] = useState("Hadir");

  useEffect(() => { 
    loadEmployees(); 
    // Set awal minggu (Senin)
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(today.setDate(diff));
    setCurrentWeekStart(monday);
  }, []);

  useEffect(() => {
    if (employees.length > 0) {
      loadWeeklyData();
      loadDailyRealData(); 
    }
  }, [employees, absenDate, currentWeekStart]);

  // --- 1. LOAD DATA ---
  const loadEmployees = async () => {
    setLoading(true);
    // Ambil data gaji pokok saja (rate lembur tidak perlu)
    const { data } = await supabase.from('customer_master').select('id, customer_name, daily_base_salary').eq('is_active', true).order('customer_name');
    setEmployees(data || []);
    
    // Init form input
    const initialInput: any = {};
    data?.forEach(emp => {
      initialInput[emp.id] = { status: 'Hadir' };
    });
    setInputAttendance(prev => ({ ...initialInput, ...prev }));
    setLoading(false);
  };

  const loadWeeklyData = async () => {
    const startStr = currentWeekStart.toLocaleDateString('en-CA');
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    const endStr = end.toLocaleDateString('en-CA');

    const { data } = await supabase
      .from('attendance_logs')
      .select('*')
      .gte('date', startStr)
      .lte('date', endStr);
    
    setWeeklyLogs(data || []);
  };

  const loadDailyRealData = async () => {
    // 1. Ambil Log Absen Hari Ini
    const { data: logs } = await supabase.from('attendance_logs').select('*').eq('date', absenDate);
    
    if (logs && logs.length > 0) {
      const loaded: any = {};
      logs.forEach(log => {
        loaded[log.customer_id] = { status: log.status };
      });
      setInputAttendance(prev => ({ ...prev, ...loaded }));
    } else {
      const reset: any = {};
      employees.forEach(emp => { reset[emp.id] = { status: 'Hadir' }; });
      setInputAttendance(reset);
    }

    // 2. Ambil DATA GAJI REAL dari Operasional Hari Ini
    const { data: ops } = await supabase
      .from('operational_expenses')
      .select('id, category_name, amount, employee_id')
      .eq('date', absenDate)
      .not('employee_id', 'is', null); 

    setDailyExpenses(ops || []);
  };

  // --- 2. LOGIC MONITOR MINGGUAN ---
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

  // --- 3. CLICK HANDLER MATRIX ---
  const handleCellClick = (log: AttendanceLog | undefined, empId: string, dateStr: string) => {
    if (log) {
      setSelectedLog(log);
      setEditStatus(log.status);
      setIsEditOpen(true);
    } else {
      toast({ title: "Info", description: "Silakan input absen melalui form di bawah." });
    }
  };

  const updateLog = async () => {
    if (!selectedLog) return;
    setLoading(true);
    const { error } = await supabase.from('attendance_logs').update({
      status: editStatus,
      // overtime_hours tidak diupdate (biarkan apa adanya/0)
    }).eq('id', selectedLog.id);

    if (!error) {
      toast({ title: "Update Berhasil" });
      setIsEditOpen(false);
      loadWeeklyData();
      loadDailyRealData();
    }
    setLoading(false);
  };

  const deleteLog = async () => {
    if (!selectedLog || !confirm("Yakin hapus data absen ini?")) return;
    setLoading(true);
    const { error } = await supabase.from('attendance_logs').delete().eq('id', selectedLog.id);
    
    if (!error) {
      toast({ title: "Data Dihapus" });
      setIsEditOpen(false);
      loadWeeklyData();
      loadDailyRealData();
    }
    setLoading(false);
  };

  // --- 4. LOGIC MONITOR GAJI (REAL DARI OPERASIONAL) ---
  const calculateRealSalary = () => {
    let totalPokok = 0;
    let totalLembur = 0;

    dailyExpenses.forEach(exp => {
      const cat = exp.category_name.toLowerCase();
      // Logic deteksi kategori
      if (cat.includes('pokok') || cat.includes('harian')) {
        totalPokok += exp.amount;
      } else if (cat.includes('lembur') || cat.includes('overtime') || cat.includes('bonus')) {
        totalLembur += exp.amount;
      } else {
        totalPokok += exp.amount; // Default masuk ke pokok/umum
      }
    });

    return { totalPokok, totalLembur, grandTotal: totalPokok + totalLembur };
  };

  const realStats = calculateRealSalary();

  // --- 5. ACTION SIMPAN ABSEN ---
  const saveAttendance = async () => {
    setLoading(true);
    const updates = employees.map(emp => ({
      customer_id: emp.id,
      date: absenDate,
      status: inputAttendance[emp.id]?.status || 'Hadir',
      overtime_hours: 0 // Default 0 karena lembur diurus di operasional
    }));

    const { error } = await supabase.from('attendance_logs').upsert(updates, { onConflict: 'customer_id,date' });
    
    if (error) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: "Status kehadiran tersimpan!" });
      loadWeeklyData();
      loadDailyRealData();
    }
    setLoading(false);
  };

  const handleInputChange = (id: string, value: string) => {
    setInputAttendance(prev => ({
      ...prev,
      [id]: { status: value }
    }));
  };

  const formatRp = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  return (
    <Layout>
      <div className="space-y-8 pb-20">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Karyawan & Gaji</h1>
            <p className="text-gray-600">Monitor Absensi dan Gaji Real (Cash)</p>
          </div>
        </div>

        {/* --- BAGIAN 1: MONITOR ABSEN (EXCEL STYLE) --- */}
        <Card className="border-t-4 border-t-indigo-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" /> Monitor Absensi Mingguan
            </CardTitle>
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-md">
              <Button variant="ghost" size="sm" onClick={() => changeWeek(-1)}><ChevronLeft className="h-4 w-4"/></Button>
              <span className="text-xs font-medium w-32 text-center">
                {weekDays[0].toLocaleDateString('id-ID', {day:'numeric', month:'short'})} - {weekDays[6].toLocaleDateString('id-ID', {day:'numeric', month:'short'})}
              </span>
              <Button variant="ghost" size="sm" onClick={() => changeWeek(1)}><ChevronRight className="h-4 w-4"/></Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-indigo-50">
                <TableRow>
                  <TableHead className="w-[200px] font-bold text-indigo-900">Nama Karyawan</TableHead>
                  {weekDays.map((d, i) => (
                    <TableHead key={i} className={`text-center text-xs w-[100px] ${d.toLocaleDateString('en-CA') === absenDate ? 'bg-indigo-100 border-b-2 border-indigo-500 text-indigo-800 font-bold' : ''}`}>
                      <div className="uppercase">{d.toLocaleDateString('id-ID', { weekday: 'short' })}</div>
                      <div>{d.getDate()}</div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map(emp => (
                  <TableRow key={emp.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium border-r bg-gray-50/50">{emp.customer_name}</TableCell>
                    {weekDays.map((d, i) => {
                      const dateStr = d.toLocaleDateString('en-CA');
                      const log = weeklyLogs.find(l => l.customer_id === emp.id && l.date === dateStr);
                      let Icon = <Minus className="h-3 w-3 text-gray-200 mx-auto" />;
                      let bgColor = "cursor-pointer hover:bg-gray-100"; 

                      if (log) {
                        if (log.status === 'Hadir') {
                          Icon = <Check className="h-4 w-4 text-green-600 mx-auto font-bold" />;
                          bgColor = "bg-green-50/50 cursor-pointer hover:bg-green-100";
                        } else if (log.status === 'Izin') {
                          Icon = <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded">I</span>;
                          bgColor = "cursor-pointer hover:bg-gray-100";
                        } else if (log.status === 'Alpha') {
                          Icon = <X className="h-4 w-4 text-red-500 mx-auto" />;
                          bgColor = "bg-red-50/50 cursor-pointer hover:bg-red-100";
                        }
                      }
                      return (
                        <TableCell key={i} className={`text-center p-2 border-r last:border-0 ${bgColor} ${dateStr === absenDate ? 'ring-1 ring-indigo-200 ring-inset' : ''}`} onClick={() => handleCellClick(log, emp.id, dateStr)}>
                          {Icon}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* --- BAGIAN 2: MONITOR GAJI (REAL DARI OPERASIONAL) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-emerald-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-emerald-800 flex items-center gap-2"><Banknote className="h-4 w-4"/> Total Gaji (Cash)</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-900">{formatRp(realStats.grandTotal)}</div>
                <p className="text-[10px] text-emerald-700 mt-1">*Data dari Menu Operasional</p>
                <p className="text-xs text-emerald-600 mt-1">{new Date(absenDate).toLocaleDateString('id-ID', {weekday:'long', day:'numeric', month:'long'})}</p>
              </CardContent>
            </Card>
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-white border-blue-100"><CardContent className="p-3"><p className="text-xs text-gray-500">Gaji Pokok</p><p className="text-lg font-bold text-blue-700">{formatRp(realStats.totalPokok)}</p></CardContent></Card>
              <Card className="bg-white border-orange-100"><CardContent className="p-3"><p className="text-xs text-gray-500">Total Lembur</p><p className="text-lg font-bold text-orange-700">{formatRp(realStats.totalLembur)}</p></CardContent></Card>
            </div>
          </div>

          {/* --- BAGIAN 3: INPUT ABSENSI (KANAN) --- */}
          <Card className="lg:col-span-3 border-t-4 border-t-blue-500">
            <CardHeader className="flex flex-row items-center justify-between bg-gray-50/50 pb-4 border-b">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-blue-800"><CalendarCheck className="h-5 w-5"/> Form Input Absensi</CardTitle>
                <p className="text-xs text-gray-500">Catat kehadiran saja. Nominal gaji diinput di menu Operasional.</p>
              </div>
              <div className="flex items-center gap-2 bg-white p-1 rounded border shadow-sm">
                <Label className="pl-2 text-xs font-bold text-gray-500">TANGGAL:</Label>
                <Input type="date" value={absenDate} onChange={e => setAbsenDate(e.target.value)} className="w-auto h-8 border-none focus-visible:ring-0" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-100">
                  <TableRow>
                    <TableHead className="w-[40%]">Nama Karyawan</TableHead>
                    <TableHead className="w-[30%] text-right text-xs">Gaji Pokok (Ref)</TableHead>
                    <TableHead className="w-[30%] pl-6">Status Kehadiran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map(emp => {
                    const status = inputAttendance[emp.id]?.status || 'Hadir';
                    
                    return (
                      <TableRow key={emp.id} className="hover:bg-blue-50/30 transition-colors">
                        <TableCell className="font-bold text-gray-700">{emp.customer_name}</TableCell>
                        
                        {/* REFERENCE GAJI POKOK (READ ONLY) */}
                        <TableCell className="text-right text-xs font-mono text-gray-500">{formatRp(emp.daily_base_salary)}</TableCell>

                        <TableCell className="pl-6">
                          <Select value={status} onValueChange={(v) => handleInputChange(emp.id, v)}>
                            <SelectTrigger className={`h-8 w-full border-0 shadow-sm ${status === 'Hadir' ? 'bg-green-100 text-green-800 font-medium' : status === 'Alpha' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Hadir">Hadir</SelectItem>
                              <SelectItem value="Izin">Izin</SelectItem>
                              <SelectItem value="Alpha">Alpha</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              
              <div className="p-4 bg-gray-50 border-t">
                <Button onClick={saveAttendance} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 h-10 shadow-md font-bold tracking-wide">
                  {loading ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 h-4 w-4"/>} 
                  SIMPAN ABSEN {new Date(absenDate).toLocaleDateString('id-ID', {day:'numeric', month:'short'})}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* DIALOG EDIT */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Data Absen</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Status Kehadiran</Label>
                <Select value={editStatus} onValueChange={setEditStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Hadir">Hadir</SelectItem><SelectItem value="Izin">Izin</SelectItem><SelectItem value="Alpha">Alpha</SelectItem></SelectContent></Select>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="destructive" onClick={deleteLog} disabled={loading}>{loading ? <Loader2 className="animate-spin"/> : <Trash2 className="h-4 w-4 mr-2"/>} Hapus Data</Button>
              <Button onClick={updateLog} disabled={loading}>{loading ? <Loader2 className="animate-spin"/> : <Save className="h-4 w-4 mr-2"/>} Simpan Perubahan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </Layout>
  );
};

export default Karyawan;
