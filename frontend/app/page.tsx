"use client";

import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

export default function Dashboard() {
  // Form State
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  
  // Data State
  const [summary, setSummary] = useState<any>(null);
  const [rankings, setRankings] = useState<any[]>([]);
  const [statusMsg, setStatusMsg] = useState({ text: "", type: "" });

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // Fetch the leaderboard on load and whenever a transaction occurs
  const fetchRankings = async () => {
    try {
      const res = await fetch(`${API_URL}/ranking`);
      const data = await res.json();
      if (data.rankings) setRankings(data.rankings);
    } catch (err) {
      console.error("Failed to fetch rankings");
    }
  };

  const fetchSummary = async (user: string) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/summary/${user}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error("Failed to fetch summary");
    }
  };

  useEffect(() => {
    fetchRankings();
  }, []);

  // 🚀 THE CORE DEMONSTRATION LOGIC
  const handleTransaction = async (e: React.FormEvent, simulateDuplicate = false) => {
    e.preventDefault();
    setStatusMsg({ text: "Processing...", type: "text-blue-400" });

    // Generate a UUID for this specific transaction attempt
    // In a real app, this might be generated when the page loads or form is touched
    const currentTransactionId = uuidv4();

    const payload = {
      transaction_id: currentTransactionId,
      user_id: userId,
      amount: parseFloat(amount),
    };

    try {
      // 1. Send the initial request
      const res1 = await fetch(`${API_URL}/transaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data1 = await res1.json();

      // 2. If simulating a duplicate (Double-click test), immediately fire identical request
      if (simulateDuplicate) {
        const res2 = await fetch(`${API_URL}/transaction`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload), // Same exact payload and UUID
        });
        const data2 = await res2.json();
        
        // Show the idempotency warning from the backend
        setStatusMsg({ 
          text: `Request 1: ${data1.status} | Request 2: ${data2.message}`, 
          type: "text-orange-400" 
        });
      } else {
        if (res1.ok) {
          setStatusMsg({ text: "Transaction Successful!", type: "text-green-400" });
        } else {
          setStatusMsg({ text: data1.detail || "Error", type: "text-red-400" });
        }
      }

      // Refresh UI data
      fetchSummary(userId);
      fetchRankings();

    } catch (err) {
      setStatusMsg({ text: "Network Error", type: "text-red-400" });
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-blue-400">System Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          
          {/* LEFT COLUMN: Actions & Summary */}
          <div className="space-y-8">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h2 className="text-xl font-semibold mb-4">New Transaction</h2>
              <form onSubmit={(e) => handleTransaction(e, false)} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">User ID</label>
                  <input 
                    type="text" 
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                    placeholder="e.g. user_123"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Amount</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                    placeholder="e.g. 50.00"
                    required
                  />
                </div>
                
                <div className="flex gap-4 pt-2">
                  <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 py-2 rounded font-medium transition-colors">
                    Submit
                  </button>
                  {/* Button specifically designed to showcase idempotency for the video */}
                  <button 
                    type="button" 
                    onClick={(e) => handleTransaction(e, true)}
                    className="flex-1 bg-purple-600 hover:bg-purple-500 py-2 rounded font-medium transition-colors"
                  >
                    Simulate Duplicate
                  </button>
                </div>
              </form>

              {statusMsg.text && (
                <div className={`mt-4 text-sm font-medium ${statusMsg.type}`}>
                  {statusMsg.text}
                </div>
              )}
            </div>

            {/* Summary Panel */}
            {summary && (
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h2 className="text-xl font-semibold mb-4 text-green-400">User Summary: {summary.user_id}</h2>
                <div className="space-y-2 text-lg">
                  <p>Total Score: <span className="font-bold">{summary.total_score}</span></p>
                  <p>Transactions: <span className="font-bold">{summary.transaction_count}</span></p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Live Leaderboard */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-yellow-400">Live Leaderboard</h2>
            <p className="text-xs text-gray-400 mb-4">Rank Score = (Total Score × 0.7) + (Transactions × 0.3)</p>
            
            <div className="space-y-3">
              {rankings.map((user) => (
                <div key={user.user_id} className="flex items-center justify-between bg-gray-900 p-4 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-gray-500">#{user.rank}</span>
                    <div>
                      <p className="font-medium">{user.user_id}</p>
                      <p className="text-xs text-gray-400">{user.transactions} txns</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-yellow-400">{user.rank_score} pts</p>
                    <p className="text-xs text-gray-500">Raw: {user.total_score}</p>
                  </div>
                </div>
              ))}
              {rankings.length === 0 && <p className="text-gray-500">No data yet.</p>}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}