import "./app-navigation.css";

import { NavLink, useMatch } from "react-router";
import { useRef } from "react";
import type { MouseEvent } from "react";

import { appNavigationItems } from "@/app/router/navigation";
import { Icon } from "@/shared/ui";
import { Tooltip } from "@/shared/ui";

interface AppNavigationProps {
  collapsed?: boolean;
  onSelect?: (isCurrentPage: boolean) => void;
}

const NavigationItem = ({
  item,
  collapsed,
  onSelect,
}: {
  item: (typeof appNavigationItems)[number];
  collapsed: boolean;
  onSelect?: (isCurrentPage: boolean) => void;
}) => {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const isCurrentPage = useMatch({ end: true, path: item.to }) !== null;

  const handleSelect = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      !onSelect ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return;
    }

    onSelect(isCurrentPage);
    if (isCurrentPage) {
      event.preventDefault();
    }
  };

  return (
    <li className="app-navigation__item" key={item.id}>
      <NavLink
        className="app-navigation__link"
        end
        onClick={handleSelect}
        ref={linkRef}
        to={item.to}
      >
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

export const AppNavigation = ({ collapsed = false, onSelect }: AppNavigationProps) => (
  <nav aria-label="Navegación principal" className="app-navigation" data-collapsed={collapsed}>
    <ul className="app-navigation__list">
      {appNavigationItems.map((item) => (
        <NavigationItem collapsed={collapsed} item={item} key={item.id} onSelect={onSelect} />
      ))}
    </ul>
  </nav>
);
