import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Copy, Check, X, ChevronRight, Trophy, Star, MessageSquare, Phone, Gift, Wallet as WalletIcon, CheckCircle2, Lock } from "lucide-react";

const CURRENCY = "SPARK";
const SYMBOL = "⚡";

const TASKS = [
  { id: "daily_login", title: "Daily Login", description: "Open Pulse today", reward: 5, icon: <Zap size={18} className="text-yellow-400" /> },
  { id: "send_message", title: "Send a Message", description: "Chat with someone", reward: 10, icon: <MessageSquare size={18} className="text-blue-400" /> },
  { id: "make_call", title: "Make a Call", description: "Call a friend", reward: 15, icon: <Phone size={18} className="text-green-400" /> },
  { id: "send_gift", title: "Send a Gift", description: "Surprise someone", reward: 20, icon: <Gift size={18} className="text-pink-400" /> },
  { id: "add_contact", title: "Add a Contact", description: "Grow your network", reward: 10, icon: <Star size={18} className="text-purple-400" /> },
  { id: "update_profile", title: "Update Profile", description: "Add a bio or status", reward: 15, icon: <Trophy size={18} className="text-orange-400" /> },
];

const BUY_TIERS = [
  { amount: 100, price: "$0.99", popular: false },
  { amount: 500, price: "$3.99", popular: true },
  { amount: 1500, price: "$9.99", popular: false },
  { amount: 5000, price: "$24.99", popular: false },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white">
      {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
    </button>
  );
}

export default function Wallet() {
  const [balance, setBalance] = useState(0);
  const [walletAddress, setWalletAddress] = useState("");
  const [showReceive, setShowReceive] = useState(false);
  const [showBuy, setShowBuy] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [earningTask, setEarningTask] = useState<string | null>(null);
  const [txHistory, setTxHistory] = useState<{ id: string; type: string; amount: number; label: string; time: Date }[]>([]);

  const fetchWallet = useCallback(async () => {
    try {
      const res = await fetch("/api/wallet");
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
        setWalletAddress(data.address);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchWallet();
    const stored = localStorage.getItem("pulse-completed-tasks");
    if (stored) setCompletedTasks(JSON.parse(stored));
    const storedTx = localStorage.getItem("pulse-tx-history");
    if (storedTx) setTxHistory(JSON.parse(storedTx).map((tx: any) => ({ ...tx, time: new Date(tx.time) })));
    // Auto-complete daily login
    const lastLogin = localStorage.getItem("pulse-last-login");
    const today = new Date().toDateString();
    if (lastLogin !== today) {
      localStorage.setItem("pulse-last-login", today);
      const stored2 = localStorage.getItem("pulse-completed-tasks");
      const tasks: string[] = stored2 ? JSON.parse(stored2) : [];
      if (!tasks.includes("daily_login")) {
        // auto earn
        earnTask("daily_login", 5, tasks);
      }
    }
  }, []);

  const earnTask = async (taskId: string, reward: number, currentCompleted?: string[]) => {
    const completed = currentCompleted ?? completedTasks;
    if (completed.includes(taskId)) return;
    setEarningTask(taskId);
    try {
      const res = await fetch("/api/wallet/earn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: reward }),
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
        const newCompleted = [...completed, taskId];
        setCompletedTasks(newCompleted);
        localStorage.setItem("pulse-completed-tasks", JSON.stringify(newCompleted));
        const task = TASKS.find(t => t.id === taskId);
        const newTx = {
          id: `${taskId}_${Date.now()}`,
          type: "earn",
          amount: reward,
          label: task?.title ?? "Task reward",
          time: new Date(),
        };
        setTxHistory(prev => {
          const updated = [newTx, ...prev].slice(0, 20);
          localStorage.setItem("pulse-tx-history", JSON.stringify(updated));
          return updated;
        });
      }
    } catch {}
    setTimeout(() => setEarningTask(null), 600);
  };

  const handleBuy = async (amount: number) => {
    try {
      const res = await fetch("/api/wallet/earn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
        const newTx = {
          id: `buy_${Date.now()}`,
          type: "buy",
          amount,
          label: `Purchased ${amount} ${CURRENCY}`,
          time: new Date(),
        };
        setTxHistory(prev => {
          const updated = [newTx, ...prev].slice(0, 20);
          localStorage.setItem("pulse-tx-history", JSON.stringify(updated));
          return updated;
        });
      }
    } catch {}
    setShowBuy(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      <header className="h-16 border-b border-border flex items-center px-6 justify-between bg-card/80 backdrop-blur-md z-10 shrink-0">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <WalletIcon className="text-primary" size={20} /> Wallet
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-2xl mx-auto w-full scrollbar-thin space-y-5">
        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl overflow-hidden relative"
          style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #00BCD4 40%, #06b6d4 100%)" }}
        >
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 50%)" }} />
          <div className="relative p-6">
            <p className="text-white/70 text-sm font-medium uppercase tracking-widest mb-1">Spark Balance</p>
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-5xl font-black text-white tabular-nums">{balance.toLocaleString()}</span>
              <span className="text-2xl font-bold text-white/80">{SYMBOL}</span>
            </div>
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowReceive(true)}
                className="flex-1 bg-white/20 hover:bg-white/30 text-white font-bold py-3 rounded-2xl transition-colors backdrop-blur-sm text-sm"
              >
                ↓ Receive
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowBuy(true)}
                className="flex-1 bg-white text-[#0ea5e9] font-bold py-3 rounded-2xl transition-colors text-sm shadow-lg"
              >
                + Buy Spark
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Earn Section */}
        <section>
          <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-3 px-1 flex items-center gap-2">
            <Trophy size={14} className="text-yellow-500" /> Earn Spark
          </h2>
          <div className="space-y-2">
            {TASKS.map((task, i) => {
              const done = completedTasks.includes(task.id);
              const earning = earningTask === task.id;
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${done ? "bg-card/50 border-border opacity-60" : "bg-card border-border hover:border-primary/40 cursor-pointer"}`}
                  onClick={() => !done && earnTask(task.id, task.reward)}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${done ? "bg-green-500/10" : "bg-secondary"}`}>
                    {done ? <CheckCircle2 size={20} className="text-green-400" /> : task.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${done ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                    <p className="text-xs text-muted-foreground">{task.description}</p>
                  </div>
                  {done ? (
                    <span className="text-xs text-green-400 font-bold shrink-0">Done</span>
                  ) : (
                    <div className="flex items-center gap-1 shrink-0">
                      <motion.span
                        animate={earning ? { scale: [1, 1.3, 1] } : {}}
                        className="text-yellow-400 font-black text-sm"
                      >
                        +{task.reward} {SYMBOL}
                      </motion.span>
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Transaction History */}
        {txHistory.length > 0 && (
          <section>
            <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-3 px-1">History</h2>
            <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
              {txHistory.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 p-4">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0 ${tx.type === "buy" ? "bg-blue-500/10 text-blue-400" : "bg-green-500/10 text-green-400"}`}>
                    {tx.type === "buy" ? "↓" : "⚡"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.label}</p>
                    <p className="text-xs text-muted-foreground">{tx.time instanceof Date ? tx.time.toLocaleTimeString() : ""}</p>
                  </div>
                  <span className="text-sm font-bold text-green-400 shrink-0">+{tx.amount} ⚡</span>
                </div>
              ))}
            </div>
          </section>
        )}
        <div className="h-4" />
      </div>

      {/* Receive Modal */}
      <AnimatePresence>
        {showReceive && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowReceive(false)}
          >
            <motion.div
              className="bg-card border border-border rounded-3xl p-6 w-full max-w-sm"
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-black text-lg">Receive Spark</h3>
                <button onClick={() => setShowReceive(false)} className="p-1.5 rounded-full hover:bg-secondary transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="flex flex-col items-center gap-4">
                <div className="w-32 h-32 rounded-2xl bg-white flex items-center justify-center text-5xl shadow-lg">
                  ⚡
                </div>
                <div>
                  <p className="text-xs text-muted-foreground text-center mb-1">Your Spark Wallet Address</p>
                  <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2">
                    <code className="text-xs font-mono text-foreground break-all">{walletAddress}</code>
                    <CopyButton text={walletAddress} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">Share this address to receive Spark from others</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Buy Modal */}
      <AnimatePresence>
        {showBuy && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowBuy(false)}
          >
            <motion.div
              className="bg-card border border-border rounded-3xl p-6 w-full max-w-sm"
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-black text-lg">Buy Spark ⚡</h3>
                <button onClick={() => setShowBuy(false)} className="p-1.5 rounded-full hover:bg-secondary transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3">
                {BUY_TIERS.map((tier) => (
                  <motion.button
                    key={tier.amount}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleBuy(tier.amount)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${tier.popular ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(0,188,212,0.2)]" : "border-border bg-secondary hover:border-primary/50"}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">⚡</span>
                      <div className="text-left">
                        <p className="font-black">{tier.amount.toLocaleString()} {CURRENCY}</p>
                        {tier.popular && <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Popular</span>}
                      </div>
                    </div>
                    <span className={`font-bold text-sm ${tier.popular ? "text-primary" : "text-muted-foreground"}`}>{tier.price}</span>
                  </motion.button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground justify-center">
                <Lock size={11} /> Secure payment powered by Pulse Pay
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
