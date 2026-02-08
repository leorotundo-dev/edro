'use client'

import PageContainer from "@/app/components/container/PageContainer";
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import React from "react";
import Grid from '@mui/material/Grid';
import BasicGaugesChart from "@/app/components/muicharts/gaugecharts/BasicGaugesChart";
import ArcDesignChart from "@/app/components/muicharts/gaugecharts/ArcDesignChart";
import GaugePointerChart from "@/app/components/muicharts/gaugecharts/GaugePointerChart";

const BCrumb = [
    {
        to: "/",
        title: "Home",
    },
    {
        title: "GaugeCharts ",
    },
];

const GaugeCharts = () => {
    return (
        <PageContainer title="GaugeCharts" description="this is GaugeCharts ">

            <Breadcrumb title="GaugeCharts" items={BCrumb} />
            <Grid container spacing={3}>
                <Grid
                    size={{
                        md: 6
                    }}
                >
                    <BasicGaugesChart />
                </Grid>
                <Grid
                    size={{
                        md: 6
                    }}
                >

                    <ArcDesignChart />
                </Grid>
                <Grid
                    size={{
                        md: 6
                    }}
                >

                    <GaugePointerChart />
                </Grid>


            </Grid>
        </PageContainer>
    );
};

export default GaugeCharts;
