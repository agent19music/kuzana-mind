import NextLink from "next/link";

import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "primary-dark"
  | "secondary"
  | "ghost"
  | "accent"
  | "accent-solid"
  | "destructive"
  | "destructive-subtle";

export type ButtonSize = "default" | "sm" | "lg" | "icon" | "icon-sm";

interface ButtonOwnProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Pill radius (border-radius: 9999px) — e.g. chat's "New chat" / "Ask". */
  full?: boolean;
  className?: string;
}

type ButtonAsButton = ButtonOwnProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonOwnProps> & { href?: undefined };

type ButtonAsAnchor = ButtonOwnProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonOwnProps> & { href: string };

export type ButtonProps = ButtonAsButton | ButtonAsAnchor;

const SIZE_CLASS: Record<ButtonSize, string> = {
  default: "",
  sm: "btn-sm",
  lg: "btn-lg",
  icon: "btn-icon",
  "icon-sm": "btn-icon btn-sm",
};

// An in-app route ("/admin/connections") should still get Next's client-side
// transition + prefetch; only genuinely external targets (mailto:, tel:,
// http(s)://, #fragments) need a plain <a>.
function isInternalHref(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

// The one implementation of the .btn design system (globals.css) — variant +
// size map straight to the canonical classes instead of every call site
// hand-typing className strings. Renders a Next <Link> for in-app hrefs, a
// plain <a> for external ones, and a <button> when no href is passed at all —
// so it drops into "Save changes", "Manage connections", and "Contact sales"
// call sites alike.
export function Button({ variant = "primary", size = "default", full, className, ...props }: ButtonProps) {
  const classes = cn("btn", `btn-${variant}`, SIZE_CLASS[size], full && "btn-full", className);

  if (props.href !== undefined) {
    const anchorProps = props as React.AnchorHTMLAttributes<HTMLAnchorElement>;
    if (isInternalHref(props.href)) {
      return <NextLink className={classes} {...anchorProps} href={props.href} />;
    }
    return <a className={classes} {...anchorProps} />;
  }
  return <button className={classes} {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)} />;
}
