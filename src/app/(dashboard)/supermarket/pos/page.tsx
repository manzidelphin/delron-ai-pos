"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { formatRWF, generateReceiptNumber } from "@/lib/utils";
import { usePOSStore } from "@/store/pos-store";
import { BarcodeScanner } from "@/components/supermarket/barcode-scanner";
import { CartItemRow } from "@/components/supermarket/cart-item";
import { PaymentModal } from "@/components/supermarket/payment-modal";
import { CreditModal } from "@/components/supermarket/credit-modal";
import { Receipt } from "@/components/supermarket/receipt";
import { GenericBarcodeModal } from "@/components/bakery/generic-barcode-modal";
import type { PaymentDetails } from "@/components/supermarket/payment-modal";
import type { CreditDetails } from "@/components/supermarket/credit-modal";
import type { PaymentMethod, CartItem } from "@/types";
import {
  Search,
  ShoppingCart,
  Tag,
  AlertCircle,
  Printer,
  RotateCcw,
  X,
  Trash2,
  Monitor,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useCustomerDisplay } from "@/hooks/use-customer-display";

interface PosItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  min_quantity: number;
  category: string | null;
  source: "supermarket" | "bakery";
  unit: string;
}

const CATEGORIES = [
  "All",
  "Bakery",
  "Beverages",
  "Snacks",
  "Dairy",
  "Bread & Bakery",
  "Household",
  "Personal Care",
  "Frozen Foods",
  "Fruits & Vegetables",
  "Meat & Fish",
  "Grains & Cereals",
  "Confectionery",
  "Other",
];

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: string; color: string }[] = [
  { key: "cash", label: "Cash", icon: "💵", color: "bg-green-600 hover:bg-green-700" },
  { key: "mtn_momo", label: "MTN MoMo", icon: "📱", color: "bg-yellow-500 hover:bg-yellow-600" },
  { key: "airtel_money", label: "Airtel", icon: "📱", color: "bg-red-600 hover:bg-red-700" },
  { key: "bank_transfer", label: "Bank", icon: "🏦", color: "bg-blue-600 hover:bg-blue-700" },
];

interface ReceiptData {
  receiptNumber: string;
  businessName: string;
  branchName: string;
  cashierName: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  amountPaid?: number;
  change?: number;
  timestamp: string;
}

export default function POSPage() {
  const { cart, addToCart, updateQuantity, removeFromCart, clearCart, subtotal, discount, total, setDiscount } = usePOSStore();
  const { business } = useAuthStore();
  const { broadcast, openDisplay } = useCustomerDisplay(business?.id);

  const [posItems, setPosItems] = useState<PosItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<PosItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [discountInput, setDiscountInput] = useState("");
  const [showDiscountInput, setShowDiscountInput] = useState(false);

  const [genericModal, setGenericModal] = useState<{ name: string; price: number; itemId: string; unit: string } | null>(null);
  const [activeModal, setActiveModal] = useState<PaymentMethod | "credit" | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  const cartItems = cart;
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Keep the customer display in sync whenever the cart or discount changes.
  useEffect(() => {
    if (!business?.id) return;
    broadcast({
      items: cartItems.map((i) => ({
        name: i.item_name,
        qty: i.quantity,
        unit_price: i.unit_price,
        total: i.total_price,
      })),
      subtotal: subtotal(),
      discount,
      total: total(),
      currency: "RWF",
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems, discount, business?.id]);

  const loadProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const [superRes, bakeryRes] = await Promise.all([
        fetch("/api/products?limit=500&stock_type=supermarket"),
        fetch("/api/bakery/finished-goods"),
      ]);
      const merged: PosItem[] = [];
      if (superRes.ok) {
        const json = await superRes.json();
        for (const p of json.products ?? []) {
          merged.push({
            id: p.id,
            name: p.name,
            price: p.price,
            quantity: p.quantity,
            min_quantity: p.min_quantity ?? 5,
            category: p.category ?? null,
            source: "supermarket",
            unit: p.unit ?? "piece",
          });
        }
      }
      if (bakeryRes.ok) {
        const json = await bakeryRes.json();
        for (const fg of json.items ?? []) {
          merged.push({
            id: fg.id,
            name: fg.name,
            price: fg.selling_price,
            quantity: fg.quantity,
            min_quantity: 0,
            category: fg.category ?? "Bakery",
            source: "bakery",
            unit: fg.unit ?? "piece",
          });
        }
      }
      setPosItems(merged);
    } catch {
      // silently fail
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    let filtered = posItems;
    if (selectedCategory === "Bakery") {
      filtered = posItems.filter((p) => p.source === "bakery");
    } else if (selectedCategory !== "All") {
      // Other category tabs are supermarket-specific
      filtered = posItems.filter((p) => p.source === "supermarket" && p.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(q));
    }
    setFilteredItems(filtered);
  }, [posItems, search, selectedCategory]);

  const handleBarcodeScan = useCallback(
    async (barcode: string) => {
      setBarcodeError(null);
      try {
        const res = await fetch(`/api/products/barcode/${encodeURIComponent(barcode)}`);
        const json = await res.json();
        if (!res.ok || !json.found) {
          setBarcodeError(`Barcode not found: ${barcode}`);
          setTimeout(() => setBarcodeError(null), 3000);
          return;
        }
        const item = json.item;

        // Handle generic bakery barcode — ask for quantity
        if (json.is_generic) {
          setGenericModal({
            name: item.name,
            price: item.selling_price ?? item.price ?? 0,
            itemId: item.id,
            unit: item.unit ?? "piece",
          });
          return;
        }

        const productType = json.type === "finished_good" ? "finished_good" : "product";
        const price = item.selling_price ?? item.price ?? item.unit_price ?? 0;
        addToCart({
          product_id: item.id,
          item_name: item.name,
          product_type: productType,
          quantity: 1,
          unit_price: price,
          total_price: price,
          unit: item.unit ?? 'piece',
        });
      } catch {
        setBarcodeError("Failed to lookup barcode");
        setTimeout(() => setBarcodeError(null), 3000);
      }
    },
    [addToCart]
  );

  const handleAddProduct = (item: PosItem) => {
    if (item.quantity <= 0) return;
    addToCart({
      product_id: item.id,
      item_name: item.name,
      product_type: item.source === "bakery" ? "finished_good" : "product",
      quantity: 1,
      unit_price: item.price,
      total_price: item.price,
      unit: item.unit,
    });
  };

  const applyDiscount = () => {
    const val = parseFloat(discountInput);
    if (!isNaN(val) && val >= 0) {
      setDiscount(Math.min(val, subtotal()));
    }
    setShowDiscountInput(false);
    setDiscountInput("");
  };

  const processOrder = async (
    paymentMethod: PaymentMethod,
    paymentDetails: PaymentDetails | null,
    creditDetails: CreditDetails | null
  ) => {
    try {
      const payload: Record<string, unknown> = {
        items: cartItems,
        payment_method: paymentMethod,
        subtotal: subtotal(),
        discount_amount: discount,
        total_amount: total(),
        ...(paymentDetails && {
          amount_paid: paymentDetails.amount_paid,
          change_given: paymentDetails.change,
          customer_phone: paymentDetails.phone,
        }),
        ...(creditDetails && {
          customer_name: creditDetails.customer_name,
          customer_phone: creditDetails.customer_phone,
          due_date: creditDetails.due_date,
          notes: creditDetails.notes,
        }),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to process order");
      }

      const json = await res.json();

      const rData: ReceiptData = {
        receiptNumber: json.receipt_number || generateReceiptNumber(),
        businessName: json.business_name || "My Business",
        branchName: json.branch_name || "Main Branch",
        cashierName: json.cashier_name || "Cashier",
        items: cartItems,
        subtotal: subtotal(),
        discount: discount,
        total: total(),
        paymentMethod: creditDetails ? "credit" : paymentMethod,
        amountPaid: paymentDetails?.amount_paid,
        change: paymentDetails?.change,
        timestamp: new Date().toISOString(),
      };

      setReceiptData(rData);
      clearCart();
      setActiveModal(null);
      setShowReceipt(true);
    } catch (err) {
      alert((err as Error).message || "Error processing order");
    } finally {
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const itemsDescription = cartItems.map((i) => `${i.quantity}x ${i.item_name}`).join(", ");

  return (
    <>
      <BarcodeScanner onScan={handleBarcodeScan} />

      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        {/* LEFT: Product Selection (60%) */}
        <div className="flex-[3] flex flex-col overflow-hidden border-r border-slate-700">
          {/* Search & Category bar */}
          <div className="p-4 space-y-3 border-b border-slate-700 bg-slate-900/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products or scan barcode..."
                className="w-full h-12 pl-10 pr-4 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 h-8 px-3 rounded-lg text-xs font-medium transition-all ${
                    selectedCategory === cat
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Barcode error */}
          {barcodeError && (
            <div className="mx-4 mt-3 flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {barcodeError}
            </div>
          )}

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoadingProducts ? (
              <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-28 bg-slate-800 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <p className="text-slate-500 text-sm">No products found</p>
                {search && (
                  <button onClick={() => setSearch("")} className="mt-2 text-blue-400 text-xs hover:underline">
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredItems.map((item) => {
                  const outOfStock = item.quantity <= 0;
                  const lowStock = !outOfStock && item.min_quantity > 0 && item.quantity <= item.min_quantity;
                  const isBakery = item.source === "bakery";
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleAddProduct(item)}
                      disabled={outOfStock}
                      className={`relative h-28 rounded-xl p-3 text-left flex flex-col justify-between transition-all border active:scale-95 ${
                        outOfStock
                          ? "bg-slate-800/30 border-slate-700/30 opacity-40 cursor-not-allowed"
                          : isBakery
                          ? "bg-slate-800 border-amber-600/30 hover:border-amber-500/60 hover:bg-slate-700"
                          : lowStock
                          ? "bg-slate-800 border-amber-500/30 hover:border-amber-400/50 hover:bg-slate-700"
                          : "bg-slate-800 border-slate-700 hover:border-blue-500/50 hover:bg-slate-700"
                      }`}
                    >
                      {isBakery && (
                        <span className="absolute top-2 left-2 text-[10px] font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">Bakery</span>
                      )}
                      {lowStock && !outOfStock && !isBakery && (
                        <span className="absolute top-2 right-2 text-[10px] font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">LOW</span>
                      )}
                      {outOfStock && (
                        <span className="absolute top-2 right-2 text-[10px] font-bold text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded">OUT</span>
                      )}
                      <div className={isBakery ? "mt-4" : ""}>
                        <p className="text-sm font-semibold text-white leading-tight line-clamp-2">{item.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{item.category}</p>
                      </div>
                      <div>
                        <p className="text-base font-black text-blue-400">{formatRWF(item.price)}</p>
                        <p className="text-[10px] text-slate-500">Stock: {item.quantity}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Cart (40%) */}
        <div className="flex-[2] flex flex-col bg-slate-900 min-w-0">
          {/* Cart header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-slate-400" />
              <span className="font-bold text-white">Current Sale</span>
              {itemCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {business?.id && (
                <button
                  onClick={() => openDisplay(business.id)}
                  title="Open Customer Display"
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-400 transition-colors"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  Display
                </button>
              )}
              {cartItems.length > 0 && (
                <button
                  onClick={clearCart}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto px-4 py-2">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center">
                  <ShoppingCart className="w-7 h-7 text-slate-600" />
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Cart is empty</p>
                  <p className="text-xs text-slate-600 mt-1">Tap a product or scan a barcode</p>
                </div>
              </div>
            ) : (
              <div>
                {cartItems.map((item) => (
                  <CartItemRow
                    key={item.product_id}
                    item={item}
                    onUpdateQty={updateQuantity}
                    onRemove={removeFromCart}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Totals + discount */}
          {cartItems.length > 0 && (
            <div className="border-t border-slate-700 p-4 space-y-3">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span>{formatRWF(subtotal())}</span>
                </div>

                {/* Discount row */}
                {discount > 0 && (
                  <div className="flex justify-between text-green-400">
                    <span>Discount</span>
                    <span>-{formatRWF(discount)}</span>
                  </div>
                )}

                {showDiscountInput ? (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") applyDiscount(); if (e.key === "Escape") setShowDiscountInput(false); }}
                      placeholder="Discount amount (RWF)"
                      autoFocus
                      className="flex-1 h-8 px-3 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button onClick={applyDiscount} className="h-8 px-3 bg-blue-600 text-white text-xs rounded-lg">OK</button>
                    <button onClick={() => setShowDiscountInput(false)} className="h-8 px-3 bg-slate-700 text-white text-xs rounded-lg">✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDiscountInput(true)}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-400 transition-colors"
                  >
                    <Tag className="w-3 h-3" />
                    {discount > 0 ? "Edit discount" : "Add discount"}
                  </button>
                )}

                <div className="flex justify-between text-lg font-black text-white pt-1 border-t border-slate-700">
                  <span>TOTAL</span>
                  <span className="text-blue-400">{formatRWF(total())}</span>
                </div>
              </div>

              {/* Payment buttons */}
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((pm) => (
                  <button
                    key={pm.key}
                    onClick={() => setActiveModal(pm.key)}
                    className={`h-14 rounded-xl font-bold text-white text-sm transition-all active:scale-95 flex flex-col items-center justify-center ${pm.color}`}
                  >
                    <span className="text-lg">{pm.icon}</span>
                    <span>{pm.label}</span>
                  </button>
                ))}
              </div>

              {/* Credit button */}
              <button
                onClick={() => setActiveModal("credit")}
                className="w-full h-12 rounded-xl border-2 border-amber-500/40 bg-amber-500/10 text-amber-400 font-bold text-sm hover:bg-amber-500/20 transition-all active:scale-[0.98]"
              >
                📋 Credit (Pay Later)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Generic Bakery Barcode Modal */}
      {genericModal && (
        <GenericBarcodeModal
          itemName={genericModal.name}
          pricePerPiece={genericModal.price}
          unit={genericModal.unit}
          onClose={() => setGenericModal(null)}
          onConfirm={(qty) => {
            addToCart({
              product_id: genericModal.itemId,
              item_name: genericModal.name,
              product_type: "finished_good",
              quantity: qty,
              unit_price: genericModal.price,
              total_price: genericModal.price * qty,
              unit: genericModal.unit,
            });
            setGenericModal(null);
          }}
        />
      )}

      {/* Payment Modal */}
      {activeModal && activeModal !== "credit" && (
        <PaymentModal
          total={total()}
          paymentMethod={activeModal as PaymentMethod}
          onClose={() => setActiveModal(null)}
          onConfirm={async (details: PaymentDetails) => {
            await processOrder(activeModal as PaymentMethod, details, null);
          }}
        />
      )}

      {/* Credit Modal */}
      {activeModal === "credit" && (
        <CreditModal
          total={total()}
          itemsDescription={itemsDescription}
          onClose={() => setActiveModal(null)}
          onConfirm={async (details: CreditDetails) => {
            await processOrder("cash", null, details);
          }}
        />
      )}

      {/* Receipt Modal */}
      {showReceipt && receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h2 className="font-bold text-white">Sale Complete!</h2>
              <button onClick={() => setShowReceipt(false)} className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 max-h-[70vh] overflow-y-auto">
              <Receipt
                receiptNumber={receiptData.receiptNumber}
                businessName={receiptData.businessName}
                branchName={receiptData.branchName}
                cashierName={receiptData.cashierName}
                items={receiptData.items}
                subtotal={receiptData.subtotal}
                discount={receiptData.discount}
                total={receiptData.total}
                paymentMethod={receiptData.paymentMethod}
                amountPaid={receiptData.amountPaid}
                change={receiptData.change}
                timestamp={receiptData.timestamp}
              />
            </div>

            <div className="p-4 border-t border-slate-700 flex gap-3">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 h-12 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                New Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body > *:not(#print-root) { display: none !important; }
          #delron-receipt { display: block !important; margin: 0 auto; }
        }
      `}</style>
    </>
  );
}
