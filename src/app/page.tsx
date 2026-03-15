
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
  ChevronRight,
  PieChart,
  Calculator,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Scale
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
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Cell, CartesianGrid, Legend } from "recharts";

import { useSales, Seller, ShopTotal, Expense } from "@/hooks/use-sales";
import { 
  useAuth, 
  useUser, 
  initiateAnonymousSignIn
} from "@/firebase";
import { useToast } from "@/hooks/use-toast";

// PDF Generation
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ProfileType = 'manager' | 'staff' | 'seller' | 'finance';

const MANAGER_PASSWORD = "Harley";
const AUTH_EXPIRY_KEY = "newt_manager_auth_expiry";
const LEGAL_STATEMENT = "Newtons collectables is a trading names for journey together tcg Ltd company house number 16503957";

const chartConfig = {
  inHouse: {
    label: "In-House Revenue",
    color: "hsl(var(--primary))",
  },
  commissions: {
    label: "Seller Commissions",
    color: "hsl(var(--chart-2))",
  },
  expenses: {
    label: "Expenses",
    color: "hsl(var(--destructive))",
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

  const { sellers, sales, combinedSalesData, shopTotals, expenses, isLoaded, addSeller, updateSeller, addSale, deleteSale, updateSale, markSalesAsPaid, setShopTotal, addExpense, deleteExpense } = useSales(profileId === 'seller' ? 'staff' : profileId);
  
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

  // Finance Inputs
  const [financeCash, setFinanceCash] = useState("");
  const [financeCard, setFinanceCard] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");

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
  
  useEffect(() => {
    if (activeSellers.length > 0 && !entrySellerId) {
      setEntrySellerId(activeSellers[0].id);
    }
  }, [activeSellers, entrySellerId]);

  const dailySalesData = useMemo(() => sales[selectedDate] || {}, [sales, selectedDate]);
  const allDailySales = useMemo(() => Object.values(dailySalesData).flat().sort((a, b) => (a.id || '').localeCompare(b.id || '')), [dailySalesData]);
  const sellerDailySales = useMemo(() => (profileId !== 'seller' || !authenticatedSellerId) ? [] : dailySalesData[authenticatedSellerId] || [], [profileId, authenticatedSellerId, dailySalesData]);

  // Finance calculations
  const currentDayFinance = useMemo(() => shopTotals.find(t => t.date === selectedDate), [shopTotals, selectedDate]);
  const currentDayExpenses = useMemo(() => expenses.filter(e => e.date === selectedDate), [expenses, selectedDate]);

  const sellerStats = useMemo(() => {
    const total = sellerDailySales.reduce((acc, s) => acc + s.price, 0);
    const comm = sellerDailySales.reduce((acc, s) => acc + (s.commission || 0), 0);
    return {
      total,
      commission: comm,
      payout: total - comm,
      payoutDate: selectedDate ? format(addDays(parseISO(selectedDate), 13), "PPP") : "N/A"
    };
  }, [sellerDailySales, selectedDate]);

  // Comprehensive Financial Logic
  const financialSummary = useMemo(() => {
    if (profileId !== 'manager') return null;

    const totalSellerGross = allDailySales.reduce((acc, s) => acc + s.price, 0);
    const totalSellerCommission = allDailySales.reduce((acc, s) => acc + (s.commission || 0), 0);
    const totalSellerPayoutLiability = totalSellerGross - totalSellerCommission;
    
    const shopIntake = currentDayFinance?.totalIntake || 0;
    const inHouseRevenue = Math.max(0, shopIntake - totalSellerGross);
    
    const totalExpenses = currentDayExpenses.reduce((acc, e) => acc + e.amount, 0);
    
    // Settlements Paid today
    const settlementsPaidToday = combinedSalesData.reduce((acc, s) => {
      const isPaidToday = s.payoutStatus === 'paid' && s.paidAt && s.paidAt.startsWith(selectedDate);
      return isPaidToday ? acc + (s.price - (s.commission || 0)) : acc;
    }, 0);

    const netProfit = inHouseRevenue + totalSellerCommission - totalExpenses;
    const runningCashPosition = shopIntake - totalExpenses - settlementsPaidToday;

    return {
      intake: shopIntake,
      inHouseRevenue,
      sellerGross: totalSellerGross,
      sellerCommission: totalSellerCommission,
      sellerLiability: totalSellerPayoutLiability,
      expenses: totalExpenses,
      settlementsPaid: settlementsPaidToday,
      netProfit,
      runningCashPosition
    };
  }, [profileId, allDailySales, currentDayFinance, currentDayExpenses, combinedSalesData, selectedDate]);

  const chartData = useMemo(() => {
    if (!financialSummary) return [];
    return [{
      name: format(parseISO(selectedDate), "MMM d"),
      inHouse: financialSummary.inHouseRevenue,
      commissions: financialSummary.sellerCommission,
      expenses: financialSummary.expenses
    }];
  }, [financialSummary, selectedDate]);

  const payoutForecast = useMemo(() => {
    if (profileId !== 'manager') return null;
    const today = startOfDay(new Date());
    const thisFridayDate = startOfDay(nextFriday(today));
    const nextFridayDate = startOfDay(addWeeks(thisFridayDate, 1));

    const forecast = {
      thisFriday: { date: thisFridayDate, total: 0, count: 0, sellers: {} as Record<string, { total: number, ids: string[], originMap: Record<string, string> }> },
      nextFriday: { date: nextFridayDate, total: 0, count: 0, sellers: {} as Record<string, { total: number, ids: string[], originMap: Record<string, string> }> }
    };

    combinedSalesData.forEach(sale => {
      if (sale.payoutStatus === 'paid') return;
      const saleDateObj = parseISO(sale.saleDate);
      const maturityDate = startOfDay(addDays(saleDateObj, 13));
      const net = sale.price - (sale.commission || 0);
      const seller = sellers.find(s => s.id === sale.sellerId);
      const sellerName = seller?.name || sale.sellerId;

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
      localStorage.setItem(AUTH_EXPIRY_KEY, (new Date().getTime() + 86400000).toString());
      setIsManagerAuthenticated(true);
      setProfileId('manager');
      setIsPasswordDialogOpen(false);
      setPasswordInput("");
      toast({ title: "Authenticated", description: "Manager session active." });
    } else {
      toast({ variant: "destructive", title: "Access Denied", description: "Incorrect password." });
    }
  };

  const handleSellerSelect = (sellerId: string) => {
    setSelectedSellerId(sellerId);
    if (isManagerAuthenticated) {
      setAuthenticatedSellerId(sellerId);
    } else {
      setAuthenticatedSellerId(null);
      setIsSellerPasswordDialogOpen(true);
    }
  };

  const handleSellerPasswordSubmit = () => {
    const seller = sellers.find(s => s.id === selectedSellerId);
    if (seller && seller.password === sellerPasswordInput) {
      setAuthenticatedSellerId(selectedSellerId);
      setIsSellerPasswordDialogOpen(false);
      toast({ title: "Authorized", description: `Welcome, ${seller.name}.` });
    } else {
      toast({ variant: "destructive", title: "Access Denied", description: "Incorrect key." });
    }
  };

  const handleAddSale = () => {
    const priceNum = parseFloat(newSalePrice);
    if (entrySellerId && newSaleCard.trim() && !isNaN(priceNum)) {
      addSale(selectedDate, entrySellerId, newSaleCard.trim(), priceNum);
      setNewSaleCard("");
      setNewSalePrice("");
      toast({ title: "Success", description: "Transaction logged." });
    }
  };

  const handleMarkBatchPaid = (method: 'cash' | 'transfer') => {
    if (settlementBatch) {
      markSalesAsPaid(settlementBatch.saleIds, method, settlementBatch.originMap);
      setIsSettlementDialogOpen(false);
      setSettlementBatch(null);
      toast({ title: "Settlement Confirmed", description: "Payout recorded in daily audit." });
    }
  };

  const handleSaveFinance = () => {
    const cashNum = parseFloat(financeCash);
    const cardNum = parseFloat(financeCard);
    if (!isNaN(cashNum) && !isNaN(cardNum)) {
      setShopTotal(selectedDate, cashNum, cardNum);
      toast({ title: "Finance Logged", description: "Daily intake updated for the shared vault." });
    }
  };

  const handleAddExpense = () => {
    const amt = parseFloat(expenseAmount);
    if (expenseDesc && !isNaN(amt)) {
      addExpense(selectedDate, expenseDesc, amt);
      setExpenseDesc("");
      setExpenseAmount("");
      toast({ title: "Expense Added", description: "Recorded in the finance ledger." });
    }
  };

  const handleDownloadPDF = () => {
    if (!authenticatedSellerId) return;
    const seller = sellers.find(s => s.id === authenticatedSellerId);
    if (!seller) return;

    const doc = new jsPDF();
    const uniqueEvents = Array.from(new Set(combinedSalesData.map(s => `${s.sellerId}_${s.saleDate}`))).sort();
    const currentEvent = `${authenticatedSellerId}_${selectedDate}`;
    const invoiceNum = 1098 + uniqueEvents.indexOf(currentEvent);

    doc.setFontSize(22);
    doc.text("Newton's Collectables", 14, 20);
    doc.setFontSize(10);
    doc.text(`INVOICE #${invoiceNum}`, 196, 20, { align: 'right' });
    doc.line(14, 33, 196, 33);
    doc.text(`Seller: ${seller.name}`, 14, 43);
    doc.text(`Report Date: ${selectedDate}`, 14, 48);

    autoTable(doc, {
      startY: 63,
      head: [['Card Details', 'Gross Price', 'Status', 'Your Payout']],
      body: sellerDailySales.map(sale => [
        sale.cardName, 
        `£${sale.price.toFixed(2)}`, 
        sale.payoutStatus || 'Pending',
        `£${(sale.price - (sale.commission || 0)).toFixed(2)}`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [0, 0, 0] },
      margin: { top: 60 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.rect(120, finalY, 76, 35);
    doc.text(`Gross: £${sellerStats.total.toFixed(2)}`, 125, finalY + 12);
    doc.text(`NC Commission: £${sellerStats.commission.toFixed(2)}`, 125, finalY + 18);
    doc.setFont(undefined, 'bold');
    doc.text(`Net Payout: £${sellerStats.payout.toFixed(2)}`, 125, finalY + 28);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(LEGAL_STATEMENT, 14, 285, { maxWidth: 180 });
    doc.save(`NC_Invoice_${invoiceNum}.pdf`);
  };

  if (!isLoaded || isUserLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-8 max-w-7xl mx-auto transition-all duration-500 animate-in fade-in">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex flex-col">
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 flex items-center gap-2">
            <span className="text-primary italic">NC:</span> Sales Tracker
          </h1>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Professional Transaction Oversight</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl gap-2 shadow-sm h-11 px-6">
                <span className="font-bold uppercase tracking-widest text-xs">Vault: {profileId}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl p-2">
              <DropdownMenuItem onClick={() => handleProfileSwitch('manager')} className="gap-3 py-3"><ShieldCheck className="w-5 h-5" /> MANAGER</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleProfileSwitch('staff')} className="gap-3 py-3"><UserCircle className="w-5 h-5" /> STAFF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleProfileSwitch('seller')} className="gap-3 py-3"><User className="w-5 h-5" /> SELLER</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleProfileSwitch('finance')} className="gap-3 py-3"><Receipt className="w-5 h-5" /> FINANCE</DropdownMenuItem>
              {isManagerAuthenticated && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="gap-3 py-3 text-destructive"><LogOut className="w-5 h-5" /> EXIT</DropdownMenuItem>
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

      {/* Financial Oversight (Manager Only) */}
      {profileId === 'manager' && financialSummary && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-bottom-4 duration-700">
            <Card className="border-none shadow-sm rounded-2xl bg-white border-l-4 border-l-primary">
              <CardHeader className="p-5 pb-1">
                <CardTitle className="text-[10px] font-black uppercase text-slate-400">Total Shop Intake</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="text-2xl font-black">£{financialSummary.intake.toFixed(2)}</div>
                <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase mt-1">
                  <ArrowUpRight className="w-2 h-2 text-green-500" /> All-in Revenue
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-sm rounded-2xl bg-white">
              <CardHeader className="p-5 pb-1">
                <CardTitle className="text-[10px] font-black uppercase text-slate-400">Daily Net Profit</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="text-2xl font-black text-green-600">£{financialSummary.netProfit.toFixed(2)}</div>
                <div className="text-[8px] font-bold text-slate-400 uppercase mt-1">After Liabilities & Costs</div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-2xl bg-white">
              <CardHeader className="p-5 pb-1">
                <CardTitle className="text-[10px] font-black uppercase text-slate-400">Paid Settlements Today</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="text-2xl font-black text-destructive">£{financialSummary.settlementsPaid.toFixed(2)}</div>
                <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase mt-1">
                  <ArrowDownRight className="w-2 h-2 text-destructive" /> Outflow recorded
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-2xl bg-primary text-white">
              <CardHeader className="p-5 pb-1">
                <CardTitle className="text-[10px] font-black uppercase text-white/60">Net Cash Position</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="text-2xl font-black">£{financialSummary.runningCashPosition.toFixed(2)}</div>
                <div className="text-[8px] font-bold text-white/40 uppercase mt-1">Running Balance (Intake - Paid)</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 shadow-sm border-none rounded-3xl bg-white overflow-hidden">
              <CardHeader className="p-8 border-b bg-slate-50/20">
                <CardTitle className="text-sm font-black uppercase flex items-center justify-between">
                  Daily Revenue Composition
                  <Badge variant="outline" className="text-[8px] font-black bg-white">TREND ANALYSIS</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <BarChart data={chartData}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="name" hide />
                    <YAxis hide />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="inHouse" fill="var(--color-inHouse)" radius={4} name="In-House Gross" />
                    <Bar dataKey="commissions" fill="var(--color-commissions)" radius={4} name="NC Commission" />
                    <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} name="Expenses" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-none rounded-3xl bg-white overflow-hidden">
              <CardHeader className="p-8 border-b bg-slate-50/20">
                <CardTitle className="text-sm font-black uppercase">Revenue Split</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-slate-400">In-House Sales</span>
                    <span className="font-black text-primary">£{financialSummary.inHouseRevenue.toFixed(2)}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${(financialSummary.inHouseRevenue / financialSummary.intake) * 100}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-[10px] font-black uppercase text-slate-400">External Seller Gross</span>
                    <span className="font-black text-slate-700">£{financialSummary.sellerGross.toFixed(2)}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-slate-300" 
                      style={{ width: `${(financialSummary.sellerGross / financialSummary.intake) * 100}%` }}
                    />
                  </div>

                  <Separator />
                  
                  <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold uppercase text-slate-400">Total NC Commission Earned</span>
                      <span className="font-black text-green-600">£{financialSummary.sellerCommission.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold uppercase text-slate-400">Owed to Sellers (Unpaid)</span>
                      <span className="font-black text-destructive">£{financialSummary.sellerLiability.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Finance Portal (Staff/Finance) */}
      {profileId === 'finance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-1000">
          <Card className="shadow-sm border-none rounded-2xl bg-white">
            <CardHeader className="border-b bg-slate-50/20">
              <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                <Calculator className="w-4 h-4 text-primary" /> Daily Intake Entry
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Cash Intake</label>
                  <Input type="number" placeholder="0.00" value={financeCash} onChange={(e) => setFinanceCash(e.target.value)} className="h-12 rounded-xl font-black" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Card Intake</label>
                  <Input type="number" placeholder="0.00" value={financeCard} onChange={(e) => setFinanceCard(e.target.value)} className="h-12 rounded-xl font-black" />
                </div>
              </div>
              <Button onClick={handleSaveFinance} className="w-full h-12 rounded-xl font-black uppercase text-xs">Sync Daily Intake</Button>
              {currentDayFinance && (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center">
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Total Recorded Intake</p>
                  <p className="text-3xl font-black text-primary">£{currentDayFinance.totalIntake.toFixed(2)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-none rounded-2xl bg-white">
            <CardHeader className="border-b bg-slate-50/20">
              <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" /> Shop Expenses
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input placeholder="Description..." value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)} className="h-12 rounded-xl font-bold" />
                <Input type="number" placeholder="Amount" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className="h-12 rounded-xl font-black" />
              </div>
              <Button onClick={handleAddExpense} className="w-full h-12 rounded-xl font-black uppercase text-xs">Log Expense</Button>
              <Separator />
              <ScrollArea className="h-[150px]">
                <div className="space-y-2">
                  {currentDayExpenses.map((exp) => (
                    <div key={exp.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="font-bold text-xs uppercase">{exp.description}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-destructive">£{exp.amount.toFixed(2)}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteExpense(exp.id!)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sales Entry (Staff Profile) */}
      {profileId === 'staff' && (
        <Card className="shadow-sm border-none rounded-2xl overflow-hidden bg-white">
          <CardHeader className="border-b bg-slate-50/20 px-8 py-6 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-primary" />
              <CardTitle className="text-xl font-black uppercase">Sales Ledger</CardTitle>
            </div>
            <Badge className="bg-primary text-white font-black">{selectedDate}</Badge>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-50/50 p-8 rounded-3xl items-end border shadow-inner">
              <div className="md:col-span-3 space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400">Seller Entity</label>
                <Select value={entrySellerId} onValueChange={setEntrySellerId}>
                  <SelectTrigger className="bg-white h-12 rounded-xl px-4 font-bold text-sm">
                    <SelectValue placeholder="Select seller" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {activeSellers.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="font-bold py-3 uppercase text-xs">{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-5 space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400">Card Detail</label>
                <Input 
                  placeholder="e.g., Rare Holographic Charizard" 
                  className="bg-white h-12 rounded-xl px-4 font-bold"
                  value={newSaleCard}
                  onChange={(e) => setNewSaleCard(e.target.value)}
                />
              </div>
              <div className="md:col-span-2 space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400">Price</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-primary">£</span>
                  <Input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00" 
                    className="bg-white h-12 rounded-xl pl-8 font-black"
                    value={newSalePrice}
                    onChange={(e) => setNewSalePrice(e.target.value)}
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <Button 
                  className="w-full h-12 rounded-xl font-black uppercase text-xs"
                  onClick={handleAddSale}
                  disabled={!entrySellerId || !newSaleCard.trim() || !newSalePrice}
                >
                  Log Sale
                </Button>
              </div>
            </div>

            <div className="border rounded-2xl overflow-hidden bg-white shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="font-black uppercase text-[10px] h-14 pl-6">Seller</TableHead>
                    <TableHead className="font-black uppercase text-[10px] h-14">Card Detail</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px] h-14 pr-6">Sale Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allDailySales.length > 0 ? (
                    allDailySales.map((sale) => (
                      <TableRow key={sale.id} className="hover:bg-slate-50/50 h-16">
                        <TableCell className="pl-6">
                          <Badge variant="outline" className="font-black text-[10px] uppercase bg-white">
                            {sellers.find(s => s.id === sale.sellerId)?.name || sale.sellerId}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold uppercase text-xs">{sale.cardName}</TableCell>
                        <TableCell className="text-right pr-6 font-black text-base">£{sale.price.toFixed(2)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-48 text-center text-slate-400 italic">No records for {selectedDate}.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payout Forecasting (Manager Only) */}
      {profileId === 'manager' && payoutForecast && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-6 duration-1000">
           {[
             { batch: payoutForecast.thisFriday, title: "This Friday", icon: ArrowRightLeft, color: "primary" },
             { batch: payoutForecast.nextFriday, title: "Next Friday", icon: Clock, color: "slate-200" }
           ].map((item, idx) => (
             <Card key={idx} className={`shadow-sm border-none rounded-2xl overflow-hidden bg-white border-l-8 border-l-${item.color}`}>
               <CardHeader className="bg-slate-50 px-6 py-4 border-b flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary text-white p-2 rounded-xl"><item.icon className="w-4 h-4" /></div>
                    <div>
                      <CardTitle className="text-lg font-black uppercase">{item.title}</CardTitle>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{format(item.batch.date, "PPP")}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black">£{item.batch.total.toFixed(2)}</span>
                  </div>
               </CardHeader>
               <CardContent className="p-6 space-y-3">
                  {Object.entries(item.batch.sellers).map(([name, data], i) => (
                    <div key={i} className="flex justify-between items-center text-xs p-3 rounded-xl bg-slate-50 group border border-transparent hover:border-primary/10 transition-all">
                      <span className="font-bold uppercase tracking-widest text-[10px] text-slate-600">{name}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-slate-900">£{data.total.toFixed(2)}</span>
                        <Button 
                          size="sm" 
                          className="h-7 px-3 text-[8px] font-black uppercase rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
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
                  {item.batch.count === 0 && (
                    <p className="text-center text-[10px] italic text-slate-400 py-4">No settlements due</p>
                  )}
               </CardContent>
             </Card>
           ))}
        </div>
      )}

      {/* Personal Seller Portal */}
      {profileId === 'seller' && (
        <div className="space-y-8 animate-in zoom-in-95 duration-700">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <Card className="w-full md:w-1/3 shadow-sm border-none rounded-3xl overflow-hidden bg-white">
               <CardHeader className="p-8 pb-4">
                 <CardTitle className="text-[10px] font-black uppercase text-slate-400">Entity Selection</CardTitle>
               </CardHeader>
               <CardContent className="p-8 pt-0 space-y-6">
                  <Select value={selectedSellerId} onValueChange={handleSellerSelect}>
                    <SelectTrigger className="h-14 rounded-2xl font-black border-slate-100 bg-slate-50">
                      <SelectValue placeholder="WHICH SELLER?" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {activeSellers.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="font-bold py-4 uppercase text-xs">{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {authenticatedSellerId && (
                    <Button onClick={handleDownloadPDF} variant="outline" className="w-full h-12 rounded-2xl gap-2 font-black uppercase text-[10px]">
                      <Download className="w-4 h-4" /> Export Report (PDF)
                    </Button>
                  )}
               </CardContent>
            </Card>

            {authenticatedSellerId && (
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                <Card className="shadow-sm border-none rounded-3xl bg-white group hover:shadow-xl transition-all duration-500">
                  <CardHeader className="p-6 pb-2"><CardTitle className="text-[10px] font-black uppercase text-slate-400">Gross Sales</CardTitle></CardHeader>
                  <CardContent className="p-6 pt-0"><div className="text-4xl font-black tracking-tighter">£{sellerStats.total.toFixed(2)}</div></CardContent>
                </Card>
                <Card className="shadow-sm border-none rounded-3xl bg-white">
                  <CardHeader className="p-6 pb-2"><CardTitle className="text-[10px] font-black uppercase text-slate-400">NC Commission</CardTitle></CardHeader>
                  <CardContent className="p-6 pt-0"><div className="text-4xl font-black tracking-tighter text-destructive">£{sellerStats.commission.toFixed(2)}</div></CardContent>
                </Card>
                <Card className="shadow-sm border-none rounded-3xl bg-primary text-white">
                  <CardHeader className="p-6 pb-2"><CardTitle className="text-[10px] font-black uppercase text-white/60">Net Payout</CardTitle></CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="text-4xl font-black tracking-tighter">£{sellerStats.payout.toFixed(2)}</div>
                    <div className="mt-2 flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-white/50">
                      <Clock className="w-2.5 h-2.5" /> Due: {sellerStats.payoutDate}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {authenticatedSellerId && (
            <Card className="shadow-sm border-none rounded-3xl bg-white overflow-hidden">
               <CardHeader className="p-8 border-b bg-slate-50/20"><CardTitle className="text-sm font-black uppercase">Transaction Itemization</CardTitle></CardHeader>
               <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50/50"><TableRow><TableHead className="pl-8 h-12 uppercase text-[10px] font-black">Item</TableHead><TableHead className="h-12 uppercase text-[10px] font-black">Gross</TableHead><TableHead className="h-12 uppercase text-[10px] font-black">Status</TableHead><TableHead className="text-right pr-8 h-12 uppercase text-[10px] font-black">Net</TableHead></TableRow></TableHeader>
                    <TableBody>
                       {sellerDailySales.map((sale) => (
                         <TableRow key={sale.id} className="h-16 hover:bg-slate-50/30">
                           <TableCell className="pl-8 font-bold uppercase text-xs">{sale.cardName}</TableCell>
                           <TableCell className="font-bold">£{sale.price.toFixed(2)}</TableCell>
                           <TableCell><Badge variant={sale.payoutStatus === 'paid' ? 'default' : 'outline'} className="text-[8px] uppercase font-black">{sale.payoutStatus || 'Pending'}</Badge></TableCell>
                           <TableCell className="text-right pr-8 font-black text-primary">£{(sale.price - (sale.commission || 0)).toFixed(2)}</TableCell>
                         </TableRow>
                       ))}
                       {sellerDailySales.length === 0 && <TableRow><TableCell colSpan={4} className="h-48 text-center text-slate-300 italic">No sales logged for this date.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
               </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Global Branding Footer */}
      <footer className="py-12 border-t mt-12 bg-slate-50/50 rounded-t-3xl text-center space-y-4">
        <p className="text-xs font-bold text-slate-400 max-w-2xl mx-auto uppercase tracking-wider">
          {LEGAL_STATEMENT}
        </p>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
          &copy; {new Date().getFullYear()} NC: Sales Tracker &bull; Dynamic Enterprise Dashboard
        </p>
      </footer>

      {/* Auth & Management Dialogs */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="rounded-3xl p-8 border-none shadow-2xl">
          <DialogHeader className="items-center text-center">
            <div className="bg-primary/10 text-primary p-4 rounded-3xl mb-4"><Lock className="w-8 h-8" /></div>
            <DialogTitle className="text-2xl font-black uppercase">Access Locked</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <Input 
              type="password" 
              placeholder="ENCRYPTION KEY..." 
              className="h-14 bg-slate-50 border-none rounded-2xl text-center font-black tracking-widest text-xl text-primary"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
            />
          </div>
          <DialogFooter className="flex-col gap-3">
            <Button onClick={handlePasswordSubmit} className="w-full h-14 rounded-2xl font-black uppercase text-xs">Unlock Vault</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSellerPasswordDialogOpen} onOpenChange={setIsSellerPasswordDialogOpen}>
        <DialogContent className="rounded-3xl p-8 border-none shadow-2xl">
          <DialogHeader className="items-center text-center">
            <div className="bg-primary/10 text-primary p-4 rounded-3xl mb-4"><KeyRound className="w-8 h-8" /></div>
            <DialogTitle className="text-2xl font-black uppercase">Identity Verification</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <Input 
              type="password" 
              placeholder="ENTER PERSONAL KEY..." 
              className="h-14 bg-slate-50 border-none rounded-2xl text-center font-black tracking-widest text-xl"
              value={sellerPasswordInput}
              onChange={(e) => setSellerPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSellerPasswordSubmit()}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleSellerPasswordSubmit} className="w-full h-14 rounded-2xl font-black uppercase text-xs">Authorize Access</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSettlementDialogOpen} onOpenChange={setIsSettlementDialogOpen}>
        <DialogContent className="rounded-3xl p-8 border-none shadow-2xl">
          <DialogHeader className="items-center text-center">
            <div className="bg-primary/10 text-primary p-4 rounded-3xl mb-4"><Wallet className="w-8 h-8" /></div>
            <DialogTitle className="text-2xl font-black uppercase">Settle Payout</DialogTitle>
            <DialogDescription className="text-slate-500 font-bold">
              Confirm settlement of £{settlementBatch?.total.toFixed(2)} to {settlementBatch?.sellerId}. 
              This will mark all associated cards as paid.
            </DialogDescription>
          </DialogHeader>
          <div className="py-8 grid grid-cols-2 gap-4">
             <Button variant="outline" className="h-24 flex-col rounded-2xl gap-2 border-slate-100 hover:bg-primary/5 transition-all" onClick={() => handleMarkBatchPaid('cash')}>
               <Banknote className="w-6 h-6" />
               <span className="font-black uppercase text-[10px]">Cash</span>
             </Button>
             <Button variant="outline" className="h-24 flex-col rounded-2xl gap-2 border-slate-100 hover:bg-primary/5 transition-all" onClick={() => handleMarkBatchPaid('transfer')}>
               <Send className="w-6 h-6" />
               <span className="font-black uppercase text-[10px]">Transfer</span>
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
