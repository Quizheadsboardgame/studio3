"use client";

import { useMemo, useCallback } from "react";
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { 
  useFirestore, 
  useUser, 
  useCollection, 
  useMemoFirebase,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  setDocumentNonBlocking
} from "@/firebase";

export type Sale = {
  id?: string;
  cardName: string;
  price: number;
  saleDate: string;
  sellerId: string;
};

export type Seller = {
  id: string;
  name: string;
};

export function useSales() {
  const { user } = useUser();
  const db = useFirestore();

  // Memoize collection references
  const sellersRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "users", user.uid, "sellers");
  }, [db, user]);

  const salesRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "users", user.uid, "sales");
  }, [db, user]);

  // Real-time data
  const { data: sellersData, isLoading: sellersLoading } = useCollection<Seller>(sellersRef);
  const { data: salesData, isLoading: salesLoading } = useCollection<Sale>(salesRef);

  const isLoaded = !sellersLoading && !salesLoading && !!user;

  // Transform sellers to simple string array for the UI
  const sellers = useMemo(() => {
    return sellersData?.map(s => s.name).sort() || [];
  }, [sellersData]);

  // Transform sales into the nested structure the UI expects: { [date]: { [sellerName]: Sale[] } }
  const salesByDate = useMemo(() => {
    const result: Record<string, Record<string, Sale[]>> = {};
    if (!salesData) return result;

    salesData.forEach((sale) => {
      if (!result[sale.saleDate]) result[sale.saleDate] = {};
      if (!result[sale.saleDate][sale.sellerId]) result[sale.saleDate][sale.sellerId] = [];
      result[sale.saleDate][sale.sellerId].push(sale);
    });

    return result;
  }, [salesData]);

  const addSeller = useCallback((name: string) => {
    if (!name || !sellersRef) return;
    const sellerId = name.toLowerCase().replace(/\s+/g, '-');
    const docRef = doc(sellersRef, sellerId);
    setDocumentNonBlocking(docRef, { id: sellerId, name }, { merge: true });
  }, [sellersRef]);

  const removeSeller = useCallback((name: string) => {
    if (!name || !sellersRef) return;
    const sellerId = name.toLowerCase().replace(/\s+/g, '-');
    const docRef = doc(sellersRef, sellerId);
    deleteDocumentNonBlocking(docRef);
  }, [sellersRef]);

  const addSale = useCallback((date: string, seller: string, cardName: string, price: number) => {
    if (!salesRef) return;
    const saleId = crypto.randomUUID();
    const docRef = doc(salesRef, saleId);
    setDocumentNonBlocking(docRef, {
      id: saleId,
      cardName,
      price,
      saleDate: date,
      sellerId: seller,
    }, { merge: true });
  }, [salesRef]);

  const updateSale = useCallback((saleId: string, updatedFields: Partial<Sale>) => {
    if (!salesRef || !saleId) return;
    const docRef = doc(salesRef, saleId);
    updateDocumentNonBlocking(docRef, updatedFields);
  }, [salesRef]);

  const deleteSale = useCallback((saleId: string) => {
    if (!salesRef || !saleId) return;
    const docRef = doc(salesRef, saleId);
    deleteDocumentNonBlocking(docRef);
  }, [salesRef]);

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
