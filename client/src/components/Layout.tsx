import React, { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import Logo from "./Logo";
import { useAuth } from "../lib/stores/useAuth";
import { Home, Flame, Video, BookOpen, BarChart, LogOut, Settings } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
  fullWidth?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, fullWidth = false }) => {
  const location = useLocation();
  const { logout, email } = useAuth();

  // Check if user is admin
  const isAdmin = email === "admin@kasina.app";

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Nav items configuration
  const navItems = [
    { path: "/", label: "Home", icon: <Home className="w-5 h-5" /> },
    { path: "/freestyle", label: "Freestyle", icon: <Flame className="w-5 h-5" /> },
    { path: "/recording", label: "Recording", icon: <Video className="w-5 h-5" /> },
    { path: "/meditation", label: "Meditation", icon: <BookOpen className="w-5 h-5" /> },
    { path: "/reflection", label: "Reflection", icon: <BarChart className="w-5 h-5" /> },
  ];
  
  // Admin nav item (only shown to admin users)
  const adminItem = { path: "/admin", label: "Admin", icon: <Settings className="w-5 h-5" /> };

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Sidebar navigation */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 p-4 hidden md:flex flex-col">
        <div className="mb-8 mt-4">
          <Logo />
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
          
          {/* Admin link - only visible to admin users */}
          {isAdmin && (
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
          )}
        </nav>
        
        <div className="mt-auto pt-4 border-t border-gray-800">
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
      
      {/* Mobile top navigation */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-gray-900 z-10 border-b border-gray-800">
        <div className="flex items-center justify-between p-4">
          <Logo size="small" showTagline={false} />
          <div className="flex space-x-2">
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
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className={`flex-1 overflow-y-auto p-6 md:p-8 ${fullWidth ? 'w-full' : 'max-w-6xl mx-auto'} pt-20 md:pt-8`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
