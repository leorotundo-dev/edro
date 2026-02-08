import { Grid } from "@mui/material";
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import ParentCard from "@/app/components/shared/ParentCard";
import ChildCard from "@/app/components/shared/ChildCard";

import SimpleCode from "@/app/components/ui-components/dialog/code/SimpleCode";
import AlertDialogCode from "@/app/components/ui-components/dialog/code/AlertDialogCode";
import TransitionCode from "@/app/components/ui-components/dialog/code/TransitionCode";
import FormDialogCode from "@/app/components/ui-components/dialog/code/FormDialogCode";
import FullscreenDialogCode from "@/app/components/ui-components/dialog/code//FullscreenDialogCode";
import MaxWidthCode from "@/app/components/ui-components/dialog/code/MaxWidthCode";
import ScrollingContentCode from "@/app/components/ui-components/dialog/code/ScrollingContentCode";
import ResponsiveFullscreenCode from "@/app/components/ui-components/dialog/code/ResponsiveFullscreenCode";

const BCrumb = [
  {
    to: "/",
    title: "Dashboard",
  },
  {
    title: "Dialog",
  },
];

const MuiDialog = () => (
  <PageContainer title="Dialog" description="this is Dialog page">
    {/* breadcrumb */}
    <Breadcrumb title="Dialog" items={BCrumb} />
    {/* end breadcrumb */}

    <ParentCard title="Dialog">
      <Grid container spacing={3}>
        <Grid display="flex" alignItems="stretch" size={12}>
          <SimpleCode />
        </Grid>
        <Grid display="flex" alignItems="stretch" size={12}>
          <AlertDialogCode />
        </Grid>
        <Grid display="flex" alignItems="stretch" size={12}>
          <TransitionCode />
        </Grid>
        <Grid display="flex" alignItems="stretch" size={12}>
          <FormDialogCode />
        </Grid>
        <Grid display="flex" alignItems="stretch" size={12}>
          <FullscreenDialogCode />
        </Grid>
        <Grid display="flex" alignItems="stretch" size={12}>
          <MaxWidthCode />
        </Grid>
        <Grid display="flex" alignItems="stretch" size={12}>
          <ScrollingContentCode />
        </Grid>
        <Grid display="flex" alignItems="stretch" size={12}>
          <ResponsiveFullscreenCode />
        </Grid>
      </Grid>
    </ParentCard>
  </PageContainer>
);
export default MuiDialog;
