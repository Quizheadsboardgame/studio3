
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import { 
  Plus, 
  Search, 
  Download, 
  Trash2, 
  Calendar as CalendarIcon,
  Pencil,
  Check,
  X,
  History,
  Coins,
  Loader2,
  ShieldCheck,
  UserCircle,
  Lock,
  Settings2,
  Users,
  Activity,
  CreditCard,
  TrendingUp,
  Sparkles,
  BarChart3,
  Camera
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";

import { useSales, Sale } from "@/hooks/use-sales";
import { 
  useAuth, 
  useUser, 
  initiateAnonymousSignIn
} from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { generateDailySalesSummary } from "@/ai/flows/generate-daily-sales-summary";

type ProfileType = 'manager' | 'staff';

const MANAGER_PASSWORD = "Harley";
const AUTH_EXPIRY_KEY = "newt_manager_auth_expiry";

export default function Dashboard() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const { toast } = useToast();
  
  const [profileId, setProfileId] = useState<ProfileType>('staff');
  
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [isManagerAuthenticated, setIsManagerAuthenticated] = useState(false);

  const { sellers, sales, isLoaded, addSeller, removeSeller, addSale, deleteSale, updateSale } = useSales(profileId);
  
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [newSellerName, setNewSellerName] = useState("");
  const [newSellerCommission, setNewSellerCommission] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const [newSaleCard, setNewSaleCard] = useState("");
  const [newSalePrice, setNewSalePrice] = useState("");
  const [entrySellerId, setEntrySellerId] = useState("");

  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [editCard, setEditCard] = useState("");
  const [editPrice, setEditPrice] = useState("");

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    setSelectedDate(format(new Date(), "yyyy-MM-dd"));
    
    // Check for existing manager session on mount
    const expiry = localStorage.getItem(AUTH_EXPIRY_KEY);
    if (expiry && parseInt(expiry) > new Date().getTime()) {
      setIsManagerAuthenticated(true);
      setProfileId('manager'); // Automatically switch to manager profile if authenticated
    }
  }, []);

  useEffect(() => {
    if (!isUserLoading && !user && auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  useEffect(() => {
    if (sellers.length > 0 && !entrySellerId) {
      setEntrySellerId(sellers[0].id);
    }
  }, [sellers, entrySellerId]);

  useEffect(() => {
    if (sellers.length > 0 && activeTab !== "all" && !sellers.find(s => s.id === activeTab)) {
      setActiveTab("all");
    }
  }, [sellers, activeTab]);

  const dailySalesData = useMemo(() => sales[selectedDate] || {}, [sales, selectedDate]);

  const allDailySales = useMemo(() => {
    return Object.values(dailySalesData).flat().sort((a, b) => (a.id || '').localeCompare(b.id || ''));
  }, [dailySalesData]);

  const chartData = useMemo(() => {
    return sellers.map(seller => {
      const sellerSales = dailySalesData[seller.id] || [];
      return {
        name: seller.name,
        total: sellerSales.reduce((acc, s) => acc + s.price, 0),
        commission: sellerSales.reduce((acc, s) => acc + (s.commission || 0), 0)
      };
    }).filter(d => d.total > 0).sort((a, b) => b.total - a.total);
  }, [sellers, dailySalesData]);

  const dailyStats = useMemo(() => {
    let totalSales = 0;
    let totalCommission = 0;
    let totalCards = 0;
    let maxSellerTotal = 0;
    let topSellerName = "-";

    sellers.forEach((seller) => {
      const sellerSales = dailySalesData[seller.id] || [];
      const sellerTotal = sellerSales.reduce((acc, s) => acc + s.price, 0);
      const sellerComm = sellerSales.reduce((acc, s) => acc + (s.commission || 0), 0);
      
      totalSales += sellerTotal;
      totalCommission += sellerComm;
      totalCards += sellerSales.length;

      if (sellerTotal > maxSellerTotal) {
        maxSellerTotal = sellerTotal;
        topSellerName = seller.name;
      }
    });

    return { totalSales, totalCommission, totalCards, topSellerName };
  }, [sellers, dailySalesData]);

  const allTimeStats = useMemo(() => {
    let totalSales = 0;
    let totalCommission = 0;
    let totalCards = 0;
    const sellerTotals: Record<string, number> = {};

    Object.values(sales).forEach((daySales) => {
      Object.entries(daySales).forEach(([sellerId, sellerSales]) => {
        const dayTotal = sellerSales.reduce((acc, s) => acc + s.price, 0);
        const dayComm = sellerSales.reduce((acc, s) => acc + (s.commission || 0), 0);
        totalSales += dayTotal;
        totalCommission += dayComm;
        totalCards += sellerSales.length;
        sellerTotals[sellerId] = (sellerTotals[sellerId] || 0) + dayTotal;
      });
    });

    let topSeller = "-";
    let maxTotal = 0;
    Object.entries(sellerTotals).forEach(([sellerId, total]) => {
      if (total > maxTotal) {
        maxTotal = total;
        const seller = sellers.find(s => s.id === sellerId);
        topSeller = seller ? seller.name : sellerId;
      }
    });

    return { totalSales, totalCommission, totalCards, topSeller };
  }, [sales, sellers]);

  const recentActivity = useMemo(() => {
    const all: { date: string; sellerName: string; card: string; price: number; commission: number; origin?: string }[] = [];
    Object.entries(sales).forEach(([date, daySales]) => {
      Object.entries(daySales).forEach(([sellerId, sellerSales]) => {
        const seller = sellers.find(s => s.id === sellerId);
        const name = seller ? seller.name : sellerId;
        sellerSales.forEach((sale) => {
          all.push({ date, sellerName: name, card: sale.cardName, price: sale.price, commission: sale.commission || 0, origin: sale.profileOrigin });
        });
      });
    });
    return all.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  }, [sales, sellers]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const results: { date: string; sellerName: string; card: string; price: number; commission: number; origin?: string }[] = [];
    
    Object.entries(sales).forEach(([date, daySales]) => {
      Object.entries(daySales).forEach(([sellerId, sellerSales]) => {
        const seller = sellers.find(s => s.id === sellerId);
        const name = seller ? seller.name : sellerId;
        sellerSales.forEach((sale) => {
          if (sale.cardName.toLowerCase().includes(searchQuery.toLowerCase())) {
            results.push({ date, sellerName: name, card: sale.cardName, price: sale.price, commission: sale.commission || 0, origin: sale.profileOrigin });
          }
        });
      });
    });
    
    return results;
  }, [sales, searchQuery, sellers]);

  const handleProfileSwitch = (newProfile: ProfileType) => {
    if (newProfile === 'manager' && !isManagerAuthenticated) {
      setIsPasswordDialogOpen(true);
      return;
    }
    setProfileId(newProfile);
  };

  const handlePasswordSubmit = () => {
    if (passwordInput === MANAGER_PASSWORD) {
      const expiryTime = new Date().getTime() + 24 * 60 * 60 * 1000;
      localStorage.setItem(AUTH_EXPIRY_KEY, expiryTime.toString());
      setIsManagerAuthenticated(true);
      setProfileId('manager');
      setIsPasswordDialogOpen(false);
      setPasswordInput("");
      toast({ title: "Authenticated", description: "Manager session active for 24 hours." });
    } else {
      toast({ variant: "destructive", title: "Access Denied", description: "Incorrect password." });
    }
  };

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    setAiSummary(null);
    try {
      const inputData: Record<string, { card: string, price: number }[]> = {};
      Object.entries(dailySalesData).forEach(([sellerId, sellerSales]) => {
        const seller = sellers.find(s => s.id === sellerId);
        const name = seller ? seller.name : sellerId;
        inputData[name] = sellerSales.map(s => ({ card: s.cardName, price: s.price }));
      });

      const result = await generateDailySalesSummary({
        date: selectedDate,
        dailySales: inputData
      });
      setAiSummary(result.summary);
    } catch (e) {
      toast({ variant: "destructive", title: "AI Error", description: "Could not generate daily summary." });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleExportCSV = () => {
    const rows = [["Date", "Seller", "Card", "Price", "Commission", "Origin"]];
    Object.entries(sales).forEach(([date, daySales]) => {
      Object.entries(daySales).forEach(([sellerId, sellerSales]) => {
        const seller = sellers.find(s => s.id === sellerId);
        const name = seller ? seller.name : sellerId;
        sellerSales.forEach((sale) => {
          rows.push([date, name, sale.cardName, sale.price.toString(), (sale.commission || 0).toString(), sale.profileOrigin || '']);
        });
      });
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `nc_tracker_${profileId}_vault.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveReportAsImage = async (sellerId: string) => {
    const element = document.getElementById(`report-content-${sellerId}`);
    if (!element) return;

    setIsCapturing(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: true,
      });
      
      const image = canvas.toDataURL("image/png", 1.0);
      const link = document.createElement("a");
      link.download = `NC_Report_${sellerId}_${selectedDate}.png`;
      link.href = image;
      link.click();
      toast({ title: "Report Saved", description: "Sales report image has been downloaded." });
    } catch (error) {
      console.error("Capture failed", error);
      toast({ variant: "destructive", title: "Capture Failed", description: "Could not save report image." });
    } finally {
      setIsCapturing(false);
    }
  };

  const startEditing = (sale: Sale) => {
    if (!sale.id) return;
    setEditingSaleId(sale.id);
    setEditCard(sale.cardName);
    setEditPrice(sale.price.toString());
  };

  const cancelEditing = () => {
    setEditingSaleId(null);
    setEditCard("");
    setEditPrice("");
  };

  const handleUpdateSale = (saleId: string, origin?: string) => {
    const priceNum = parseFloat(editPrice);
    if (editCard.trim() && !isNaN(priceNum)) {
      updateSale(saleId, { 
        cardName: editCard.trim(), 
        price: priceNum
      }, origin);
      cancelEditing();
    }
  };

  const handleAddSale = () => {
    const priceNum = parseFloat(newSalePrice);
    if (entrySellerId && newSaleCard.trim() && !isNaN(priceNum)) {
      addSale(selectedDate, entrySellerId, newSaleCard.trim(), priceNum);
      setNewSaleCard("");
      setNewSalePrice("");
      toast({ title: "Success", description: "Transaction logged in shared vault." });
    }
  };

  if (!isLoaded || isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium animate-pulse">Synchronizing NC Shared Vault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-8 max-w-7xl mx-auto transition-all duration-500 animate-in fade-in">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex flex-col">
          <h1 className="text-3xl font-black tracking-tighter text-primary flex items-center gap-2">
            <CreditCard className="w-8 h-8" />
            NC: <span className="text-foreground">Sales Tracker</span>
          </h1>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 ml-1">Professional Transaction Oversight</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl gap-2 shadow-sm border-primary/20 bg-card hover:bg-primary/5 transition-all h-11 px-6">
                {profileId === 'manager' ? <ShieldCheck className="w-4 h-4 text-primary" /> : <UserCircle className="w-4 h-4 text-muted-foreground" />}
                <span className="font-bold">Profile: {profileId.charAt(0).toUpperCase() + profileId.slice(1)}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl p-2 shadow-2xl border-primary/10">
              <DropdownMenuLabel className="px-3 py-2 text-xs font-black uppercase tracking-widest text-muted-foreground">Select Vault Profile</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleProfileSwitch('manager')} className="gap-3 cursor-pointer py-3 rounded-lg focus:bg-primary/5 transition-colors">
                <ShieldCheck className="w-5 h-5 text-primary" /> 
                <div className="flex flex-col">
                  <span className="font-bold">Manager Vault</span>
                  <span className="text-[10px] text-muted-foreground font-medium">Full oversight & management</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleProfileSwitch('staff')} className="gap-3 cursor-pointer py-3 rounded-lg focus:bg-muted/50 transition-colors">
                <UserCircle className="w-5 h-5 text-muted-foreground" /> 
                <div className="flex flex-col">
                  <span className="font-bold text-muted-foreground">Staff Vault</span>
                  <span className="text-[10px] text-muted-foreground font-medium">Daily logging access</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-3 bg-card border rounded-xl px-4 h-11 shadow-sm ring-1 ring-black/5">
            <CalendarIcon className="w-4 h-4 text-primary" />
            <input 
              type="date" 
              className="bg-transparent outline-none text-sm font-bold" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          
          <Button onClick={handleExportCSV} variant="secondary" className="rounded-xl h-11 gap-2 shadow-sm font-bold bg-white hover:bg-muted transition-all border border-black/5">
            <Download className="w-4 h-4" /> Export
          </Button>
        </div>
      </header>

      <div className={`grid grid-cols-1 ${profileId === 'manager' ? 'md:grid-cols-4' : 'md:grid-cols-2'} gap-4 animate-in slide-in-from-bottom-4 duration-700`}>
        <Card className="border-none shadow-lg bg-card rounded-2xl overflow-hidden group hover:ring-2 ring-primary/20 transition-all">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-primary" /> Daily Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-black text-primary">£{dailyStats.totalSales.toFixed(2)}</div>
            <p className="text-[10px] font-bold text-muted-foreground/50 mt-1">Aggregated across {dailyStats.totalCards} cards</p>
          </CardContent>
        </Card>
        {profileId === 'manager' && (
          <Card className="border-none shadow-lg bg-emerald-50 rounded-2xl ring-1 ring-emerald-500/10 group hover:ring-emerald-500/30 transition-all">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-emerald-700/70 flex items-center gap-2">
                <Coins className="w-3.5 h-3.5" /> Comm. Earned
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-3xl font-black text-emerald-700">£{dailyStats.totalCommission.toFixed(2)}</div>
              <p className="text-[10px] font-bold text-emerald-600/50 mt-1">Manager's daily cut</p>
            </CardContent>
          </Card>
        )}
        <Card className="border-none shadow-lg bg-card rounded-2xl group hover:ring-2 ring-primary/20 transition-all">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-primary" /> Daily Volume
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-black">{dailyStats.totalCards} <span className="text-lg text-muted-foreground font-bold">Log entries</span></div>
          </CardContent>
        </Card>
        {profileId === 'manager' && (
          <Card className="border-none shadow-lg bg-card rounded-2xl group hover:ring-2 ring-primary/20 transition-all">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-primary" /> Top Performer
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl font-black truncate text-primary">{dailyStats.topSellerName}</div>
              <p className="text-[10px] font-bold text-muted-foreground/50 mt-1">Highest individual revenue</p>
            </CardContent>
          </Card>
        )}
      </div>

      {profileId === 'manager' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-1000">
          <Card className="lg:col-span-2 shadow-2xl border-none rounded-3xl overflow-hidden ring-1 ring-black/5 bg-card">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/10">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" /> Daily Revenue Distribution
                </CardTitle>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Performance by Seller Entity</p>
              </div>
              <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest bg-primary/5 text-primary">Manager View</Badge>
            </CardHeader>
            <CardContent className="pt-8 h-[300px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} tickFormatter={(val) => `£${val}`} />
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.4)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40 italic font-medium">
                  No sales data available for {selectedDate}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="shadow-2xl border-none rounded-3xl overflow-hidden ring-1 ring-black/5 bg-primary/5">
            <CardHeader className="border-b bg-primary/10">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> AI Insights Agent
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {aiSummary ? (
                <div className="space-y-4 animate-in slide-in-from-top-2">
                  <p className="text-sm font-medium leading-relaxed text-foreground/80 bg-white/50 p-6 rounded-2xl ring-1 ring-primary/10 italic">
                    "{aiSummary}"
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setAiSummary(null)} className="w-full rounded-xl font-bold uppercase tracking-widest text-[10px]">Clear Insights</Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
                  <div className="bg-primary/10 p-4 rounded-3xl">
                    <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm uppercase tracking-tight">Generate Daily Brief</h4>
                    <p className="text-[10px] text-muted-foreground font-medium px-4">Our AI agent will analyze today's logs and identify emerging trends & top sellers.</p>
                  </div>
                  <Button 
                    onClick={handleGenerateSummary} 
                    disabled={isGeneratingSummary || allDailySales.length === 0}
                    className="rounded-xl px-8 h-12 shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-[10px]"
                  >
                    {isGeneratingSummary ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    Generate Insights
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="shadow-2xl border-none overflow-hidden rounded-2xl ring-1 ring-black/5 animate-in slide-in-from-bottom-8 duration-1000">
        {profileId === 'staff' ? (
          <>
            <CardHeader className="border-b bg-muted/20 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-xl">
                    <History className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black">Daily Sales Ledger (Staff Entry)</CardTitle>
                    <p className="text-xs text-muted-foreground font-medium">Record and track transactions in real-time</p>
                  </div>
                </div>
                <Badge variant="secondary" className="px-4 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-black text-sm">
                  {selectedDate}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-muted/40 p-8 rounded-3xl items-end ring-1 ring-black/5 shadow-inner">
                <div className="md:col-span-3 space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 flex items-center gap-2">
                    <UserCircle className="w-3 h-3" /> Seller Entity
                  </label>
                  <Select value={entrySellerId} onValueChange={setEntrySellerId}>
                    <SelectTrigger className="bg-card shadow-lg border-none focus-visible:ring-primary/30 h-12 rounded-xl px-4 font-bold text-sm">
                      <SelectValue placeholder="Select active seller" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-primary/10 shadow-2xl">
                      {sellers.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="font-bold py-3">
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-5 space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 flex items-center gap-2">
                    <CreditCard className="w-3 h-3" /> Collectible Card Name
                  </label>
                  <Input 
                    placeholder="e.g., Rare Holographic Charizard" 
                    className="bg-card shadow-lg border-none focus-visible:ring-primary/30 h-12 rounded-xl px-4 font-bold"
                    value={newSaleCard}
                    onChange={(e) => setNewSaleCard(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2 space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 flex items-center gap-2">
                    <Coins className="w-3 h-3" /> Settlement Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-muted-foreground text-sm">£</span>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00" 
                      className="bg-card shadow-lg border-none focus-visible:ring-primary/30 h-12 rounded-xl pl-8 pr-4 font-black"
                      value={newSalePrice}
                      onChange={(e) => setNewSalePrice(e.target.value)}
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <Button 
                    className="w-full shadow-xl shadow-primary/20 h-12 rounded-xl font-black uppercase tracking-widest text-xs" 
                    onClick={handleAddSale}
                    disabled={!entrySellerId || !newSaleCard.trim() || !newSalePrice}
                  >
                    <Plus className="w-4 h-4 mr-2 stroke-[3px]" /> Log Sale
                  </Button>
                </div>
              </div>

              <div className="border rounded-2xl overflow-hidden bg-card shadow-sm ring-1 ring-black/5">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="border-none hover:bg-transparent">
                      <TableHead className="font-black uppercase tracking-widest text-[10px] h-14 pl-6">Active Seller</TableHead>
                      <TableHead className="font-black uppercase tracking-widest text-[10px] h-14">Card Detail</TableHead>
                      <TableHead className="text-right font-black uppercase tracking-widest text-[10px] h-14 pr-6">Sale Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allDailySales.length > 0 ? (
                      allDailySales.map((sale) => {
                        const seller = sellers.find(s => s.id === sale.sellerId);
                        return (
                          <TableRow key={sale.id} className="hover:bg-primary/[0.02] border-muted/30 group transition-all duration-300">
                            <TableCell className="pl-6 h-16">
                              <Badge variant="secondary" className="bg-muted/50 text-foreground font-black text-[10px] uppercase tracking-tighter px-3">
                                {seller?.name || sale.sellerId}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-bold text-foreground/90">{sale.cardName}</span>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <span className="font-black text-primary text-base">£{sale.price.toFixed(2)}</span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="h-48 text-center text-muted-foreground/60 italic font-medium">
                          The vault is currently empty for {selectedDate}.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end pt-4">
                <div className="bg-primary shadow-2xl shadow-primary/30 px-10 py-6 rounded-3xl border border-white/10 text-white flex items-center justify-center transform hover:scale-[1.02] transition-transform">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Aggregate Ledger Total</span>
                    <span className="text-4xl font-black">£{dailyStats.totalSales.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <CardHeader className="pb-0 border-b bg-muted/20 px-8 pt-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4">
                <div className="flex flex-col">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-xl">
                      <ShieldCheck className="w-5 h-5 text-primary" />
                    </div>
                    <CardTitle className="text-xl font-black">Daily Ledger Oversight (Manager)</CardTitle>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium ml-11">Advanced transaction auditing & performance tracking</p>
                </div>
                <div className="flex items-center gap-3">
                   <Badge variant="secondary" className="px-4 py-1.5 rounded-lg bg-primary/10 text-primary font-black text-sm">
                    {selectedDate}
                  </Badge>
                </div>
              </div>
              <ScrollArea className="max-w-full">
                <TabsList className="bg-muted/50 p-1 mb-2 h-14 rounded-xl">
                  <TabsTrigger value="all" className="px-8 h-12 data-[state=active]:bg-card data-[state=active]:shadow-lg rounded-lg transition-all font-black uppercase tracking-widest text-[10px] gap-2">
                    <Users className="w-4 h-4" /> Global View
                  </TabsTrigger>
                  {sellers.map((s) => (
                    <TabsTrigger key={s.id} value={s.id} className="px-8 h-12 data-[state=active]:bg-card data-[state=active]:shadow-lg rounded-lg transition-all font-black uppercase tracking-widest text-[10px]">
                      {s.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </ScrollArea>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <TabsContent value="all" className="space-y-6 mt-0 focus-visible:outline-none">
                <div className="border rounded-2xl overflow-hidden bg-card shadow-sm ring-1 ring-black/5">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="border-none hover:bg-transparent">
                        <TableHead className="font-black uppercase tracking-widest text-[10px] h-14 pl-6">Seller</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[10px] h-14">Card Detail</TableHead>
                        <TableHead className="text-right font-black uppercase tracking-widest text-[10px] h-14">Sale Price</TableHead>
                        {isManagerAuthenticated && <TableHead className="text-right font-black uppercase tracking-widest text-[10px] h-14">Commission</TableHead>}
                        <TableHead className="w-[120px] pr-6"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allDailySales.length > 0 ? (
                        allDailySales.map((sale) => {
                          const seller = sellers.find(s => s.id === sale.sellerId);
                          const isEditing = editingSaleId === sale.id;
                          return (
                            <TableRow key={sale.id} className="hover:bg-primary/[0.02] border-muted/30 group transition-all duration-300">
                              <TableCell className="pl-6 h-16">
                                <Badge variant="secondary" className="bg-muted/50 text-foreground font-black text-[10px] uppercase tracking-tighter px-3">
                                  {seller?.name || sale.sellerId}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input 
                                    className="h-9 font-bold bg-muted/50 border-none rounded-lg" 
                                    value={editCard} 
                                    onChange={(e) => setEditCard(e.target.value)}
                                  />
                                ) : (
                                  <span className="font-bold text-foreground/90">{sale.cardName}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {isEditing ? (
                                  <div className="flex justify-end">
                                    <Input 
                                      className="h-9 w-28 text-right font-black bg-muted/50 border-none rounded-lg" 
                                      type="number" 
                                      step="0.01" 
                                      value={editPrice} 
                                      onChange={(e) => setEditPrice(e.target.value)} 
                                    />
                                  </div>
                                ) : (
                                  <span className="font-black text-primary">£{sale.price.toFixed(2)}</span>
                                )}
                              </TableCell>
                              {isManagerAuthenticated && (
                                <TableCell className="text-right">
                                  <span className="font-black text-emerald-600">£{(sale.commission || 0).toFixed(2)}</span>
                                </TableCell>
                              )}
                              <TableCell className="pr-6">
                                <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                  {isEditing ? (
                                    <>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 rounded-lg" onClick={() => handleUpdateSale(sale.id!, sale.profileOrigin)}>
                                        <Check className="w-4 h-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted rounded-lg" onClick={cancelEditing}>
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg" onClick={() => startEditing(sale)}>
                                        <Pencil className="w-4 h-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg" onClick={() => deleteSale(sale.id!, sale.profileOrigin)}>
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={isManagerAuthenticated ? 5 : 4} className="h-48 text-center text-muted-foreground/60 italic font-medium">
                            No logs found for any seller on {selectedDate}.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-col md:flex-row justify-end pt-6 gap-6">
                  {isManagerAuthenticated && (
                    <div className="flex flex-col gap-3 bg-emerald-50 border border-emerald-100 px-8 py-6 rounded-3xl shadow-sm">
                      <div className="flex justify-between items-center gap-12">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700/70 flex items-center gap-2">
                           <Activity className="w-3 h-3" /> Total Shared Commissions
                        </span>
                        <span className="text-2xl font-black text-emerald-700">£{dailyStats.totalCommission.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center gap-12 border-t border-emerald-200 pt-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700/70 flex items-center gap-2">
                           <CreditCard className="w-3 h-3" /> Net Seller Disbursement
                        </span>
                        <span className="text-2xl font-black text-emerald-900">£{(dailyStats.totalSales - dailyStats.totalCommission).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                  <div className="bg-primary shadow-2xl shadow-primary/30 px-10 py-6 rounded-3xl border border-white/10 text-white flex items-center justify-center transform hover:scale-[1.02] transition-transform">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Aggregate Daily Gross</span>
                      <span className="text-4xl font-black">£{dailyStats.totalSales.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {sellers.map((s) => {
                const sellerDailySales = dailySalesData[s.id] || [];
                const sellerDailyTotal = sellerDailySales.reduce((acc, curr) => acc + curr.price, 0);
                const sellerDailyComm = sellerDailySales.reduce((acc, curr) => acc + (curr.commission || 0), 0);
                const sellerPayout = sellerDailyTotal - sellerDailyComm;

                return (
                  <TabsContent key={s.id} value={s.id} className="space-y-6 mt-0 focus-visible:outline-none">
                    <div id={`report-content-${s.id}`} className="space-y-6 p-4 rounded-3xl bg-white border border-transparent">
                      <div className="border rounded-2xl overflow-hidden bg-card shadow-sm ring-1 ring-black/5">
                        <Table>
                          <TableHeader className="bg-muted/30">
                            <TableRow className="border-none hover:bg-transparent">
                              <TableHead className="font-black uppercase tracking-widest text-[10px] h-14 pl-6">Timestamp</TableHead>
                              <TableHead className="font-black uppercase tracking-widest text-[10px] h-14">Card Detail</TableHead>
                              <TableHead className="text-right font-black uppercase tracking-widest text-[10px] h-14">Sale Price</TableHead>
                              {isManagerAuthenticated && <TableHead className="text-right font-black uppercase tracking-widest text-[10px] h-14">Commission</TableHead>}
                              <TableHead className="w-[120px] pr-6"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sellerDailySales.length > 0 ? (
                              sellerDailySales.map((sale) => {
                                const isEditing = editingSaleId === sale.id;
                                return (
                                  <TableRow key={sale.id} className="hover:bg-primary/[0.02] border-muted/30 group transition-all duration-300">
                                    <TableCell className="text-[10px] text-muted-foreground font-black pl-6 uppercase tracking-tighter">
                                      {selectedDate}
                                      {sale.profileOrigin === 'staff' && isManagerAuthenticated && (
                                        <Badge variant="outline" className="ml-2 text-[8px] h-4 uppercase bg-primary/5 text-primary border-primary/20">Staff Origin</Badge>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {isEditing ? (
                                        <Input 
                                          className="h-9 font-bold bg-muted/50 border-none rounded-lg" 
                                          value={editCard} 
                                          onChange={(e) => setEditCard(e.target.value)}
                                        />
                                      ) : (
                                        <span className="font-bold text-foreground/90">{sale.cardName}</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {isEditing ? (
                                        <div className="flex justify-end">
                                          <Input 
                                            className="h-9 w-28 text-right font-black bg-muted/50 border-none rounded-lg" 
                                            type="number" 
                                            step="0.01" 
                                            value={editPrice} 
                                            onChange={(e) => setEditPrice(e.target.value)} 
                                          />
                                        </div>
                                      ) : (
                                        <span className="font-black text-primary">£{sale.price.toFixed(2)}</span>
                                      )}
                                    </TableCell>
                                    {isManagerAuthenticated && (
                                      <TableCell className="text-right">
                                        <span className="font-black text-emerald-600">£{(sale.commission || 0).toFixed(2)}</span>
                                      </TableCell>
                                    )}
                                    <TableCell className="pr-6">
                                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                        {isEditing ? (
                                          <>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 rounded-lg" onClick={() => handleUpdateSale(sale.id!, sale.profileOrigin)}>
                                              <Check className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted rounded-lg" onClick={cancelEditing}>
                                              <X className="w-4 h-4" />
                                            </Button>
                                          </>
                                        ) : (
                                          <>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg" onClick={() => startEditing(sale)}>
                                              <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg" onClick={() => deleteSale(sale.id!, sale.profileOrigin)}>
                                              <Trash2 className="w-4 h-4" />
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            ) : (
                              <TableRow>
                                <TableCell colSpan={isManagerAuthenticated ? 5 : 4} className="h-32 text-center text-muted-foreground/60 italic">
                                  No logs found for this seller on {selectedDate}.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                      
                      <div className="flex flex-col md:flex-row justify-end gap-6">
                        {isManagerAuthenticated && (
                          <div className="flex flex-col gap-3 bg-emerald-50 border border-emerald-100 px-8 py-6 rounded-3xl shadow-sm">
                            <div className="flex justify-between items-center gap-12">
                              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700/70 flex items-center gap-2">
                                 <TrendingUp className="w-3 h-3" /> Total Earned Cut
                              </span>
                              <span className="text-2xl font-black text-emerald-700">£{sellerDailyComm.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center gap-12 border-t border-emerald-200 pt-3">
                              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700/70 flex items-center gap-2">
                                 <CreditCard className="w-3 h-3" /> Seller Payout Run-down
                              </span>
                              <span className="text-2xl font-black text-emerald-900">£{sellerPayout.toFixed(2)}</span>
                            </div>
                          </div>
                        )}
                        <div className="bg-primary shadow-2xl shadow-primary/30 px-10 py-6 rounded-3xl border border-white/10 text-white flex items-center justify-center">
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Seller Daily Gross</span>
                            <span className="text-4xl font-black">£{sellerDailyTotal.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center pt-4">
                      <Button 
                        onClick={() => handleSaveReportAsImage(s.id)}
                        disabled={isCapturing || sellerDailySales.length === 0}
                        variant="outline"
                        className="rounded-xl h-12 px-8 gap-3 font-black uppercase tracking-widest text-[10px] border-primary/20 hover:bg-primary/5 shadow-sm"
                      >
                        {isCapturing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                        Save Report as Photo
                      </Button>
                    </div>
                  </TabsContent>
                );
              })}
            </CardContent>
          </Tabs>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-1000 delay-300">
        <div className="space-y-6">
          <h3 className="text-xl font-black tracking-tight flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-xl"><Coins className="w-5 h-5 text-emerald-600" /></div>
            NC Shared Vault Analytics ({profileId})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-none shadow-xl bg-emerald-50/50 rounded-2xl ring-1 ring-emerald-500/10 hover:ring-emerald-500/30 transition-all">
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-emerald-700/70">Vault Value</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="text-2xl font-black text-emerald-700">£{allTimeStats.totalSales.toFixed(2)}</div>
              </CardContent>
            </Card>
            {isManagerAuthenticated ? (
               <Card className="border-none shadow-xl bg-emerald-100/50 rounded-2xl ring-1 ring-emerald-500/20 hover:ring-emerald-500/40 transition-all">
                <CardHeader className="p-5 pb-2">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-emerald-800/70">Global Comm.</CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <div className="text-2xl font-black text-emerald-800">£{allTimeStats.totalCommission.toFixed(2)}</div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-none shadow-xl bg-emerald-50/50 rounded-2xl ring-1 ring-emerald-500/10 hover:ring-emerald-500/30 transition-all">
                <CardHeader className="p-5 pb-2">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-emerald-700/70">Vault Count</CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <div className="text-2xl font-black text-emerald-700">{allTimeStats.totalCards} cards</div>
                </CardContent>
              </Card>
            )}
            <Card className="border-none shadow-xl bg-emerald-50/50 rounded-2xl ring-1 ring-emerald-500/10 hover:ring-emerald-500/30 transition-all">
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-emerald-700/70">Vault MVP</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="text-xl font-black text-emerald-700 truncate">{allTimeStats.topSeller}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-2xl border-none h-[400px] rounded-3xl ring-1 ring-black/5 overflow-hidden">
            <CardHeader className="pb-4 bg-muted/10 border-b">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" /> Live Vault Activity
                </div>
                <Badge variant="outline" className="text-[8px] h-5 px-2 font-black border-primary/20 text-primary animate-pulse">Live Sync Active</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[320px] p-6">
                {recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivity.map((act, i) => (
                      <div key={i} className="flex justify-between items-center text-sm bg-muted/20 p-4 rounded-2xl border border-black/5 hover:bg-white hover:shadow-md transition-all duration-300">
                        <div className="space-y-1.5">
                          <div className="font-black text-foreground/90">{act.card}</div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-tighter py-0 px-2 bg-muted/80">
                              {act.sellerName}
                            </Badge>
                            <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest">{act.date}</span>
                            {act.origin === 'staff' && isManagerAuthenticated && (
                              <Badge variant="outline" className="text-[8px] font-black text-primary/70 bg-primary/5 px-1 rounded-sm border-primary/20 uppercase tracking-tighter">Staff Log</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                           <div className="font-black text-primary text-base">£{act.price.toFixed(2)}</div>
                           {isManagerAuthenticated && act.commission > 0 && (
                             <div className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">+£{act.commission.toFixed(2)} comm</div>
                           )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 space-y-2 opacity-40">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest italic">The shared vault is empty.</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
           <Card className="shadow-2xl border-none rounded-3xl ring-1 ring-black/5 overflow-hidden">
            <CardHeader className="pb-4 bg-muted/10 border-b">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" /> Global Vault Search
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <Input 
                  placeholder="Identify specific transactions in vault history..." 
                  className="pl-12 h-14 bg-muted/30 border-none rounded-2xl focus-visible:ring-primary/30 font-bold"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {searchQuery && (
                <ScrollArea className="mt-6 h-[250px] border-none bg-muted/10 rounded-2xl shadow-inner p-4">
                  {searchResults.length > 0 ? (
                    <div className="space-y-3">
                      {searchResults.map((res, i) => (
                        <div key={i} className="text-sm space-y-3 bg-white p-5 rounded-2xl shadow-sm border border-black/5 transition-all hover:scale-[1.01] hover:shadow-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-primary font-black text-lg tracking-tight">{res.card}</span>
                            <div className="text-right">
                               <div className="text-primary font-black text-base">£{res.price.toFixed(2)}</div>
                               {isManagerAuthenticated && res.commission > 0 && <div className="text-[9px] font-black text-emerald-600 uppercase">£{res.commission.toFixed(2)} Comm</div>}
                            </div>
                          </div>
                          <div className="text-[9px] font-black text-muted-foreground flex justify-between uppercase tracking-widest border-t pt-2 opacity-70">
                            <span>Sold by {res.sellerName} {res.origin === 'staff' && '(Staff Entry)'}</span>
                            <span>{res.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-20 text-center text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest italic">
                      No matching records for "{searchQuery}"
                    </div>
                  )}
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-2xl border-none rounded-3xl ring-1 ring-black/5 overflow-hidden">
            <CardHeader className="pb-4 bg-muted/10 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Active Entity Roster
                </CardTitle>
                {isManagerAuthenticated ? (
                  <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest gap-2 border-primary/20 bg-primary/5 text-primary py-1 px-3">
                    <Settings2 className="w-3 h-3" /> Management Mode
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest gap-2 border-muted/20 bg-muted/5 text-muted-foreground py-1 px-3">
                    <Lock className="w-3 h-3" /> Encrypted View
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {isManagerAuthenticated && (
                <div className="space-y-4 animate-in slide-in-from-top-2">
                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                      placeholder="Entity legal name..." 
                      className="h-12 bg-muted/30 border-none rounded-xl focus-visible:ring-primary/30 font-bold"
                      value={newSellerName}
                      onChange={(e) => setNewSellerName(e.target.value)}
                    />
                    <div className="relative">
                       <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-muted-foreground text-sm">%</span>
                       <Input 
                        type="number"
                        step="0.01"
                        placeholder="Commission %..." 
                        className="h-12 bg-muted/30 border-none rounded-xl focus-visible:ring-primary/30 font-black pr-10"
                        value={newSellerCommission}
                        onChange={(e) => setNewSellerCommission(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button 
                    className="w-full h-12 rounded-xl shadow-lg shadow-primary/20 font-black uppercase tracking-widest text-xs"
                    onClick={() => {
                      if (newSellerName) {
                        addSeller(newSellerName, parseFloat(newSellerCommission) || 0);
                        setNewSellerName("");
                        setNewSellerCommission("");
                        toast({ title: "Success", description: "New entity added to shared roster." });
                      }
                    }}
                  >
                    <Plus className="w-5 h-5 mr-2 stroke-[3px]" /> Provision Entity
                  </Button>
                </div>
              )}
              
              <div className="flex flex-wrap gap-3">
                {sellers.length > 0 ? (
                  sellers.map((s) => (
                    <Badge 
                      key={s.id} 
                      variant="secondary" 
                      className={`pl-5 ${isManagerAuthenticated ? 'pr-2' : 'pr-5'} py-3 flex items-center gap-3 group cursor-default rounded-2xl bg-white border border-black/5 shadow-sm hover:shadow-md transition-all duration-300 ring-1 ring-black/5`}
                    >
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-black text-sm tracking-tight">{s.name}</span>
                        {isManagerAuthenticated && (
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">{(s.defaultCommission || 0)}% Commission</span>
                        )}
                      </div>
                      {isManagerAuthenticated && (
                        <button 
                          onClick={() => {
                            removeSeller(s.id);
                            toast({ title: "Removed", description: "Entity de-provisioned from roster." });
                          }}
                          className="p-1.5 hover:bg-destructive hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </Badge>
                  ))
                ) : (
                  <div className="w-full text-center py-8">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 italic">Roster initialization required</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator className="bg-black/5 h-[1px]" />

      <footer className="py-8 text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">&copy; {new Date().getFullYear()} NC: Sales Tracker &bull; Enterprise Shared Vault v2.5</p>
      </footer>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl p-8 border-none shadow-2xl">
          <DialogHeader className="items-center text-center">
            <div className="bg-primary/10 p-4 rounded-3xl mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight">Vault Authentication</DialogTitle>
            <DialogDescription className="font-medium text-muted-foreground">
              Please enter the master credential to unlock the Manager Vault. Access is restricted.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <Input
              type="password"
              placeholder="Enter encryption key..."
              className="h-14 bg-muted/30 border-none rounded-2xl focus-visible:ring-primary/30 text-center font-black tracking-widest text-xl"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              autoFocus
            />
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-3">
            <Button onClick={handlePasswordSubmit} className="w-full h-14 rounded-2xl shadow-xl shadow-primary/30 font-black uppercase tracking-widest text-xs">Unlock Manager Vault</Button>
            <Button variant="ghost" onClick={() => setIsPasswordDialogOpen(false)} className="w-full rounded-2xl font-black text-muted-foreground/60 uppercase tracking-widest text-[10px]">Decline Access</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
