import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PreorderData, TABLE_NAMES } from "@/types/database";
import { CalendarDays, Plus, Loader2, Users } from "lucide-react";

const Preorder = () => {
  const { toast } = useToast();
  // PERBAIKAN: Konsisten pakai 'selectedDate' dan Waktu WIB
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }));
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [customerName, setCustomerName] = useState("");
  const [quantity, setQuantity] = useState("");
  
  // Data
  const [preorders, setPreorders] = useState<PreorderData[]>([]);

  // Load preorders from Supabase
  useEffect(() => {
    loadPreorders();
  }, []);

  const loadPreorders = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAMES.PREORDERS)
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      setPreorders(data || []);
    } catch (error) {
      console.error('Error loading preorders:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data preorder",
        variant: "destructive",
      });
    }
  };

  // Add preorder
  const addPreorder = async () => {
    if (!customerName.trim() || !quantity) {
      toast({
        title: "Error",
        description: "Mohon lengkapi semua field preorder",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from(TABLE_NAMES.PREORDERS)
        .insert({
          customer_name: customerName.trim(),
          quantity: parseInt(quantity),
          date: selectedDate, // Pakai selectedDate
        });

      if (error) throw error;

      // Reset form
      setCustomerName("");
      setQuantity("");

      // Refresh data
      await loadPreorders();

      toast({
        title: "Berhasil",
        description: "Data preorder berhasil ditambahkan",
      });
    } catch (error) {
      console.error('Error adding preorder:', error);
      toast({
        title: "Error",
        description: "Gagal menambahkan data preorder",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter preorders for selected date
  const todayPreorders = preorders.filter(p => p.date === selectedDate);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Preorder</h1>
            <p className="text-gray-600 mt-1">Kelola data preorder pelanggan</p>
          </div>
        </div>

        {/* Date Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Pilih Tanggal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Label htmlFor="date">Tanggal:</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
              <p className="text-sm text-gray-600">
                Data akan disimpan untuk tanggal: {new Date(selectedDate).toLocaleDateString('id-ID')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Preorder Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-blue-700">Input Preorder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="customer-name">Nama Pelanggan</Label>
              <Input
                id="customer-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Masukkan nama pelanggan"
              />
            </div>
            
            <div>
              <Label htmlFor="quantity">Jumlah Kebutuhan (Ekor)</Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Jumlah ekor"
                min="1"
              />
            </div>

            <Button onClick={addPreorder} className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Tambah Preorder
            </Button>
          </CardContent>
        </Card>

        {/* Preorder List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Preorder Tanggal {new Date(selectedDate).toLocaleDateString('id-ID')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayPreorders.length > 0 ? (
              <div className="space-y-3">
                {todayPreorders.map((preorder) => (
                  <div key={preorder.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{preorder.customer_name}</p>
                      <p className="text-sm text-gray-600">{preorder.quantity} ekor</p>
                    </div>
                  </div>
                ))}
                <Separator />
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">
                    Total: {todayPreorders.reduce((sum, p) => sum + p.quantity, 0)} ekor dari {todayPreorders.length} pelanggan
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Belum ada data preorder untuk tanggal ini</p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Preorder;
