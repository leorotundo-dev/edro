import { Box } from "@mui/material";
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import ProductTableList from "@/app/components/apps/ecommerce/ProductTableList/ProductTableList";
import { ProductProvider } from "@/app/context/Ecommercecontext";

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "Search Table",
  },
];

const SearchTable = () => {
  return (
    <ProductProvider>
    <PageContainer title="Search Table" description="this is Search Table">
      {/* breadcrumb */}
      <Breadcrumb title="Search Table" items={BCrumb} />
      {/* end breadcrumb */}
      <Box>
        <ProductTableList />
      </Box>
    </PageContainer>
    </ProductProvider>
  );
};

export default SearchTable;
