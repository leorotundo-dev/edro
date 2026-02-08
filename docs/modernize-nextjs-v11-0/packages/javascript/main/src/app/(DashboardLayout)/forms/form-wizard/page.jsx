import React from 'react';
import PageContainer from '@/app/components/container/PageContainer';
import Breadcrumb from '@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb';
import FormWizardCode from '@/app/components/forms/form-wizard/code/FormWizardCode';
import ParentCard from '@/app/components/shared/ParentCard';
import FormWizardSteps from '@/app/components/forms/form-wizard/FormWizardSteps';
import ChildCard from '@/app/components/shared/ChildCard';


const FormWizard = () => {

  return (
    <PageContainer title="Form Wizard" description="this is Form Wizard">
      <Breadcrumb title="Form Wizard" subtitle="this is Form Wizard page" />
      <ChildCard title="Form Wizard" codeModel={<FormWizardCode />}>
        <FormWizardSteps />
      </ChildCard>
    </PageContainer>
  );
};

export default FormWizard;
