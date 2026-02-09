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
import { Users, CalendarCheck, Banknote, Save, Loader2, Check, X, Minus, ChevronLeft, ChevronRight } from "lucide-react";

interface CustomerEmployee {
  id: string;
  customer_name: string;
  daily_base_salary: number;
  overtime_rate: number;
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
  const [loading, setLoading] = useState(false);

  // --- STATES ---
  const [employees, setEmployees] = useState<CustomerEmployee[]>([]);
  
  // State Tanggal
  const [absenDate, setAbsenDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })); // Untuk Input & Monitor Harian
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date()); // Untuk Monitor Mingguan

  // Data
  const [inputAttendance, setInputAttendance] = useState<{ [key: string]: { status: string; overtime: string } }>({});
  const [weeklyLogs, setWeeklyLogs] = useState<AttendanceLog[]>([]);
  const [dailyLogs, setDailyLogs] = useState<AttendanceLog[]>([]);

  useEffect(() => { 
    loadEmployees(); 
    // Set awal minggu (Senin)
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
    const monday = new Date(today.setDate(diff));
    setCurrentWeekStart(monday);
  }, []);

  // Load Data Trigger
  useEffect(() => {
    if (employees.length > 0) {
      loadWeeklyData();
      loadDailyData();
    }
  }, [employees, absenDate, currentWeekStart]);

  // --- 1. LOAD DATA ---
  const loadEmployees = async () => {
    setLoading(true);
    const { data } = await supabase.from('customer_master').select('id, customer_name, daily_base_salary, overtime_rate').eq('is_active', true).order('customer_name');
    setEmployees(data || []);
    
    // Init form input
    const initialInput: any = {};
    data?.forEach(emp => {
      initialInput[emp.id] = { status: 'Hadir', overtime: '0' };
    });
    setInputAttendance(prev => ({ ...initialInput, ...prev }));
    setLoading(false);
  };

  const loadWeeklyData = async () => {
    // Hitung tanggal awal dan akhir minggu untuk query
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

  const loadDailyData = async () => {
    // Ambil data spesifik hari yang dipilih (untuk form input & monitor gaji)
    const { data } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('date', absenDate);
    
    setDailyLogs(data || []);

    // Update Form Input dengan data yang sudah ada (jika ada)
    if (data && data.length > 0) {
      const loaded: any = {};
      data.forEach(log => {
        loaded[log.customer_id] = { status: log.status, overtime: log.overtime_hours.toString() };
      });
      setInputAttendance(prev => ({ ...prev, ...loaded }));
    } else {
      // Reset input form jika data hari itu kosong
      const reset: any = {};
      employees.forEach(emp => {
        reset[emp.id] = { status: 'Hadir', overtime: '0' };
      });
      setInputAttendance(reset);
    }
  };

  // --- 2. LOGIC MONITOR MINGGUAN (EXCEL STYLE) ---
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

  // --- 3. LOGIC MONITOR GAJI HARIAN ---
  const calculateDailySalary = () => {
    let totalPokok = 0;
    let totalLembur = 0;

    // Hitung berdasarkan FORM INPUT (Realtime Preview) atau DATA DB? 
    // User minta monitor gaji, idealnya dari DB (data tersimpan). 
    // Tapi kalau mau lihat "kalau saya simpan segini jadinya berapa", pakai state input.
    // Disini saya pakai data REALTIME dari FORM INPUT biar interaktif sebelum simpan.
    
    employees.forEach(emp => {
      const status = inputAttendance[emp.id]?.status || 'Hadir';
      const overtime = parseFloat(inputAttendance[emp.id]?.overtime || '0');
      
      if (status === 'Hadir') {
        totalPokok += (emp.daily_base_salary || 0);
      }
      totalLembur += (overtime * (emp.overtime_rate || 0));
    });

    return { totalPokok, totalLembur, grandTotal: totalPokok + totalLembur };
  };

  const dailyStats = calculateDailySalary();

  // --- 4. ACTION SIMPAN ---
  const saveAttendance = async () => {
    setLoading(true);
    const updates = employees.map(emp => ({
      customer_id: emp.id,
      date: absenDate,
      status: inputAttendance[emp.id]?.status || 'Hadir',
      overtime_hours: parseFloat(inputAttendance[emp.id]?.overtime || '0')
    }));

    const { error } = await supabase.from('attendance_logs').upsert(updates, { onConflict: 'customer_id,date' });
    
    if (error) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: "Absensi & Gaji tersimpan!" });
      loadWeeklyData(); // Refresh tabel atas
      loadDailyData();  // Refresh data harian
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

  return (
    <Layout>
      <div className="space-y-8 pb-20">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Karyawan & Gaji</h1>
            <p className="text-gray-600">Monitor Absensi dan Penggajian</p>
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
                      // Cari log absen untuk karyawan ini di tanggal ini
                      const log = weeklyLogs.find(l => l.customer_id === emp.id && l.date === dateStr);
                      
                      let Icon = <Minus className="h-3 w-3 text-gray-200 mx-auto" />;
                      let bgColor = "";

                      if (log) {
                        if (log.status === 'Hadir') {
                          Icon = <Check className="h-4 w-4 text-green-600 mx-auto font-bold" />;
                          bgColor = "bg-green-50/50";
                        } else if (log.status === 'Izin') {
                          Icon = <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded">I</span>;
                        } else if (log.status === 'Alpha') {
                          Icon = <X className="h-4 w-4 text-red-500 mx-auto" />;
                          bgColor = "bg-red-50/50";
                        }
                      }

                      return (
                        <TableCell key={i} className={`text-center p-2 border-r last:border-0 ${bgColor} ${dateStr === absenDate ? 'ring-1 ring-indigo-200 ring-inset' : ''}`}>
                          {Icon}
                          {log && log.overtime_hours > 0 && (
                            <div className="text-[9px] text-blue-600 mt-1 font-medium">+{log.overtime_hours} Jam</div>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* --- BAGIAN 2: MONITOR GAJI (HARIAN) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* Panel Kiri: Stats Gaji */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-emerald-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-emerald-800 flex items-center gap-2"><Banknote className="h-4 w-4"/> Total Gaji Hari Ini</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-900">{formatRp(dailyStats.grandTotal)}</div>
                <p className="text-xs text-emerald-600 mt-1">{new Date(absenDate).toLocaleDateString('id-ID', {weekday:'long', day:'numeric', month:'long'})}</p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-white border-blue-100">
                <CardContent className="p-3">
                  <p className="text-xs text-gray-500">Gaji Pokok</p>
                  <p className="text-lg font-bold text-blue-700">{formatRp(dailyStats.totalPokok)}</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-orange-100">
                <CardContent className="p-3">
                  <p className="text-xs text-gray-500">Upah Lembur</p>
                  <p className="text-lg font-bold text-orange-700">{formatRp(dailyStats.totalLembur)}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* --- BAGIAN 3: INPUT ABSENSI (KANAN) --- */}
          <Card className="lg:col-span-3 border-t-4 border-t-blue-500">
            <CardHeader className="flex flex-row items-center justify-between bg-gray-50/50 pb-4 border-b">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-blue-800"><CalendarCheck className="h-5 w-5"/> Form Input Absensi</CardTitle>
                <p className="text-xs text-gray-500">Pilih status kehadiran dan isi jam lembur jika ada</p>
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
                    <TableHead className="w-[30%]">Nama Karyawan</TableHead>
                    <TableHead className="w-[25%]">Status</TableHead>
                    <TableHead className="w-[20%]">Lembur (Jam)</TableHead>
                    <TableHead className="text-right w-[25%]">Gaji Hari Ini</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map(emp => {
                    const status = inputAttendance[emp.id]?.status || 'Hadir';
                    const lembur = parseFloat(inputAttendance[emp.id]?.overtime || '0');
                    const gajiHariIni = (status === 'Hadir' ? (emp.daily_base_salary||0) : 0) + (lembur * (emp.overtime_rate||0));
                    
                    return (
                      <TableRow key={emp.id} className="hover:bg-blue-50/30 transition-colors">
                        <TableCell className="font-bold text-gray-700">{emp.customer_name}</TableCell>
                        <TableCell>
                          <Select value={status} onValueChange={(v) => handleInputChange(emp.id, 'status', v)}>
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
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Input 
                              type="number" 
                              className={`h-8 w-16 text-center ${lembur > 0 ? 'bg-blue-50 border-blue-300 font-bold text-blue-700' : ''}`}
                              value={inputAttendance[emp.id]?.overtime} 
                              onChange={(e) => handleInputChange(emp.id, 'overtime', e.target.value)} 
                              onFocus={(e) => e.target.select()} // Auto select pas diklik biar gampang edit
                            />
                            <span className="text-xs text-gray-400">Jam</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium text-gray-600">
                          {formatRp(gajiHariIni)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              
              <div className="p-4 bg-gray-50 border-t">
                <Button onClick={saveAttendance} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 h-10 shadow-md font-bold tracking-wide">
                  {loading ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 h-4 w-4"/>} 
                  SIMPAN DATA ABSENSI {new Date(absenDate).toLocaleDateString('id-ID', {day:'numeric', month:'short'})}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </Layout>
  );
};

export default Karyawan;
