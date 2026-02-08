import { Grid } from "@mui/material";
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import ParentCard from "@/app/components/shared/ParentCard";
import ChildCard from "@/app/components/shared/ChildCard";
import ControlsListCode from "@/app/components/ui-components/lists/code/ControlsListCode";
import FolderListCode from "@/app/components/ui-components/lists/code/FolderListCode";
import NestedListCode from "@/app/components/ui-components/lists/code/NestedListCode";
import SelectedListCode from "@/app/components/ui-components/lists/code/SelectedListCode";
import SimpleListCode from "@/app/components/ui-components/lists/code/SimpleListCode";
import SwitchListCode from "@/app/components/ui-components/lists/code/SwitchListCode";

const BCrumb = [
  {
    to: "/",
    title: "Dashboard",
  },
  {
    title: "List",
  },
];

const MuiList = () => (
  <PageContainer title="List" description="this is List page">
    {/* breadcrumb */}
    <Breadcrumb title="List" items={BCrumb} />
    {/* end breadcrumb */}

    <ParentCard title="List">
      <Grid container spacing={3}>
        <Grid display="flex" alignItems="stretch" size={12}>
          <ControlsListCode />
        </Grid>
        <Grid display="flex" alignItems="stretch" size={12}>
          <FolderListCode />
        </Grid>
        <Grid display="flex" alignItems="stretch" size={12}>
          <NestedListCode />
        </Grid>
        <Grid display="flex" alignItems="stretch" size={12}>
          <SelectedListCode />
        </Grid>
        <Grid display="flex" alignItems="stretch" size={12}>
          <SimpleListCode />
        </Grid>
        <Grid display="flex" alignItems="stretch" size={12}>
          <SwitchListCode />
        </Grid>
      </Grid>
    </ParentCard>
  </PageContainer>
);
export default MuiList;
