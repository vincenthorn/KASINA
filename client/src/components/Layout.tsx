import React, { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import Logo from "./Logo";
import { useAuth } from "../lib/stores/useAuth";
import { useAutoHide } from "../lib/useAutoHide";
import { Home, Flame, BookOpen, BarChart, LogOut, Settings, Wind, Circle, Monitor, Expand, PieChart, Waves } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
  fullWidth?: boolean;
  isFocusMode?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, fullWidth = false, isFocusMode = false }) => {
  const location = useLocation();
  const { logout, email, subscriptionType } = useAuth();
  const { showCursor, showControls } = useAutoHide({ 
    hideDelay: 3000, 
    hideCursor: true, 
    hideControls: isFocusMode // Only hide controls in focus mode
  });

  // Check if user is admin or premium
  const isAdmin = email === "admin@kasina.app";
  const isPremium = subscriptionType === "premium" || subscriptionType === "admin";

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Define navigation items based on user role
  const navItems = isAdmin ? [
    // Admin users: Visual → Breath → Watch → Reflect
    { path: "/", label: "Home", icon: <Home className="w-5 h-5" /> },
    { path: "/kasinas", label: "Visual", icon: <Circle className="w-5 h-5" /> },
    { path: "/breath", label: "Breath", icon: <Waves className="w-5 h-5" /> },
    { path: "/meditation", label: "Watch", icon: <Monitor className="w-5 h-5" /> },
    { path: "/reflection", label: "Reflect", icon: <PieChart className="w-5 h-5" /> },
  ] : [
    // Regular users: Visual → Reflect
    { path: "/", label: "Home", icon: <Home className="w-5 h-5" /> },
    { path: "/kasinas", label: "Visual", icon: <Circle className="w-5 h-5" /> },
    { path: "/reflection", label: "Reflect", icon: <PieChart className="w-5 h-5" /> },
  ];
  
  // Admin nav item (only shown to admin users)
  const adminItem = { path: "/admin", label: "Admin", icon: <Settings className="w-5 h-5" /> };

  return (
    <div className={`flex h-screen bg-black text-white ${!showCursor ? 'cursor-none' : ''}`}>
      {/* Sidebar navigation - hidden in focus mode */}
      {!isFocusMode && showControls && (
        <div className="w-64 bg-gray-900 border-r border-gray-800 p-4 hidden md:flex flex-col">
          <div className="mb-8 mt-4">
            <Logo sidebarMode={true} alwaysVertical={true} />
          </div>
          
          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive(item.path) ? "default" : "ghost"}
                  className={`w-full justify-start text-left ${
                    isActive(item.path) 
                      ? "bg-indigo-600 hover:bg-indigo-700" 
                      : "hover:bg-gray-800"
                  }`}
                >
                  {item.icon}
                  <span className="ml-3">{item.label}</span>
                </Button>
              </Link>
            ))}
          </nav>
          
          <div className="mt-auto pt-4 border-t border-gray-800">
            {/* Admin link - only visible to admin users, now moved just above logout */}
            {isAdmin && (
              <div className="mb-2">
                <Link to={adminItem.path}>
                  <Button
                    variant={isActive(adminItem.path) ? "default" : "ghost"}
                    className={`w-full justify-start text-left ${
                      isActive(adminItem.path) 
                        ? "bg-purple-600 hover:bg-purple-700" 
                        : "hover:bg-gray-800"
                    }`}
                  >
                    {adminItem.icon}
                    <span className="ml-3">{adminItem.label}</span>
                  </Button>
                </Link>
              </div>
            )}
            
            <Button 
              variant="ghost" 
              onClick={logout}
              className="w-full justify-start text-left hover:bg-gray-800 text-gray-400"
            >
              <LogOut className="w-5 h-5" />
              <span className="ml-3">Logout</span>
            </Button>
          </div>
        </div>
      )}
      
      {/* Mobile top navigation - hidden in focus mode */}
      {!isFocusMode && showControls && (
        <div className="md:hidden fixed top-0 left-0 right-0 bg-gray-900 z-10 border-b border-gray-800">
          <div className="flex items-center justify-between p-4">
            <Logo size="small" showTagline={false} alwaysVertical={false} />
            <div className="flex space-x-2">
              {/* Regular nav items */}
              {navItems.map((item) => (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={isActive(item.path) ? "text-indigo-400" : "text-gray-400"}
                  >
                    {item.icon}
                  </Button>
                </Link>
              ))}
              
              {/* Admin button kept at the end for consistency with desktop */}
              {isAdmin && (
                <Link to={adminItem.path}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={isActive(adminItem.path) ? "text-purple-400" : "text-gray-400"}
                  >
                    {adminItem.icon}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Main content - Full width and no padding in focus mode */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className={`flex-1 overflow-y-auto ${
          isFocusMode 
            ? 'p-0 w-full' 
            : `p-6 md:p-8 ${fullWidth ? 'w-full' : 'max-w-6xl mx-auto'} pt-20 md:pt-8`
        }`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
