import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, Plus, Save } from "lucide-react";

interface PreorderData {
  id: string;
  customerName: string;
  quantity: number;
  date: string;
}

interface PurchaseData {
  id: string;
  quantity: number;
  weight: number;
  pricePerKg: number;
  totalPrice: number;
  date: string;
}

interface SaleData {
  id: string;
  customerName: string;
  quantity: number;
  weight: number;
  pricePerKg: number;
  totalPrice: number;
  date: string;
}

const InputData = () => {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Preorder state
  const [preorderCustomer, setPreorderCustomer] = useState("");
  const [preorderQuantity, setPreorderQuantity] = useState("");
  
  // Purchase state
  const [purchaseQuantity, setPurchaseQuantity] = useState("");
  const [purchaseWeight, setPurchaseWeight] = useState("");
  const [purchasePricePerKg, setPurchasePricePerKg] = useState("");
  
  // Sale state
  const [saleCustomer, setSaleCustomer] = useState("");
  const [saleQuantity, setSaleQuantity] = useState("");
  const [saleWeight, setSaleWeight] = useState("");
  const [salePricePerKg, setSalePricePerKg] = useState("");
  
  // Data arrays
  const [preorders, setPreorders] = useState<PreorderData[]>([]);
  const [purchases, setPurchases] = useState<PurchaseData[]>([]);
  const [sales, setSales] = useState<SaleData[]>([]);
  
  // Available customers from preorders for the selected date
  const [availableCustomers, setAvailableCustomers] = useState<string[]>([]);

  // Load data from localStorage
  useEffect(() => {
    const savedPreorders = localStorage.getItem('preorders');
    const savedPurchases = localStorage.getItem('purchases');
    const savedSales = localStorage.getItem('sales');

    if (savedPreorders) setPreorders(JSON.parse(savedPreorders));
    if (savedPurchases) setPurchases(JSON.parse(savedPurchases));
    if (savedSales) setSales(JSON.parse(savedSales));
  }, []);

  // Update available customers when date or preorders change
  useEffect(() => {
    const datePreorders = preorders.filter(p => p.date === selectedDate);
    const customerNames = datePreorders.map(p => p.customerName);
    setAvailableCustomers(customerNames);
  }, [selectedDate, preorders]);

  // Save data to localStorage
  const saveToLocalStorage = (key: string, data: any[]) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  // Generate unique ID
  const generateId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  // Add preorder
  const addPreorder = () => {
    if (!preorderCustomer.trim() || !preorderQuantity) {
      toast({
        title: "Error",
        description: "Mohon lengkapi semua field preorder",
        variant: "destructive",
      });
      return;
    }

    const newPreorder: PreorderData = {
      id: generateId(),
      customerName: preorderCustomer.trim(),
      quantity: parseInt(preorderQuantity),
      date: selectedDate,
    };

    const updatedPreorders = [...preorders, newPreorder];
    setPreorders(updatedPreorders);
    saveToLocalStorage('preorders', updatedPreorders);

    // Reset form
    setPreorderCustomer("");
    setPreorderQuantity("");

    toast({
      title: "Berhasil",
      description: "Data preorder berhasil ditambahkan",
    });
  };

  // Add purchase
  const addPurchase = () => {
    if (!purchaseQuantity || !purchaseWeight || !purchasePricePerKg) {
      toast({
        title: "Error",
        description: "Mohon lengkapi semua field pembelian",
        variant: "destructive",
      });
      return;
    }

    const quantity = parseInt(purchaseQuantity);
    const weight = parseFloat(purchaseWeight);
    const pricePerKg = parseFloat(purchasePricePerKg);
    const totalPrice = weight * pricePerKg;

    const newPurchase: PurchaseData = {
      id: generateId(),
      quantity,
      weight,
      pricePerKg,
      totalPrice,
      date: selectedDate,
    };

    const updatedPurchases = [...purchases, newPurchase];
    setPurchases(updatedPurchases);
    saveToLocalStorage('purchases', updatedPurchases);

    // Reset form
    setPurchaseQuantity("");
    setPurchaseWeight("");
    setPurchasePricePerKg("");

    toast({
      title: "Berhasil",
      description: "Data pembelian berhasil ditambahkan",
    });
  };

  // Add sale
  const addSale = () => {
    if (!saleCustomer || !saleQuantity || !saleWeight || !salePricePerKg) {
      toast({
        title: "Error",
        description: "Mohon lengkapi semua field penjualan",
        variant: "destructive",
      });
      return;
    }

    const quantity = parseInt(saleQuantity);
    const weight = parseFloat(saleWeight);
    const pricePerKg = parseFloat(salePricePerKg);
    const totalPrice = weight * pricePerKg;

    const newSale: SaleData = {
      id: generateId(),
      customerName: saleCustomer,
      quantity,
      weight,
      pricePerKg,
      totalPrice,
      date: selectedDate,
    };

    const updatedSales = [...sales, newSale];
    setSales(updatedSales);
    saveToLocalStorage('sales', updatedSales);

    // Reset form
    setSaleCustomer("");
    setSaleQuantity("");
    setSaleWeight("");
    setSalePricePerKg("");

    toast({
      title: "Berhasil",
      description: "Data penjualan berhasil ditambahkan",
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Input Data Penjualan</h1>
            <p className="text-gray-600 mt-1">Kelola data preorder, pembelian, dan penjualan</p>
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

        {/* Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Preorder Column */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-blue-700">1. Preorder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="preorder-customer">Nama Pelanggan</Label>
                <Input
                  id="preorder-customer"
                  value={preorderCustomer}
                  onChange={(e) => setPreorderCustomer(e.target.value)}
                  placeholder="Masukkan nama pelanggan"
                />
              </div>
              
              <div>
                <Label htmlFor="preorder-quantity">Jumlah Kebutuhan (Ekor)</Label>
                <Input
                  id="preorder-quantity"
                  type="number"
                  value={preorderQuantity}
                  onChange={(e) => setPreorderQuantity(e.target.value)}
                  placeholder="Jumlah ekor"
                  min="1"
                />
              </div>

              <Button onClick={addPreorder} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Preorder
              </Button>

              <Separator />

              {/* Display preorders for selected date */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-700">Preorder Tanggal Ini:</h4>
                {preorders
                  .filter(p => p.date === selectedDate)
                  .map((preorder) => (
                    <div key={preorder.id} className="p-2 bg-blue-50 rounded text-sm">
                      <p className="font-medium">{preorder.customerName}</p>
                      <p className="text-gray-600">{preorder.quantity} ekor</p>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Purchase Column */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-green-700">2. Pembelian</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="purchase-quantity">Jumlah Ekor</Label>
                <Input
                  id="purchase-quantity"
                  type="number"
                  value={purchaseQuantity}
                  onChange={(e) => setPurchaseQuantity(e.target.value)}
                  placeholder="Jumlah ekor"
                  min="1"
                />
              </div>
              
              <div>
                <Label htmlFor="purchase-weight">Jumlah Berat Ekor (Kg)</Label>
                <Input
                  id="purchase-weight"
                  type="number"
                  step="0.1"
                  value={purchaseWeight}
                  onChange={(e) => setPurchaseWeight(e.target.value)}
                  placeholder="Berat dalam Kg"
                  min="0.1"
                />
              </div>

              <div>
                <Label htmlFor="purchase-price">Harga per Kg</Label>
                <Input
                  id="purchase-price"
                  type="number"
                  value={purchasePricePerKg}
                  onChange={(e) => setPurchasePricePerKg(e.target.value)}
                  placeholder="Harga per Kg"
                  min="1"
                />
              </div>

              {purchaseWeight && purchasePricePerKg && (
                <div className="p-2 bg-green-50 rounded">
                  <p className="text-sm text-green-700">
                    Total Harga: {formatCurrency(parseFloat(purchaseWeight) * parseFloat(purchasePricePerKg))}
                  </p>
                </div>
              )}

              <Button onClick={addPurchase} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Pembelian
              </Button>

              <Separator />

              {/* Display purchases for selected date */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-700">Pembelian Tanggal Ini:</h4>
                {purchases
                  .filter(p => p.date === selectedDate)
                  .map((purchase) => (
                    <div key={purchase.id} className="p-2 bg-green-50 rounded text-sm">
                      <p>{purchase.quantity} ekor - {purchase.weight} Kg</p>
                      <p className="text-gray-600">{formatCurrency(purchase.totalPrice)}</p>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Sale Column */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-purple-700">3. Penjualan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="sale-customer">Nama Pelanggan</Label>
                <Select value={saleCustomer} onValueChange={setSaleCustomer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih pelanggan dari preorder" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCustomers.length > 0 ? (
                      availableCustomers.map((customer, index) => (
                        <SelectItem key={index} value={customer}>
                          {customer}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        Belum ada preorder untuk tanggal ini
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="sale-quantity">Jumlah Ekor</Label>
                <Input
                  id="sale-quantity"
                  type="number"
                  value={saleQuantity}
                  onChange={(e) => setSaleQuantity(e.target.value)}
                  placeholder="Jumlah ekor"
                  min="1"
                />
              </div>

              <div>
                <Label htmlFor="sale-weight">Jumlah Berat Ekor (Kg)</Label>
                <Input
                  id="sale-weight"
                  type="number"
                  step="0.1"
                  value={saleWeight}
                  onChange={(e) => setSaleWeight(e.target.value)}
                  placeholder="Berat dalam Kg"
                  min="0.1"
                />
              </div>

              <div>
                <Label htmlFor="sale-price">Harga per Kg</Label>
                <Input
                  id="sale-price"
                  type="number"
                  value={salePricePerKg}
                  onChange={(e) => setSalePricePerKg(e.target.value)}
                  placeholder="Harga per Kg"
                  min="1"
                />
              </div>

              {saleWeight && salePricePerKg && (
                <div className="p-2 bg-purple-50 rounded">
                  <p className="text-sm text-purple-700">
                    Total Harga: {formatCurrency(parseFloat(saleWeight) * parseFloat(salePricePerKg))}
                  </p>
                </div>
              )}

              <Button onClick={addSale} className="w-full" disabled={availableCustomers.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Penjualan
              </Button>

              <Separator />

              {/* Display sales for selected date */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-700">Penjualan Tanggal Ini:</h4>
                {sales
                  .filter(s => s.date === selectedDate)
                  .map((sale) => (
                    <div key={sale.id} className="p-2 bg-purple-50 rounded text-sm">
                      <p className="font-medium">{sale.customerName}</p>
                      <p>{sale.quantity} ekor - {sale.weight} Kg</p>
                      <p className="text-gray-600">{formatCurrency(sale.totalPrice)}</p>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default InputData;