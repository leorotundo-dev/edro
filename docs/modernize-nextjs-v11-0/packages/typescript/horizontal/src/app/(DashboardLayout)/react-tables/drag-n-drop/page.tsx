import React from "react";
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import TableRowDragDrop from "../../../components/react-table/TableRowDragDrop";
import TableColumnDragDrop from "../../../components/react-table/TableColumnDragDrop";
import { Grid } from "@mui/material";

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "Drag & Drop React Table",
  },
];

function page() {
  return (
    (<PageContainer
      title="Drag & drop Table"
      description="this is Drag & Drop Table"
    >
      <Breadcrumb title="Drag & Drop Table" items={BCrumb} />
      <Grid container spacing={3}>
        <Grid size={12}>
          <TableRowDragDrop />
        </Grid>
        <Grid size={12}>
          <TableColumnDragDrop />
        </Grid>
      </Grid>
    </PageContainer>)
  );
}
export default page;
