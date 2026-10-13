import "./app-navigation.css";

import { NavLink } from "react-router";

import { appNavigationItems } from "@/app/router/navigation";
import { Icon } from "@/shared/ui";

export const AppNavigation = () => (
  <nav aria-label="Navegación principal" className="app-navigation">
    <ul className="app-navigation__list">
      {appNavigationItems.map((item) => (
        <li className="app-navigation__item" key={item.id}>
          <NavLink className="app-navigation__link" end to={item.to}>
            <Icon name={item.icon} size="sm" />
            <span>{item.label}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  </nav>
);
