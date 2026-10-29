import { DeskShell } from "@/prototype/DeskShell";

/** The desktop dashboard's frame: full width, for people managing many problems (north star, document 8). */
export default function DeskLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <DeskShell>{children}</DeskShell>;
}
