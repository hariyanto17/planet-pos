"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useGetTableQuery } from "@/lib/api/tableApi";
import { useGetCategoriesQuery } from "@/lib/api/categoryApi";
import { useGetProductsQuery } from "@/lib/api/productApi";
import { useCheckoutMutation } from "@/lib/api/checkoutApi";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { CartItem } from "@/lib/store/features/cart/types";
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
import { TEXT } from "@/lib/i18n/id";
import { useToast } from "@/components/ToastProvider";


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

  const cartItems = useAppSelector(selectCartItems);
  const persistedName = useAppSelector(selectCartCustomerName);
  const validatedTable = useAppSelector(selectCartValidatedTable);
  const cartSubtotal = useAppSelector(selectCartSubtotal);
  const totalItems = useAppSelector(selectCartTotalItems);

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6 text-center">
        <div className="max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center text-xl font-bold">!</div>
          <h2 className="text-xl font-bold text-zinc-100">Kode QR Diperlukan</h2>
          <p className="text-zinc-400 text-sm">Silakan pindai Kode QR fisik yang terletak di kursi bioskop atau meja konsesi Anda untuk mulai memesan.</p>
        </div>
      </div>
    );
  }

  if (isValidatingTable) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950">
        <svg className="animate-spin h-10 w-10 text-indigo-500 mb-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-zinc-400 text-sm font-medium">Memverifikasi meja lokasi Anda...</span>
      </div>
    );
  }

  if (tableError || !tableData || !tableData.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6 text-center">
        <div className="max-w-md bg-zinc-900 border border-rose-500/20 rounded-2xl p-8 shadow-xl flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center text-xl font-bold">X</div>
          <h2 className="text-xl font-bold text-zinc-100">Kode Lokasi Tidak Valid</h2>
          <p className="text-zinc-400 text-sm">Pilihan meja ini tidak valid atau sedang offline. Silakan minta bantuan atau pindai kode QR lagi.</p>
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
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl flex flex-col gap-6">
          <div className="flex flex-col text-center gap-1.5">
            <span className="text-xs uppercase font-bold tracking-widest text-indigo-500">Planet Cinema Concessions</span>
            <h2 className="text-2xl font-black text-zinc-100">{tableData.name}</h2>
            <p className="text-zinc-400 text-sm">Selamat datang! Silakan masukkan nama Anda untuk mulai menjelajahi katalog.</p>
          </div>
          <form onSubmit={handleNameSubmit} className="flex flex-col gap-4">
            <Input
              label="Nama Anda"
              placeholder="Misal: John Doe"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              required
            />
            <Button type="submit" className="py-3">
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
          productId: item.productId,
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
    const item = cartItems.find((i: CartItem) => i.productId === productId);
    return item ? item.quantity : 0;
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col text-zinc-100 max-w-lg mx-auto border-x border-zinc-900 shadow-2xl relative pb-28">
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 p-4 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs text-indigo-400 font-semibold tracking-wider uppercase">Self Order</span>
          <h1 className="text-base font-bold text-zinc-200">{tableData.name} ({persistedName})</h1>
        </div>
        <button
          onClick={() => {
            dispatch(clearCart());
          }}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          Ganti Nama
        </button>
      </header>

      {checkoutStep ? (
        <div className="p-5 flex flex-col gap-6 animate-in fade-in duration-200">
          <button
            onClick={() => setCheckoutStep(false)}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Kembali ke menu
          </button>

          <h2 className="text-xl font-bold tracking-tight text-zinc-100">Pilihan Checkout</h2>

          <div className="flex flex-col gap-5 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Metode Pemenuhan</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setOrderType("DINE_IN")}
                  className={`py-3 rounded-lg border text-sm font-semibold transition ${
                    orderType === "DINE_IN"
                      ? "border-indigo-600 bg-indigo-600/10 text-white"
                      : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-300"
                  }`}
                >
                  Diantar ke Meja
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType("TAKEAWAY")}
                  className={`py-3 rounded-lg border text-sm font-semibold transition ${
                    orderType === "TAKEAWAY"
                      ? "border-indigo-600 bg-indigo-600/10 text-white"
                      : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-300"
                  }`}
                >
                  Ambil di Konter
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Opsi Pembayaran</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("QRIS")}
                  className={`py-3 rounded-lg border text-sm font-semibold transition ${
                    paymentMethod === "QRIS"
                      ? "border-indigo-600 bg-indigo-600/10 text-white"
                      : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-300"
                  }`}
                >
                  Scan QRIS
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("CASH")}
                  className={`py-3 rounded-lg border text-sm font-semibold transition ${
                    paymentMethod === "CASH"
                      ? "border-indigo-600 bg-indigo-600/10 text-white"
                      : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-300"
                  }`}
                >
                  Pembayaran Tunai
                </button>
              </div>
            </div>

            {orderType === "DINE_IN" && paymentMethod === "CASH" && (
              <Input
                label="Uang Tunai untuk Kembalian (Rp)"
                placeholder="Misal: 100000"
                type="number"
                value={cashAvailable}
                onChange={(e) => setCashAvailable(e.target.value)}
                required
              />
            )}

            <Input
              label="Catatan Pesanan (Opsional)"
              placeholder="Misal: Popcorn tanpa garam, tisu ekstra"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Ringkasan Pesanan</h3>
            <div className="flex flex-col gap-2 bg-zinc-900/50 border border-zinc-900 rounded-xl p-4">
              {cartItems.map((item: CartItem) => (
                <div key={item.productId} className="flex justify-between items-center text-sm">
                  <span className="text-zinc-300">{item.productName} <span className="text-zinc-500 font-medium">x{item.quantity}</span></span>
                  <span className="text-zinc-200">Rp {(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t border-zinc-800 mt-2 pt-2 flex justify-between items-center text-base font-bold text-zinc-100">
                <span>Estimasi Subtotal</span>
                <span>Rp {cartSubtotal.toLocaleString()}</span>
              </div>
              <p className="text-xs text-zinc-500 leading-normal mt-1">Pajak, biaya layanan, dan paket diskon yang valid akan diverifikasi dan ditambahkan secara penuh oleh sistem penagihan.</p>
            </div>
          </div>

          <Button
            onClick={handleCheckoutSubmit}
            isLoading={isSubmitting}
            className="w-full py-3.5 mt-2 text-base font-bold"
          >
            Buat Pesanan
          </Button>
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="flex items-center gap-2 overflow-x-auto p-4 border-b border-zinc-900 scrollbar-none">
            <button
              onClick={() => setActiveCategory("")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition duration-255 ${
                activeCategory === "" ? "bg-indigo-600 text-white" : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Semua Menu
            </button>
            {activeCategories.map((c: Category) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition duration-255 ${
                  activeCategory === c.id ? "bg-indigo-600 text-white" : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="p-4 border-b border-zinc-900">
            <input
              type="text"
              placeholder="Cari makanan, minuman, camilan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-lg text-zinc-200 text-sm outline-none transition"
            />
          </div>

          {(isLoadingCategories || isLoadingProducts) ? (
            <div className="flex flex-col gap-4 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-4 p-3 bg-zinc-900/50 border border-zinc-900 rounded-xl animate-pulse">
                  <div className="w-20 h-20 bg-zinc-800 rounded-lg" />
                  <div className="flex-1 flex flex-col justify-center gap-2">
                    <div className="h-4 bg-zinc-800 rounded w-2/3" />
                    <div className="h-3 bg-zinc-800 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-12 gap-2 text-zinc-500">
              <svg className="w-12 h-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-sm font-semibold">Produk tidak tersedia</span>
              <span className="text-xs">Silakan pilih filter kategori lain atau masukkan kata kunci pencarian baru.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4 p-4">
              {filteredProducts.map((p: Product) => {
                const qty = getQuantityInCart(p.id);
                return (
                  <div key={p.id} className="flex gap-4 p-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-20 h-20 rounded-lg object-cover bg-zinc-800 animate-in fade-in" />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-500">
                        N/A
                      </div>
                    )}
                    <div className="flex-1 flex flex-col min-w-0">
                      <span className="text-sm font-bold text-zinc-100 truncate">{p.name}</span>
                      {p.sku ? <span className="text-xxs font-mono text-zinc-500 tracking-wider mt-0.5">{p.sku}</span> : null}
                      {p.description ? <p className="text-xs text-zinc-400 line-clamp-2 mt-1">{p.description}</p> : null}
                      <div className="flex items-center justify-between mt-auto pt-2">
                        <span className="text-sm font-extrabold text-indigo-400">Rp {Number(p.price).toLocaleString()}</span>

                        {qty > 0 ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                if (qty === 1) {
                                  dispatch(removeItem(p.id));
                                } else {
                                  dispatch(updateQuantity({ productId: p.id, quantity: qty - 1 }));
                                }
                              }}
                              className="w-7 h-7 bg-zinc-800 hover:bg-zinc-700 active:scale-95 rounded-full flex items-center justify-center text-zinc-200 transition font-bold"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold w-4 text-center">{qty}</span>
                            <button
                              onClick={() => {
                                dispatch(updateQuantity({ productId: p.id, quantity: qty + 1 }));
                              }}
                              className="w-7 h-7 bg-indigo-600 hover:bg-indigo-500 active:scale-95 rounded-full flex items-center justify-center text-white transition font-bold"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              dispatch(
                                addItem({
                                  productId: p.id,
                                  productName: p.name,
                                  price: Number(p.price),
                                  quantity: 1,
                                  imageUrl: p.imageUrl,
                                })
                              );
                            }}
                            className="px-3.5 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 rounded-lg transition duration-200 shadow-md shadow-indigo-600/25"
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

      {totalItems > 0 && !checkoutStep && (
        <div className="fixed bottom-0 inset-x-0 bg-zinc-950 border-t border-zinc-900 max-w-lg mx-auto p-4 flex items-center justify-between z-40 shadow-xl shadow-indigo-600/10">
          <div className="flex flex-col">
            <span className="text-xs text-zinc-400 font-semibold">{totalItems} item di keranjang</span>
            <span className="text-base font-bold text-indigo-400">Rp {cartSubtotal.toLocaleString()}</span>
          </div>
          <button
            onClick={() => setIsCartOpen(true)}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-98 rounded-lg text-sm font-bold text-white shadow-lg shadow-indigo-600/35 transition"
          >
            Lihat Keranjang
          </button>
        </div>
      )}

      {isCartOpen && !checkoutStep && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 flex flex-col gap-4 shadow-2xl animate-in slide-in-from-bottom duration-255">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
              <h3 className="text-base font-bold text-zinc-100">Keranjang Belanja</h3>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-xs text-zinc-400 hover:text-zinc-200"
              >
                Tutup
              </button>
            </div>

            <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
              {cartItems.map((item: CartItem) => (
                <div key={item.productId} className="flex justify-between items-center gap-4 py-2 border-b border-zinc-850/50">
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-zinc-200 truncate">{item.productName}</span>
                    <span className="text-xs text-zinc-500">Rp {item.price.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => {
                        if (item.quantity === 1) {
                          dispatch(removeItem(item.productId));
                        } else {
                          dispatch(updateQuantity({ productId: item.productId, quantity: item.quantity - 1 }));
                        }
                      }}
                      className="w-6 h-6 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center text-xs font-bold text-zinc-200"
                    >
                      -
                    </button>
                    <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => {
                        dispatch(updateQuantity({ productId: item.productId, quantity: item.quantity + 1 }));
                      }}
                      className="w-6 h-6 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center text-xs font-bold text-zinc-200"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center border-t border-zinc-850 pt-3">
              <span className="text-sm font-semibold text-zinc-400">Total Harga</span>
              <span className="text-lg font-black text-indigo-400">Rp {cartSubtotal.toLocaleString()}</span>
            </div>

            <Button
              onClick={() => {
                setIsCartOpen(false);
                setCheckoutStep(true);
              }}
              className="w-full py-3 text-sm font-bold"
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
        <span className="text-zinc-400 text-sm font-medium">Memuat konsol checkout...</span>
      </div>
    }>
      <SelfOrderContent />
    </Suspense>
  );
}
