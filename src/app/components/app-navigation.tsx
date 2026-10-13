import "./app-navigation.css";

import { NavLink } from "react-router";
import { useRef } from "react";

import { appNavigationItems } from "@/app/router/navigation";
import { Icon } from "@/shared/ui";
import { Tooltip } from "@/shared/ui";

interface AppNavigationProps {
  collapsed?: boolean;
}

const NavigationItem = ({
  item,
  collapsed,
}: {
  item: (typeof appNavigationItems)[number];
  collapsed: boolean;
}) => {
  const linkRef = useRef<HTMLAnchorElement>(null);

  return (
    <li className="app-navigation__item" key={item.id}>
      <NavLink className="app-navigation__link" end ref={linkRef} to={item.to}>
        <Icon name={item.icon} size="sm" />
        <span
          className={
            collapsed
              ? "app-navigation__label app-navigation__label--visually-hidden"
              : "app-navigation__label"
          }
        >
          {item.label}
        </span>
      </NavLink>
      {collapsed ? <Tooltip content={item.label} position="right" targetRef={linkRef} /> : null}
    </li>
  );
};

export const AppNavigation = ({ collapsed = false }: AppNavigationProps) => (
  <nav aria-label="Navegación principal" className="app-navigation" data-collapsed={collapsed}>
    <ul className="app-navigation__list">
      {appNavigationItems.map((item) => (
        <NavigationItem collapsed={collapsed} item={item} key={item.id} />
      ))}
    </ul>
  </nav>
);
