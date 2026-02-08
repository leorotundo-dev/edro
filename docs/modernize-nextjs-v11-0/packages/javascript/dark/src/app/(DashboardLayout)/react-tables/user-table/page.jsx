import React from "react";
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import TableUser from "@/app/components/react-table/TableUser";

const BCrumb = [
    {
        to: "/",
        title: "Dashboard",
    },
    {
        title: "User Table",
    },
];

function UserTable() {
    return (
        <PageContainer title="User" description="this is User Table">
            {/* breadcrumb */}
            <Breadcrumb title="User Table" items={BCrumb} />
            {/* end breadcrumb */}
            <TableUser />
        </PageContainer>
    );
}

export default UserTable;
