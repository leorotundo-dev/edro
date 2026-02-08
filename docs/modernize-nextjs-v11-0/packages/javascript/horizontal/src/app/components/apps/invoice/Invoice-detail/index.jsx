"use client";
import React, { useState, useEffect, useContext, useRef } from "react";
import {
  Box,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  MenuItem,
  Select,
  Divider,
  Chip,
  IconButton,
  Stack,
  styled,
  ButtonProps,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from "@mui/material";

import jsPDF from "jspdf";

import { usePathname } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";

import { InvoiceContext } from "@/app/context/InvoiceContext/index";

import { useReactToPrint } from "react-to-print";
import { toPng } from "html-to-image";
import Logo from "@/app/(DashboardLayout)/layout/shared/logo/Logo";
import {
  IconCloudDown,
  IconEye,
  IconPencil,
  IconPrinter,
  IconSend,
} from "@tabler/icons-react";


const InvoiceDetail = () => {
  const { invoices } = useContext(InvoiceContext);
  const [selectedInvoice, setSelectedInvoice] = useState(
    null
  );
  const [openSendDialog, setOpenSendDialog] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const contentRef = useRef(null);

  const reactToPrintFn = useReactToPrint({ contentRef });

  useEffect(() => {
    // Set the first invoice as the default selected invoice initially
    if (invoices.length > 0) {
      setSelectedInvoice(invoices[0]);
    }
  }, [invoices]);

  // Get the last part of the URL path as the billFrom parameter
  const title = usePathname();
  const getId = title.split("/").pop();

  // Find the invoice that matches the billFrom extracted from the URL
  useEffect(() => {
    if (getId) {
      const invoice = invoices.find((p) =>p.id === getId);
      if (invoice) {
        setSelectedInvoice(invoice);
      }
    }
  }, [getId, invoices]);

  if (!selectedInvoice) {
    return <div>Loading...</div>;
  }

  const handleDownloadPdf = async () => {
    const node = contentRef.current;

    if (node) {
      node.classList.add("no-scrollbar");
      const dataUrl = await toPng(node);
      const pdf = new jsPDF();
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`invoice-${selectedInvoice.id}.pdf`);
    }
  };

  const safeFormatDate = (date) => {
    if (!date) return "";
    if (typeof date === "string") {
      return format(new Date(date), "dd MMMM yyyy");
    }
    return format(date, "dd MMMM yyyy");
  };

  const ToolbarButton = styled(Button)(({ theme }) => ({
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.grey[100],
    fontWeight: 500,
    minWidth: "auto",
    transition: "all 0.3s ease",

    "&:hover": {
      color: theme.palette.primary.main,
      backgroundColor: theme.palette.primary.light,
    },
  }));

  return (
    <>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        bgcolor="background.default"
        p={1}
        borderRadius="10px"
        mb={3}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <ToolbarButton
            component={Link}
            href={`/apps/invoice/edit/${selectedInvoice.id}`}
            startIcon={<IconPencil size={20} />}
          >
            Edit Invoice
          </ToolbarButton>
          <Divider orientation="vertical" flexItem />
          <ToolbarButton
            onClick={reactToPrintFn}
            startIcon={<IconEye size={20} />}
          >
            View Invoice
          </ToolbarButton>
          <Divider orientation="vertical" flexItem />
          <ToolbarButton
            onClick={handleDownloadPdf}
            startIcon={<IconCloudDown size={20} />}
          >
            Download Invoice
          </ToolbarButton>
          <Divider orientation="vertical" flexItem />
          <ToolbarButton
            onClick={reactToPrintFn}
            startIcon={<IconPrinter size={20} />}
          >
            Print Invoice
          </ToolbarButton>{" "}
          <Divider orientation="vertical" flexItem />
          <ToolbarButton
            onClick={() => setOpenSendDialog(true)}
            startIcon={<IconSend size={20} />}
          >
            Send Invoice
          </ToolbarButton>
          <Dialog
            open={openSendDialog}
            onClose={() => setOpenSendDialog(false)}
          >
            <DialogTitle>Send Invoice</DialogTitle>
            <DialogContent>
              Are you sure you want to send this invoice to{" "}
              <strong>{selectedInvoice.billToEmail}</strong>?
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenSendDialog(false)}>Cancel</Button>
              <Button
                variant="contained"
                onClick={() => setOpenSendDialog(false)}
              >
                Send
              </Button>
            </DialogActions>
          </Dialog>
          <Snackbar
            open={snackbarOpen}
            autoHideDuration={4000}
            onClose={() => setSnackbarOpen(false)}
            message="Invoice sent successfully!"
          />
        </Box>
      </Box>
      <Divider></Divider>

      <Box ref={contentRef}>
        {/* Header Actions */}
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
            <Typography variant="h5"># {selectedInvoice.id}</Typography>
          </Box>

          <Logo />

          <Box textAlign="right">
            <Chip
              label={selectedInvoice.status}
              size="small"
              sx={{
                backgroundColor:
                  selectedInvoice.status === "Overdue"
                    ? "error.light"
                    : selectedInvoice.status === "Paid"
                    ? "success.light"
                    : selectedInvoice.status === "Draft"
                    ? "info.light"
                    : selectedInvoice.status === "Pending"
                    ? "warning.light"
                    : "purple.light",
                color:
                  selectedInvoice.status === "Overdue"
                    ? "error.main"
                    : selectedInvoice.status === "Paid"
                    ? "success.main"
                    : selectedInvoice.status === "Draft"
                    ? "info.main"
                    : selectedInvoice.status === "Pending"
                    ? "warning.main"
                    : "purple.main",
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
            <Paper variant="outlined" sx={{}}>
              <Box p={2} display="flex" flexDirection="column" gap="4px">
                <Typography variant="body1" fontWeight={500}>
                  {selectedInvoice.billFrom}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {selectedInvoice.billFromAddress}
                </Typography>

                <Typography variant="body1" color="text.secondary">
                  {selectedInvoice.billFromEmail}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {selectedInvoice.billFromPhone}
                </Typography>
              </Box>
            </Paper>
            <Box mt={2} px={1}>
              <Typography fontWeight="bold">Date create</Typography>
              <Typography>
                {safeFormatDate(selectedInvoice.orderDate)}
              </Typography>
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
              <Box p={2} display="flex" flexDirection="column" gap="4px">
                <Typography
                  variant="body1"
                  fontWeight={500}
                  color="blackColor.black100"
                >
                  {selectedInvoice.billTo}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {selectedInvoice.billToAddress}
                </Typography>

                <Typography variant="body1" color="text.secondary">
                  {selectedInvoice.billToEmail}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {selectedInvoice.billToPhone}
                </Typography>
              </Box>
            </Paper>
            <Box mt={2} px={1}>
              <Typography fontWeight="bold">Due date</Typography>
              <Typography>
                {safeFormatDate(selectedInvoice.dueDate) || "no dueDate"}{" "}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Box>
          {/* Product Table */}
          <Paper variant="outlined">
            <TableContainer
              sx={{
                overflow: "visible !important",
              }}
            >
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
                        Unit
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="h6" fontSize="14px">
                        Total Cost
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedInvoice.orders.map((order, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Typography variant="body1">
                          {order.itemName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body1">
                          {order.unitPrice}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body1">{order.units}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body1">
                          {order.unitTotalPrice}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Box p={3} mt={3} borderRadius={2}>
            <Box maxWidth={400} ml="auto">
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body1" color="text.secondary">
                  Sub Total:
                </Typography>
                <Typography variant="body1">
                  ${selectedInvoice.totalCost}
                </Typography>
              </Box>

              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body1" color="text.secondary">
                  Taxes:
                </Typography>
                <Typography variant="body1">{selectedInvoice.vat}%</Typography>
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
                  ${selectedInvoice.grandTotal}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Paper
            elevation={0}
            sx={{
              mt: 4,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              <Box component="span" fontWeight="bold" color="text.primary">
                Notes:
              </Box>{" "}
              Thank you for your business. If you have any questions regarding
              this invoice, feel free to contact us.
            </Typography>
          </Paper>
        </Box>
      </Box>
    </>
  );
};
export default InvoiceDetail;
