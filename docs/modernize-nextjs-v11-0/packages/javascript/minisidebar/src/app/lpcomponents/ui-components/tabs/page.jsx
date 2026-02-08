import * as React from "react";
import { Grid } from "@mui/material";
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import ParentCard from "@/app/components/shared/ParentCard";
import IconCode from "@/app/components/ui-components/tab/code/IconCode";
import IconWithLabelCode from "@/app/components/ui-components/tab/code/IconWithLabelCode";
import IconBottomCode from "@/app/components/ui-components/tab/code/IconBottomCode";
import IconLeftCode from "@/app/components/ui-components/tab/code/IconLeftCode";
import IconRightCode from "@/app/components/ui-components/tab/code/IconRightCode";
import ScrollableCode from "@/app/components/ui-components/tab/code/ScrollableCode";
import VerticalCode from "@/app/components/ui-components/tab/code/VerticalCode";
import TextCode from "@/app/components/ui-components/tab/code/TextCode";

const BCrumb = [
  {
    to: "/",
    title: "Dashboard",
  },
  {
    title: "Tabs",
  },
];

const MuiTabs = () => {
  return (
    <PageContainer title="Tabs" description="this is Tabs page">
      {/* breadcrumb */}
      <Breadcrumb title="Tabs" items={BCrumb} />
      {/* end breadcrumb */}
      <ParentCard title="Tabs">
        <Grid container spacing={3}>
          {/* ---------------------------------------------------------------------------------- */}
          {/* Text */}
          {/* ---------------------------------------------------------------------------------- */}
          <Grid display="flex" alignItems="stretch" size={12}>
            <TextCode />
          </Grid>
          {/* ---------------------------------------------------------------------------------- */}
          {/* Icon */}
          {/* ---------------------------------------------------------------------------------- */}
          <Grid display="flex" alignItems="stretch" size={12}>
            <IconCode />
          </Grid>
          {/* ---------------------------------------------------------------------------------- */}
          {/* Icon with Label */}
          {/* ---------------------------------------------------------------------------------- */}
          <Grid display="flex" alignItems="stretch" size={12}>
            <IconWithLabelCode />
          </Grid>
          {/* ---------------------------------------------------------------------------------- */}
          {/* Icon Bottom */}
          {/* ---------------------------------------------------------------------------------- */}
          <Grid display="flex" alignItems="stretch" size={12}>
            <IconBottomCode />
          </Grid>
          {/* ---------------------------------------------------------------------------------- */}
          {/* Icon Left */}
          {/* ---------------------------------------------------------------------------------- */}
          <Grid display="flex" alignItems="stretch" size={12}>
            <IconLeftCode />
          </Grid>
          {/* ---------------------------------------------------------------------------------- */}
          {/* Icon Right */}
          {/* ---------------------------------------------------------------------------------- */}
          <Grid display="flex" alignItems="stretch" size={12}>
            <IconRightCode />
          </Grid>
          {/* ---------------------------------------------------------------------------------- */}
          {/* Scrollable  */}
          {/* ---------------------------------------------------------------------------------- */}
          <Grid display="flex" alignItems="stretch" size={12}>
            <ScrollableCode />
          </Grid>
          {/* ---------------------------------------------------------------------------------- */}
          {/* Vertical */}
          {/* ---------------------------------------------------------------------------------- */}
          <Grid display="flex" alignItems="stretch" size={12}>
            <VerticalCode />
          </Grid>
        </Grid>
      </ParentCard>
    </PageContainer>
  );
};
export default MuiTabs;
