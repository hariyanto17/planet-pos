"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useGetTableQuery } from "@/lib/api/tableApi";
import { useGetCategoriesQuery } from "@/lib/api/categoryApi";
import { useGetProductsQuery } from "@/lib/api/productApi";
import { useCheckoutMutation } from "@/lib/api/checkoutApi";
import { useGetAppSettingsQuery } from "@/lib/api/settingsApi";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { CartItem } from "@/lib/store/features/cart/types";
import { Ban } from "lucide-react";

import {
  addItem,
  removeItem,
  updateQuantity,
  setCustomerName,
  setValidatedTable,
  clearCart,
} from "@/lib/store/features/cart/slice";
import {
  selectCartItems,
  selectCartCustomerName,
  selectCartValidatedTable,
  selectCartSubtotal,
  selectCartTotalItems,
} from "@/lib/store/features/cart/selectors";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { OrderType, PaymentMethod } from "@shared/types";
import { useToast } from "@/components/ToastProvider";
import { 
  User, 
  ShoppingBag, 
  ArrowLeft, 
  ChevronRight, 
  Plus, 
  Minus, 
  Info, 
  CreditCard, 
  Wallet, 
  MessageSquare, 
  Search, 
  UtensilsCrossed, 
  AlertCircle, 
  Sparkles,
  MapPin,
  CheckCircle2,
  Trash2
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  categoryId: string;
  price: string;
  imageUrl: string | null;
  description?: string;
  isActive: boolean;
}

interface Category {
  id: string;
  name: string;
  isActive: boolean;
}

function SelfOrderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const toast = useToast();

  const { data: settings } = useGetAppSettingsQuery();

  const cartItems = useAppSelector(selectCartItems);
  const persistedName = useAppSelector(selectCartCustomerName);
  const validatedTable = useAppSelector(selectCartValidatedTable);
  const cartSubtotal = useAppSelector(selectCartSubtotal);
  const totalItems = useAppSelector(selectCartTotalItems);

  if (settings && settings.appType === "CASHIER_ONLY") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center px-4 animate-fade-in">
        <div className="flex flex-col items-center gap-6 max-w-sm">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full flex items-center justify-center font-bold">
            <Ban className="w-8 h-8" />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold tracking-tight text-text-primary">Self-Order Dinonaktifkan</h2>
            <p className="text-text-secondary text-sm">
              Model operasional toko saat ini diatur untuk Cashier Only. Silakan lakukan pemesanan Anda langsung di meja kasir.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const tableUuid = searchParams.get("table") || "";
  const { data: tableData, isLoading: isValidatingTable, isError: tableError } = useGetTableQuery(tableUuid, {
    skip: !tableUuid,
  });

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(false);

  const [orderType, setOrderType] = useState<OrderType>("DINE_IN");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("QRIS");
  const [cashAvailable, setCashAvailable] = useState("");
  const [notes, setNotes] = useState("");

  const [checkout, { isLoading: isSubmitting }] = useCheckoutMutation();

  const { data: categories = [], isLoading: isLoadingCategories } = useGetCategoriesQuery({ sellable: true });
  const { data: products = [], isLoading: isLoadingProducts } = useGetProductsQuery({ sellable: true });

  useEffect(() => {
    if (tableData && tableData.isActive) {
      dispatch(setValidatedTable({ id: tableData.id, name: tableData.name }));
    }
  }, [tableData, dispatch]);

  useEffect(() => {
    const activeCats = categories.filter((c: Category) => c.isActive);
    if (activeCats.length > 0 && activeCategory === null) {
      setActiveCategory(activeCats[0].id);
    }
  }, [categories, activeCategory]);

  const activeCategories = useMemo(() => categories.filter((c: Category) => c.isActive), [categories]);

  const filteredProducts = useMemo(() => {
    return products.filter((p: Product) => {
      if (!p.isActive) return false;
      const matchesCategory = !activeCategory || p.categoryId === activeCategory;
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, search]);

  if (!tableUuid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6 text-center text-zinc-100">
        <div className="max-w-md bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-5">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center text-2xl font-black shadow-inner">!</div>
          <h2 className="text-2xl font-black text-zinc-100 tracking-tight">Kode QR Diperlukan</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">Silakan pindai Kode QR fisik yang terletak di kursi bioskop atau meja konsesi Anda untuk mulai memesan.</p>
        </div>
      </div>
    );
  }

  if (isValidatingTable) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-pulse" />
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        </div>
        <span className="text-zinc-400 text-sm font-semibold tracking-wide">Memverifikasi meja lokasi Anda...</span>
      </div>
    );
  }

  if (tableError || !tableData || !tableData.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6 text-center text-zinc-100">
        <div className="max-w-md bg-zinc-900/60 backdrop-blur-md border border-rose-500/20 rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-5">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center text-2xl font-black shadow-inner">X</div>
          <h2 className="text-2xl font-black text-zinc-100 tracking-tight">Kode Lokasi Tidak Valid</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">Pilihan meja ini tidak valid atau sedang offline. Silakan minta bantuan atau pindai kode QR lagi.</p>
        </div>
      </div>
    );
  }

  if (!persistedName) {
    const handleNameSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (nameInput.trim()) {
        dispatch(setCustomerName(nameInput.trim()));
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-zinc-950 to-zinc-950 pointer-events-none" />
        <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-3xl p-8 shadow-2xl flex flex-col gap-6 relative z-10">
          <div className="flex flex-col text-center gap-2">
            <div className="mx-auto w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 mb-2">
              <Sparkles className="w-6 h-6" />
            </div>
            <span className="text-xs uppercase font-bold tracking-widest text-indigo-400">Planet Cinema</span>
            <h2 className="text-3xl font-black text-zinc-100 tracking-tight">{tableData.name}</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">Selamat datang! Silakan masukkan nama Anda untuk mulai menjelajahi katalog menu kami.</p>
          </div>
          <form onSubmit={handleNameSubmit} className="flex flex-col gap-4">
            <Input
              label="Nama Lengkap Anda"
              placeholder="Misal: John Doe"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              required
              className="py-3 px-4 bg-zinc-950 border-zinc-800 focus:border-indigo-500 rounded-xl"
            />
            <Button type="submit" className="py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/35 active:scale-[0.98] transition">
              Jelajahi Menu
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const handleCheckoutSubmit = async () => {
    if (cartItems.length === 0) return;
    try {
      const checkoutPayload = {
        customerName: persistedName,
        tableId: tableData.id,
        orderType,
        notes: notes || undefined,
        items: cartItems.map((item: CartItem) => ({
          sellableProductId: item.sellableProductId,
          quantity: item.quantity,
        })),
        paymentMethod,
        estimatedCash: (orderType === "DINE_IN" && paymentMethod === "CASH" && cashAvailable)
          ? Number(cashAvailable)
          : undefined,
      };

      const result = await checkout(checkoutPayload).unwrap();
      dispatch(clearCart());
      router.push(`/self-order/waiting?orderId=${result.orderId}`);
    } catch (err) {
      console.error("Order submission failed:", err);
      toast.error("Terjadi kesalahan saat membuat pesanan Anda. Silakan periksa pilihan atau coba lagi.");
    }
  };

  const getQuantityInCart = (productId: string) => {
    const item = cartItems.find((i: CartItem) => i.sellableProductId === productId);
    return item ? item.quantity : 0;
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col text-zinc-100 max-w-lg mx-auto border-x border-zinc-900 shadow-2xl relative pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900/60 p-4 flex items-center justify-between gap-3">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-[10px] text-indigo-400 font-extrabold tracking-wider uppercase">Self Order</span>
          </div>
          <h1 className="text-base font-black text-zinc-100 flex items-center gap-1.5 truncate">
            <span className="truncate">{tableData.name}</span>
            <span className="text-zinc-500 font-normal text-xs truncate max-w-[80px] sm:max-w-[125px]">({persistedName})</span>
          </h1>
        </div>
        <button
          onClick={() => {
            dispatch(clearCart());
          }}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80 active:scale-95 transition shrink-0"
        >
          Ganti Nama
        </button>
      </header>

      {checkoutStep ? (
        <div className="p-4 sm:p-5 flex flex-col gap-5 sm:gap-6 animate-in fade-in slide-in-from-right duration-200">
          <button
            onClick={() => setCheckoutStep(false)}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition font-bold group self-start"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            Kembali ke menu
          </button>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-100">Metode & Pilihan</h2>

          <div className="flex flex-col gap-4 sm:gap-5 bg-zinc-900/40 border border-zinc-900 rounded-2xl p-4 sm:p-5">
            <div className="flex flex-col gap-2.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" /> Metode Pemenuhan
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setOrderType("DINE_IN")}
                  className={`py-3 px-2 rounded-xl border text-xs sm:text-sm font-bold transition flex flex-col items-center justify-center gap-1 ${
                    orderType === "DINE_IN"
                      ? "border-indigo-500 bg-indigo-600/10 text-white shadow-lg shadow-indigo-600/10"
                      : "border-zinc-850 bg-zinc-950 text-zinc-400 hover:text-zinc-300 hover:border-zinc-700"
                  }`}
                >
                  <span>Diantar ke Meja</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType("TAKEAWAY")}
                  className={`py-3 px-2 rounded-xl border text-xs sm:text-sm font-bold transition flex flex-col items-center justify-center gap-1 ${
                    orderType === "TAKEAWAY"
                      ? "border-indigo-500 bg-indigo-600/10 text-white shadow-lg shadow-indigo-600/10"
                      : "border-zinc-850 bg-zinc-950 text-zinc-400 hover:text-zinc-300 hover:border-zinc-700"
                  }`}
                >
                  <span>Ambil di Konter</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-indigo-400" /> Opsi Pembayaran
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("QRIS")}
                  className={`py-3 px-2 rounded-xl border text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 ${
                    paymentMethod === "QRIS"
                      ? "border-indigo-500 bg-indigo-600/10 text-white shadow-lg shadow-indigo-600/10"
                      : "border-zinc-850 bg-zinc-950 text-zinc-400 hover:text-zinc-300 hover:border-zinc-700"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Scan QRIS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("CASH")}
                  className={`py-3 px-2 rounded-xl border text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 ${
                    paymentMethod === "CASH"
                      ? "border-indigo-500 bg-indigo-600/10 text-white shadow-lg shadow-indigo-600/10"
                      : "border-zinc-850 bg-zinc-950 text-zinc-400 hover:text-zinc-300 hover:border-zinc-700"
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Tunai di Konter</span>
                </button>
              </div>
            </div>

            {orderType === "DINE_IN" && paymentMethod === "CASH" && (
              <Input
                label="Nominal Uang Kembalian (Rp)"
                placeholder="Misal: 100000"
                type="number"
                value={cashAvailable}
                onChange={(e) => setCashAvailable(e.target.value)}
                required
                className="bg-zinc-950 border-zinc-850 py-2.5"
              />
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400" /> Catatan Pesanan (Opsional)
              </label>
              <textarea
                placeholder="Misal: Popcorn manis, kurangi es batu"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-850 focus:border-indigo-500 rounded-xl text-zinc-200 text-sm outline-none transition resize-none h-20"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Ringkasan Pesanan</h3>
            <div className="flex flex-col gap-2 bg-zinc-900/30 border border-zinc-900 rounded-2xl p-4">
              {cartItems.map((item: CartItem) => (
                <div key={item.sellableProductId} className="flex justify-between items-start gap-4 text-sm py-1 border-b border-zinc-900/50 last:border-0">
                  <span className="text-zinc-300 font-medium break-words max-w-[70%]">{item.productName} <span className="text-zinc-500 font-semibold">x{item.quantity}</span></span>
                  <span className="text-zinc-200 font-bold shrink-0">Rp {(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t border-zinc-800/80 mt-2 pt-2.5 flex justify-between items-center text-base font-black text-indigo-400">
                <span>Estimasi Subtotal</span>
                <span>Rp {cartSubtotal.toLocaleString()}</span>
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed mt-1.5 flex items-start gap-1">
                <Info className="w-3.5 h-3.5 text-zinc-650 shrink-0 mt-0.5" />
                <span>Pajak, biaya layanan, dan diskon promo yang valid akan diverifikasi dan ditambahkan saat konfirmasi tagihan final.</span>
              </p>
            </div>
          </div>

          <Button
            onClick={handleCheckoutSubmit}
            isLoading={isSubmitting}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-base font-black shadow-lg shadow-indigo-600/35 active:scale-[0.98] transition mt-2"
          >
            Buat Pesanan
          </Button>
        </div>
      ) : (
        <div className="flex flex-col">
          {/* Categories Tab Bar */}
          <div className="flex items-center gap-2 overflow-x-auto p-4 border-b border-zinc-900/60 scrollbar-none sticky top-[57px] sm:top-[69px] bg-zinc-950/90 backdrop-blur-md z-30">
            <button
              onClick={() => setActiveCategory("")}
              className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition duration-200 active:scale-95 border ${
                activeCategory === ""
                  ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/25"
                  : "bg-zinc-900 border-zinc-850/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-800"
              }`}
            >
              Semua Menu
            </button>
            {activeCategories.map((c: Category) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition duration-200 active:scale-95 border ${
                  activeCategory === c.id
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/25"
                    : "bg-zinc-900 border-zinc-850/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-800"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="px-4 py-3 border-b border-zinc-900/50 bg-zinc-950/50 relative">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari makanan, minuman, camilan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-850 focus:border-indigo-500 rounded-xl text-zinc-200 text-sm outline-none transition"
              />
            </div>
          </div>

          {/* Catalog Listing */}
          {(isLoadingCategories || isLoadingProducts) ? (
            <div className="grid grid-cols-2 gap-3 p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2 p-3 bg-zinc-900/30 border border-zinc-900 rounded-2xl animate-pulse aspect-[3/4]">
                  <div className="w-full aspect-square bg-zinc-800 rounded-xl" />
                  <div className="flex-1 flex flex-col justify-center gap-1.5 mt-1">
                    <div className="h-3.5 bg-zinc-800 rounded w-2/3" />
                    <div className="h-3 bg-zinc-800 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-12 gap-3 text-zinc-500">
              <div className="w-14 h-14 rounded-full bg-zinc-900/60 flex items-center justify-center text-zinc-650 border border-zinc-850">
                <UtensilsCrossed className="w-6 h-6 opacity-40" />
              </div>
              <span className="text-sm font-bold text-zinc-400">Produk tidak tersedia</span>
              <span className="text-xs text-zinc-500 max-w-xs leading-relaxed">Silakan pilih filter kategori lain atau masukkan kata kunci pencarian baru.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-3">
              {filteredProducts.map((p: Product) => {
                const qty = getQuantityInCart(p.id);
                return (
                  <div key={p.id} className="flex flex-col bg-zinc-900/50 border border-zinc-850/80 rounded-2xl hover:border-zinc-700 transition relative overflow-hidden group">
                    <div className="relative w-full aspect-[4/3] bg-zinc-950 border-b border-zinc-850/50 overflow-hidden shrink-0">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover bg-zinc-850 group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-zinc-500">
                          Planet POS
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 flex flex-col p-3 min-w-0 justify-between">
                      <div className="flex flex-col mb-2.5">
                        <span className="text-xs sm:text-sm font-black text-zinc-150 line-clamp-2 leading-tight group-hover:text-white transition-colors" title={p.name}>{p.name}</span>
                        {p.sku ? <span className="text-[9px] font-mono text-zinc-500 tracking-wider mt-0.5 truncate">{p.sku}</span> : null}
                      </div>
                      
                      <div className="flex flex-col gap-2 mt-auto">
                        <span className="text-xs sm:text-sm font-extrabold text-indigo-400">Rp {Number(p.price).toLocaleString()}</span>

                        {qty > 0 ? (
                          <div className="flex items-center justify-between bg-zinc-950 border border-zinc-850 rounded-xl p-0.5 shadow-inner w-full">
                            <button
                              onClick={() => {
                                if (qty === 1) {
                                  dispatch(removeItem(p.id));
                                } else {
                                  dispatch(updateQuantity({ sellableProductId: p.id, quantity: qty - 1 }));
                                }
                              }}
                              className="w-7 h-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center transition active:scale-90 font-bold shrink-0"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-black text-center text-zinc-100 flex-1 min-w-[18px]">{qty}</span>
                            <button
                              onClick={() => {
                                dispatch(updateQuantity({ sellableProductId: p.id, quantity: qty + 1 }));
                              }}
                              className="w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition active:scale-90 font-bold shrink-0 shadow-md shadow-indigo-600/10"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              dispatch(
                                addItem({
                                  sellableProductId: p.id,
                                  productName: p.name,
                                  price: Number(p.price),
                                  quantity: 1,
                                  imageUrl: p.imageUrl,
                                })
                              );
                            }}
                            className="w-full py-1.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 rounded-xl transition duration-205 shadow-md shadow-indigo-600/20 text-center"
                          >
                            Tambah
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Floating Bottom Bar (Sticky footer trigger) */}
      {totalItems > 0 && !checkoutStep && (
        <div className="fixed bottom-0 inset-x-0 bg-zinc-950/80 backdrop-blur-lg border-t border-zinc-900 max-w-lg mx-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] flex items-center justify-between z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] gap-4">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] sm:text-xs text-zinc-400 font-bold truncate">{totalItems} item di keranjang</span>
            <span className="text-base sm:text-lg font-black text-indigo-400 truncate">Rp {cartSubtotal.toLocaleString()}</span>
          </div>
          <button
            onClick={() => setIsCartOpen(true)}
            className="px-4 sm:px-6 py-2.5 sm:py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 rounded-xl text-xs sm:text-sm font-black text-white shadow-lg shadow-indigo-600/35 transition shrink-0"
          >
            Lihat Keranjang
          </button>
        </div>
      )}

      {/* Shopping Cart Bottom Sheet */}
      {isCartOpen && !checkoutStep && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center p-0 transition-opacity">
          <div className="absolute inset-0" onClick={() => setIsCartOpen(false)} />
          <div className="bg-zinc-900 border-t border-zinc-800 rounded-t-[2rem] w-full max-w-md p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] flex flex-col gap-4.5 shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-250 max-h-[80vh] sm:max-h-[85vh]">
            <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-1 shrink-0" />
            
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-black text-zinc-100 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-indigo-400" /> Keranjang Belanja
              </h3>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-[11px] font-bold text-zinc-400 hover:text-zinc-200 px-2.5 py-1.5 bg-zinc-950 border border-zinc-850 rounded-lg active:scale-95 transition"
              >
                Tutup
              </button>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto pr-1 py-1 flex-1 min-h-0">
              {cartItems.map((item: CartItem) => (
                <div key={item.sellableProductId} className="flex flex-col gap-2 py-2.5 border-b border-zinc-850/50 last:border-0">
                  <span className="text-xs sm:text-sm font-black text-zinc-200 break-words leading-tight">{item.productName}</span>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-extrabold text-indigo-400">Rp {item.price.toLocaleString()}</span>
                    
                    <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-850 rounded-xl p-1">
                      <button
                        onClick={() => {
                          if (item.quantity === 1) {
                            dispatch(removeItem(item.sellableProductId));
                          } else {
                            dispatch(updateQuantity({ sellableProductId: item.sellableProductId, quantity: item.quantity - 1 }));
                          }
                        }}
                        className="w-7 h-7 bg-zinc-900 rounded-lg flex items-center justify-center text-xs font-bold text-zinc-300 hover:bg-zinc-800 transition"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-black w-5 text-center text-zinc-200">{item.quantity}</span>
                      <button
                        onClick={() => {
                          dispatch(updateQuantity({ sellableProductId: item.sellableProductId, quantity: item.quantity + 1 }));
                        }}
                        className="w-7 h-7 bg-zinc-900 rounded-lg flex items-center justify-center text-xs font-bold text-zinc-300 hover:bg-zinc-800 transition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center border-t border-zinc-850 pt-3.5 mt-1">
              <span className="text-xs sm:text-sm font-bold text-zinc-400">Total Harga</span>
              <span className="text-lg sm:text-xl font-black text-indigo-400">Rp {cartSubtotal.toLocaleString()}</span>
            </div>

            <Button
              onClick={() => {
                setIsCartOpen(false);
                setCheckoutStep(true);
              }}
              className="w-full py-3.5 text-sm sm:text-base font-black bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/35 active:scale-[0.98] transition shrink-0"
            >
              Lanjutkan ke Checkout
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SelfOrderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950">
        <div className="animate-spin h-8 w-8 text-indigo-500 border-2 border-indigo-500/20 border-t-transparent rounded-full mb-3" />
        <span className="text-zinc-400 text-sm font-semibold">Memuat konsol checkout...</span>
      </div>
    }>
      <SelfOrderContent />
    </Suspense>
  );
}
