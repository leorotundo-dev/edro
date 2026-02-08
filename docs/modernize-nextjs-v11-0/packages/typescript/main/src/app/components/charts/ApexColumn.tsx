"use client";

import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import { useTheme } from "@mui/material/styles";
import ChildCard from "@/app/components/shared/ChildCard";
import React from "react";
import ColumnChartCode from "./code/ColumnChartCode";
import { ApexOptions } from "apexcharts";

const ApexColumn = () => {
  // chart color
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const secondary = theme.palette.secondary.main;
  const error = theme.palette.error.main;

  const optionscolumnchart: ApexOptions = {
    chart: {
      id: "column-chart",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      foreColor: "#adb0bb",
      toolbar: {
        show: false,
      },
    },
    colors: [primary, secondary, error],
    plotOptions: {
      bar: {
        horizontal: false,

        columnWidth: "20%",
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 2,
      colors: ["transparent"],
    },
    xaxis: {
      categories: [
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
      ],
    },
    yaxis: {
      title: {
        text: "$ (thousands)",
      },
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      y: {
        formatter(val) {
          return `$ ${val} thousands`;
        },
      },
      theme: "dark",
    },
    grid: {
      show: false,
    },
    legend: {
      show: true,
      position: "bottom",

    },
  };
  const seriescolumnchart = [
    {
      name: "Desktop",
      data: [44, 55, 57, 56, 61, 58, 63, 60, 66],
    },
    {
      name: "Mobile",
      data: [76, 85, 101, 98, 87, 105, 91, 114, 94],
    },
    {
      name: "Other",
      data: [35, 41, 36, 26, 45, 48, 52, 53, 41],
    },
  ];

  return (
    <ChildCard title="Column Chart" codeModel={<ColumnChartCode />}>
      <Chart
        options={optionscolumnchart}
        series={seriescolumnchart}
        type="bar"
        height="300px"
        width={"100%"}
      />
    </ChildCard>
  );
};

export default ApexColumn;
