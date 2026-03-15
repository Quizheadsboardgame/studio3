"use client";

import React, { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { 
  Plus, 
  Search, 
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
  LogOut,
  User,
  KeyRound,
  Eye,
  EyeOff
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
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";

import { useSales, Sale } from "@/hooks/use-sales";
import { 
  useAuth, 
  useUser, 
  initiateAnonymousSignIn
} from "@/firebase";
import { useToast } from "@/hooks/use-toast";

type ProfileType = 'manager' | 'staff' | 'seller';

const MANAGER_PASSWORD = "Harley";
const AUTH_EXPIRY_KEY = "newt_manager_auth_expiry";

const chartConfig = {
  total: {
    label: "Total Sales",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export default function Dashboard() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const { toast } = useToast();
  
  const [profileId, setProfileId] = useState<ProfileType>('staff');
  
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [isManagerAuthenticated, setIsManagerAuthenticated] = useState(false);

  // For the 'seller' profile security
  const [selectedSellerId, setSelectedSellerId] = useState<string>("");
  const [isSellerPasswordDialogOpen, setIsSellerPasswordDialogOpen] = useState(false);
  const [sellerPasswordInput, setSellerPasswordInput] = useState("");
  const [authenticatedSellerId, setAuthenticatedSellerId] = useState<string | null>(null);
  const [showSellerPasswords, setShowSellerPasswords] = useState(false);

  const { sellers, sales, isLoaded, addSeller, removeSeller, addSale, deleteSale, updateSale } = useSales(profileId === 'seller' ? 'staff' : profileId);
  
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

  useEffect(() => {
    setSelectedDate(format(new Date(), "yyyy-MM-dd"));
    
    // Restore manager session on mount
    const expiry = localStorage.getItem(AUTH_EXPIRY_KEY);
    if (expiry && parseInt(expiry) > new Date().getTime()) {
      setIsManagerAuthenticated(true);
      if (profileId === 'staff') setProfileId('manager');
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

  const dailySalesData = useMemo(() => sales[selectedDate] || {}, [sales, selectedDate]);

  const allDailySales = useMemo(() => {
    return Object.values(dailySalesData).flat().sort((a, b) => (a.id || '').localeCompare(b.id || ''));
  }, [dailySalesData]);

  // Specific data for the individual seller view
  const sellerDailySales = useMemo(() => {
    if (profileId !== 'seller' || !authenticatedSellerId) return [];
    return dailySalesData[authenticatedSellerId] || [];
  }, [profileId, authenticatedSellerId, dailySalesData]);

  const sellerStats = useMemo(() => {
    const total = sellerDailySales.reduce((acc, s) => acc + s.price, 0);
    const comm = sellerDailySales.reduce((acc, s) => acc + (s.commission || 0), 0);
    return {
      total,
      commission: comm,
      payout: total - comm,
      count: sellerDailySales.length
    };
  }, [sellerDailySales]);

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

  const handleProfileSwitch = (newProfile: ProfileType) => {
    if (newProfile === 'manager' && !isManagerAuthenticated) {
      setIsPasswordDialogOpen(true);
      return;
    }
    setProfileId(newProfile);
    if (newProfile !== 'seller') {
      setAuthenticatedSellerId(null);
      setSelectedSellerId("");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_EXPIRY_KEY);
    setIsManagerAuthenticated(false);
    setProfileId('staff');
    toast({ title: "Session Ended", description: "You have exited the Manager Vault." });
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

  const handleSellerSelect = (sellerId: string) => {
    setSelectedSellerId(sellerId);
    setAuthenticatedSellerId(null);
    setSellerPasswordInput("");
    setIsSellerPasswordDialogOpen(true);
  };

  const handleSellerPasswordSubmit = () => {
    const seller = sellers.find(s => s.id === selectedSellerId);
    if (seller && seller.password === sellerPasswordInput) {
      setAuthenticatedSellerId(selectedSellerId);
      setIsSellerPasswordDialogOpen(false);
      toast({ title: "Vault Unlocked", description: `Welcome back, ${seller.name}.` });
    } else {
      toast({ variant: "destructive", title: "Access Denied", description: "Incorrect access key." });
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
                {profileId === 'manager' ? <ShieldCheck className="w-4 h-4 text-primary" /> : profileId === 'seller' ? <User className="w-4 h-4 text-accent" /> : <UserCircle className="w-4 h-4 text-muted-foreground" />}
                <span className="font-bold">Vault: {profileId.charAt(0).toUpperCase() + profileId.slice(1)}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl p-2 shadow-2xl border-primary/10">
              <DropdownMenuLabel className="px-3 py-2 text-xs font-black uppercase tracking-widest text-muted-foreground">Select Profile</DropdownMenuLabel>
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
              <DropdownMenuItem onClick={() => handleProfileSwitch('seller')} className="gap-3 cursor-pointer py-3 rounded-lg focus:bg-accent/10 transition-colors">
                <User className="w-5 h-5 text-accent" /> 
                <div className="flex flex-col">
                  <span className="font-bold">Seller Portal</span>
                  <span className="text-[10px] text-muted-foreground font-medium">Individual sales review</span>
                </div>
              </DropdownMenuItem>
              {isManagerAuthenticated && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="gap-3 cursor-pointer py-3 rounded-lg focus:bg-destructive/10 text-destructive transition-colors">
                    <LogOut className="w-5 h-5" /> 
                    <span className="font-bold">Exit Manager Vault</span>
                  </DropdownMenuItem>
                </>
              )}
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
        </div>
      </header>

      {profileId === 'manager' && (
        <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-bottom-4 duration-700`}>
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
        </div>
      )}

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
                <ChartContainer config={chartConfig}>
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
                </ChartContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40 italic font-medium">
                  No sales data available for {selectedDate}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="shadow-2xl border-none rounded-3xl overflow-hidden ring-1 ring-black/5 bg-card">
            <CardHeader className="border-b bg-muted/10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Seller Credentials
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10"
                  onClick={() => setShowSellerPasswords(!showSellerPasswords)}
                >
                  {showSellerPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <Input 
                    placeholder="Entity Name..." 
                    className="h-10 bg-muted/30 border-none rounded-xl font-bold text-xs"
                    value={newSellerName}
                    onChange={(e) => setNewSellerName(e.target.value)}
                  />
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-muted-foreground text-[10px]">%</span>
                    <Input 
                      type="number"
                      placeholder="Comm %" 
                      className="h-10 bg-muted/30 border-none rounded-xl font-black pr-8 text-xs"
                      value={newSellerCommission}
                      onChange={(e) => setNewSellerCommission(e.target.value)}
                    />
                  </div>
                </div>
                <Button 
                  className="w-full h-10 rounded-xl shadow-lg shadow-primary/10 font-black uppercase tracking-widest text-[10px]"
                  onClick={() => {
                    if (newSellerName) {
                      addSeller(newSellerName, parseFloat(newSellerCommission) || 0);
                      setNewSellerName("");
                      setNewSellerCommission("");
                      toast({ title: "Success", description: "Entity provisioned." });
                    }
                  }}
                >
                  <Plus className="w-3 h-3 mr-1" /> Provision Entity
                </Button>
              </div>

              <Separator />

              <ScrollArea className="h-[120px] pr-2">
                <div className="flex flex-col gap-2">
                  {sellers.map((s) => (
                    <div 
                      key={s.id} 
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-black/5"
                    >
                      <div className="flex flex-col">
                        <span className="font-black text-xs">{s.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase">{s.defaultCommission}% Comm.</span>
                          {showSellerPasswords && (
                            <Badge variant="outline" className="text-[8px] h-4 font-black bg-primary/5 border-primary/20 text-primary px-1">
                              KEY: {s.password}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-destructive hover:bg-destructive/10 rounded-lg"
                        onClick={() => removeSeller(s.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                  {sellers.length === 0 && (
                    <p className="text-[10px] text-center italic text-muted-foreground py-4">No entities provisioned</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {profileId === 'seller' && authenticatedSellerId && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-700">
           <Card className="border-none shadow-lg bg-card rounded-2xl overflow-hidden group hover:ring-2 ring-primary/20 transition-all">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-primary" /> Your Gross Sales
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-3xl font-black text-primary">£{sellerStats.total.toFixed(2)}</div>
              <p className="text-[10px] font-bold text-muted-foreground/50 mt-1">Across {sellerStats.count} items sold</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg bg-emerald-50 rounded-2xl ring-1 ring-emerald-500/10 group hover:ring-emerald-500/30 transition-all">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-emerald-700/70 flex items-center gap-2">
                <Coins className="w-3.5 h-3.5" /> Your Payout
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-3xl font-black text-emerald-700">£{sellerStats.payout.toFixed(2)}</div>
              <p className="text-[10px] font-bold text-emerald-600/50 mt-1">Estimated earnings for {selectedDate}</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg bg-card rounded-2xl group hover:ring-2 ring-primary/20 transition-all">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-primary" /> Commission Cut
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-3xl font-black text-muted-foreground">£{sellerStats.commission.toFixed(2)}</div>
              <p className="text-[10px] font-bold text-muted-foreground/50 mt-1">Management fee contribution</p>
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
            </CardContent>
          </>
        ) : profileId === 'seller' ? (
          <>
            <CardHeader className="border-b bg-muted/20 px-8 py-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <div className="bg-accent/10 p-2 rounded-xl">
                    <User className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black">Personal Sales Review</CardTitle>
                    <p className="text-xs text-muted-foreground font-medium">Tracking your individual performance & payouts</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="w-48">
                      <Select value={selectedSellerId} onValueChange={handleSellerSelect}>
                        <SelectTrigger className="bg-card shadow-sm border-accent/20 h-10 rounded-xl px-4 font-bold text-xs">
                          <SelectValue placeholder="Identify yourself..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {sellers.map((s) => (
                            <SelectItem key={s.id} value={s.id} className="font-bold text-xs">
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                   </div>
                   <Badge variant="secondary" className="px-4 py-1.5 rounded-lg bg-accent/10 text-accent font-black text-sm">
                    {selectedDate}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              {authenticatedSellerId ? (
                <>
                  <div className="border rounded-2xl overflow-hidden bg-card shadow-sm ring-1 ring-black/5">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow className="border-none hover:bg-transparent">
                          <TableHead className="font-black uppercase tracking-widest text-[10px] h-14 pl-6">Card Detail</TableHead>
                          <TableHead className="text-right font-black uppercase tracking-widest text-[10px] h-14">Gross Sale</TableHead>
                          <TableHead className="text-right font-black uppercase tracking-widest text-[10px] h-14">Comm. Cut</TableHead>
                          <TableHead className="text-right font-black uppercase tracking-widest text-[10px] h-14 pr-6">Your Payout</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sellerDailySales.length > 0 ? (
                          sellerDailySales.map((sale) => (
                            <TableRow key={sale.id} className="hover:bg-accent/[0.02] border-muted/30 group transition-all duration-300">
                              <TableCell className="pl-6 h-16 font-bold text-foreground/90">{sale.cardName}</TableCell>
                              <TableCell className="text-right font-black text-primary">£{sale.price.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-black text-muted-foreground/60">£{(sale.commission || 0).toFixed(2)}</TableCell>
                              <TableCell className="text-right pr-6 font-black text-emerald-600">£{(sale.price - (sale.commission || 0)).toFixed(2)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="h-48 text-center text-muted-foreground/60 italic font-medium">
                              No personal records found for this date.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex justify-end pt-4">
                     <div className="bg-accent shadow-2xl shadow-accent/30 px-10 py-6 rounded-3xl border border-white/10 text-white flex items-center justify-center">
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Net Daily Payout</span>
                          <span className="text-4xl font-black">£{sellerStats.payout.toFixed(2)}</span>
                        </div>
                      </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
                  <div className="bg-accent/10 p-6 rounded-full">
                    <Lock className="w-12 h-12 text-accent animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">Identity Verification Required</h3>
                    <p className="text-sm text-muted-foreground font-medium max-w-sm mx-auto">Please select your identity from the dropdown and provide your unique access key to view your sales performance.</p>
                  </div>
                </div>
              )}
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
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 rounded-lg" onClick={() => {
                                        const priceNum = parseFloat(editPrice);
                                        if (editCard.trim() && !isNaN(priceNum)) {
                                          updateSale(sale.id!, { 
                                            cardName: editCard.trim(), 
                                            price: priceNum
                                          }, sale.profileOrigin);
                                          setEditingSaleId(null);
                                        }
                                      }}>
                                        <Check className="w-4 h-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted rounded-lg" onClick={() => setEditingSaleId(null)}>
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg" onClick={() => {
                                        setEditingSaleId(sale.id!);
                                        setEditCard(sale.cardName);
                                        setEditPrice(sale.price.toString());
                                      }}>
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
              </TabsContent>

              {sellers.map((s) => {
                const sellerDailySales = dailySalesData[s.id] || [];
                const sellerDailyTotal = sellerDailySales.reduce((acc, curr) => acc + curr.price, 0);
                const sellerDailyComm = sellerDailySales.reduce((acc, curr) => acc + (curr.commission || 0), 0);
                const sellerPayout = sellerDailyTotal - sellerDailyComm;

                return (
                  <TabsContent key={s.id} value={s.id} className="space-y-6 mt-0 focus-visible:outline-none">
                    <div className="space-y-6 p-4 rounded-3xl bg-white border border-transparent">
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
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 rounded-lg" onClick={() => {
                                                const priceNum = parseFloat(editPrice);
                                                if (editCard.trim() && !isNaN(priceNum)) {
                                                  updateSale(sale.id!, { 
                                                    cardName: editCard.trim(), 
                                                    price: priceNum
                                                  }, sale.profileOrigin);
                                                  setEditingSaleId(null);
                                                }
                                            }}>
                                              <Check className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted rounded-lg" onClick={() => setEditingSaleId(null)}>
                                              <X className="w-4 h-4" />
                                            </Button>
                                          </>
                                        ) : (
                                          <>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg" onClick={() => {
                                                setEditingSaleId(sale.id!);
                                                setEditCard(sale.cardName);
                                                setEditPrice(sale.price.toString());
                                            }}>
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
            Live Vault Activity ({profileId})
          </h3>

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
                {(profileId === 'seller' ? sellerDailySales : allDailySales).length > 0 ? (
                  <div className="space-y-4">
                    {(profileId === 'seller' ? sellerDailySales : allDailySales).map((act, i) => (
                      <div key={i} className="flex justify-between items-center text-sm bg-muted/20 p-4 rounded-2xl border border-black/5 hover:bg-white hover:shadow-md transition-all duration-300">
                        <div className="space-y-1.5">
                          <div className="font-black text-foreground/90">{act.cardName}</div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-tighter py-0 px-2 bg-muted/80">
                              {sellers.find(s => s.id === act.sellerId)?.name || act.sellerId}
                            </Badge>
                            <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest">{act.saleDate}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                           <div className="font-black text-primary text-base">£{act.price.toFixed(2)}</div>
                           {profileId === 'seller' && (
                             <div className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">£{(act.price - (act.commission || 0)).toFixed(2)} payout</div>
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
                  {allDailySales.filter(s => s.cardName.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
                    <div className="space-y-3">
                      {allDailySales.filter(s => s.cardName.toLowerCase().includes(searchQuery.toLowerCase())).map((res, i) => (
                        <div key={i} className="text-sm space-y-3 bg-white p-5 rounded-2xl shadow-sm border border-black/5 transition-all hover:scale-[1.01] hover:shadow-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-primary font-black text-lg tracking-tight">{res.cardName}</span>
                            <div className="text-right">
                               <div className="text-primary font-black text-base">£{res.price.toFixed(2)}</div>
                            </div>
                          </div>
                          <div className="text-[9px] font-black text-muted-foreground flex justify-between uppercase tracking-widest border-t pt-2 opacity-70">
                            <span>Sold by {sellers.find(s => s.id === res.sellerId)?.name || res.sellerId}</span>
                            <span>{res.saleDate}</span>
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
        </div>
      </div>

      <footer className="py-8 text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">&copy; {new Date().getFullYear()} NC: Sales Tracker &bull; Enterprise Shared Vault v2.5</p>
      </footer>

      {/* Manager Authentication Dialog */}
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

      {/* Seller Authentication Dialog */}
      <Dialog open={isSellerPasswordDialogOpen} onOpenChange={setIsSellerPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl p-8 border-none shadow-2xl">
          <DialogHeader className="items-center text-center">
            <div className="bg-accent/10 p-4 rounded-3xl mb-4">
              <KeyRound className="w-8 h-8 text-accent" />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight">Identify Verification</DialogTitle>
            <DialogDescription className="font-medium text-muted-foreground">
              Enter your unique access key to unlock your personal revenue logs.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <Input
              type="password"
              placeholder="Enter access key..."
              className="h-14 bg-muted/30 border-none rounded-2xl focus-visible:ring-accent/30 text-center font-black tracking-widest text-xl uppercase"
              value={sellerPasswordInput}
              onChange={(e) => setSellerPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSellerPasswordSubmit()}
              autoFocus
            />
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-3">
            <Button onClick={handleSellerPasswordSubmit} className="w-full h-14 rounded-2xl shadow-xl shadow-accent/30 bg-accent hover:bg-accent/90 text-white font-black uppercase tracking-widest text-xs">Unlock Payout Data</Button>
            <Button variant="ghost" onClick={() => {
              setIsSellerPasswordDialogOpen(false);
              setSelectedSellerId("");
            }} className="w-full rounded-2xl font-black text-muted-foreground/60 uppercase tracking-widest text-[10px]">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
