"use client";

import React, { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { 
  Plus, 
  Search, 
  Download, 
  Trash2, 
  BrainCircuit, 
  Calendar as CalendarIcon,
  Pencil,
  Check,
  X,
  History,
  Coins,
  Loader2
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useSales, Sale } from "@/hooks/use-sales";
import { generateDailySalesSummary } from "@/ai/flows/generate-daily-sales-summary";
import { useAuth, useUser, initiateAnonymousSignIn } from "@/firebase";

export default function Dashboard() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const { sellers, sales, isLoaded, addSeller, removeSeller, addSale, deleteSale, updateSale } = useSales();
  
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [searchQuery, setSearchQuery] = useState("");
  const [newSellerName, setNewSellerName] = useState("");
  const [activeTab, setActiveTab] = useState("");
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // New sale form state
  const [newSaleCard, setNewSaleCard] = useState("");
  const [newSalePrice, setNewSalePrice] = useState("");

  // Editing state
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [editCard, setEditCard] = useState("");
  const [editPrice, setEditPrice] = useState("");

  // Handle Authentication
  useEffect(() => {
    if (!isUserLoading && !user && auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  useEffect(() => {
    if (sellers.length > 0 && !activeTab) {
      setActiveTab(sellers[0]);
    }
  }, [sellers, activeTab]);

  const dailySalesData = useMemo(() => sales[selectedDate] || {}, [sales, selectedDate]);

  // Daily Stats
  const dailyStats = useMemo(() => {
    let totalSales = 0;
    let totalCards = 0;
    let maxSellerTotal = 0;
    let topSellerName = "-";

    sellers.forEach((seller) => {
      const sellerSales = dailySalesData[seller] || [];
      const sellerTotal = sellerSales.reduce((acc, s) => acc + s.price, 0);
      
      totalSales += sellerTotal;
      totalCards += sellerSales.length;

      if (sellerTotal > maxSellerTotal) {
        maxSellerTotal = sellerTotal;
        topSellerName = seller;
      }
    });

    return { totalSales, totalCards, topSellerName };
  }, [sellers, dailySalesData]);

  // All-Time Stats
  const allTimeStats = useMemo(() => {
    let totalSales = 0;
    let totalCards = 0;
    const sellerTotals: Record<string, number> = {};

    Object.values(sales).forEach((daySales) => {
      Object.entries(daySales).forEach(([seller, sellerSales]) => {
        const dayTotal = sellerSales.reduce((acc, s) => acc + s.price, 0);
        totalSales += dayTotal;
        totalCards += sellerSales.length;
        sellerTotals[seller] = (sellerTotals[seller] || 0) + dayTotal;
      });
    });

    let topSeller = "-";
    let maxTotal = 0;
    Object.entries(sellerTotals).forEach(([seller, total]) => {
      if (total > maxTotal) {
        maxTotal = total;
        topSeller = seller;
      }
    });

    return { totalSales, totalCards, topSeller };
  }, [sales]);

  const recentActivity = useMemo(() => {
    const all: { date: string; seller: string; card: string; price: number }[] = [];
    Object.entries(sales).forEach(([date, daySales]) => {
      Object.entries(daySales).forEach(([seller, sellerSales]) => {
        sellerSales.forEach((sale) => {
          all.push({ date, seller, card: sale.cardName, price: sale.price });
        });
      });
    });
    return all.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  }, [sales]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const results: { date: string; seller: string; card: string; price: number }[] = [];
    
    Object.entries(sales).forEach(([date, daySales]) => {
      Object.entries(daySales).forEach(([seller, sellerSales]) => {
        sellerSales.forEach((sale) => {
          if (sale.cardName.toLowerCase().includes(searchQuery.toLowerCase())) {
            results.push({ date, seller, card: sale.cardName, price: sale.price });
          }
        });
      });
    });
    
    return results;
  }, [sales, searchQuery]);

  const handleExportCSV = () => {
    const rows = [["Date", "Seller", "Card", "Price"]];
    Object.entries(sales).forEach(([date, daySales]) => {
      Object.entries(daySales).forEach(([seller, sellerSales]) => {
        sellerSales.forEach((sale) => {
          rows.push([date, seller, sale.cardName, sale.price.toString()]);
        });
      });
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `newtons_collectables_full_vault.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateAiSummary = async () => {
    setIsAiLoading(true);
    try {
      const input = {
        date: selectedDate,
        dailySales: Object.fromEntries(
          Object.entries(dailySalesData).map(([seller, sales]) => [
            seller,
            sales.map(s => ({ card: s.cardName, price: s.price }))
          ])
        ),
      };
      const result = await generateDailySalesSummary(input);
      setAiSummary(result.summary);
    } catch (error) {
      console.error("AI Error:", error);
    } finally {
      setIsAiLoading(false);
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

  const handleUpdateSale = (saleId: string) => {
    const priceNum = parseFloat(editPrice);
    if (editCard.trim() && !isNaN(priceNum)) {
      updateSale(saleId, { cardName: editCard.trim(), price: priceNum });
      cancelEditing();
    }
  };

  const handleAddSale = (seller: string) => {
    const priceNum = parseFloat(newSalePrice);
    if (newSaleCard.trim() && !isNaN(priceNum)) {
      addSale(selectedDate, seller, newSaleCard.trim(), priceNum);
      setNewSaleCard("");
      setNewSalePrice("");
    }
  };

  if (!isLoaded || isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Syncing with Newt Vault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">NewtCollect Analytics</h1>
          <p className="text-muted-foreground">Professional Vault & Sales Management (Synced)</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-2 shadow-sm">
            <CalendarIcon className="w-4 h-4 text-primary" />
            <input 
              type="date" 
              className="bg-transparent outline-none text-sm" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <Button onClick={handleExportCSV} variant="outline" className="gap-2 shadow-sm">
            <Download className="w-4 h-4" /> Export All Data
          </Button>
        </div>
      </header>

      {/* Seller Logs - Main Entry Point */}
      <Card className="shadow-lg border-none overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <CardHeader className="pb-0 border-b bg-muted/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">Daily Sales Logs</CardTitle>
                <Badge variant="outline" className="bg-white/50">{selectedDate}</Badge>
              </div>
              <ScrollArea className="max-w-full">
                <TabsList className="bg-muted/50 p-1 mb-2">
                  {sellers.map((s) => (
                    <TabsTrigger key={s} value={s} className="px-6 data-[state=active]:bg-card">
                      {s}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </ScrollArea>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {sellers.map((s) => (
              <TabsContent key={s} value={s} className="space-y-6 mt-0 focus-visible:outline-none">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-muted/30 p-4 rounded-lg items-end">
                  <div className="md:col-span-6 space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Card Name</label>
                    <Input 
                      placeholder="Enter card name..." 
                      value={newSaleCard}
                      onChange={(e) => setNewSaleCard(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSale(s)}
                    />
                  </div>
                  <div className="md:col-span-4 space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sale Price (£)</label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00" 
                      value={newSalePrice}
                      onChange={(e) => setNewSalePrice(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSale(s)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button 
                      className="w-full" 
                      onClick={() => handleAddSale(s)}
                      disabled={!newSaleCard.trim() || !newSalePrice}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Add Entry
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden bg-card">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Card Name</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailySalesData[s]?.length > 0 ? (
                        dailySalesData[s].map((sale) => {
                          const isEditing = editingSaleId === sale.id;
                          return (
                            <TableRow key={sale.id}>
                              <TableCell className="text-xs text-muted-foreground">{selectedDate}</TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input 
                                    className="h-8 py-0" 
                                    value={editCard} 
                                    onChange={(e) => setEditCard(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateSale(sale.id!)}
                                    autoFocus
                                  />
                                ) : (
                                  <span className="font-medium">{sale.cardName}</span>
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
                                      onKeyDown={(e) => e.key === 'Enter' && handleUpdateSale(sale.id!)}
                                    />
                                  </div>
                                ) : (
                                  <span className="font-semibold">£{sale.price.toFixed(2)}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1 justify-end">
                                  {isEditing ? (
                                    <>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                                        onClick={() => handleUpdateSale(sale.id!)}
                                      >
                                        <Check className="w-4 h-4" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-muted-foreground hover:bg-muted"
                                        onClick={cancelEditing}
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-primary hover:bg-primary/10"
                                        onClick={() => startEditing(sale)}
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                        onClick={() => deleteSale(sale.id!)}
                                      >
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
                          <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                            No sales recorded for this date.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                <div className="flex justify-end pt-2">
                  <div className="bg-primary/5 px-6 py-3 rounded-lg border border-primary/10">
                    <span className="text-sm text-muted-foreground mr-4">{s} Total ({selectedDate}):</span>
                    <span className="text-xl font-bold text-primary">
                      £{(dailySalesData[s]?.reduce((acc, curr) => acc + curr.price, 0) || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </TabsContent>
            ))}
          </CardContent>
        </Tabs>
      </Card>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily Stats Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-primary" /> Daily Performance
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-none shadow-md bg-white">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Sales Total</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-xl font-bold">£{dailyStats.totalSales.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-md bg-white">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Volume</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-xl font-bold">{dailyStats.totalCards} cards</div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-md bg-white">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Top Daily</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-xl font-bold truncate">{dailyStats.topSellerName}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-lg border-none bg-gradient-to-br from-primary/5 to-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-primary" /> Market Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {aiSummary ? (
                <ScrollArea className="h-[120px] rounded-md border p-4 bg-card/50">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{aiSummary}</p>
                </ScrollArea>
              ) : (
                <div className="h-[120px] flex items-center justify-center border border-dashed rounded-md bg-white/30">
                  <p className="text-xs text-muted-foreground text-center px-8">
                    Generate AI summary for {selectedDate}
                  </p>
                </div>
              )}
              <Button 
                size="sm"
                className="w-full bg-primary hover:bg-primary/90 text-white" 
                onClick={handleGenerateAiSummary}
                disabled={isAiLoading || dailyStats.totalSales === 0}
              >
                {isAiLoading ? "Processing..." : "Generate Insights"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* All-Time Vault Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Coins className="w-4 h-4 text-emerald-600" /> Vault Lifetime Stats
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-none shadow-md bg-emerald-50/50">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Vault Value</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-xl font-bold text-emerald-700">£{allTimeStats.totalSales.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-md bg-emerald-50/50">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total Sold</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-xl font-bold text-emerald-700">{allTimeStats.totalCards}</div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-md bg-emerald-50/50">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">MVP Seller</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-xl font-bold text-emerald-700 truncate">{allTimeStats.topSeller}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-md border-none h-[220px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="w-4 h-4 text-primary" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[140px]">
                {recentActivity.length > 0 ? (
                  <div className="space-y-2">
                    {recentActivity.map((act, i) => (
                      <div key={i} className="flex justify-between items-center text-xs border-b pb-2 last:border-0 last:pb-0">
                        <div className="space-y-0.5">
                          <div className="font-semibold">{act.card}</div>
                          <div className="text-muted-foreground">{act.seller} • {act.date}</div>
                        </div>
                        <div className="font-bold text-primary">£{act.price.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-xs text-muted-foreground py-8">No records found in vault.</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Global Search */}
        <Card className="shadow-md border-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Search Vault History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Find any card from any date..." 
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {searchQuery && (
              <ScrollArea className="mt-4 h-[200px] border rounded-md">
                {searchResults.length > 0 ? (
                  <div className="p-3 space-y-3">
                    {searchResults.map((res, i) => (
                      <div key={i} className="text-xs space-y-1 border-b pb-2 last:border-0">
                        <div className="flex justify-between font-medium">
                          <span className="text-primary font-bold">{res.card}</span>
                          <span className="text-emerald-700 font-bold">£{res.price.toFixed(2)}</span>
                        </div>
                        <div className="text-muted-foreground flex justify-between">
                          <span>Sold by {res.seller}</span>
                          <span>Recorded on {res.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-sm text-muted-foreground">No matches found in history</div>
                )}
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Seller Management */}
        <Card className="shadow-md border-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Seller Roster</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="New seller name..." 
                value={newSellerName}
                onChange={(e) => setNewSellerName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSellerName) {
                    addSeller(newSellerName);
                    setNewSellerName("");
                    setActiveTab(newSellerName);
                  }
                }}
              />
              <Button 
                size="icon" 
                onClick={() => {
                  if (newSellerName) {
                    addSeller(newSellerName);
                    setNewSellerName("");
                    setActiveTab(newSellerName);
                  }
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {sellers.map((s) => (
                <Badge 
                  key={s} 
                  variant="secondary" 
                  className="pl-3 pr-1 py-1 flex items-center gap-1 group cursor-default"
                >
                  {s}
                  <button 
                    onClick={() => removeSeller(s)}
                    className="p-0.5 hover:bg-destructive hover:text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
