/**
 * Clamour's icon set (brand kit: Iconography). One icon per meaning, named for the meaning, so the
 * same idea always looks the same wherever it appears.
 *
 * Drawing rules, applied to every glyph here:
 * - Lucide outlines on a 24px grid, plus `fix`, the spanner drawn from the spanner C.
 * - Three sizes: 16 (status tags and small print), 20 (beside text: buttons, rows), 24 (on their own:
 *   navigation, evidence tiles, safety banners).
 * - The stroke stays the same on screen whatever the size, matching the 2px edges of controls: 2px at
 *   20 and 24, 1.75px at 16 so small glyphs don't clog.
 * - Square ends and mitred corners, echoing the mark's square handle and its 120° jaw.
 * - Icons take the colour of the words beside them, and always sit beside a word. An icon on its own
 *   (close, settings in the frame) is a button with an aria-label.
 */

import {
  Bell,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Copy,
  DoorOpen,
  Download,
  Ellipsis,
  FileText,
  House,
  Flag,
  Folder,
  Gauge,
  Image,
  Images,
  LayoutDashboard,
  LogOut,
  Mail,
  Mailbox,
  Megaphone,
  MessageCircle,
  MessageSquareText,
  MessagesSquare,
  NotebookPen,
  Phone,
  Plus,
  Printer,
  ReceiptPoundSterling,
  RotateCcw,
  Settings,
  Share,
  ShieldCheck,
  Sparkles,
  Trash2,
  TriangleAlert,
  Users,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";

/** The spanner, head up and to the right with its jaw open, handle ending in the mark's 120° point. */
const FIX_PATH =
  "M10.45 10.02L3.19 17.27L3.94 20.06L6.73 20.81L13.98 13.55A5.5 5.5 0 0 0 20.98 6.87L17.95 9.91L14.89 9.11L14.09 6.05L17.13 3.02A5.5 5.5 0 0 0 10.45 10.02Z";

type BrandGlyph = { path: string };

const ICONS = {
  // Getting around
  back: ChevronLeft,
  forward: ChevronRight,
  expand: ChevronDown,
  close: X,
  more: Ellipsis,
  home: House,
  problems: ClipboardList,
  members: Users,
  settings: Settings,
  dashboard: LayoutDashboard,

  // Doing things
  add: Plus,
  camera: Camera,
  photos: Images,
  video: Video,
  share: Share,
  copy: Copy,
  download: Download,
  print: Printer,
  ai: Sparkles,
  ask: Bell,
  signOut: LogOut,
  delete: Trash2,
  reopen: RotateCcw,
  fix: { path: FIX_PATH },
  done: Check,
  warning: TriangleAlert,

  // What's on the record
  logged: Flag,
  update: NotebookPen,
  screenshot: Image,
  email: Mail,
  letter: FileText,
  post: Mailbox,
  call: Phone,
  text: MessageSquareText,
  whatsapp: MessageCircle,
  chatExport: MessagesSquare,
  reading: Gauge,
  receipt: ReceiptPoundSterling,
  contact: Megaphone,
  visit: DoorOpen,
  verified: ShieldCheck,
  due: Clock,
  caseFile: Folder,
} satisfies Record<string, LucideIcon | BrandGlyph>;

export type IconName = keyof typeof ICONS;
export type IconSize = 16 | 20 | 24;
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

/** On-screen stroke in pixels for each size. */
const STROKE: Record<IconSize, number> = { 16: 1.75, 20: 2, 24: 2 };

export function Icon({ name, size = 20, className }: { name: IconName; size?: IconSize; className?: string }) {
  const glyph = ICONS[name];
  const stroke = STROKE[size];
  const cls = `flex-none ${className ?? ""}`;
  if ("path" in glyph) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={(stroke * 24) / size}
        strokeLinecap="square"
        strokeLinejoin="miter"
        aria-hidden="true"
        focusable="false"
        className={cls}
      >
        <path d={glyph.path} />
      </svg>
    );
  }
  const Glyph = glyph;
  return (
    <Glyph
      size={size}
      strokeWidth={stroke}
      absoluteStrokeWidth
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      className={cls}
    />
  );
}
