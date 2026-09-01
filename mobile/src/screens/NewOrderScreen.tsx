import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { CartIcon, CloseIcon, SearchIcon, WarningIcon } from "../components/CustomIcons";
import { useConfirmation } from "../hooks/useConfirmation";
import { useToast } from "../hooks/useToast";
import { baseApi } from "../lib/api/baseApi";
import { useGetCategoriesQuery } from "../lib/api/categoryApi";
import { useGetProductsQuery } from "../lib/api/productApi";
import { useGetCurrentShiftQuery } from "../lib/api/shiftApi";
import { useGetTablesQuery } from "../lib/api/tableApi";
import { logout } from "../lib/store/features/auth/slice";
import { selectCartItems, selectCartSubtotal, selectCartTotalItems } from "../lib/store/features/cart/selectors";
import { addItem, clearCart, removeItem, setCustomerInfo, updateQuantity } from "../lib/store/features/cart/slice";
import { useAppDispatch, useAppSelector } from "../lib/store/hooks";
import { Theme, useTheme } from "../theme";

type Props = any;

// Centralized placeholder image
const localPlaceholder = require("../assets/placeholder.png");

// 1. Memoized Product Card Component
interface ProductCardProps {
  product: any;
  categoryName?: string;
  quantity: number;
  onAdd: (product: any) => void;
  styles: any;
}

const ProductCard: React.FC<ProductCardProps> = React.memo(({
  product,
  categoryName,
  quantity,
  onAdd,
  styles,
}) => {
  const [imageError, setImageError] = useState(false);
  const isOutOfStock = product.availableStock !== null && product.availableStock !== undefined && product.availableStock <= 0;

  console.log({ isOutOfStock })
  console.log({ trackInventory: product.trackInventory, availableStock: product.availableStock, isOutOfStock })

  return (
    <TouchableOpacity
      style={[
        styles.card,
        quantity > 0 && styles.cardSelected,
        isOutOfStock && { opacity: 0.5, backgroundColor: "#f3f4f6" }
      ]}
      onPress={() => isOutOfStock && onAdd(product)}
      accessibilityLabel={`Add ${product.name} to cart`}
      accessibilityRole="button"
      activeOpacity={isOutOfStock ? 1 : 0.8}
      disabled={isOutOfStock}
    >
      {/* Stock Badge */}
      <View style={[
        {
          position: "absolute",
          top: 8,
          right: 8,
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 12,
          zIndex: 10,
          backgroundColor: isOutOfStock ? "#ef4444" : "#10b981",
          minWidth: 50,
          alignItems: "center"
        }
      ]}>
        <Text style={{ color: "white", fontSize: 12, fontWeight: "600" }}>
          {!isOutOfStock ? "Habis" : `${product.availableStock}`}
        </Text>
      </View>

      {/* Product Image */}
      <View style={styles.imageContainer}>
        <Image
          source={
            product.imageUrl && !imageError
              ? { uri: product.imageUrl }
              : localPlaceholder
          }
          style={[styles.cardImage, isOutOfStock && { opacity: 0.7 }]}
          onError={() => setImageError(true)}
          resizeMode="cover"
        />
      </View>

      <View style={styles.cardBody}>
        {categoryName ? <Text style={styles.cardCategory}>{categoryName}</Text> : null}
        <Text style={[styles.cardTitle, isOutOfStock && { color: "#9ca3af" }]} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={[styles.cardPrice, isOutOfStock && { color: "#d1d5db" }]}>
          Rp {Number(product.price).toLocaleString()}
        </Text>

        <View style={styles.cardActions}>
          <View style={[
            styles.addBtn,
            quantity > 0 && styles.addBtnSelected,
            isOutOfStock && { backgroundColor: "#d1d5db" }
          ]}>
            <Text style={[styles.addBtnText, quantity > 0 && styles.addBtnTextSelected, isOutOfStock && { color: "#6b7280" }]}>
              {!isOutOfStock ? "Stok Habis" : quantity > 0 ? "Added" : "Add to Cart"}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// 2. Loading Skeleton Card
const ProductCardSkeleton: React.FC<{ styles: any }> = ({ styles }) => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonImage} />
    <View style={styles.cardBody}>
      <View style={[styles.skeletonLine, { width: "40%", height: 10, marginBottom: 8 }]} />
      <View style={[styles.skeletonLine, { width: "80%", height: 14, marginBottom: 8 }]} />
      <View style={[styles.skeletonLine, { width: "60%", height: 12, marginBottom: 16 }]} />
      <View style={styles.skeletonButton} />
    </View>
  </View>
);

export default function NewOrderScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const { showConfirmation } = useConfirmation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const cartItems = useAppSelector(selectCartItems);
  const totalItems = useAppSelector(selectCartTotalItems);
  const subtotal = useAppSelector(selectCartSubtotal);

  const { data: shiftData, isLoading: loadingShift } = useGetCurrentShiftQuery();
  const isShiftOpen = shiftData?.status === "OPEN";

  const handleLogout = async () => {
    const confirmed = await showConfirmation({
      title: "Keluar",
      message: "Apakah Anda yakin ingin keluar dari sesi Anda?",
      confirmText: "Keluar",
      cancelText: "Batal",
      variant: "danger",
    });

    if (confirmed) {
      dispatch(logout());
      dispatch(baseApi.util.resetApiState());
    }
  };

  const { data: products = [], isLoading: loadingProducts, refetch: refetchProducts } = useGetProductsQuery({ sellable: true });
  const { data: categories = [], isLoading: loadingCategories } = useGetCategoriesQuery({ sellable: true });
  const { data: tables = [], isLoading: loadingTables } = useGetTablesQuery();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetchProducts();
    setIsRefreshing(false);
  }, [refetchProducts]);

  const [activeCategory, setActiveCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [search, setSearch] = useState("");
  const [customerName, setCustomerName] = useState("");

  // Dimensions & Responsiveness
  const [windowWidth, setWindowWidth] = useState(Dimensions.get("window").width);

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setWindowWidth(window.width);
    });
    return () => subscription.remove();
  }, []);

  const isTablet = windowWidth >= 768;
  const numColumns = 4; // 4 rows/columns as requested

  // Search Debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const activeCategories = useMemo(() => categories.filter((c: any) => c.isActive), [categories]);
  const activeTables = useMemo(() => tables.filter((t: any) => t.isActive), [tables]);

  const filteredProducts = useMemo(() => {
    return products.filter((p: any) => {
      if (!p.isActive) return false;
      const matchesCategory = activeCategory === "" || p.categoryId === activeCategory;
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, search]);



  const getQuantityInCart = useCallback((sellableProductId: string) => {
    const item = cartItems.find((i) => i.sellableProductId === sellableProductId);
    return item ? item.quantity : 0;
  }, [cartItems]);

  const handleAdd = useCallback((p: any) => {
    // Prevent adding products with no stock
    if (p.trackInventory && (p.availableStock === null || p.availableStock === undefined || p.availableStock <= 0)) {
      showToast({
        type: "warning",
        title: "Stok Habis",
        message: `Maaf, produk ${p.name} saat ini tidak tersedia.`,
      });
      return;
    }

    const qtyInCart = getQuantityInCart(p.id);
    if (p.trackInventory && p.availableStock !== null && p.availableStock !== undefined) {
      if (qtyInCart >= p.availableStock) {
        showToast({
          type: "warning",
          title: "Stok Terbatas",
          message: `Stok tersedia hanya ${p.availableStock}.`,
        });
        return;
      }
    }
    dispatch(
      addItem({
        sellableProductId: p.id,
        productName: p.name,
        price: Number(p.price),
        quantity: 1,
        imageUrl: p.imageUrl,
      })
    );
  }, [dispatch, getQuantityInCart, showToast]);

  const handleIncrease = useCallback((sellableProductId: string, currentQty: number) => {
    dispatch(updateQuantity({ sellableProductId, quantity: currentQty + 1 }));
  }, [dispatch]);

  const handleDecrease = useCallback((sellableProductId: string, currentQty: number) => {
    if (currentQty === 1) {
      dispatch(removeItem({ sellableProductId }));
    } else {
      dispatch(updateQuantity({ sellableProductId, quantity: currentQty - 1 }));
    }
  }, [dispatch]);

  const handleNextStep = () => {
    if (cartItems.length === 0) {
      showToast({
        type: "warning",
        title: "Kesalahan Validasi",
        message: "Silakan tambahkan minimal satu produk untuk membuat pesanan.",
      });
      return;
    }

    dispatch(
      setCustomerInfo({
        customerName: customerName.trim() || "Pelanggan Langsung",
        tableId: null,
        orderType: "DINE_IN",
      })
    );

    navigation.navigate("Cart");
  };

  const isLoading = loadingProducts || loadingCategories || loadingTables;

  // Header reset action
  const handleReset = () => {
    dispatch(clearCart());
    setCustomerName("");
  };

  // Render Product Grid Card Item
  const renderProductItem = ({ item }: { item: any }) => {
    const qty = getQuantityInCart(item.id);
    const category = categories.find((c: any) => c.id === item.categoryId);
    return (
      <ProductCard
        product={item}
        categoryName={category?.name}
        quantity={qty}
        onAdd={handleAdd}
        styles={styles}
      />
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <FlatList
          data={[1, 2, 4, 5, 6, 7]}
          key={`loading-${numColumns}`}
          keyExtractor={(item) => `skel-${item}`}
          numColumns={numColumns}
          renderItem={() => <ProductCardSkeleton styles={styles} />}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.listPadding}
        />
      );
    }

    if (filteredProducts.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <SearchIcon color="#71717a" />
          </View>
          <Text style={styles.emptyTitle}>Produk tidak ditemukan</Text>
          <Text style={styles.emptySubtitle}>Cobalah sesuaikan filter atau pencarian Anda</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={filteredProducts}
        key={`grid-${numColumns}`}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        renderItem={renderProductItem}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.listPadding}
        removeClippedSubviews={true}
        initialNumToRender={12}
        maxToRenderPerBatch={16}
        windowSize={5}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
      />
    );
  };

  const renderCartItems = () => {
    if (cartItems.length === 0) {
      return (
        <View style={styles.emptyCartContainer}>
          <View style={styles.emptyCartIcon}>
            <CartIcon color="#71717a" />
          </View>
          <Text style={styles.emptyCartTitle}>Keranjang Anda kosong</Text>
          <Text style={styles.emptyCartSubtitle}>Pilih produk dari katalog untuk membayar</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.cartItemsScroll} contentContainerStyle={{ gap: 8 }}>
        {cartItems.map((item) => (
          <View key={item.sellableProductId} style={styles.cartItemRow}>
            <View style={styles.cartItemInfo}>
              <Text style={styles.cartItemName} numberOfLines={1}>
                {item.productName}
              </Text>
              <Text style={styles.cartItemPrice}>
                Rp {item.price.toLocaleString()} x {item.quantity}
              </Text>
            </View>
            <View style={styles.cartItemActions}>
              <TouchableOpacity
                style={styles.cartQtyBtn}
                onPress={() => handleDecrease(item.sellableProductId, item.quantity)}
              >
                <Text style={styles.cartQtyText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.cartQtyVal}>{item.quantity}</Text>
              <TouchableOpacity
                style={styles.cartQtyBtn}
                onPress={() => handleIncrease(item.sellableProductId, item.quantity)}
              >
                <Text style={styles.cartQtyText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  // Main UI Tree
  return (
    <SafeAreaView style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        {navigation.canGoBack() ? (
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>Batal</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}
        <Text style={styles.title}>Pesanan Pelanggan Baru</Text>
        <TouchableOpacity style={styles.clearBtn} onPress={handleReset}>
          <Text style={styles.clearText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mainLayout}>
        {/* Left Side: Product Grid, Search, and Category Filtering */}
        <View style={styles.catalogPane}>
          {/* Search bar with clear action */}
          <View style={styles.searchRow}>
            <View style={styles.searchContainer}>
              <View style={styles.searchIcon}>
                <SearchIcon color="#71717a" />
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="Cari produk dengan kata kunci..."
                placeholderTextColor="#71717a"
                value={searchQuery}
                onChangeText={setSearchQuery}
                accessibilityLabel="Search product keyword input"
              />
              {searchQuery !== "" && (
                <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearSearchBtn}>
                  <CloseIcon color="#a1a1aa" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Horizontally scrollable Category Chips */}
          <View style={styles.categoryChipsWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChipsScroll}>
              <TouchableOpacity
                style={[styles.categoryChip, activeCategory === "" && styles.categoryChipActive]}
                onPress={() => setActiveCategory("")}
              >
                <Text style={[styles.categoryChipText, activeCategory === "" && styles.categoryChipTextActive]}>
                  Semua Produk
                </Text>
              </TouchableOpacity>
              {activeCategories.map((cat: any) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, activeCategory === cat.id && styles.categoryChipActive]}
                  onPress={() => setActiveCategory(cat.id)}
                >
                  <Text style={[styles.categoryChipText, activeCategory === cat.id && styles.categoryChipTextActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Independent product listing area */}
          <View style={{ flex: 1 }}>{renderContent()}</View>
        </View>

        {/* Right Side: Cart Summary Panel (Tablet only) */}
        {isTablet && (
          <View style={styles.cartPane}>
            <Text style={styles.paneTitle}>Pemenuhan & Detail</Text>

            {/* Customer Details Form */}
            <View style={styles.formContainer}>
              <TextInput
                style={styles.formInput}
                placeholder="Nama Pelanggan (mis. John)"
                placeholderTextColor="#71717a"
                value={customerName}
                onChangeText={setCustomerName}
              />
            </View>

            <Text style={styles.paneTitle}>Item Keranjang ({totalItems})</Text>

            {/* Scrollable list of cart items */}
            <View style={{ flex: 1 }}>{renderCartItems()}</View>

            {/* Price estimations matching backend rules */}
            <View style={styles.summaryContainer}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>Rp {subtotal.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Pajak & Diskon</Text>
                <Text style={styles.summaryCalculated}>Dihitung saat pembayaran</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.grandLabel}>Estimasi Total</Text>
                <Text style={styles.grandValue}>Rp {subtotal.toLocaleString()}</Text>
              </View>

              <TouchableOpacity
                style={[styles.paneCheckoutBtn, totalItems === 0 && styles.disabledBtn]}
                onPress={handleNextStep}
                disabled={totalItems === 0}
              >
                <Text style={styles.paneCheckoutBtnText}>Tinjau Pembayaran</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Floating Bottom Bar (Phone layout only when items > 0) */}
      {!isTablet && totalItems > 0 && (
        <View style={styles.footerBar}>
          <View>
            <Text style={styles.footerQty}>{totalItems} item dipilih</Text>
            <Text style={styles.footerPrice}>Subtotal: Rp {subtotal.toLocaleString()}</Text>
          </View>
          <TouchableOpacity style={styles.checkoutBtn} onPress={handleNextStep}>
            <Text style={styles.checkoutText}>Tinjau Keranjang</Text>
          </TouchableOpacity>
        </View>
      )}
      <Modal
        visible={!loadingShift && !isShiftOpen}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <WarningIcon color="#fecaca" />
            </View>
            <Text style={styles.modalTitle}>Shift Belum Buka</Text>
            <Text style={styles.modalMessage}>
              Anda harus membuka shift kasir sebelum dapat membuat pesanan baru.
            </Text>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => {
                navigation.navigate("OpenShift");
              }}
            >
              <Text style={styles.modalBtnText}>Buka Shift Kasir</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalLogoutBtn}
              onPress={handleLogout}
            >
              <Text style={styles.modalLogoutBtnText}>Keluar Sesi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingHorizontal: 16,
    backgroundColor: theme.background,
    gap: 8,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backText: {
    color: theme.textSecondary,
    fontSize: 14,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "bold",
    color: theme.textPrimary,
    textAlign: "center",
  },
  clearBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  clearText: {
    color: theme.error,
    fontSize: 14,
  },
  mainLayout: {
    flex: 1,
    flexDirection: "row",
  },
  catalogPane: {
    flex: 1,
    backgroundColor: theme.background,
  },
  // Search bar styles
  searchRow: {
    padding: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 24,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
    color: theme.textMuted,
  },
  searchInput: {
    flex: 1,
    color: theme.textPrimary,
    fontSize: 14,
    paddingVertical: 8,
  },
  clearSearchBtn: {
    padding: 6,
  },
  clearSearchText: {
    color: theme.textMuted,
    fontSize: 14,
    fontWeight: "bold",
  },
  // Category chip styles
  categoryChipsWrapper: {
    marginBottom: 12,
  },
  categoryChipsScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 20,
  },
  categoryChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  categoryChipText: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  categoryChipTextActive: {
    color: "#ffffff",
  },
  // Grid layout styles
  listPadding: {
    paddingHorizontal: 12,
    paddingBottom: 80,
  },
  gridRow: {
    justifyContent: "flex-start",
    marginBottom: 12,
    gap: 8,
  },
  // Memoized Product Card Styles
  card: {
    width: "25%",
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
    overflow: "hidden",
    // Soft shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardSelected: {
    borderColor: theme.success,
  },
  imageContainer: {
    width: "100%",
    height: 100,
    backgroundColor: theme.surfaceSecondary,
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  quantityBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: theme.success,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  quantityBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "bold",
  },
  cardBody: {
    padding: 12,
    gap: 6,
  },
  cardCategory: {
    fontSize: 10,
    fontWeight: "600",
    color: theme.textMuted,
    textTransform: "uppercase",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.textPrimary,
    height: 38,
    lineHeight: 18,
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.primary,
    marginVertical: 2,
  },
  cardStock: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.textSecondary || "#4b5563",
  },
  cardActions: {
    marginTop: 4,
  },
  addBtn: {
    height: 36,
    backgroundColor: theme.primary,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },
  addBtnSelected: {
    backgroundColor: theme.success,
  },
  addBtnTextSelected: {
    color: "#ffffff",
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.surfaceSecondary,
    borderRadius: 6,
    padding: 2,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 4,
    backgroundColor: theme.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  qtyBtnText: {
    color: theme.textPrimary,
    fontSize: 14,
    fontWeight: "bold",
  },
  qtyText: {
    fontSize: 13,
    fontWeight: "bold",
    color: theme.textPrimary,
  },
  // Loading Skeleton Styles
  skeletonCard: {
    width: "25%",
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    overflow: "hidden",
  },
  skeletonImage: {
    width: "100%",
    height: 120,
    backgroundColor: theme.surfaceSecondary,
  },
  skeletonLine: {
    backgroundColor: theme.surfaceSecondary,
    borderRadius: 4,
  },
  skeletonButton: {
    height: 36,
    backgroundColor: theme.surfaceSecondary,
    borderRadius: 6,
  },
  // Empty State Styles
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 36,
    marginTop: 48,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.textSecondary,
    textAlign: "center",
  },
  // Tablet Cart Panel Styles
  cartPane: {
    width: 350,
    backgroundColor: theme.surface,
    borderLeftWidth: 1,
    borderLeftColor: theme.border,
    padding: 16,
    gap: 12,
  },
  paneTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.textPrimary,
    letterSpacing: 0.5,
    marginTop: 8,
  },
  formContainer: {
    gap: 12,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 12,
  },
  formInput: {
    height: 40,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: theme.textPrimary,
    fontSize: 13,
  },
  typeTabs: {
    flexDirection: "row",
    gap: 8,
  },
  typeTab: {
    flex: 1,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  typeTabActive: {
    borderColor: theme.primary,
    backgroundColor: theme.primarySoft,
  },
  typeTabText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  typeTabTextActive: {
    color: theme.textPrimary,
  },
  tablesWrapper: {
    gap: 6,
    marginTop: 4,
  },
  tablesLabel: {
    fontSize: 11,
    color: theme.textMuted,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  tableScroll: {
    gap: 6,
  },
  tablePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 6,
  },
  tablePillActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  tablePillText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  tablePillTextActive: {
    color: "#ffffff",
  },
  // Cart items scrolling area
  cartItemsScroll: {
    flex: 1,
    backgroundColor: theme.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 10,
  },
  emptyCartContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: theme.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    borderStyle: "dashed",
  },
  emptyCartIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyCartTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: theme.textSecondary,
    marginBottom: 4,
  },
  emptyCartSubtitle: {
    fontSize: 11,
    color: theme.textMuted,
    textAlign: "center",
  },
  cartItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.surface,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cartItemInfo: {
    flex: 1,
    gap: 2,
    paddingRight: 8,
  },
  cartItemName: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.textPrimary,
  },
  cartItemPrice: {
    fontSize: 11,
    color: theme.primary,
    fontWeight: "bold",
  },
  cartItemActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cartQtyBtn: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: theme.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  cartQtyText: {
    color: theme.textPrimary,
    fontSize: 12,
    fontWeight: "bold",
  },
  cartQtyVal: {
    fontSize: 12,
    fontWeight: "bold",
    color: theme.textPrimary,
    minWidth: 16,
    textAlign: "center",
  },
  // Price Summary Panel
  summaryContainer: {
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  summaryValue: {
    fontSize: 12,
    color: theme.textPrimary,
    fontWeight: "600",
  },
  summaryCalculated: {
    fontSize: 11,
    color: theme.textMuted,
    fontStyle: "italic",
  },
  divider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: 2,
  },
  grandLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: theme.textPrimary,
  },
  grandValue: {
    fontSize: 15,
    fontWeight: "bold",
    color: theme.success,
  },
  paneCheckoutBtn: {
    height: 44,
    backgroundColor: theme.primary,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  paneCheckoutBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  disabledBtn: {
    opacity: 0.5,
  },
  // Floating footer bar for phones
  footerBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  footerQty: {
    color: theme.textSecondary,
    fontSize: 12,
  },
  footerPrice: {
    color: theme.primary,
    fontSize: 15,
    fontWeight: "bold",
    marginTop: 2,
  },
  checkoutBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: theme.primary,
    borderRadius: 8,
  },
  checkoutText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(9, 9, 11, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.textPrimary,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  modalBtn: {
    width: "100%",
    height: 48,
    backgroundColor: theme.primary,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  modalBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "bold",
  },
  modalLogoutBtn: {
    width: "100%",
    height: 48,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.error,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  modalLogoutBtnText: {
    color: theme.error,
    fontSize: 15,
    fontWeight: "bold",
  },
});

