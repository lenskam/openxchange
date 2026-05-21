import { useState } from "react";
import { Menu, MenuItem } from "@mui/material";
import { useAuth } from "../../features/auth/AuthContext";
import { useNavigate } from "react-router-dom";

interface TopBarProps {
  onMenuClick: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleLogout = async () => {
    setAnchorEl(null);
    await logout();
    navigate("/login");
  };

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <header className="h-16 sticky top-0 z-40 bg-surface dark:bg-inverse-surface border-b border-outline-variant dark:border-outline flex justify-between items-center px-margin-desktop shadow-sm dark:shadow-none">
      <div className="flex items-center flex-1 max-w-xl">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-60">
            search
          </span>
          <input
            className="w-full bg-surface-container-low border-none rounded-full pl-10 pr-4 py-2 text-body-md font-body-md focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-on-surface-variant/60"
            placeholder="Search data, workflows, or logs..."
            type="text"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors">
          <span className="material-symbols-outlined">help_outline</span>
        </button>
        <div className="h-8 w-[1px] bg-outline-variant mx-2" />
        <button
          onClick={(e) => setAnchorEl(e.currentTarget)}
          className="flex items-center gap-3 cursor-pointer hover:bg-surface-container-high p-1 rounded-full pr-4 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-primary-fixed-dim flex items-center justify-center text-on-primary-fixed font-bold border border-outline-variant">
            {initials}
          </div>
          <span className="text-label-md font-label-md text-on-surface hidden sm:block">
            {user?.full_name || "User"}
          </span>
        </button>
      </div>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { borderRadius: 2, mt: 1, minWidth: 160 } } }}
      >
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            navigate("/settings");
          }}
        >
          Profile
        </MenuItem>
        <MenuItem onClick={handleLogout}>Logout</MenuItem>
      </Menu>
    </header>
  );
};

export default TopBar;
