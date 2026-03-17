
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
  Scale,
  TrendingDown,
  Briefcase,
  LayoutDashboard,
  Box,
  MoreVertical
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

import { useSales, Seller, ShopTotal, Expense, Sale } from "@/hooks/use-sales";
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

const THEMES: Record<ProfileType, { primary: string; ring: string }> = {
  manager: { primary: "222 47% 11%", ring: "222 47% 11%" }, 
  staff: { primary: "221 83% 53%", ring: "221 83% 53%" },   
  seller: { primary: "142 71% 45%", ring: "142 71% 45%" },  
  finance: { primary: "38 92% 50%", ring: "38 92% 50%" },   
};

// Helper to aggregate sales (grouping pack sales)
function aggregateSales(salesList: Sale[]) {
  const packsMap: Record<string, Sale> = {};
  const cardsList: Sale[] = [];

  salesList.forEach(sale => {
    if (sale.cardName.startsWith("Booster Packs")) {
      const key = `${sale.sellerId}_${sale.saleDate}`;
      if (!packsMap[key]) {
        packsMap[key] = {
          ...sale,
          cardName: "Booster Packs (Aggregated)",
          price: 0,
          commission: 0,
          id: `aggregated-packs-${key}` // Pseudo-id for table rendering
        };
      }
      packsMap[key].price += sale.price;
      packsMap[key].commission += (sale.commission || 0);
    } else {
      cardsList.push(sale);
    }
  });

  return [...cardsList, ...Object.values(packsMap)].sort((a, b) => (a.id || '').localeCompare(b.id || ''));
}

export default function Dashboard() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const { toast } = useToast();
  
  const [profileId, setProfileId] = useState<ProfileType>('staff');
  const [isMounted, setIsMounted] = useState(false);
  
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [isManagerAuthenticated, setIsManagerAuthenticated] = useState(false);

  const [selectedSellerId, setSelectedSellerId] = useState<string>("");
  const [isSellerPasswordDialogOpen, setIsSellerPasswordDialogOpen] = useState(false);
  const [sellerPasswordInput, setSellerPasswordInput] = useState("");
  const [authenticatedSellerId, setAuthenticatedSellerId] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>("");

  const { 
    sellers, 
    sales, 
    combinedSalesData, 
    shopTotals, 
    expenses, 
    isLoaded, 
    addSeller, 
    updateSeller, 
    addSale, 
    deleteSale, 
    updateSale, 
    markSalesAsPaid, 
    setShopTotal, 
    deleteShopTotal,
    addExpense, 
    deleteExpense 
  } = useSales(profileId === 'seller' ? 'staff' : profileId);
  
  const [newSaleCard, setNewSaleCard] = useState("");
  const [newSalePrice, setNewSalePrice] = useState("");
  const [entrySellerId, setEntrySellerId] = useState("");

  const [newPackQuantity, setNewPackQuantity] = useState("1");
  const [newPackPrice, setNewPackPrice] = useState("");

  // Edit Sale Dialog State
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editSaleCard, setEditSaleCard] = useState("");
  const [editSalePrice, setEditSalePrice] = useState("");
  const [editSaleSellerId, setEditSaleSellerId] = useState("");

  const [isSettlementDialogOpen, setIsSettlementDialogOpen] = useState(false);
  const [settlementBatch, setSettlementBatch] = useState<{ sellerId: string, saleIds: string[], originMap: Record<string, string>, total: number } | null>(null);

  const [financeCash, setFinanceCash] = useState("");
  const [financeCard, setFinanceCard] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");

  useEffect(() => {
    setIsMounted(true);
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

  const currentDayFinance = useMemo(() => {
    if (!isMounted || !selectedDate) return null;
    return shopTotals.find(t => t.date === selectedDate) || null;
  }, [shopTotals, selectedDate, isMounted]);
  
  useEffect(() => {
    if (currentDayFinance) {
      setFinanceCash(currentDayFinance.cashIntake.toString());
      setFinanceCard(currentDayFinance.cardIntake.toString());
    } else {
      setFinanceCash("");
      setFinanceCard("");
    }
  }, [currentDayFinance]);

  const currentDayExpenses = useMemo(() => {
    if (!isMounted || !selectedDate) return [];
    return expenses.filter(e => e.date === selectedDate);
  }, [expenses, selectedDate, isMounted]);

  const dailySalesData = useMemo(() => {
    if (!isMounted || !selectedDate) return {};
    return sales[selectedDate] || {};
  }, [sales, selectedDate, isMounted]);

  const allDailySalesRaw = useMemo(() => {
    return Object.values(dailySalesData).flat();
  }, [dailySalesData]);

  const allDailySalesAggregated = useMemo(() => {
    return aggregateSales(allDailySalesRaw);
  }, [allDailySalesRaw]);

  // Managers in Staff Vault see raw sales list to allow individual management
  const staffVaultTableData = useMemo(() => {
    return isManagerAuthenticated ? allDailySalesRaw : allDailySalesAggregated;
  }, [isManagerAuthenticated, allDailySalesRaw, allDailySalesAggregated]);

  const sellerDailySalesRaw = useMemo(() => {
    if (!profileId || !authenticatedSellerId || !dailySalesData) return [];
    return dailySalesData[authenticatedSellerId] || [];
  }, [profileId, authenticatedSellerId, dailySalesData]);

  const sellerDailySalesAggregated = useMemo(() => {
    return aggregateSales(sellerDailySalesRaw);
  }, [sellerDailySalesRaw]);

  const sellerStats = useMemo(() => {
    if (!isMounted) return { total: 0, commission: 0, payout: 0, payoutDate: "N/A" };
    const total = sellerDailySalesRaw.reduce((acc, s) => acc + s.price, 0);
    const comm = sellerDailySalesRaw.reduce((acc, s) => acc + (s.commission || 0), 0);
    return {
      total,
      commission: comm,
      payout: total - comm,
      payoutDate: selectedDate ? format(addDays(parseISO(selectedDate), 13), "PPP") : "N/A"
    };
  }, [sellerDailySalesRaw, selectedDate, isMounted]);

  const financialSummary = useMemo(() => {
    if (profileId !== 'manager' || !isMounted) return null;

    const totalSellerGross = allDailySalesRaw.reduce((acc, s) => acc + s.price, 0);
    const totalSellerCommission = allDailySalesRaw.reduce((acc, s) => acc + (s.commission || 0), 0);
    const totalSellerPayoutLiability = totalSellerGross - totalSellerCommission;
    
    const shopIntake = currentDayFinance?.totalIntake || 0;
    const inHouseRevenue = Math.max(0, shopIntake - totalSellerGross);
    
    const totalExpenses = currentDayExpenses.reduce((acc, e) => acc + e.amount, 0);
    
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
      runningCashPosition,
      totalDailyVolume: totalSellerGross 
    };
  }, [profileId, allDailySalesRaw, currentDayFinance, currentDayExpenses, combinedSalesData, selectedDate, isMounted]);

  const globalAudit = useMemo(() => {
    if (profileId !== 'manager' || !isMounted) return null;

    const totalIntake = shopTotals.reduce((acc, t) => acc + t.totalIntake, 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const totalCommission = combinedSalesData.reduce((acc, s) => acc + (s.commission || 0), 0);
    const totalSellerGross = combinedSalesData.reduce((acc, s) => acc + s.price, 0);
    const totalInHouseRevenue = Math.max(0, totalIntake - totalSellerGross);
    const totalPaidSettlements = combinedSalesData.reduce((acc, s) => {
      return s.payoutStatus === 'paid' ? acc + (s.price - (s.commission || 0)) : acc;
    }, 0);
    const totalUnpaidLiability = combinedSalesData.reduce((acc, s) => {
      return s.payoutStatus !== 'paid' ? acc + (s.price - (s.commission || 0)) : acc;
    }, 0);
    const netProfit = totalInHouseRevenue + totalCommission - totalExpenses;
    const currentLiquidity = totalIntake - totalExpenses - totalPaidSettlements;

    return {
      totalIntake,
      totalExpenses,
      totalCommission,
      totalInHouseRevenue,
      totalSellerGross,
      netProfit,
      currentLiquidity,
      unpaidLiability: totalUnpaidLiability
    };
  }, [profileId, shopTotals, expenses, combinedSalesData, isMounted]);

  const chartData = useMemo(() => {
    if (!financialSummary || !isMounted || !selectedDate) return [];
    try {
      return [{
        name: format(parseISO(selectedDate), "MMM d"),
        inHouse: financialSummary.inHouseRevenue,
        commissions: financialSummary.sellerCommission,
        expenses: financialSummary.expenses
      }];
    } catch {
      return [];
    }
  }, [financialSummary, selectedDate, isMounted]);

  const payoutForecast = useMemo(() => {
    if (profileId !== 'manager' || !isMounted) return null;
    const today = startOfDay(new Date());
    const thisFridayDate = startOfDay(nextFriday(today));
    const nextFridayDate = startOfDay(addWeeks(thisFridayDate, 1));

    const forecast = {
      thisFriday: { date: thisFridayDate, total: 0, count: 0, sellers: {} as Record<string, { total: number, ids: string[], originMap: Record<string, string> }> },
      nextFriday: { date: nextFridayDate, total: 0, count: 0, sellers: {} as Record<string, { total: number, ids: string[], originMap: Record<string, string> }> }
    };

    combinedSalesData.forEach(sale => {
      if (sale.payoutStatus === 'paid') return;
      try {
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
      } catch {
        // Skip invalid dates
      }
    });

    return forecast;
  }, [combinedSalesData, sellers, profileId, isMounted]);

  const predictedFridayPosition = useMemo(() => {
    if (!globalAudit || !payoutForecast) return 0;
    return (globalAudit.currentLiquidity || 0) - (payoutForecast.thisFriday.total || 0);
  }, [globalAudit, payoutForecast]);

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

  const handleAddPackSale = () => {
    const qtyNum = parseInt(newPackQuantity);
    const priceNum = parseFloat(newPackPrice);
    if (entrySellerId && !isNaN(qtyNum) && !isNaN(priceNum)) {
      const total = qtyNum * priceNum;
      const desc = `Booster Packs (${qtyNum}x @ £${priceNum.toFixed(2)})`;
      addSale(selectedDate, entrySellerId, desc, total);
      setNewPackQuantity("1");
      setNewPackPrice("");
      toast({ title: "Success", description: "Pack sale logged." });
    }
  };

  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setEditSaleCard(sale.cardName);
    setEditSalePrice(sale.price.toString());
    setEditSaleSellerId(sale.sellerId);
  };

  const handleSaveEditSale = () => {
    if (editingSale && editSaleCard && !isNaN(parseFloat(editSalePrice))) {
      updateSale(editingSale.id!, {
        cardName: editSaleCard,
        price: parseFloat(editSalePrice),
        sellerId: editSaleSellerId
      }, editingSale.profileOrigin);
      setEditingSale(null);
      toast({ title: "Updated", description: "Sale record modified." });
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
      toast({ title: "Finance Updated", description: "Daily intake synced to the shared ledger." });
    }
  };

  const handleDeleteFinance = () => {
    if (currentDayFinance) {
      deleteShopTotal(selectedDate);
      toast({ title: "Report Deleted", description: "Daily intake record removed." });
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
    if (!authenticatedSellerId || !selectedDate) return;
    const seller = sellers.find(s => s.id === authenticatedSellerId);
    if (!seller) return;

    const doc = new jsPDF();
    const uniqueEvents = Array.from(new Set(combinedSalesData.map(s => `${s.sellerId}_${s.saleDate}`))).sort();
    const currentEvent = `${authenticatedSellerId}_${selectedDate}`;
    const invoiceNum = 1098 + uniqueEvents.indexOf(currentEvent);

    try {
      const formattedDate = format(parseISO(selectedDate), "EEEE, do MMMM yyyy");
      const payoutDate = format(addDays(parseISO(selectedDate), 13), "EEEE, do MMMM yyyy");

      doc.setFontSize(22);
      doc.text("Newton's Collectables", 14, 20);
      doc.setFontSize(10);
      doc.text(`INVOICE #${invoiceNum}`, 196, 20, { align: 'right' });
      doc.line(14, 33, 196, 33);
      doc.text(`Seller: ${seller.name}`, 14, 43);
      doc.text(`Report Date: ${formattedDate}`, 14, 48);
      doc.text(`Estimated Payout Date: ${payoutDate}`, 14, 53);

      autoTable(doc, {
        startY: 63,
        head: [['Card Details', 'Gross Price', 'Status', 'Your Payout']],
        body: sellerDailySalesAggregated.map(sale => [
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
    } catch (err) {
      toast({ variant: "destructive", title: "PDF Error", description: "Failed to generate report." });
    }
  };

  if (!isMounted || !isLoaded || isUserLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
  }

  const theme = THEMES[profileId];

  return (
    <div 
      className="min-h-screen p-4 md:p-8 space-y-8 max-w-7xl mx-auto transition-all duration-700 animate-in fade-in"
      style={{
        '--primary': theme.primary,
        '--ring': theme.ring,
      } as React.CSSProperties}
    >
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
              <Button variant="outline" className="rounded-xl gap-2 shadow-sm h-11 px-6 border-primary/20">
                <span className="font-black uppercase tracking-widest text-xs flex items-center gap-2">
                  {profileId === 'manager' && <ShieldCheck className="w-4 h-4 text-primary" />}
                  {profileId === 'staff' && <UserCircle className="w-4 h-4 text-primary" />}
                  {profileId === 'seller' && <User className="w-4 h-4 text-primary" />}
                  {profileId === 'finance' && <Receipt className="w-4 h-4 text-primary" />}
                  VAULT: {profileId}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl p-2 border-primary/10 shadow-xl">
              <DropdownMenuItem onClick={() => handleProfileSwitch('manager')} className="gap-3 py-3 font-bold"><ShieldCheck className="w-5 h-5 text-slate-700" /> MANAGER</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleProfileSwitch('staff')} className="gap-3 py-3 font-bold"><UserCircle className="w-5 h-5 text-blue-600" /> STAFF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleProfileSwitch('seller')} className="gap-3 py-3 font-bold"><User className="w-5 h-5 text-emerald-600" /> SELLER</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleProfileSwitch('finance')} className="gap-3 py-3 font-bold"><Receipt className="w-5 h-5 text-amber-600" /> FINANCE</DropdownMenuItem>
              {isManagerAuthenticated && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="gap-3 py-3 text-destructive font-bold"><LogOut className="w-5 h-5" /> EXIT VAULT</DropdownMenuItem>
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
        <div className="space-y-8 animate-in slide-in-from-top-4 duration-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-none shadow-sm rounded-2xl bg-white border-l-4 border-l-primary">
              <CardHeader className="p-5 pb-1">
                <CardTitle className="text-[10px] font-black uppercase text-slate-400">Total Shop Intake</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="text-2xl font-black text-slate-900">£{financialSummary.intake.toFixed(2)}</div>
                <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase mt-1">
                  <ArrowUpRight className="w-2 h-2 text-green-500" /> All-in Revenue (Till Total)
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-sm rounded-2xl bg-white">
              <CardHeader className="p-5 pb-1">
                <CardTitle className="text-[10px] font-black uppercase text-slate-400">Total Running Sales</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="text-2xl font-black text-primary">£{financialSummary.totalDailyVolume.toFixed(2)}</div>
                <div className="text-[8px] font-bold text-slate-400 uppercase mt-1">Sum of Logged Card Sales</div>
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

            <Card className="border-none shadow-sm rounded-2xl bg-primary text-white">
              <CardHeader className="p-5 pb-1">
                <CardTitle className="text-[10px] font-black uppercase text-white/60">Net Cash Position</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="text-2xl font-black text-white">£{(financialSummary.runningCashPosition || 0).toFixed(2)}</div>
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
                    <XAxis dataKey="name" />
                    <YAxis />
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
                      style={{ width: `${Math.min(100, (financialSummary.inHouseRevenue / (financialSummary.intake || 1)) * 100)}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-[10px] font-black uppercase text-slate-400">External Seller Gross</span>
                    <span className="font-black text-slate-700">£{financialSummary.sellerGross.toFixed(2)}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-slate-300" 
                      style={{ width: `${Math.min(100, (financialSummary.sellerGross / (financialSummary.intake || 1)) * 100)}%` }}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in zoom-in-95 duration-700">
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
                  <Input type="number" placeholder="0.00" value={financeCash} onChange={(e) => setFinanceCash(e.target.value)} className="h-12 rounded-xl font-black focus-visible:ring-primary" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Card Intake</label>
                  <Input type="number" placeholder="0.00" value={financeCard} onChange={(e) => setFinanceCard(e.target.value)} className="h-12 rounded-xl font-black focus-visible:ring-primary" />
                </div>
              </div>
              <div className="flex gap-4">
                <Button onClick={handleSaveFinance} className="flex-1 h-12 rounded-xl font-black uppercase text-xs bg-primary hover:bg-primary/90">
                  {currentDayFinance ? 'Update Report' : 'Sync Daily Intake'}
                </Button>
                {currentDayFinance && (
                  <Button variant="outline" onClick={handleDeleteFinance} className="h-12 w-12 rounded-xl text-destructive hover:bg-destructive/5 border-destructive/20">
                    <Trash2 className="w-5 h-5" />
                  </Button>
                )}
              </div>
              {currentDayFinance && (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center relative group">
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
                <Input placeholder="Description..." value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)} className="h-12 rounded-xl font-bold focus-visible:ring-primary" />
                <Input type="number" placeholder="Amount" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className="h-12 rounded-xl font-black focus-visible:ring-primary" />
              </div>
              <Button onClick={handleAddExpense} className="w-full h-12 rounded-xl font-black uppercase text-xs bg-primary hover:bg-primary/90">Log Expense</Button>
              <Separator />
              <ScrollArea className="h-[150px]">
                <div className="space-y-2">
                  {currentDayExpenses.map((exp) => (
                    <div key={exp.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="font-bold text-xs uppercase">{exp.description}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-destructive">£{exp.amount.toFixed(2)}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-destructive" onClick={() => deleteExpense(exp.id!)}><Trash2 className="w-3.5 h-3.5" /></Button>
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
        <Card className="shadow-sm border-none rounded-2xl overflow-hidden bg-white animate-in slide-in-from-bottom-4 duration-700">
          <CardHeader className="border-b bg-slate-50/20 px-8 py-6 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-primary" />
              <CardTitle className="text-xl font-black uppercase">Sales Ledger</CardTitle>
            </div>
            <Badge className="bg-primary text-white font-black">{selectedDate}</Badge>
          </CardHeader>
          <CardContent className="p-8 space-y-10">
            {/* Seller Selection Box */}
            <div className="bg-slate-50/50 p-6 rounded-3xl border shadow-inner max-w-md">
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">1. Active Seller Entity</label>
                <Select value={entrySellerId} onValueChange={setEntrySellerId}>
                  <SelectTrigger className="bg-white h-12 rounded-xl px-4 font-bold text-sm focus:ring-primary border-primary/10">
                    <SelectValue placeholder="Select seller" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {activeSellers.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="font-bold py-3 uppercase text-xs">{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Single Card Entry */}
              <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-black uppercase text-slate-600">Single Card Entry</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Card Detail</label>
                    <Input 
                      placeholder="e.g., Rare Holographic Charizard" 
                      className="h-12 rounded-xl px-4 font-bold focus-visible:ring-primary"
                      value={newSaleCard}
                      onChange={(e) => setNewSaleCard(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Price</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-primary">£</span>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00" 
                        className="h-12 rounded-xl pl-8 font-black focus-visible:ring-primary"
                        value={newSalePrice}
                        onChange={(e) => setNewSalePrice(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button 
                    className="w-full h-12 rounded-xl font-black uppercase text-xs bg-primary hover:bg-primary/90"
                    onClick={handleAddSale}
                    disabled={!entrySellerId || !newSaleCard.trim() || !newSalePrice}
                  >
                    Log Card Sale
                  </Button>
                </div>
              </div>

              {/* Booster Pack Entry */}
              <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <Box className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-black uppercase text-slate-600">Booster Pack Entry</h3>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400">Quantity</label>
                      <Input 
                        type="number"
                        min="1"
                        className="h-12 rounded-xl px-4 font-bold focus-visible:ring-primary"
                        value={newPackQuantity}
                        onChange={(e) => setNewPackQuantity(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400">Price Per Pack</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-primary">£</span>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="0.00" 
                          className="h-12 rounded-xl pl-8 font-black focus-visible:ring-primary"
                          value={newPackPrice}
                          onChange={(e) => setNewPackPrice(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-dashed text-center">
                    <span className="text-[9px] font-black uppercase text-slate-400">Estimated Total: </span>
                    <span className="text-sm font-black text-primary">£{(Number(newPackQuantity) * (Number(newPackPrice) || 0)).toFixed(2)}</span>
                  </div>
                  <Button 
                    className="w-full h-12 rounded-xl font-black uppercase text-xs bg-primary hover:bg-primary/90"
                    onClick={handleAddPackSale}
                    disabled={!entrySellerId || !newPackPrice || Number(newPackQuantity) < 1}
                  >
                    Log Pack Sale
                  </Button>
                </div>
              </div>
            </div>

            <div className="border rounded-2xl overflow-hidden bg-white shadow-sm mt-8">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="font-black uppercase text-[10px] h-14 pl-6">Seller</TableHead>
                    <TableHead className="font-black uppercase text-[10px] h-14">Detail</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px] h-14 pr-6">Total Amount</TableHead>
                    {isManagerAuthenticated && <TableHead className="font-black uppercase text-[10px] h-14 w-24 text-center">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffVaultTableData.length > 0 ? (
                    staffVaultTableData.map((sale) => (
                      <TableRow key={sale.id} className="hover:bg-slate-50/50 h-16">
                        <TableCell className="pl-6">
                          <Badge variant="outline" className="font-black text-[10px] uppercase bg-white border-primary/20 text-primary">
                            {sellers.find(s => s.id === sale.sellerId)?.name || sale.sellerId}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold uppercase text-xs">{sale.cardName}</TableCell>
                        <TableCell className="text-right pr-6 font-black text-base">£{sale.price.toFixed(2)}</TableCell>
                        {isManagerAuthenticated && (
                          <TableCell className="text-center px-2">
                             <div className="flex items-center justify-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary" onClick={() => handleEditSale(sale)}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-destructive" onClick={() => deleteSale(sale.id!, sale.profileOrigin)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                             </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={isManagerAuthenticated ? 4 : 3} className="h-48 text-center text-slate-400 italic">No records for {selectedDate}.</TableCell>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-6 duration-1000">
           <Card className="shadow-sm border-none rounded-2xl overflow-hidden bg-white border-l-8 border-l-primary">
               <CardHeader className="bg-slate-50 px-6 py-4 border-b flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary text-white p-2 rounded-xl"><ArrowRightLeft className="w-4 h-4" /></div>
                    <div>
                      <CardTitle className="text-lg font-black uppercase text-slate-900">This Friday</CardTitle>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{format(payoutForecast.thisFriday.date, "PPP")}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-slate-900">£{payoutForecast.thisFriday.total.toFixed(2)}</span>
                  </div>
               </CardHeader>
               <CardContent className="p-6 space-y-3">
                  <ScrollArea className="h-[200px]">
                    {Object.entries(payoutForecast.thisFriday.sellers).map(([name, data], i) => (
                      <div key={i} className="flex justify-between items-center text-xs p-3 rounded-xl bg-slate-50 group border border-transparent hover:border-primary/10 transition-all mb-2">
                        <span className="font-bold uppercase tracking-widest text-[10px] text-slate-600">{name}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-slate-900">£{data.total.toFixed(2)}</span>
                          <Button 
                            size="sm" 
                            className="h-7 px-3 text-[8px] font-black uppercase rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-primary"
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
                      <p className="text-center text-[10px] italic text-slate-400 py-4">No settlements due</p>
                    )}
                  </ScrollArea>
               </CardContent>
            </Card>

            <Card className="shadow-sm border-none rounded-2xl overflow-hidden bg-white border-l-8 border-l-slate-200">
               <CardHeader className="bg-slate-50 px-6 py-4 border-b flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-400 text-white p-2 rounded-xl"><Clock className="w-4 h-4" /></div>
                    <div>
                      <CardTitle className="text-lg font-black uppercase text-slate-900">Next Friday</CardTitle>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{format(payoutForecast.nextFriday.date, "PPP")}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-slate-900">£{payoutForecast.nextFriday.total.toFixed(2)}</span>
                  </div>
               </CardHeader>
               <CardContent className="p-6 space-y-3">
                  <ScrollArea className="h-[200px]">
                    {Object.entries(payoutForecast.nextFriday.sellers).map(([name, data], i) => (
                      <div key={i} className="flex justify-between items-center text-xs p-3 rounded-xl bg-slate-50 group border border-transparent hover:border-primary/10 transition-all mb-2">
                        <span className="font-bold uppercase tracking-widest text-[10px] text-slate-600">{name}</span>
                        <span className="font-black text-slate-900">£{data.total.toFixed(2)}</span>
                      </div>
                    ))}
                    {payoutForecast.nextFriday.count === 0 && (
                      <p className="text-center text-[10px] italic text-slate-400 py-4">No upcoming settlements</p>
                    )}
                  </ScrollArea>
               </CardContent>
            </Card>

            <Card className="shadow-sm border-none rounded-2xl overflow-hidden bg-slate-900 text-white border-l-8 border-l-primary">
               <CardHeader className="bg-white/5 px-6 py-4 border-b border-white/10 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary text-white p-2 rounded-xl"><TrendingUp className="w-4 h-4" /></div>
                    <div>
                      <CardTitle className="text-lg font-black uppercase text-white">Friday Prediction</CardTitle>
                      <p className="text-[10px] text-white/40 font-bold uppercase">Estimated Cash Balance</p>
                    </div>
                  </div>
               </CardHeader>
               <CardContent className="p-6 flex flex-col justify-center items-center h-[calc(100%-80px)]">
                  <p className="text-[10px] font-black uppercase text-white/40 mb-2">Net Cash After Friday Payouts</p>
                  <div className={`text-4xl font-black ${predictedFridayPosition < 0 ? 'text-destructive' : 'text-white'}`}>
                    £{(predictedFridayPosition || 0).toFixed(2)}
                  </div>
                  <p className="text-[8px] font-bold uppercase text-white/20 mt-4 text-center">
                    Based on current Running Liquidity minus This Friday's Liabilities
                  </p>
               </CardContent>
            </Card>
        </div>
      )}

      {/* Global Master Ledger Audit (Manager Only) */}
      {profileId === 'manager' && globalAudit && (
        <div className="animate-in slide-in-from-bottom-8 duration-1000 delay-300 pb-20">
          <span id="pnl-ledger" />
          <Separator className="my-12" />
          <div className="flex items-center gap-3 mb-8">
            <Scale className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Master Financial Ledger</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            <Card className="border-none shadow-sm rounded-2xl bg-white">
              <CardHeader className="p-4 pb-1"><CardTitle className="text-[9px] font-black uppercase text-slate-400">Lifetime Recorded Sales</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0"><div className="text-xl font-black text-primary">£{globalAudit.totalSellerGross.toFixed(2)}</div></CardContent>
            </Card>
            <Card className="border-none shadow-sm rounded-2xl bg-white">
              <CardHeader className="p-4 pb-1"><CardTitle className="text-[9px] font-black uppercase text-slate-400">Total Shop Intake</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0"><div className="text-xl font-black text-slate-900">£{globalAudit.totalIntake.toFixed(2)}</div></CardContent>
            </Card>
            <Card className="border-none shadow-sm rounded-2xl bg-white">
              <CardHeader className="p-4 pb-1"><CardTitle className="text-[9px] font-black uppercase text-slate-400">In-House Rev</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0"><div className="text-xl font-black text-blue-600">£{globalAudit.totalInHouseRevenue.toFixed(2)}</div></CardContent>
            </Card>
            <Card className="border-none shadow-sm rounded-2xl bg-white">
              <CardHeader className="p-4 pb-1"><CardTitle className="text-[9px] font-black uppercase text-slate-400">NC Commission</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0"><div className="text-xl font-black text-green-600">£{globalAudit.totalCommission.toFixed(2)}</div></CardContent>
            </Card>
            <Card className="border-none shadow-sm rounded-2xl bg-white">
              <CardHeader className="p-4 pb-1"><CardTitle className="text-[9px] font-black uppercase text-slate-400">Expenses</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0"><div className="text-xl font-black text-destructive">£{globalAudit.totalExpenses.toFixed(2)}</div></CardContent>
            </Card>
            <Card className="border-none shadow-sm rounded-2xl bg-slate-900 text-white">
              <CardHeader className="p-4 pb-1"><CardTitle className="text-[9px] font-black uppercase text-white/40">Running Liquidity</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0">
                <div className={`text-xl font-black ${globalAudit.currentLiquidity < 0 ? 'text-destructive' : 'text-white'}`}>
                  £{(globalAudit.currentLiquidity || 0).toFixed(2)}
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm rounded-2xl bg-primary text-white">
              <CardHeader className="p-4 pb-1"><CardTitle className="text-[9px] font-black uppercase text-white/60">Total Global P&L</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-xl font-black text-white">
                  £{(globalAudit.netProfit || 0).toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>
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
                    <SelectTrigger className="h-14 rounded-2xl font-black border-slate-100 bg-slate-50 focus:ring-primary">
                      <SelectValue placeholder="WHICH SELLER?" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {activeSellers.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="font-bold py-4 uppercase text-xs">{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {authenticatedSellerId && (
                    <Button onClick={handleDownloadPDF} variant="outline" className="w-full h-12 rounded-2xl gap-2 font-black uppercase text-[10px] border-primary/20 text-primary">
                      <Download className="w-4 h-4" /> Export Report (PDF)
                    </Button>
                  )}
               </CardContent>
            </Card>

            {authenticatedSellerId && (
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                <Card className="shadow-sm border-none rounded-3xl bg-white group hover:shadow-xl transition-all duration-500">
                  <CardHeader className="p-6 pb-2"><CardTitle className="text-[10px] font-black uppercase text-slate-400">Gross Sales</CardTitle></CardHeader>
                  <CardContent className="p-6 pt-0"><div className="text-4xl font-black tracking-tighter text-slate-900">£{sellerStats.total.toFixed(2)}</div></CardContent>
                </Card>
                <Card className="shadow-sm border-none rounded-3xl bg-white">
                  <CardHeader className="p-6 pb-2"><CardTitle className="text-[10px] font-black uppercase text-slate-400">NC Commission</CardTitle></CardHeader>
                  <CardContent className="p-6 pt-0"><div className="text-4xl font-black tracking-tighter text-destructive">£{sellerStats.commission.toFixed(2)}</div></CardContent>
                </Card>
                <Card className="shadow-sm border-none rounded-3xl bg-primary text-white">
                  <CardHeader className="p-6 pb-2"><CardTitle className="text-[10px] font-black uppercase text-white/60">Net Payout</CardTitle></CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="text-4xl font-black tracking-tighter text-white">£{sellerStats.payout.toFixed(2)}</div>
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
               <CardHeader className="p-8 border-b bg-slate-50/20">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-black uppercase text-slate-900">Transaction Itemization</CardTitle>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">
                      Report Period: {selectedDate ? format(parseISO(selectedDate), "EEEE, do MMMM yyyy") : 'No Date Selected'}
                    </div>
                  </div>
               </CardHeader>
               <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50/50"><TableRow><TableHead className="pl-8 h-12 uppercase text-[10px] font-black">Item</TableHead><TableHead className="h-12 uppercase text-[10px] font-black">Gross</TableHead><TableHead className="h-12 uppercase text-[10px] font-black">Status</TableHead><TableHead className="text-right pr-8 h-12 uppercase text-[10px] font-black">Net</TableHead></TableRow></TableHeader>
                    <TableBody>
                       {sellerDailySalesAggregated.map((sale) => (
                         <TableRow key={sale.id} className="h-16 hover:bg-slate-50/30">
                           <TableCell className="pl-8 font-bold uppercase text-xs text-slate-900">{sale.cardName}</TableCell>
                           <TableCell className="font-bold text-slate-900">£{sale.price.toFixed(2)}</TableCell>
                           <TableCell><Badge variant={sale.payoutStatus === 'paid' ? 'default' : 'outline'} className="text-[8px] uppercase font-black">{sale.payoutStatus || 'Pending'}</Badge></TableCell>
                           <TableCell className="text-right pr-8 font-black text-primary">£{(sale.price - (sale.commission || 0)).toFixed(2)}</TableCell>
                         </TableRow>
                       ))}
                       {sellerDailySalesAggregated.length === 0 && <TableRow><TableCell colSpan={4} className="h-48 text-center text-slate-300 italic">No sales logged for this date.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
               </CardContent>
            </Card>
          )}
        </div>
      )}

      <footer className="py-12 border-t mt-12 bg-slate-50/50 rounded-t-3xl text-center space-y-4">
        <p className="text-xs font-bold text-slate-400 max-w-2xl mx-auto uppercase tracking-wider">
          {LEGAL_STATEMENT}
        </p>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
          &copy; {new Date().getFullYear()} NC: Sales Tracker &bull; Dynamic Enterprise Dashboard
        </p>
      </footer>

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
            <Button onClick={handlePasswordSubmit} className="w-full h-14 rounded-2xl font-black uppercase text-xs bg-primary hover:bg-primary/90">Unlock Vault</Button>
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
            <Button onClick={handleSellerPasswordSubmit} className="w-full h-14 rounded-2xl font-black uppercase text-xs bg-primary hover:bg-primary/90">Authorize Access</Button>
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
             <Button variant="outline" className="h-24 flex-col rounded-2xl gap-2 border-slate-100 hover:bg-primary/5 transition-all text-primary border-primary/20" onClick={() => handleMarkBatchPaid('cash')}>
               <Banknote className="w-6 h-6" />
               <span className="font-black uppercase text-[10px]">Cash</span>
             </Button>
             <Button variant="outline" className="h-24 flex-col rounded-2xl gap-2 border-slate-100 hover:bg-primary/5 transition-all text-primary border-primary/20" onClick={() => handleMarkBatchPaid('transfer')}>
               <Send className="w-6 h-6" />
               <span className="font-black uppercase text-[10px]">Transfer</span>
             </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Sale Dialog (Manager Only) */}
      <Dialog open={!!editingSale} onOpenChange={(open) => !open && setEditingSale(null)}>
        <DialogContent className="rounded-3xl p-8 border-none shadow-2xl">
          <DialogHeader className="items-center text-center">
            <div className="bg-primary/10 text-primary p-4 rounded-3xl mb-4"><Pencil className="w-8 h-8" /></div>
            <DialogTitle className="text-2xl font-black uppercase">Edit Transaction</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400">Card Name / Detail</label>
              <Input 
                value={editSaleCard}
                onChange={(e) => setEditSaleCard(e.target.value)}
                className="h-12 rounded-xl px-4 font-bold border-slate-100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400">Sale Price (£)</label>
              <Input 
                type="number"
                step="0.01"
                value={editSalePrice}
                onChange={(e) => setEditSalePrice(e.target.value)}
                className="h-12 rounded-xl px-4 font-black border-slate-100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400">Assigned Seller</label>
              <Select value={editSaleSellerId} onValueChange={setEditSaleSellerId}>
                <SelectTrigger className="h-12 rounded-xl px-4 font-bold border-slate-100">
                  <SelectValue placeholder="Change seller" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {sellers.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="font-bold py-3 uppercase text-xs">{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveEditSale} className="w-full h-14 rounded-2xl font-black uppercase text-xs bg-primary hover:bg-primary/90">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
