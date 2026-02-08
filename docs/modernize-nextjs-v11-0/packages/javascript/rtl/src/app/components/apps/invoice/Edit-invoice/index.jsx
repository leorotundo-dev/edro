"use client";
import React, { useContext, useState, useEffect, ChangeEvent } from "react";
import { InvoiceContext } from "@/app/context/InvoiceContext/index";
import { usePathname, useRouter } from "next/navigation";
import {
  Button,
  MenuItem,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  IconButton,
  Tooltip,
  Box,
  Stack,
  Divider,
  Grid,
  SelectChangeEvent,
  Chip,
  FormControl,
  Snackbar,
} from "@mui/material";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import {
  IconCheck,
  IconPencil,
  IconSquareRoundedPlus,
  IconTrash,
} from "@tabler/icons-react";


import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import Logo from "@/app/(DashboardLayout)/layout/shared/logo/Logo";

const EditInvoicePage = () => {
  const { invoices, updateInvoice } = useContext(InvoiceContext);
  const [showAlert, setShowAlert] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [editing, setEditing] = useState(false);

  const [editedInvoice, setEditedInvoice] = useState();

  const [editModeFrom, setEditModeFrom] = React.useState(false);

  const [editModeTo, setEditModeTo] = React.useState(false);
  const toggleEditModeFrom = () => setEditModeFrom((prev) => !prev);
  const toggleEditModeTo = () => setEditModeTo((prev) => !prev);

  const title = usePathname();

  const getId = title.split("/").pop();

  useEffect(() => {
    if (invoices.length > 0) {
      if (getId) {
        const invoice = invoices.find((inv) => inv.id === getId);
        if (invoice) {
          setSelectedInvoice(invoice);
          setEditedInvoice({ ...invoice });
          setEditing(true);
        } else {
          setSelectedInvoice(invoices[0]);
          setEditedInvoice({ ...invoices[0] });
          setEditing(true);
        }
      } else {
        setSelectedInvoice(invoices[0]);
        setEditedInvoice({ ...invoices[0] });
        setEditing(true);
      }
    }
  }, [getId, invoices]);

  const router = useRouter();

  const handleSave = async () => {
    try {
      await updateInvoice(editedInvoice);
      setSelectedInvoice({ ...editedInvoice });
      setEditing(false); // Exit editing mode
      setShowAlert(true);

      // Navigate to the list page
      router.push("/apps/invoice/list");
    } catch (error) {
      console.error("Error updating invoice:", error);
    }

    setTimeout(() => {
      setShowAlert(false);
    }, 5000);
  };

  const handleCancel = () => {
    setEditing(false);
    router.push("/apps/invoice/list");
  };

  const handleOrderChange = (
    index,
    field,
    value
  ) => {
    if (!editedInvoice) return;

    const updatedOrders = [...editedInvoice.orders];

    // Narrow the type of value based on the field
    if (field === "unitPrice" || field === "units") {
      // For 'unitPrice' and 'units', ensure that the value is a number
      updatedOrders[index][field] =
        typeof value === "number" ? value : parseFloat(value);
    } else if (field === "itemName") {
      // For 'itemName', it should be a string
      updatedOrders[index][field] = value;
    }

    // Update unitTotalPrice when unitPrice or units change
    if (field === "unitPrice" || field === "units") {
      updatedOrders[index].unitTotalPrice =
        updatedOrders[index].unitPrice * updatedOrders[index].units;
    }

    // Update the invoice totals
    const updatedInvoice = {
      ...editedInvoice,
      orders: updatedOrders,
      totalCost: calculateTotalCost(updatedOrders),
      vat: calculateVAT(updatedOrders),
      grandTotal: calculateGrandTotal(
        calculateTotalCost(updatedOrders),
        calculateVAT(updatedOrders)
      ),
    };

    setEditedInvoice(updatedInvoice);
  };

  const handleAddItem = () => {
    const newItem = {
      itemName: "",
      unitPrice: 0,
      units: 0,
      unitTotalPrice: 0,
      vat: 0,
    };
    const updatedOrders = [...editedInvoice.orders, newItem];

    // Update editedInvoice with updated orders and recalculate totals
    const updatedInvoice = {
      ...editedInvoice,
      orders: updatedOrders,
      totalCost: calculateTotalCost(updatedOrders),
      vat: calculateVAT(updatedOrders),
      grandTotal: calculateGrandTotal(
        calculateTotalCost(updatedOrders),
        calculateVAT(updatedOrders)
      ),
    };
    setEditedInvoice(updatedInvoice);
  };

  const handleDeleteItem = (index) => {
    const updatedOrders = editedInvoice.orders.filter(
      (_, i) => i !== index
    );

    const updatedInvoice = {
      ...editedInvoice,
      orders: updatedOrders,
      totalCost: calculateTotalCost(updatedOrders),
      vat: calculateVAT(updatedOrders),
      grandTotal: calculateGrandTotal(
        calculateTotalCost(updatedOrders),
        calculateVAT(updatedOrders)
      ),
    };
    setEditedInvoice(updatedInvoice);
  };

  const calculateTotalCost = (orders) => {
    return orders.reduce((total, order) => total + order.unitTotalPrice, 0);
  };

  const calculateVAT = (orders) => {
    return orders.reduce((totalVAT, order) => totalVAT + order.units, 0);
  };

  const calculateGrandTotal = (totalCost, vat) => {
    return (totalCost += (totalCost * vat) / 100);
  };

  if (!selectedInvoice) {
    return <div>Please select an invoice.</div>;
  }

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems="center"
        justifyContent="space-between"
        mb={2}
      >
        <Box
          sx={{
            textAlign: {
              xs: "center",
              sm: "left",
            },
          }}
        >
          <Typography variant="h5"># {editedInvoice.id}</Typography>
        </Box>

        <Logo />

        <FormControl>
          <CustomSelect
            id="invoice-status"
            value={editedInvoice.status}
            onChange={(e) =>
              setEditedInvoice({ ...editedInvoice, status: e.target.value })
            }
            displayEmpty
            renderValue={(selected) => (
              <Chip
                label={selected}
                size="small"
                sx={{
                  backgroundColor:
                    selected === "Paid"
                      ? "success.light"
                      : selected === "Overdue"
                        ? "error.light"
                        : selected === "Pending"
                          ? "warning.light"
                          : selected === "Draft"
                            ? "info.light"
                            : "info.light",
                  color:
                    selected === "Pending"
                      ? "warning.main"
                      : selected === "Paid"
                        ? "success.main"
                        : selected === "Overdue"
                          ? "error.main"
                          : selected === "Draft"
                            ? "info.main"
                            : "info.main",
                }}
              />
            )}
          >
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="Draft">Draft</MenuItem>
            <MenuItem value="Overdue">Overdue</MenuItem>
            <MenuItem value="Paid">Paid</MenuItem>
          </CustomSelect>
        </FormControl>
      </Stack>

      <Grid container spacing={3} mt={2} mb={4}>
        <Grid
          size={{
            xs: 12,
            sm: 6,
          }}
        >
          <Typography variant="h6" mb={2}>
            Bill From
          </Typography>

          <Paper
            variant="outlined"
            sx={{ backgroundColor: "background.default" }}
          >
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="flex-start"
              p={2}
              width="100%"
            >
              <Box
                flex={1}
                mr={2}
                display="flex"
                flexDirection="column"
                gap="4px"
              >
                {editModeFrom ? (
                  <>
                    <CustomTextField
                      id="bill-from"
                      name="billFrom"
                      value={editedInvoice.billFrom}
                      onChange={(e) =>
                        setEditedInvoice({
                          ...editedInvoice,
                          billFrom: e.target.value,
                        })
                      }
                      placeholder="Enter company name"
                      fullWidth
                    />

                    <CustomTextField
                      value={editedInvoice.billFromAddress}
                      placeholder="Enter Address"
                      onChange={(e) =>
                        setEditedInvoice({
                          ...editedInvoice,
                          billFromAddress: e.target.value,
                        })
                      }
                      fullWidth
                    />
                    <CustomTextField
                      value={editedInvoice.billFromEmail}
                      placeholder="Enter Email"
                      onChange={(e) =>
                        setEditedInvoice({
                          ...editedInvoice,
                          billFromEmail: e.target.value,
                        })
                      }
                      fullWidth
                    />
                    <CustomTextField
                      value={editedInvoice.billFromPhone}
                      placeholder="Enter Phone Number"
                      onChange={(e) =>
                        setEditedInvoice({
                          ...editedInvoice,
                          billFromPhone: e.target.value,
                        })
                      }
                      fullWidth
                    />
                  </>
                ) : (
                  <>
                    <Typography variant="body1" fontWeight={500}>
                      {editedInvoice.billFrom}
                    </Typography>

                    <Typography variant="body1" color="text.secondary">
                      {editedInvoice.billFromAddress}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {editedInvoice.billFromEmail}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {editedInvoice.billFromPhone}
                    </Typography>
                  </>
                )}
              </Box>

              <IconButton
                onClick={toggleEditModeFrom}
                sx={{ alignSelf: "flex-start" }}
              >
                {editModeFrom ? (
                  <IconCheck size={20} />
                ) : (
                  <IconPencil size={20} />
                )}
              </IconButton>
            </Box>
          </Paper>
          <Box mt={2}>
            <Typography fontWeight="bold">Date Created</Typography>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                value={dayjs(editedInvoice.orderDate)}
                onChange={(newValue) => {
                  setEditedInvoice((prev) => ({
                    ...prev,
                    orderDate: newValue?.toDate() || new Date(),
                  }));
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                  },
                }}
              />
            </LocalizationProvider>
          </Box>
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6,
          }}
        >
          <Typography variant="h6" mb={2}>
            Bill To
          </Typography>

          <Paper
            variant="outlined"
            sx={{ backgroundColor: "background.default" }}
          >
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="flex-start"
              p={2}
              width="100%"
            >
              <Box
                flex={1}
                mr={2}
                display="flex"
                flexDirection="column"
                gap="4px"
              >
                {editModeTo ? (
                  <>
                    <CustomTextField
                      id="bill-to"
                      name="billTo"
                      placeholder="Enter Company name"
                      value={editedInvoice.billTo}
                      onChange={(e) =>
                        setEditedInvoice({
                          ...editedInvoice,
                          billTo: e.target.value,
                        })
                      }
                      fullWidth
                    />
                    <CustomTextField
                      name="billToAddress"
                      placeholder="Enter Address"
                      value={editedInvoice.billToAddress}
                      onChange={(e) =>
                        setEditedInvoice({
                          ...editedInvoice,
                          billToAddress: e.target.value,
                        })
                      }
                      fullWidth
                    />
                    <CustomTextField
                      name="billToEmail"
                      placeholder="Enter Email"
                      value={editedInvoice.billToEmail}
                      onChange={(e) =>
                        setEditedInvoice({
                          ...editedInvoice,
                          billToEmail: e.target.value,
                        })
                      }
                      fullWidth
                    />
                    <CustomTextField
                      name="billToPhone"
                      placeholder="Enter Phone Number"
                      value={editedInvoice.billToPhone}
                      onChange={(e) =>
                        setEditedInvoice({
                          ...editedInvoice,
                          billToPhone: e.target.value,
                        })
                      }
                      fullWidth
                    />
                  </>
                ) : (
                  <>
                    <Typography variant="body1" fontWeight={500}>
                      {editedInvoice.billTo}
                    </Typography>

                    <Typography variant="body1" color="text.secondary">
                      {editedInvoice.billToAddress}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {editedInvoice.billToEmail}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {editedInvoice.billToPhone}
                    </Typography>
                  </>
                )}
              </Box>

              <IconButton
                onClick={toggleEditModeTo}
                sx={{ alignSelf: "flex-start" }}
              >
                {editModeTo ? (
                  <IconCheck size={20} />
                ) : (
                  <IconPencil size={20} />
                )}
              </IconButton>
            </Box>
          </Paper>
          <Box mt={2}>
            <Typography fontWeight="bold">Due Date</Typography>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                value={dayjs(editedInvoice.dueDate)}
                onChange={(newValue) => {
                  setEditedInvoice((prev) => ({
                    ...prev,
                    dueDate: newValue?.toDate() || new Date(),
                  }));
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                  },
                }}
              />
            </LocalizationProvider>
          </Box>
        </Grid>
      </Grid>

      <Paper variant="outlined">
        <TableContainer sx={{ whiteSpace: { xs: "nowrap", md: "unset" } }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <Typography variant="h6" fontSize="14px">
                    Item Name
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="h6" fontSize="14px">
                    Unit Price
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="h6" fontSize="14px">
                    Units
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="h6" fontSize="14px">
                    Total Cost
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="h6" fontSize="14px">
                    Action
                  </Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {editedInvoice.orders.map((order, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <CustomTextField
                      type="text"
                      value={order.itemName}
                      onChange={(e) =>
                        handleOrderChange(index, "itemName", e.target.value)
                      }
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <CustomTextField
                      type="number"
                      value={order.unitPrice}
                      onChange={(e) =>
                        handleOrderChange(
                          index,
                          "unitPrice",
                          parseFloat(e.target.value)
                        )
                      }
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <CustomTextField
                      type="number"
                      value={order.units}
                      onChange={(e) =>
                        handleOrderChange(
                          index,
                          "units",
                          parseInt(e.target.value)
                        )
                      }
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body1">
                      {order.unitTotalPrice}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Add Item">
                      <IconButton onClick={handleAddItem} color="primary">
                        <IconSquareRoundedPlus width={22} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Item">
                      <IconButton
                        disabled={index === 0}
                        color="error"
                        onClick={() => handleDeleteItem(index)}
                      >
                        <IconTrash width={22} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Box p={3} bgcolor="background.default" mt={3} borderRadius={2}>
        <Box maxWidth={400} ml="auto">
          <Box display="flex" justifyContent="space-between" mb={2}>
            <Typography variant="body1" color="text.secondary">
              Sub Total:
            </Typography>
            <Typography variant="body1">$ {editedInvoice.totalCost}</Typography>
          </Box>

          <Box display="flex" justifyContent="space-between" mb={2}>
            <Typography variant="body1" color="text.secondary">
              Taxes:
            </Typography>
            <Typography variant="body1"> {editedInvoice.vat}%</Typography>
          </Box>
          <Divider />
          <Box my={2} />
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6" fontWeight="bold">
              Grand Total:
            </Typography>
            <Typography
              variant="h6"
              fontWeight="bold"
              color="blackColor.black100"
            >
              $ {Math.round(editedInvoice.grandTotal)}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Snackbar
        open={showAlert}
        autoHideDuration={5000}
        onClose={() => setShowAlert(false)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert severity="success" sx={{ width: "100%" }}>
          Invoice data updated successfully.
        </Alert>
      </Snackbar>

      <Box display="flex" gap={1} mt={2} justifyContent="flex-end">
        <Button variant="contained" color="primary" onClick={handleSave}>
          Update Invoice
        </Button>
        <Button variant="outlined" color="error" onClick={handleCancel}>
          Cancel
        </Button>
      </Box>
    </Box>
  );
};

export default EditInvoicePage;
