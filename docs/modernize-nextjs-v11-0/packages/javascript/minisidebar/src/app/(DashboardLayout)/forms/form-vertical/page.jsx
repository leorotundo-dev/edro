
import { Grid, Typography } from '@mui/material';

// components
import Breadcrumb from '@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/app/components/container/PageContainer';
import ParentCard from '@/app/components/shared/ParentCard';

import BasicLayout from '@/app/components/forms/form-vertical/BasicLayout';

import BasicIcons from '@/app/components/forms/form-vertical/BasicIcons';
import FormSeparator from '@/app/components/forms/form-vertical/FormSeparator';
import CollapsibleForm from '@/app/components/forms/form-vertical/CollapsibleForm';
import FormTabs from '@/app/components/forms/form-vertical/FormTabs';
import ChildCard from "@/app/components/shared/ChildCard";

import BasicLayoutCode from '@/app/components/forms/form-vertical/code/BasicLayoutCode';
import BasicIconsCode from '@/app/components/forms/form-vertical/code/BasicIconsCode';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Vertical Form',
  },
];

const FormVertical = () => {
  return (
    <PageContainer title="Form Vertical" description="this is Form Vertical">
      {/* breadcrumb */}
      <Breadcrumb title="Vertical Form" items={BCrumb} />
      {/* end breadcrumb */}
      <Grid container spacing={3}>
        <Grid
          size={{
            xs: 12,
            lg: 6,
          }}
        >
          <ChildCard title="Basic Layout" codeModel={<BasicLayoutCode />}>
            <BasicLayout />
          </ChildCard>
        </Grid>
        <Grid
          size={{
            xs: 12,
            lg: 6,
          }}
        >
          <ChildCard title="Basic with Icons" codeModel={<BasicIconsCode />}>
            <BasicIcons />
          </ChildCard>
        </Grid>
        <Grid size={12}>
          <ChildCard title="Multi Column with Form Separator">
            <FormSeparator />
          </ChildCard>
        </Grid>
        <Grid size={12}>
          <Typography variant="h5" mb={3}>
            Collapsible Section
          </Typography>
          <CollapsibleForm />
        </Grid>
        <Grid size={12}>
          <Typography variant="h5" mb={3}>
            Form with Tabs
          </Typography>
          <FormTabs />
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default FormVertical;
