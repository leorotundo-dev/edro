import * as React from "react";
import { Grid } from "@mui/material";
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import ParentCard from "@/app/components/shared/ParentCard";
import BasicCode from "@/app/components/ui-components/accordion/code/BasicCode";
import ControlledCode from "@/app/components/ui-components/accordion/code/ControlledCode";

const BCrumb = [
  {
    to: "/",
    title: "Dashboard",
  },
  {
    title: "Accordion",
  },
];

const MuiAccordion = () => {
  return (
    <PageContainer title="Accordion" description="this is Accordion page">
      {/* breadcrumb */}
      <Breadcrumb title="Accordion" items={BCrumb} />
      {/* end breadcrumb */}
      <ParentCard title="Accordion">
        <Grid container spacing={3}>
          <Grid display="flex" alignItems="stretch" size={12}>
            <BasicCode />
          </Grid>
          <Grid display="flex" alignItems="stretch" size={12}>
            <ControlledCode />
          </Grid>
        </Grid>
      </ParentCard>
    </PageContainer>
  );
};
export default MuiAccordion;
