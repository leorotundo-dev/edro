"use client";
import React, { useState } from "react";
import LpHeader from "../components/landingpage/header/Header";
import {
  Box,
  Button,
  Container,
  Drawer,
  IconButton,
  Theme,
  useMediaQuery,
} from "@mui/material";
import Footer from "../components/landingpage/footer/Footer";

import Sidebar from "../components/lp-components/Sidebar";
import { IconMenu2 } from "@tabler/icons-react";

function ComponentLayout({ children }: { children: React.ReactNode }) {
  // const isMobile = useMediaQuery('(max-width:1000px)');
  const isMobile = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down(1000)
  );

  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
      }}
    >
      {/* HEADER */}
      <LpHeader />

      {/* MAIN PAGE LAYOUT */}
      <Container
        maxWidth="lg"
        sx={{
          display: "flex",
          flexDirection: {
            xs: "column",
            sm: "column",
            md: isMobile ? "column" : "row",
          },
          flex: 1,
          gap: 4,
          flexGrow: 1,
          py: 2,
        }}
      >
        {/* Show toggle button on small screens */}
        {isMobile && (
          <Box
            sx={{
              width: "100%",
              bgcolor: (theme) => theme.palette.primary.light,
              py: 1.5,
              px: 2,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              m: "auto",
            }}
          >
            <Button
              variant="contained"
              color="primary"
              onClick={handleDrawerToggle}
              startIcon={<IconMenu2 />}
            >
              Show Sidebar
            </Button>
          </Box>
        )}

        {!isMobile && <Sidebar />}

        {/* MAIN CONTENT WRAPPER */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: "100%",
            mt: 3,
          }}
        >
          {/* CONTENT AREA */}
          <Box sx={{ flex: 1 }}>{children}</Box>
        </Box>
      </Container>

      {/* Drawer for mobile sidebar */}
      <Drawer
        variant="temporary"
        anchor="left"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        slotProps={{
          paper: {
            sx: {
              width: 270,
              border: "0 !important",
              boxShadow: (theme) => theme.shadows[8],
            },
          },
        }}
      >
        <Sidebar />
      </Drawer>

      {/* FOOTER */}
      <Footer />
    </Box>
  );
}

export default ComponentLayout;

ComponentLayout.layout = "Blank";
