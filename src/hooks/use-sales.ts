
"use client";

import { useMemo, useCallback } from "react";
import { 
  collection, 
  doc, 
  serverTimestamp 
} from "firebase/firestore";
import { 
  useFirestore, 
  useUser, 
  useCollection, 
  useMemoFirebase,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  setDocumentNonBlocking
} from "@/firebase";

export type Sale = {
  id?: string;
  cardName: string;
  price: number;
  commission: number;
  saleDate: string;
  sellerId: string;
  profileOrigin?: string;
  payoutStatus?: 'pending' | 'paid';
  paymentMethod?: 'cash' | 'transfer';
  paidAt?: string;
};

export type Seller = {
  id: string;
  name: string;
  defaultCommission?: number;
  password?: string;
  archived?: boolean;
};

export type ShopTotal = {
  date: string;
  cashIntake: number;
  cardIntake: number;
  totalIntake: number;
};

export type Expense = {
  id?: string;
  date: string;
  description: string;
  amount: number;
  category?: string;
};

export function useSales(profileId: string) {
  const { user } = useUser();
  const db = useFirestore();

  // Sellers and Sales are generally shared between staff and finance to allow tracking
  const effectiveProfile = profileId === 'seller' ? 'staff' : (profileId === 'finance' ? 'staff' : profileId);

  const sellersRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "profiles", effectiveProfile, "sellers");
  }, [db, user, effectiveProfile]);

  const salesRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "profiles", effectiveProfile, "sales");
  }, [db, user, effectiveProfile]);

  const staffSalesRef = useMemoFirebase(() => {
    if (!db || !user || effectiveProfile !== 'manager') return null;
    return collection(db, "profiles", "staff", "sales");
  }, [db, user, effectiveProfile]);

  const staffSellersRef = useMemoFirebase(() => {
    if (!db || !user || effectiveProfile !== 'manager') return null;
    return collection(db, "profiles", "staff", "sellers");
  }, [db, user, effectiveProfile]);

  const shopTotalsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "shop-finance-totals");
  }, [db, user]);

  const expensesRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "shop-finance-expenses");
  }, [db, user]);

  const { data: sellersData, isLoading: sellersLoading } = useCollection<Seller>(sellersRef);
  const { data: primarySalesData, isLoading: primarySalesLoading } = useCollection<Sale>(salesRef);
  const { data: staffSalesData, isLoading: staffSalesLoading } = useCollection<Sale>(staffSalesRef);
  const { data: staffSellersData, isLoading: staffSellersLoading } = useCollection<Seller>(staffSellersRef);
  const { data: shopTotalsData } = useCollection<ShopTotal>(shopTotalsRef);
  const { data: expensesData } = useCollection<Expense>(expensesRef);

  const isLoaded = !sellersLoading && !primarySalesLoading && (!staffSalesLoading || effectiveProfile !== 'manager') && !!user;

  const combinedSalesData = useMemo(() => {
    const normalize = (s: Sale) => ({
      ...s,
      commission: s.price < 0 ? 0 : s.commission
    });
    
    const primary = (primarySalesData || []).map(s => ({ ...normalize(s), profileOrigin: effectiveProfile }));
    const staff = (staffSalesData || []).map(s => ({ ...normalize(s), profileOrigin: 'staff' }));
    
    const all = [...primary];
    staff.forEach(s => {
      if (!all.find(existing => existing.id === s.id)) all.push(s);
    });
    return all;
  }, [primarySalesData, staffSalesData, effectiveProfile]);

  const sellers = useMemo(() => {
    const primary = sellersData || [];
    const staff = effectiveProfile === 'manager' ? (staffSellersData || []) : [];
    const all = [...primary];
    staff.forEach(s => {
      if (!all.find(existing => existing.id === s.id)) all.push(s);
    });
    return all.sort((a, b) => a.name.localeCompare(b.name));
  }, [sellersData, staffSellersData, effectiveProfile]);

  const salesByDate = useMemo(() => {
    const result: Record<string, Record<string, Sale[]>> = {};
    combinedSalesData.forEach((sale) => {
      if (!result[sale.saleDate]) result[sale.saleDate] = {};
      if (!result[sale.saleDate][sale.sellerId]) result[sale.saleDate][sale.sellerId] = [];
      result[sale.saleDate][sale.sellerId].push(sale);
    });
    return result;
  }, [combinedSalesData]);

  const addSeller = useCallback((name: string, defaultCommission: number = 0) => {
    const targetRef = (effectiveProfile === 'manager' && staffSellersRef) ? staffSellersRef : sellersRef;
    if (!name || !targetRef) return;
    const sellerId = name.toLowerCase().replace(/\s+/g, '-');
    const docRef = doc(targetRef, sellerId);
    const randomPassword = Math.random().toString(36).slice(-6).toUpperCase();
    setDocumentNonBlocking(docRef, { 
      id: sellerId, 
      name, 
      defaultCommission,
      password: randomPassword,
      archived: false
    }, { merge: true });
  }, [sellersRef, staffSellersRef, effectiveProfile]);

  const updateSeller = useCallback((sellerId: string, updatedFields: Partial<Seller>) => {
    const targetRef = (effectiveProfile === 'manager' && staffSellersRef) ? staffSellersRef : sellersRef;
    if (!sellerId || !targetRef) return;
    const docRef = doc(targetRef, sellerId);
    updateDocumentNonBlocking(docRef, updatedFields);
  }, [sellersRef, staffSellersRef, effectiveProfile]);

  const addSale = useCallback((date: string, sellerId: string, cardName: string, price: number) => {
    if (!salesRef) return;
    const seller = sellers.find(s => s.id === sellerId);
    const commissionPercentage = seller?.defaultCommission || 0;
    const commissionAmount = price < 0 ? 0 : (price * commissionPercentage) / 100;
    
    const docRef = doc(salesRef);
    setDocumentNonBlocking(docRef, {
      id: docRef.id,
      cardName,
      price,
      commission: commissionAmount,
      saleDate: date,
      sellerId: sellerId,
      payoutStatus: 'pending'
    }, { merge: true });
  }, [salesRef, sellers]);

  const updateSale = useCallback((saleId: string, updatedFields: Partial<Sale>, origin?: string) => {
    const targetRef = (origin === 'staff' && staffSalesRef) ? staffSalesRef : salesRef;
    if (!targetRef || !saleId) return;
    
    if (updatedFields.price !== undefined) {
      const existingSale = combinedSalesData.find(s => s.id === saleId);
      if (existingSale) {
        const seller = sellers.find(s => s.id === existingSale.sellerId);
        const commissionPercentage = seller?.defaultCommission || 0;
        updatedFields.commission = updatedFields.price < 0 ? 0 : (updatedFields.price * commissionPercentage) / 100;
      }
    }
    
    const docRef = doc(targetRef, saleId);
    updateDocumentNonBlocking(docRef, updatedFields);
  }, [salesRef, staffSalesRef, sellers, combinedSalesData]);

  const deleteSale = useCallback((saleId: string, origin?: string) => {
    const targetRef = (origin === 'staff' && staffSalesRef) ? staffSalesRef : salesRef;
    if (!targetRef || !saleId) return;
    deleteDocumentNonBlocking(doc(targetRef, saleId));
  }, [salesRef, staffSalesRef]);

  const markSalesAsPaid = useCallback((saleIds: string[], method: 'cash' | 'transfer', originMap: Record<string, string>) => {
    saleIds.forEach(id => {
      const origin = originMap[id];
      const targetRef = (origin === 'staff' && staffSalesRef) ? staffSalesRef : salesRef;
      if (!targetRef) return;
      updateDocumentNonBlocking(doc(targetRef, id), {
        payoutStatus: 'paid',
        paymentMethod: method,
        paidAt: new Date().toISOString()
      });
    });
  }, [salesRef, staffSalesRef]);

  const setShopTotal = useCallback((date: string, cash: number, card: number) => {
    if (!shopTotalsRef) return;
    setDocumentNonBlocking(doc(shopTotalsRef, date), {
      date,
      cashIntake: cash,
      cardIntake: card,
      totalIntake: cash + card
    }, { merge: true });
  }, [shopTotalsRef]);

  const deleteShopTotal = useCallback((date: string) => {
    if (!shopTotalsRef) return;
    deleteDocumentNonBlocking(doc(shopTotalsRef, date));
  }, [shopTotalsRef]);

  const addExpense = useCallback((date: string, description: string, amount: number) => {
    if (!expensesRef) return;
    const docRef = doc(expensesRef);
    setDocumentNonBlocking(docRef, {
      id: docRef.id,
      date,
      description,
      amount
    }, { merge: true });
  }, [expensesRef]);

  const deleteExpense = useCallback((expenseId: string) => {
    if (!expensesRef) return;
    deleteDocumentNonBlocking(doc(expensesRef, expenseId));
  }, [expensesRef]);

  return {
    sellers,
    sales: salesByDate,
    combinedSalesData,
    shopTotals: shopTotalsData || [],
    expenses: expensesData || [],
    isLoaded,
    addSeller,
    updateSeller,
    addSale,
    updateSale,
    deleteSale,
    markSalesAsPaid,
    setShopTotal,
    deleteShopTotal,
    addExpense,
    deleteExpense
  };
}
