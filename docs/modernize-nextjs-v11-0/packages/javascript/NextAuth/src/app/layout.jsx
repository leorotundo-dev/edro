import React from "react";
import MyApp from "./app";
import { CustomizerContextProvider } from "./context/customizerContext";
import NextTopLoader from 'nextjs-toploader';

export const metadata = {
  title: "Modernize Demo",
  description: "Modernize kit",
};

export default function RootLayout({
  children,
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <NextTopLoader color="#5D87FF" />
        <CustomizerContextProvider>
          <MyApp session={undefined}>{children}</MyApp>
        </CustomizerContextProvider>
      </body>
    </html>
  );
}
