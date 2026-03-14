"use client";

import React, { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { 
  Plus, 
  Search, 
  Download, 
  TrendingUp, 
  Users, 
  CreditCard, 
  PieChart, 
  Trash2, 
  BrainCircuit, 
  Calendar as CalendarIcon,
  Percent
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent, 
  ChartLegend, 
  ChartLegendContent 
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useSales } from "@/hooks/use-sales";
import { generateDailySalesSummary } from "@/ai/flows/generate-daily-sales-summary";

export default function Dashboard() {
  const { sellers, sales, isLoaded, addSeller, removeSeller, addSale, deleteSale } = useSales();
  
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [commission, setCommission] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [newSellerName, setNewSellerName] = useState("");
  const [activeTab, setActiveTab] = useState("");
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // New sale form state
  const [newSaleCard, setNewSaleCard] = useState("");
  const [newSalePrice, setNewSalePrice] = useState("");

  useEffect(() => {
    if (sellers.length > 0 && !activeTab) {
      setActiveTab(sellers[0]);
    }
  }, [sellers, activeTab]);

  const dailySalesData = useMemo(() => sales[selectedDate] || {}, [sales, selectedDate]);

  const stats = useMemo(() => {
    let totalSales = 0;
    let totalCards = 0;
    let maxSellerTotal = 0;
    let topSellerName = "-";

    const chartData: { name: string; total: number }[] = [];

    sellers.forEach((seller) => {
      const sellerSales = dailySalesData[seller] || [];
      const sellerTotal = sellerSales.reduce((acc, s) => acc + s.price, 0);
      
      totalSales += sellerTotal;
      totalCards += sellerSales.length;

      if (sellerTotal > maxSellerTotal) {
        maxSellerTotal = sellerTotal;
        topSellerName = seller;
      }

      chartData.push({ name: seller, total: sellerTotal });
    });

    const netProfit = (totalSales * commission) / 100;

    return {
      totalSales,
      totalCards,
      topSellerName,
      netProfit,
      chartData,
    };
  }, [sellers, dailySalesData, commission]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const results: { date: string; seller: string; card: string; price: number }[] = [];
    
    Object.entries(sales).forEach(([date, daySales]) => {
      Object.entries(daySales).forEach(([seller, sellerSales]) => {
        sellerSales.forEach((sale) => {
          if (sale.card.toLowerCase().includes(searchQuery.toLowerCase())) {
            results.push({ date, seller, card: sale.card, price: sale.price });
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
          rows.push([date, seller, sale.card, sale.price.toString()]);
        });
      });
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `newtons_collectables_all_sales.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateAiSummary = async () => {
    setIsAiLoading(true);
    try {
      const input = {
        date: selectedDate,
        dailySales: dailySalesData,
      };
      const result = await generateDailySalesSummary(input);
      setAiSummary(result.summary);
    } catch (error) {
      console.error("AI Error:", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">NewtCollect Analytics</h1>
          <p className="text-muted-foreground">Manage your card collectables sales efficiently.</p>
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
          <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-2 shadow-sm">
            <Percent className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Comm:</span>
            <input 
              type="number" 
              className="bg-transparent outline-none text-sm w-12" 
              value={commission}
              onChange={(e) => setCommission(Number(e.target.value))}
            />
            <span className="text-sm">%</span>
          </div>
          <Button onClick={handleExportCSV} variant="outline" className="gap-2 shadow-sm">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </header>

      {/* Seller Specific Sales Entry & Tables - MOVED TO TOP */}
      <Card className="shadow-lg border-none overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <CardHeader className="pb-0 border-b bg-muted/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="text-xl">Daily Sales Logs</CardTitle>
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
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button 
                      className="w-full" 
                      onClick={() => {
                        const priceNum = parseFloat(newSalePrice);
                        if (newSaleCard && !isNaN(priceNum)) {
                          addSale(selectedDate, s, newSaleCard, priceNum);
                          setNewSaleCard("");
                          setNewSalePrice("");
                        }
                      }}
                    >
                      Add Entry
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
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailySalesData[s]?.length > 0 ? (
                        dailySalesData[s].map((sale, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs text-muted-foreground">{selectedDate}</TableCell>
                            <TableCell className="font-medium">{sale.card}</TableCell>
                            <TableCell className="text-right font-semibold">£{sale.price.toFixed(2)}</TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={() => deleteSale(selectedDate, s, i)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
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
                    <span className="text-sm text-muted-foreground mr-4">Seller Daily Total:</span>
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

      <Separator />

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Daily Sales", value: `£${stats.totalSales.toFixed(2)}`, icon: TrendingUp, color: "text-blue-600" },
          { title: "Cards Sold", value: stats.totalCards, icon: CreditCard, color: "text-teal-600" },
          { title: "Top Seller", value: stats.topSellerName, icon: Users, color: "text-indigo-600" },
          { title: "Newton's Profit", value: `£${stats.netProfit.toFixed(2)}`, icon: PieChart, color: "text-emerald-600" },
        ].map((stat, idx) => (
          <Card key={idx} className="overflow-hidden border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Chart */}
        <Card className="lg:col-span-2 shadow-lg border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Daily Performance by Seller
            </CardTitle>
            <CardDescription>Sales distribution for {format(new Date(selectedDate), "PPPP")}</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ChartContainer config={{ 
              total: { label: "Sales Total (£)", color: "hsl(var(--primary))" }
            }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar 
                    dataKey="total" 
                    fill="var(--color-total)" 
                    radius={[4, 4, 0, 0]} 
                    animationDuration={1500}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* AI Insights Tool */}
        <Card className="shadow-lg border-none bg-gradient-to-br from-primary/5 to-accent/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-primary" />
              Market Insights
            </CardTitle>
            <CardDescription>AI-generated daily analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground italic">
              Analyze today's performance trends and top-performing categories with GenAI.
            </p>
            {aiSummary ? (
              <ScrollArea className="h-[180px] rounded-md border p-4 bg-card/50">
                <p className="text-sm leading-relaxed">{aiSummary}</p>
              </ScrollArea>
            ) : (
              <div className="h-[180px] flex items-center justify-center border border-dashed rounded-md bg-white/30">
                <p className="text-xs text-muted-foreground text-center px-8">
                  Click the button below to generate a summary for {selectedDate}.
                </p>
              </div>
            )}
            <Button 
              className="w-full bg-primary hover:bg-primary/90 text-white" 
              onClick={handleGenerateAiSummary}
              disabled={isAiLoading || stats.totalSales === 0}
            >
              {isAiLoading ? "Processing Analysis..." : "Generate Insights"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Global Search */}
        <Card className="shadow-md border-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Global Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search card name across all dates..." 
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
                          <span className="text-primary">{res.card}</span>
                          <span>£{res.price.toFixed(2)}</span>
                        </div>
                        <div className="text-muted-foreground flex justify-between">
                          <span>{res.seller}</span>
                          <span>{res.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-sm text-muted-foreground">No matches found</div>
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
