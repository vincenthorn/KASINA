import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';

interface SimpleUser {
  email: string;
  subscription_type: string;
  created_at: string;
}

interface SimpleSession {
  user_email: string;
  duration_seconds: number;
}

export default function SimpleAdminPage() {
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [sessions, setSessions] = useState<SimpleSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSimpleData();
  }, []);

  const fetchSimpleData = async () => {
    try {
      // Use direct SQL queries that definitely work
      const usersResponse = await fetch('/api/simple-users');
      const sessionsResponse = await fetch('/api/simple-sessions');
      
      if (usersResponse.ok && sessionsResponse.ok) {
        const usersData = await usersResponse.json();
        const sessionsData = await sessionsResponse.json();
        
        setUsers(usersData);
        setSessions(sessionsData);
      } else {
        throw new Error('Failed to fetch data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Simple Admin Dashboard</h1>
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Simple Admin Dashboard</h1>
          <div className="text-red-400">Error: {error}</div>
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalUsers = users.length;
  const freemiumUsers = users.filter(u => u.subscription_type === 'freemium').length;
  const premiumUsers = users.filter(u => u.subscription_type === 'premium').length;
  const adminUsers = users.filter(u => u.subscription_type === 'admin').length;

  const totalPracticeSeconds = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
  const totalHours = Math.floor(totalPracticeSeconds / 3600);
  const totalMinutes = Math.floor((totalPracticeSeconds % 3600) / 60);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Simple Admin Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-blue-400">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalUsers}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-green-400">Freemium Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{freemiumUsers}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-purple-400">Premium Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{premiumUsers}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-yellow-400">Admin Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{adminUsers}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle>Total Practice Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours}h {totalMinutes}m</div>
            <div className="text-sm text-gray-400">Across all users</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700 mt-6">
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {users.slice(0, 10).map((user, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-700 rounded">
                  <span>{user.email}</span>
                  <span className="text-sm text-gray-400">{user.subscription_type}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}