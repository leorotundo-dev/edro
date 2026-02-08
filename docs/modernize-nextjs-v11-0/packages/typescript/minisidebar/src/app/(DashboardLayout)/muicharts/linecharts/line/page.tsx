import PageContainer from "@/app/components/container/PageContainer";
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import React from "react";
import Grid from '@mui/material/Grid';
import SimpleLineChart from "@/app/components/muicharts/linescharts/linechart/SimpleLineChart";
import TinyLineChart from "@/app/components/muicharts/linescharts/linechart/TinyLineChart";
import DashedLineChart from "@/app/components/muicharts/linescharts/linechart/DashedLineChart";
import BiaxialLineChart from "@/app/components/muicharts/linescharts/linechart/BiaxialLineChart";
import LineChartWithReferenceLines from "@/app/components/muicharts/linescharts/linechart/LineChartWithReferenceLinesChart";
import LinewithforecastChart from "@/app/components/muicharts/linescharts/linechart/LinewithforecastChart";

const BCrumb = [
    {
        to: "/",
        title: "Home",
    },
    {
        title: "Mui Line Charts",
    },
];

const LineChart = () => {
    return (
        <PageContainer title="Mui Line Chart" description="this is Mui Line Chart">
            <Breadcrumb title="Mui Line  Chart" items={BCrumb} />
            <Grid container spacing={3}>

                <SimpleLineChart />


                <TinyLineChart />


                <DashedLineChart />


                <BiaxialLineChart />


                <LineChartWithReferenceLines />


                <LinewithforecastChart />


            </Grid>
        </PageContainer>
    );
};

export default LineChart;
