import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ProductMaster, TABLE_NAMES } from "@/types/database";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Package,
  Loader2,
  Save,
  X
} from "lucide-react";

const DataMaster = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<ProductMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form states
  const [productName, setProductName] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingPrice, setEditingPrice] = useState("");

  // Load products from Supabase
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from(TABLE_NAMES.PRODUCT_MASTER)
        .select('*')
        .eq('is_active', true)
        .order('product_name', { ascending: true });
      
      if (error) throw error;
      
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data produk",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Add new product
  const addProduct = async () => {
    if (!productName.trim() || !pricePerKg) {
      toast({
        title: "Error",
        description: "Mohon lengkapi nama produk dan harga per kg",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from(TABLE_NAMES.PRODUCT_MASTER)
        .insert({
          product_name: productName.trim(),
          price_per_kg: parseInt(pricePerKg),
        });

      if (error) throw error;

      // Reset form
      setProductName("");
      setPricePerKg("");

      // Reload products
      await loadProducts();

      toast({
        title: "Berhasil",
        description: "Produk berhasil ditambahkan",
      });
    } catch (error: any) {
      console.error('Error adding product:', error);
      toast({
        title: "Error",
        description: error.message.includes('duplicate') 
          ? "Nama produk sudah ada" 
          : "Gagal menambahkan produk",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Start editing
  const startEdit = (product: ProductMaster) => {
    setEditingId(product.id);
    setEditingName(product.product_name);
    setEditingPrice(product.price_per_kg.toString());
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
    setEditingPrice("");
  };

  // Save edit
  const saveEdit = async (id: string) => {
    if (!editingName.trim() || !editingPrice) {
      toast({
        title: "Error",
        description: "Mohon lengkapi nama produk dan harga per kg",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from(TABLE_NAMES.PRODUCT_MASTER)
        .update({
          product_name: editingName.trim(),
          price_per_kg: parseInt(editingPrice),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      // Reset editing state
      setEditingId(null);
      setEditingName("");
      setEditingPrice("");

      // Reload products
      await loadProducts();

      toast({
        title: "Berhasil",
        description: "Produk berhasil diperbarui",
      });
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast({
        title: "Error",
        description: error.message.includes('duplicate') 
          ? "Nama produk sudah ada" 
          : "Gagal memperbarui produk",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete product (soft delete)
  const deleteProduct = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus produk "${name}"?`)) {
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from(TABLE_NAMES.PRODUCT_MASTER)
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      // Reload products
      await loadProducts();

      toast({
        title: "Berhasil",
        description: "Produk berhasil dihapus",
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus produk",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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
            <h1 className="text-3xl font-bold text-gray-900">Data Master Produk</h1>
            <p className="text-gray-600 mt-1">Kelola jenis produk dan harga per kilogram</p>
            {loading && (
              <div className="flex items-center gap-2 text-gray-600 mt-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Memuat data...</span>
              </div>
            )}
          </div>
        </div>

        {/* Add Product Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Tambah Produk Baru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="product-name">Nama Produk</Label>
                <Input
                  id="product-name"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Contoh: Paha, Dada, Sayap"
                />
              </div>
              
              <div>
                <Label htmlFor="price-per-kg">Harga per Kg (Rp)</Label>
                <Input
                  id="price-per-kg"
                  type="number"
                  value={pricePerKg}
                  onChange={(e) => setPricePerKg(e.target.value)}
                  placeholder="25000"
                  min="1"
                />
              </div>

              <div className="flex items-end">
                <Button 
                  onClick={addProduct} 
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Tambah Produk
                </Button>
              </div>
            </div>

            {pricePerKg && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">
                  Preview: {productName || "Nama Produk"} - {formatCurrency(parseInt(pricePerKg) || 0)}/Kg
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Daftar Produk
              </span>
              <Badge variant="outline">
                {products.length} produk
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {products.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Produk</TableHead>
                      <TableHead className="text-right">Harga per Kg</TableHead>
                      <TableHead className="text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          {editingId === product.id ? (
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="w-full"
                            />
                          ) : (
                            <span className="font-medium">{product.product_name}</span>
                          )}
                        </TableCell>
                        
                        <TableCell className="text-right">
                          {editingId === product.id ? (
                            <Input
                              type="number"
                              value={editingPrice}
                              onChange={(e) => setEditingPrice(e.target.value)}
                              className="w-32 ml-auto"
                              min="1"
                            />
                          ) : (
                            <span className="font-medium text-green-600">
                              {formatCurrency(product.price_per_kg)}
                            </span>
                          )}
                        </TableCell>
                        
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            {editingId === product.id ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => saveEdit(product.id)}
                                  disabled={saving}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  {saving ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Save className="h-3 w-3" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelEdit}
                                  disabled={saving}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startEdit(product)}
                                  disabled={saving}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteProduct(product.id, product.product_name)}
                                  disabled={saving}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Belum ada produk</p>
                <p className="text-gray-400 text-sm mt-1">
                  Tambahkan produk pertama Anda menggunakan form di atas
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default DataMaster;