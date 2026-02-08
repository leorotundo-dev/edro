import React from "react";
import { Grid, Stack, Button, Alert, AlertTitle } from "@mui/material";
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import ParentCard from "@/app/components/shared/ParentCard";

import FilledCode from "@/app/components/ui-components/alert/code/FilledCode";
import OutlinedCode from "@/app/components/ui-components/alert/code/OutlinedCode";
import DescriptionCode from "@/app/components/ui-components/alert/code/DescriptionCode";
import ActionCode from "@/app/components/ui-components/alert/code/ActionCode";
import TransitionCode from "@/app/components/ui-components/dialog/code/TransitionCode";









const BCrumb = [
  {
    to: "/",
    title: "Dashboard",
  },
  {
    title: "Alert",
  },
];

const ExAlert = () => {
  return (
    (<PageContainer title="Alert" description="this is Alert page">
      {/* breadcrumb */}
      <Breadcrumb title="Alert" items={BCrumb} />
      {/* end breadcrumb */}
      {/* ------------------------- row 1 ------------------------- */}
      <ParentCard title="Alert">
        <Grid container spacing={3}>
          {/* --------------------------------------------------------------------------------- */}
          {/* Filled Alert */}
          {/* --------------------------------------------------------------------------------- */}
          <Grid display="flex" alignItems="stretch" size={12}>

            <FilledCode />

          </Grid>
          {/* --------------------------------------------------------------------------------- */}
          {/* Outlined Alert */}
          {/* --------------------------------------------------------------------------------- */}
          <Grid display="flex" alignItems="stretch" size={12}>

            <OutlinedCode />

          </Grid>
          {/* --------------------------------------------------------------------------------- */}
          {/* Description Alert */}
          {/* --------------------------------------------------------------------------------- */}
          <Grid display="flex" alignItems="stretch" size={12}>

            <DescriptionCode />

          </Grid>
          {/* --------------------------------------------------------------------------------- */}
          {/* Action Alert */}
          {/* --------------------------------------------------------------------------------- */}
          <Grid display="flex" alignItems="stretch" size={12}>

            <ActionCode />


          </Grid>
          {/* --------------------------------------------------------------------------------- */}
          {/* Transition Alert */}
          {/* --------------------------------------------------------------------------------- */}
          <Grid display="flex" alignItems="stretch" size={12}>

            <TransitionCode />

          </Grid>
        </Grid>
      </ParentCard>
    </PageContainer >)
  );
};

export default ExAlert;
