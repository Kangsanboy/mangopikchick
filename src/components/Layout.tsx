import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, FileInput, FileText, ChefHat, Menu, X, Database, Users, ShoppingCart, DollarSign } from "lucide-react";
interface LayoutProps {
  children: ReactNode;
}
const Layout = ({
  children
}: LayoutProps) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const menuItems = [{
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard
  }, {
    title: "Input Data Penjualan",
    icon: FileInput,
    submenu: [{
      title: "Preorder",
      href: "/preorder",
      icon: Users
    }, {
      title: "Pembelian",
      href: "/pembelian",
      icon: ShoppingCart
    }, {
      title: "Penjualan",
      href: "/penjualan",
      icon: DollarSign
    }]
  }, {
    title: "Laporan Penjualan",
    href: "/laporan-penjualan",
    icon: FileText
  }, {
    title: "Data Master",
    href: "/data-master",
    icon: Database
  }];
  return <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={cn("fixed inset-y-0 left-0 z-50 bg-white shadow-lg transition-all duration-300", sidebarOpen ? "w-64" : "w-16")}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
              <ChefHat className="h-6 w-6 text-white" />
            </div>
            {sidebarOpen && <div>
                <h1 className="text-lg font-bold text-gray-900">Ayam Potong Gacor</h1>
                <p className="text-sm text-gray-500">Sistem Penjualan</p>
              </div>}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2">
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = item.href ? location.pathname === item.href : false;
          const hasSubmenu = item.submenu && item.submenu.length > 0;
          const isSubmenuActive = hasSubmenu && item.submenu.some(sub => location.pathname === sub.href);
          return <div key={item.title || index}>
                {item.href ? <Link to={item.href} className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 relative group text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-normal" title={!sidebarOpen ? item.title : undefined}>
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {sidebarOpen && <span className="font-medium">{item.title}</span>}
                    {!sidebarOpen && <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                        {item.title}
                      </div>}
                  </Link> : <div>
                    <div className={cn("flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 relative group", isSubmenuActive ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md" : "text-gray-600")}>
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      {sidebarOpen && <span className="font-normal">{item.title}</span>}
                    </div>
                    {hasSubmenu && sidebarOpen && <div className="ml-8 mt-2 space-y-1">
                        {item.submenu.map(subItem => {
                  const SubIcon = subItem.icon;
                  const isSubActive = location.pathname === subItem.href;
                  return <Link key={subItem.href} to={subItem.href} className={cn("flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm", isSubActive ? "bg-green-100 text-green-700 font-medium" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900")}>
                              <SubIcon className="h-4 w-4 flex-shrink-0" />
                              <span>{subItem.title}</span>
                            </Link>;
                })}
                      </div>}
                  </div>}
              </div>;
        })}
        </nav>
      </div>

      {/* Main Content */}
      <div className={cn("transition-all duration-300", sidebarOpen ? "ml-64" : "ml-16")}>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>;
};
export default Layout;