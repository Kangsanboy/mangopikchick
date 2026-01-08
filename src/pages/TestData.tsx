import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Database, Trash2, Plus } from "lucide-react";

const TestDataManager = () => {
  const { toast } = useToast();

  // Sample data generator
  const generateSampleData = () => {
    const customers = ["Pak Budi", "Bu Sari", "Pak Ahmad", "Bu Rina", "Pak Joko", "Bu Maya"];
    const today = new Date();
    
    // Generate preorders
    const preorders = [];
    for (let i = 0; i < 6; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - Math.floor(Math.random() * 7));
      preorders.push({
        id: `preorder_${i + 1}`,
        customerName: customers[i],
        quantity: Math.floor(Math.random() * 20) + 5,
        date: date.toISOString().split('T')[0]
      });
    }

    // Generate purchases
    const purchases = [];
    for (let i = 0; i < 4; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - Math.floor(Math.random() * 7));
      const quantity = Math.floor(Math.random() * 50) + 20;
      const weight = quantity * (1.2 + Math.random() * 0.8); // 1.2-2.0 kg per ekor
      const pricePerKg = 25000 + Math.floor(Math.random() * 10000); // 25k-35k per kg
      purchases.push({
        id: `purchase_${i + 1}`,
        quantity,
        weight: Math.round(weight * 10) / 10,
        pricePerKg,
        totalPrice: Math.round(weight * pricePerKg),
        date: date.toISOString().split('T')[0]
      });
    }

    // Generate sales
    const sales = [];
    for (let i = 0; i < 8; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - Math.floor(Math.random() * 7));
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const quantity = Math.floor(Math.random() * 15) + 3;
      const weight = quantity * (1.3 + Math.random() * 0.7); // 1.3-2.0 kg per ekor
      const pricePerKg = 30000 + Math.floor(Math.random() * 15000); // 30k-45k per kg
      sales.push({
        id: `sale_${i + 1}`,
        customerName: customer,
        quantity,
        weight: Math.round(weight * 10) / 10,
        pricePerKg,
        totalPrice: Math.round(weight * pricePerKg),
        date: date.toISOString().split('T')[0]
      });
    }

    return { preorders, purchases, sales };
  };

  const loadSampleData = () => {
    const sampleData = generateSampleData();
    
    localStorage.setItem('preorders', JSON.stringify(sampleData.preorders));
    localStorage.setItem('purchases', JSON.stringify(sampleData.purchases));
    localStorage.setItem('sales', JSON.stringify(sampleData.sales));

    toast({
      title: "Data Contoh Dimuat",
      description: `${sampleData.preorders.length} preorder, ${sampleData.purchases.length} pembelian, ${sampleData.sales.length} penjualan`,
    });
  };

  const clearAllData = () => {
    localStorage.removeItem('preorders');
    localStorage.removeItem('purchases');
    localStorage.removeItem('sales');

    toast({
      title: "Data Dihapus",
      description: "Semua data telah dihapus dari sistem",
      variant: "destructive",
    });
  };

  const getDataCounts = () => {
    const preorders = JSON.parse(localStorage.getItem('preorders') || '[]');
    const purchases = JSON.parse(localStorage.getItem('purchases') || '[]');
    const sales = JSON.parse(localStorage.getItem('sales') || '[]');
    
    return {
      preorders: preorders.length,
      purchases: purchases.length,
      sales: sales.length
    };
  };

  const [dataCounts, setDataCounts] = useState(getDataCounts());

  useEffect(() => {
    const interval = setInterval(() => {
      setDataCounts(getDataCounts());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manajemen Data Test</h1>
          <p className="text-gray-600 mt-1">Kelola data contoh untuk testing sistem</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-blue-700">Data Preorder</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">{dataCounts.preorders}</div>
              <p className="text-sm text-gray-600">Preorder tersimpan</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-green-700">Data Pembelian</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">{dataCounts.purchases}</div>
              <p className="text-sm text-gray-600">Pembelian tersimpan</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-purple-700">Data Penjualan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">{dataCounts.sales}</div>
              <p className="text-sm text-gray-600">Penjualan tersimpan</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Aksi Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={loadSampleData} className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Muat Data Contoh
              </Button>
              
              <Button onClick={clearAllData} variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Hapus Semua Data
              </Button>
            </div>
            
            <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
              <p className="font-medium mb-2">Keterangan:</p>
              <ul className="space-y-1">
                <li>• <strong>Muat Data Contoh:</strong> Menambahkan data sample untuk testing fitur export dan dashboard</li>
                <li>• <strong>Hapus Semua Data:</strong> Menghapus seluruh data dari localStorage (preorder, pembelian, penjualan)</li>
                <li>• Data akan otomatis tersimpan di browser dan dapat digunakan untuk testing semua fitur</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default TestDataManager;