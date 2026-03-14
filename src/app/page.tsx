"use client";

import React, { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import Image from "next/image";
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
  Cloud,
  ShieldCheck,
  UserCircle,
  Lock,
  Settings2,
  Users
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

import { useSales, Sale } from "@/hooks/use-sales";
import { 
  useAuth, 
  useUser, 
  initiateAnonymousSignIn
} from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { PlaceHolderImages } from "@/lib/placeholder-images";

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

  const logoImage = PlaceHolderImages.find(img => img.id === 'app-logo');

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
    link.setAttribute("download", `newtons_collectables_${profileId}_vault.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    }
  };

  if (!isLoaded || isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Syncing Shared Vault...</p>
        </div>
      </div>
    );
  }

  const showComm = isManagerAuthenticated;

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center">
          {logoImage && (
            <Image 
              src={logoImage.imageUrl} 
              alt={logoImage.description} 
              width={200} 
              height={60} 
              className="object-contain"
              data-ai-hint={logoImage.imageHint}
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl gap-2 shadow-sm border-primary/20 bg-card hover:bg-primary/5 transition-all">
                {profileId === 'manager' ? <ShieldCheck className="w-4 h-4 text-primary" /> : <UserCircle className="w-4 h-4 text-muted-foreground" />}
                <span className="font-bold">Profile: {profileId.charAt(0).toUpperCase() + profileId.slice(1)}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuLabel>Switch Profile</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleProfileSwitch('manager')} className="gap-2 cursor-pointer">
                <ShieldCheck className="w-4 h-4 text-primary" /> Manager Vault
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleProfileSwitch('staff')} className="gap-2 cursor-pointer">
                <UserCircle className="w-4 h-4 text-muted-foreground" /> Staff Vault
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-2 bg-card border rounded-xl px-4 py-2 shadow-sm">
            <CalendarIcon className="w-4 h-4 text-primary" />
            <input 
              type="date" 
              className="bg-transparent outline-none text-sm font-semibold" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          
          <Button onClick={handleExportCSV} variant="outline" className="rounded-xl gap-2 shadow-sm">
            <Download className="w-4 h-4" /> Export
          </Button>
        </div>
      </header>

      <Card className="shadow-2xl border-none overflow-hidden rounded-2xl ring-1 ring-black/5">
        {profileId === 'staff' ? (
          <>
            <CardHeader className="border-b bg-muted/20">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">Daily Sales Logs (Staff)</CardTitle>
                <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                  {selectedDate}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-muted/30 p-5 rounded-2xl items-end ring-1 ring-black/5 shadow-inner">
                <div className="md:col-span-3 space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Seller</label>
                  <Select value={entrySellerId} onValueChange={setEntrySellerId}>
                    <SelectTrigger className="bg-card shadow-sm border-none focus-visible:ring-primary/30">
                      <SelectValue placeholder="Select Seller" />
                    </SelectTrigger>
                    <SelectContent>
                      {sellers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-5 space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Card Name</label>
                  <Input 
                    placeholder="Enter card name..." 
                    className="bg-card shadow-sm border-none focus-visible:ring-primary/30"
                    value={newSaleCard}
                    onChange={(e) => setNewSaleCard(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Sale Price (£)</label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    className="bg-card shadow-sm border-none focus-visible:ring-primary/30"
                    value={newSalePrice}
                    onChange={(e) => setNewSalePrice(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Button 
                    className="w-full shadow-lg shadow-primary/20 h-10 rounded-xl" 
                    onClick={handleAddSale}
                    disabled={!entrySellerId || !newSaleCard.trim() || !newSalePrice}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Log
                  </Button>
                </div>
              </div>

              <div className="border rounded-2xl overflow-hidden bg-card shadow-sm ring-1 ring-black/5">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="font-bold">Seller</TableHead>
                      <TableHead className="font-bold">Card Detail</TableHead>
                      <TableHead className="text-right font-bold">Sale Amount</TableHead>
                      {isManagerAuthenticated && <TableHead className="w-[100px]"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allDailySales.length > 0 ? (
                      allDailySales.map((sale) => {
                        const seller = sellers.find(s => s.id === sale.sellerId);
                        const isEditing = editingSaleId === sale.id;
                        return (
                          <TableRow key={sale.id} className="hover:bg-muted/20 transition-colors">
                            <TableCell className="font-bold text-muted-foreground">
                              <Badge variant="secondary" className="bg-muted/50 text-foreground font-semibold">
                                {seller?.name || sale.sellerId}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Input 
                                  className="h-8 py-0" 
                                  value={editCard} 
                                  onChange={(e) => setEditCard(e.target.value)}
                                />
                              ) : (
                                <span className="font-semibold text-foreground/90">{sale.cardName}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {isEditing ? (
                                <div className="flex justify-end">
                                  <Input 
                                    className="h-8 py-0 w-24 text-right" 
                                    type="number" 
                                    step="0.01" 
                                    value={editPrice} 
                                    onChange={(e) => setEditPrice(e.target.value)} 
                                  />
                                </div>
                              ) : (
                                <span className="font-bold text-primary">£{sale.price.toFixed(2)}</span>
                              )}
                            </TableCell>
                            {isManagerAuthenticated && (
                              <TableCell>
                                <div className="flex items-center gap-1 justify-end">
                                  {isEditing ? (
                                    <>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" onClick={() => handleUpdateSale(sale.id!, sale.profileOrigin)}>
                                        <Check className="w-4 h-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted" onClick={cancelEditing}>
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={() => startEditing(sale)}>
                                        <Pencil className="w-4 h-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => deleteSale(sale.id!, sale.profileOrigin)}>
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={isManagerAuthenticated ? 4 : 3} className="h-32 text-center text-muted-foreground/60 italic">
                          No logs found for any seller on {selectedDate}.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end">
                <div className="bg-primary shadow-xl shadow-primary/20 px-8 py-4 rounded-2xl border border-white/10 text-white flex items-center justify-center">
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-bold uppercase tracking-widest opacity-80">Aggregate Daily Total</span>
                    <span className="text-2xl font-black">£{dailyStats.totalSales.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <CardHeader className="pb-0 border-b bg-muted/20">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl">Daily Sales Logs (Manager)</CardTitle>
                  <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                    {selectedDate}
                  </Badge>
                </div>
                <ScrollArea className="max-w-full">
                  <TabsList className="bg-muted/50 p-1 mb-2">
                    <TabsTrigger value="all" className="px-6 data-[state=active]:bg-card rounded-lg transition-all font-bold">
                      <Users className="w-3.5 h-3.5 mr-2" /> All Sellers
                    </TabsTrigger>
                    {sellers.map((s) => (
                      <TabsTrigger key={s.id} value={s.id} className="px-6 data-[state=active]:bg-card rounded-lg transition-all">
                        {s.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </ScrollArea>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <TabsContent value="all" className="space-y-6 mt-0 focus-visible:outline-none">
                <div className="border rounded-2xl overflow-hidden bg-card shadow-sm ring-1 ring-black/5">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="font-bold">Seller</TableHead>
                        <TableHead className="font-bold">Card Detail</TableHead>
                        <TableHead className="text-right font-bold">Sale Amount</TableHead>
                        {showComm && <TableHead className="text-right font-bold">Commission</TableHead>}
                        {isManagerAuthenticated && <TableHead className="w-[100px]"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allDailySales.length > 0 ? (
                        allDailySales.map((sale) => {
                          const seller = sellers.find(s => s.id === sale.sellerId);
                          const isEditing = editingSaleId === sale.id;
                          return (
                            <TableRow key={sale.id} className="hover:bg-muted/20 transition-colors">
                              <TableCell className="font-bold text-muted-foreground">
                                <Badge variant="secondary" className="bg-muted/50 text-foreground font-semibold">
                                  {seller?.name || sale.sellerId}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input 
                                    className="h-8 py-0" 
                                    value={editCard} 
                                    onChange={(e) => setEditCard(e.target.value)}
                                  />
                                ) : (
                                  <span className="font-semibold text-foreground/90">{sale.cardName}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {isEditing ? (
                                  <div className="flex justify-end">
                                    <Input 
                                      className="h-8 py-0 w-24 text-right" 
                                      type="number" 
                                      step="0.01" 
                                      value={editPrice} 
                                      onChange={(e) => setEditPrice(e.target.value)} 
                                    />
                                  </div>
                                ) : (
                                  <span className="font-bold text-primary">£{sale.price.toFixed(2)}</span>
                                )}
                              </TableCell>
                              {showComm && (
                                <TableCell className="text-right">
                                  <span className="font-bold text-emerald-600">£{(sale.commission || 0).toFixed(2)}</span>
                                </TableCell>
                              )}
                              {isManagerAuthenticated && (
                                <TableCell>
                                  <div className="flex items-center gap-1 justify-end">
                                    {isEditing ? (
                                      <>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" onClick={() => handleUpdateSale(sale.id!, sale.profileOrigin)}>
                                          <Check className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted" onClick={cancelEditing}>
                                          <X className="w-4 h-4" />
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={() => startEditing(sale)}>
                                          <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => deleteSale(sale.id!, sale.profileOrigin)}>
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={showComm ? 5 : 4} className="h-32 text-center text-muted-foreground/60 italic">
                            No logs found for any seller on {selectedDate}.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-col md:flex-row justify-end pt-2 gap-4">
                  {isManagerAuthenticated && (
                    <div className="flex flex-col gap-2 bg-emerald-50 border border-emerald-100 px-6 py-4 rounded-2xl">
                      <div className="flex justify-between items-center gap-8">
                        <span className="text-xs font-bold uppercase tracking-widest text-emerald-700/70">Total Shared Comm:</span>
                        <span className="text-xl font-black text-emerald-700">£{dailyStats.totalCommission.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center gap-8 border-t border-emerald-200 pt-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-emerald-700/70">Net Seller Payouts:</span>
                        <span className="text-xl font-black text-emerald-900">£{(dailyStats.totalSales - dailyStats.totalCommission).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                  <div className="bg-primary shadow-xl shadow-primary/20 px-8 py-4 rounded-2xl border border-white/10 text-white flex items-center justify-center">
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-bold uppercase tracking-widest opacity-80">Aggregate Daily Total</span>
                      <span className="text-2xl font-black">£{dailyStats.totalSales.toFixed(2)}</span>
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
                    <div className="border rounded-2xl overflow-hidden bg-card shadow-sm ring-1 ring-black/5">
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow>
                            <TableHead className="font-bold">Log Time</TableHead>
                            <TableHead className="font-bold">Card Detail</TableHead>
                            <TableHead className="text-right font-bold">Sale Amount</TableHead>
                            {showComm && <TableHead className="text-right font-bold">Commission</TableHead>}
                            {isManagerAuthenticated && <TableHead className="w-[100px]"></TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sellerDailySales.length > 0 ? (
                            sellerDailySales.map((sale) => {
                              const isEditing = editingSaleId === sale.id;
                              return (
                                <TableRow key={sale.id} className="hover:bg-muted/20 transition-colors">
                                  <TableCell className="text-xs text-muted-foreground font-mono">
                                    {selectedDate}
                                    {sale.profileOrigin === 'staff' && isManagerAuthenticated && (
                                      <Badge variant="outline" className="ml-2 text-[8px] h-4 uppercase bg-muted/50">Staff Entry</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {isEditing ? (
                                      <Input 
                                        className="h-8 py-0" 
                                        value={editCard} 
                                        onChange={(e) => setEditCard(e.target.value)}
                                      />
                                    ) : (
                                      <span className="font-semibold text-foreground/90">{sale.cardName}</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {isEditing ? (
                                      <div className="flex justify-end">
                                        <Input 
                                          className="h-8 py-0 w-24 text-right" 
                                          type="number" 
                                          step="0.01" 
                                          value={editPrice} 
                                          onChange={(e) => setEditPrice(e.target.value)} 
                                        />
                                      </div>
                                    ) : (
                                      <span className="font-bold text-primary">£{sale.price.toFixed(2)}</span>
                                    )}
                                  </TableCell>
                                  {showComm && (
                                    <TableCell className="text-right">
                                      <span className="font-bold text-emerald-600">£{(sale.commission || 0).toFixed(2)}</span>
                                    </TableCell>
                                  )}
                                  {isManagerAuthenticated && (
                                    <TableCell>
                                      <div className="flex items-center gap-1 justify-end">
                                        {isEditing ? (
                                          <>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" onClick={() => handleUpdateSale(sale.id!, sale.profileOrigin)}>
                                              <Check className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted" onClick={cancelEditing}>
                                              <X className="w-4 h-4" />
                                            </Button>
                                          </>
                                        ) : (
                                          <>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={() => startEditing(sale)}>
                                              <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => deleteSale(sale.id!, sale.profileOrigin)}>
                                              <Trash2 className="w-4 h-4" />
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    </TableCell>
                                  )}
                                </TableRow>
                              );
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={showComm ? 5 : 4} className="h-32 text-center text-muted-foreground/60 italic">
                                No logs found for this seller on {selectedDate}.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    
                    <div className="flex flex-col md:flex-row justify-end pt-2 gap-4">
                      {isManagerAuthenticated && (
                        <div className="flex flex-col gap-2 bg-emerald-50 border border-emerald-100 px-6 py-4 rounded-2xl">
                          <div className="flex justify-between items-center gap-8">
                            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700/70">Total Earned Comm:</span>
                            <span className="text-xl font-black text-emerald-700">£{sellerDailyComm.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center gap-8 border-t border-emerald-200 pt-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700/70">Seller Payout Run-down:</span>
                            <span className="text-xl font-black text-emerald-900">£{sellerPayout.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                      <div className="bg-primary shadow-xl shadow-primary/20 px-8 py-4 rounded-2xl border border-white/10 text-white flex items-center justify-center">
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-bold uppercase tracking-widest opacity-80">Daily Seller Total</span>
                          <span className="text-2xl font-black">£{sellerDailyTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                );
              })}
            </CardContent>
          </Tabs>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h3 className="text-xl font-black tracking-tight flex items-center gap-3">
            <div className="bg-primary/10 p-1.5 rounded-lg"><CalendarIcon className="w-5 h-5 text-primary" /></div>
            Daily Dashboard
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-none shadow-lg bg-card rounded-2xl">
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground/70">Sales Total</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="text-2xl font-black text-primary">£{dailyStats.totalSales.toFixed(2)}</div>
              </CardContent>
            </Card>
            {isManagerAuthenticated && (
              <Card className="border-none shadow-lg bg-emerald-50 rounded-2xl ring-1 ring-emerald-500/10">
                <CardHeader className="p-5 pb-2">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-emerald-700/70">Comm. Earned</CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <div className="text-2xl font-black text-emerald-700">£{dailyStats.totalCommission.toFixed(2)}</div>
                </CardContent>
              </Card>
            )}
            <Card className="border-none shadow-lg bg-card rounded-2xl">
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground/70">Volume</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="text-2xl font-black">{dailyStats.totalCards} cards</div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-lg bg-card rounded-2xl">
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground/70">Top Daily</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="text-2xl font-black truncate text-primary">{dailyStats.topSellerName}</div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-black tracking-tight flex items-center gap-3">
            <div className="bg-emerald-100 p-1.5 rounded-lg"><Coins className="w-5 h-5 text-emerald-600" /></div>
            The Shared Vault ({profileId})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-none shadow-lg bg-emerald-50/50 rounded-2xl ring-1 ring-emerald-500/10">
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-emerald-700/70">Vault Value</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="text-2xl font-black text-emerald-700">£{allTimeStats.totalSales.toFixed(2)}</div>
              </CardContent>
            </Card>
            {isManagerAuthenticated ? (
               <Card className="border-none shadow-lg bg-emerald-100/50 rounded-2xl ring-1 ring-emerald-500/20">
                <CardHeader className="p-5 pb-2">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-emerald-800/70">Total Comm.</CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <div className="text-2xl font-black text-emerald-800">£{allTimeStats.totalCommission.toFixed(2)}</div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-none shadow-lg bg-emerald-50/50 rounded-2xl ring-1 ring-emerald-500/10">
                <CardHeader className="p-5 pb-2">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-emerald-700/70">Total Sold</CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <div className="text-2xl font-black text-emerald-700">{allTimeStats.totalCards}</div>
                </CardContent>
              </Card>
            )}
            <Card className="border-none shadow-lg bg-emerald-50/50 rounded-2xl ring-1 ring-emerald-500/10">
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-emerald-700/70">MVP Seller</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="text-2xl font-black text-emerald-700 truncate">{allTimeStats.topSeller}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-2xl border-none h-[255px] rounded-2xl ring-1 ring-black/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <History className="w-5 h-5 text-primary" /> Live Transaction Feed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[180px]">
                {recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.map((act, i) => (
                      <div key={i} className="flex justify-between items-center text-sm bg-muted/20 p-3 rounded-xl border border-black/5 hover:bg-muted/40 transition-colors">
                        <div className="space-y-1">
                          <div className="font-bold text-foreground/90">{act.card}</div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest py-0 px-2 bg-card">
                              {act.sellerName}
                            </Badge>
                            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">{act.date}</span>
                            {act.origin === 'staff' && isManagerAuthenticated && (
                              <Badge variant="outline" className="text-[8px] text-primary/70 bg-primary/5 px-1 rounded border-primary/20">STAFF</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                           <div className="font-black text-primary">£{act.price.toFixed(2)}</div>
                           {isManagerAuthenticated && act.commission > 0 && (
                             <div className="text-[10px] font-bold text-emerald-600">+£{act.commission.toFixed(2)} comm</div>
                           )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-xs font-bold text-muted-foreground/60 py-12 uppercase tracking-widest italic">
                    The shared vault is empty.
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator className="bg-black/5 h-[1px]" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-xl border-none rounded-2xl ring-1 ring-black/5">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-black tracking-tight">Vault Search ({profileId})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <Input 
                placeholder="Find any card in vault history..." 
                className="pl-11 h-12 bg-muted/20 border-none rounded-xl focus-visible:ring-primary/30"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {searchQuery && (
              <ScrollArea className="mt-6 h-[220px] border-none bg-muted/10 rounded-2xl shadow-inner p-4">
                {searchResults.length > 0 ? (
                  <div className="space-y-3">
                    {searchResults.map((res, i) => (
                      <div key={i} className="text-sm space-y-2 bg-card p-4 rounded-xl shadow-sm border border-black/5 transition-all hover:scale-[1.01]">
                        <div className="flex justify-between items-center">
                          <span className="text-primary font-black text-base">{res.card}</span>
                          <div className="text-right">
                             <div className="text-primary font-black">£{res.price.toFixed(2)}</div>
                             {isManagerAuthenticated && res.commission > 0 && <div className="text-[10px] font-bold text-emerald-600">£{res.commission.toFixed(2)} Commission</div>}
                          </div>
                        </div>
                        <div className="text-xs font-bold text-muted-foreground flex justify-between uppercase tracking-widest">
                          <span>Sold by {res.sellerName} {res.origin === 'staff' && '(Staff)'}</span>
                          <span className="opacity-60">{res.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-xs font-bold text-muted-foreground/60 uppercase tracking-widest italic">
                    No results for "{searchQuery}"
                  </div>
                )}
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-xl border-none rounded-2xl ring-1 ring-black/5">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-black tracking-tight">Seller Roster ({profileId})</CardTitle>
              {isManagerAuthenticated ? (
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-tighter gap-1.5 border-primary/20 bg-primary/5 text-primary">
                  <Settings2 className="w-3 h-3" /> Management Mode
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-tighter gap-1.5 border-muted/20 bg-muted/5 text-muted-foreground">
                  <Lock className="w-3 h-3" /> View Only
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isManagerAuthenticated && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Input 
                    placeholder="Seller name..." 
                    className="h-12 bg-muted/20 border-none rounded-xl focus-visible:ring-primary/30"
                    value={newSellerName}
                    onChange={(e) => setNewSellerName(e.target.value)}
                  />
                  <Input 
                    type="number"
                    step="0.01"
                    placeholder="Commission (%)..." 
                    className="h-12 bg-muted/20 border-none rounded-xl focus-visible:ring-primary/30"
                    value={newSellerCommission}
                    onChange={(e) => setNewSellerCommission(e.target.value)}
                  />
                </div>
                <Button 
                  className="w-full h-12 rounded-xl shadow-lg font-bold"
                  onClick={() => {
                    if (newSellerName) {
                      addSeller(newSellerName, parseFloat(newSellerCommission) || 0);
                      setNewSellerName("");
                      setNewSellerCommission("");
                    }
                  }}
                >
                  <Plus className="w-5 h-5 mr-2" /> Add Seller with Commission
                </Button>
              </div>
            )}
            
            <div className="flex flex-wrap gap-2.5">
              {sellers.length > 0 ? (
                sellers.map((s) => (
                  <Badge 
                    key={s.id} 
                    variant="secondary" 
                    className={`pl-4 ${isManagerAuthenticated ? 'pr-2' : 'pr-4'} py-2 flex items-center gap-2 group cursor-default rounded-xl bg-card border-none shadow-sm ring-1 ring-black/5 text-sm font-bold transition-all`}
                  >
                    <div className="flex flex-col items-start gap-0.5">
                      <span>{s.name}</span>
                      {isManagerAuthenticated && (
                        <span className="text-[10px] text-emerald-600">{(s.defaultCommission || 0)}% comm</span>
                      )}
                    </div>
                    {isManagerAuthenticated && (
                      <button 
                        onClick={() => removeSeller(s.id)}
                        className="p-1 hover:bg-destructive hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </Badge>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic font-medium py-4">
                  No sellers found in this vault roster.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Manager Authentication
            </DialogTitle>
            <DialogDescription>
              Please enter the password to access the Manager Vault.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="password"
              placeholder="Enter password..."
              className="h-12 bg-muted/20 border-none rounded-xl focus-visible:ring-primary/30"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handlePasswordSubmit} className="rounded-xl shadow-lg shadow-primary/20">Access Vault</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}