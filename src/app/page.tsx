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
  FileText
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
      if (profileId === 'staff') setProfileId('manager');
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
    
    // Calculate sequential invoice number: 1098 + number of unique (seller, date) invoice events
    const uniqueInvoiceEvents = new Set();
    combinedSalesData.forEach(s => {
      uniqueInvoiceEvents.add(`${s.sellerId}_${s.saleDate}`);
    });
    const invoiceNum = 1098 + uniqueInvoiceEvents.size;

    // Header (No Logo, Monochrome)
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

    // Table (Black and White)
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
    
    doc.text(`Manager Cut:`, 125, finalY + 22);
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium animate-pulse">Synchronizing NC Shared Vault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-8 max-w-7xl mx-auto transition-all duration-500 animate-in fade-in bg-background text-foreground">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-black tracking-tighter text-foreground flex items-center gap-2">
              NC: <span className="opacity-50">Sales Tracker</span>
            </h1>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Professional Transaction Oversight</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-none gap-2 shadow-none border-primary bg-card hover:bg-accent transition-all h-11 px-6">
                {profileId === 'manager' ? <ShieldCheck className="w-4 h-4" /> : profileId === 'seller' ? <User className="w-4 h-4" /> : <UserCircle className="w-4 h-4" />}
                <span className="font-bold uppercase tracking-widest text-xs">Vault: {profileId}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-none p-2 shadow-none border-primary">
              <DropdownMenuLabel className="px-3 py-2 text-xs font-black uppercase tracking-widest text-muted-foreground">Select Profile</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleProfileSwitch('manager')} className="gap-3 cursor-pointer py-3 rounded-none focus:bg-accent transition-colors">
                <ShieldCheck className="w-5 h-5" /> 
                <div className="flex flex-col">
                  <span className="font-bold text-xs uppercase">Manager Vault</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleProfileSwitch('staff')} className="gap-3 cursor-pointer py-3 rounded-none focus:bg-accent transition-colors">
                <UserCircle className="w-5 h-5" /> 
                <div className="flex flex-col">
                  <span className="font-bold text-xs uppercase">Staff Vault</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleProfileSwitch('seller')} className="gap-3 cursor-pointer py-3 rounded-none focus:bg-accent transition-colors">
                <User className="w-5 h-5" /> 
                <div className="flex flex-col">
                  <span className="font-bold text-xs uppercase">Seller Portal</span>
                </div>
              </DropdownMenuItem>
              {isManagerAuthenticated && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="gap-3 cursor-pointer py-3 rounded-none focus:bg-primary focus:text-primary-foreground transition-colors">
                    <LogOut className="w-5 h-5" /> 
                    <span className="font-bold text-xs uppercase">Exit Vault</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-3 bg-card border border-primary rounded-none px-4 h-11 shadow-none">
            <CalendarIcon className="w-4 h-4" />
            <input 
              type="date" 
              className="bg-transparent outline-none text-sm font-bold uppercase" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>
      </header>

      {profileId === 'manager' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-bottom-4 duration-700">
          <Card className="border border-primary shadow-none rounded-none overflow-hidden group hover:bg-accent transition-all">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                Daily Revenue
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-3xl font-black">£{dailyStats.totalSales.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card className="border border-primary shadow-none rounded-none group hover:bg-accent transition-all">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                Comm. Earned
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-3xl font-black">£{dailyStats.totalCommission.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card className="border border-primary shadow-none rounded-none group hover:bg-accent transition-all">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                Daily Volume
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-3xl font-black">{dailyStats.totalCards} <span className="text-lg font-bold">Logs</span></div>
            </CardContent>
          </Card>
          <Card className="border border-primary shadow-none rounded-none group hover:bg-accent transition-all">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                Top Performer
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl font-black truncate">{dailyStats.topSellerName}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {profileId === 'manager' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-1000">
          <Card className="lg:col-span-2 shadow-none border border-primary rounded-none overflow-hidden bg-card">
            <CardHeader className="border-b bg-accent/50">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Revenue Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-8 h-[300px]">
              {chartData.length > 0 ? (
                <ChartContainer config={chartConfig}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} tickFormatter={(val) => `£${val}`} />
                      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                      <Bar dataKey="total" radius={[0, 0, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? 'black' : '#888'} />
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
          
          <Card className="shadow-none border border-primary rounded-none overflow-hidden bg-card">
            <CardHeader className="border-b bg-accent/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-4 h-4" /> Entity Roster
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`h-7 w-7 rounded-none ${showArchived ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
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
                    className="h-10 bg-accent/30 border border-primary rounded-none font-bold text-xs"
                    value={newSellerName}
                    onChange={(e) => setNewSellerName(e.target.value)}
                  />
                  <Input 
                    type="number"
                    placeholder="Comm %" 
                    className="h-10 bg-accent/30 border border-primary rounded-none font-black text-xs"
                    value={newSellerCommission}
                    onChange={(e) => setNewSellerCommission(e.target.value)}
                  />
                </div>
                <Button 
                  className="w-full h-10 rounded-none shadow-none font-black uppercase tracking-widest text-[10px]"
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
                      className="w-full text-left flex items-center justify-between p-3 rounded-none bg-accent/20 border border-primary hover:bg-accent/50 transition-all group"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-black text-xs ${s.archived ? 'text-muted-foreground line-through' : ''}`}>{s.name}</span>
                          <Badge variant="outline" className="text-[10px] font-mono font-black border-primary rounded-none h-5 px-1.5">
                            {s.password}
                          </Badge>
                        </div>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">{s.defaultCommission}% Comm</span>
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
           <Card className="border border-primary shadow-none rounded-none group hover:bg-accent transition-all">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                Gross Sales
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-3xl font-black">£{sellerStats.total.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card className="border border-primary shadow-none rounded-none group hover:bg-accent transition-all">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                Your Payout
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-3xl font-black">£{sellerStats.payout.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card className="border border-primary shadow-none rounded-none group hover:bg-accent transition-all">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                Payout Date
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-xl font-black">{sellerStats.payoutDate}</div>
            </CardContent>
          </Card>
          <Card className="border border-primary shadow-none rounded-none group hover:bg-accent transition-all">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                Manager Cut
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-3xl font-black opacity-50">£{sellerStats.commission.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {profileId === 'manager' && payoutForecast && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-6 duration-1000">
           <Card className="shadow-none border border-primary rounded-none overflow-hidden bg-card border-l-8">
             <CardHeader className="bg-accent/30 px-6 py-4 border-b">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="bg-primary text-primary-foreground p-2">
                        <ArrowRightLeft className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-black uppercase tracking-tight">This Friday</CardTitle>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">{format(payoutForecast.thisFriday.date, "PPP")}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <span className="text-2xl font-black">£{payoutForecast.thisFriday.total.toFixed(2)}</span>
                   </div>
                </div>
             </CardHeader>
             <CardContent className="p-6">
                <div className="space-y-3">
                   {Object.entries(payoutForecast.thisFriday.sellers).map(([name, data], i) => (
                      <div key={i} className="flex justify-between items-center text-xs p-3 border border-primary/10 hover:bg-accent/30 transition-colors group">
                        <span className="font-bold uppercase tracking-widest text-[10px]">{name}</span>
                        <div className="flex items-center gap-3">
                           <span className="font-black">£{data.total.toFixed(2)}</span>
                           <Button 
                             size="sm" 
                             variant="outline" 
                             className="h-7 px-3 text-[8px] font-black uppercase tracking-widest bg-primary text-primary-foreground rounded-none opacity-0 group-hover:opacity-100 transition-opacity"
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
                     <p className="text-center text-[10px] italic text-muted-foreground py-4">No settlements due this Friday</p>
                   )}
                </div>
             </CardContent>
           </Card>

           <Card className="shadow-none border border-primary rounded-none overflow-hidden bg-card border-l-8">
             <CardHeader className="bg-accent/30 px-6 py-4 border-b">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="bg-primary text-primary-foreground p-2">
                        <ArrowRightLeft className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-black uppercase tracking-tight">Next Friday</CardTitle>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">{format(payoutForecast.nextFriday.date, "PPP")}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <span className="text-2xl font-black">£{payoutForecast.nextFriday.total.toFixed(2)}</span>
                   </div>
                </div>
             </CardHeader>
             <CardContent className="p-6">
                <div className="space-y-3">
                   {Object.entries(payoutForecast.nextFriday.sellers).map(([name, data], i) => (
                      <div key={i} className="flex justify-between items-center text-xs p-3 border border-primary/10 hover:bg-accent/30 transition-colors group">
                        <span className="font-bold uppercase tracking-widest text-[10px]">{name}</span>
                        <div className="flex items-center gap-3">
                           <span className="font-black">£{data.total.toFixed(2)}</span>
                           <Button 
                             size="sm" 
                             variant="outline" 
                             className="h-7 px-3 text-[8px] font-black uppercase tracking-widest bg-primary text-primary-foreground rounded-none opacity-0 group-hover:opacity-100 transition-opacity"
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
                     <p className="text-center text-[10px] italic text-muted-foreground py-4">No settlements due next Friday</p>
                   )}
                </div>
             </CardContent>
           </Card>
        </div>
      )}

      <Card className="shadow-none border border-primary rounded-none overflow-hidden animate-in slide-in-from-bottom-8 duration-1000">
        {profileId === 'staff' ? (
          <>
            <CardHeader className="border-b bg-accent/20 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary text-primary-foreground p-2">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black uppercase tracking-tight">Sales Ledger</CardTitle>
                  </div>
                </div>
                <Badge variant="secondary" className="px-4 py-1.5 rounded-none bg-primary text-primary-foreground font-black text-sm">
                  {selectedDate}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-accent/20 p-8 rounded-none items-end border border-primary">
                <div className="md:col-span-3 space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    Seller Entity
                  </label>
                  <Select value={entrySellerId} onValueChange={setEntrySellerId}>
                    <SelectTrigger className="bg-card border-primary h-12 rounded-none px-4 font-bold text-sm">
                      <SelectValue placeholder="Select active seller" />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-primary">
                      {activeSellers.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="font-bold py-3 uppercase text-xs">
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-5 space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    Card Detail
                  </label>
                  <Input 
                    placeholder="e.g., Rare Holographic Charizard" 
                    className="bg-card border-primary h-12 rounded-none px-4 font-bold"
                    value={newSaleCard}
                    onChange={(e) => setNewSaleCard(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2 space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-sm">£</span>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00" 
                      className="bg-card border-primary h-12 rounded-none pl-8 pr-4 font-black"
                      value={newSalePrice}
                      onChange={(e) => setNewSalePrice(e.target.value)}
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <Button 
                    className="w-full h-12 rounded-none font-black uppercase tracking-widest text-xs" 
                    onClick={handleAddSale}
                    disabled={!entrySellerId || !newSaleCard.trim() || !newSalePrice}
                  >
                    Log Sale
                  </Button>
                </div>
              </div>

              <div className="border border-primary rounded-none overflow-hidden bg-card">
                <Table>
                  <TableHeader className="bg-accent/30">
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
                          <TableRow key={sale.id} className="hover:bg-accent border-primary transition-all">
                            <TableCell className="pl-6 h-16">
                              <Badge variant="outline" className="text-foreground font-black text-[10px] uppercase tracking-tighter px-3 rounded-none">
                                {seller?.name || sale.sellerId}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-bold uppercase text-xs">{sale.cardName}</span>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <span className="font-black text-base">£{sale.price.toFixed(2)}</span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="h-48 text-center text-muted-foreground italic">
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
            <CardHeader className="border-b bg-accent/20 px-8 py-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <div className="bg-primary text-primary-foreground p-2">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black uppercase tracking-tight">Sales Review</CardTitle>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="w-48">
                      <Select value={selectedSellerId} onValueChange={handleSellerSelect}>
                        <SelectTrigger className="bg-card border-primary h-10 rounded-none px-4 font-bold text-xs uppercase">
                          <SelectValue placeholder="Identify identity..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-none border-primary">
                          {activeSellers.map((s) => (
                            <SelectItem key={s.id} value={s.id} className="font-bold text-xs uppercase">
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                   </div>
                   <Badge variant="secondary" className="px-4 py-1.5 rounded-none bg-primary text-primary-foreground font-black text-sm">
                    {selectedDate}
                  </Badge>
                  {authenticatedSellerId && (
                    <Button variant="outline" size="sm" className="h-10 rounded-none gap-2 font-black text-xs border-primary hover:bg-accent transition-all" onClick={handleDownloadPDF}>
                      <FileText className="w-3.5 h-3.5" /> PDF INVOICE
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              {authenticatedSellerId ? (
                <>
                  <div className="border border-primary rounded-none overflow-hidden bg-card">
                    <Table>
                      <TableHeader className="bg-accent/30">
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
                            <TableRow key={sale.id} className="hover:bg-accent border-primary transition-all">
                              <TableCell className="pl-6 h-16 font-bold uppercase text-xs">{sale.cardName}</TableCell>
                              <TableCell className="text-right font-black">£{sale.price.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-black">
                                {sale.payoutStatus === 'paid' ? (
                                  <Badge className="text-[8px] rounded-none border-primary bg-primary text-primary-foreground uppercase">
                                    {sale.paymentMethod}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground opacity-50 text-[10px] uppercase">Pending</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right pr-6 font-black">£{(sale.price - (sale.commission || 0)).toFixed(2)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="h-48 text-center text-muted-foreground italic font-medium">
                              No records for this date.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-4">
                     <div className="bg-accent border border-primary px-6 py-4 rounded-none flex items-center gap-3">
                        <Clock className="w-5 h-5" />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest">Payout Date</p>
                          <p className="font-black">{sellerStats.payoutDate}</p>
                        </div>
                     </div>
                     <div className="bg-primary px-10 py-6 rounded-none text-primary-foreground flex items-center justify-center">
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Net Daily Payout</span>
                          <span className="text-4xl font-black">£{sellerStats.payout.toFixed(2)}</span>
                        </div>
                      </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
                  <div className="bg-accent p-6 border border-primary">
                    <Lock className="w-12 h-12" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Identity Verification</h3>
                    <p className="text-sm text-muted-foreground font-medium max-w-sm mx-auto">Please select identity and provide access key.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <CardHeader className="pb-0 border-b bg-accent/20 px-8 pt-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4">
                <div className="flex flex-col">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary text-primary-foreground p-2">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-xl font-black uppercase tracking-tight">Manager Oversight</CardTitle>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                   <Badge className="px-4 py-1.5 rounded-none bg-primary text-primary-foreground font-black text-sm">
                    {selectedDate}
                  </Badge>
                </div>
              </div>
              <ScrollArea className="max-w-full">
                <TabsList className="bg-accent/50 p-1 mb-2 h-14 rounded-none">
                  <TabsTrigger value="all" className="px-8 h-12 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-none font-black uppercase tracking-widest text-[10px] gap-2">
                    Global View
                  </TabsTrigger>
                  {activeSellers.map((s) => (
                    <TabsTrigger key={s.id} value={s.id} className="px-8 h-12 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-none font-black uppercase tracking-widest text-[10px]">
                      {s.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </ScrollArea>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <TabsContent value="all" className="space-y-6 mt-0">
                <div className="border border-primary rounded-none overflow-hidden bg-card">
                  <Table>
                    <TableHeader className="bg-accent/30">
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
                            <TableRow key={sale.id} className="hover:bg-accent border-primary transition-all group">
                              <TableCell className="pl-6 h-16">
                                <Badge variant="outline" className="rounded-none font-black text-[10px] uppercase">
                                  {sellers.find(s => s.id === sale.sellerId)?.name || sale.sellerId}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input 
                                    className="h-9 font-bold bg-accent rounded-none border-primary" 
                                    value={editCard} 
                                    onChange={(e) => setEditCard(e.target.value)}
                                  />
                                ) : (
                                  <span className="font-bold uppercase text-xs">{sale.cardName}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {isEditing ? (
                                  <Input 
                                    className="h-9 w-28 text-right font-black bg-accent rounded-none border-primary ml-auto" 
                                    type="number" 
                                    step="0.01" 
                                    value={editPrice} 
                                    onChange={(e) => setEditPrice(e.target.value)} 
                                  />
                                ) : (
                                  <span className="font-black">£{sale.price.toFixed(2)}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {sale.payoutStatus === 'paid' ? (
                                  <Badge className="bg-primary text-primary-foreground border-none text-[8px] rounded-none uppercase">
                                    {sale.paymentMethod}
                                  </Badge>
                                ) : (
                                  <span className="text-[9px] font-black opacity-30 uppercase">Pending</span>
                                )}
                              </TableCell>
                              <TableCell className="pr-6">
                                <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                  {isEditing ? (
                                    <>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary rounded-none" onClick={() => {
                                        const priceNum = parseFloat(editPrice);
                                        if (editCard.trim() && !isNaN(priceNum)) {
                                          updateSale(sale.id!, { cardName: editCard.trim(), price: priceNum }, sale.profileOrigin);
                                          setEditingSaleId(null);
                                        }
                                      }}>
                                        <Check className="w-4 h-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground rounded-none" onClick={() => setEditingSaleId(null)}>
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary rounded-none" onClick={() => {
                                        setEditingSaleId(sale.id!);
                                        setEditCard(sale.cardName);
                                        setEditPrice(sale.price.toString());
                                      }}>
                                        <Pencil className="w-4 h-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary rounded-none" onClick={() => deleteSale(sale.id!, sale.profileOrigin)}>
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
                          <TableCell colSpan={5} className="h-48 text-center text-muted-foreground italic">
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
                    <div className="border border-primary rounded-none overflow-hidden bg-card">
                      <Table>
                        <TableHeader className="bg-accent/30">
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
                              <TableRow key={sale.id} className="hover:bg-accent border-primary transition-all group">
                                <TableCell className="pl-6 h-16 font-bold uppercase text-xs">{sale.cardName}</TableCell>
                                <TableCell className="text-right font-black">£{sale.price.toFixed(2)}</TableCell>
                                <TableCell className="text-right">
                                  {sale.payoutStatus === 'paid' ? (
                                    <Badge className="bg-primary text-primary-foreground rounded-none text-[8px] uppercase">
                                      {sale.paymentMethod}
                                    </Badge>
                                  ) : (
                                    <span className="text-[9px] font-black opacity-30 uppercase">Pending</span>
                                  )}
                                </TableCell>
                                <TableCell className="pr-6">
                                  <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary rounded-none" onClick={() => deleteSale(sale.id!, sale.profileOrigin)}>
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">
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
          <h3 className="text-xl font-black tracking-tight uppercase flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-2"><Coins className="w-5 h-5" /></div>
            Live Activity
          </h3>

          <Card className="shadow-none border border-primary h-[400px] rounded-none overflow-hidden bg-card">
            <CardHeader className="pb-4 bg-accent/30 border-b">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4" /> Vault History
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[320px] p-6">
                {(profileId === 'seller' ? sellerDailySales : allDailySales).length > 0 ? (
                  <div className="space-y-4">
                    {(profileId === 'seller' ? sellerDailySales : allDailySales).map((act, i) => (
                      <div key={i} className="flex justify-between items-center text-sm bg-accent/20 p-4 border border-primary hover:bg-white transition-all">
                        <div className="space-y-1">
                          <div className="font-black uppercase text-xs">{act.cardName}</div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter rounded-none">
                              {sellers.find(s => s.id === act.sellerId)?.name || act.sellerId}
                            </Badge>
                            <span className="text-[9px] font-black opacity-50 uppercase">{act.saleDate}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                           <div className="font-black">£{act.price.toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 opacity-40">
                    <p className="text-[10px] font-black uppercase italic">Vault is empty.</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
           <Card className="shadow-none border border-primary rounded-none overflow-hidden bg-card">
            <CardHeader className="pb-4 bg-accent/30 border-b">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Search className="w-4 h-4" /> Global Search
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" />
                <Input 
                  placeholder="SEARCH TRANSACTIONS..." 
                  className="pl-12 h-14 bg-accent/30 border border-primary rounded-none font-bold uppercase text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {searchQuery && (
                <ScrollArea className="mt-6 h-[250px] border-t border-primary/10 pt-4">
                  <div className="space-y-3">
                    {allDailySales.filter(s => s.cardName.toLowerCase().includes(searchQuery.toLowerCase())).map((res, i) => (
                      <div key={i} className="text-sm space-y-3 bg-accent/10 p-5 border border-primary">
                        <div className="flex justify-between items-center">
                          <span className="font-black text-lg uppercase">{res.cardName}</span>
                          <div className="font-black">£{res.price.toFixed(2)}</div>
                        </div>
                        <div className="text-[9px] font-black opacity-50 flex justify-between uppercase border-t border-primary/20 pt-2">
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

      <footer className="py-12 border-t mt-12 bg-accent/20">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <p className="text-xs font-bold opacity-60 max-w-2xl mx-auto uppercase tracking-wider">
            {LEGAL_STATEMENT}
          </p>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
            &copy; {new Date().getFullYear()} NC: Sales Tracker &bull; MONOCHROME VAULT v3.0
          </p>
        </div>
      </footer>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="rounded-none p-8 border border-primary shadow-none">
          <DialogHeader className="items-center text-center">
            <div className="bg-primary text-primary-foreground p-4 mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">Access Locked</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <Input
              type="password"
              placeholder="ENCRYPTION KEY..."
              className="h-14 bg-accent/30 border border-primary rounded-none text-center font-black tracking-widest text-xl"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
            />
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-3">
            <Button onClick={handlePasswordSubmit} className="w-full h-14 rounded-none font-black uppercase tracking-widest text-xs">Unlock Vault</Button>
            <Button variant="ghost" onClick={() => setIsPasswordDialogOpen(false)} className="w-full rounded-none font-black opacity-50 uppercase text-[10px]">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSellerPasswordDialogOpen} onOpenChange={setIsSellerPasswordDialogOpen}>
        <DialogContent className="rounded-none p-8 border border-primary shadow-none">
          <DialogHeader className="items-center text-center">
            <div className="bg-primary text-primary-foreground p-4 mb-4">
              <KeyRound className="w-8 h-8" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">Verification</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <Input
              type="password"
              placeholder="ACCESS KEY..."
              className="h-14 bg-accent/30 border border-primary rounded-none text-center font-black tracking-widest text-xl uppercase"
              value={sellerPasswordInput}
              onChange={(e) => setSellerPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSellerPasswordSubmit()}
            />
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-3">
            <Button onClick={handleSellerPasswordSubmit} className="w-full h-14 rounded-none font-black uppercase tracking-widest text-xs">Authorize</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingSeller} onOpenChange={() => setEditingSeller(null)}>
        <DialogContent className="rounded-none p-8 border border-primary shadow-none">
          <DialogHeader className="items-center text-center">
            <div className="bg-primary text-primary-foreground p-4 mb-4">
              <Settings2 className="w-8 h-8" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">Edit Entity</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest">Name</label>
              <Input
                className="h-12 bg-accent/30 border border-primary rounded-none font-bold uppercase"
                value={editSellerName}
                onChange={(e) => setEditSellerName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest">Comm %</label>
                <Input
                  type="number"
                  className="h-12 bg-accent/30 border border-primary rounded-none font-black"
                  value={editSellerComm}
                  onChange={(e) => setEditSellerComm(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest">Key</label>
                <Input
                  className="h-12 bg-accent/30 border border-primary rounded-none font-black uppercase"
                  value={editSellerPass}
                  onChange={(e) => setEditSellerPass(e.target.value.toUpperCase())}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-3">
            <Button onClick={handleSaveSeller} className="w-full h-14 rounded-none font-black uppercase tracking-widest text-xs">Save Changes</Button>
            {editingSeller?.archived ? (
              <Button variant="outline" onClick={() => handleArchiveSeller(editingSeller.id, false)} className="w-full h-12 rounded-none border-primary font-black uppercase text-[10px]">Reactivate</Button>
            ) : (
              <Button variant="outline" onClick={() => handleArchiveSeller(editingSeller!.id, true)} className="w-full h-12 rounded-none border-primary font-black uppercase text-[10px]">Archive</Button>
            )}
            <Button variant="ghost" onClick={() => setEditingSeller(null)} className="w-full rounded-none font-black opacity-50 uppercase text-[10px]">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSettlementDialogOpen} onOpenChange={setIsSettlementDialogOpen}>
        <DialogContent className="rounded-none p-8 border border-primary shadow-none">
          <DialogHeader className="items-center text-center">
            <div className="bg-primary text-primary-foreground p-4 mb-4">
              <Wallet className="w-8 h-8" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">Settle Payout</DialogTitle>
            <DialogDescription className="font-bold">
              Pay £{settlementBatch?.total.toFixed(2)} to {settlementBatch?.sellerId}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-8 grid grid-cols-2 gap-4">
             <Button 
               variant="outline" 
               className="h-24 flex-col rounded-none gap-2 border-primary hover:bg-accent"
               onClick={() => handleMarkBatchPaid('cash')}
             >
                <Banknote className="w-6 h-6" />
                <span className="font-black uppercase tracking-widest text-[10px]">Cash</span>
             </Button>
             <Button 
               variant="outline" 
               className="h-24 flex-col rounded-none gap-2 border-primary hover:bg-accent"
               onClick={() => handleMarkBatchPaid('transfer')}
             >
                <Send className="w-6 h-6" />
                <span className="font-black uppercase tracking-widest text-[10px]">Transfer</span>
             </Button>
          </div>
          <DialogFooter>
             <Button variant="ghost" onClick={() => setIsSettlementDialogOpen(false)} className="w-full rounded-none font-black opacity-50 uppercase text-[10px]">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}