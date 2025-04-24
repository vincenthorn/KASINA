import React, { useState } from "react";
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

const AdminPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, string>[]>([]);
  const { email, isAuthenticated } = useAuth();
  
  // List of admin emails
  const adminEmails = ["admin@kasina.app"];
  const isAdmin = isAuthenticated && email && adminEmails.includes(email);
  
  // If not admin, redirect to home
  if (!isAdmin) {
    return <Navigate to="/" />;
  }

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
    } catch (error) {
      console.error("Failed to upload whitelist:", error);
      toast.error("Failed to upload whitelist CSV");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-white mb-6">Admin Dashboard</h1>
      
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Upload User Whitelist</CardTitle>
          <CardDescription className="text-gray-400">
            Upload a new CSV file with approved user emails. This will replace the existing whitelist.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <label htmlFor="csv-upload" className="text-white font-medium">
                CSV File
              </label>
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="p-2 rounded bg-gray-700 text-white"
              />
              <p className="text-sm text-gray-400">
                The CSV file should include an "Email" column with user email addresses.
              </p>
            </div>
            
            {previewData.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-white font-medium">Preview:</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm text-white">
                    <thead>
                      <tr className="border-b border-gray-700">
                        {Object.keys(previewData[0]).slice(0, 3).map((header) => (
                          <th key={header} className="px-4 py-2 text-left">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, index) => (
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
                    Showing preview of first {previewData.length} rows and first 3 columns.
                  </p>
                </div>
              </div>
            )}
            
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full"
            >
              {uploading ? "Uploading..." : "Upload and Update Whitelist"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default AdminPage;