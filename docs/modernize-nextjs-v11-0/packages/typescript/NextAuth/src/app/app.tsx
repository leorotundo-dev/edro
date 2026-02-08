"use client";
import React, { useContext } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import RTL from "@/app/(DashboardLayout)/layout/shared/customizer/RTL";
import { ThemeSettings } from "@/utils/theme/Theme";
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import "@/utils/i18n";
import { CustomizerContext } from "./context/customizerContext";
import { AuthProvider } from '@/app/context/AuthContext'
import { SessionProvider } from "next-auth/react"


const MyApp = ({ children, session }: { children: React.ReactNode, session: any }) => {
    const theme = ThemeSettings();
    const { activeDir } = useContext(CustomizerContext);


    return (
        <>
            <SessionProvider session={session}>
                <AuthProvider>
                    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
                        <ThemeProvider theme={theme}>
                            <RTL direction={activeDir}>
                                <CssBaseline />
                                {children}
                            </RTL>
                        </ThemeProvider>
                    </AppRouterCacheProvider>
                </AuthProvider>
            </SessionProvider>

        </>
    );
};

export default MyApp;
