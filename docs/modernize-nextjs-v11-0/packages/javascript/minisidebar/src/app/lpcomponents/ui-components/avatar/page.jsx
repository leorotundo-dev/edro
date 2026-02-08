import { Grid, Avatar, AvatarGroup, Badge, Stack } from "@mui/material";
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import ParentCard from "@/app/components/shared/ParentCard";
import { IconMoodSmile } from "@tabler/icons-react";
import ImageAvatarsCode from "@/app/components/ui-components/avatar/code/ImageAvatarsCode";
import LetterAvatarsCode from "@/app/components/ui-components/avatar/code/LetterAvatarsCode";
import IconAvatarsCode from "@/app/components/ui-components/avatar/code/IconAvatarsCode";
import VariantCode from "@/app/components/ui-components/avatar/code/VariantCode";
import GroupedCode from "@/app/components/ui-components/avatar/code/GroupedCode";
import GroupedSizeCode from "@/app/components/ui-components/avatar/code/GroupedSizeCode";
import WithBadgeCode from "@/app/components/ui-components/avatar/code/WithBadgeCode";
import SizesCode from "@/app/components/ui-components/avatar/code/SizesCode";



const BCrumb = [
  {
    to: "/",
    title: "Dashboard",
  },
  {
    title: "Avatar",
  },
];

const MuiAvatar = () => (
  <PageContainer title="Avatar" description="this is Avatar page">
    {/* breadcrumb */}
    <Breadcrumb title="Avatar" items={BCrumb} />
    {/* end breadcrumb */}

    <ParentCard title="Avatar">
      <Grid container spacing={3}>
        <Grid display="flex" alignItems="stretch" size={12}>

          <ImageAvatarsCode />

        </Grid>
        <Grid display="flex" alignItems="stretch" size={12}>

          <LetterAvatarsCode />

        </Grid>
        <Grid display="flex" alignItems="stretch" size={12}>

          <IconAvatarsCode />

        </Grid>
        <Grid display="flex" alignItems="stretch" size={12}>

          <VariantCode />

        </Grid>
        <Grid display="flex" alignItems="stretch" size={12}>

          <GroupedCode />

        </Grid>
        <Grid display="flex" alignItems="stretch" size={12}>

          <GroupedSizeCode />

        </Grid>
        <Grid display="flex" alignItems="stretch" size={12}>


          <WithBadgeCode />

        </Grid>
        <Grid display="flex" alignItems="stretch" size={12}>

          <SizesCode />

        </Grid>
      </Grid>
    </ParentCard>
  </PageContainer>
);
export default MuiAvatar;
