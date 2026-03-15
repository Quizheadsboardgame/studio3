
"use client";

import { useMemo, useCallback } from "react";
import { 
  collection, 
  doc, 
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
  profileOrigin?: string; // Track which profile the sale came from
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

export function useSales(profileId: string) {
  const { user } = useUser();
  const db = useFirestore();

  // Primary profile references
  const sellersRef = useMemoFirebase(() => {
    if (!db || !profileId || !user) return null;
    return collection(db, "profiles", profileId, "sellers");
  }, [db, profileId, user]);

  const salesRef = useMemoFirebase(() => {
    if (!db || !profileId || !user) return null;
    return collection(db, "profiles", profileId, "sales");
  }, [db, profileId, user]);

  // If manager, we also need to manage and view the staff bucket
  const staffSalesRef = useMemoFirebase(() => {
    if (!db || !user || profileId !== 'manager') return null;
    return collection(db, "profiles", "staff", "sales");
  }, [db, user, profileId]);

  const staffSellersRef = useMemoFirebase(() => {
    if (!db || !user || profileId !== 'manager') return null;
    return collection(db, "profiles", "staff", "sellers");
  }, [db, user, profileId]);

  // Real-time data for primary profile
  const { data: sellersData, isLoading: sellersLoading } = useCollection<Seller>(sellersRef);
  const { data: primarySalesData, isLoading: primarySalesLoading } = useCollection<Sale>(salesRef);
  
  // Real-time data for staff (only if manager)
  const { data: staffSalesData, isLoading: staffSalesLoading } = useCollection<Sale>(staffSalesRef);
  const { data: staffSellersData, isLoading: staffSellersLoading } = useCollection<Seller>(staffSellersRef);

  const isLoaded = !sellersLoading && !primarySalesLoading && (!staffSalesLoading || profileId !== 'manager') && !!user;

  // Combine sales if manager
  const combinedSalesData = useMemo(() => {
    const primary = (primarySalesData || []).map(s => ({ ...s, profileOrigin: profileId }));
    const staff = (staffSalesData || []).map(s => ({ ...s, profileOrigin: 'staff' }));
    return [...primary, ...staff];
  }, [primarySalesData, staffSalesData, profileId]);

  // Combined Roster: Managers manage the staff roster too
  const sellers = useMemo(() => {
    const primary = sellersData || [];
    const staff = profileId === 'manager' ? (staffSellersData || []) : [];
    
    // Deduplicate by ID
    const all = [...primary];
    staff.forEach(s => {
      if (!all.find(existing => existing.id === s.id)) {
        all.push(s);
      }
    });

    return all.sort((a, b) => a.name.localeCompare(b.name));
  }, [sellersData, staffSellersData, profileId]);

  // Transform sales into the nested structure the UI expects: { [date]: { [sellerId]: Sale[] } }
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
    const targetRef = (profileId === 'manager' && staffSellersRef) ? staffSellersRef : sellersRef;
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
  }, [sellersRef, staffSellersRef, profileId]);

  const updateSeller = useCallback((sellerId: string, updatedFields: Partial<Seller>) => {
    const targetRef = (profileId === 'manager' && staffSellersRef) ? staffSellersRef : sellersRef;
    if (!sellerId || !targetRef) return;
    
    const docRef = doc(targetRef, sellerId);
    updateDocumentNonBlocking(docRef, updatedFields);
  }, [sellersRef, staffSellersRef, profileId]);

  const addSale = useCallback((date: string, sellerId: string, cardName: string, price: number) => {
    if (!salesRef) return;
    
    const seller = sellers.find(s => s.id === sellerId);
    const commissionPercentage = seller?.defaultCommission || 0;
    
    // If price is negative (refund), commission is overridden to 0 as requested.
    const commissionAmount = price < 0 ? 0 : (price * commissionPercentage) / 100;

    const docRef = doc(salesRef);
    const saleId = docRef.id;
    setDocumentNonBlocking(docRef, {
      id: saleId,
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
        
        // Match the logic in addSale: negative price results in 0 commission.
        updatedFields.commission = updatedFields.price < 0 ? 0 : (updatedFields.price * commissionPercentage) / 100;
      }
    }

    const docRef = doc(targetRef, saleId);
    updateDocumentNonBlocking(docRef, updatedFields);
  }, [salesRef, staffSalesRef, sellers, combinedSalesData]);

  const deleteSale = useCallback((saleId: string, origin?: string) => {
    const targetRef = (origin === 'staff' && staffSalesRef) ? staffSalesRef : salesRef;
    if (!targetRef || !saleId) return;
    const docRef = doc(targetRef, saleId);
    deleteDocumentNonBlocking(docRef);
  }, [salesRef, staffSalesRef]);

  const markSalesAsPaid = useCallback((saleIds: string[], method: 'cash' | 'transfer', originMap: Record<string, string>) => {
    saleIds.forEach(id => {
      const origin = originMap[id];
      const targetRef = (origin === 'staff' && staffSalesRef) ? staffSalesRef : salesRef;
      if (!targetRef) return;
      const docRef = doc(targetRef, id);
      updateDocumentNonBlocking(docRef, {
        payoutStatus: 'paid',
        paymentMethod: method,
        paidAt: new Date().toISOString()
      });
    });
  }, [salesRef, staffSalesRef]);

  return {
    sellers,
    sales: salesByDate,
    combinedSalesData,
    isLoaded,
    addSeller,
    updateSeller,
    addSale,
    updateSale,
    deleteSale,
    markSalesAsPaid
  };
}
