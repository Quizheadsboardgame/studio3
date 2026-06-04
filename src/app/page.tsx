"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { format, addDays, parseISO, nextFriday, isBefore, isAfter, startOfDay, differenceInWeeks, startOfWeek, endOfMonth, startOfMonth, subDays } from "date-fns";
import { 
  Plus, 
  Search, 
  Trash2, 
  Calendar as CalendarIcon,
  Pencil,
  History,
  Coins,
  Loader2,
  ShieldCheck,
  UserCircle,
  Lock,
  Settings2,
  Users,
  CreditCard,
  TrendingUp,
  LogOut,
  User,
  KeyRound,
  Archive,
  RefreshCw,
  Clock,
  Wallet,
  ArrowRightLeft,
  FileText,
  Download,
  Ticket,
  Trophy,
  Dices,
  CalendarDays,
  Sparkles,
  Rocket,
  Shield,
  Target,
  ListPlus,
  Info,
  Calculator,
  Receipt,
  Zap,
  Box,
  MoreVertical,
  UserPlus,
  Bell,
  Phone,
  MessageSquare,
  BarChart3,
  Percent,
  Landmark
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useSales, Seller, Sale, TradeInItem } from "@/hooks/use-sales";
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

type ProfileType = 'manager' | 'staff' | 'inventory' | 'seller' | 'trade' | 'raffle' | 'benefits';

const MANAGER_PASSWORD = "Harley";
const AUTH_EXPIRY_KEY = "newt_manager_auth_expiry";
const LEGAL_STATEMENT = "Newtons collectables is a trading names for journey together tcg Ltd company house number 16503957";

const THEMES: Record<ProfileType, { primary: string; ring: string }> = {
  manager: { primary: "222 47% 11%", ring: "222 47% 11%" }, 
  staff: { primary: "221 83% 53%", ring: "221 83% 53%" },   
  inventory: { primary: "142 71% 45%", ring: "142 71% 45%" },
  seller: { primary: "142 71% 45%", ring: "142 71% 45%" },  
  trade: { primary: "262 83% 58%", ring: "262 83% 58%" },
  raffle: { primary: "0 84.2% 60.2%", ring: "0 84.2% 60.2%" },
  benefits: { primary: "199 89% 48%", ring: "199 89% 48%" },
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

function calculateMaturityDate(saleDateStr: string) {
  try {
    const d = parseISO(saleDateStr);
    const isWednesday = d.getDay() === 3;
    if (isWednesday) {
      return format(startOfDay(addDays(d, 16)), "yyyy-MM-dd");
    }
    const minMaturity = addDays(d, 13);
    let maturity = minMaturity;
    while (maturity.getDay() !== 5) {
      maturity = addDays(maturity, 1);
    }
    return format(startOfDay(maturity), "yyyy-MM-dd");
  } catch {
    return "";
  }
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

  const [targetWeeklyPayout, setTargetWeeklyPayout] = useState("100");
  const [calcCommission, setCalcCommission] = useState("10");

  const { 
    sellers, 
    sales, 
    combinedSalesData, 
    tradeIns,
    raffleEntries,
    inventory,
    wantedStock,
    stockMatches,
    isLoaded, 
    addSeller, 
    updateSeller, 
    addSale, 
    deleteSale, 
    updateSale, 
    addTradeIn,
    deleteTradeIn,
    addRaffleEntry,
    deleteRaffleEntry,
    addInventoryItem,
    deleteInventoryItem,
    addWantedStock,
    deleteWantedStock,
    deleteStockMatch
  } = useSales(profileId, profileId === 'seller' ? authenticatedSellerId : (profileId === 'staff' ? selectedSellerId : null));
  
  const [newSaleCard, setNewSaleCard] = useState("");
  const [newSalePrice, setNewSalePrice] = useState("");
  const [newSaleQuantity, setNewSaleQuantity] = useState("1");
  const [entrySellerId, setEntrySellerId] = useState("");

  const [newPackQuantity, setNewPackQuantity] = useState("1");
  const [newPackPrice, setNewPackPrice] = useState("");

  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editSaleCard, setEditSaleCard] = useState("");
  const [editSalePrice, setEditSalePrice] = useState("");
  const [editSaleSellerId, setEditSaleSellerId] = useState("");

  const [newSellerName, setNewSellerName] = useState("");
  const [newSellerComm, setNewSellerComm] = useState("10");
  const [isNewSellerShareholder, setIsNewSellerShareholder] = useState(false);
  const [newSellerSharePercentage, setNewSellerSharePercentage] = useState("5");

  const [raffleName, setRaffleName] = useState("");
  const [raffleTickets, setRaffleTickets] = useState("");
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [isCountdownMode, setIsCountdownMode] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [winners, setWinners] = useState<string[]>([]);
  const [revealedWinners, setRevealedWinners] = useState<boolean[]>([false, false, false]);
  const [isDrawing, setIsDrawing] = useState(false);

  const [tradeInItems, setTradeInItems] = useState<TradeInItem[]>([]);
  const [tradeInItemName, setTradeInItemName] = useState("");
  const [tradeInItemValue, setTradeInItemValue] = useState("");
  const [tradeInCustomer, setTradeInCustomer] = useState("");

  const [newInventoryName, setNewInventoryName] = useState("");
  const [newInventoryPrice, setNewInventoryPrice] = useState("");
  const [newInventoryQuantity, setNewInventoryQuantity] = useState("1");

  const [stockSearchQuery, setStockSearchQuery] = useState("");
  const [isWantedStockDialogOpen, setIsWantedStockDialogOpen] = useState(false);
  const [wantedStockCustomer, setWantedStockCustomer] = useState("");
  const [wantedStockContact, setWantedStockContact] = useState("");

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
      setSelectedSellerId(activeSellers[0].id);
    }
  }, [activeSellers, entrySellerId]);

  useEffect(() => {
    if (profileId === 'seller' && authenticatedSellerId) {
      const seller = sellers.find(s => s.id === authenticatedSellerId);
      if (seller) {
        setCalcCommission(seller.defaultCommission?.toString() || "10");
      }
    }
  }, [profileId, authenticatedSellerId, sellers]);

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
    const entries = raffleEntries.filter(r => r.date === selectedDate);
    if (entries.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "No entries for this date." });
      return;
    }

    const pool: string[] = [];
    entries.forEach(entry => {
      for (let i = 0; i < entry.tickets; i++) {
        pool.push(entry.name);
      }
    });

    if (pool.length < 3) {
      toast({ variant: "destructive", title: "Error", description: "At least 3 tickets required for a full draw." });
      return;
    }

    const picked: string[] = [];
    const tempPool = [...pool];
    for (let i = 0; i < 3; i++) {
      const idx = Math.floor(Math.random() * tempPool.length);
      picked.push(tempPool[idx]);
      tempPool.splice(idx, 1);
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
      const runRevealSequence = async () => {
        setIsDrawing(true);
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

  const currentDayRaffleEntries = useMemo(() => raffleEntries.filter(r => r.date === selectedDate), [raffleEntries, selectedDate]);
  const currentDayTradeIns = useMemo(() => tradeIns.filter(t => t.date === selectedDate), [tradeIns, selectedDate]);

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

  const isSelectedDateFriday = useMemo(() => {
    if (!isMounted || !selectedDate) return false;
    try {
      return parseISO(selectedDate).getDay() === 5;
    } catch {
      return false;
    }
  }, [selectedDate, isMounted]);

  const sellerDailySalesRaw = useMemo(() => {
    if (!profileId || !authenticatedSellerId || !selectedDate) return [];
    
    if (isSelectedDateFriday) {
      return combinedSalesData.filter(sale => {
        if (sale.sellerId !== authenticatedSellerId) return false;
        return calculateMaturityDate(sale.saleDate) === selectedDate;
      });
    } else {
      return dailySalesData[authenticatedSellerId] || [];
    }
  }, [profileId, authenticatedSellerId, dailySalesData, selectedDate, combinedSalesData, isSelectedDateFriday]);

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
      if (isSelectedDateFriday) {
        payoutDateStr = format(parseISO(selectedDate), "PPP");
      } else {
        const maturityStr = calculateMaturityDate(selectedDate);
        if (maturityStr) payoutDateStr = format(parseISO(maturityStr), "PPP");
      }
    }

    return {
      total,
      commission: comm,
      payout: total - comm,
      payoutDate: payoutDateStr
    };
  }, [sellerDailySalesRaw, selectedDate, isMounted, isSelectedDateFriday]);

  const shareholderEarnings = useMemo(() => {
    if (!authenticatedSellerId) return { current: 0, lifetime: 0 };
    const seller = sellers.find(s => s.id === authenticatedSellerId);
    if (!seller || !seller.isShareholder) return { current: 0, lifetime: 0 };

    const sharePercentage = (seller.shareholderPercentage || 0) / 100;
    
    // Calculate current period earnings (based on current filtered date)
    const currentCommTotal = allDailySalesRaw.reduce((acc, s) => acc + (s.commission || 0), 0);
    const currentEarnings = currentCommTotal * sharePercentage;

    // Calculate lifetime earnings
    const lifetimeCommTotal = combinedSalesData.reduce((acc, s) => acc + (s.commission || 0), 0);
    const lifetimeEarnings = lifetimeCommTotal * sharePercentage;

    return {
      current: currentEarnings,
      lifetime: lifetimeEarnings
    };
  }, [authenticatedSellerId, sellers, allDailySalesRaw, combinedSalesData]);

  const sellerLifetimeStats = useMemo(() => {
    if (!authenticatedSellerId || !combinedSalesData) return { earned: 0, owed: 0, settled: 0, since: "N/A", avgWeekly: 0 };
    const sellerSales = combinedSalesData.filter(s => s.sellerId === authenticatedSellerId);
    
    if (sellerSales.length === 0) return { earned: 0, owed: 0, settled: 0, since: "N/A", avgWeekly: 0 };

    const firstSale = sellerSales.reduce((min, s) => s.saleDate < min ? s.saleDate : min, sellerSales[0].saleDate);
    const firstSaleObj = parseISO(firstSale);
    const weeksActive = Math.max(1, differenceInWeeks(new Date(), firstSaleObj));

    const today = startOfDay(new Date());

    const totals = sellerSales.reduce((acc, s) => {
      const net = s.price - (s.commission || 0);
      acc.earned += net;
      
      const maturityStr = calculateMaturityDate(s.saleDate);
      if (maturityStr && isBefore(startOfDay(parseISO(maturityStr)), today)) {
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

  const inventoryTotals = useMemo(() => {
    const commRate = parseFloat(calcCommission) || 10;
    const factor = (100 - commRate) / 100;
    
    return inventory.reduce((acc, item) => {
      const gross = item.price * (item.quantity || 1);
      const net = gross * factor;
      acc.totalGross += gross;
      acc.totalNet += net;
      return acc;
    }, { totalGross: 0, totalNet: 0 });
  }, [inventory, calcCommission]);

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
    const nextFridayDate = startOfDay(addDays(thisFridayDate, 7));

    const forecast = {
      thisFriday: { date: thisFridayDate, total: 0, count: 0, sellers: {} as Record<string, { total: number, ids: string[] }> },
      nextFriday: { date: nextFridayDate, total: 0, count: 0, sellers: {} as Record<string, { total: number, ids: string[] }> }
    };

    combinedSalesData.forEach(sale => {
      try {
        const maturityDateStr = calculateMaturityDate(sale.saleDate);
        if (!maturityDateStr) return;
        const maturityDate = startOfDay(parseISO(maturityDateStr));
        const net = sale.price - (sale.commission || 0);
        const seller = sellers.find(s => s.id === sale.sellerId);
        const sellerName = seller?.name || sale.sellerId;

        if (!isAfter(maturityDate, thisFridayDate)) {
          forecast.thisFriday.total += net;
          forecast.thisFriday.count += 1;
          if (!forecast.thisFriday.sellers[sellerName]) forecast.thisFriday.sellers[sellerName] = { total: 0, ids: [] };
          forecast.thisFriday.sellers[sellerName].total += net;
          forecast.thisFriday.sellers[sellerName].ids.push(sale.id!);
        } else if (!isAfter(maturityDate, nextFridayDate)) {
          forecast.nextFriday.total += net;
          forecast.nextFriday.count += 1;
          if (!forecast.nextFriday.sellers[sellerName]) forecast.nextFriday.sellers[sellerName] = { total: 0, ids: [] };
          forecast.nextFriday.sellers[sellerName].total += net;
          forecast.nextFriday.sellers[sellerName].ids.push(sale.id!);
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
    if (newProfile !== 'seller' && newProfile !== 'benefits') {
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

  const handleAddSale = () => {
    const priceNum = parseFloat(newSalePrice);
    const qtyNum = parseInt(newSaleQuantity);
    if (entrySellerId && newSaleCard.trim() && !isNaN(priceNum) && !isNaN(qtyNum)) {
      const total = priceNum * qtyNum;
      const finalCardName = qtyNum > 1 ? `${newSaleCard.trim()} (x${qtyNum})` : newSaleCard.trim();
      addSale(selectedDate, entrySellerId, finalCardName, total, qtyNum);
      setNewSaleCard("");
      setNewSalePrice("");
      setNewSaleQuantity("1");
      toast({ title: "Success", description: "Transaction logged." });
    }
  };

  const handleAddPackSale = () => {
    const qtyNum = parseInt(newPackQuantity);
    const priceNum = parseFloat(newPackPrice);
    if (entrySellerId && !isNaN(qtyNum) && !isNaN(priceNum)) {
      const total = qtyNum * priceNum;
      const desc = `Booster Packs (${qtyNum}x @ £${priceNum.toFixed(2)})`;
      addSale(selectedDate, entrySellerId, desc, total, qtyNum);
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

  const handleAddNewSeller = () => {
    const comm = parseFloat(newSellerComm);
    const sharePercentage = parseFloat(newSellerSharePercentage);
    if (newSellerName.trim() && !isNaN(comm)) {
      addSeller(
        newSellerName.trim(), 
        comm, 
        isNewSellerShareholder, 
        isNewSellerShareholder ? sharePercentage : 0
      );
      setNewSellerName("");
      setNewSellerComm("10");
      setIsNewSellerShareholder(false);
      setNewSellerSharePercentage("5");
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

  const handleAddInventory = () => {
    const price = parseFloat(newInventoryPrice);
    const qty = parseInt(newInventoryQuantity);
    if (newInventoryName && !isNaN(price) && !isNaN(qty)) {
      addInventoryItem(newInventoryName, price, qty);
      setNewInventoryName("");
      setNewInventoryPrice("");
      setNewInventoryQuantity("1");
      toast({ title: "Item Preloaded", description: "Added to your quick-list." });
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
      const payoutDate = sellerStats.payoutDate;

      doc.setFontSize(22);
      doc.text("Newton's Collectables", 14, 20);
      doc.setFontSize(10);
      doc.text(`INVOICE #${invoiceNum}`, 196, 20, { align: 'right' });
      doc.line(14, 33, 196, 33);
      doc.text(`Seller: ${seller.name}`, 14, 43);
      doc.text(`Report Date: ${formattedDate}`, 14, 48);
      doc.text(isSelectedDateFriday ? `Settlement Run Date: ${payoutDate}` : `Estimated Payout Date: ${payoutDate}`, 14, 53);

      autoTable(doc, {
        startY: 63,
        head: [['Card Details', 'Qty', 'Gross Price', 'Net Payout', 'Running Total']],
        body: sellerDailySalesAggregated.map(sale => [
          sale.cardName,
          sale.quantity || 1,
          `£${sale.price.toFixed(2)}`, 
          `£${(sale.price - (sale.commission || 0)).toFixed(2)}`,
          `£${((sale as any).runningTotal || 0).toFixed(2)}`
        ]),
        theme: 'grid',
        headStyles: { fillColor: [0, 0, 0] },
        margin: { top: 60 }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;
      
      doc.setFont(undefined, 'bold');
      doc.text(isSelectedDateFriday ? "Settlement Summary" : "Daily Summary", 120, finalY + 5);
      doc.setFont(undefined, 'normal');
      doc.rect(120, finalY + 8, 76, 35);
      doc.text(`Gross: £${sellerStats.total.toFixed(2)}`, 125, finalY + 18);
      doc.text(`NC Commission: £${sellerStats.commission.toFixed(2)}`, 125, finalY + 24);
      doc.setFont(undefined, 'bold');
      doc.text(`Net Payout: £${sellerStats.payout.toFixed(2)}`, 125, finalY + 34);

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

  const handleDownloadShareholderPDF = () => {
    if (!authenticatedSellerId) return;
    const seller = sellers.find(s => s.id === authenticatedSellerId);
    if (!seller || !seller.isShareholder) return;

    const doc = new jsPDF();
    const today = new Date();
    const monthName = format(today, "MMMM yyyy");
    
    // Find last Friday of the current month
    const monthEndObj = endOfMonth(today);
    let payoutDate = monthEndObj;
    while (payoutDate.getDay() !== 5) {
      payoutDate = subDays(payoutDate, 1);
    }
    const payoutDateStr = format(payoutDate, "do MMMM yyyy");

    // Filter sales for the current month
    const monthStartObj = startOfMonth(today);
    const monthSales = combinedSalesData.filter(s => {
      const saleDate = parseISO(s.saleDate);
      return !isBefore(saleDate, monthStartObj) && !isAfter(saleDate, monthEndObj);
    });

    const totalShopGross = monthSales.reduce((acc, s) => acc + s.price, 0);
    const totalShopComm = monthSales.reduce((acc, s) => acc + (s.commission || 0), 0);
    const dividendAmount = (totalShopComm * (seller.shareholderPercentage || 0)) / 100;

    try {
      doc.setFontSize(22);
      doc.text("Newton's Collectables", 14, 20);
      doc.setFontSize(10);
      doc.text(`DIVIDEND REPORT - ${monthName.toUpperCase()}`, 196, 20, { align: 'right' });
      doc.line(14, 33, 196, 33);
      
      doc.setFont(undefined, 'bold');
      doc.text(`Shareholder: ${seller.name}`, 14, 43);
      doc.setFont(undefined, 'normal');
      doc.text(`Report Period: ${monthName}`, 14, 48);
      doc.text(`Scheduled Payout Date: Friday, ${payoutDateStr}`, 14, 53);

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text("Monthly Performance Summary", 14, 70);
      
      autoTable(doc, {
        startY: 75,
        body: [
          ["Total Shop Sales (Gross)", `£${totalShopGross.toFixed(2)}`],
          ["Total Commissions Collected", `£${totalShopComm.toFixed(2)}`],
          ["Your Dividend Share (%)", `${seller.shareholderPercentage}%`],
          ["Net Dividend Payout", `£${dividendAmount.toFixed(2)}`]
        ],
        theme: 'striped',
        styles: { fontSize: 11, cellPadding: 5 },
        columnStyles: { 0: { fontStyle: 'bold', width: 100 }, 1: { halign: 'right' } }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 20;
      doc.setFontSize(9);
      doc.setFont(undefined, 'italic');
      doc.text("Notes: Shareholder dividends are calculated based on the total commissions collected by the shop from all active sellers during the calendar month. Payouts are finalized on the last Friday of every month.", 14, finalY, { maxWidth: 180 });

      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text(LEGAL_STATEMENT, 14, 285, { maxWidth: 180 });
      
      doc.save(`NC_Dividend_${seller.name}_${format(today, "MMM_yyyy")}.pdf`);
    } catch (err) {
      toast({ variant: "destructive", title: "PDF Error", description: "Failed to dividend report." });
    }
  };

  const incomeGoalCalc = useMemo(() => {
    const target = parseFloat(targetWeeklyPayout) || 0;
    const comm = parseFloat(calcCommission) || 10;
    const factor = (100 - comm) / 100;
    const grossNeeded = factor > 0 ? target / factor : 0;
    
    // Calculate current week progress (from Monday of current week)
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekSales = combinedSalesData.filter(s => {
      const saleDate = parseISO(s.saleDate);
      return s.sellerId === authenticatedSellerId && !isBefore(saleDate, weekStart);
    });
    
    const currentWeekNet = weekSales.reduce((acc, s) => acc + (s.price - (s.commission || 0)), 0);
    const progressPercent = target > 0 ? (currentWeekNet / target) * 100 : 0;
    const remainingToGoal = Math.max(0, target - currentWeekNet);

    return {
      grossSalesNeeded: grossNeeded,
      commissionPaid: grossNeeded - target,
      currentWeekNet,
      progressPercent,
      remainingToGoal
    };
  }, [targetWeeklyPayout, calcCommission, combinedSalesData, authenticatedSellerId]);

  const stockSearchResults = useMemo(() => {
    if (!stockSearchQuery) return [];
    const query = stockSearchQuery.toLowerCase();
    return inventory.filter(i => i.name.toLowerCase().includes(query));
  }, [stockSearchQuery, inventory]);

  const handleCreateWantedStock = () => {
    if (stockSearchQuery && wantedStockCustomer && wantedStockContact) {
      addWantedStock(stockSearchQuery, wantedStockCustomer, wantedStockContact, selectedDate);
      setWantedStockCustomer("");
      setWantedStockContact("");
      setStockSearchQuery("");
      setIsWantedStockDialogOpen(false);
      toast({ title: "Wanted Stock Notice Created", description: "A message has been posted to the Seller Vault boards." });
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
                  {profileId === 'inventory' && <Search className="w-4 h-4 text-primary" />}
                  {profileId === 'seller' && <User className="w-4 h-4 text-primary" />}
                  {profileId === 'trade' && <Zap className="w-4 h-4 text-primary" />}
                  {profileId === 'raffle' && <Ticket className="w-4 h-4 text-primary" />}
                  {profileId === 'benefits' && <Sparkles className="w-4 h-4 text-primary" />}
                  VAULT: {profileId}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl p-2 border-primary/10 shadow-xl">
              <DropdownMenuItem onClick={() => handleProfileSwitch('manager')} className="gap-3 py-3 font-bold"><ShieldCheck className="w-5 h-5 text-slate-700" /> MANAGER</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleProfileSwitch('staff')} className="gap-3 py-3 font-bold"><UserCircle className="w-5 h-5 text-blue-600" /> STAFF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleProfileSwitch('inventory')} className="gap-3 py-3 font-bold"><Search className="w-5 h-5 text-emerald-600" /> STOCK SEARCH</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleProfileSwitch('trade')} className="gap-3 py-3 font-bold"><Zap className="w-5 h-5 text-purple-600" /> TRADE-IN</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleProfileSwitch('raffle')} className="gap-3 py-3 font-bold"><Ticket className="w-5 h-5 text-red-600" /> RAFFLE</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleProfileSwitch('benefits')} className="gap-3 py-3 font-bold"><Sparkles className="w-5 h-5 text-cyan-600" /> SELLER BENEFITS</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleProfileSwitch('seller')} className="gap-3 py-3 font-bold"><User className="w-5 h-5 text-emerald-600" /> SELLER VAULT</DropdownMenuItem>
              {isManagerAuthenticated && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="gap-3 py-3 text-destructive font-bold"><LogOut className="w-5 h-5" /> EXIT VAULT</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {profileId !== 'benefits' && (
            <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 h-11 shadow-sm">
              <CalendarIcon className="w-4 h-4 text-primary" />
              <input 
                type="date" 
                className="bg-transparent outline-none text-sm font-bold uppercase text-slate-700"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          )}
        </div>
      </header>

      {profileId === 'benefits' && (
        <div className="space-y-12 animate-in fade-in zoom-in-95 duration-700">
           <section className="text-center space-y-4 py-12">
             <Badge className="bg-primary/10 text-primary border-primary/20 h-8 px-4 rounded-full font-black uppercase tracking-widest text-[10px]">Grow With Us</Badge>
             <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter">Why Sell With Newton's?</h1>
             <p className="text-slate-500 font-bold max-w-2xl mx-auto text-lg">Join a professional ecosystem built by collectors, for collectors. We provide the tools you need to turn your hobby into a professional enterprise.</p>
           </section>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             <Card className="shadow-sm border-none rounded-[2.5rem] bg-white p-8 space-y-6 hover:shadow-xl transition-all duration-500 group">
               <div className="w-16 h-16 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                 <Shield className="w-8 h-8" />
               </div>
               <div className="space-y-3">
                 <h3 className="text-xl font-black uppercase tracking-tight">Personal Sales Vault</h3>
                 <p className="text-slate-500 text-sm font-medium leading-relaxed">Every seller gets a private, encrypted vault. Track every card sale in real-time and audit performance from any device.</p>
               </div>
             </Card>

             <Card className="shadow-sm border-none rounded-[2.5rem] bg-white p-8 space-y-6 hover:shadow-xl transition-all duration-500 group">
               <div className="w-16 h-16 rounded-3xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                 <Wallet className="w-8 h-8" />
               </div>
               <div className="space-y-3">
                 <h3 className="text-xl font-black uppercase tracking-tight">Consistent Payouts</h3>
                 <p className="text-slate-500 text-sm font-medium leading-relaxed">Enjoy reliable Friday payout runs. Automated settlement logic ensures funds are cleared precisely 13-16 days after sale.</p>
               </div>
             </Card>

             <Card className="shadow-sm border-none rounded-[2.5rem] bg-white p-8 space-y-6 hover:shadow-xl transition-all duration-500 group">
               <div className="w-16 h-16 rounded-3xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                 <FileText className="w-8 h-8" />
               </div>
               <div className="space-y-3">
                 <h3 className="text-xl font-black uppercase tracking-tight">Professional Reports</h3>
                 <p className="text-slate-500 text-sm font-medium leading-relaxed">Download official PDF invoices for every payout run. Perfect for your accounting and tracking your hobby's growth.</p>
               </div>
             </Card>

             <Card className="shadow-sm border-none rounded-[2.5rem] bg-white p-8 space-y-6 hover:shadow-xl transition-all duration-500 group">
               <div className="w-16 h-16 rounded-3xl bg-cyan-50 flex items-center justify-center text-cyan-600 group-hover:scale-110 transition-transform">
                 <Rocket className="w-8 h-8" />
               </div>
               <div className="space-y-3">
                 <h3 className="text-xl font-black uppercase tracking-tight">Growth Analytics</h3>
                 <p className="text-slate-500 text-sm font-medium leading-relaxed">Understand your selling velocity and refine your inventory strategy with hard data and weekly payout milestones.</p>
               </div>
             </Card>

             <Card className="shadow-sm border-none rounded-[2.5rem] bg-white p-8 space-y-6 hover:shadow-xl transition-all duration-500 group">
               <div className="w-16 h-16 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                 <Landmark className="w-8 h-8" />
               </div>
               <div className="space-y-3">
                 <h3 className="text-xl font-black uppercase tracking-tight">Shareholder Dividends</h3>
                 <p className="text-slate-500 text-sm font-medium leading-relaxed">High-volume sellers can be promoted to Shareholders, earning a direct percentage of the total shop commission pool.</p>
               </div>
             </Card>

             <Card className="shadow-sm border-none rounded-[2.5rem] bg-white p-8 space-y-6 hover:shadow-xl transition-all duration-500 group">
               <div className="w-16 h-16 rounded-3xl bg-rose-50 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform">
                 <Target className="w-8 h-8" />
               </div>
               <div className="space-y-3">
                 <h3 className="text-xl font-black uppercase tracking-tight">Customer Matching</h3>
                 <p className="text-slate-500 text-sm font-medium leading-relaxed">Be notified immediately when a customer is looking for stock you have preloaded, helping you sell faster and smarter.</p>
               </div>
             </Card>
           </div>
        </div>
      )}

      {profileId === 'inventory' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 shadow-sm border-none rounded-2xl overflow-hidden bg-white">
              <CardHeader className="border-b bg-slate-50/20 px-8 py-6">
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-primary" />
                  <CardTitle className="text-xl font-black uppercase">Inventory Search & Wanted List</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input 
                    placeholder="Search master inventory..." 
                    className="pl-12 h-14 rounded-2xl font-bold border-slate-100 focus-visible:ring-primary shadow-sm"
                    value={stockSearchQuery}
                    onChange={(e) => setStockSearchQuery(e.target.value)}
                  />
                </div>

                {stockSearchQuery && (
                  <div className="space-y-4">
                    {stockSearchResults.length > 0 ? (
                      <div className="bg-slate-50 rounded-2xl border p-2">
                        {stockSearchResults.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 hover:bg-white rounded-xl transition-all">
                            <span className="font-black uppercase text-xs text-slate-700">{item.name}</span>
                            <div className="flex items-center gap-4">
                              <Badge className="bg-primary/10 text-primary border-primary/20 font-black">£{item.price.toFixed(2)}</Badge>
                              <span className="text-[10px] font-black uppercase text-slate-400">Qty: {item.quantity}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-red-50 border border-red-100 rounded-[2.5rem] p-8 text-center space-y-6">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto"><Box className="w-8 h-8" /></div>
                        <div className="space-y-2">
                          <h3 className="text-xl font-black uppercase tracking-tight text-red-900">Item Not in Stock</h3>
                          <p className="text-red-700/60 font-bold text-sm">Would you like to create a Wanted Stock Notice for "{stockSearchQuery}"?</p>
                        </div>
                        <Button onClick={() => setIsWantedStockDialogOpen(true)} className="bg-red-600 hover:bg-red-700 text-white font-black uppercase h-12 rounded-2xl px-8 gap-2"><Plus className="w-4 h-4" /> Create Wanted Notice</Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm border-none rounded-2xl bg-white overflow-hidden">
              <CardHeader className="p-8 border-b bg-slate-50/20">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <CardTitle className="text-sm font-black uppercase">Active Customer Requests</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  <div className="divide-y">
                    {wantedStock.map((wanted) => (
                      <div key={wanted.id} className="p-6 space-y-2 hover:bg-slate-50 transition-colors group">
                        <div className="flex justify-between items-start">
                          <span className="font-black text-slate-900 uppercase text-xs">{wanted.cardName}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 opacity-0 group-hover:opacity-100" onClick={() => deleteWantedStock(wanted.id!)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                        <div className="flex flex-col gap-1">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2"><User className="w-3 h-3" /> {wanted.customerName}</p>
                          <p className="text-[10px] font-black uppercase text-primary tracking-wider flex items-center gap-2">
                            <Phone className="w-3 h-3" /> 
                            {isManagerAuthenticated ? wanted.contactNumber : "•••• ••• ••• (MANAGER ONLY)"}
                          </p>
                        </div>
                      </div>
                    ))}
                    {wantedStock.length === 0 && <div className="p-12 text-center text-slate-300 italic text-xs">No active requests.</div>}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

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
                              className="absolute inset-0 w-full h-full opacity-0_cursor-pointer"
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

      {profileId === 'trade' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in zoom-in-95 duration-700">
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

      {profileId === 'manager' && (
        <Tabs defaultValue="search" className="space-y-8 animate-in slide-in-from-top-4 duration-700">
          <TabsList className="bg-white border rounded-2xl h-14 p-1 shadow-sm gap-1 overflow-x-auto justify-start md:justify-center">
            <TabsTrigger value="search" className="rounded-xl font-black uppercase text-[10px] gap-2 h-full px-4 md:px-6 data-[state=active]:bg-primary data-[state=active]:text-white whitespace-nowrap">
              <Search className="w-3.5 h-3.5" /> Search Audit
            </TabsTrigger>
            <TabsTrigger value="payouts" className="rounded-xl font-black uppercase text-[10px] gap-2 h-full px-4 md:px-6 data-[state=active]:bg-primary data-[state=active]:text-white whitespace-nowrap">
              <Wallet className="w-3.5 h-3.5" /> Settlements
            </TabsTrigger>
            <TabsTrigger value="matches" className="rounded-xl font-black uppercase text-[10px] gap-2 h-full px-4 md:px-6 data-[state=active]:bg-primary data-[state=active]:text-white whitespace-nowrap">
              <Bell className="w-3.5 h-3.5" /> Stock Matches
              {stockMatches.length > 0 && <Badge className="ml-2 h-4 w-4 p-0 flex items-center justify-center bg-red-600 text-[8px] animate-pulse">{stockMatches.length}</Badge>}
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
                            <TableCell className="text-right pr-8">
                               <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary" onClick={() => handleEditSale(sale)}><Pencil className="w-3.5 h-3.5" /></Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-destructive" onClick={() => deleteSale(sale.id!, sale.profileOrigin)}><Trash2 className="w-3.5 h-3.5" /></Button>
                               </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow><TableCell colSpan={6} className="h-48 text-center text-slate-400 italic">No matches found for "{searchQuery}".</TableCell></TableRow>
                      )
                    ) : (
                      <TableRow><TableCell colSpan={6} className="h-48 text-center text-slate-400 italic">Enter a query above to search the master database.</TableCell></TableRow>
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
                            <div key={i} className="flex justify-between items-center text-xs p-3 rounded-xl bg-slate-50 group border border-transparent transition-all mb-2">
                              <span className="font-bold uppercase tracking-widest text-[10px] text-slate-600">{name}</span>
                              <div className="flex items-center gap-3">
                                <span className="font-black text-slate-900">£{data.total.toFixed(2)}</span>
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
                            <div key={i} className="flex justify-between items-center text-xs p-3 rounded-xl bg-slate-50 group border border-transparent transition-all mb-2">
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

          <TabsContent value="matches" className="focus-visible:outline-none">
            <Card className="shadow-sm border-none rounded-3xl bg-white overflow-hidden">
              <CardHeader className="p-8 border-b bg-slate-50/20">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-primary" />
                  <CardTitle className="text-sm font-black uppercase">Stock Match Notifications</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="pl-8 font-black uppercase text-[10px] h-14">Matching Item</TableHead>
                      <TableHead className="font-black uppercase text-[10px] h-14">Seller</TableHead>
                      <TableHead className="font-black uppercase text-[10px] h-14">Customer Name</TableHead>
                      <TableHead className="font-black uppercase text-[10px] h-14">Contact Details</TableHead>
                      <TableHead className="text-right pr-8 font-black uppercase text-[10px] h-14">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockMatches.map((match) => {
                      const wanted = wantedStock.find(w => w.id === match.wantedStockId);
                      return (
                        <TableRow key={match.id} className="hover:bg-slate-50/50 h-20 transition-colors">
                          <TableCell className="pl-8">
                            <p className="font-black text-slate-900 uppercase text-xs">{match.itemName}</p>
                            <p className="text-[10px] text-slate-400 font-bold">MATCH FOUND ON {format(parseISO(match.date), "PPP")}</p>
                          </TableCell>
                          <TableCell><Badge className="bg-primary/10 text-primary border-primary/20 font-black text-[10px] uppercase">{match.sellerName}</Badge></TableCell>
                          <TableCell className="font-bold uppercase text-xs">{wanted?.customerName || "Unknown"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-primary font-black text-xs">
                              <Phone className="w-3 h-3" /> {wanted?.contactNumber || "N/A"}
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-8">
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-300 hover:text-destructive" onClick={() => deleteStockMatch(match.id!)}><Trash2 className="w-4 h-4" /></Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {stockMatches.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="h-48 text-center text-slate-400 italic">No new stock matches detected.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
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
                  <div className="flex items-center space-x-2 py-2">
                    <Checkbox 
                      id="isShareholder" 
                      checked={isNewSellerShareholder} 
                      onCheckedChange={(checked) => setIsNewSellerShareholder(!!checked)} 
                    />
                    <label htmlFor="isShareholder" className="text-xs font-black uppercase text-slate-600 cursor-pointer">Register as Shareholder</label>
                  </div>
                  {isNewSellerShareholder && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                      <label className="text-[10px] font-black uppercase text-slate-400">Dividend Share %</label>
                      <div className="relative">
                        <Input 
                          type="number" 
                          placeholder="5" 
                          className="h-12 rounded-xl pr-10 font-black border-primary/20"
                          value={newSellerSharePercentage}
                          onChange={(e) => setNewSellerSharePercentage(e.target.value)}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-primary">%</span>
                      </div>
                    </div>
                  )}
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
                        <TableHead className="font-black uppercase text-[10px] h-14">Type</TableHead>
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
                          <TableCell>
                            {seller.isShareholder ? (
                              <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-black text-[8px] gap-1">
                                <Landmark className="w-2.5 h-2.5" /> SHAREHOLDER ({seller.shareholderPercentage}%)
                              </Badge>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400 uppercase">STANDARD</span>
                            )}
                          </TableCell>
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
                                {seller.isShareholder && (
                                  <DropdownMenuItem onClick={() => {
                                    const newShare = prompt("Enter new share %:", seller.shareholderPercentage?.toString());
                                    if (newShare !== null) updateSeller(seller.id, { shareholderPercentage: parseFloat(newShare) });
                                  }} className="gap-2 text-amber-600"><Percent className="w-4 h-4" /> Edit Dividend Share</DropdownMenuItem>
                                )}
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

      {profileId === 'staff' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
          <Card className="shadow-sm border-none rounded-2xl overflow-hidden bg-white">
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
                  <Select value={entrySellerId} onValueChange={(val) => { setEntrySellerId(val); setSelectedSellerId(val); }}>
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
                  
                  {entrySellerId && inventory.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Quick-Select Preloaded Item</p>
                      <Select onValueChange={(val) => {
                        const item = inventory.find(i => i.id === val);
                        if (item) {
                          setNewSaleCard(item.name);
                          setNewSalePrice(item.price.toString());
                          setNewSaleQuantity("1");
                        }
                      }}>
                        <SelectTrigger className="h-11 rounded-xl px-4 font-bold text-xs border-primary/20">
                          <SelectValue placeholder="Select an item to auto-fill..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {inventory.map((item) => (
                            <SelectItem key={item.id} value={item.id!} className="font-bold py-3 uppercase text-[10px]">
                              {item.name} — £{item.price.toFixed(2)} {item.quantity ? `(${item.quantity} in stock)` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Separator className="my-4" />
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Card Detail</label><Input placeholder="e.g., Rare Holographic Charizard" className="h-12 rounded-xl px-4 font-bold focus-visible:ring-primary" value={newSaleCard} onChange={(e) => setNewSaleCard(e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Price (Each)</label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-primary">£</span><Input type="number" step="0.01" placeholder="0.00" className="h-12 rounded-xl pl-8 font-black focus-visible:ring-primary" value={newSalePrice} onChange={(e) => setNewSalePrice(e.target.value)} /></div></div>
                      <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Quantity</label><Input type="number" min="1" className="h-12 rounded-xl px-4 font-bold focus-visible:ring-primary" value={newSaleQuantity} onChange={(e) => setNewSaleQuantity(e.target.value)} /></div>
                    </div>
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
                          <TableCell className="font-bold uppercase text-xs">
                            {sale.cardName}
                            {sale.quantity && sale.quantity > 1 && (
                              <span className="ml-2 text-[10px] text-slate-400 font-black">x{sale.quantity}</span>
                            )}
                          </TableCell>
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
        </div>
      )}

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
                  <CardHeader className="p-6 pb-2">
                    <CardTitle className="text-[10px] font-black uppercase text-slate-400">
                      {isSelectedDateFriday ? "Total Run Amount" : "Gross Sales Today"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-0"><div className="text-4xl font-black tracking-tighter text-slate-900">£{sellerStats.total.toFixed(2)}</div></CardContent>
                </Card>
                <Card className="shadow-sm border-none rounded-3xl bg-white">
                  <CardHeader className="p-6 pb-2"><CardTitle className="text-[10px] font-black uppercase text-slate-400">Total Owed (Future)</CardTitle></CardHeader>
                  <CardContent className="p-6 pt-0"><div className="text-4xl font-black tracking-tighter text-blue-600">£{sellerLifetimeStats.owed.toFixed(2)}</div></CardContent>
                </Card>
                <Card className="shadow-sm border-none rounded-3xl bg-white">
                  <CardHeader className="p-6 pb-2"><CardTitle className="text-[10px] font-black uppercase text-slate-400">Lifetime Earned</CardTitle></CardHeader>
                  <CardContent className="p-6 pt-0"><div className="text-4xl font-black tracking-tighter text-green-600">£{sellerLifetimeStats.earned.toFixed(2)}</div></CardContent>
                </Card>
                <Card className="shadow-sm border-none rounded-3xl bg-primary text-white">
                  <CardHeader className="p-6 pb-2">
                    <CardTitle className="text-[10px] font-black uppercase text-white/60">
                      {isSelectedDateFriday ? "Friday Settlement Total" : "Net Payout Today"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="text-4xl font-black tracking-tighter text-white">£{sellerStats.payout.toFixed(2)}</div>
                    <div className="mt-2 flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-white/50"><Clock className="w-2.5 h-2.5" /> {isSelectedDateFriday ? 'Settlement Run' : `Due: ${sellerStats.payoutDate}`}</div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {authenticatedSellerId && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
               {sellers.find(s => s.id === authenticatedSellerId)?.isShareholder && (
                  <Card className="bg-amber-600 rounded-[3rem] p-10 text-white relative overflow-hidden group shadow-lg">
                    <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-white/20 blur-[150px] rounded-full group-hover:scale-125 transition-transform duration-1000" />
                    <div className="relative z-10 space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-2xl"><Landmark className="w-6 h-6" /></div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter">Dividend Portfolio</h2>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-white/60 tracking-widest">Period Dividends</p>
                        <p className="text-4xl font-black">£{shareholderEarnings.current.toFixed(2)}</p>
                      </div>
                      <Separator className="bg-white/20" />
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[8px] font-black uppercase text-white/60">Shop Share</p>
                          <p className="text-lg font-black">{sellers.find(s => s.id === authenticatedSellerId)?.shareholderPercentage}%</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-black uppercase text-white/60">Lifetime Earnings</p>
                          <p className="text-lg font-black">£{shareholderEarnings.lifetime.toFixed(2)}</p>
                        </div>
                      </div>
                      <Button onClick={handleDownloadShareholderPDF} variant="outline" className="w-full h-10 rounded-2xl gap-2 font-black uppercase text-[9px] border-white/20 text-white hover:bg-white/10 hover:text-white">
                        <FileText className="w-3.5 h-3.5" /> Export Dividend Report (PDF)
                      </Button>
                      <p className="text-[8px] font-bold uppercase text-white/40 text-center">Payouts on the last Friday of every month</p>
                    </div>
                  </Card>
               )}

               <Card className={cn("bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden group", sellers.find(s => s.id === authenticatedSellerId)?.isShareholder ? "lg:col-span-1" : "lg:col-span-1")}>
                  <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-primary/20 blur-[150px] rounded-full group-hover:animate-pulse transition-all duration-1000" />
                  <div className="relative z-10 space-y-6">
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-2xl"><Target className="w-6 h-6 text-primary" /></div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter">Earning Goals</h2>
                     </div>
                     
                     <div className="space-y-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-white/40">Target Weekly Payout (£)</label>
                           <Input 
                              type="number" 
                              value={targetWeeklyPayout} 
                              onChange={(e) => setTargetWeeklyPayout(e.target.value)} 
                              className="h-14 bg-white/5 border-white/10 text-white font-black text-xl rounded-2xl focus-visible:ring-primary"
                           />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                              <p className="text-[8px] font-black uppercase text-white/40 mb-1">Required Gross</p>
                              <p className="text-lg font-black">£{incomeGoalCalc.grossSalesNeeded.toFixed(2)}</p>
                           </div>
                           <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                              <p className="text-[8px] font-black uppercase text-white/40 mb-1">Commission Paid</p>
                              <p className="text-lg font-black text-red-400">£{incomeGoalCalc.commissionPaid.toFixed(2)}</p>
                           </div>
                        </div>

                        <Separator className="bg-white/10" />

                        <div className="space-y-3">
                           <div className="flex justify-between items-end">
                              <div>
                                 <p className="text-[10px] font-black uppercase text-primary tracking-widest">Personal Progress</p>
                                 <p className="text-3xl font-black">£{incomeGoalCalc.currentWeekNet.toFixed(2)}</p>
                              </div>
                              <Badge className="bg-primary/20 text-primary font-black border-none h-6">{Math.round(incomeGoalCalc.progressPercent)}%</Badge>
                           </div>
                           <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                              <div 
                                 className="h-full bg-primary transition-all duration-1000" 
                                 style={{ width: `${Math.min(100, incomeGoalCalc.progressPercent)}%` }} 
                              />
                           </div>
                           <p className="text-[9px] font-bold text-white/30 uppercase text-center">£{incomeGoalCalc.remainingToGoal.toFixed(2)} more to reach goal</p>
                        </div>
                     </div>
                  </div>
               </Card>

               <Card className="bg-white rounded-[3rem] p-10 border-none shadow-sm space-y-6 lg:col-span-1">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-blue-50 rounded-2xl"><ListPlus className="w-6 h-6 text-blue-500" /></div>
                       <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900">Portfolio</h2>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 border rounded-2xl p-4">
                       <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Total Stock Value</p>
                       <p className="text-xl font-black text-slate-900">£{inventoryTotals.totalGross.toFixed(2)}</p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                       <p className="text-[8px] font-black uppercase text-emerald-600 mb-1">Potential Earnings</p>
                       <p className="text-xl font-black text-emerald-700">£{inventoryTotals.totalNet.toFixed(2)}</p>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="space-y-3">
                       <Input placeholder="Card Name..." value={newInventoryName} onChange={(e) => setNewInventoryName(e.target.value)} className="h-11 rounded-xl font-bold" />
                       <div className="grid grid-cols-2 gap-3">
                          <Input type="number" placeholder="Price £" value={newInventoryPrice} onChange={(e) => setNewInventoryPrice(e.target.value)} className="h-11 rounded-xl font-black" />
                          <Input type="number" placeholder="Qty" value={newInventoryQuantity} onChange={(e) => setNewInventoryQuantity(e.target.value)} className="h-11 rounded-xl font-black" />
                       </div>
                       <Button onClick={handleAddInventory} className="w-full h-11 rounded-xl bg-slate-900 font-black uppercase text-[10px]">Add to List</Button>
                    </div>
                    <Separator />
                    <ScrollArea className="h-[180px]">
                       <div className="space-y-2">
                          {inventory.map((item) => {
                            return (
                              <div key={item.id} className="p-3 rounded-xl bg-slate-50 border group flex justify-between items-center transition-all hover:bg-slate-100">
                                <div className="flex flex-col">
                                   <span className="font-bold text-[10px] uppercase truncate max-w-[150px]">{item.name}</span>
                                   <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">QTY: {item.quantity || 1} &bull; £{item.price.toFixed(2)} EA</span>
                                </div>
                                <div className="flex items-center gap-2">
                                   <span className="font-black text-slate-900 text-xs">£{(item.price * (item.quantity || 1)).toFixed(2)}</span>
                                   <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-destructive" onClick={() => deleteInventoryItem(item.id!)}><Trash2 className="w-3.5 h-3.5" /></Button>
                                </div>
                              </div>
                            );
                          })}
                          {inventory.length === 0 && <p className="text-center text-[10px] italic text-slate-300 py-8">No preloaded items</p>}
                       </div>
                    </ScrollArea>
                 </div>
               </Card>

               <Card className="bg-primary rounded-[3rem] p-10 border-none shadow-sm relative overflow-hidden group lg:col-span-1">
                  <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-white/10 blur-[150px] rounded-full group-hover:scale-110 transition-transform duration-1000" />
                  <div className="relative z-10 flex flex-col h-full space-y-6">
                    <div className="flex items-center gap-4 text-white">
                       <div className="p-3 bg-white/10 rounded-2xl"><Search className="w-6 h-6" /></div>
                       <h2 className="text-xl font-black uppercase tracking-tighter">Wanted Items</h2>
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="space-y-3">
                        {wantedStock.map((wanted) => (
                          <div key={wanted.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
                            <p className="text-white font-black uppercase text-xs">{wanted.cardName}</p>
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Sourcing for Client</span>
                              <Badge className="bg-white/10 text-[8px] font-black text-white/60">ACTIVE</Badge>
                            </div>
                          </div>
                        ))}
                        {wantedStock.length === 0 && (
                          <div className="h-48 flex flex-col items-center justify-center text-center space-y-4">
                            <Rocket className="w-8 h-8 text-white/20 animate-pulse" />
                            <p className="text-white/40 font-black uppercase text-[10px]">No active requests</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
               </Card>
            </div>
          )}

          {authenticatedSellerId && (
            <Card className="shadow-sm border-none rounded-3xl bg-white overflow-hidden">
               <CardHeader className="p-8 border-b bg-slate-50/20">
                 <div className="flex justify-between items-center">
                   <div>
                     <CardTitle className="text-sm font-black uppercase text-slate-900">
                       {isSelectedDateFriday ? "Friday Settlement Run Itemization" : "Daily Transaction Itemization"}
                     </CardTitle>
                     <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                       {isSelectedDateFriday ? "Displaying all sales maturing on this payout date" : "Displaying sales logged on this specific day"}
                     </p>
                   </div>
                   <div className="text-[10px] font-bold text-slate-400 uppercase">
                     {selectedDate ? format(parseISO(selectedDate), "EEEE, do MMMM yyyy") : 'No Date Selected'}
                   </div>
                 </div>
               </CardHeader>
               <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="pl-8 h-12 uppercase text-[10px] font-black">Item</TableHead>
                        <TableHead className="h-12 uppercase text-[10px] font-black text-center">Qty</TableHead>
                        <TableHead className="h-12 uppercase text-[10px] font-black">Gross</TableHead>
                        <TableHead className="h-12 uppercase text-[10px] font-black">Net</TableHead>
                        <TableHead className="text-right pr-8 h-12 uppercase text-[10px] font-black">Running</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                       {sellerDailySalesAggregated.map((sale) => (
                         <TableRow key={sale.id} className="h-16 hover:bg-slate-50/30">
                           <TableCell className="pl-8 font-bold uppercase text-xs text-slate-900">
                             {sale.cardName}
                             {isSelectedDateFriday && <p className="text-[8px] text-slate-400 mt-0.5">Logged: {sale.saleDate}</p>}
                           </TableCell>
                           <TableCell className="text-center font-black text-slate-400 text-[10px]">
                             {sale.quantity || 1}
                           </TableCell>
                           <TableCell className="font-bold text-slate-900">£{sale.price.toFixed(2)}</TableCell>
                           <TableCell className="font-black text-slate-900">£{(sale.price - (sale.commission || 0)).toFixed(2)}</TableCell>
                           <TableCell className="text-right pr-8 font-black text-primary">£{((sale as any).runningTotal || 0).toFixed(2)}</TableCell>
                         </TableRow>
                       ))}
                       {sellerDailySalesAggregated.length === 0 && (
                         <TableRow>
                           <TableCell colSpan={5} className="h-48 text-center text-slate-300 italic">
                             {isSelectedDateFriday ? "No settlements due for this Friday run." : "No sales logged for this date."}
                           </TableCell>
                         </TableRow>
                       )}
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

      <Dialog open={isWantedStockDialogOpen} onOpenChange={setIsWantedStockDialogOpen}>
        <DialogContent className="rounded-[2.5rem] p-10 border-none shadow-2xl">
          <DialogHeader className="items-center text-center space-y-4">
            <div className="bg-primary/10 text-primary p-5 rounded-3xl"><Plus className="w-10 h-10" /></div>
            <DialogTitle className="text-3xl font-black uppercase tracking-tighter">Create Wanted Notice</DialogTitle>
            <p className="text-slate-500 font-bold text-sm">Post a request for <span className="text-primary">"{stockSearchQuery}"</span> to all sellers.</p>
          </DialogHeader>
          <div className="py-8 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400">Customer Name</label>
              <Input placeholder="e.g., Gary Oak" className="h-14 bg-slate-50 border-none rounded-2xl px-6 font-bold" value={wantedStockCustomer} onChange={(e) => setWantedStockCustomer(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400">Contact Number (Hidden from Sellers)</label>
              <Input placeholder="e.g., 07123 456789" className="h-14 bg-slate-50 border-none rounded-2xl px-6 font-black" value={wantedStockContact} onChange={(e) => setWantedStockContact(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="flex-col gap-3">
            <Button onClick={handleCreateWantedStock} className="w-full h-14 rounded-2xl font-black uppercase text-xs bg-primary hover:bg-primary/90">Publish Request</Button>
            <Button variant="ghost" onClick={() => setIsWantedStockDialogOpen(false)} className="w-full h-12 rounded-2xl font-black uppercase text-[10px] text-slate-400">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
