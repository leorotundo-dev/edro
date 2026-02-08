import { Grid } from "@mui/material";
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import ParentCard from "@/app/components/shared/ParentCard";
import CustomIconSetCode from "@/app/components/ui-components/rating/code/CustomIconSetCode";
import DisabledCode from "@/app/components/ui-components/rating/code/DisabledCode";
import HoverFeedbackCode from "@/app/components/ui-components/rating/code/HoverFeedbackCode";
import NoRatingCode from "@/app/components/ui-components/rating/code/NoRatingCode";
import RadioGroupCode from "@/app/components/ui-components/rating/code/RadioGroupCode";
import RatingPrecisionCode from "@/app/components/ui-components/rating/code/RatingPrecisionCode";
import ReadonlyCode from "@/app/components/ui-components/rating/code/ReadonlyCode";

const BCrumb = [
  {
    to: "/",
    title: "Dashboard",
  },
  {
    title: "Rating",
  },
];

const Muirating = () => (
  <PageContainer title="Rating" description="this is Rating page">
    {/* breadcrumb */}
    <Breadcrumb title="Rating" items={BCrumb} />
    {/* end breadcrumb */}

    <ParentCard title="Rating">
      <Grid container spacing={3}>
        <Grid display="flex" alignItems="stretch" size={12}>
          <CustomIconSetCode />
        </Grid>
        <Grid display="flex" alignItems="stretch" size={12}>
          <DisabledCode />
        </Grid>
        <Grid display="flex" alignItems="stretch" size={12}>
          <HoverFeedbackCode />
        </Grid>{" "}
        <Grid display="flex" alignItems="stretch" size={12}>
          <NoRatingCode />
        </Grid>
        <Grid display="flex" alignItems="stretch" size={12}>
          <RadioGroupCode />
        </Grid>
        <Grid display="flex" alignItems="stretch" size={12}>
          <RatingPrecisionCode />
        </Grid>
        <Grid display="flex" alignItems="stretch" size={12}>
          <ReadonlyCode />
        </Grid>
      </Grid>
    </ParentCard>
  </PageContainer>
);
export default Muirating;
