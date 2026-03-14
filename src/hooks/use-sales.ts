"use client";

import { useState, useEffect } from "react";

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

  useEffect(() => {
    const storedSellers = localStorage.getItem("nc_sellers");
    const storedSales = localStorage.getItem("nc_sales");

    if (storedSellers) {
      setSellers(JSON.parse(storedSellers));
    } else {
      setSellers(DEFAULT_SELLERS);
    }

    if (storedSales) {
      setSales(JSON.parse(storedSales));
    }
    
    setIsLoaded(true);
  }, []);

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

  const addSeller = (name: string) => {
    if (!name || sellers.includes(name)) return;
    setSellers([...sellers, name]);
  };

  const removeSeller = (name: string) => {
    setSellers(sellers.filter((s) => s !== name));
  };

  const addSale = (date: string, seller: string, card: string, price: number) => {
    setSales((prev) => {
      const newSales = { ...prev };
      if (!newSales[date]) newSales[date] = {};
      if (!newSales[date][seller]) newSales[date][seller] = [];
      newSales[date][seller] = [...newSales[date][seller], { card, price }];
      return newSales;
    });
  };

  const updateSale = (date: string, seller: string, index: number, updatedSale: Sale) => {
    setSales((prev) => {
      const newSales = { ...prev };
      if (newSales[date] && newSales[date][seller]) {
        const updatedSellerSales = [...newSales[date][seller]];
        updatedSellerSales[index] = updatedSale;
        newSales[date][seller] = updatedSellerSales;
      }
      return newSales;
    });
  };

  const deleteSale = (date: string, seller: string, index: number) => {
    setSales((prev) => {
      const newSales = { ...prev };
      if (newSales[date] && newSales[date][seller]) {
        const updatedSellerSales = [...newSales[date][seller]];
        updatedSellerSales.splice(index, 1);
        newSales[date][seller] = updatedSellerSales;
      }
      return newSales;
    });
  };

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
