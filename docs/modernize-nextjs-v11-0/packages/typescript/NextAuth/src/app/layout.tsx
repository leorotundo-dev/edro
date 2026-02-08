import React from "react";
import MyApp from "./app";
import { CustomizerContextProvider } from "./context/customizerContext";

import "./global.css";

export const metadata = {
  title: "Modernize Demo",
  description: "Modernize kit",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <CustomizerContextProvider>
          <MyApp session={undefined}>{children}</MyApp>
        </CustomizerContextProvider>
      </body>
    </html>
  );
}
