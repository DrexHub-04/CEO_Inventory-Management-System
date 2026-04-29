import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { FolderOpen, History, LogOut, LayoutDashboard, Package, XOctagon } from "lucide-react";
import { clearAuth } from "../utils/auth";
import { ConfirmDialog } from "./ui/ConfirmDialog";

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Equipment", path: "/products", icon: Package },
    { name: "Unserviceable", path: "/unserviceable", icon: XOctagon },
    { name: "Categories", path: "/categories", icon: FolderOpen },
    { name: "History", path: "/history", icon: History },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200">
        <div className="flex flex-col items-center gap-2 p-6 border-b border-gray-200">
          {/* Make sure the path matches your public folder structure */}
          <img
            src="/logo.jpg" // or "/assets/logo.jpg" if inside public/assets/
            alt="City Engineering Office"
            className="h-50 w-50 object-contain" // bigger size
          />
          <h1 className="font-semibold text-xl text-center">City Engineer's Office</h1>
        </div>

        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon className="size-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <button
            onClick={() => setLogoutDialogOpen(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-left text-gray-700 hover:bg-gray-100"
          >
            <LogOut className="size-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        onConfirm={handleLogout}
        title="Log Out"
        description="Are you sure you want to log out? You will need to sign in again to access the system."
        confirmText="Log Out"
        cancelText="Cancel"
        variant="default"
      />
    </div>
  );
}
