"use client";

import { useState, useEffect, useCallback } from "react";

export type Sale = {
  card: string;
  price: number;
};

export type SalesData = {
  [date: string]: {
    [seller: string]: Sale[];
  };
};

const DEFAULT_SELLERS = ["Kerion", "Connor S", "Connor W", "Nick", "Roy", "Mitch", "NC"];

export function useSales() {
  const [sellers, setSellers] = useState<string[]>([]);
  const [sales, setSales] = useState<SalesData>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const storedSellers = localStorage.getItem("nc_sellers");
    const storedSales = localStorage.getItem("nc_sales");

    if (storedSellers) {
      try {
        setSellers(JSON.parse(storedSellers));
      } catch (e) {
        setSellers(DEFAULT_SELLERS);
      }
    } else {
      setSellers(DEFAULT_SELLERS);
    }

    if (storedSales) {
      try {
        setSales(JSON.parse(storedSales));
      } catch (e) {
        setSales({});
      }
    }
    
    setIsLoaded(true);
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("nc_sellers", JSON.stringify(sellers));
    }
  }, [sellers, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("nc_sales", JSON.stringify(sales));
    }
  }, [sales, isLoaded]);

  const addSeller = useCallback((name: string) => {
    if (!name) return;
    setSellers((prev) => {
      if (prev.includes(name)) return prev;
      return [...prev, name];
    });
  }, []);

  const removeSeller = useCallback((name: string) => {
    setSellers((prev) => prev.filter((s) => s !== name));
  }, []);

  const addSale = useCallback((date: string, seller: string, card: string, price: number) => {
    setSales((prev) => {
      const currentDay = prev[date] || {};
      const currentSellerSales = currentDay[seller] || [];
      
      return {
        ...prev,
        [date]: {
          ...currentDay,
          [seller]: [...currentSellerSales, { card, price }]
        }
      };
    });
  }, []);

  const updateSale = useCallback((date: string, seller: string, index: number, updatedSale: Sale) => {
    setSales((prev) => {
      const currentDay = prev[date];
      if (!currentDay) return prev;
      
      const currentSellerSales = currentDay[seller];
      if (!currentSellerSales) return prev;

      const newSellerSales = [...currentSellerSales];
      newSellerSales[index] = updatedSale;

      return {
        ...prev,
        [date]: {
          ...currentDay,
          [seller]: newSellerSales
        }
      };
    });
  }, []);

  const deleteSale = useCallback((date: string, seller: string, index: number) => {
    setSales((prev) => {
      const currentDay = prev[date];
      if (!currentDay) return prev;
      
      const currentSellerSales = currentDay[seller];
      if (!currentSellerSales) return prev;

      return {
        ...prev,
        [date]: {
          ...currentDay,
          [seller]: currentSellerSales.filter((_, i) => i !== index)
        }
      };
    });
  }, []);

  return {
    sellers,
    sales,
    isLoaded,
    addSeller,
    removeSeller,
    addSale,
    updateSale,
    deleteSale,
  };
}
