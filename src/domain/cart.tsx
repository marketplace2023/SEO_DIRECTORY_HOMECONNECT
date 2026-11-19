import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { z } from "zod";

const cartSchema = z
  .array(
    z.object({
      professionalId: z.string().min(1).max(100),
      serviceId: z.string().min(1).max(100),
    }),
  )
  .max(1000);
export type CartItem = z.infer<typeof cartSchema>[number];
const Context = createContext<{
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (item: CartItem) => void;
  storageError: boolean;
} | null>(null);

function readCart(key: string) {
  try {
    return cartSchema.parse(JSON.parse(localStorage.getItem(key) ?? "[]"));
  } catch {
    return undefined;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [key] = useState(() => {
    try {
      return (
        "homeconnect.cart." +
        (localStorage.getItem("servinexo.demo-session") || "default")
      );
    } catch {
      return "homeconnect.cart.default";
    }
  });
  const [items, setItems] = useState<CartItem[]>(() => readCart(key) ?? []);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    const receive = (event: StorageEvent) => {
      if (event.key === key || event.key === null)
        setItems(readCart(key) ?? []);
    };
    window.addEventListener("storage", receive);
    return () => window.removeEventListener("storage", receive);
  }, [key]);
  const update = (change: (current: CartItem[]) => CartItem[]) => {
    const next = change(storageError ? items : (readCart(key) ?? items));
    setItems(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  };
  const same = (a: CartItem, b: CartItem) =>
    a.professionalId === b.professionalId && a.serviceId === b.serviceId;
  return (
    <Context.Provider
      value={{
        items,
        storageError,
        add: (item) =>
          update((current) =>
            current.some((existing) => same(existing, item))
              ? current
              : [...current, item],
          ),
        remove: (item) =>
          update((current) =>
            current.filter((existing) => !same(existing, item)),
          ),
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useCart() {
  const cart = useContext(Context);
  if (!cart) throw Error("CartProvider is required");
  return cart;
}
