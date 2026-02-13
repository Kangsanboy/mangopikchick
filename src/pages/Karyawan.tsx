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
import { Users, CalendarCheck, Banknote, Save, Loader2, Check, X, Minus, ChevronLeft, ChevronRight, Edit, Trash2, Wallet, ArrowRight, Printer, FileText, PlusCircle } from "lucide-react";

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

interface ExpenseData {
  id: string;
  category_name: string;
  amount: number;
  employee_id: string;
}

// Interface baru untuk item potongan
interface DeductionItem {
  id: number;
  description: string;
  amount: number;
}

const Karyawan = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // --- STATES ---
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  // State Tanggal Absen
  const [absenDate, setAbsenDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }));
  
  // State Tanggal Gaji
  const [salaryStartDate, setSalaryStartDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }));
  const [salaryEndDate, setSalaryEndDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }));

  const [currentWeekStart, setCurrentWeekStart] = useState(new Date()); 

  // Data
  const [inputAttendance, setInputAttendance] = useState<{ [key: string]: { status: string, overtime: string } }>({});
  const [weeklyLogs, setWeeklyLogs] = useState<AttendanceLog[]>([]);
  const [salaryLogs, setSalaryLogs] = useState<AttendanceLog[]>([]); 

  // --- STATES SLIP GAJI ---
  const [slipStartDate, setSlipStartDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }));
  const [slipEndDate, setSlipEndDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }));
  const [selectedSlipEmployee, setSelectedSlipEmployee] = useState<string>("");
  
  // STATE POTONGAN (Dulu Pengurangan)
  const [deductionList, setDeductionList] = useState<DeductionItem[]>([]);
  const [newDedDesc, setNewDedDesc] = useState("");
  const [newDedAmount, setNewDedAmount] = useState("");

  const [slipData, setSlipData] = useState<{ pokok: number, lembur: number }>({ pokok: 0, lembur: 0 });

  // State Dialog Edit
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AttendanceLog | null>(null);
  const [editStatus, setEditStatus] = useState("Hadir");
  const [editOvertimeType, setEditOvertimeType] = useState("NONE");

  useEffect(() => { 
    loadEmployees(); 
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(today.setDate(diff));
    setCurrentWeekStart(monday);
  }, []);

  // Sync Salary Date
  useEffect(() => {
    const d = new Date(absenDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(d);
    monday.setDate(diff);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6); 

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

  useEffect(() => {
    if (employees.length > 0) loadSalaryLogs();
  }, [salaryStartDate, salaryEndDate, employees]);

  useEffect(() => {
    if (selectedSlipEmployee && slipStartDate && slipEndDate) {
      calculateSlipSalary();
      setDeductionList([]); // Reset potongan saat ganti orang/tanggal
    }
  }, [selectedSlipEmployee, slipStartDate, slipEndDate]);

  // --- 1. LOAD DATA ---
  const loadEmployees = async () => {
    setLoading(true);
    const { data } = await supabase.from('employees').select('*').eq('is_active', true).order('name');
    setEmployees(data || []);
    const initialInput: any = {};
    data?.forEach(emp => { initialInput[emp.id] = { status: 'Hadir', overtime: 'NONE' }; });
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
      logs.forEach(log => { loaded[log.employee_id] = { status: log.status, overtime: log.overtime_type || 'NONE' }; });
      setInputAttendance(prev => ({ ...prev, ...loaded }));
    } else {
      const reset: any = {};
      employees.forEach(emp => { reset[emp.id] = { status: 'Hadir', overtime: 'NONE' }; });
      setInputAttendance(reset);
    }
  };

  const loadSalaryLogs = async () => {
    const { data } = await supabase.from('attendance_logs').select('*').gte('date', salaryStartDate).lte('date', salaryEndDate);
    setSalaryLogs(data || []);
  };

  // --- 2. LOGIC HITUNG SLIP GAJI ---
  const calculateSlipSalary = async () => {
    const { data } = await supabase.from('attendance_logs')
      .select('*')
      .eq('employee_id', selectedSlipEmployee)
      .gte('date', slipStartDate)
      .lte('date', slipEndDate);
    
    const logs = data || [];
    const emp = employees.find(e => e.id === selectedSlipEmployee);
    if (!emp) return;

    let totalPokok = 0;
    let totalLembur = 0;

    logs.forEach(log => {
      if (log.status === 'Hadir') totalPokok += emp.daily_base_salary;
      if (log.overtime_type === 'FULL') totalLembur += emp.overtime_rate;
      if (log.overtime_type === 'HALF') totalLembur += (emp.overtime_rate / 2);
    });

    setSlipData({ pokok: totalPokok, lembur: totalLembur });
  };

  // --- LOGIC TAMBAH/HAPUS POTONGAN ---
  const addDeduction = () => {
    if (!newDedDesc || !newDedAmount) return;
    const amount = parseInt(newDedAmount);
    if (isNaN(amount) || amount <= 0) return;

    const newItem: DeductionItem = {
      id: Date.now(),
      description: newDedDesc,
      amount: amount
    };

    setDeductionList([...deductionList, newItem]);
    setNewDedDesc("");
    setNewDedAmount("");
  };

  const removeDeduction = (id: number) => {
    setDeductionList(deductionList.filter(item => item.id !== id));
  };

  // --- 3. PRINT SLIP (JUDUL DIGANTI JADI POTONGAN) ---
  const handlePrintSlip = () => {
    const emp = employees.find(e => e.id === selectedSlipEmployee);
    if (!emp) return;

    const totalPotongan = deductionList.reduce((sum, item) => sum + item.amount, 0);
    const totalTerima = slipData.pokok + slipData.lembur - totalPotongan;
    const dateNow = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    const deductionRows = deductionList.map(d => `
      <div class="row" style="padding-left: 10px; font-size: 10px; color: #444;">
        <span>- ${d.description}</span> 
        <span>${formatRp(d.amount)}</span>
      </div>
    `).join('');

    const slipContent = `
      <html>
        <head>
          <title>Slip Gaji - ${emp.name}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { font-family: 'Courier New', monospace; width: 75mm; margin: 5px auto; color: #000; font-size: 11px; }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 10px; }
            .title { font-weight: bold; font-size: 14px; margin-bottom: 2px; }
            .address { font-size: 9px; line-height: 1.2; }
            .section { margin-bottom: 8px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
            .label { font-weight: bold; }
            .total-row { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 5px 0; margin: 10px 0; font-weight: bold; font-size: 12px; }
            .footer { text-align: right; margin-top: 20px; }
            .ttd { margin-top: 30px; border-top: 1px dotted #000; width: 100px; display: inline-block; text-align: center; padding-top: 2px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">PA IYAT BROILER</div>
            <div class="address">Jl. Wr. Lobak, Gandasari, Kec. Katapang, Kab. Bandung 40921</div>
          </div>
          
          <div class="section">
            <div>Periode: ${new Date(slipStartDate).toLocaleDateString('id-ID')} - ${new Date(slipEndDate).toLocaleDateString('id-ID')}</div>
          </div>

          <div class="section" style="border-bottom: 1px dashed #000; padding-bottom: 5px;">
            <div class="row"><span>Nama :</span> <span class="label">${emp.name}</span></div>
            <div class="row"><span>Jabatan :</span> <span>Karyawan</span></div>
          </div>

          <div class="section" style="margin-top: 10px;">
            <div class="row"><span>Gaji Pokok</span> <span>${formatRp(slipData.pokok)}</span></div>
            <div class="row"><span>Gaji Lembur</span> <span>${formatRp(slipData.lembur)}</span></div>
            
            ${deductionList.length > 0 ? `
              <div class="row" style="margin-top: 5px; font-weight:bold;"><span>Rincian Potongan:</span></div>
              ${deductionRows}
              <div class="row" style="border-top: 1px dotted #ccc; margin-top: 2px; padding-top:2px;">
                <span>Total Potongan</span> 
                <span>- ${formatRp(totalPotongan)}</span>
              </div>
            ` : ''}
          </div>

          <div class="row total-row">
            <span>TOTAL DITERIMA</span>
            <span>${formatRp(totalTerima)}</span>
          </div>

          <div class="footer">
            <div>${dateNow}</div>
            <div style="margin-top: 40px; text-align: center; float: right;">
              <div class="ttd">Pemilik Toko</div>
            </div>
          </div>
          
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(slipContent);
      printWindow.document.close();
    }
  };

  // --- 4. LOGIC MINGGUAN ---
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

  // --- 5. EDIT/DELETE ABSEN ---
  const handleCellClick = (log: AttendanceLog | undefined) => {
    if (log) { setSelectedLog(log); setEditStatus(log.status); setEditOvertimeType(log.overtime_type || 'NONE'); setIsEditOpen(true); } 
    else { toast({ title: "Info", description: "Input absen di form bawah dulu." }); }
  };

  const updateLog = async () => {
    if (!selectedLog) return;
    setLoading(true);
    const { error } = await supabase.from('attendance_logs').update({ status: editStatus, overtime_type: editOvertimeType }).eq('id', selectedLog.id);
    if (!error) { toast({ title: "Update Berhasil" }); setIsEditOpen(false); loadWeeklyData(); loadDailyInputData(); loadSalaryLogs(); calculateSlipSalary(); }
    setLoading(false);
  };

  const deleteLog = async () => {
    if (!selectedLog || !confirm("Hapus absen ini?")) return;
    setLoading(true);
    const { error } = await supabase.from('attendance_logs').delete().eq('id', selectedLog.id);
    if (!error) { toast({ title: "Dihapus" }); setIsEditOpen(false); loadWeeklyData(); loadDailyInputData(); loadSalaryLogs(); calculateSlipSalary(); }
    setLoading(false);
  };

  // --- 6. SIMPAN ABSEN ---
  const saveAttendance = async () => {
    setLoading(true);
    const updates = employees.map(emp => ({
      employee_id: emp.id, date: absenDate, status: inputAttendance[emp.id]?.status || 'Hadir', overtime_type: inputAttendance[emp.id]?.overtime || 'NONE'
    }));
    const { error } = await supabase.from('attendance_logs').upsert(updates, { onConflict: 'employee_id,date' });
    if (error) toast({ title: "Gagal", description: error.message, variant: "destructive" });
    else { toast({ title: "Berhasil", description: "Absensi tersimpan!" }); loadWeeklyData(); loadSalaryLogs(); }
    setLoading(false);
  };

  const handleInputChange = (id: string, field: 'status' | 'overtime', value: string) => {
    setInputAttendance(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const formatRp = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  const totalPotongan = deductionList.reduce((sum, d) => sum + d.amount, 0);

  return (
    <Layout>
      <div className="space-y-8 pb-20">
        <div className="flex justify-between items-center">
          <div><h1 className="text-3xl font-bold text-gray-900">Karyawan & Gaji</h1><p className="text-gray-600">Monitoring Absensi & Slip Gaji</p></div>
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
                      let bgColor = "cursor-pointer hover:bg-gray-100"; let OvertimeBadge = null;
                      if (log) {
                        if (log.status === 'Hadir') { Icon = <Check className="h-4 w-4 text-green-600 mx-auto font-bold" />; bgColor = "bg-green-50/50 cursor-pointer hover:bg-green-100"; } 
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
                    const status = inputAttendance[emp.id]?.status || 'Hadir'; const overtime = inputAttendance[emp.id]?.overtime || 'NONE';
                    return (
                      <TableRow key={emp.id} className="hover:bg-blue-50/30 transition-colors">
                        <TableCell className="font-bold text-gray-700">{emp.name}</TableCell>
                        <TableCell><Select value={status} onValueChange={(v) => handleInputChange(emp.id, 'status', v)}><SelectTrigger className={`h-8 w-full border-0 shadow-sm ${status === 'Hadir' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Hadir">Hadir</SelectItem><SelectItem value="Izin">Izin</SelectItem><SelectItem value="Alpha">Alpha</SelectItem></SelectContent></Select></TableCell>
                        <TableCell><Select value={overtime} onValueChange={(v) => handleInputChange(emp.id, 'overtime', v)}><SelectTrigger className={`h-8 w-full border-0 shadow-sm ${overtime === 'FULL' ? 'bg-blue-100 text-blue-800' : overtime === 'HALF' ? 'bg-blue-50 text-blue-600' : ''}`}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="NONE">-</SelectItem><SelectItem value="HALF">Setengah</SelectItem><SelectItem value="FULL">Full</SelectItem></SelectContent></Select></TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              <div className="p-4 bg-gray-50 border-t"><Button onClick={saveAttendance} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 h-10 shadow-md font-bold tracking-wide">{loading ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 h-4 w-4"/>} SIMPAN ABSEN</Button></div>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-emerald-500 h-full">
            <CardHeader className="bg-emerald-50/30 pb-4 border-b">
              <div className="flex justify-between items-center mb-3"><CardTitle className="flex items-center gap-2 text-emerald-800"><Wallet className="h-5 w-5"/> Monitor Gaji (Estimasi)</CardTitle><Badge variant="outline" className="bg-white border-emerald-200 text-emerald-700">Auto Sync</Badge></div>
              <div className="flex items-center gap-2 text-sm bg-white p-2 rounded border border-emerald-100">
                <div className="flex items-center gap-1"><Label className="text-xs text-gray-500">Dari:</Label><Input type="date" value={salaryStartDate} onChange={e => setSalaryStartDate(e.target.value)} className="h-7 w-auto text-xs px-2" /></div><ArrowRight className="h-3 w-3 text-gray-400" /><div className="flex items-center gap-1"><Label className="text-xs text-gray-500">Sampai:</Label><Input type="date" value={salaryEndDate} onChange={e => setSalaryEndDate(e.target.value)} className="h-7 w-auto text-xs px-2" /></div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-100"><TableRow><TableHead>Nama</TableHead><TableHead className="text-right">Pokok</TableHead><TableHead className="text-right">Lembur</TableHead><TableHead className="text-right font-bold">Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {employees.map(emp => {
                    const myLogs = salaryLogs.filter(l => l.employee_id === emp.id);
                    let ePokok = 0; let eLembur = 0;
                    myLogs.forEach(log => {
                      if (log.status === 'Hadir') ePokok += emp.daily_base_salary;
                      if (log.overtime_type === 'FULL') eLembur += emp.overtime_rate;
                      if (log.overtime_type === 'HALF') eLembur += (emp.overtime_rate / 2);
                    });
                    const grandTotal = ePokok + eLembur;
                    return (
                      <TableRow key={emp.id} className="hover:bg-emerald-50/30">
                        <TableCell className="font-medium text-gray-700">{emp.name}</TableCell>
                        <TableCell className="text-right text-gray-600">{ePokok > 0 ? formatRp(ePokok) : '-'}</TableCell>
                        <TableCell className="text-right text-orange-600 font-medium">{eLembur > 0 ? formatRp(eLembur) : '-'}</TableCell>
                        <TableCell className="text-right font-bold text-emerald-700">{grandTotal > 0 ? formatRp(grandTotal) : '-'}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

        </div>

        {/* --- FITUR BARU: GENERATOR SLIP GAJI DENGAN LIST POTONGAN --- */}
        <Card className="border-t-4 border-t-purple-600 shadow-lg bg-gradient-to-br from-white to-purple-50">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="flex items-center gap-2 text-purple-800"><FileText className="h-6 w-6"/> Pembuatan Slip Gaji</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
              
              {/* Kolom 1 & 2: Pilih Periode & Karyawan */}
              <div className="md:col-span-2 space-y-4">
                <div className="space-y-2">
                  <Label className="text-purple-700 font-semibold">1. Pilih Periode Gaji</Label>
                  <div className="flex gap-2">
                    <Input type="date" value={slipStartDate} onChange={e => setSlipStartDate(e.target.value)} />
                    <Input type="date" value={slipEndDate} onChange={e => setSlipEndDate(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-purple-700 font-semibold">2. Pilih Karyawan</Label>
                  <Select value={selectedSlipEmployee} onValueChange={setSelectedSlipEmployee}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="-- Pilih Nama --" /></SelectTrigger>
                    <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                {selectedSlipEmployee && (
                  <div className="bg-white p-3 rounded border border-purple-100 shadow-sm mt-4">
                    <p className="text-xs text-gray-500 uppercase font-bold">Total Pendapatan (Otomatis)</p>
                    <p className="text-xl font-bold text-green-600">{formatRp(slipData.pokok + slipData.lembur)}</p>
                    <div className="text-xs text-gray-400 mt-1 grid grid-cols-2">
                      <span>Pokok: {formatRp(slipData.pokok)}</span>
                      <span>Lembur: {formatRp(slipData.lembur)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Kolom 3 & 4: Potongan & Cetak */}
              {selectedSlipEmployee && (
                <div className="md:col-span-2 space-y-4 animate-in fade-in slide-in-from-right-4 border-l pl-6 border-purple-100">
                  <div className="space-y-2">
                    <Label className="text-red-600 font-semibold">3. Input Potongan (Kasbon/Lainnya)</Label>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label className="text-xs text-gray-500">Keterangan</Label>
                        <Input placeholder="Contoh: Kasbon" value={newDedDesc} onChange={e => setNewDedDesc(e.target.value)} className="h-8"/>
                      </div>
                      <div className="w-32">
                        <Label className="text-xs text-gray-500">Jumlah (Rp)</Label>
                        <Input type="number" placeholder="0" value={newDedAmount} onChange={e => setNewDedAmount(e.target.value)} className="h-8"/>
                      </div>
                      <Button size="sm" onClick={addDeduction} className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 h-8"><PlusCircle className="h-4 w-4"/></Button>
                    </div>

                    {/* LIST POTONGAN */}
                    {deductionList.length > 0 && (
                      <div className="bg-red-50/50 rounded border border-red-100 p-2 mt-2">
                        <table className="w-full text-xs">
                          <tbody>
                            {deductionList.map(item => (
                              <tr key={item.id} className="border-b border-dashed border-red-200 last:border-0">
                                <td className="py-1 text-gray-600">{item.description}</td>
                                <td className="py-1 text-right font-medium text-red-600">{formatRp(item.amount)}</td>
                                <td className="py-1 text-right w-6"><button onClick={() => removeDeduction(item.id)}><Trash2 className="h-3 w-3 text-red-400 hover:text-red-600"/></button></td>
                              </tr>
                            ))}
                            <tr className="font-bold">
                              <td className="pt-2 text-red-800">Total Potongan</td>
                              <td className="pt-2 text-right text-red-800">{formatRp(totalPotongan)}</td>
                              <td></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-purple-100 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-500">Total Gaji Bersih</p>
                      <p className="text-2xl font-bold text-purple-700">{formatRp(slipData.pokok + slipData.lembur - totalPotongan)}</p>
                    </div>
                    <Button size="lg" onClick={handlePrintSlip} className="bg-purple-700 hover:bg-purple-800 shadow-lg"><Printer className="mr-2 h-5 w-5"/> Cetak Slip</Button>
                  </div>
                </div>
              )}

            </div>
          </CardContent>
        </Card>

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
