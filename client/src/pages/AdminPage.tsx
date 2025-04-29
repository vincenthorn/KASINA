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
import { Loader2 } from "lucide-react";

// Define type for member data
interface Member {
  email: string;
  name: string;
  practiceTimeSeconds: number;
  practiceTimeFormatted: string;
}

const AdminPage: React.FC = () => {
  // Substack upload state
  const [substackFile, setSubstackFile] = useState<File | null>(null);
  const [substackUploading, setSubstackUploading] = useState(false);
  const [substackPreviewData, setSubstackPreviewData] = useState<Record<string, string>[]>([]);
  
  // Friend upload state
  const [friendFile, setFriendFile] = useState<File | null>(null);
  const [friendUploading, setFriendUploading] = useState(false);
  const [friendPreviewData, setFriendPreviewData] = useState<Record<string, string>[]>([]);
  
  // Member list state
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [displayCount, setDisplayCount] = useState(10); // Initially show 10 members
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
    } catch (error) {
      console.error("Error fetching whitelist data:", error);
      toast.error("Failed to load whitelist data");
    } finally {
      setLoading(false);
    }
  };

  // Handle Substack file change
  const handleSubstackFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setSubstackFile(selectedFile);
      previewCSVFile(selectedFile, setSubstackPreviewData);
    }
  };
  
  // Handle Friend file change
  const handleFriendFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFriendFile(selectedFile);
      previewCSVFile(selectedFile, setFriendPreviewData);
    }
  };
  
  // Common function to preview CSV file
  const previewCSVFile = (file: File, setPreviewData: React.Dispatch<React.SetStateAction<Record<string, string>[]>>) => {
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
    
    reader.readAsText(file);
  };

  // Handle Substack upload
  const handleSubstackUpload = async () => {
    if (!substackFile) {
      toast.error("Please select a Substack CSV file first");
      return;
    }

    setSubstackUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("csv", substackFile);
      
      const response = await fetch("/api/admin/upload-substack", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Upload failed");
      }
      
      const data = await response.json();
      toast.success(`Successfully updated Substack whitelist with ${data.count} emails`);
      setSubstackFile(null);
      setSubstackPreviewData([]);
      
      // Refresh whitelist data after successful upload
      setTimeout(() => {
        fetchWhitelistData();
      }, 1000);
    } catch (error) {
      console.error("Failed to upload Substack whitelist:", error);
      toast.error("Failed to upload Substack CSV");
    } finally {
      setSubstackUploading(false);
    }
  };
  
  // Handle Friend upload
  const handleFriendUpload = async () => {
    if (!friendFile) {
      toast.error("Please select a Friend CSV file first");
      return;
    }

    setFriendUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("csv", friendFile);
      
      const response = await fetch("/api/admin/upload-friend", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Upload failed");
      }
      
      const data = await response.json();
      toast.success(`Successfully updated Friend whitelist with ${data.count} emails`);
      setFriendFile(null);
      setFriendPreviewData([]);
      
      // Refresh whitelist data after successful upload
      setTimeout(() => {
        fetchWhitelistData();
      }, 1000);
    } catch (error) {
      console.error("Failed to upload Friends whitelist:", error);
      toast.error("Failed to upload Friends CSV");
    } finally {
      setFriendUploading(false);
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
      
      <div className="space-y-6">
        {/* Upload cards - Two column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Substack Upload Card */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Substack Upload</CardTitle>
              <CardDescription className="text-gray-400">
                Upload a new CSV file exported from Substack with subscriber emails.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col space-y-2">
                  <label htmlFor="substack-upload" className="text-white font-medium">
                    Substack CSV File
                  </label>
                  <input
                    id="substack-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleSubstackFileChange}
                    className="p-2 rounded bg-gray-700 text-white"
                  />
                  <p className="text-sm text-gray-400">
                    The Substack export should include an "Email" column with subscriber addresses.
                  </p>
                </div>
                
                {substackPreviewData.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-white font-medium">Preview:</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm text-white">
                        <thead>
                          <tr className="border-b border-gray-700">
                            {Object.keys(substackPreviewData[0]).slice(0, 3).map((header) => (
                              <th key={header} className="px-4 py-2 text-left">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {substackPreviewData.map((row: Record<string, string>, index: number) => (
                            <tr key={index} className="border-b border-gray-700">
                              {Object.entries(row).slice(0, 3).map(([key, value]) => (
                                <td key={key} className="px-4 py-2">
                                  {String(value)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="text-sm text-gray-400 mt-2">
                        Showing preview of first {substackPreviewData.length} rows and first 3 columns.
                      </p>
                    </div>
                  </div>
                )}
                
                <Button
                  onClick={handleSubstackUpload}
                  disabled={!substackFile || substackUploading}
                  className="w-full"
                >
                  {substackUploading ? "Uploading..." : "Upload Substack List"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Friend Upload Card */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Friend Upload</CardTitle>
              <CardDescription className="text-gray-400">
                Upload a CSV file with friend email addresses to add to the whitelist.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col space-y-2">
                  <label htmlFor="friend-upload" className="text-white font-medium">
                    Friend CSV File
                  </label>
                  <input
                    id="friend-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFriendFileChange}
                    className="p-2 rounded bg-gray-700 text-white"
                  />
                  <p className="text-sm text-gray-400">
                    CSV should include an "Email" column with friend email addresses.
                  </p>
                </div>
                
                {friendPreviewData.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-white font-medium">Preview:</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm text-white">
                        <thead>
                          <tr className="border-b border-gray-700">
                            {Object.keys(friendPreviewData[0]).slice(0, 3).map((header) => (
                              <th key={header} className="px-4 py-2 text-left">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {friendPreviewData.map((row: Record<string, string>, index: number) => (
                            <tr key={index} className="border-b border-gray-700">
                              {Object.entries(row).slice(0, 3).map(([key, value]) => (
                                <td key={key} className="px-4 py-2">
                                  {String(value)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="text-sm text-gray-400 mt-2">
                        Showing preview of first {friendPreviewData.length} rows and first 3 columns.
                      </p>
                    </div>
                  </div>
                )}
                
                <Button
                  onClick={handleFriendUpload}
                  disabled={!friendFile || friendUploading}
                  className="w-full"
                >
                  {friendUploading ? "Uploading..." : "Upload Friend List"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Member list card */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Whitelist Member Data</CardTitle>
            <CardDescription className="text-gray-400">
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
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm text-white">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="px-4 py-3 text-left font-medium">Email Address</th>
                        <th className="px-4 py-3 text-left font-medium">Practice Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.slice(0, displayCount).map((member, index) => (
                        <tr key={member.email} className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
                          <td className="px-4 py-3">
                            {member.email}
                          </td>
                          <td className="px-4 py-3">
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
                      className="bg-gray-700 hover:bg-gray-600 text-white"
                      onClick={handleLoadMore}
                    >
                      Load More ({members.length - displayCount} remaining)
                    </Button>
                  </div>
                )}
                
                <div className="text-center text-sm text-gray-400 mt-2">
                  Showing {Math.min(displayCount, members.length)} of {members.length} members
                </div>
                
                <div className="flex justify-end mt-4">
                  <Button 
                    variant="outline"
                    className="bg-indigo-700 hover:bg-indigo-600 text-white"
                    onClick={refreshData}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Refreshing...
                      </>
                    ) : "Refresh Data"}
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