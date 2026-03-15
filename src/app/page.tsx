"use client";

import React, { useState, useMemo, useEffect } from "react";
import { format, addDays, parseISO, nextFriday, isBefore, isAfter, addWeeks, startOfDay } from "date-fns";
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
  BarChart3,
  LogOut,
  User,
  KeyRound,
  Archive,
  RefreshCw,
  Clock,
  Wallet,
  ArrowRightLeft,
  Banknote,
  Send,
  FileText,
  Download,
  ChevronRight
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

import { useSales, Seller } from "@/hooks/use-sales";
import { 
  useAuth, 
  useUser, 
  initiateAnonymousSignIn
} from "@/firebase";
import { useToast } from "@/hooks/use-toast";

// PDF Generation
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ProfileType = 'manager' | 'staff' | 'seller';

const MANAGER_PASSWORD = "Harley";
const AUTH_EXPIRY_KEY = "newt_manager_auth_expiry";
const LEGAL_STATEMENT = "Newtons collectables is a trading names for journey together tcg Ltd company house number 16503957";

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

  const [selectedSellerId, setSelectedSellerId] = useState<string>("");
  const [isSellerPasswordDialogOpen, setIsSellerPasswordDialogOpen] = useState(false);
  const [sellerPasswordInput, setSellerPasswordInput] = useState("");
  const [authenticatedSellerId, setAuthenticatedSellerId] = useState<string | null>(null);

  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [editSellerName, setEditSellerName] = useState("");
  const [editSellerComm, setEditSellerComm] = useState("");
  const [editSellerPass, setEditSellerPass] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const { sellers, sales, combinedSalesData, isLoaded, addSeller, updateSeller, addSale, deleteSale, updateSale, markSalesAsPaid } = useSales(profileId === 'seller' ? 'staff' : profileId);
  
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

  const [isSettlementDialogOpen, setIsSettlementDialogOpen] = useState(false);
  const [settlementBatch, setSettlementBatch] = useState<{ sellerId: string, saleIds: string[], originMap: Record<string, string>, total: number } | null>(null);

  useEffect(() => {
    setSelectedDate(format(new Date(), "yyyy-MM-dd"));
    
    const expiry = localStorage.getItem(AUTH_EXPIRY_KEY);
    if (expiry && parseInt(expiry) > new Date().getTime()) {
      setIsManagerAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (!isUserLoading && !user && auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  const activeSellers = useMemo(() => sellers.filter(s => !s.archived), [sellers]);
  const archivedSellers = useMemo(() => sellers.filter(s => s.archived), [sellers]);

  useEffect(() => {
    if (activeSellers.length > 0 && !entrySellerId) {
      setEntrySellerId(activeSellers[0].id);
    }
  }, [activeSellers, entrySellerId]);

  const dailySalesData = useMemo(() => sales[selectedDate] || {}, [sales, selectedDate]);

  const allDailySales = useMemo(() => {
    return Object.values(dailySalesData).flat().sort((a, b) => (a.id || '').localeCompare(b.id || ''));
  }, [dailySalesData]);

  const sellerDailySales = useMemo(() => {
    if (profileId !== 'seller' || !authenticatedSellerId) return [];
    return dailySalesData[authenticatedSellerId] || [];
  }, [profileId, authenticatedSellerId, dailySalesData]);

  const sellerStats = useMemo(() => {
    const total = sellerDailySales.reduce((acc, s) => acc + s.price, 0);
    const comm = sellerDailySales.reduce((acc, s) => acc + (s.commission || 0), 0);
    const payoutDate = selectedDate ? format(addDays(parseISO(selectedDate), 13), "PPP") : "N/A";
    
    return {
      total,
      commission: comm,
      payout: total - comm,
      count: sellerDailySales.length,
      payoutDate
    };
  }, [sellerDailySales, selectedDate]);

  const chartData = useMemo(() => {
    return activeSellers.map(seller => {
      const sellerSales = dailySalesData[seller.id] || [];
      return {
        name: seller.name,
        total: sellerSales.reduce((acc, s) => acc + s.price, 0),
        commission: sellerSales.reduce((acc, s) => acc + (s.commission || 0), 0)
      };
    }).filter(d => d.total > 0).sort((a, b) => b.total - a.total);
  }, [activeSellers, dailySalesData]);

  const dailyStats = useMemo(() => {
    let totalSales = 0;
    let totalCommission = 0;
    let totalCards = 0;
    let maxSellerTotal = 0;
    let topSellerName = "-";

    activeSellers.forEach((seller) => {
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
  }, [activeSellers, dailySalesData]);

  const payoutForecast = useMemo(() => {
    if (profileId !== 'manager') return null;

    const today = startOfDay(new Date());
    const thisFridayDate = startOfDay(nextFriday(today));
    const nextFridayDate = startOfDay(addWeeks(thisFridayDate, 1));

    const forecast = {
      thisFriday: { date: thisFridayDate, total: 0, count: 0, sellers: {} as Record<string, { total: number, ids: string[], originMap: Record<string, string> }> },
      nextFriday: { date: nextFridayDate, total: 0, count: 0, sellers: {} as Record<string, { total: number, ids: string[], originMap: Record<string, string> }> },
      totalGlobalPending: 0
    };

    combinedSalesData.forEach(sale => {
      if (sale.payoutStatus === 'paid') return;

      const saleDateObj = parseISO(sale.saleDate);
      const maturityDate = startOfDay(addDays(saleDateObj, 13));
      const net = sale.price - (sale.commission || 0);
      
      const seller = sellers.find(s => s.id === sale.sellerId);
      const sellerName = seller?.name || sale.sellerId;

      forecast.totalGlobalPending += net;

      if (!isAfter(maturityDate, thisFridayDate)) {
        forecast.thisFriday.total += net;
        forecast.thisFriday.count += 1;
        if (!forecast.thisFriday.sellers[sellerName]) forecast.thisFriday.sellers[sellerName] = { total: 0, ids: [], originMap: {} };
        forecast.thisFriday.sellers[sellerName].total += net;
        forecast.thisFriday.sellers[sellerName].ids.push(sale.id!);
        forecast.thisFriday.sellers[sellerName].originMap[sale.id!] = sale.profileOrigin || 'staff';
      } else if (!isAfter(maturityDate, nextFridayDate)) {
        forecast.nextFriday.total += net;
        forecast.nextFriday.count += 1;
        if (!forecast.nextFriday.sellers[sellerName]) forecast.nextFriday.sellers[sellerName] = { total: 0, ids: [], originMap: {} };
        forecast.nextFriday.sellers[sellerName].total += net;
        forecast.nextFriday.sellers[sellerName].ids.push(sale.id!);
        forecast.nextFriday.sellers[sellerName].originMap[sale.id!] = sale.profileOrigin || 'staff';
      }
    });

    return forecast;
  }, [combinedSalesData, sellers, profileId]);

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
    if (isManagerAuthenticated) {
      // MANAGER OVERRIDE: Skip password if manager is logged in
      setAuthenticatedSellerId(sellerId);
      toast({ title: "Manager Override", description: `Accessing portal for ${sellers.find(s => s.id === sellerId)?.name}.` });
    } else {
      setAuthenticatedSellerId(null);
      setSellerPasswordInput("");
      setIsSellerPasswordDialogOpen(true);
    }
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

  const handleEditSeller = (seller: Seller) => {
    setEditingSeller(seller);
    setEditSellerName(seller.name);
    setEditSellerComm(seller.defaultCommission?.toString() || "0");
    setEditSellerPass(seller.password || "");
  };

  const handleSaveSeller = () => {
    if (editingSeller && editSellerName) {
      updateSeller(editingSeller.id, {
        name: editSellerName,
        defaultCommission: parseFloat(editSellerComm) || 0,
        password: editSellerPass
      });
      setEditingSeller(null);
      toast({ title: "Updated", description: "Entity details modified successfully." });
    }
  };

  const handleArchiveSeller = (sellerId: string, archive: boolean) => {
    updateSeller(sellerId, { archived: archive });
    toast({ 
      title: archive ? "Entity Archived" : "Entity Reactivated", 
      description: archive ? "Seller is now hidden from staff logging." : "Seller is now available for logging." 
    });
    if (editingSeller?.id === sellerId) setEditingSeller(null);
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

  const handleMarkBatchPaid = (method: 'cash' | 'transfer') => {
    if (settlementBatch) {
      markSalesAsPaid(settlementBatch.saleIds, method, settlementBatch.originMap);
      setIsSettlementDialogOpen(false);
      setSettlementBatch(null);
      toast({ 
        title: "Payout Settled", 
        description: `Marked £${settlementBatch.total.toFixed(2)} as paid via ${method.toUpperCase()}.` 
      });
    }
  };

  const handleDownloadPDF = () => {
    if (!authenticatedSellerId) return;
    const seller = sellers.find(s => s.id === authenticatedSellerId);
    if (!seller) return;

    const doc = new jsPDF();
    
    // Calculate sequential invoice number: 1098 + index in sorted unique payout events
    const uniqueEvents = Array.from(new Set(combinedSalesData.map(s => `${s.sellerId}_${s.saleDate}`))).sort();
    const currentEvent = `${authenticatedSellerId}_${selectedDate}`;
    const invoiceNum = 1098 + uniqueEvents.indexOf(currentEvent);

    // Header (Strictly Monochrome PDF for professionalism)
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0);
    doc.text("Newton's Collectables", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`INVOICE #${invoiceNum}`, 196, 20, { align: 'right' });

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text("Official Sales & Payout Report", 14, 28);
    
    doc.setDrawColor(0);
    doc.line(14, 33, 196, 33);

    // Report Info
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Seller Entity: ${seller.name}`, 14, 43);
    doc.text(`Report Date: ${selectedDate}`, 14, 48);
    doc.text(`Generated: ${format(new Date(), "PPP p")}`, 14, 53);

    // Table (Black and White theme)
    const tableData = sellerDailySales.map(sale => [
      sale.cardName,
      `£${sale.price.toFixed(2)}`,
      sale.payoutStatus === 'paid' ? `Settled (${sale.paymentMethod?.toUpperCase()})` : 'Pending',
      `£${(sale.price - (sale.commission || 0)).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 63,
      head: [['Card Details', 'Gross Price', 'Status', 'Your Payout']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 0, 0], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, textColor: 0 },
      columnStyles: {
        1: { halign: 'right' },
        3: { halign: 'right', fontStyle: 'bold' }
      }
    });

    // Summary Box
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setDrawColor(0);
    doc.rect(120, finalY, 76, 35);
    
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text("Financial Summary", 125, finalY + 8);
    
    doc.setFontSize(9);
    doc.text(`Total Gross:`, 125, finalY + 16);
    doc.text(`£${sellerStats.total.toFixed(2)}`, 190, finalY + 16, { align: 'right' });
    
    doc.text(`NC Commission:`, 125, finalY + 22);
    doc.text(`£${sellerStats.commission.toFixed(2)}`, 190, finalY + 22, { align: 'right' });
    
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`Net Daily Payout:`, 125, finalY + 30);
    doc.text(`£${sellerStats.payout.toFixed(2)}`, 190, finalY + 30, { align: 'right' });

    // Payout Date Notice
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`* Payout maturity date for this batch is scheduled for ${sellerStats.payoutDate}.`, 14, finalY + 45);

    // Legal Statement Footer
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(LEGAL_STATEMENT, 14, 285);

    doc.save(`NC_Invoice_${invoiceNum}_${seller.name}.pdf`);
    toast({ title: "Invoice Generated", description: `PDF Invoice #${invoiceNum} saved.` });
  };

  if (!isLoaded || isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-slate-500 font-medium animate-pulse">Synchronizing NC Shared Vault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-8 max-w-7xl mx-auto transition-all duration-500 animate-in fade-in">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-black tracking-tighter text-slate-900 flex items-center gap-2">
              <span className="text-primary italic">NC:</span> Sales Tracker
            </h1>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Professional Transaction Oversight</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl gap-2 shadow-sm border-slate-200 bg-white hover:bg-slate-50 transition-all h-11 px-6">
                {profileId === 'manager' ? <ShieldCheck className="w-4 h-4 text-primary" /> : profileId === 'seller' ? <User className="w-4 h-4 text-primary" /> : <UserCircle className="w-4 h-4 text-primary" />}
                <span className="font-bold uppercase tracking-widest text-xs">Vault: {profileId}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl p-2 shadow-xl border-slate-100">
              <DropdownMenuLabel className="px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-400">Select Profile</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleProfileSwitch('manager')} className="gap-3 cursor-pointer py-3 rounded-lg focus:bg-primary/10 focus:text-primary transition-colors">
                <ShieldCheck className="w-5 h-5" /> 
                <div className="flex flex-col">
                  <span className="font-bold text-xs uppercase">Manager Vault</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleProfileSwitch('staff')} className="gap-3 cursor-pointer py-3 rounded-lg focus:bg-primary/10 focus:text-primary transition-colors">
                <UserCircle className="w-5 h-5" /> 
                <div className="flex flex-col">
                  <span className="font-bold text-xs uppercase">Staff Vault</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleProfileSwitch('seller')} className="gap-3 cursor-pointer py-3 rounded-lg focus:bg-primary/10 focus:text-primary transition-colors">
                <User className="w-5 h-5" /> 
                <div className="flex flex-col">
                  <span className="font-bold text-xs uppercase">Seller Portal</span>
                </div>
              </DropdownMenuItem>
              {isManagerAuthenticated && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="gap-3 cursor-pointer py-3 rounded-lg focus:bg-destructive focus:text-destructive-foreground transition-colors">
                    <LogOut className="w-5 h-5" /> 
                    <span className="font-bold text-xs uppercase">Exit Vault</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 h-11 shadow-sm">
            <CalendarIcon className="w-4 h-4 text-primary" />
            <input 
              type="date" 
              className="bg-transparent outline-none text-sm font-bold uppercase text-slate-700" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>
      </header>

      {profileId === 'manager' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-bottom-4 duration-700">
          {[
            { label: "Daily Revenue", value: `£${dailyStats.totalSales.toFixed(2)}`, icon: Coins },
            { label: "NC Commission", value: `£${dailyStats.totalCommission.toFixed(2)}`, icon: TrendingUp },
            { label: "Daily Volume", value: `${dailyStats.totalCards} Logs`, icon: Activity },
            { label: "Top Performer", value: dailyStats.topSellerName, icon: Users }
          ].map((stat, i) => (
            <Card key={i} className="border-none shadow-sm rounded-2xl overflow-hidden group hover:shadow-md transition-all bg-white">
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <stat.icon className="w-3.5 h-3.5 text-primary" />
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="text-2xl font-black text-slate-900 truncate">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {profileId === 'manager' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-1000">
          <Card className="lg:col-span-2 shadow-sm border-none rounded-2xl overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-50 bg-slate-50/30">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Revenue Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-8 h-[300px]">
              {chartData.length > 0 ? (
                <ChartContainer config={chartConfig}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} tickFormatter={(val) => `£${val}`} />
                      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                      <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? 'hsl(var(--primary))' : '#cbd5e1'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-300 italic font-medium">
                  No sales data available for {selectedDate}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-none rounded-2xl overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-50 bg-slate-50/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Entity Roster
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`h-7 w-7 rounded-lg ${showArchived ? 'bg-primary/10 text-primary' : 'text-slate-400'}`}
                    onClick={() => setShowArchived(!showArchived)}
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <Input 
                    placeholder="New Entity Name..." 
                    className="h-10 bg-slate-50 border-none rounded-xl font-bold text-xs focus-visible:ring-primary/20"
                    value={newSellerName}
                    onChange={(e) => setNewSellerName(e.target.value)}
                  />
                  <Input 
                    type="number"
                    placeholder="Comm %" 
                    className="h-10 bg-slate-50 border-none rounded-xl font-black text-xs focus-visible:ring-primary/20"
                    value={newSellerCommission}
                    onChange={(e) => setNewSellerCommission(e.target.value)}
                  />
                </div>
                <Button 
                  className="w-full h-10 rounded-xl shadow-none font-black uppercase tracking-widest text-[10px]"
                  onClick={() => {
                    if (newSellerName) {
                      addSeller(newSellerName, parseFloat(newSellerCommission) || 0);
                      setNewSellerName("");
                      setNewSellerCommission("");
                      toast({ title: "Success", description: "Entity provisioned." });
                    }
                  }}
                >
                  Provision Entity
                </Button>
              </div>

              <Separator />

              <ScrollArea className="h-[200px] pr-2">
                <div className="flex flex-col gap-2">
                  {(showArchived ? archivedSellers : activeSellers).map((s) => (
                    <button 
                      key={s.id} 
                      onClick={() => handleEditSeller(s)}
                      className="w-full text-left flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-transparent hover:border-primary/20 hover:bg-white transition-all group"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-black text-xs ${s.archived ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{s.name}</span>
                          <Badge variant="outline" className="text-[10px] font-mono font-black border-slate-200 rounded-md h-5 px-1.5 bg-white">
                            {s.password}
                          </Badge>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{s.defaultCommission}% Comm</span>
                      </div>
                      <Settings2 className="w-3.5 h-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {profileId === 'seller' && authenticatedSellerId && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in slide-in-from-bottom-4 duration-700">
           <Card className="border-none shadow-sm rounded-2xl group hover:shadow-md transition-all bg-white">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Gross Sales
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-3xl font-black text-slate-900">£{sellerStats.total.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm rounded-2xl group hover:shadow-md transition-all bg-white border-l-4 border-l-primary">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary">
                Your Payout
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-3xl font-black text-slate-900">£{sellerStats.payout.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm rounded-2xl group hover:shadow-md transition-all bg-white">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Payout Date
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-xl font-black text-slate-700">{sellerStats.payoutDate}</div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm rounded-2xl group hover:shadow-md transition-all bg-white">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                NC Commission
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-3xl font-black opacity-30 text-slate-900">£{sellerStats.commission.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {profileId === 'manager' && payoutForecast && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-6 duration-1000">
           <Card className="shadow-sm border-none rounded-2xl overflow-hidden bg-white border-l-8 border-l-primary">
             <CardHeader className="bg-primary/5 px-6 py-4 border-b border-primary/10">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="bg-primary text-white p-2 rounded-xl">
                        <ArrowRightLeft className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-900">This Friday</CardTitle>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{format(payoutForecast.thisFriday.date, "PPP")}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <span className="text-2xl font-black text-primary">£{payoutForecast.thisFriday.total.toFixed(2)}</span>
                   </div>
                </div>
             </CardHeader>
             <CardContent className="p-6">
                <div className="space-y-3">
                   {Object.entries(payoutForecast.thisFriday.sellers).map(([name, data], i) => (
                      <div key={i} className="flex justify-between items-center text-xs p-3 rounded-xl bg-slate-50 hover:bg-white border border-transparent hover:border-primary/10 transition-all group">
                        <span className="font-bold uppercase tracking-widest text-[10px] text-slate-600">{name}</span>
                        <div className="flex items-center gap-3">
                           <span className="font-black text-slate-900">£{data.total.toFixed(2)}</span>
                           <Button 
                             size="sm" 
                             className="h-7 px-3 text-[8px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                             onClick={() => {
                               setSettlementBatch({ sellerId: name, saleIds: data.ids, originMap: data.originMap, total: data.total });
                               setIsSettlementDialogOpen(true);
                             }}
                           >
                             Settle
                           </Button>
                        </div>
                      </div>
                   ))}
                   {payoutForecast.thisFriday.count === 0 && (
                     <p className="text-center text-[10px] italic text-slate-400 py-4">No settlements due this Friday</p>
                   )}
                </div>
             </CardContent>
           </Card>

           <Card className="shadow-sm border-none rounded-2xl overflow-hidden bg-white border-l-8 border-l-slate-200">
             <CardHeader className="bg-slate-50 px-6 py-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="bg-slate-200 text-slate-600 p-2 rounded-xl">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-900">Next Friday</CardTitle>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{format(payoutForecast.nextFriday.date, "PPP")}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <span className="text-2xl font-black text-slate-900">£{payoutForecast.nextFriday.total.toFixed(2)}</span>
                   </div>
                </div>
             </CardHeader>
             <CardContent className="p-6">
                <div className="space-y-3">
                   {Object.entries(payoutForecast.nextFriday.sellers).map(([name, data], i) => (
                      <div key={i} className="flex justify-between items-center text-xs p-3 rounded-xl bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 transition-all group">
                        <span className="font-bold uppercase tracking-widest text-[10px] text-slate-600">{name}</span>
                        <div className="flex items-center gap-3">
                           <span className="font-black text-slate-900">£{data.total.toFixed(2)}</span>
                           <Button 
                             size="sm" 
                             variant="secondary"
                             className="h-7 px-3 text-[8px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                             onClick={() => {
                               setSettlementBatch({ sellerId: name, saleIds: data.ids, originMap: data.originMap, total: data.total });
                               setIsSettlementDialogOpen(true);
                             }}
                           >
                             Settle
                           </Button>
                        </div>
                      </div>
                   ))}
                   {payoutForecast.nextFriday.count === 0 && (
                     <p className="text-center text-[10px] italic text-slate-400 py-4">No settlements due next Friday</p>
                   )}
                </div>
             </CardContent>
           </Card>
        </div>
      )}

      <Card className="shadow-sm border-none rounded-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-1000 bg-white">
        {profileId === 'staff' ? (
          <>
            <CardHeader className="border-b border-slate-50 bg-slate-50/20 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary text-white p-2 rounded-xl">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900">Sales Ledger</CardTitle>
                  </div>
                </div>
                <Badge variant="secondary" className="px-4 py-1.5 rounded-xl bg-primary text-white font-black text-sm">
                  {selectedDate}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-50/50 p-8 rounded-3xl items-end border border-slate-100 shadow-inner">
                <div className="md:col-span-3 space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    Seller Entity
                  </label>
                  <Select value={entrySellerId} onValueChange={setEntrySellerId}>
                    <SelectTrigger className="bg-white border-slate-100 h-12 rounded-xl px-4 font-bold text-sm shadow-sm">
                      <SelectValue placeholder="Select active seller" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                      {activeSellers.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="font-bold py-3 uppercase text-xs">
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-5 space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    Card Detail
                  </label>
                  <Input 
                    placeholder="e.g., Rare Holographic Charizard" 
                    className="bg-white border-slate-100 h-12 rounded-xl px-4 font-bold shadow-sm"
                    value={newSaleCard}
                    onChange={(e) => setNewSaleCard(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2 space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-sm text-primary">£</span>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00" 
                      className="bg-white border-slate-100 h-12 rounded-xl pl-8 pr-4 font-black shadow-sm"
                      value={newSalePrice}
                      onChange={(e) => setNewSalePrice(e.target.value)}
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <Button 
                    className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20" 
                    onClick={handleAddSale}
                    disabled={!entrySellerId || !newSaleCard.trim() || !newSalePrice}
                  >
                    Log Sale
                  </Button>
                </div>
              </div>

              <div className="border border-slate-50 rounded-2xl overflow-hidden bg-white shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-none">
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
                          <TableRow key={sale.id} className="hover:bg-slate-50/50 border-slate-50 transition-all">
                            <TableCell className="pl-6 h-16">
                              <Badge variant="outline" className="text-slate-600 font-black text-[10px] uppercase tracking-tighter px-3 rounded-md bg-white">
                                {seller?.name || sale.sellerId}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-bold uppercase text-xs text-slate-700">{sale.cardName}</span>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <span className="font-black text-base text-slate-900">£{sale.price.toFixed(2)}</span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="h-48 text-center text-slate-400 italic">
                          No records for {selectedDate}.
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
            <CardHeader className="border-b border-slate-50 bg-slate-50/20 px-8 py-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <div className="bg-primary text-white p-2 rounded-xl">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900">Sales Review</CardTitle>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="w-48">
                      <Select value={selectedSellerId} onValueChange={handleSellerSelect}>
                        <SelectTrigger className="bg-white border-slate-100 h-10 rounded-xl px-4 font-bold text-xs uppercase shadow-sm">
                          <SelectValue placeholder="Identify identity..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                          {activeSellers.map((s) => (
                            <SelectItem key={s.id} value={s.id} className="font-bold text-xs uppercase">
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                   </div>
                   <Badge variant="secondary" className="px-4 py-1.5 rounded-xl bg-primary text-white font-black text-sm">
                    {selectedDate}
                  </Badge>
                  {authenticatedSellerId && (
                    <Button variant="outline" size="sm" className="h-10 rounded-xl gap-2 font-black text-xs border-slate-200 hover:bg-slate-50 transition-all shadow-sm" onClick={handleDownloadPDF}>
                      <FileText className="w-3.5 h-3.5 text-primary" /> PDF INVOICE
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              {authenticatedSellerId ? (
                <>
                  <div className="border border-slate-50 rounded-2xl overflow-hidden bg-white shadow-sm">
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-none">
                          <TableHead className="font-black uppercase tracking-widest text-[10px] h-14 pl-6">Card Detail</TableHead>
                          <TableHead className="text-right font-black uppercase tracking-widest text-[10px] h-14">Gross Sale</TableHead>
                          <TableHead className="text-right font-black uppercase tracking-widest text-[10px] h-14">Status</TableHead>
                          <TableHead className="text-right font-black uppercase tracking-widest text-[10px] h-14 pr-6">Your Payout</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sellerDailySales.length > 0 ? (
                          sellerDailySales.map((sale) => (
                            <TableRow key={sale.id} className="hover:bg-slate-50/50 border-slate-50 transition-all">
                              <TableCell className="pl-6 h-16 font-bold uppercase text-xs text-slate-700">{sale.cardName}</TableCell>
                              <TableCell className="text-right font-black text-slate-900">£{sale.price.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-black">
                                {sale.payoutStatus === 'paid' ? (
                                  <Badge className="text-[8px] rounded-md border-transparent bg-green-500 text-white uppercase px-1.5">
                                    {sale.paymentMethod}
                                  </Badge>
                                ) : (
                                  <span className="text-slate-400 opacity-50 text-[10px] uppercase">Pending</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right pr-6 font-black text-primary">£{(sale.price - (sale.commission || 0)).toFixed(2)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="h-48 text-center text-slate-400 italic font-medium">
                              No records for this date.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-4">
                     <div className="bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl flex items-center gap-3">
                        <Clock className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payout Date</p>
                          <p className="font-black text-slate-900">{sellerStats.payoutDate}</p>
                        </div>
                     </div>
                     <div className="bg-primary px-10 py-6 rounded-3xl text-white flex items-center justify-center shadow-xl shadow-primary/30">
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Net Daily Payout</span>
                          <span className="text-4xl font-black">£{sellerStats.payout.toFixed(2)}</span>
                        </div>
                      </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-inner">
                    <Lock className="w-12 h-12 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Identity Verification</h3>
                    <p className="text-sm text-slate-500 font-medium max-w-sm mx-auto">Please select identity and provide access key.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <CardHeader className="pb-0 border-b border-slate-50 bg-slate-50/20 px-8 pt-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4">
                <div className="flex flex-col">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary text-white p-2 rounded-xl">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900">Manager Oversight</CardTitle>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                   <Badge className="px-4 py-1.5 rounded-xl bg-primary text-white font-black text-sm">
                    {selectedDate}
                  </Badge>
                </div>
              </div>
              <ScrollArea className="max-w-full">
                <TabsList className="bg-slate-100/50 p-1 mb-2 h-14 rounded-xl">
                  <TabsTrigger value="all" className="px-8 h-12 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg font-black uppercase tracking-widest text-[10px] gap-2">
                    Global View
                  </TabsTrigger>
                  {activeSellers.map((s) => (
                    <TabsTrigger key={s.id} value={s.id} className="px-8 h-12 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg font-black uppercase tracking-widest text-[10px]">
                      {s.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </ScrollArea>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <TabsContent value="all" className="space-y-6 mt-0">
                <div className="border border-slate-50 rounded-2xl overflow-hidden bg-white shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-none">
                        <TableHead className="font-black uppercase tracking-widest text-[10px] h-14 pl-6">Seller</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[10px] h-14">Card Detail</TableHead>
                        <TableHead className="text-right font-black uppercase tracking-widest text-[10px] h-14">Sale Price</TableHead>
                        <TableHead className="text-right font-black uppercase tracking-widest text-[10px] h-14">Status</TableHead>
                        <TableHead className="w-[120px] pr-6"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allDailySales.length > 0 ? (
                        allDailySales.map((sale) => {
                          const isEditing = editingSaleId === sale.id;
                          return (
                            <TableRow key={sale.id} className="hover:bg-slate-50/50 border-slate-50 transition-all group">
                              <TableCell className="pl-6 h-16">
                                <Badge variant="outline" className="rounded-md font-black text-[10px] uppercase bg-white">
                                  {sellers.find(s => s.id === sale.sellerId)?.name || sale.sellerId}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input 
                                    className="h-9 font-bold bg-slate-50 rounded-lg border-slate-200" 
                                    value={editCard} 
                                    onChange={(e) => setEditCard(e.target.value)}
                                  />
                                ) : (
                                  <span className="font-bold uppercase text-xs text-slate-700">{sale.cardName}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {isEditing ? (
                                  <Input 
                                    className="h-9 w-28 text-right font-black bg-slate-50 rounded-lg border-slate-200 ml-auto" 
                                    type="number" 
                                    step="0.01" 
                                    value={editPrice} 
                                    onChange={(e) => setEditPrice(e.target.value)} 
                                  />
                                ) : (
                                  <span className="font-black text-slate-900">£{sale.price.toFixed(2)}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {sale.payoutStatus === 'paid' ? (
                                  <Badge className="bg-green-500 text-white border-none text-[8px] rounded-md uppercase px-1.5">
                                    {sale.paymentMethod}
                                  </Badge>
                                ) : (
                                  <span className="text-[9px] font-black text-slate-300 uppercase">Pending</span>
                                )}
                              </TableCell>
                              <TableCell className="pr-6">
                                <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                  {isEditing ? (
                                    <>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary rounded-lg" onClick={() => {
                                        const priceNum = parseFloat(editPrice);
                                        if (editCard.trim() && !isNaN(priceNum)) {
                                          updateSale(sale.id!, { cardName: editCard.trim(), price: priceNum }, sale.profileOrigin);
                                          setEditingSaleId(null);
                                        }
                                      }}>
                                        <Check className="w-4 h-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 rounded-lg" onClick={() => setEditingSaleId(null)}>
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary rounded-lg" onClick={() => {
                                        setEditingSaleId(sale.id!);
                                        setEditCard(sale.cardName);
                                        setEditPrice(sale.price.toString());
                                      }}>
                                        <Pencil className="w-4 h-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive rounded-lg" onClick={() => deleteSale(sale.id!, sale.profileOrigin)}>
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
                          <TableCell colSpan={5} className="h-48 text-center text-slate-400 italic">
                            No records found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {activeSellers.map((s) => {
                const sellerDailySales = dailySalesData[s.id] || [];
                return (
                  <TabsContent key={s.id} value={s.id} className="space-y-6 mt-0">
                    <div className="border border-slate-50 rounded-2xl overflow-hidden bg-white shadow-sm">
                      <Table>
                        <TableHeader className="bg-slate-50/50">
                          <TableRow className="border-none">
                            <TableHead className="font-black uppercase tracking-widest text-[10px] h-14 pl-6">Card Detail</TableHead>
                            <TableHead className="text-right font-black uppercase tracking-widest text-[10px] h-14">Price</TableHead>
                            <TableHead className="text-right font-black uppercase tracking-widest text-[10px] h-14">Status</TableHead>
                            <TableHead className="w-[120px] pr-6"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sellerDailySales.length > 0 ? (
                            sellerDailySales.map((sale) => (
                              <TableRow key={sale.id} className="hover:bg-slate-50/50 border-slate-50 transition-all group">
                                <TableCell className="pl-6 h-16 font-bold uppercase text-xs text-slate-700">{sale.cardName}</TableCell>
                                <TableCell className="text-right font-black text-slate-900">£{sale.price.toFixed(2)}</TableCell>
                                <TableCell className="text-right">
                                  {sale.payoutStatus === 'paid' ? (
                                    <Badge className="bg-green-500 text-white rounded-md text-[8px] uppercase px-1.5">
                                      {sale.paymentMethod}
                                    </Badge>
                                  ) : (
                                    <span className="text-[9px] font-black text-slate-300 uppercase">Pending</span>
                                  )}
                                </TableCell>
                                <TableCell className="pr-6">
                                  <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive rounded-lg" onClick={() => deleteSale(sale.id!, sale.profileOrigin)}>
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="h-32 text-center text-slate-400 italic">
                                No logs for {s.name}.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
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
          <h3 className="text-xl font-black tracking-tight text-slate-900 uppercase flex items-center gap-3">
            <div className="bg-primary text-white p-2 rounded-xl shadow-lg shadow-primary/20"><Coins className="w-5 h-5" /></div>
            Live Activity
          </h3>

          <Card className="shadow-sm border-none h-[400px] rounded-2xl overflow-hidden bg-white">
            <CardHeader className="pb-4 bg-slate-50/50 border-b border-slate-50">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <History className="w-4 h-4" /> Vault History
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[320px] p-6">
                {(profileId === 'seller' ? sellerDailySales : allDailySales).length > 0 ? (
                  <div className="space-y-4">
                    {(profileId === 'seller' ? sellerDailySales : allDailySales).map((act, i) => (
                      <div key={i} className="flex justify-between items-center text-sm bg-slate-50 p-4 rounded-xl border border-transparent hover:border-primary/10 hover:bg-white transition-all">
                        <div className="space-y-1">
                          <div className="font-black uppercase text-xs text-slate-900">{act.cardName}</div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter rounded-md bg-white">
                              {sellers.find(s => s.id === act.sellerId)?.name || act.sellerId}
                            </Badge>
                            <span className="text-[9px] font-black text-slate-400 uppercase">{act.saleDate}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                           <div className="font-black text-slate-900">£{act.price.toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 opacity-40">
                    <p className="text-[10px] font-black uppercase text-slate-400 italic">Vault is empty.</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
           <Card className="shadow-sm border-none rounded-2xl overflow-hidden bg-white">
            <CardHeader className="pb-4 bg-slate-50/50 border-b border-slate-50">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-slate-600">
                <Search className="w-4 h-4" /> Global Search
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="SEARCH TRANSACTIONS..." 
                  className="pl-12 h-14 bg-slate-50 border-none rounded-2xl font-bold uppercase text-xs focus-visible:ring-primary/20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {searchQuery && (
                <ScrollArea className="mt-6 h-[250px] border-t border-slate-50 pt-4">
                  <div className="space-y-3">
                    {allDailySales.filter(s => s.cardName.toLowerCase().includes(searchQuery.toLowerCase())).map((res, i) => (
                      <div key={i} className="text-sm space-y-3 bg-slate-50/50 p-5 rounded-2xl border border-slate-50">
                        <div className="flex justify-between items-center">
                          <span className="font-black text-lg text-slate-900 uppercase">{res.cardName}</span>
                          <div className="font-black text-primary">£{res.price.toFixed(2)}</div>
                        </div>
                        <div className="text-[9px] font-black text-slate-400 flex justify-between uppercase border-t border-slate-100 pt-2">
                          <span>Sold by {sellers.find(s => s.id === res.sellerId)?.name || res.sellerId}</span>
                          <span>{res.saleDate}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <footer className="py-12 border-t mt-12 bg-slate-50/50 rounded-t-3xl">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <p className="text-xs font-bold text-slate-400 max-w-2xl mx-auto uppercase tracking-wider">
            {LEGAL_STATEMENT}
          </p>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
            &copy; {new Date().getFullYear()} NC: Sales Tracker &bull; Dynamic Enterprise Dashboard
          </p>
        </div>
      </footer>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="rounded-3xl p-8 border-none shadow-2xl">
          <DialogHeader className="items-center text-center">
            <div className="bg-primary/10 text-primary p-4 rounded-3xl mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">Access Locked</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <Input
              type="password"
              placeholder="ENCRYPTION KEY..."
              className="h-14 bg-slate-50 border-none rounded-2xl text-center font-black tracking-widest text-xl text-primary focus-visible:ring-primary/20"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
            />
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-3">
            <Button onClick={handlePasswordSubmit} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20">Unlock Vault</Button>
            <Button variant="ghost" onClick={() => setIsPasswordDialogOpen(false)} className="w-full rounded-2xl font-black text-slate-400 uppercase text-[10px]">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSellerPasswordDialogOpen} onOpenChange={setIsSellerPasswordDialogOpen}>
        <DialogContent className="rounded-3xl p-8 border-none shadow-2xl">
          <DialogHeader className="items-center text-center">
            <div className="bg-primary/10 text-primary p-4 rounded-3xl mb-4">
              <KeyRound className="w-8 h-8" />
            </div>
            <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">Verification</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <Input
              type="password"
              placeholder="ACCESS KEY..."
              className="h-14 bg-slate-50 border-none rounded-2xl text-center font-black tracking-widest text-xl text-primary uppercase focus-visible:ring-primary/20"
              value={sellerPasswordInput}
              onChange={(e) => setSellerPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSellerPasswordSubmit()}
            />
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-3">
            <Button onClick={handleSellerPasswordSubmit} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20">Authorize</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingSeller} onOpenChange={() => setEditingSeller(null)}>
        <DialogContent className="rounded-3xl p-8 border-none shadow-2xl">
          <DialogHeader className="items-center text-center">
            <div className="bg-primary/10 text-primary p-4 rounded-3xl mb-4">
              <Settings2 className="w-8 h-8" />
            </div>
            <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">Edit Entity</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Name</label>
              <Input
                className="h-12 bg-slate-50 border-none rounded-xl font-bold uppercase text-slate-700"
                value={editSellerName}
                onChange={(e) => setEditSellerName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Comm %</label>
                <Input
                  type="number"
                  className="h-12 bg-slate-50 border-none rounded-xl font-black text-slate-900"
                  value={editSellerComm}
                  onChange={(e) => setEditSellerComm(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Key</label>
                <Input
                  className="h-12 bg-slate-50 border-none rounded-xl font-black text-primary uppercase"
                  value={editSellerPass}
                  onChange={(e) => setEditSellerPass(e.target.value.toUpperCase())}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-3">
            <Button onClick={handleSaveSeller} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs">Save Changes</Button>
            {editingSeller?.archived ? (
              <Button variant="outline" onClick={() => handleArchiveSeller(editingSeller.id, false)} className="w-full h-12 rounded-xl border-slate-200 font-black uppercase text-[10px] text-green-600 hover:bg-green-50">Reactivate</Button>
            ) : (
              <Button variant="outline" onClick={() => handleArchiveSeller(editingSeller!.id, true)} className="w-full h-12 rounded-xl border-slate-200 font-black uppercase text-[10px] text-destructive hover:bg-destructive/5">Archive</Button>
            )}
            <Button variant="ghost" onClick={() => setEditingSeller(null)} className="w-full rounded-2xl font-black text-slate-400 uppercase text-[10px]">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSettlementDialogOpen} onOpenChange={setIsSettlementDialogOpen}>
        <DialogContent className="rounded-3xl p-8 border-none shadow-2xl">
          <DialogHeader className="items-center text-center">
            <div className="bg-primary/10 text-primary p-4 rounded-3xl mb-4">
              <Wallet className="w-8 h-8" />
            </div>
            <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">Settle Payout</DialogTitle>
            <DialogDescription className="text-slate-500 font-bold">
              Pay £{settlementBatch?.total.toFixed(2)} to {settlementBatch?.sellerId}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-8 grid grid-cols-2 gap-4">
             <Button 
               variant="outline" 
               className="h-24 flex-col rounded-2xl gap-2 border-slate-100 hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-all shadow-sm"
               onClick={() => handleMarkBatchPaid('cash')}
             >
                <Banknote className="w-6 h-6" />
                <span className="font-black uppercase tracking-widest text-[10px]">Cash</span>
             </Button>
             <Button 
               variant="outline" 
               className="h-24 flex-col rounded-2xl gap-2 border-slate-100 hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-all shadow-sm"
               onClick={() => handleMarkBatchPaid('transfer')}
             >
                <Send className="w-6 h-6" />
                <span className="font-black uppercase tracking-widest text-[10px]">Transfer</span>
             </Button>
          </div>
          <DialogFooter>
             <Button variant="ghost" onClick={() => setIsSettlementDialogOpen(false)} className="w-full rounded-2xl font-black text-slate-400 uppercase text-[10px]">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
