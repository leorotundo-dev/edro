import React from "react";
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import ParentCard from "@/app/components/shared/ParentCard";

import { Grid } from "@mui/material";
import InlineItemCard from "@/app/components/shared/InlineItemCard";

import FilledCode from "@/app/components/ui-components/chip/code/FilledCode";



import OutlinedCode from '@/app/components/ui-components/chip/code/OutlinedCode';

import CustomIconCode from '@/app/components/ui-components/chip/code/CustomOutlinedIcon';


import DisabledCode from '@/app/components/ui-components/chip/code/DisabledCode';

import SizesCode from '@/app/components/ui-components/chip/code/SizesCode';




const BCrumb = [
  {
    to: "/",
    title: "Dashboard",
  },
  {
    title: "Chip",
  },
];

const MuiChip = () => {
  return (
    <PageContainer title="Chip" description="this is Chip page">
      {/* breadcrumb */}
      <Breadcrumb title="Chip" items={BCrumb} />
      {/* end breadcrumb */}
      <ParentCard title="Chip">
        <Grid container spacing={3}>
          <Grid display="flex" alignItems="stretch" size={12}>


            <FilledCode />

          </Grid>
          <Grid display="flex" alignItems="stretch" size={12}>


            <OutlinedCode />


          </Grid>
          <Grid display="flex" alignItems="stretch" size={12}>


            <CustomIconCode />


          </Grid>
          <Grid display="flex" alignItems="stretch" size={12}>


            <DisabledCode />


          </Grid>
          <Grid display="flex" alignItems="stretch" size={12}>


            <SizesCode />


          </Grid>
        </Grid>
      </ParentCard>
    </PageContainer >
  );
};
export default MuiChip;
