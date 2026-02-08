import { Grid } from "@mui/material";
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import ParentCard from "@/app/components/shared/ParentCard";
import SimpleTooltipCode from "@/app/components/ui-components/tooltip/code/SimpleTooltipCode";
import ArrowTooltipCode from "@/app/components/ui-components/tooltip/code/ArrowTooltipCode";
import VariableWidthCode from "@/app/components/ui-components/tooltip/code/VariableWidthCode";
import TransitionsCode from "@/app/components/ui-components/tooltip/code/TransitionsCode";
import PositionsTooltipCode from "@/app/components/ui-components/tooltip/code/PositionsTooltipCode";

const BCrumb = [
  {
    to: "/",
    title: "Dashboard",
  },
  {
    title: "Tooltip",
  },
];

const MuiTooltip = () => (
  <PageContainer title="Tooltip" description="this is Tooltip page">
    {/* breadcrumb */}
    <Breadcrumb title="Tooltip" items={BCrumb} />
    {/* end breadcrumb */}

    <ParentCard title="Tooltip">
      <Grid container spacing={3}>
        <Grid display="flex" alignItems="stretch" size={12}>
          <SimpleTooltipCode />
        </Grid>
        <Grid display="flex" alignItems="stretch" size={12}>
          <ArrowTooltipCode />
        </Grid>
        <Grid display="flex" alignItems="stretch" size={12}>
          <VariableWidthCode />
        </Grid>
        <Grid display="flex" alignItems="stretch" size={12}>
          <TransitionsCode />
        </Grid>
        <Grid display="flex" alignItems="stretch" size={12}>
          <PositionsTooltipCode />
        </Grid>
      </Grid>
    </ParentCard>
  </PageContainer>
);
export default MuiTooltip;
