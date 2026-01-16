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
import Operasional from "./pages/Operasional"; 
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/preorder" element={<Preorder />} />
          <Route path="/pembelian" element={<Pembelian />} />
          <Route path="/penjualan" element={<Penjualan />} />
          <Route path="/operasional" element={<Operasional />} />
          <Route path="/laporan-penjualan" element={<LaporanPenjualan />} />
          <Route path="/data-master" element={<DataMaster />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
