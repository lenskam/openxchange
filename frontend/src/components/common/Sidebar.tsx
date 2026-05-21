import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { name: "Dashboard", path: "/dashboard", icon: "dashboard" },
  { name: "Connections", path: "/connections", icon: "hub" },
  { name: "Workflows", path: "/workflows", icon: "account_tree" },
  { name: "Transactions", path: "/transactions", icon: "swap_horiz" },
  { name: "Channels", path: "/channels", icon: "settings_input_component" },
  { name: "Mappings", path: "/mappings", icon: "transform" },
  { name: "Users", path: "/users", icon: "group" },
  { name: "Audit Log", path: "/audit-log", icon: "history_edu" },
  { name: "Settings", path: "/settings", icon: "settings" },
];

const footerItems = [
  { name: "System Health", icon: "health_and_safety" },
  { name: "Documentation", icon: "menu_book" },
];

interface SidebarProps {
  open: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ open }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside
      className={`fixed left-0 top-0 h-full flex flex-col py-8 gap-base bg-surface-container-low dark:bg-inverse-surface border-r border-outline-variant dark:border-outline w-64 z-50 transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-64"}`}
    >
      <div className="px-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-on-primary">
            <span className="material-symbols-outlined">hub</span>
          </div>
          <div>
            <h1 className="text-headline-md font-headline-md font-bold text-primary dark:text-primary-fixed-dim">
              InterExchange
            </h1>
            <p className="text-label-md font-label-md text-on-surface-variant/70">
              Data Integration Platform
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.name}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-all text-left ${
                isActive
                  ? "bg-secondary-container dark:bg-on-secondary-fixed-variant text-on-secondary-container dark:text-secondary-fixed font-bold scale-[0.98]"
                  : "text-on-surface-variant dark:text-surface-variant hover:bg-surface-container-highest dark:hover:bg-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined mr-3 text-[20px]">
                {item.icon}
              </span>
              <span className="text-label-md font-label-md">{item.name}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-4 mt-auto border-t border-outline-variant pt-6 space-y-1">
        {footerItems.map((item) => (
          <button
            key={item.name}
            className="w-full flex items-center px-4 py-2 rounded-lg text-on-surface-variant dark:text-surface-variant hover:bg-surface-container-highest dark:hover:bg-surface-variant transition-colors text-left"
          >
            <span className="material-symbols-outlined mr-3 text-[20px]">
              {item.icon}
            </span>
            <span className="text-label-md font-label-md">{item.name}</span>
          </button>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
