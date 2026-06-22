import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toBlob } from "html-to-image";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Maximize2,
  Minus,
  MapPin,
  Phone,
  Plus,
  ReceiptText,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { flushSync } from "react-dom";
import logoShanti from "./assets/logo-shanti-catering.png";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./components/ui/alert-dialog";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "./components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { cn } from "./lib/utils";

type DocumentMode = "nota" | "invoice";

type LineItem = {
  id: string;
  quantity: string;
  name: string;
  price: string;
};

type DocumentData = {
  documentNumber: string;
  date: string;
  customerName: string;
  deliveryFee: string;
  items: LineItem[];
};

const createItem = (name = "", quantity = "", price = ""): LineItem => ({
  id: crypto.randomUUID(),
  quantity,
  name,
  price,
});

const initialData: DocumentData = {
  documentNumber: "",
  date: "",
  customerName: "",
  deliveryFee: "",
  items: [createItem()],
};

const businessProfile = {
  name: "Shanti Catering",
  slug: "ShantiCatering",
  address: "Jl. Bhaskara III No. 38",
  phone: "0821 4155 1973",
  serviceInfo: "Menerima Pesanan Nasi Kotak, Kue, Tumpeng, Prasmanan, Coffee Break.",
  paymentInfo: "Pembayaran dapat dilakukan tunai atau transfer.",
  closingNote: "Terima kasih atas kepercayaannya.",
};

const signatureLabel = "Tanda Terima,";

const COUNTER_KEY = "shanti-catering-document-counter-v2";

const readCounter = () => {
  if (typeof window === "undefined") return 1;
  const stored = Number(window.localStorage.getItem(COUNTER_KEY));
  return Number.isFinite(stored) && stored > 0 ? stored : 1;
};

const formatDocumentNumber = (counter: number) =>
  `${businessProfile.slug}-${String(counter).padStart(6, "0")}`;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatDate = (date: string) => {
  if (!date) return "";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
};

const toDateValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const todayValue = () => toDateValue(new Date());

const parseDateValue = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const monthLabelFormatter = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
});

const monthNames = Array.from({ length: 12 }, (_, monthIndex) =>
  new Intl.DateTimeFormat("id-ID", { month: "long" }).format(new Date(2026, monthIndex, 1)),
);

const normalizeNumericInput = (value: string) =>
  value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");

const toNumber = (value: string) => Number(normalizeNumericInput(value)) || 0;

const formatNumberInput = (value: string) => {
  const normalized = normalizeNumericInput(value);
  if (!normalized) return "";
  return new Intl.NumberFormat("id-ID").format(Number(normalized));
};

const toCapitalCase = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());

const itemHasContent = (item?: LineItem) =>
  Boolean(item && (item.name.trim() || item.quantity || item.price));

const itemLineTotal = (item: LineItem) => toNumber(item.quantity) * toNumber(item.price);

const sanitizeFilePart = (value: string) =>
  value.trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-");

const exportOptions = {
  cacheBust: true,
  pixelRatio: 2,
  backgroundColor: "#ffffff",
};
const exportFramePadding = 32;

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const imageToDataUrl = async (src: string) => {
  const response = await fetch(src, { cache: "force-cache" });
  if (!response.ok) throw new Error(`Failed to load image: ${src}`);
  const blob = await response.blob();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const decodeImageSource = async (src: string) =>
  new Promise<void>((resolve) => {
    const image = new Image();
    image.decoding = "sync";
    image.onload = () => {
      if (!image.decode) {
        resolve();
        return;
      }

      image.decode().then(() => resolve()).catch(() => resolve());
    };
    image.onerror = () => resolve();
    image.src = src;
  });

let embeddedLogoSrcPromise: Promise<string> | null = null;

const getEmbeddedLogoSrc = () => {
  embeddedLogoSrcPromise ??= imageToDataUrl(logoShanti).then(async (dataUrl) => {
    await decodeImageSource(dataUrl);
    return dataUrl;
  });
  return embeddedLogoSrcPromise;
};

const waitForNextPaint = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

const waitForImages = async (node: HTMLElement) => {
  const images = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    images.map(async (image) => {
      if (!(image.complete && image.naturalWidth > 0)) {
        await new Promise<void>((resolve) => {
          image.onload = () => resolve();
          image.onerror = () => resolve();
        });
      }

      if (!image.decode) return;
      await image.decode().catch(() => undefined);
    }),
  );
};

const isMobileOrTabletDevice = () => {
  if (typeof window === "undefined") return false;

  const shareNavigator = typeof navigator === "undefined" ? null : navigator;
  const userAgent = shareNavigator?.userAgent || "";
  const platform = shareNavigator?.platform || "";
  const maxTouchPoints = shareNavigator?.maxTouchPoints || 0;
  const hasTouchScreen = maxTouchPoints > 1 || window.matchMedia("(pointer: coarse)").matches;
  const isIPadOS = platform === "MacIntel" && maxTouchPoints > 1;
  const hasMobileUserAgent =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(userAgent);
  const hasTabletLikeViewport = window.matchMedia("(max-width: 1180px)").matches;

  return hasMobileUserAgent || isIPadOS || (hasTouchScreen && hasTabletLikeViewport);
};

function App() {
  const [mode, setMode] = useState<DocumentMode>("nota");
  const [data, setData] = useState<DocumentData>(initialData);
  const [documentCounter, setDocumentCounter] = useState(readCounter);
  const [isExporting, setIsExporting] = useState(false);
  const [logoSrc, setLogoSrc] = useState(logoShanti);
  const [isLogoReady, setIsLogoReady] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const logoSrcRef = useRef(logoShanti);
  const reduceMotion = useReducedMotion();

  const generatedDocumentNumber = useMemo(() => formatDocumentNumber(documentCounter), [documentCounter]);

  useEffect(() => {
    window.localStorage.setItem(COUNTER_KEY, String(documentCounter));
  }, [documentCounter]);

  useEffect(() => {
    let isMounted = true;
    getEmbeddedLogoSrc()
      .then((dataUrl) => {
        if (!isMounted) return;
        logoSrcRef.current = dataUrl;
        setLogoSrc(dataUrl);
        setIsLogoReady(true);
      })
      .catch(async () => {
        await decodeImageSource(logoShanti);
        if (!isMounted) return;
        logoSrcRef.current = logoShanti;
        setLogoSrc(logoShanti);
        setIsLogoReady(true);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const itemSubtotal = useMemo(
    () => data.items.reduce((sum, item) => sum + itemLineTotal(item), 0),
    [data.items],
  );
  const total = useMemo(
    () => itemSubtotal + (mode === "nota" ? toNumber(data.deliveryFee) : 0),
    [data.deliveryFee, itemSubtotal, mode],
  );

  const updateData = <K extends keyof DocumentData>(key: K, value: DocumentData[K]) => {
    setData((current) => ({ ...current, [key]: value }));
  };

  const updateItem = (id: string, patch: Partial<LineItem>) => {
    setData((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };

  const addItem = () => {
    setData((current) => ({
      ...current,
      items: [...current.items, createItem()],
    }));
  };

  const removeItem = (id: string) => {
    setData((current) => ({
      ...current,
      items: current.items.length === 1 ? current.items : current.items.filter((item) => item.id !== id),
    }));
  };

  const clearItems = () => {
    setData((current) => ({
      ...current,
      items: [createItem()],
    }));
  };

  const downloadImage = async () => {
    if (!previewRef.current) return;

    setIsExporting(true);
    try {
      await document.fonts.ready;
      const exportLogoSrc = await getEmbeddedLogoSrc().catch(async () => {
        await decodeImageSource(logoShanti);
        return logoShanti;
      });

      if (logoSrcRef.current !== exportLogoSrc) {
        flushSync(() => {
          setLogoSrc(exportLogoSrc);
          setIsLogoReady(true);
        });
        logoSrcRef.current = exportLogoSrc;
      }

      await waitForNextPaint();
      await waitForImages(previewRef.current);
      const blob = await toBlob(previewRef.current, exportOptions);
      if (!blob) return;

      const exportDocumentNumber = data.documentNumber.trim() || generatedDocumentNumber;
      const fileName = `${mode}-${sanitizeFilePart(exportDocumentNumber)}.png`;
      const file = new File([blob], fileName, { type: "image/png" });
      const shareData: ShareData = {
        files: [file],
      };
      const shareNavigator = typeof navigator === "undefined" ? null : navigator;
      const shouldUseNativeShare = isMobileOrTabletDevice();
      const canShareFiles =
        shouldUseNativeShare &&
        shareNavigator &&
        typeof shareNavigator.share === "function" &&
        (!shareNavigator.canShare || shareNavigator.canShare({ files: [file] }));

      if (canShareFiles) {
        try {
          await shareNavigator.share(shareData);
          setDocumentCounter((current) => current + 1);
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
        }
      }

      downloadBlob(blob, fileName);
      setDocumentCounter((current) => current + 1);
    } finally {
      setIsExporting(false);
    }
  };

  const motionProps = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: 0.22 },
      };

  return (
    <main className="min-h-[100dvh] overflow-x-clip bg-[#f6fbf5] px-4 py-5 text-[#123322] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5">
        <AppHeader logoSrc={logoSrc} />

        <Tabs value={mode} onValueChange={(value) => setMode(value as DocumentMode)}>
          <TabsList aria-label="Pilih jenis dokumen">
            <TabsTrigger value="nota">
              <ReceiptText className="h-4 w-4" aria-hidden="true" />
              Nota
            </TabsTrigger>
            <TabsTrigger value="invoice">
              <FileText className="h-4 w-4" aria-hidden="true" />
              Invoice
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <TabsContent value="nota" forceMount hidden={mode !== "nota"}>
              {mode === "nota" && (
                <motion.div key="nota" {...motionProps}>
                  <Workspace
                    mode="nota"
                    data={data}
                    total={total}
                    previewRef={previewRef}
                    isExporting={isExporting}
                    isLogoReady={isLogoReady}
                    onDataChange={updateData}
                    onItemChange={updateItem}
                    onAddItem={addItem}
                    onRemoveItem={removeItem}
                    onClearItems={clearItems}
                    logoSrc={logoSrc}
                    documentNumber={data.documentNumber}
                    onDownloadImage={downloadImage}
                  />
                </motion.div>
              )}
            </TabsContent>
            <TabsContent value="invoice" forceMount hidden={mode !== "invoice"}>
              {mode === "invoice" && (
                <motion.div key="invoice" {...motionProps}>
                  <Workspace
                    mode="invoice"
                    data={data}
                    total={total}
                    previewRef={previewRef}
                    isExporting={isExporting}
                    isLogoReady={isLogoReady}
                    onDataChange={updateData}
                    onItemChange={updateItem}
                    onAddItem={addItem}
                    onRemoveItem={removeItem}
                    onClearItems={clearItems}
                    logoSrc={logoSrc}
                    documentNumber={data.documentNumber}
                    onDownloadImage={downloadImage}
                  />
                </motion.div>
              )}
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </div>
    </main>
  );
}

type WorkspaceProps = {
  mode: DocumentMode;
  data: DocumentData;
  total: number;
  previewRef: React.RefObject<HTMLDivElement | null>;
  isExporting: boolean;
  isLogoReady: boolean;
  onDataChange: <K extends keyof DocumentData>(key: K, value: DocumentData[K]) => void;
  onItemChange: (id: string, patch: Partial<LineItem>) => void;
  onAddItem: () => void;
  onRemoveItem: (id: string) => void;
  onClearItems: () => void;
  logoSrc: string;
  documentNumber: string;
  onDownloadImage: () => void;
};

function AppHeader({ logoSrc }: { logoSrc: string }) {
  return (
    <header className="flex items-center justify-between gap-4 rounded-[18px] border border-[#c9e9c3] bg-white px-4 py-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <img
          src={logoSrc}
          alt="Shanti Catering logo"
          decoding="sync"
          loading="eager"
          className="h-14 w-28 shrink-0 object-contain object-left sm:h-16 sm:w-36"
        />
        <div className="min-w-0">
          <h1 className="text-xl font-black tracking-tight text-[#08351d] sm:text-2xl">
            Nota dan Invoice
          </h1>
          <p className="mt-1 text-sm text-[#4e7258]">Shanti Catering</p>
        </div>
      </div>
    </header>
  );
}

function Workspace({
  mode,
  data,
  total,
  previewRef,
  isExporting,
  isLogoReady,
  onDataChange,
  onItemChange,
  onAddItem,
  onRemoveItem,
  onClearItems,
  logoSrc,
  documentNumber,
  onDownloadImage,
}: WorkspaceProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,430px)_minmax(0,1fr)]">
      <section className="min-w-0 rounded-[18px] border border-[#c9e9c3] bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#08351d]">Data dokumen</h2>
            <p className="mt-1 text-sm text-[#4e7258]">
              {mode === "nota" ? "Format nota portrait." : "Format invoice landscape."}
            </p>
          </div>
          <span className="rounded-full bg-[#e7f4e2] px-3 py-1 text-xs font-semibold text-[#005d2e]">
            {mode === "nota" ? "Portrait" : "Landscape"}
          </span>
        </div>

        <div className="mt-5 space-y-6">
          <FormSection title={mode === "nota" ? "Detail nota" : "Detail invoice"}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={mode === "nota" ? "NOTA No" : "Invoice No"} htmlFor="document-number">
                <Input
                  id="document-number"
                  value={data.documentNumber}
                  onChange={(event) => onDataChange("documentNumber", event.target.value)}
                />
              </Field>
              <Field label="Tanggal" htmlFor="date-picker">
                <DatePicker value={data.date} onChange={(date) => onDataChange("date", date)} />
              </Field>
              <Field label={mode === "nota" ? "Kepada YTH" : "Customer"} htmlFor="customer-name">
                <Input
                  id="customer-name"
                  value={data.customerName}
                  onChange={(event) => onDataChange("customerName", event.target.value)}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            title="Item"
            action={
              <div className="flex flex-wrap justify-end gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" size="sm" variant="danger" className="border-red-600 bg-red-600 text-white hover:bg-red-700">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Hapus semua
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Hapus semua item?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Semua item akan dikosongkan dan diganti dengan 1 item kosong. Preview nota dan invoice ikut berubah.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel asChild>
                        <Button type="button" variant="secondary">
                          Batal
                        </Button>
                      </AlertDialogCancel>
                      <AlertDialogAction asChild>
                        <Button type="button" variant="danger" className="border-red-600 bg-red-600 text-white hover:bg-red-700" onClick={onClearItems}>
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          Hapus semua
                        </Button>
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button type="button" size="sm" variant="secondary" onClick={onAddItem}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Tambah
                </Button>
              </div>
            }
          >
            <div className="space-y-3">
              <div className="max-h-[520px] space-y-3 overflow-y-auto overscroll-contain rounded-[16px] border border-[#d8eccf] bg-[#f6fbf5] p-2 pr-2.5">
                {data.items.map((item, index) => (
                  <div key={item.id} className="rounded-[14px] border border-[#c9e9c3] bg-[#fbfdfb] p-3">
                    <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
                      <Field label="Qty" htmlFor={`qty-${item.id}`}>
                        <QuantityStepper
                          id={`qty-${item.id}`}
                          value={item.quantity}
                          onChange={(value) => onItemChange(item.id, { quantity: value })}
                        />
                      </Field>
                      <Field label={`Item ${index + 1}`} htmlFor={`name-${item.id}`}>
                        <Input
                          id={`name-${item.id}`}
                          value={item.name}
                          onChange={(event) => onItemChange(item.id, { name: event.target.value })}
                        />
                      </Field>
                      <div className="grid gap-3 sm:col-span-2 sm:grid-cols-[minmax(0,1fr)_44px]">
                        <Field label="Harga" htmlFor={`price-${item.id}`}>
                          <PriceInput
                            id={`price-${item.id}`}
                            value={item.price}
                            onChange={(value) => onItemChange(item.id, { price: value })}
                          />
                        </Field>
                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="danger"
                            size="icon"
                            onClick={() => onRemoveItem(item.id)}
                            aria-label={`Hapus item ${index + 1}`}
                            disabled={data.items.length === 1}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-right text-sm font-semibold text-[#005d2e]">
                      Jumlah: {itemLineTotal(item) > 0 ? formatCurrency(itemLineTotal(item)) : "-"}
                    </p>
                  </div>
                ))}
              </div>
              {mode === "nota" && (
                <div className="rounded-[14px] border border-[#c9e9c3] bg-[#f6fbf5] p-3">
                  <Field label="Ongkir (Opsional)" htmlFor="delivery-fee">
                    <PriceInput
                      id="delivery-fee"
                      value={data.deliveryFee}
                      onChange={(value) => onDataChange("deliveryFee", value)}
                    />
                  </Field>
                  {data.deliveryFee && (
                    <p className="mt-3 text-right text-sm font-semibold text-[#005d2e]">
                      Masuk ke nota sebagai Ongkir: {formatCurrency(toNumber(data.deliveryFee))}
                    </p>
                  )}
                </div>
              )}
            </div>
          </FormSection>

        </div>
      </section>

      <section className="min-w-0 rounded-[18px] border border-[#c9e9c3] bg-white p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#08351d]">Preview</h2>
            <p className="mt-1 text-sm text-[#4e7258]">Area ini yang akan di-export menjadi PNG.</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
            <p className="whitespace-nowrap rounded-full bg-[#f6fbf5] px-3 py-1 text-xs font-semibold text-[#315c3d]">
              {formatCurrency(total)}
            </p>
            <Button
              type="button"
              size="sm"
              onClick={onDownloadImage}
              disabled={isExporting || !isLogoReady}
              className="min-w-[132px] whitespace-nowrap px-4"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {isExporting ? "Menyimpan..." : isLogoReady ? "Simpan gambar" : "Menyiapkan..."}
            </Button>
          </div>
        </div>

        <PreviewCanvas mode={mode}>
          <ExportFrame ref={previewRef}>
            {mode === "nota" ? (
              <NotaPreview data={data} total={total} documentNumber={documentNumber} logoSrc={logoSrc} />
            ) : (
              <InvoicePreview data={data} total={total} documentNumber={documentNumber} logoSrc={logoSrc} />
            )}
          </ExportFrame>
        </PreviewCanvas>
      </section>
    </div>
  );
}

const ExportFrame = forwardRef<HTMLDivElement, { children: ReactNode }>(({ children }, ref) => (
  <div ref={ref} className="export-frame" style={{ padding: exportFramePadding }}>
    {children}
  </div>
));
ExportFrame.displayName = "ExportFrame";

function PreviewCanvas({ mode, children }: { mode: DocumentMode; children: ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [fitZoom, setFitZoom] = useState(0.5);
  const [zoom, setZoom] = useState(0.5);
  const [previewHeight, setPreviewHeight] = useState(460);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);

  const documentSize = mode === "nota" ? { width: 760, height: 1080 } : { width: 1120, height: 760 };
  const paperSize = {
    width: documentSize.width + exportFramePadding * 2,
    height: documentSize.height + exportFramePadding * 2,
  };

  const clampZoom = (value: number) => Math.min(1.35, Math.max(0.25, value));

  const getPreviewMetrics = (zoomValue: number) => {
    const isMobile = window.innerWidth < 768;
    const paddingY = isMobile ? 20 : 28;
    const maxHeight = Math.min(window.innerHeight * 0.72, isMobile ? 620 : 720);
    return {
      paddingY,
      height: Math.min(maxHeight, Math.ceil(paperSize.height * zoomValue + paddingY)),
    };
  };

  const calculateFit = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const { paddingY } = getPreviewMetrics(zoom);
    const availableWidth = viewport.clientWidth - paddingY;
    const availableHeight = Math.min(window.innerHeight * 0.72, 690) - paddingY;
    const nextFit = clampZoom(Math.min(availableWidth / paperSize.width, availableHeight / paperSize.height, 1));
    setFitZoom(nextFit);
    setZoom(nextFit);
    setPreviewHeight(getPreviewMetrics(nextFit).height);
  };

  useLayoutEffect(() => {
    calculateFit();
    window.addEventListener("resize", calculateFit);
    return () => {
      window.removeEventListener("resize", calculateFit);
    };
  }, [mode, paperSize.height, paperSize.width]);

  const setClampedZoom = (value: number) => {
    const nextZoom = clampZoom(value);
    setZoom(nextZoom);
    setPreviewHeight(getPreviewMetrics(nextZoom).height);
  };

  const getPinchDistance = () => {
    const points = Array.from(pointersRef.current.values());
    if (points.length < 2) return 0;
    const [first, second] = points;
    return Math.hypot(first.x - second.x, first.y - second.y);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2) {
      pinchRef.current = { distance: getPinchDistance(), zoom };
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size < 2 || !pinchRef.current) return;
    const nextDistance = getPinchDistance();
    if (!nextDistance || !pinchRef.current.distance) return;
    setClampedZoom(pinchRef.current.zoom * (nextDistance / pinchRef.current.distance));
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) {
      pinchRef.current = null;
    }
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    setClampedZoom(zoom + (event.deltaY > 0 ? -0.06 : 0.06));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => setClampedZoom(zoom - 0.08)}>
          <ZoomOut className="h-4 w-4" aria-hidden="true" />
          Zoom out
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => setClampedZoom(zoom + 0.08)}>
          <ZoomIn className="h-4 w-4" aria-hidden="true" />
          Zoom in
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setClampedZoom(fitZoom)}>
          <Maximize2 className="h-4 w-4" aria-hidden="true" />
          Fit
        </Button>
        <span className="rounded-full bg-[#f6fbf5] px-3 py-1 text-xs font-semibold text-[#315c3d]">
          {Math.round(zoom * 100)}%
        </span>
      </div>
      <div
        ref={viewportRef}
        className="preview-scroll"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onWheel={handleWheel}
        style={{ height: previewHeight }}
      >
        <div
          className="preview-stage"
          style={{
            width: paperSize.width * zoom,
            height: paperSize.height * zoom,
          }}
        >
          <div
            className="preview-scale"
            style={{
              width: paperSize.width,
              height: paperSize.height,
              transform: `scale(${zoom})`,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-w-0 gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function QuantityStepper({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const numericValue = toNumber(value);

  const setQuantity = (nextValue: number) => {
    onChange(nextValue > 0 ? String(nextValue) : "");
  };

  return (
    <div className="flex h-11 w-full overflow-hidden rounded-[10px] border border-[#c9e9c3] bg-white text-[#123322] transition-colors duration-200 focus-within:ring-2 focus-within:ring-[#238d48] focus-within:ring-offset-2">
      <button
        type="button"
        className="grid h-full w-10 shrink-0 cursor-pointer place-items-center text-[#005d2e] transition-colors duration-200 hover:bg-[#f6fbf5] disabled:cursor-not-allowed disabled:text-[#9bb5a2]"
        onClick={() => setQuantity(numericValue - 1)}
        disabled={numericValue <= 0}
        aria-label="Kurangi qty"
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={normalizeNumericInput(value)}
        onChange={(event) => onChange(normalizeNumericInput(event.target.value))}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setQuantity(numericValue + 1);
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setQuantity(numericValue - 1);
          }
        }}
        className="h-full min-w-0 flex-1 border-x border-[#e0f0dc] bg-transparent px-2 text-center text-sm font-bold outline-none"
        aria-label="Qty"
      />
      <button
        type="button"
        className="grid h-full w-10 shrink-0 cursor-pointer place-items-center text-[#005d2e] transition-colors duration-200 hover:bg-[#f6fbf5]"
        onClick={() => setQuantity(numericValue + 1)}
        aria-label="Tambah qty"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function PriceInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex h-11 w-full items-center overflow-hidden rounded-[10px] border border-[#c9e9c3] bg-white text-[#123322] transition-colors duration-200 focus-within:ring-2 focus-within:ring-[#238d48] focus-within:ring-offset-2">
      <span className="shrink-0 pl-3 pr-2 text-xs font-black text-[#238d48]">Rp</span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9.]*"
        value={formatNumberInput(value)}
        onChange={(event) => onChange(normalizeNumericInput(event.target.value))}
        placeholder="0"
        className="h-full min-w-0 flex-1 bg-transparent px-1 pr-3 text-sm font-semibold outline-none placeholder:text-[#8fab95]"
      />
    </div>
  );
}

function DatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const selected = parseDateValue(value);
    const base = selected || new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const selectedDate = parseDateValue(value);
  const selectedLabel = selectedDate ? formatDate(value) : "Pilih tanggal";
  const monthLabel = monthLabelFormatter.format(visibleMonth);
  const currentToday = todayValue();

  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return date;
    });
  }, [visibleMonth]);

  useEffect(() => {
    if (!selectedDate) return;
    setVisibleMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [selectedDate?.getFullYear(), selectedDate?.getMonth()]);

  const moveMonth = (offset: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const moveYear = (offset: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear() + offset, current.getMonth(), 1));
  };

  const selectMonth = (monthIndex: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), monthIndex, 1));
    setIsMonthPickerOpen(false);
  };

  const selectDate = (date: Date) => {
    onChange(toDateValue(date));
    setOpen(false);
  };

  const selectToday = () => {
    const nextValue = todayValue();
    const nextDate = parseDateValue(nextValue);
    if (nextDate) {
      setVisibleMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
    }
    onChange(nextValue);
    setOpen(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setIsMonthPickerOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id="date-picker"
          type="button"
          variant="secondary"
          className={cn(
            "h-11 w-full justify-between rounded-[10px] bg-white px-3 text-left text-sm font-normal hover:bg-[#f6fbf5]",
            !value && "text-[#5e7d68]",
          )}
          aria-label="Pilih tanggal"
        >
          <span className="truncate">{selectedLabel}</span>
          <CalendarDays className="h-4 w-4 shrink-0 text-[#238d48]" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-[min(calc(100vw-2rem),312px)] p-2.5">
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => (isMonthPickerOpen ? moveYear(-1) : moveMonth(-1))}
            aria-label={isMonthPickerOpen ? "Tahun sebelumnya" : "Bulan sebelumnya"}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <button
            type="button"
            className={cn(
              "flex min-w-0 cursor-pointer items-center gap-1 rounded-[10px] px-3 py-1.5 text-sm font-black capitalize text-[#08351d] transition-colors duration-200 hover:bg-[#f6fbf5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#238d48]",
              isMonthPickerOpen && "bg-[#e7f4e2] text-[#005d2e]",
            )}
            onClick={() => setIsMonthPickerOpen((current) => !current)}
            aria-expanded={isMonthPickerOpen}
            aria-label="Pilih bulan"
          >
            <span>{isMonthPickerOpen ? visibleMonth.getFullYear() : monthLabel}</span>
            <ChevronDown
              className={cn("h-4 w-4 transition-transform duration-200", isMonthPickerOpen && "rotate-180")}
              aria-hidden="true"
            />
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => (isMonthPickerOpen ? moveYear(1) : moveMonth(1))}
            aria-label={isMonthPickerOpen ? "Tahun berikutnya" : "Bulan berikutnya"}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {isMonthPickerOpen ? (
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {monthNames.map((monthName, monthIndex) => {
              const isVisibleMonth = visibleMonth.getMonth() === monthIndex;

              return (
                <button
                  key={monthName}
                  type="button"
                  className={cn(
                    "min-h-10 cursor-pointer rounded-[10px] px-2 py-2 text-xs font-black capitalize text-[#123322] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#238d48] focus-visible:ring-offset-2",
                    isVisibleMonth ? "bg-[#005d2e] text-white" : "bg-[#f6fbf5] hover:bg-[#e7f4e2]",
                  )}
                  onClick={() => selectMonth(monthIndex)}
                  aria-pressed={isVisibleMonth}
                >
                  {monthName}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-2.5 grid grid-cols-7 gap-0.5 text-center">
            {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day) => (
              <div key={day} className="py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-[#4e7258]">
                {day}
              </div>
            ))}
            {calendarDays.map((date) => {
              const dateValue = toDateValue(date);
              const isSelected = value === dateValue;
              const isToday = currentToday === dateValue;
              const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();

              return (
                <button
                  key={dateValue}
                  type="button"
                  className={cn(
                    "grid h-8 cursor-pointer place-items-center rounded-[9px] text-[13px] font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#238d48] focus-visible:ring-offset-2",
                    isSelected && "bg-[#005d2e] text-white hover:bg-[#005d2e]",
                    !isSelected && isToday && "border border-[#238d48] text-[#005d2e] hover:bg-[#e7f4e2]",
                    !isSelected && !isToday && "text-[#123322] hover:bg-[#e7f4e2]",
                    !isCurrentMonth && !isSelected && "text-[#8fab95]",
                  )}
                  onClick={() => selectDate(date)}
                  aria-pressed={isSelected}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-2.5 flex items-center justify-between border-t border-[#e0f0dc] pt-2.5">
          <button
            type="button"
            className="cursor-pointer rounded-[10px] px-2.5 py-1.5 text-xs font-bold text-[#4e7258] transition-colors duration-200 hover:bg-[#f6fbf5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#238d48]"
            onClick={() => onChange("")}
          >
            Kosongkan
          </button>
          <button
            type="button"
            className="cursor-pointer rounded-[10px] bg-[#e7f4e2] px-2.5 py-1.5 text-xs font-black text-[#005d2e] transition-colors duration-200 hover:bg-[#d8eccf] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#238d48]"
            onClick={selectToday}
          >
            Hari ini
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FormSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-[#08351d]">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function ContactPill({
  icon,
  children,
  compact = false,
}: {
  icon: ReactNode;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border-2 border-[#17261c] bg-white text-[#17261c]",
        compact ? "gap-1.5 px-2.5 py-1 text-[11px]" : "gap-2 px-3 py-1.5 text-[14px]",
      )}
    >
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-full border-2 border-[#17261c]",
          compact ? "h-5 w-5" : "h-7 w-7",
        )}
      >
        {icon}
      </span>
      <span className="font-bold leading-none">{children}</span>
    </div>
  );
}

function LogoBlock({ compact = false, logoSrc }: { compact?: boolean; logoSrc: string }) {
  return (
    <div className="flex flex-col items-start">
      <img
        src={logoSrc}
        alt="Shanti Catering logo"
        decoding="sync"
        loading="eager"
        className={cn("object-contain object-left", compact ? "h-20 w-56" : "h-36 w-80")}
      />
      <div className={cn("flex flex-col items-start gap-1.5", compact ? "mt-3" : "mt-5")}>
        <ContactPill icon={<MapPin className={cn("text-[#17261c]", compact ? "h-3 w-3" : "h-4 w-4")} />} compact={compact}>
          {businessProfile.address}
        </ContactPill>
        <ContactPill icon={<Phone className={cn("text-[#17261c]", compact ? "h-3 w-3" : "h-4 w-4")} />} compact={compact}>
          {businessProfile.phone}
        </ContactPill>
      </div>
    </div>
  );
}

const NotaPreview = forwardRef<
  HTMLDivElement,
  { data: DocumentData; total: number; documentNumber: string; logoSrc: string }
>(({ data, total, documentNumber, logoSrc }, ref) => {
  const deliveryFee = toNumber(data.deliveryFee);
  const contentRows = [
    ...data.items.filter(itemHasContent).map((item) => ({ type: "item" as const, item })),
    ...(deliveryFee > 0 ? [{ type: "delivery" as const }] : []),
  ];
  const rows = Array.from({ length: Math.max(10, contentRows.length) }, (_, index) => (
    contentRows[index] || { type: "empty" as const }
  ));

  return (
    <div ref={ref} className="document-paper nota-paper">
      <div className="grid grid-cols-[1fr_280px] gap-8">
        <LogoBlock logoSrc={logoSrc} />
        <div className="text-right">
          <p className="text-[15px] font-semibold leading-6 text-[#123322]">{businessProfile.serviceInfo}</p>
          <div className="mt-8 space-y-4 text-left">
            <LineField label="NOTA No" value={documentNumber} />
            <LineField label="Tanggal" value={formatDate(data.date)} />
            <LineField label="Kepada YTH" value={data.customerName} strong multiline />
          </div>
        </div>
      </div>

      <table className="nota-table mt-10">
        <thead>
          <tr>
            <th className="w-[110px]">BANYAKNYA</th>
            <th>NAMA MENU</th>
            <th className="w-[160px]">HARGA SATUAN</th>
            <th className="w-[150px]">JUMLAH</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            if (row.type === "delivery") {
              return (
                <tr key="delivery-fee">
                  <td />
                  <td className="text-left font-bold">Ongkir</td>
                  <td />
                  <td>{formatCurrency(deliveryFee)}</td>
                </tr>
              );
            }

            if (row.type === "item") {
              return (
                <tr key={row.item.id}>
                  <td>{row.item.quantity}</td>
                  <td className="text-left">{toCapitalCase(row.item.name)}</td>
                  <td>{row.item.price ? formatCurrency(toNumber(row.item.price)) : ""}</td>
                  <td>{itemLineTotal(row.item) > 0 ? formatCurrency(itemLineTotal(row.item)) : ""}</td>
                </tr>
              );
            }

            return (
              <tr key={`empty-${index}`}>
                <td />
                <td />
                <td />
                <td />
              </tr>
            );
          })}
          <tr className="total-row">
            <td colSpan={3}>TOTAL</td>
            <td>{formatCurrency(total)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-auto pt-12">
        <div>
          <p className="text-xl font-black text-[#0b2416]">{signatureLabel}</p>
          <div className="mt-20 h-px w-44 bg-[#123322]" />
        </div>
      </div>
    </div>
  );
});
NotaPreview.displayName = "NotaPreview";

const InvoicePreview = forwardRef<
  HTMLDivElement,
  { data: DocumentData; total: number; documentNumber: string; logoSrc: string }
>(({ data, total, documentNumber, logoSrc }, ref) => {
  const invoiceItems = data.items.filter(itemHasContent);

  return (
    <div ref={ref} className="document-paper invoice-paper">
      <div className="flex items-start justify-between gap-10">
        <LogoBlock compact logoSrc={logoSrc} />
        <div className="text-right">
          <p className="text-[54px] font-black tracking-[-0.04em] text-[#005d2e]">INVOICE</p>
          <p className="mt-2 text-[15px] font-semibold text-[#315c3d]">No. {documentNumber}</p>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-[1fr_340px] gap-8">
        <div className="rounded-[16px] border border-[#a6dba0] bg-[#f6fbf5] p-5">
          <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#238d48]">Bill to</p>
          <p className="mt-3 text-2xl font-black text-[#0b2416]">{data.customerName}</p>
          <p className="mt-4 max-w-xl text-[15px] leading-6 text-[#315c3d]">{businessProfile.closingNote}</p>
        </div>
        <div className="space-y-3 rounded-[16px] border border-[#a6dba0] p-5">
          <InvoiceMeta label="Tanggal" value={formatDate(data.date)} />
          <InvoiceMeta label="Total" value={formatCurrency(total)} strong />
          <InvoiceMeta label="Kontak" value={businessProfile.phone} />
        </div>
      </div>

      <table className="invoice-table mt-8">
        <thead>
          <tr>
            <th>Item</th>
            <th className="w-[110px]">Qty</th>
            <th className="w-[180px]">Harga</th>
            <th className="w-[180px]">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {invoiceItems.map((item) => (
            <tr key={item.id}>
              <td>{item.name ? toCapitalCase(item.name) : "Item"}</td>
              <td>{item.quantity}</td>
              <td>{item.price ? formatCurrency(toNumber(item.price)) : ""}</td>
              <td>{itemLineTotal(item) > 0 ? formatCurrency(itemLineTotal(item)) : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-auto grid grid-cols-[1fr_320px] gap-8 pt-8">
        <div className="rounded-[16px] bg-[#f6fbf5] p-5">
          <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#238d48]">Payment info</p>
          <p className="mt-3 text-[15px] leading-6 text-[#315c3d]">{businessProfile.paymentInfo}</p>
        </div>
        <div className="rounded-[16px] bg-[#005d2e] p-5 text-white">
          <div className="flex items-center justify-between border-b border-white/20 pb-3 text-[15px]">
            <span>Subtotal</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <div className="flex items-center justify-between pt-4 text-2xl font-black">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
});
InvoicePreview.displayName = "InvoicePreview";

function LineField({
  label,
  value,
  strong = false,
  multiline = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  multiline?: boolean;
}) {
  return (
    <div className={cn("grid grid-cols-[100px_minmax(0,1fr)] gap-3", multiline ? "items-start" : "items-end")}>
      <span className="text-[15px] font-semibold text-[#0b2416]">{label}</span>
      <span
        className={cn(
          "min-w-0 border-b-2 border-[#123322] px-2 pb-1 text-[15px] text-[#123322]",
          multiline ? "min-h-8 whitespace-normal break-words leading-6" : "min-h-8 whitespace-nowrap",
          strong && "font-black",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function InvoiceMeta({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#c9e9c3] pb-3 last:border-b-0 last:pb-0">
      <span className="text-[13px] font-semibold text-[#4e7258]">{label}</span>
      <span className={cn("text-right text-[15px] text-[#123322]", strong && "font-black text-[#005d2e]")}>
        {value}
      </span>
    </div>
  );
}

export default App;
