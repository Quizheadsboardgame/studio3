
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
};

export type Seller = {
  id: string;
  name: string;
  defaultCommission?: number;
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

  // If manager, also listen to staff sales to "feed through"
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

  // Combine sellers if manager
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
    if (!name || !sellersRef) return;
    const sellerId = name.toLowerCase().replace(/\s+/g, '-');
    const docRef = doc(sellersRef, sellerId);
    setDocumentNonBlocking(docRef, { id: sellerId, name, defaultCommission }, { merge: true });
  }, [sellersRef]);

  const removeSeller = useCallback((sellerId: string) => {
    if (!sellerId || !sellersRef) return;
    const docRef = doc(sellersRef, sellerId);
    deleteDocumentNonBlocking(docRef);
  }, [sellersRef]);

  const addSale = useCallback((date: string, sellerId: string, cardName: string, price: number) => {
    if (!salesRef) return;
    
    // Find the seller to get their default commission percentage
    const seller = sellers.find(s => s.id === sellerId);
    const commissionPercentage = seller?.defaultCommission || 0;
    
    // Calculate commission amount
    const commissionAmount = (price * commissionPercentage) / 100;

    const docRef = doc(salesRef);
    const saleId = docRef.id;
    setDocumentNonBlocking(docRef, {
      id: saleId,
      cardName,
      price,
      commission: commissionAmount,
      saleDate: date,
      sellerId: sellerId,
    }, { merge: true });
  }, [salesRef, sellers]);

  const updateSale = useCallback((saleId: string, updatedFields: Partial<Sale>, origin?: string) => {
    const targetRef = origin === 'staff' && profileId === 'manager' && staffSalesRef 
      ? staffSalesRef 
      : salesRef;

    if (!targetRef || !saleId) return;
    const docRef = doc(targetRef, saleId);
    updateDocumentNonBlocking(docRef, updatedFields);
  }, [salesRef, staffSalesRef, profileId]);

  const deleteSale = useCallback((saleId: string, origin?: string) => {
    const targetRef = origin === 'staff' && profileId === 'manager' && staffSalesRef 
      ? staffSalesRef 
      : salesRef;

    if (!targetRef || !saleId) return;
    const docRef = doc(targetRef, saleId);
    deleteDocumentNonBlocking(docRef);
  }, [salesRef, staffSalesRef, profileId]);

  return {
    sellers,
    sales: salesByDate,
    isLoaded,
    addSeller,
    removeSeller,
    addSale,
    updateSale,
    deleteSale,
  };
}
