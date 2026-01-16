import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Preorder from "./pages/Preorder";
import Pembelian from "./pages/Pembelian";
import Penjualan from "./pages/Penjualan";
import LaporanPenjualan from "./pages/LaporanPenjualan";
import DataMaster from "./pages/DataMaster";
import Operasional from "./pages/Operasional"; // 1. IMPORT HALAMAN OPERASIONAL
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Dashboard */}
          <Route path="/" element={<Index />} />
          
          {/* Input Data Penjualan */}
          <Route path="/preorder" element={<Preorder />} />
          <Route path="/pembelian" element={<Pembelian />} />
          <Route path="/penjualan" element={<Penjualan />} />
          <Route path="/operasional" element={<Operasional />} /> {/* 2. DAFTARKAN JALANNYA DISINI */}
          
          {/* Menu Lainnya */}
          <Route path="/laporan-penjualan" element={<LaporanPenjualan />} />
          <Route path="/data-master" element={<DataMaster />} />
          
          {/* Halaman 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
