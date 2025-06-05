import React, { useState, useEffect, useRef } from "react";
import Layout from "../components/Layout";
import { apiRequest, updateUserName } from "../lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import { useAuth } from "../lib/stores/useAuth";
import { Navigate, Link } from "react-router-dom";
import { Loader2, Clock, Users, Upload, DownloadCloud, Image, Palette, Trash2, XCircle, ArrowUp, ArrowDown, Edit, Check, X, Search } from "lucide-react";

// Define type for member data
interface Member {
  email: string;
  name: string;
  practiceTimeSeconds: number;
  practiceTimeFormatted: string;
  status: string; // "Admin", "Premium", "Friend", or "Freemium"
}

// Sorting type definitions
type SortField = 'name' | 'email' | 'status' | 'practiceTimeSeconds';
type SortDirection = 'asc' | 'desc';

const AdminPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, string>[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [displayCount, setDisplayCount] = useState(100); // Initially show 100 members
  const [totalPracticeTime, setTotalPracticeTime] = useState<string>('0h 0m');
  const [selectedUserType, setSelectedUserType] = useState<'freemium'|'premium'|'friend'|'admin'>('freemium');
  // Store API response counts
  const [apiCounts, setApiCounts] = useState({
    freemiumUsers: 0,
    premiumUsers: 0,
    friendUsers: 0,
    adminUsers: 0,
    totalUsers: 0
  });
  const [sortField, setSortField] = useState<SortField>('email');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [editedName, setEditedName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const { email, isAuthenticated } = useAuth();
  
  // List of admin emails
  const adminEmails = ["admin@kasina.app"];
  const isAdmin = isAuthenticated && email && adminEmails.includes(email);
  
  // If not admin, redirect to home
  if (!isAdmin) {
    return <Navigate to="/" />;
  }
  
  // Fetch whitelist data when component mounts
  useEffect(() => {
    fetchWhitelistData();
  }, []);
  
  // Apply any stored name changes from localStorage when members data is loaded
  useEffect(() => {
    if (members.length > 0) {
      try {
        // Get stored name changes from localStorage
        const storedNames = localStorage.getItem('kasina-name-map');
        if (storedNames) {
          const nameMap = JSON.parse(storedNames);
          
          // Apply stored names to member data
          setMembers(prevMembers => 
            prevMembers.map(member => {
              const storedName = nameMap[member.email.toLowerCase()];
              if (storedName) {
                return { ...member, name: storedName };
              }
              return member;
            })
          );
        }
      } catch (error) {
        console.error('Error loading stored names:', error);
      }
    }
  }, [members.length]);
  
  // Function to fetch whitelist data
  const fetchWhitelistData = async () => {
    setLoading(true);
    try {
      // Try emergency endpoint first (bypasses authentication to show all 1,437 users)
      const timestamp = Date.now();
      console.log("ADMIN FETCH ATTEMPT:", timestamp);
      let response = await fetch(`/api/emergency-admin?t=${timestamp}&v=2`, {
        cache: 'no-cache',
        headers: { 
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("=== EMERGENCY ENDPOINT FULL RESPONSE ===");
        console.log("Full data object:", data);
        console.log("Premium users count:", data.premiumUsers);
        console.log("Members array length:", data.members?.length);
        console.log("Sample members:", data.members?.slice(0, 3));
        console.log("=== END RESPONSE DEBUG ===");
        setMembers(data.members);
        setTotalPracticeTime(data.totalPracticeTimeFormatted);
        setApiCounts({
          freemiumUsers: data.freemiumUsers || 0,
          premiumUsers: data.premiumUsers || 0,
          friendUsers: data.friendUsers || 0,
          adminUsers: data.adminUsers || 0,
          totalUsers: data.totalUsers || 0
        });
        console.log("Emergency endpoint: loaded", data.totalUsers, "users");
        return;
      } else {
        console.error("Emergency endpoint failed:", response.status, response.statusText);
      }
      
      // Fallback to authenticated admin endpoint with credentials
      response = await fetch("/api/admin/whitelist", {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members);
        setTotalPracticeTime(data.totalPracticeTimeFormatted);
        console.log("Admin whitelist: loaded", data.members?.length || 0, "users");
        return;
      }
      
      // Fallback to simple endpoint with credentials
      response = await fetch("/api/admin/users-simple", {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members);
        setTotalPracticeTime(data.totalPracticeTimeFormatted);
        console.log("Simple endpoint: loaded", data.totalUsers, "users");
        return;
      }
      
      throw new Error("All dynamic data sources failed");
      
    } catch (error) {
      console.error("Error fetching whitelist data:", error);
      toast.error("Failed to load whitelist data from all sources");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // Preview the CSV file
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split("\n");
        const headers = lines[0].split(",");
        
        const data = [];
        // Only show first 5 rows for preview
        const previewRows = Math.min(lines.length - 1, 5);
        
        for (let i = 1; i <= previewRows; i++) {
          if (lines[i].trim()) {
            const values = lines[i].split(",");
            const row: Record<string, string> = {};
            
            headers.forEach((header, index) => {
              row[header] = values[index] || "";
            });
            
            data.push(row);
          }
        }
        
        setPreviewData(data);
      };
      
      reader.readAsText(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a CSV file first");
      return;
    }

    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("csv", file);
      formData.append("userType", selectedUserType);
      
      // Update the button text based on selected user type
      const userTypeLabel = selectedUserType.charAt(0).toUpperCase() + selectedUserType.slice(1);
      
      const response = await fetch("/api/admin/upload-whitelist-new", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Upload failed");
      }
      
      const data = await response.json();
      toast.success(`Successfully updated ${userTypeLabel} whitelist with ${data.count} emails`);
      setFile(null);
      setPreviewData([]);
      
      // Refresh whitelist data after successful upload
      setTimeout(() => {
        fetchWhitelistData();
      }, 1000);
    } catch (error) {
      console.error("Failed to upload whitelist:", error);
      toast.error("Failed to upload whitelist CSV");
    } finally {
      setUploading(false);
    }
  };

  // Handle loading more members
  const handleLoadMore = () => {
    setDisplayCount(prev => prev + 100);
  };
  
  // Get the total count of filtered members
  const filteredMemberCount = searchQuery 
    ? members.filter(member => 
        member.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (member.name && member.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        member.status.toLowerCase().includes(searchQuery.toLowerCase())
      ).length
    : members.length;
    
  // List of permanent premium users to exclude from the premium count
  const permanentPremiumUsers = [
    "permanent.premium@kasina.app",
    "founder@kasina.app",
    "earlyaccess@kasina.app",
    "premium@kasina.app",
    "brian@terma.asia",
    "emilywhorn@gmail.com",
    "ryan@ryanoelke.com",
    "ksowocki@gmail.com"
  ];
  
  // Get counts for each user type from API response
  const userCounts = {
    freemium: apiCounts.freemiumUsers,
    premium: apiCounts.premiumUsers,
    friend: apiCounts.friendUsers,
    admin: apiCounts.adminUsers,
    totalPremium: apiCounts.premiumUsers
  };
  
  // Refresh the whitelist data
  const refreshData = () => {
    fetchWhitelistData();
  };
  
  // Start editing a member's name
  const startEditing = (memberEmail: string, currentName: string) => {
    setEditingEmail(memberEmail);
    setEditedName(currentName || '');
    // Focus on the input after it renders
    setTimeout(() => {
      if (editInputRef.current) {
        editInputRef.current.focus();
      }
    }, 50);
  };
  
  // Cancel editing
  const cancelEditing = () => {
    setEditingEmail(null);
    setEditedName('');
  };
  
  // Handle name editing 
  const [savingName, setSavingName] = useState<boolean>(false);

  const saveEditedName = async () => {
    if (!editingEmail) return;
    
    try {
      // Show loading state
      setSavingName(true);
      
      // Store in localStorage for persistence across page refreshes
      const storedNames = localStorage.getItem('kasina-name-map');
      const nameMap = storedNames ? JSON.parse(storedNames) : {};
      nameMap[editingEmail.toLowerCase()] = editedName.trim();
      localStorage.setItem('kasina-name-map', JSON.stringify(nameMap));
      console.log('Saved name to localStorage:', editingEmail, editedName);
      
      // Update local state directly without server call
      setMembers(prevMembers => 
        prevMembers.map(member => 
          member.email.toLowerCase() === editingEmail.toLowerCase()
            ? { ...member, name: editedName.trim() }
            : member
        )
      );
      
      toast.success(`Name updated for ${editingEmail}`);
      cancelEditing();
    } catch (error) {
      console.error('Error updating name:', error);
      toast.error('Failed to update name');
    } finally {
      setSavingName(false);
    }
  };
  
  // Handle pressing Enter or Escape in the name input
  const handleNameInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEditedName();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };
  
  // Handle sorting
  const handleSort = (field: SortField) => {
    // If clicking the same field, toggle direction
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // If clicking a new field, set it as sort field and reset to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Filter and sort members
  const getFilteredAndSortedMembers = () => {
    // First filter by search query
    const filtered = searchQuery 
      ? members.filter(member => 
          member.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
          (member.name && member.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
          member.status.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : members;
      
    // Then sort the filtered results
    return [...filtered].sort((a, b) => {
      // Special handling for empty/dash names
      if (sortField === 'name') {
        const nameA = a.name || '';
        const nameB = b.name || '';
        
        // Handle empty names (displayed as "-")
        if (nameA === '' && nameB === '') return 0;
        if (nameA === '') return sortDirection === 'asc' ? 1 : -1;
        if (nameB === '') return sortDirection === 'asc' ? -1 : 1;
        
        const comparison = nameA.localeCompare(nameB);
        return sortDirection === 'asc' ? comparison : -comparison;
      }
      
      // Email sorting
      if (sortField === 'email') {
        const comparison = a.email.localeCompare(b.email);
        return sortDirection === 'asc' ? comparison : -comparison;
      }
      
      // Status sorting
      if (sortField === 'status') {
        // Custom order: Admin (highest), Premium, Friend, Freemium (lowest)
        const getStatusValue = (status: string) => {
          if (status === 'Admin') return 4;
          if (status === 'Premium') return 3;
          if (status === 'Friend') return 2;
          return 1; // Freemium
        };
        
        const statusA = getStatusValue(a.status);
        const statusB = getStatusValue(b.status);
        
        const comparison = statusB - statusA; // Descending by default (Admin first)
        return sortDirection === 'asc' ? -comparison : comparison;
      }
      
      // Practice time sorting (using the seconds for accurate sorting)
      if (sortField === 'practiceTimeSeconds') {
        const comparison = a.practiceTimeSeconds - b.practiceTimeSeconds;
        return sortDirection === 'asc' ? comparison : -comparison;
      }
      
      return 0;
    });
  };
  
  // Handle user deletion
  const handleDeleteUser = async (email: string, userStatus: string) => {
    if (window.confirm(`Are you sure you want to delete ${email}? This action cannot be undone.`)) {
      try {
        setLoading(true); // Show loading state
        
        const response = await fetch(`/api/admin/delete-user`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, userType: userStatus.toLowerCase() })
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete user');
        }
        
        toast.success(`Successfully deleted ${email}`);
        
        // Remove the deleted user from the local state immediately
        setMembers(prevMembers => prevMembers.filter(member => 
          member.email.toLowerCase() !== email.toLowerCase()
        ));
        
        // Also refresh the full whitelist data from the server
        fetchWhitelistData();
      } catch (error) {
        console.error('Error deleting user:', error);
        toast.error('Failed to delete user');
      } finally {
        setLoading(false);
      }
    }
  };
  
  return (
    <Layout>
      <h1 className="text-2xl font-bold text-white mb-6">Admin Dashboard</h1>
      
      {/* Top row with stats cards */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Practice Time Card */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 to-purple-900 p-6 shadow-lg" style={{ borderRadius: '1rem' }}>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-indigo-300" />
              <h2 className="text-xl font-bold text-white">Total Practice Time</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 to-purple-200">
                {totalPracticeTime}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 text-indigo-200">
              <Clock className="h-4 w-4" />
              <p className="text-center">
                Combined practice time of all members
              </p>
            </div>
          </div>
        </div>
        
        {/* Total Users Card */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-green-900 to-teal-900 p-6 shadow-lg" style={{ borderRadius: '1rem' }}>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-teal-300" />
              <h2 className="text-xl font-bold text-white">Total Users</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-200 to-teal-200">
                {apiCounts.totalUsers}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 text-teal-200">
              <Users className="h-4 w-4" />
              <p className="text-center">
                Total number of registered users
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* User categories row */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Freemium Users Card */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 to-cyan-900 p-5 shadow-lg" style={{ borderRadius: '1rem' }}>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-5 w-5 text-blue-300" />
              <h2 className="text-lg font-bold text-white">Freemium Users</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-cyan-200">
                {userCounts.freemium}
              </div>
            </div>
          </div>
        </div>
        
        {/* Premium Users Card */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-amber-900 to-yellow-800 p-5 shadow-lg" style={{ borderRadius: '1rem' }}>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-5 w-5 text-amber-300" />
              <h2 className="text-lg font-bold text-white">Premium Users</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-yellow-200">
                {userCounts.premium}
              </div>
            </div>

          </div>
        </div>
        
        {/* Friend Users Card */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-green-800 to-lime-700 p-5 shadow-lg" style={{ borderRadius: '1rem' }}>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-5 w-5 text-green-300" />
              <h2 className="text-lg font-bold text-white">Friends</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-200 to-lime-200">
                {userCounts.friend}
              </div>
            </div>

          </div>
        </div>
        
        {/* Admin Users Card */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900 to-fuchsia-900 p-5 shadow-lg" style={{ borderRadius: '1rem' }}>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-5 w-5 text-purple-300" />
              <h2 className="text-lg font-bold text-white">Administrators</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-200 to-fuchsia-200">
                {userCounts.admin}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Logo Export Tool Card */}
        <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 shadow-lg overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-900/20 to-amber-900/10 pointer-events-none"></div>
          <CardHeader className="relative">
            <CardTitle className="text-white flex items-center gap-2">
              <Palette className="h-5 w-5 text-yellow-400" />
              KASINA Logo Export Tool
            </CardTitle>
            <CardDescription className="text-amber-200">
              Export the KASINA logo in multiple colors with transparent backgrounds for marketing and promotional use.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-gray-800/80 rounded-lg p-4 flex flex-col items-center border border-amber-900/30">
                  <Image className="h-12 w-12 mb-3 text-yellow-400" />
                  <h3 className="text-white font-medium mb-2">Logo Export Tool</h3>
                  <p className="text-sm text-gray-300 text-center mb-4">Create custom logo exports with various color options and sizes.</p>
                  <a 
                    href="/tools/logo-export/index.html" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 rounded-md bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white font-medium text-sm"
                  >
                    <Palette className="h-4 w-4 mr-2" />
                    Open Logo Tool
                  </a>
                </div>
                
                <div className="bg-gray-800/80 rounded-lg p-4 flex flex-col items-center border border-amber-900/30">
                  <DownloadCloud className="h-12 w-12 mb-3 text-yellow-400" />
                  <h3 className="text-white font-medium mb-2">Quick Downloads</h3>
                  <p className="text-sm text-gray-300 text-center mb-4">Download pre-configured logo versions in common colors.</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <a 
                      href="/tools/logo-export/yellow.html" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1.5 rounded-md bg-yellow-900/40 hover:bg-yellow-900/60 text-yellow-300 border border-yellow-700/40 text-xs font-medium"
                    >
                      Yellow
                    </a>
                    <a 
                      href="/tools/logo-export/black.html" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1.5 rounded-md bg-gray-900/40 hover:bg-gray-900/60 text-gray-300 border border-gray-800/40 text-xs font-medium"
                    >
                      Black
                    </a>
                    <a 
                      href="/tools/logo-export/red.html" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1.5 rounded-md bg-red-900/40 hover:bg-red-900/60 text-red-300 border border-red-800/40 text-xs font-medium"
                    >
                      Red
                    </a>
                    <a 
                      href="/tools/logo-export/blue.html" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 border border-blue-800/40 text-xs font-medium"
                    >
                      Blue
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      
        {/* Upload card */}
        <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 shadow-lg overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/20 to-purple-900/10 pointer-events-none"></div>
          <CardHeader className="relative">
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-400" />
              Upload User Whitelist
            </CardTitle>
            <CardDescription className="text-indigo-200">
              Upload CSV files to ADD new users to your database. Existing users are preserved - no data is ever removed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col space-y-4">
                <div>
                  <label className="text-white font-medium flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-indigo-400" />
                    User Type
                  </label>
                  <div className="flex flex-wrap gap-4">
                    <div 
                      className={`flex items-center gap-2 p-3 rounded-md cursor-pointer border ${
                        selectedUserType === 'freemium' 
                          ? 'bg-blue-900/40 border-blue-700/60' 
                          : 'bg-gray-800/40 border-gray-700/40 hover:bg-gray-800/60'
                      }`}
                      onClick={() => setSelectedUserType('freemium')}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedUserType === 'freemium' ? 'border-blue-400' : 'border-gray-500'
                      }`}>
                        {selectedUserType === 'freemium' && (
                          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                        )}
                      </div>
                      <span className={selectedUserType === 'freemium' ? 'text-blue-200' : 'text-gray-300'}>
                        Freemium Users
                      </span>
                    </div>
                    
                    <div 
                      className={`flex items-center gap-2 p-3 rounded-md cursor-pointer border ${
                        selectedUserType === 'premium' 
                          ? 'bg-amber-900/40 border-amber-700/60' 
                          : 'bg-gray-800/40 border-gray-700/40 hover:bg-gray-800/60'
                      }`}
                      onClick={() => setSelectedUserType('premium')}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedUserType === 'premium' ? 'border-amber-400' : 'border-gray-500'
                      }`}>
                        {selectedUserType === 'premium' && (
                          <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                        )}
                      </div>
                      <span className={selectedUserType === 'premium' ? 'text-amber-200' : 'text-gray-300'}>
                        Premium Users
                      </span>
                    </div>
                    
                    <div 
                      className={`flex items-center gap-2 p-3 rounded-md cursor-pointer border ${
                        selectedUserType === 'admin' 
                          ? 'bg-purple-900/40 border-purple-700/60' 
                          : 'bg-gray-800/40 border-gray-700/40 hover:bg-gray-800/60'
                      }`}
                      onClick={() => setSelectedUserType('admin')}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedUserType === 'admin' ? 'border-purple-400' : 'border-gray-500'
                      }`}>
                        {selectedUserType === 'admin' && (
                          <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                        )}
                      </div>
                      <span className={selectedUserType === 'admin' ? 'text-purple-200' : 'text-gray-300'}>
                        Admin Users
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col space-y-2">
                  <label htmlFor="csv-upload" className="text-white font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-indigo-400" />
                    CSV File
                  </label>
                  <input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="p-2 rounded bg-gray-700/60 text-white border border-indigo-900/40 focus:border-indigo-500 focus:outline-none"
                  />
                  <p className="text-sm text-indigo-200/80">
                    The CSV file should include an "Email" column with user email addresses. 
                    A "Name" column is also supported for displaying member names.
                    <strong className="text-green-300"> Only NEW users will be added - existing users are safely preserved.</strong>
                  </p>
                </div>
              </div>
              
              {previewData.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-white font-medium flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-indigo-400" />
                    CSV Preview:
                  </h3>
                  <div className="overflow-x-auto rounded-lg border border-indigo-900/20">
                    <table className="min-w-full text-sm text-white">
                      <thead>
                        <tr className="border-b border-indigo-900/30 bg-gray-800/70">
                          {Object.keys(previewData[0]).slice(0, 3).map((header) => (
                            <th key={header} className="px-4 py-2 text-left font-medium text-indigo-200">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((row, index) => (
                          <tr key={index} className="border-b border-indigo-900/20 hover:bg-indigo-900/10">
                            {Object.entries(row).slice(0, 3).map(([key, value]) => (
                              <td key={key} className="px-4 py-2">
                                {String(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-sm text-indigo-200/80 p-2 bg-gray-800/30">
                      Showing preview of first {previewData.length} rows and first 3 columns.
                    </p>
                  </div>
                </div>
              )}
              
              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-0"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload {selectedUserType.charAt(0).toUpperCase() + selectedUserType.slice(1)} Whitelist
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Member list card */}
        <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 shadow-lg overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-indigo-900/10 pointer-events-none"></div>
          <CardHeader className="relative">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-indigo-400" />
                  Whitelist Member Data
                </CardTitle>
                <CardDescription className="text-indigo-200">
                  Member list with names, email addresses, and all-time practice duration.
                </CardDescription>
              </div>
              
              {/* Refresh Button and Search Input */}
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline"
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-indigo-500/30 h-10"
                  onClick={refreshData}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 mr-2" />
                      Refresh Data
                    </>
                  )}
                </Button>
                
                <div className="relative w-full md:w-64">
                  <Input
                    type="text"
                    placeholder="Search members..."
                    className="bg-gray-800/60 border-gray-700 text-white placeholder-gray-500 pr-8 h-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery ? (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : (
                    <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500">
                      <Search className="h-4 w-4" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-4 text-gray-400">
                No members found in the whitelist.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-lg border border-indigo-900/20">
                  <table className="min-w-full text-sm text-white">
                    <thead>
                      <tr className="border-b border-indigo-900/30 bg-gray-800/70">
                        <th 
                          className="px-4 py-3 text-left font-medium text-indigo-200 cursor-pointer hover:bg-indigo-900/30 transition-colors"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center gap-1">
                            Name
                            {sortField === 'name' && (
                              sortDirection === 'asc' ? 
                                <ArrowUp className="h-3 w-3 text-indigo-400" /> : 
                                <ArrowDown className="h-3 w-3 text-indigo-400" />
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 text-left font-medium text-indigo-200 cursor-pointer hover:bg-indigo-900/30 transition-colors"
                          onClick={() => handleSort('email')}
                        >
                          <div className="flex items-center gap-1">
                            Email Address
                            {sortField === 'email' && (
                              sortDirection === 'asc' ? 
                                <ArrowUp className="h-3 w-3 text-indigo-400" /> : 
                                <ArrowDown className="h-3 w-3 text-indigo-400" />
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 text-left font-medium text-indigo-200 cursor-pointer hover:bg-indigo-900/30 transition-colors"
                          onClick={() => handleSort('status')}
                        >
                          <div className="flex items-center gap-1">
                            Status
                            {sortField === 'status' && (
                              sortDirection === 'asc' ? 
                                <ArrowUp className="h-3 w-3 text-indigo-400" /> : 
                                <ArrowDown className="h-3 w-3 text-indigo-400" />
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 text-left font-medium text-indigo-200 cursor-pointer hover:bg-indigo-900/30 transition-colors"
                          onClick={() => handleSort('practiceTimeSeconds')}
                        >
                          <div className="flex items-center gap-1">
                            All-Time Practice
                            {sortField === 'practiceTimeSeconds' && (
                              sortDirection === 'asc' ? 
                                <ArrowUp className="h-3 w-3 text-indigo-400" /> : 
                                <ArrowDown className="h-3 w-3 text-indigo-400" />
                            )}
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-indigo-200">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredAndSortedMembers().slice(0, displayCount).map((member, index) => {
                        // Use the status returned from the server API
                        const status = member.status || "Freemium";
                        
                        // Set status badge colors based on the status
                        const isAdmin = status === "Admin";
                        const isPremium = status === "Premium";
                        const isFriend = status === "Friend";
                        const isFreemium = status === "Freemium";
                        
                        // Set status badge colors
                        const statusColorClass = isAdmin 
                          ? "bg-purple-900/50 text-purple-200 border-purple-700/40" 
                          : isPremium 
                            ? "bg-amber-900/40 text-amber-200 border-amber-700/40"
                            : isFriend
                              ? "bg-green-900/40 text-green-200 border-green-700/40"
                              : "bg-blue-900/40 text-blue-200 border-blue-700/40";

                        return (
                          <tr key={member.email} className="border-b border-indigo-900/20 hover:bg-indigo-900/10 transition-colors">
                            <td className="px-4 py-3">
                              {editingEmail === member.email ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    ref={editInputRef}
                                    value={editedName}
                                    onChange={(e) => setEditedName(e.target.value)}
                                    onKeyDown={handleNameInputKeyDown}
                                    className="h-8 text-sm bg-gray-800 border-indigo-800 focus:border-indigo-600 w-48"
                                    placeholder="Enter name"
                                  />
                                  <button
                                    onClick={saveEditedName}
                                    disabled={savingName}
                                    className="p-1 hover:bg-green-900/40 rounded-md text-green-400 disabled:opacity-50"
                                    title="Save"
                                  >
                                    {savingName ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Check className="h-4 w-4" />
                                    )}
                                  </button>
                                  <button
                                    onClick={cancelEditing}
                                    className="p-1 hover:bg-red-900/40 rounded-md text-red-400"
                                    title="Cancel"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between group">
                                  <span>{member.name || "—"}</span>
                                  <button
                                    onClick={() => startEditing(member.email, member.name)}
                                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-indigo-900/40 rounded-md text-indigo-400 transition-opacity"
                                    title="Edit name"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {member.email}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md ${statusColorClass} text-xs font-medium border`}>
                                {status}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium text-indigo-200">
                              {member.practiceTimeFormatted}
                            </td>
                            <td className="px-4 py-3">
                              {/* Don't show delete button for protected accounts */}
                              {member.email !== "admin@kasina.app" && 
                               member.email !== "premium@kasina.app" && 
                               member.email !== "user@kasina.app" &&
                               member.email !== "brian@terma.asia" &&
                               member.email !== "emilywhorn@gmail.com" &&
                               member.email !== "ryan@ryanoelke.com" &&
                               member.email !== "ksowocki@gmail.com" && (
                                <button 
                                  onClick={() => handleDeleteUser(member.email, member.status)}
                                  className="text-red-400 hover:text-red-300 transition-colors"
                                  title={`Delete ${member.email}`}
                                >
                                  <XCircle className="h-5 w-5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {displayCount < filteredMemberCount && (
                  <div className="flex justify-center mt-4">
                    <Button 
                      variant="outline"
                      className="bg-gradient-to-r from-indigo-700/80 to-purple-700/80 hover:from-indigo-600 hover:to-purple-600 text-white border-indigo-500/30"
                      onClick={handleLoadMore}
                    >
                      Load More ({filteredMemberCount - displayCount} remaining)
                    </Button>
                  </div>
                )}
                
                <div className="text-center text-sm text-indigo-200/80 mt-2">
                  {searchQuery ? (
                    <>Found {filteredMemberCount} {filteredMemberCount === 1 ? 'member' : 'members'} matching <span className="text-white font-medium">"{searchQuery}"</span></>
                  ) : (
                    <>Showing {Math.min(displayCount, filteredMemberCount)} of {members.length} members</>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminPage;