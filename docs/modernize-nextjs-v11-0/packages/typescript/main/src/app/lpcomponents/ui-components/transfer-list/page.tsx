import { Grid } from "@mui/material";
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import ParentCard from "@/app/components/shared/ParentCard";
import BasicTransferListCode from "@/app/components/ui-components/transfer-list/code/BasicTransferListCode";
import EnhancedTransferListCode from "@/app/components/ui-components/transfer-list/code/EnhancedTransferListCode";

const BCrumb = [
  {
    to: "/",
    title: "Dashboard",
  },
  {
    title: "Transfer List",
  },
];

const MuiTransferList = () => (
  <PageContainer title="Transfer List" description="this is Transfer List page">
    {/* breadcrumb */}
    <Breadcrumb title="Transfer List" items={BCrumb} />
    {/* end breadcrumb */}

    <ParentCard title="Transfer List">
      <Grid container spacing={3}>
        <Grid display="flex" alignItems="stretch" size={12}>
          <BasicTransferListCode />
        </Grid>
        <Grid display="flex" alignItems="stretch" size={12}>
          <EnhancedTransferListCode />
        </Grid>
      </Grid>
    </ParentCard>
  </PageContainer>
);
export default MuiTransferList;
