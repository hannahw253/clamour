import { PhoneShell } from "@/prototype/PhoneShell";

/**
 * The phone layout. On a wide screen the same screens sit in the desktop frame instead, unless
 * "Phone view" is chosen, so interviews can still show the phone on a laptop.
 */
export default function PhoneLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <PhoneShell>{children}</PhoneShell>;
}
