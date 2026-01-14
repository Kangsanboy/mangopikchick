import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import InputData from "./pages/InputData";
import LaporanPenjualan from "./pages/LaporanPenjualan";
import DataMaster from "./pages/DataMaster";
import Preorder from "./pages/Preorder";
import Pembelian from "./pages/Pembelian";
import Penjualan from "./pages/Penjualan";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/input-data" element={<InputData />} />
          <Route path="/preorder" element={<Preorder />} />
          <Route path="/pembelian" element={<Pembelian />} />
          <Route path="/penjualan" element={<Penjualan />} />
          <Route path="/laporan-penjualan" element={<LaporanPenjualan />} />
          <Route path="/data-master" element={<DataMaster />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
