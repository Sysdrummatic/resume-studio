import type { AnchorHTMLAttributes, ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

export interface MenuProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
}

export function Menu({ label, className, ...props }: MenuProps) {
  return <div role="group" aria-label={label} className={cx("ocv-menu", className)} {...props} />;
}

interface MenuItemBase {
  tone?: "default" | "danger";
  children: ReactNode;
}

type MenuLinkProps = MenuItemBase & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };
type MenuButtonProps = MenuItemBase & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

export type MenuItemProps = MenuLinkProps | MenuButtonProps;

export function MenuItem(props: MenuItemProps) {
  const { tone = "default", className, ...rest } = props;
  const classes = cx("ocv-menu__item", tone === "danger" && "ocv-menu__item--danger", className);

  if (typeof rest.href === "string") {
    return <a className={classes} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)} />;
  }

  const { type = "button", ...button } = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return <button type={type} className={classes} {...button} />;
}
