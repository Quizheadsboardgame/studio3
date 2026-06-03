"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { format, addDays, parseISO, nextFriday, isBefore, isAfter, addWeeks, startOfDay, differenceInWeeks } from "date-fns";
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
  MoreVertical,
  UserPlus,
  ShieldAlert,
  Save,
  Filter,
  ShoppingCart,
  Zap,
  Ticket,
  Trophy,
  Dices,
  Timer,
  CalendarDays,
  TrendingUp as TrendingIcon
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

import { useSales, Seller, ShopTotal, Expense, Sale, TradeIn, TradeInItem, RaffleEntry } from "@/hooks/use-sales";
import { 
  useAuth, 
  useUser, 
  initiateAnonymousSignIn
} from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// PDF Generation
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ProfileType = 'manager' | 'staff' | 'seller' | 'finance' | 'trade' | 'raffle';

const MANAGER_PASSWORD = "Harley";
const AUTH_EXPIRY_KEY = "newt_manager_auth_expiry";
const LEGAL_STATEMENT = "Newtons collectables is a trading names for journey together tcg Ltd company house number 16503957";

const THEMES: Record<ProfileType, { primary: string; ring: string }> = {
  manager: { primary: "222 47% 11%", ring: "222 47% 11%" }, 
  staff: { primary: "221 83% 53%", ring: "221 83% 53%" },   
  seller: { primary: "142 71% 45%", ring: "142 71% 45%" },  
  finance: { primary: "38 92% 50%", ring: "38 92% 50%" },
  trade: { primary: "262 83% 58%", ring: "262 83% 58%" },
  raffle: { primary: "0 84.2% 60.2%", ring: "0 84.2% 60.2%" },
};

function Pokeball({ isOpen, className }: { isOpen: boolean; className?: string }) {
  return (
    <div className={cn("relative w-24 h-24 transition-all duration-700", className)}>
      <div className={cn("absolute inset-0 rounded-full border-4 border-black bg-white overflow-hidden transition-all duration-700", isOpen ? "translate-y-[-100%] opacity-0" : "translate-y-0")}>
        <div className="h-1/2 bg-red-600 border-b-4 border-black" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-4 border-black bg-white z-10" />
      </div>
      <div className={cn("absolute inset-0 rounded-full border-4 border-black bg-white overflow-hidden transition-all duration-700", isOpen ? "translate-y-[100%] opacity-0" : "translate-y-0")}>
        <div className="h-full bg-white" />
        <div className="absolute top-[-16px] left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-4 border-black bg-white z-10" />
      </div>
    </div>
  );
}

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
          id: `aggregated-packs-${key}` 
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
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [isManagerAuthenticated, setIsManagerAuthenticated] = useState(false);

  const [selectedSellerId, setSelectedSellerId] = useState<string>("");
  const [isSellerPasswordDialogOpen, setIsSellerPasswordDialogOpen] = useState(false);
  const [sellerPasswordInput, setSellerPasswordInput] = useState("");
  const [authenticatedSellerId, setAuthenticatedSellerId] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const { 
    sellers, 
    sales, 
    combinedSalesData, 
    shopTotals, 
    expenses, 
    tradeIns,
    raffleEntries,
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
    deleteExpense,
    addTradeIn,
    deleteTradeIn,
    addRaffleEntry,
    deleteRaffleEntry
  } = useSales(profileId);
  
  const [newSaleCard, setNewSaleCard] = useState("");
  const [newSalePrice, setNewSalePrice] = useState("");
  const [entrySellerId, setEntrySellerId] = useState("");

  const [newPackQuantity, setNewPackQuantity] = useState("1");
  const [newPackPrice, setNewPackPrice] = useState("");

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

  const [newSellerName, setNewSellerName] = useState("");
  const [newSellerComm, setNewSellerComm] = useState("10");

  // Raffle State
  const [raffleName, setRaffleName] = useState("");
  const [raffleTickets, setRaffleTickets] = useState("");
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [isCountdownMode, setIsCountdownMode] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [winners, setWinners] = useState<string[]>([]);
  const [revealedWinners, setRevealedWinners] = useState<boolean[]>([false, false, false]);
  const [isDrawing, setIsDrawing] = useState(false);

  // Trade-in Calculator State
  const [tradeInItems, setTradeInItems] = useState<TradeInItem[]>([]);
  const [tradeInItemName, setTradeInItemName] = useState("");
  const [tradeInItemValue, setTradeInItemValue] = useState("");
  const [tradeInCustomer, setTradeInCustomer] = useState("");

  useEffect(() => {
    setIsMounted(true);
    const now = new Date();
    setSelectedDate(format(now, "yyyy-MM-dd"));
    const expiry = localStorage.getItem(AUTH_EXPIRY_KEY);
    if (expiry && parseInt(expiry) > now.getTime()) {
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

  const currentDayTradeIns = useMemo(() => {
    if (!isMounted || !selectedDate) return [];
    return tradeIns.filter(t => t.date === selectedDate);
  }, [tradeIns, selectedDate, isMounted]);

  const currentDayRaffleEntries = useMemo(() => {
    if (!isMounted || !selectedDate) return [];
    return raffleEntries.filter(r => r.date === selectedDate);
  }, [raffleEntries, selectedDate, isMounted]);

  const tradeMarketTotal = useMemo(() => tradeInItems.reduce((acc, item) => acc + item.value, 0), [tradeInItems]);
  const tradeOfferAmount = useMemo(() => tradeMarketTotal * 0.8, [tradeMarketTotal]);
  const cashOfferAmount = useMemo(() => tradeMarketTotal * 0.7, [tradeMarketTotal]);

  const handleAddTradeInItem = () => {
    const val = parseFloat(tradeInItemValue);
    if (tradeInItemName && !isNaN(val)) {
      setTradeInItems([...tradeInItems, { name: tradeInItemName, value: val }]);
      setTradeInItemName("");
      setTradeInItemValue("");
    }
  };

  const handleSaveTradeIn = (type: 'trade' | 'cash') => {
    if (tradeInItems.length === 0) return;
    const amount = type === 'trade' ? tradeOfferAmount : cashOfferAmount;
    addTradeIn({
      date: selectedDate,
      items: tradeInItems,
      marketTotal: tradeMarketTotal,
      offerAmount: amount,
      offerType: type,
      customerName: tradeInCustomer
    });
    setTradeInItems([]);
    setTradeInCustomer("");
    toast({ title: "Trade-in Logged", description: `Record saved as ${type === 'trade' ? 'Store Credit' : 'Cash Buyout'}.` });
  };

  const handleAddRaffleEntry = () => {
    const count = parseInt(raffleTickets);
    if (raffleName && !isNaN(count) && count > 0) {
      addRaffleEntry(raffleName, count, selectedDate);
      setRaffleName("");
      setRaffleTickets("");
      toast({ title: "Entry Recorded", description: `${raffleName} added with ${count} tickets.` });
    }
  };

  const handleStartDrawSequence = () => {
    if (currentDayRaffleEntries.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "No entries for this date." });
      return;
    }

    const pool: string[] = [];
    currentDayRaffleEntries.forEach(entry => {
      for (let i = 0; i < entry.tickets; i++) {
        pool.push(entry.name);
      }
    });

    if (pool.length < 3) {
      toast({ variant: "destructive", title: "Error", description: "At least 3 tickets required for a full draw." });
      return;
    }

    // Pick 3 winners (allowing duplicates if they have tickets)
    const picked: string[] = [];
    for (let i = 0; i < 3; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      picked.push(pool[idx]);
    }

    setWinners(picked);
    setRevealedWinners([false, false, false]);
    setIsCountdownMode(true);
    setIsDrawMode(true);
    setCountdown(10);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isCountdownMode && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (isCountdownMode && countdown === 0) {
      setIsCountdownMode(false);
      // Automatic staggered reveal sequence
      const runRevealSequence = async () => {
        setIsDrawing(true);
        // Reveal index 2 (3rd), then 1 (2nd), then 0 (1st)
        for (const idx of [2, 1, 0]) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          setRevealedWinners(prev => {
            const next = [...prev];
            next[idx] = true;
            return next;
          });
        }
        setIsDrawing(false);
      };
      runRevealSequence();
    }
    return () => clearTimeout(timer);
  }, [isCountdownMode, countdown]);

  const handleRevealNext = (index: number) => {
    if (isDrawing || isCountdownMode) return;
    setIsDrawing(true);
    setTimeout(() => {
      const newReveals = [...revealedWinners];
      newReveals[index] = true;
      setRevealedWinners(newReveals);
      setIsDrawing(false);
    }, 1000);
  };

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

  const staffVaultTableData = useMemo(() => {
    return isManagerAuthenticated ? allDailySalesRaw : allDailySalesAggregated;
  }, [isManagerAuthenticated, allDailySalesRaw, allDailySalesAggregated]);

  const sellerDailySalesRaw = useMemo(() => {
    if (!profileId || !authenticatedSellerId || !dailySalesData) return [];
    return dailySalesData[authenticatedSellerId] || [];
  }, [profileId, authenticatedSellerId, dailySalesData]);

  const sellerDailySalesAggregated = useMemo(() => {
    const aggregated = aggregateSales(sellerDailySalesRaw);
    let running = 0;
    return aggregated.map(sale => {
      const net = sale.price - (sale.commission || 0);
      running += net;
      return { ...sale, runningTotal: running };
    });
  }, [sellerDailySalesRaw]);

  const sellerStats = useMemo(() => {
    if (!isMounted) return { total: 0, commission: 0, payout: 0, payoutDate: "N/A" };
    const total = sellerDailySalesRaw.reduce((acc, s) => acc + s.price, 0);
    const comm = sellerDailySalesRaw.reduce((acc, s) => acc + (s.commission || 0), 0);
    
    let payoutDateStr = "N/A";
    if (selectedDate) {
      const d = parseISO(selectedDate);
      const isWednesday = d.getDay() === 3; // 3 is Wednesday
      const maturity = addDays(d, isWednesday ? 16 : 13);
      payoutDateStr = format(maturity, "PPP");
    }

    return {
      total,
      commission: comm,
      payout: total - comm,
      payoutDate: payoutDateStr
    };
  }, [sellerDailySalesRaw, selectedDate, isMounted]);

  const sellerLifetimeStats = useMemo(() => {
    if (!authenticatedSellerId || !combinedSalesData) return { earned: 0, owed: 0, settled: 0, since: "N/A", avgWeekly: 0 };
    const sellerSales = combinedSalesData.filter(s => s.sellerId === authenticatedSellerId);
    
    if (sellerSales.length === 0) return { earned: 0, owed: 0, settled: 0, since: "N/A", avgWeekly: 0 };

    const firstSale = sellerSales.reduce((min, s) => s.saleDate < min ? s.saleDate : min, sellerSales[0].saleDate);
    const firstSaleObj = parseISO(firstSale);
    const weeksActive = Math.max(1, differenceInWeeks(new Date(), firstSaleObj));

    const totals = sellerSales.reduce((acc, s) => {
      const net = s.price - (s.commission || 0);
      acc.earned += net;
      if (s.payoutStatus === 'paid') {
        acc.settled += net;
      } else {
        acc.owed += net;
      }
      return acc;
    }, { earned: 0, owed: 0, settled: 0 });

    return {
      ...totals,
      since: format(firstSaleObj, "MMM yyyy"),
      avgWeekly: totals.earned / weeksActive
    };
  }, [authenticatedSellerId, combinedSalesData]);

  const filteredSalesData = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return combinedSalesData.filter(sale => {
      const seller = sellers.find(s => s.id === sale.sellerId);
      return (
        sale.cardName.toLowerCase().includes(query) ||
        (seller?.name || "").toLowerCase().includes(query) ||
        sale.saleDate.includes(query)
      );
    });
  }, [combinedSalesData, searchQuery, sellers]);

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
        const isWednesday = saleDateObj.getDay() === 3;
        const maturityDate = startOfDay(addDays(saleDateObj, isWednesday ? 16 : 13));
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
        // Skip
      }
    });

    return forecast;
  }, [combinedSalesData, sellers, profileId, isMounted]);

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

  const handleAddNewSeller = () => {
    const comm = parseFloat(newSellerComm);
    if (newSellerName.trim() && !isNaN(comm)) {
      addSeller(newSellerName.trim(), comm);
      setNewSellerName("");
      setNewSellerComm("10");
      toast({ title: "Seller Provisioned", description: `${newSellerName} added to the system.` });
    }
  };

  const handleArchiveSeller = (seller: Seller) => {
    updateSeller(seller.id, { archived: !seller.archived });
    toast({ 
      title: seller.archived ? "Seller Restored" : "Seller Archived", 
      description: `${seller.name} status updated.` 
    });
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
      
      const d = parseISO(selectedDate);
      const isWednesday = d.getDay() === 3;
      const maturity = addDays(d, isWednesday ? 16 : 13);
      const payoutDate = format(maturity, "EEEE, do MMMM yyyy");

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
        head: [['Card Details', 'Gross Price', 'Status', 'Net Payout', 'Running Total']],
        body: sellerDailySalesAggregated.map(sale => [
          sale.cardName, 
          `£${sale.price.toFixed(2)}`, 
          sale.payoutStatus || 'Pending',
          `£${(sale.price - (sale.commission || 0)).toFixed(2)}`,
          `£${(sale as any).runningTotal.toFixed(2)}`
        ]),
        theme: 'grid',
        headStyles: { fillColor: [0, 0, 0] },
        margin: { top: 60 }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;
      
      // Daily Totals Section
      doc.setFont(undefined, 'bold');
      doc.text("Daily Summary", 120, finalY + 5);
      doc.setFont(undefined, 'normal');
      doc.rect(120, finalY + 8, 76, 35);
      doc.text(`Daily Gross: £${sellerStats.total.toFixed(2)}`, 125, finalY + 18);
      doc.text(`NC Commission: £${sellerStats.commission.toFixed(2)}`, 125, finalY + 24);
      doc.setFont(undefined, 'bold');
      doc.text(`Daily Net Payout: £${sellerStats.payout.toFixed(2)}`, 125, finalY + 34);

      // Lifetime Account Overview Section
      const lifetimeY = finalY + 50;
      doc.setFont(undefined, 'bold');
      doc.text("Lifetime Account Overview", 14, lifetimeY + 5);
      doc.setFont(undefined, 'normal');
      doc.rect(14, lifetimeY + 8, 182, 45);
      doc.text(`Total Lifetime Earned (All Time): £${sellerLifetimeStats.earned.toFixed(2)}`, 20, lifetimeY + 18);
      doc.text(`Total Already Settled: £${sellerLifetimeStats.settled.toFixed(2)}`, 20, lifetimeY + 24);
      doc.text(`Selling Since: ${sellerLifetimeStats.since}`, 20, lifetimeY + 30);
      doc.text(`Average Weekly Payout: £${sellerLifetimeStats.avgWeekly.toFixed(2)}`, 20, lifetimeY + 36);
      doc.setFont(undefined, 'bold');
      doc.text(`Current Balance Owed (Pending Payout): £${sellerLifetimeStats.owed.toFixed(2)}`, 20, lifetimeY + 44);

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
          <Image 
            src="https://i.ibb.co/DfhyWPJV/Untitled-12-February-2026-at-13-11-20-1.png" 
            alt="NC Tracker Logo" 
            width={240} 
            height={70} 
            className="h-14 w-auto object-contain"
            priority
          />
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1 ml-0.5">Sales and Trade-in Tracker</p>
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
                  {profileId === 'trade' && <Zap className="w-4 h-4 text-primary" />}
                  {profileId === 'raffle' && <Ticket className="w-4 h-4 text-primary" />}
                  VAULT: {profileId}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl p-2 border-primary/10 shadow-xl">
              <DropdownMenuItem onClick={() => handleProfileSwitch('manager')} className="gap-3 py-3 font-bold"><ShieldCheck className="w-5 h-5 text-slate-700" /> MANAGER</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleProfileSwitch('staff')} className="gap-3 py-3 font-bold"><UserCircle className="w-5 h-5 text-blue-600" /> STAFF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleProfileSwitch('trade')} className="gap-3 py-3 font-bold"><Zap className="w-5 h-5 text-purple-600" /> TRADE-IN</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleProfileSwitch('raffle')} className="gap-3 py-3 font-bold"><Ticket className="w-5 h-5 text-red-600" /> RAFFLE</DropdownMenuItem>
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

      {/* Raffle Vault Profile */}
      {profileId === 'raffle' && (
        <div className="space-y-8 animate-in zoom-in-95 duration-700">
          {!isDrawMode ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="shadow-sm border-none rounded-3xl bg-white overflow-hidden">
                <CardHeader className="p-8 border-b bg-slate-50/20">
                  <div className="flex items-center gap-3">
                    <Ticket className="w-5 h-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase">Add Raffle Entry</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Customer Name</label>
                    <Input placeholder="e.g., Ash Ketchum" value={raffleName} onChange={(e) => setRaffleName(e.target.value)} className="h-12 rounded-xl font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Tickets Purchased</label>
                    <Input type="number" placeholder="10" value={raffleTickets} onChange={(e) => setRaffleTickets(e.target.value)} className="h-12 rounded-xl font-black" />
                  </div>
                  <Button onClick={handleAddRaffleEntry} className="w-full h-12 rounded-xl bg-primary font-black uppercase text-xs">Log Entry</Button>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2 shadow-sm border-none rounded-3xl bg-white overflow-hidden">
                <CardHeader className="p-8 border-b bg-slate-50/20 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <History className="w-5 h-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase">Current Entries</CardTitle>
                  </div>
                  <Button onClick={handleStartDrawSequence} className="h-10 px-6 rounded-xl bg-slate-900 gap-2 font-black uppercase text-[10px]"><Dices className="w-3.5 h-3.5" /> Start Draw Sequence</Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow><TableHead className="pl-8 font-black uppercase text-[10px]">Name</TableHead><TableHead className="font-black uppercase text-[10px]">Tickets</TableHead><TableHead className="text-right pr-8 font-black uppercase text-[10px]">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {currentDayRaffleEntries.map((entry) => (
                        <TableRow key={entry.id} className="h-16">
                          <TableCell className="pl-8 font-bold uppercase text-xs">{entry.name}</TableCell>
                          <TableCell className="font-black text-primary">{entry.tickets}</TableCell>
                          <TableCell className="text-right pr-8">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => deleteRaffleEntry(entry.id!)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {currentDayRaffleEntries.length === 0 && <TableRow><TableCell colSpan={3} className="h-48 text-center text-slate-400 italic">No entries for {selectedDate}</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="bg-slate-900 rounded-[3rem] p-12 text-center space-y-12 animate-in zoom-in-95 duration-1000 min-h-[600px] flex flex-col justify-center items-center relative overflow-hidden">
              {/* Animated Background Element */}
              <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-600/10 blur-[120px] rounded-full animate-pulse" />

              {isCountdownMode ? (
                <div className="space-y-8 animate-in zoom-in-50 duration-500">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
                    <h2 className="text-white text-[12rem] font-black leading-none drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">{countdown}</h2>
                  </div>
                  <p className="text-primary text-2xl font-black uppercase tracking-[0.5em] animate-bounce">Generating Winners...</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 relative">
                    <h2 className="text-white text-5xl font-black uppercase tracking-tighter">Live Raffle Draw</h2>
                    <p className="text-white/40 font-black uppercase tracking-widest text-[10px]">Customer Facing Mode &bull; {selectedDate}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full max-w-5xl relative">
                    {[2, 1, 0].map((winnerIdx) => (
                      <div key={winnerIdx} className="flex flex-col items-center space-y-6">
                        <div className="relative group">
                          <Pokeball isOpen={revealedWinners[winnerIdx]} className={cn("mx-auto", isDrawing ? "animate-bounce" : "")} />
                          {!revealedWinners[winnerIdx] && (
                            <Button 
                              onClick={() => handleRevealNext(winnerIdx)} 
                              disabled={isDrawing}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                          )}
                        </div>
                        
                        <div className="h-40 flex flex-col items-center justify-center">
                          <p className="text-white/30 font-black uppercase text-[12px] mb-2">{winnerIdx + 1}{winnerIdx === 0 ? 'st' : winnerIdx === 1 ? 'nd' : 'rd'} Place</p>
                          {revealedWinners[winnerIdx] ? (
                            <div className="animate-in zoom-in-50 duration-700 text-center flex flex-col items-center gap-3">
                              <Trophy className={cn("w-14 h-14 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]", 
                                winnerIdx === 0 ? "text-yellow-400" : 
                                winnerIdx === 1 ? "text-slate-300" : 
                                "text-amber-700"
                              )} />
                              <p className="text-primary text-3xl font-black uppercase tracking-tight">{winners[winnerIdx]}</p>
                            </div>
                          ) : (
                            <p className="text-white/10 font-black uppercase text-xl animate-pulse">Waiting...</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-4 pt-8 relative">
                    <Button onClick={() => setIsDrawMode(false)} variant="outline" className="border-white/10 text-white hover:bg-white/10 rounded-2xl h-12 px-8 font-black uppercase text-[10px]">Close Vault</Button>
                    <Button onClick={handleStartDrawSequence} className="bg-primary hover:bg-primary/90 rounded-2xl h-12 px-8 font-black uppercase text-[10px]">Reset Draw Pool</Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Trade-in Vault Profile */}
      {profileId === 'trade' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in zoom-in-95 duration-700">
           {/* Calculator Card */}
           <Card className="lg:col-span-2 shadow-sm border-none rounded-3xl bg-white overflow-hidden">
              <CardHeader className="p-8 border-b bg-slate-50/20">
                 <div className="flex items-center gap-3">
                    <Calculator className="w-5 h-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase">Trade-in Running Calculator</CardTitle>
                 </div>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-400">Card Name</label>
                       <Input placeholder="e.g., PSA 10 Lugia" value={tradeInItemName} onChange={(e) => setTradeInItemName(e.target.value)} className="h-12 rounded-xl font-bold" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-400">Market Value (£)</label>
                       <div className="flex gap-2">
                          <Input type="number" placeholder="0.00" value={tradeInItemValue} onChange={(e) => setTradeInItemValue(e.target.value)} className="h-12 rounded-xl font-black" />
                          <Button onClick={handleAddTradeInItem} className="h-12 w-12 rounded-xl bg-primary"><Plus className="w-5 h-5" /></Button>
                       </div>
                    </div>
                 </div>

                 <div className="border rounded-2xl overflow-hidden bg-slate-50/30">
                    <Table>
                       <TableHeader><TableRow><TableHead className="font-black uppercase text-[10px]">Item</TableHead><TableHead className="font-black uppercase text-[10px] text-right">Value</TableHead></TableRow></TableHeader>
                       <TableBody>
                          {tradeInItems.map((item, idx) => (
                             <TableRow key={idx} className="h-12 border-slate-100">
                                <TableCell className="font-bold text-xs uppercase">{item.name}</TableCell>
                                <TableCell className="text-right font-black">£{item.value.toFixed(2)}</TableCell>
                             </TableRow>
                          ))}
                          {tradeInItems.length === 0 && <TableRow><TableCell colSpan={2} className="h-24 text-center text-slate-400 italic text-[10px]">No items added to evaluation</TableCell></TableRow>}
                       </TableBody>
                    </Table>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                    <div className="bg-slate-900 rounded-2xl p-6 text-white text-center">
                       <p className="text-[9px] font-black uppercase text-white/40 mb-1">Market Total</p>
                       <p className="text-3xl font-black">£{tradeMarketTotal.toFixed(2)}</p>
                    </div>
                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center group cursor-pointer hover:bg-primary hover:text-white transition-all" onClick={() => handleSaveTradeIn('trade')}>
                       <p className="text-[9px] font-black uppercase text-primary group-hover:text-white/60 mb-1">Store Credit (80%)</p>
                       <p className="text-3xl font-black text-primary group-hover:text-white">£{tradeOfferAmount.toFixed(2)}</p>
                       <p className="text-[8px] font-bold uppercase mt-2 opacity-50">Log Evaluation</p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center group cursor-pointer hover:bg-emerald-600 hover:text-white transition-all" onClick={() => handleSaveTradeIn('cash')}>
                       <p className="text-[9px] font-black uppercase text-emerald-600 group-hover:text-white/60 mb-1">Cash Buyout (70%)</p>
                       <p className="text-3xl font-black text-emerald-600 group-hover:text-white">£{cashOfferAmount.toFixed(2)}</p>
                       <p className="text-[8px] font-bold uppercase mt-2 opacity-50">Log Evaluation</p>
                    </div>
                 </div>
              </CardContent>
           </Card>

           {/* History Card */}
           <Card className="shadow-sm border-none rounded-3xl bg-white overflow-hidden">
              <CardHeader className="p-8 border-b bg-slate-50/20">
                 <div className="flex items-center gap-3">
                    <History className="w-5 h-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase">Recent Buybacks</CardTitle>
                 </div>
              </CardHeader>
              <CardContent className="p-0">
                 <ScrollArea className="h-[500px]">
                    <div className="divide-y">
                       {currentDayTradeIns.map((trade) => (
                          <div key={trade.id} className="p-6 space-y-3 hover:bg-slate-50/50 transition-colors group">
                             <div className="flex justify-between items-start">
                                <div>
                                   <Badge variant={trade.offerType === 'trade' ? 'default' : 'outline'} className="text-[8px] font-black uppercase mb-1">
                                      {trade.offerType === 'trade' ? 'Store Credit' : 'Cash Purchase'}
                                   </Badge>
                                   <p className="font-black text-slate-900">£{trade.offerAmount.toFixed(2)}</p>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 opacity-0 group-hover:opacity-100" onClick={() => deleteTradeIn(trade.id!)}><Trash2 className="w-3.5 h-3.5" /></Button>
                             </div>
                             <div className="space-y-1">
                                {trade.items.map((it, i) => (
                                   <div key={i} className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                                      <span>{it.name}</span>
                                      <span>£{it.value.toFixed(2)}</span>
                                   </div>
                                ))}
                             </div>
                          </div>
                       ))}
                       {currentDayTradeIns.length === 0 && <div className="p-12 text-center text-slate-300 italic text-xs">No records for {selectedDate}</div>}
                    </div>
                 </ScrollArea>
              </CardContent>
           </Card>
        </div>
      )}

      {/* Manager Profile Wrapper with Tabs */}
      {profileId === 'manager' && (
        <Tabs defaultValue="search" className="space-y-8 animate-in slide-in-from-top-4 duration-700">
          <TabsList className="bg-white border rounded-2xl h-14 p-1 shadow-sm gap-1 overflow-x-auto justify-start md:justify-center">
            <TabsTrigger value="search" className="rounded-xl font-black uppercase text-[10px] gap-2 h-full px-4 md:px-6 data-[state=active]:bg-primary data-[state=active]:text-white whitespace-nowrap">
              <Search className="w-3.5 h-3.5" /> Search Audit
            </TabsTrigger>
            <TabsTrigger value="payouts" className="rounded-xl font-black uppercase text-[10px] gap-2 h-full px-4 md:px-6 data-[state=active]:bg-primary data-[state=active]:text-white whitespace-nowrap">
              <Wallet className="w-3.5 h-3.5" /> Settlements
            </TabsTrigger>
            <TabsTrigger value="sellers" className="rounded-xl font-black uppercase text-[10px] gap-2 h-full px-4 md:px-6 data-[state=active]:bg-primary data-[state=active]:text-white whitespace-nowrap">
              <Users className="w-3.5 h-3.5" /> Sellers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-8 focus-visible:outline-none">
            <Card className="shadow-sm border-none rounded-3xl bg-white overflow-hidden">
              <CardHeader className="p-8 border-b bg-slate-50/20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Search className="w-5 h-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase">Search Vault Database</CardTitle>
                  </div>
                  <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      placeholder="Search items, sellers, or dates (YYYY-MM-DD)..." 
                      className="pl-10 h-11 rounded-xl font-bold border-slate-100 focus:ring-primary"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="pl-8 font-black uppercase text-[10px] h-14">Date</TableHead>
                      <TableHead className="font-black uppercase text-[10px] h-14">Seller</TableHead>
                      <TableHead className="font-black uppercase text-[10px] h-14">Item Details</TableHead>
                      <TableHead className="font-black uppercase text-[10px] h-14">Price</TableHead>
                      <TableHead className="font-black uppercase text-[10px] h-14">NC Comm</TableHead>
                      <TableHead className="font-black uppercase text-[10px] h-14">Status</TableHead>
                      <TableHead className="text-right pr-8 font-black uppercase text-[10px] h-14">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchQuery ? (
                      filteredSalesData.length > 0 ? (
                        filteredSalesData.map((sale) => (
                          <TableRow key={sale.id} className="hover:bg-slate-50/50 h-16 transition-colors">
                            <TableCell className="pl-8 font-mono text-[10px] font-bold text-slate-400">{sale.saleDate}</TableCell>
                            <TableCell><Badge variant="outline" className="font-black text-[10px] uppercase bg-white border-primary/20 text-primary">{sellers.find(s => s.id === sale.sellerId)?.name || sale.sellerId}</Badge></TableCell>
                            <TableCell className="font-bold uppercase text-xs">{sale.cardName}</TableCell>
                            <TableCell className="font-black text-slate-900">£{sale.price.toFixed(2)}</TableCell>
                            <TableCell className="font-black text-green-600">£{(sale.commission || 0).toFixed(2)}</TableCell>
                            <TableCell><Badge variant={sale.payoutStatus === 'paid' ? 'default' : 'outline'} className="text-[8px] uppercase font-black">{sale.payoutStatus || 'Pending'}</Badge></TableCell>
                            <TableCell className="text-right pr-8">
                               <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary" onClick={() => handleEditSale(sale)}><Pencil className="w-3.5 h-3.5" /></Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-destructive" onClick={() => deleteSale(sale.id!, sale.profileOrigin)}><Trash2 className="w-3.5 h-3.5" /></Button>
                               </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow><TableCell colSpan={7} className="h-48 text-center text-slate-400 italic">No matches found for "{searchQuery}".</TableCell></TableRow>
                      )
                    ) : (
                      <TableRow><TableCell colSpan={7} className="h-48 text-center text-slate-400 italic">Enter a query above to search the master database.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payouts" className="focus-visible:outline-none">
            {payoutForecast && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <Card className="shadow-sm border-none rounded-2xl overflow-hidden bg-white border-l-8 border-l-primary">
                     <CardHeader className="bg-slate-50 px-6 py-4 border-b flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary text-white p-2 rounded-xl"><ArrowRightLeft className="w-4 h-4" /></div>
                          <div><CardTitle className="text-lg font-black uppercase text-slate-900">This Friday</CardTitle><p className="text-[10px] text-slate-400 font-bold uppercase">{format(payoutForecast.thisFriday.date, "PPP")}</p></div>
                        </div>
                        <div className="text-right"><span className="text-2xl font-black text-slate-900">£{payoutForecast.thisFriday.total.toFixed(2)}</span></div>
                     </CardHeader>
                     <CardContent className="p-6 space-y-3">
                        <ScrollArea className="h-[300px]">
                          {Object.entries(payoutForecast.thisFriday.sellers).map(([name, data], i) => (
                            <div key={i} className="flex justify-between items-center text-xs p-3 rounded-xl bg-slate-50 group border border-transparent hover:border-primary/10 transition-all mb-2">
                              <span className="font-bold uppercase tracking-widest text-[10px] text-slate-600">{name}</span>
                              <div className="flex items-center gap-3">
                                <span className="font-black text-slate-900">£{data.total.toFixed(2)}</span>
                                <Button size="sm" className="h-7 px-3 text-[8px] font-black uppercase rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-primary" onClick={() => { setSettlementBatch({ sellerId: name, saleIds: data.ids, originMap: data.originMap, total: data.total }); setIsSettlementDialogOpen(true); }}>Settle</Button>
                              </div>
                            </div>
                          ))}
                          {payoutForecast.thisFriday.count === 0 && <p className="text-center text-[10px] italic text-slate-400 py-4">No settlements due</p>}
                        </ScrollArea>
                     </CardContent>
                  </Card>

                  <Card className="shadow-sm border-none rounded-2xl overflow-hidden bg-white border-l-8 border-l-slate-200">
                     <CardHeader className="bg-slate-50 px-6 py-4 border-b flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-slate-400 text-white p-2 rounded-xl"><Clock className="w-4 h-4" /></div>
                          <div><CardTitle className="text-lg font-black uppercase text-slate-900">Next Friday</CardTitle><p className="text-[10px] text-slate-400 font-bold uppercase">{format(payoutForecast.nextFriday.date, "PPP")}</p></div>
                        </div>
                        <div className="text-right"><span className="text-2xl font-black text-slate-900">£{payoutForecast.nextFriday.total.toFixed(2)}</span></div>
                     </CardHeader>
                     <CardContent className="p-6 space-y-3">
                        <ScrollArea className="h-[300px]">
                          {Object.entries(payoutForecast.nextFriday.sellers).map(([name, data], i) => (
                            <div key={i} className="flex justify-between items-center text-xs p-3 rounded-xl bg-slate-50 group border border-transparent hover:border-primary/10 transition-all mb-2">
                              <span className="font-bold uppercase tracking-widest text-[10px] text-slate-600">{name}</span>
                              <span className="font-black text-slate-900">£{data.total.toFixed(2)}</span>
                            </div>
                          ))}
                          {payoutForecast.nextFriday.count === 0 && <p className="text-center text-[10px] italic text-slate-400 py-4">No upcoming settlements</p>}
                        </ScrollArea>
                     </CardContent>
                  </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sellers" className="space-y-8 focus-visible:outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="shadow-sm border-none rounded-2xl bg-white overflow-hidden">
                <CardHeader className="p-6 border-b bg-slate-50/20">
                  <div className="flex items-center gap-3">
                    <UserPlus className="w-5 h-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase">Provision New Seller</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Full Name</label>
                    <Input 
                      placeholder="e.g., John Smith" 
                      className="h-12 rounded-xl font-bold border-slate-100"
                      value={newSellerName}
                      onChange={(e) => setNewSellerName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">NC Commission %</label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        placeholder="10" 
                        className="h-12 rounded-xl pr-10 font-black border-slate-100"
                        value={newSellerComm}
                        onChange={(e) => setNewSellerComm(e.target.value)}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-400">%</span>
                    </div>
                  </div>
                  <Button onClick={handleAddNewSeller} className="w-full h-12 rounded-xl font-black uppercase text-xs bg-primary hover:bg-primary/90">Add Seller Entity</Button>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2 shadow-sm border-none rounded-3xl bg-white overflow-hidden">
                <CardHeader className="p-6 border-b bg-slate-50/20">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase">Seller Directory & Access</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="pl-6 font-black uppercase text-[10px] h-14">Seller Name</TableHead>
                        <TableHead className="font-black uppercase text-[10px] h-14">Comm %</TableHead>
                        <TableHead className="font-black uppercase text-[10px] h-14">Vault Key</TableHead>
                        <TableHead className="font-black uppercase text-[10px] h-14">Status</TableHead>
                        <TableHead className="text-right pr-6 font-black uppercase text-[10px] h-14">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sellers.map((seller) => (
                        <TableRow key={seller.id} className={`hover:bg-slate-50/50 h-16 ${seller.archived ? 'opacity-50 grayscale' : ''}`}>
                          <TableCell className="pl-6 font-bold uppercase text-xs">{seller.name}</TableCell>
                          <TableCell className="font-black text-primary">{seller.defaultCommission}%</TableCell>
                          <TableCell className="font-mono text-xs font-bold tracking-widest">{seller.password}</TableCell>
                          <TableCell>
                            <Badge variant={seller.archived ? "outline" : "default"} className="text-[8px] font-black uppercase">
                              {seller.archived ? "ARCHIVED" : "ACTIVE"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl p-2 font-bold border-slate-100">
                                <DropdownMenuItem onClick={() => {
                                  const newComm = prompt("Enter new commission %:", seller.defaultCommission?.toString());
                                  if (newComm !== null) updateSeller(seller.id, { defaultCommission: parseFloat(newComm) });
                                }} className="gap-2"><Settings2 className="w-4 h-4" /> Edit Commission</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  if (confirm("Reset access key?")) updateSeller(seller.id, { password: Math.random().toString(36).slice(-6).toUpperCase() });
                                }} className="gap-2"><KeyRound className="w-4 h-4" /> Reset Access Key</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleArchiveSeller(seller)} className={`gap-2 ${seller.archived ? 'text-green-600' : 'text-destructive'}`}>
                                  {seller.archived ? <RefreshCw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                                  {seller.archived ? "Restore Seller" : "Archive Seller"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
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
              <scroll-area className="h-[150px]">
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
              </scroll-area>
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
            <div className="bg-slate-50/50 p-6 rounded-3xl border shadow-inner max-w-md">
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">1. Active Seller Entity</label>
                <Select value={entrySellerId} onValueChange={setEntrySellerId}>
                  <SelectTrigger className="h-12 rounded-xl px-4 font-bold text-sm focus:ring-primary border-primary/10">
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
              <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-6">
                <div className="flex items-center gap-2 mb-2"><CreditCard className="w-4 h-4 text-primary" /><h3 className="text-xs font-black uppercase text-slate-600">Single Card Entry</h3></div>
                <div className="space-y-4">
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Card Detail</label><Input placeholder="e.g., Rare Holographic Charizard" className="h-12 rounded-xl px-4 font-bold focus-visible:ring-primary" value={newSaleCard} onChange={(e) => setNewSaleCard(e.target.value)} /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Price</label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-primary">£</span><Input type="number" step="0.01" placeholder="0.00" className="h-12 rounded-xl pl-8 font-black focus-visible:ring-primary" value={newSalePrice} onChange={(e) => setNewSalePrice(e.target.value)} /></div></div>
                  <Button className="w-full h-12 rounded-xl font-black uppercase text-xs bg-primary hover:bg-primary/90" onClick={handleAddSale} disabled={!entrySellerId || !newSaleCard.trim() || !newSalePrice}>Log Card Sale</Button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-6">
                <div className="flex items-center gap-2 mb-2"><Box className="w-4 h-4 text-primary" /><h3 className="text-xs font-black uppercase text-slate-600">Booster Pack Entry</h3></div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Quantity</label><Input type="number" min="1" className="h-12 rounded-xl px-4 font-bold focus-visible:ring-primary" value={newPackQuantity} onChange={(e) => setNewPackQuantity(e.target.value)} /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Price Per Pack</label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-primary">£</span><Input type="number" step="0.01" placeholder="0.00" className="h-12 rounded-xl pl-8 font-black focus-visible:ring-primary" value={newPackPrice} onChange={(e) => setNewPackPrice(e.target.value)} /></div></div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-dashed text-center"><span className="text-[9px] font-black uppercase text-slate-400">Estimated Total: </span><span className="text-sm font-black text-primary">£{(Number(newPackQuantity) * (Number(newPackPrice) || 0)).toFixed(2)}</span></div>
                  <Button className="w-full h-12 rounded-xl font-black uppercase text-xs bg-primary hover:bg-primary/90" onClick={handleAddPackSale} disabled={!entrySellerId || !newPackPrice || Number(newPackQuantity) < 1}>Log Pack Sale</Button>
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
                        <TableCell className="pl-6"><Badge variant="outline" className="font-black text-[10px] uppercase bg-white border-primary/20 text-primary">{sellers.find(s => s.id === sale.sellerId)?.name || sale.sellerId}</Badge></TableCell>
                        <TableCell className="font-bold uppercase text-xs">{sale.cardName}</TableCell>
                        <TableCell className="text-right pr-6 font-black text-base">£{sale.price.toFixed(2)}</TableCell>
                        {isManagerAuthenticated && (
                          <TableCell className="text-center px-2">
                             <div className="flex items-center justify-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary" onClick={() => handleEditSale(sale)}><Pencil className="w-3.5 h-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-destructive" onClick={() => deleteSale(sale.id!, sale.profileOrigin)}><Trash2 className="w-3.5 h-3.5" /></Button>
                             </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={isManagerAuthenticated ? 4 : 3} className="h-48 text-center text-slate-400 italic">No records for {selectedDate}.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Personal Seller Portal */}
      {profileId === 'seller' && (
        <div className="space-y-8 animate-in zoom-in-95 duration-700">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <Card className="w-full md:w-1/3 shadow-sm border-none rounded-3xl overflow-hidden bg-white">
               <CardHeader className="p-8 pb-4"><CardTitle className="text-[10px] font-black uppercase text-slate-400">Entity Selection</CardTitle></CardHeader>
               <CardContent className="p-8 pt-0 space-y-6">
                  <Select value={selectedSellerId} onValueChange={handleSellerSelect}>
                    <SelectTrigger className="h-14 rounded-2xl font-black border-slate-100 bg-slate-50 focus:ring-primary"><SelectValue placeholder="WHICH SELLER?" /></SelectTrigger>
                    <SelectContent className="rounded-2xl">{activeSellers.map((s) => (<SelectItem key={s.id} value={s.id} className="font-bold py-4 uppercase text-xs">{s.name}</SelectItem>))}</SelectContent>
                  </Select>
                  {authenticatedSellerId && (
                    <Button onClick={handleDownloadPDF} variant="outline" className="w-full h-12 rounded-2xl gap-2 font-black uppercase text-[10px] border-primary/20 text-primary"><Download className="w-4 h-4" /> Export Report (PDF)</Button>
                  )}
               </CardContent>
            </Card>
            {authenticatedSellerId && (
              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6 w-full">
                <Card className="shadow-sm border-none rounded-3xl bg-white group hover:shadow-xl transition-all duration-500">
                  <CardHeader className="p-6 pb-2"><CardTitle className="text-[10px] font-black uppercase text-slate-400">Gross Sales Today</CardTitle></CardHeader>
                  <CardContent className="p-6 pt-0"><div className="text-4xl font-black tracking-tighter text-slate-900">£{sellerStats.total.toFixed(2)}</div></CardContent>
                </Card>
                <Card className="shadow-sm border-none rounded-3xl bg-white">
                  <CardHeader className="p-6 pb-2"><CardTitle className="text-[10px] font-black uppercase text-slate-400">Total Owed (Pending)</CardTitle></CardHeader>
                  <CardContent className="p-6 pt-0"><div className="text-4xl font-black tracking-tighter text-blue-600">£{sellerLifetimeStats.owed.toFixed(2)}</div></CardContent>
                </Card>
                <Card className="shadow-sm border-none rounded-3xl bg-white">
                  <CardHeader className="p-6 pb-2"><CardTitle className="text-[10px] font-black uppercase text-slate-400">Lifetime Earned</CardTitle></CardHeader>
                  <CardContent className="p-6 pt-0"><div className="text-4xl font-black tracking-tighter text-green-600">£{sellerLifetimeStats.earned.toFixed(2)}</div></CardContent>
                </Card>
                <Card className="shadow-sm border-none rounded-3xl bg-primary text-white">
                  <CardHeader className="p-6 pb-2"><CardTitle className="text-[10px] font-black uppercase text-white/60">Net Payout Today</CardTitle></CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="text-4xl font-black tracking-tighter text-white">£{sellerStats.payout.toFixed(2)}</div>
                    <div className="mt-2 flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-white/50"><Clock className="w-2.5 h-2.5" /> Due: {sellerStats.payoutDate}</div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {authenticatedSellerId && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <Card className="shadow-sm border-none rounded-3xl bg-white p-8 flex items-center gap-6">
                  <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center text-primary"><CalendarDays className="w-8 h-8" /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Selling Since</p>
                    <p className="text-2xl font-black text-slate-900">{sellerLifetimeStats.since}</p>
                  </div>
               </Card>
               <Card className="shadow-sm border-none rounded-3xl bg-white p-8 flex items-center gap-6">
                  <div className="h-16 w-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600"><TrendingIcon className="w-8 h-8" /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Avg. Weekly Payout</p>
                    <p className="text-2xl font-black text-slate-900">£{sellerLifetimeStats.avgWeekly.toFixed(2)}</p>
                  </div>
               </Card>
            </div>
          )}

          {authenticatedSellerId && (
            <Card className="shadow-sm border-none rounded-3xl bg-white overflow-hidden">
               <CardHeader className="p-8 border-b bg-slate-50/20"><div className="flex justify-between items-center"><CardTitle className="text-sm font-black uppercase text-slate-900">Transaction Itemization</CardTitle><div className="text-[10px] font-bold text-slate-400 uppercase">Report Period: {selectedDate ? format(parseISO(selectedDate), "EEEE, do MMMM yyyy") : 'No Date Selected'}</div></div></CardHeader>
               <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="pl-8 h-12 uppercase text-[10px] font-black">Item</TableHead>
                        <TableHead className="h-12 uppercase text-[10px] font-black">Gross</TableHead>
                        <TableHead className="h-12 uppercase text-[10px] font-black">Status</TableHead>
                        <TableHead className="h-12 uppercase text-[10px] font-black">Net</TableHead>
                        <TableHead className="text-right pr-8 h-12 uppercase text-[10px] font-black">Running</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                       {sellerDailySalesAggregated.map((sale) => (
                         <TableRow key={sale.id} className="h-16 hover:bg-slate-50/30">
                           <TableCell className="pl-8 font-bold uppercase text-xs text-slate-900">{sale.cardName}</TableCell>
                           <TableCell className="font-bold text-slate-900">£{sale.price.toFixed(2)}</TableCell>
                           <TableCell><Badge variant={sale.payoutStatus === 'paid' ? 'default' : 'outline'} className="text-[8px] uppercase font-black">{sale.payoutStatus || 'Pending'}</Badge></TableCell>
                           <TableCell className="font-black text-slate-900">£{(sale.price - (sale.commission || 0)).toFixed(2)}</TableCell>
                           <TableCell className="text-right pr-8 font-black text-primary">£{(sale as any).runningTotal.toFixed(2)}</TableCell>
                         </TableRow>
                       ))}
                       {sellerDailySalesAggregated.length === 0 && <TableRow><TableCell colSpan={5} className="h-48 text-center text-slate-300 italic">No sales logged for this date.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
               </CardContent>
            </Card>
          )}
        </div>
      )}

      <footer className="py-12 border-t mt-12 bg-slate-50/50 rounded-t-3xl text-center space-y-4">
        <p className="text-xs font-bold text-slate-400 max-w-2xl mx-auto uppercase tracking-wider">{LEGAL_STATEMENT}</p>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">&copy; {currentYear} NC: Sales Tracker &bull; Dynamic Enterprise Dashboard</p>
      </footer>

      {/* Dialogs */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="rounded-3xl p-8 border-none shadow-2xl">
          <DialogHeader className="items-center text-center">
            <div className="bg-primary/10 text-primary p-4 rounded-3xl mb-4"><Lock className="w-8 h-8" /></div>
            <DialogTitle className="text-2xl font-black uppercase">Access Locked</DialogTitle>
          </DialogHeader>
          <div className="py-6"><Input type="password" placeholder="ENCRYPTION KEY..." className="h-14 bg-slate-50 border-none rounded-2xl text-center font-black tracking-widest text-xl text-primary" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()} /></div>
          <DialogFooter className="flex-col gap-3"><Button onClick={handlePasswordSubmit} className="w-full h-14 rounded-2xl font-black uppercase text-xs bg-primary hover:bg-primary/90">Unlock Vault</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSellerPasswordDialogOpen} onOpenChange={setIsSellerPasswordDialogOpen}>
        <DialogContent className="rounded-3xl p-8 border-none shadow-2xl">
          <DialogHeader className="items-center text-center">
            <div className="bg-primary/10 text-primary p-4 rounded-3xl mb-4"><KeyRound className="w-8 h-8" /></div>
            <DialogTitle className="text-2xl font-black uppercase">Identity Verification</DialogTitle>
          </DialogHeader>
          <div className="py-6"><Input type="password" placeholder="ENTER PERSONAL KEY..." className="h-14 bg-slate-50 border-none rounded-2xl text-center font-black tracking-widest text-xl" value={sellerPasswordInput} onChange={(e) => setSellerPasswordInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSellerPasswordSubmit()} /></div>
          <DialogFooter><Button onClick={handleSellerPasswordSubmit} className="w-full h-14 rounded-2xl font-black uppercase text-xs bg-primary hover:bg-primary/90">Authorize Access</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSettlementDialogOpen} onOpenChange={setIsSettlementDialogOpen}>
        <DialogContent className="rounded-3xl p-8 border-none shadow-2xl">
          <DialogHeader className="items-center text-center">
            <div className="bg-primary/10 text-primary p-4 rounded-3xl mb-4"><Wallet className="w-8 h-8" /></div>
            <DialogTitle className="text-2xl font-black uppercase">Settle Payout</DialogTitle>
            <DialogDescription className="text-slate-500 font-bold">Confirm settlement of £{settlementBatch?.total.toFixed(2)} to {settlementBatch?.sellerId}.</DialogDescription>
          </DialogHeader>
          <div className="py-8 grid grid-cols-2 gap-4">
             <Button variant="outline" className="h-24 flex-col rounded-2xl gap-2 border-slate-100 hover:bg-primary/5 transition-all text-primary border-primary/20" onClick={() => handleMarkBatchPaid('cash')}><Banknote className="w-6 h-6" /><span className="font-black uppercase text-[10px]">Cash</span></Button>
             <Button variant="outline" className="h-24 flex-col rounded-2xl gap-2 border-slate-100 hover:bg-primary/5 transition-all text-primary border-primary/20" onClick={() => handleMarkBatchPaid('transfer')}><Send className="w-6 h-6" /><span className="font-black uppercase text-[10px]">Transfer</span></Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingSale} onOpenChange={(open) => !open && setEditingSale(null)}>
        <DialogContent className="rounded-3xl p-8 border-none shadow-2xl">
          <DialogHeader className="items-center text-center">
            <div className="bg-primary/10 text-primary p-4 rounded-3xl mb-4"><Pencil className="w-8 h-8" /></div>
            <DialogTitle className="text-2xl font-black uppercase">Edit Transaction</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Card Name / Detail</label><Input value={editSaleCard} onChange={(e) => setEditSaleCard(e.target.value)} className="h-12 rounded-xl px-4 font-bold border-slate-100" /></div>
            <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Sale Price (£)</label><Input type="number" step="0.01" value={editSalePrice} onChange={(e) => setEditSalePrice(e.target.value)} className="h-12 rounded-xl px-4 font-black border-slate-100" /></div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400">Assigned Seller</label>
              <Select value={editSaleSellerId} onValueChange={setEditSaleSellerId}>
                <SelectTrigger className="h-12 rounded-xl px-4 font-bold border-slate-100"><SelectValue placeholder="Change seller" /></SelectTrigger>
                <SelectContent className="rounded-xl">{sellers.map((s) => (<SelectItem key={s.id} value={s.id} className="font-bold py-3 uppercase text-xs">{s.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSaveEditSale} className="w-full h-14 rounded-2xl font-black uppercase text-xs bg-primary hover:bg-primary/90">Save Changes</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
