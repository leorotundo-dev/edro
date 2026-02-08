"use client";

import PageContainer from "@/app/components/container/PageContainer";
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import React from "react";
import Grid from '@mui/material/Grid';
import MultiSelectTreeView from "@/app/components/muitrees/simpletree/MultiSelectTreeView";
import CheckboxSelection from "@/app/components/muitrees/simpletree/CheckboxSelection";
import ControlledSelectiontree from "@/app/components/muitrees/simpletree/ControlledSelectiontree";

const BCrumb = [
    {
        to: "/",
        title: "Home",
    },
    {
        title: "SimpleTreeView ",
    },
];

const SimpleTreeView = () => {
    return (
        <PageContainer title="SimpleTreeView" description="this is SimpleTreeView ">
            <Breadcrumb title="SimpleTreeView" items={BCrumb} />
            <Grid container spacing={3}>

                <MultiSelectTreeView />


                <CheckboxSelection />


                <ControlledSelectiontree />


            </Grid>
        </PageContainer>
    );
};

export default SimpleTreeView;
