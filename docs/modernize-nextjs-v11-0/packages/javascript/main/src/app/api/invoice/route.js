
import { NextResponse } from "next/server";

let invoceLists = [
  {
    id: 101,
    billFrom: "PineappleInc.",
    billFromEmail: "first@xabz.com",
    billFromAddress: "Ganesh glory,Godrej garden city,Ahmedabad.",
    billFromPhone: 979796786,
    billFromFax: 13,
    billTo: "Redq Inc.",
    billToEmail: "toFirst@agth.com",
    billToAddress: "Godrej garden city,Ahmedabad.",
    billToPhone: 757575233,
    billToFax: 76,
    orders: [
      {
        itemName: "Courge",
        unitPrice: 10,
        units: 9,
        unitTotalPrice: 90,
      },
    ],
    orderDate: "01 April 2025",
    dueDate: "05 April 2025",
    totalCost: 90,
    vat: 9,
    grandTotal: 99,
    status: "Paid",
    completed: false,
    isSelected: false,
  },

  {
    id: 102,
    billFrom: "Pineapple.",
    billFromEmail: "first@xabz.com",
    billFromAddress: "Ganesh glory,Godrej garden city,Ahmedabad.",
    billFromPhone: 979796786,
    billFromFax: 13,
    billTo: "ME Inc.",
    billToEmail: "toFirst@agth.com",
    billToAddress: "Godrej garden city,Ahmedabad.",
    billToPhone: 757575233,
    billToFax: 76,
    orders: [
      {
        itemName: "Courge",
        unitPrice: 10,
        units: 9,
        unitTotalPrice: 90,
      },
    ],
    orderDate: " 02 April 2025",
    dueDate: " 07 April 2025",
    totalCost: 90,
    vat: 9,
    grandTotal: 99,
    status: "Overdue",
    completed: false,
    isSelected: false,
  },
  {
    id: 103,
    billFrom: "Incorporation.",
    billFromEmail: "first@xabz.com",
    billFromAddress: "Ahmedabad.",
    billFromPhone: 979796786,
    billFromFax: 13,
    billTo: "Redirwed.",
    billToEmail: "toFirst@agth.com",
    billToAddress: "Godrej garden city,Ahmedabad.",
    billToPhone: 757575233,
    billToFax: 76,
    orders: [
      {
        itemName: "Courge",
        unitPrice: 10,
        units: 9,
        unitTotalPrice: 90,
      },
    ],
    orderDate: "03 April 2025",
    dueDate: "08 April 2025",
    totalCost: 90,
    vat: 9,
    grandTotal: 99,
    status: "Pending",
    completed: false,
    isSelected: false,
  },
  {
    id: 104,
    billFrom: "PineappleTimes.",
    billFromEmail: "first@xabz.com",
    billFromAddress: "Ganesh glory,Godrej garden city,Ahmedabad.",
    billFromPhone: 979796786,
    billFromFax: 13,
    billTo: "RFc.",
    billToEmail: "toFirst@agth.com",
    billToAddress: "Godrej garden city,Ahmedabad.",
    billToPhone: 757575233,
    billToFax: 76,
    orders: [
      {
        itemName: "Courge",
        unitPrice: 10,
        units: 9,
        unitTotalPrice: 90,
      },
    ],
    orderDate: "04 April 2025",
    dueDate: "09  April 2025",
    totalCost: 90,
    vat: 9,
    grandTotal: 99,
    status: "Paid",
    completed: false,
    isSelected: false,
  },
  {
    id: 105,
    billFrom: "FortuneCreation",
    billFromEmail: "first@xabz.com",
    billFromAddress: "Ganesh glory,Godrej garden city,Ahmedabad.",
    billFromPhone: 979796786,
    billFromFax: 13,
    billTo: "Soft solution.",
    billToEmail: "toFirst@agth.com",
    billToAddress: "Godrej garden city,Ahmedabad.",
    billToPhone: 757575233,
    billToFax: 76,
    orders: [
      {
        itemName: "Courge",
        unitPrice: 10,
        units: 9,
        unitTotalPrice: 90,
      },
    ],
    orderDate: "05 April 2025",
    dueDate: "10 April 2025",
    totalCost: 90,
    vat: 9,
    grandTotal: 99,
    status: "Overdue",
    completed: false,
    isSelected: false,
  },
  {
    id: 106,
    billFrom: "PineappleTimes.",
    billFromEmail: "first@xabz.com",
    billFromAddress: "Ganesh glory,Godrej garden city,Ahmedabad.",
    billFromPhone: 979796786,
    billFromFax: 13,
    billTo: "RFc.",
    billToEmail: "toFirst@agth.com",
    billToAddress: "Godrej garden city,Ahmedabad.",
    billToPhone: 757575233,
    billToFax: 76,
    orders: [
      {
        itemName: "Courge",
        unitPrice: 10,
        units: 9,
        unitTotalPrice: 90,
      },
    ],
    orderDate: "06 April 2025",
    dueDate: "11 April 2025",
    totalCost: 90,
    vat: 9,
    grandTotal: 99,
    status: "Draft",
    completed: false,
    isSelected: false,
  },
  {
    id: 107,
    billFrom: "FortuneCreation",
    billFromEmail: "first@xabz.com",
    billFromAddress: "Ganesh glory,Godrej garden city,Ahmedabad.",
    billFromPhone: 979796786,
    billFromFax: 13,
    billTo: "Soft solution.",
    billToEmail: "toFirst@agth.com",
    billToAddress: "Godrej garden city,Ahmedabad.",
    billToPhone: 757575233,
    billToFax: 76,
    orders: [
      {
        itemName: "Courge",
        unitPrice: 10,
        units: 9,
        unitTotalPrice: 90,
      },
    ],
    orderDate: "07 April 2025",
    dueDate: "13 April 2025",
    totalCost: 90,
    vat: 9,
    grandTotal: 99,
    status: "Overdue",
    completed: false,
    isSelected: false,
  },
];
// Reset InvoiceList
const resetInvoiceList = [...invoceLists];

// Endpoint to get all invoice
export async function GET(req) {
  let isBrowserRefreshed = req.headers.get("browserrefreshed");
  try {
    if (isBrowserRefreshed === "false") {
      return NextResponse.json({
        status: 200,
        msg: "Success",
        data: invoceLists,
      });
    } else {
      invoceLists = resetInvoiceList;
      return NextResponse.json({
        status: 200,
        msg: "Success",
        data: resetInvoiceList,
      });
    }
  } catch (error) {
    return NextResponse.json({
      status: 400,
      msg: "Internal server error",
      error,
    });
  }
}
// Endpoint to delete an invoice
export async function DELETE(req) {
  try {
    const { invoiceId } = await req.json();
    const invoiceIndex = invoceLists.findIndex(
      (invoice) => invoice.id === invoiceId
    );
    if (invoiceIndex !== -1) {
      const remainingInvoice = invoceLists.filter(
        (invoice) => invoice.id !== invoiceId
      );
      invoceLists = remainingInvoice;
      return NextResponse.json({
        status: 200,
        msg: "success",
        data: invoceLists,
      });
    } else {
      return NextResponse.json({ status: 400, msg: "invoice not found" });
    }
  } catch (error) {
    return NextResponse.json({
      status: 400,
      msg: "Internal server error",
      error,
    });
  }
}

const getNextId = () => {
  const maxId = Math.max(...invoceLists.map((invoice) => invoice.id));
  return maxId + 1;
};

// Endpoint to add an invoice
export async function POST(req) {
  try {
    const newInvoice = await req.json();
    newInvoice.id = getNextId();
    invoceLists.push(newInvoice);
    return NextResponse.json({
      status: 200,
      msg: "success",
      data: invoceLists,
    });
  } catch (error) {
    return NextResponse.json({
      status: 400,
      msg: "Internal server error",
      error,
    });
  }
}

// Endpoint to update an invoice
export async function PUT(req) {
  try {
    const updatedInvoice = await req.json();
    const invoiceIndex = invoceLists.findIndex(
      (invoice) => invoice.id === updatedInvoice.id
    );

    if (invoiceIndex !== -1) {
      invoceLists[invoiceIndex] = { ...updatedInvoice };
      return NextResponse.json({
        status: 200,
        msg: "success",
        data: invoceLists,
      });
    } else {
      return NextResponse.json({ status: 400, msg: "Invoice not found" });
    }
  } catch (error) {
    return NextResponse.json({
      status: 400,
      msg: "Internal server error",
      error,
    });
  }
}
