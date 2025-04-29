import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { apiRequest } from "../lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { useAuth } from "../lib/stores/useAuth";
import { Navigate } from "react-router-dom";
import { Loader2, Clock, Users, Upload } from "lucide-react";

// Define type for member data
interface Member {
  email: string;
  name: string;
  practiceTimeSeconds: number;
  practiceTimeFormatted: string;
}

const AdminPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, string>[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [displayCount, setDisplayCount] = useState(10); // Initially show 10 members
  const [totalPracticeTime, setTotalPracticeTime] = useState<string>('0h 0m');
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
  
  // Function to fetch whitelist data
  const fetchWhitelistData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/whitelist");
      
      if (!response.ok) {
        throw new Error("Failed to fetch whitelist data");
      }
      
      const data = await response.json();
      setMembers(data.members);
      
      // Save the total practice time
      if (data.totalPracticeTimeFormatted) {
        setTotalPracticeTime(data.totalPracticeTimeFormatted);
      }
    } catch (error) {
      console.error("Error fetching whitelist data:", error);
      toast.error("Failed to load whitelist data");
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
      
      const response = await fetch("/api/admin/upload-whitelist", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Upload failed");
      }
      
      const data = await response.json();
      toast.success(`Successfully updated whitelist with ${data.count} emails`);
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
    setDisplayCount(prev => prev + 10);
  };
  
  // Refresh the whitelist data
  const refreshData = () => {
    fetchWhitelistData();
  };
  
  return (
    <Layout>
      <h1 className="text-2xl font-bold text-white mb-6">Admin Dashboard</h1>
      
      {/* Total Network Time Card */}
      <div className="mb-8 bg-gradient-to-r from-indigo-900 to-purple-900 rounded-lg p-6 shadow-lg">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-indigo-300" />
            <h2 className="text-xl font-bold text-white">Total Network Meditation Time</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 to-purple-200">
              {totalPracticeTime}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 text-indigo-200">
            <Users className="h-4 w-4" />
            <p className="text-center">
              Combined practice time of all community members
            </p>
          </div>
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Upload card */}
        <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 shadow-lg overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/20 to-purple-900/10 pointer-events-none"></div>
          <CardHeader className="relative">
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-400" />
              Upload User Whitelist
            </CardTitle>
            <CardDescription className="text-indigo-200">
              Upload a new CSV file with approved user emails. This will replace the existing whitelist.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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
                </p>
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
                    Upload and Update Whitelist
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
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-400" />
              Whitelist Member Data
            </CardTitle>
            <CardDescription className="text-indigo-200">
              Member list with names, email addresses, and all-time practice duration.
            </CardDescription>
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
                        <th className="px-4 py-3 text-left font-medium text-indigo-200">Full Name</th>
                        <th className="px-4 py-3 text-left font-medium text-indigo-200">Email Address</th>
                        <th className="px-4 py-3 text-left font-medium text-indigo-200">All-Time Practice</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.slice(0, displayCount).map((member, index) => (
                        <tr key={member.email} className="border-b border-indigo-900/20 hover:bg-indigo-900/10 transition-colors">
                          <td className="px-4 py-3">
                            {member.name || "—"}
                          </td>
                          <td className="px-4 py-3">
                            {member.email}
                          </td>
                          <td className="px-4 py-3 font-medium text-indigo-200">
                            {member.practiceTimeFormatted}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {displayCount < members.length && (
                  <div className="flex justify-center mt-4">
                    <Button 
                      variant="outline"
                      className="bg-gradient-to-r from-indigo-700/80 to-purple-700/80 hover:from-indigo-600 hover:to-purple-600 text-white border-indigo-500/30"
                      onClick={handleLoadMore}
                    >
                      Load More ({members.length - displayCount} remaining)
                    </Button>
                  </div>
                )}
                
                <div className="text-center text-sm text-indigo-200/80 mt-2">
                  Showing {Math.min(displayCount, members.length)} of {members.length} members
                </div>
                
                <div className="flex justify-end mt-4">
                  <Button 
                    variant="outline"
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-indigo-500/30"
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