"use client";

import NavGroup from "@/app/(DashboardLayout)/layout/vertical/sidebar/NavGroup/NavGroup";
import NavItem from "@/app/(DashboardLayout)/layout/vertical/sidebar/NavItem";
import { CustomizerContext } from "@/app/context/customizerContext";
import {
  List,
  Box,
  Divider,
  useMediaQuery,
  useTheme,
  TextField,
  InputAdornment,
} from "@mui/material";

import { useContext, useState } from "react";
import Scrollbar from "../custom-scroll/Scrollbar";

import Menuitems from "./MenuData";

import { usePathname } from "next/navigation";
import { IconSearch } from "@tabler/icons-react";

const Sidebar = () => {
  const theme = useTheme();
  const lgUp = useMediaQuery(theme.breakpoints.up("lg"));

  const isMobile = useMediaQuery("(max-width:1000px)");

  const [searchText, setsearchText] = useState("");

  const pathname = usePathname();

  const pathDirect = pathname;

  const {
    isCollapse,
    isSidebarHover,

    isMobileSidebar,
    setIsMobileSidebar,
  } = useContext(CustomizerContext);

  const hideMenu = lgUp
    ? isCollapse == "mini-sidebar" && !isSidebarHover
    : "";

  const handleSearchChange = (e) => {
    setsearchText(e.target.value.toLowerCase());
  };

  // Filter menu: only match items with `title` when search is active
  const filteredMenuItems = searchText
    ? Menuitems.filter(
      (item) => item.title && item.title.toLowerCase().includes(searchText)
    )
    : Menuitems; // if no search

  return (
    <Box
      sx={{
        width: 270,
        height: isMobile ? "100%" : "100vh",
        position: isMobile ? "relative" : "sticky",
        top: isMobile ? "auto" : 0,
        display: "flex",
        flexDirection: "column",
        bgcolor: theme.palette.background.paper,

        mt: isMobile ? 0 : 3,
        boxSizing: "border-box",
        boxShadow: (theme) => theme.shadows[8],
      }}
    >
      {/* Search stays on top */}
      <Box p={2}>
        <TextField
          id="outlined-search"
          placeholder="Search..."
          size="small"
          type="search"
          variant="outlined"
          value={searchText}
          fullWidth
          onChange={handleSearchChange}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <IconSearch size={16} />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      {/* Scrollable content */}

      <Box sx={{ flex: 1, overflowY: "auto" }}>
        <Scrollbar sx={{ height: "100%" }}>
          <Box sx={{ px: 2 }}>
            <List className="sidebarNav" sx={{ pt: 0 }}>
              {filteredMenuItems.map((item, index) => {
                if (item.subheader) {
                  return (
                    <NavGroup
                      item={item}
                      hideMenu={hideMenu}
                      key={item.subheader}
                    />
                  );
                } else if (item.divider) {
                  return <Divider key={`divider-${index}`} sx={{ my: 2 }} />;
                } else {
                  return (
                    <NavItem
                      item={item}
                      key={item.id}
                      pathDirect={pathDirect}
                      hideMenu={hideMenu}
                      onClick={() => setIsMobileSidebar(!isMobileSidebar)}
                    />
                  );
                }
              })}
            </List>
          </Box>
        </Scrollbar>
      </Box>
    </Box>
  );
};

export default Sidebar;
