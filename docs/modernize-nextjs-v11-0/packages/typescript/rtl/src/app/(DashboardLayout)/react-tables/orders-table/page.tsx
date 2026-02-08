import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import TabelOrders from "@/app/components/react-table/TabelOrders";

const BCrumb = [
    {
        to: "/",
        title: "Dashboard",
    },
    {
        title: "Order Table",
    },
];

const OrdersTable = () => {
    return (
        <PageContainer title="OrderTable" description="this is Order Table">
            {/* breadcrumb */}
            <Breadcrumb title="Order Table" items={BCrumb} />
            {/* end breadcrumb */}
            <TabelOrders />
        </PageContainer>
    );
};

export default OrdersTable;
