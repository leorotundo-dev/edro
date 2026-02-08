import { Grid } from "@mui/material";
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import ParentCard from "@/app/components/shared/ParentCard";

import HoverPopoverCode from "@/app/components/ui-components/popover/code/HoverPopoverCode";
import ClickPopoverCode from "@/app/components/ui-components/popover/code/ClickPopoverCode";

const BCrumb = [
  {
    to: "/",
    title: "Dashboard",
  },
  {
    title: "Muipopover",
  },
];

const Muipopover = () => (
  <PageContainer title="popover" description="this is popover page">
    {/* breadcrumb */}
    <Breadcrumb title="popover" items={BCrumb} />
    {/* end breadcrumb */}

    <ParentCard title="List">
      <Grid container spacing={3}>
        <Grid display="flex" alignItems="stretch" size={12}>
          <ClickPopoverCode />
        </Grid>
        <Grid display="flex" alignItems="stretch" size={12}>
          <HoverPopoverCode />
        </Grid>
      </Grid>
    </ParentCard>
  </PageContainer>
);
export default Muipopover;
