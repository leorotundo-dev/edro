"use client";
import { Grid } from "@mui/material";

// common component
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import ParentCard from "@/app/components/shared/ParentCard";

import TooltipArrow from "@/app/components/ui-components/tooltip/TooltipArrow";
import TooltipPosition from "@/app/components/ui-components/tooltip/TooltipPosition";
import TooltipSimple from "@/app/components/ui-components/tooltip/TooltipSimple";
import TooltipTransition from "@/app/components/ui-components/tooltip/TooltipTransition";
import TooltipVariableWidth from "@/app/components/ui-components/tooltip/TooltipVariableWidth";

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "Tooltip",
  },
];

const MuiTooltip = () => (
  <PageContainer title="Tooltip" description="this is Tooltip">
    {/* breadcrumb */}
    <Breadcrumb title="Tooltip" items={BCrumb} />
    {/* end breadcrumb */}

    <ParentCard title="Tooltip">
      <Grid container spacing={3}>
        <Grid
          display="flex"
          alignItems="stretch"
          size={{
            xs: 12,
            sm: 6
          }}>
          <TooltipSimple />
        </Grid>
        <Grid
          display="flex"
          alignItems="stretch"
          size={{
            xs: 12,
            sm: 6
          }}>
          <TooltipArrow />
        </Grid>

        <Grid
          display="flex"
          alignItems="stretch"
          size={{
            xs: 12,
            sm: 6
          }}>
          <TooltipVariableWidth />
        </Grid>

        <Grid
          display="flex"
          alignItems="stretch"
          size={{
            xs: 12,
            sm: 6
          }}>
          <TooltipTransition />
        </Grid>
        <Grid display="flex" alignItems="stretch" size={12}>
          <TooltipPosition />
        </Grid>
      </Grid>
    </ParentCard>
  </PageContainer>
);
export default MuiTooltip;
