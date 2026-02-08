"use client";
import React, { useState, useContext, useEffect, ChangeEvent } from "react";
import { InvoiceContext } from "@/app/context/InvoiceContext";
import {
  Alert,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Box,
  Stack,
  Divider,
  Grid,
  Chip,
  Snackbar,
} from "@mui/material";
import { useRouter } from "next/navigation";

import {
  IconCheck,
  IconPencil,
  IconPlus,
  IconSquareRoundedPlus,
  IconTrash,
} from "@tabler/icons-react";

import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { InvoiceList, order } from "@/app/(DashboardLayout)/types/apps/invoice";

import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";

import dayjs from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import Logo from "@/app/(DashboardLayout)/layout/shared/logo/Logo";

const CreateInvoice = () => {
  const { addInvoice, invoices } = useContext(InvoiceContext);
  const [showAlert, setShowAlert] = useState(false);
  const router = useRouter();

  const [editModeFrom, setEditModeFrom] = React.useState(false);
  const [editModeTo, setEditModeTo] = React.useState(false);

  const [formData, setFormData] = useState<InvoiceList>({
    id: 0,
    billFrom: "Acme Corp",
    billFromEmail: "accounts@acmecorp.com",
    billFromAddress: "123 Market Street, San Francisco, CA 94103",
    billFromPhone: 4151234567,
    billFromFax: 0,
    billTo: "Globex Industries",
    billToEmail: "finance@globex.com",
    billToAddress: "456 Innovation Ave, Austin, TX 73301",
    billToPhone: 7379876543,
    billToFax: 0,
    orders: [
      {
        itemName: "",
        unitPrice: 0,
        units: 0,
        unitTotalPrice: 0,
      },
    ],
    orderDate: new Date(),
    dueDate: dayjs().add(1, "day").toDate(),
    totalCost: 0,
    vat: 0,
    grandTotal: 0,
    status: "Pending",
    completed: false,
    isSelected: false,
    subtotal: 0,
  });

  useEffect(() => {
    if (invoices.length > 0) {
      const lastId = invoices[invoices.length - 1].id;
      setFormData((prevData) => ({
        ...prevData,
        id: lastId + 1,
      }));
    } else {
      setFormData((prevData) => ({
        ...prevData,
        id: 1,
      }));
    }
  }, [invoices]);

  const calculateTotals = (orders: order[]) => {
    let subtotal = 0;

    orders.forEach((order) => {
      const unitPrice = order.unitPrice || 0;
      const units = order.units || 0;
      const totalCost = unitPrice * units;

      subtotal += totalCost;
      order.unitTotalPrice = totalCost;
    });

    const vat = subtotal * 0.1;
    const grandTotal = subtotal + vat;

    return { subtotal, vat, grandTotal };
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => {
      const newFormData = { ...prevData, [name]: value };
      const totals = calculateTotals(newFormData.orders);
      return {
        ...newFormData,
        ...totals,
      };
    });
  };

  const handleOrderChange = (index: number, field: string, value: string) => {
    setFormData((prevData) => {
      const updatedOrders = [...prevData.orders];
      updatedOrders[index] = {
        ...updatedOrders[index],
        [field]: value,
      };
      const totals = calculateTotals(updatedOrders);
      return {
        ...prevData,
        orders: updatedOrders,
        ...totals,
      };
    });
  };

  const handleAddItem = () => {
    setFormData((prevData) => {
      const updatedOrders = [
        ...prevData.orders,
        { itemName: "", unitPrice: 0, units: 0, unitTotalPrice: 0 },
      ];
      const totals = calculateTotals(updatedOrders);
      return {
        ...prevData,
        orders: updatedOrders,
        ...totals,
      };
    });
  };

  const handleDeleteItem = (index: number) => {
    setFormData((prevData) => {
      const updatedOrders = prevData.orders.filter((_, i) => i !== index);
      const totals = calculateTotals(updatedOrders);
      return {
        ...prevData,
        orders: updatedOrders,
        ...totals,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const finalFormData: InvoiceList = {
        ...formData,
        orderDate: new Date(formData.orderDate),
        totalCost: formData.grandTotal,
      };

      await addInvoice(finalFormData);

      setFormData({
        id: 0,
        billFrom: "",
        billFromEmail: "",
        billFromAddress: "",
        billFromPhone: 0,
        billFromFax: 0,
        billTo: "",
        billToEmail: "",
        billToAddress: "",
        billToPhone: 0,
        billToFax: 0,
        orders: [
          {
            itemName: "",
            unitPrice: 0,
            units: 0,
            unitTotalPrice: 0,
          },
        ],
        orderDate: new Date(),
        dueDate: new Date(),
        totalCost: 0,
        vat: 0,
        grandTotal: 0,
        status: "Pending",
        completed: false,
        isSelected: false,
        subtotal: 0,
      });

      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 5000);
      setEditModeFrom(false);
      setEditModeTo(false);
      router.push("/apps/invoice/list");
    } catch (error) {
      console.error("Error adding invoice:", error);
    }
  };

  const toggleEditModeFrom = () => setEditModeFrom((prev) => !prev);
  const toggleEditModeTo = () => setEditModeTo((prev) => !prev);
  return (
    <>
      <form onSubmit={handleSubmit}>
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
              <Typography variant="h5"># {formData.id}</Typography>
            </Box>

            <Logo />
            <Box textAlign="right">
              <Chip
                label={formData.status}
                size="small"
                sx={{
                  backgroundColor: "warning.light",
                  color: "warning.main",
                }}
              />
            </Box>
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
                          value={formData.billFrom}
                          onChange={handleChange}
                          placeholder="Enter company name"
                          fullWidth
                        />
                        <CustomTextField
                          name="billFromAddress"
                          value={formData.billFromAddress}
                          placeholder="Enter company address"
                          onChange={handleChange}
                          fullWidth
                        />
                        <CustomTextField
                          name="billFromEmail"
                          value={formData.billFromEmail}
                          placeholder="example@company.com"
                          onChange={handleChange}
                          fullWidth
                        />
                        <CustomTextField
                          name="billFromPhone"
                          value={formData.billFromPhone}
                          placeholder="Enter phone number"
                          onChange={handleChange}
                          fullWidth
                        />
                      </>
                    ) : (
                      <>
                        <Typography variant="body1" fontWeight={500}>
                          {formData.billFrom}
                        </Typography>

                        <Typography variant="body1" color="text.secondary">
                          {formData.billFromAddress}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                          {formData.billFromEmail}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                          {formData.billFromPhone}
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
                    value={dayjs(formData.orderDate)}
                    readOnly
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        InputProps: {
                          readOnly: true,
                        },
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
                          value={formData.billTo}
                          onChange={handleChange}
                          fullWidth
                        />
                        <CustomTextField
                          name="billToAddress"
                          value={formData.billToAddress}
                          onChange={handleChange}
                          fullWidth
                        />
                        <CustomTextField
                          name="billToEmail"
                          value={formData.billToEmail}
                          onChange={handleChange}
                          fullWidth
                        />
                        <CustomTextField
                          name="billToPhone"
                          value={formData.billToPhone}
                          onChange={handleChange}
                          fullWidth
                        />
                      </>
                    ) : (
                      <>
                        <Typography variant="body1" fontWeight={500}>
                          {formData.billTo}
                        </Typography>

                        <Typography variant="body1" color="text.secondary">
                          {formData.billToAddress}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                          {formData.billToEmail}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                          {formData.billToPhone}
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
                    value={formData.dueDate ? dayjs(formData.dueDate) : null}
                    onChange={(newValue) => {
                      if (newValue && dayjs.isDayjs(newValue)) {
                        setFormData((prevData) => ({
                          ...prevData,
                          dueDate: newValue.toDate(),
                        }));
                      }
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

          {/* Orders Table */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography variant="h6">Items Details :</Typography>
          </Stack>

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
                    <TableCell></TableCell>
                    <TableCell>
                      <Typography variant="h6" fontSize="14px">
                        Actions
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {formData.orders.map((order, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <CustomTextField
                          type="text"
                          value={order.itemName}
                          placeholder="Item Name"
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            handleOrderChange(index, "itemName", e.target.value)
                          }
                          fullWidth
                        />
                      </TableCell>
                      <TableCell>
                        <CustomTextField
                          type="number"
                          value={order.unitPrice}
                          placeholder="Unit Price"
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            handleOrderChange(
                              index,
                              "unitPrice",
                              e.target.value
                            )
                          }
                          fullWidth
                        />
                      </TableCell>
                      <TableCell>
                        <CustomTextField
                          type="number"
                          value={order.units}
                          placeholder="Units"
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            handleOrderChange(index, "units", e.target.value)
                          }
                          fullWidth
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body1">
                          {order.unitTotalPrice}
                        </Typography>
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell>
                        <Tooltip title="Add Item">
                          <IconButton onClick={handleAddItem} color="primary">
                            <IconSquareRoundedPlus width={22} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Item">
                          <IconButton
                            disabled={index === 0}
                            onClick={() => handleDeleteItem(index)}
                            color="error"
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

          {/* Totals */}
          <Box p={3} bgcolor="background.default" mt={3} borderRadius={2}>
            <Box maxWidth={400} ml="auto">
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body1" color="text.secondary">
                  Sub Total:
                </Typography>
                <Typography variant="body1">$ {formData.subtotal}</Typography>
              </Box>

              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body1" color="text.secondary">
                  Taxes:
                </Typography>
                <Typography variant="body1">
                  {Math.round(formData.vat)}%
                </Typography>
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
                  $ {Math.round(formData.grandTotal)}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Snackbar
            open={showAlert}
            autoHideDuration={5000}
            onClose={() => setShowAlert(false)}
            anchorOrigin={{ vertical: "top", horizontal: "center" }}
          >
            <Alert severity="success" sx={{ width: "100%" }}>
              Invoice added successfully!
            </Alert>
          </Snackbar>

          <Box display="flex" gap={1} justifyContent="flex-end" mt={2}>
            <Button
              variant="outlined"
              color="error"
              onClick={() => {
                router.push("/apps/invoice/list");
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary">
              Create Invoice
            </Button>
          </Box>
        </Box>
      </form>
    </>
  );
};

export default CreateInvoice;
