"use client";
import * as React from "react";
import { PieChart } from "@mui/x-charts/PieChart";
import ChildCard from "@/app/components/shared/ChildCard";
import { useTheme } from "@mui/material";
import BasicPieCode from "../code/piechartcode/BasicPieCode";

export default function BasicPieChart() {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const secondary = theme.palette.secondary.main;
  const Datacolor = theme.palette.error.main;
  return (
    <ChildCard title="Basic Chart" codeModel={<BasicPieCode />}>
      <PieChart
        series={[
          {
            data: [
              { id: 0, value: 10, label: "series A", color: primary },
              { id: 1, value: 15, label: "series B", color: secondary },
              { id: 2, value: 20, label: "series C", color: Datacolor },
            ],
          },
        ]}
        height={300}
      />
    </ChildCard>
  );
}
