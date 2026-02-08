"use client";
import React, { useContext, useEffect, useState } from "react";
import { InvoiceContext } from "@/app/context/InvoiceContext/index";
import {
  Table,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tooltip,
  IconButton,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Box,
  Typography,
  Grid,
  Stack,
  Chip,
  LinearProgress,
  useTheme,
  TablePagination,
  TextField,
  InputBase,
  InputAdornment,
} from "@mui/material";
import Link from "next/link";
import {
  IconAlignBoxCenterBottom,
  IconClock,
  IconEdit,
  IconEye,
  IconFolderDown,
  IconTrash,
  IconWallet,
} from "@tabler/icons-react";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import { usePathname } from "next/navigation";
import { mutate } from "swr";
import BlankCard from "@/app/components/shared/BlankCard";
import { IconSearch } from "@tabler/icons-react";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { Dayjs } from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { format } from "date-fns";

function InvoiceList() {
  const { invoices, deleteInvoice } = useContext(InvoiceContext);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("All");
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState<boolean>(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState<boolean>(false);

  const [orderDateFilter, setOrderDateFilter] = useState<Dayjs | null>(null);
  const [dueDateFilter, setDueDateFilter] = useState<Dayjs | null>(null);

  const [activeStatus, setActiveStatus] = useState("All");

  const theme = useTheme();
  // Handle status filter change
  const handleClick = (status: string) => {
    setActiveTab(status);
    setActiveStatus(status);
  };

  // Calculate the counts for different statuses
  const Paid = invoices.filter(
    (t: { status: string }) => t.status === "Paid"
  ).length;
  const Overdue = invoices.filter(
    (t: { status: string }) => t.status === "Overdue"
  ).length;
  const Pending = invoices.filter(
    (t: { status: string }) => t.status === "Pending"
  ).length;
  const Draft = invoices.filter(
    (t: { status: string }) => t.status === "Draft"
  ).length;

  // Toggle all checkboxes
  const toggleSelectAll = () => {
    const selectAllValue = !selectAll;
    setSelectAll(selectAllValue);
    if (selectAllValue) {
      setSelectedProducts(invoices.map((invoice) => invoice.id));
    } else {
      setSelectedProducts([]);
    }
  };

  // Toggle individual product selection
  const toggleSelectProduct = (productId: number) => {
    const index = selectedProducts.indexOf(productId);
    if (index === -1) {
      setSelectedProducts([...selectedProducts, productId]);
    } else {
      setSelectedProducts(
        selectedProducts.filter((id: number) => id !== productId)
      );
    }
  };

  // Handle opening delete confirmation dialog
  const handleDelete = () => {
    setOpenDeleteDialog(true);
  };

  // Handle confirming deletion of selected products
  const handleConfirmDelete = async () => {
    for (const productId of selectedProducts) {
      await deleteInvoice(productId);
    }
    setSelectedProducts([]);
    setSelectAll(false);
    setOpenDeleteDialog(false);
  };

  // Handle closing delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  // Reset Contacts on browser refresh
  const location = usePathname();
  const handleResetTickets = async () => {
    const response = await fetch("/api/invoice", {
      method: "GET",
      headers: {
        broserRefreshed: "true",
      },
    });
    const result = await response.json();
    await mutate("/api/invoice");
  };

  useEffect(() => {
    const isPageRefreshed = sessionStorage.getItem("isPageRefreshed");
    if (isPageRefreshed === "true") {
      console.log("page refreshed");
      sessionStorage.removeItem("isPageRefreshed");
      handleResetTickets();
    }
  }, [location]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.setItem("isPageRefreshed", "true");
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      (invoice.billFrom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.billTo.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (activeTab === "All" || invoice.status === activeTab);

    const invoiceOrderDate = dayjs(invoice.orderDate);
    const invoiceDueDate = dayjs(invoice.dueDate);

    const matchesOrderDate = orderDateFilter
      ? invoiceOrderDate.isSame(orderDateFilter, "day")
      : true;

    const matchesDueDate = dueDateFilter
      ? invoiceDueDate.isSame(dueDateFilter, "day")
      : true;

    return matchesSearch && matchesOrderDate && matchesDueDate;
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // reset to first page
  };

  const safeFormatDate = (date: string | Date) => {
    if (!date) return "";
    if (typeof date === "string") {
      return format(new Date(date), "dd MMMM yyyy");
    }
    return format(date, "dd MMMM yyyy");
  };

  const statusTabs = [
    {
      key: "All",
      label: "All Invoices",
      count: invoices.length,
      bgColor: "purple.light",
      textColor: "purple.main",
    },
    {
      key: "Paid",
      label: "Paid",
      count: Paid,
      bgColor: "success.light",
      textColor: "success.main",
    },
    {
      key: "Overdue",
      label: "Overdue",
      count: Overdue,
      bgColor: "error.light",
      textColor: "error.main",
    },
    {
      key: "Pending",
      label: "Pending",
      count: Pending,
      bgColor: "warning.light",
      textColor: "warning.main",
    },
    {
      key: "Draft",
      label: "Draft",
      count: Draft,
      bgColor: "info.light",
      textColor: "info.main",
    },
  ];

  return (
    <Box display="flex" gap={3} flexDirection="column">
      <Box>
        <Grid container spacing={3}>
          <Grid
            size={{
              xs: 12,
              sm: 6,
              lg: 3,
            }}
          >
            <BlankCard>
              <Box p="20px">
                <Box display="flex" justifyContent="space-between">
                  <Box display="flex" gap={0.5} flexDirection="column">
                    <Typography variant="h3" color="blackColor.black100">
                      $2,050
                    </Typography>
                    <Typography variant="body1" color="blackColor.black60">
                      Overdue amount
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      color="warning"
                      value={50}
                      sx={{
                        height: 6,
                        mt: 2,
                        backgroundColor: theme.palette.warning.light,
                        "& .MuiLinearProgress-bar": {
                          backgroundColor: theme.palette.warning.main,
                        },
                      }}
                    />
                  </Box>

                  <Box
                    width={48}
                    height={48}
                    bgcolor="warning.light"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Typography
                      color="warning.main"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <IconWallet size={20} />
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </BlankCard>
          </Grid>
          <Grid
            size={{
              xs: 12,
              sm: 6,
              lg: 3,
            }}
          >
            <BlankCard>
              <Box p="20px">
                <Box display="flex" justifyContent="space-between">
                  <Box display="flex" gap={0.5} flexDirection="column">
                    <Typography variant="h3" color="blackColor.black100">
                      $4,600
                    </Typography>
                    <Typography variant="body1" color="blackColor.black60">
                      Drafted totals
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      color="warning"
                      value={20}
                      sx={{
                        height: 6,
                        mt: 2,
                        backgroundColor: theme.palette.secondary.light,
                        "& .MuiLinearProgress-bar": {
                          backgroundColor: theme.palette.secondary.main,
                        },
                      }}
                    />
                  </Box>

                  <Box
                    width={48}
                    height={48}
                    bgcolor="secondary.light"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Typography
                      color="secondary.main"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <IconAlignBoxCenterBottom size={20} />
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </BlankCard>
          </Grid>
          <Grid
            size={{
              xs: 12,
              sm: 6,
              lg: 3,
            }}
          >
            <BlankCard>
              <Box p="20px">
                <Box display="flex" justifyContent="space-between">
                  <Box display="flex" gap={0.5} flexDirection="column">
                    <Typography variant="h3" color="blackColor.black100">
                      $2,050
                    </Typography>
                    <Typography variant="body1" color="blackColor.black60">
                      Unpaid totals
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      color="warning"
                      value={80}
                      sx={{
                        height: 6,
                        mt: 2,
                        backgroundColor: theme.palette.error.light,
                        "& .MuiLinearProgress-bar": {
                          backgroundColor: theme.palette.error.main,
                        },
                      }}
                    />
                  </Box>

                  <Box
                    width={48}
                    height={48}
                    bgcolor="error.light"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Typography
                      color="error.main"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <IconFolderDown size={20} />
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </BlankCard>
          </Grid>
          <Grid
            size={{
              xs: 12,
              sm: 6,
              lg: 3,
            }}
          >
            <BlankCard>
              <Box p="20px">
                <Box display="flex" justifyContent="space-between">
                  <Box display="flex" gap={0.5} flexDirection="column">
                    <Typography variant="h3" color="blackColor.black100">
                      7 days
                    </Typography>
                    <Typography variant="body1" color="blackColor.black60">
                      Average paid time
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      color="warning"
                      value={10}
                      sx={{
                        height: 6,
                        mt: 2,
                        backgroundColor: theme.palette.success.light,
                        "& .MuiLinearProgress-bar": {
                          backgroundColor: theme.palette.success.main,
                        },
                      }}
                    />
                  </Box>

                  <Box
                    width={48}
                    height={48}
                    bgcolor="success.light"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Typography
                      color="success.main"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <IconClock size={20} />
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </BlankCard>
          </Grid>
        </Grid>
      </Box>
      <Box>
        <BlankCard>
          <Box p={3}>
            <Box display="flex" justifyContent="space-between">
              <Box display="flex" gap={2}>
                {statusTabs.map((tab) => (
                  <Box
                    key={tab.key}
                    display="flex"
                    gap={1}
                    alignItems="center"
                    onClick={() => handleClick(tab.key)}
                    sx={{
                      cursor: "pointer",
                      padding: "4px 8px",
                      borderRadius: "8px",
                      transition: "all 0.2s ease-in-out",
                      backgroundColor:
                        activeStatus === tab.key
                          ? `${theme.palette.grey[200]}`
                          : "transparent",
                      "&:hover": {
                        backgroundColor: `${theme.palette.grey[100]}`,
                      },
                    }}
                  >
                    <Typography
                      variant="body1"
                      fontWeight={activeStatus === tab.key ? 600 : 500}
                      color={
                        activeStatus === tab.key
                          ? "blackColor.black100"
                          : "blackColor.black40"
                      }
                      sx={{
                        transition: "color 0.2s ease-in-out",
                      }}
                    >
                      {tab.label}
                    </Typography>
                    <Chip
                      label={tab.count}
                      size="small"
                      sx={{
                        backgroundColor: tab.bgColor,
                        color: tab.textColor,
                        borderRadius: "50%",
                        fontSize: "14px",
                        fontWeight: 400,
                        transition: "transform 0.2s ease-in-out",
                      }}
                    />
                  </Box>
                ))}
              </Box>
              <Box display="flex" gap={1}>
                {selectAll && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleDelete}
                    startIcon={<IconTrash width={18} />}
                  >
                    Delete All
                  </Button>
                )}
                <Button
                  variant="contained"
                  color="primary"
                  component={Link}
                  href="/apps/invoice/create"
                >
                  Create an Invoice
                </Button>
              </Box>
            </Box>
            <Stack
              mt={3}
              justifyContent="space-between"
              direction={{ xs: "column", sm: "row" }}
              spacing={{ xs: 1, sm: 2, md: 4 }}
            >
              <Box display="flex" gap={1}>
                {/* <TextField
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                /> */}
                <TextField
                  id="outlined-search"
                  placeholder="Search Invoices"
                  size="small"
                  type="search"
                  variant="outlined"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="end">
                          <IconSearch size={"16"} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    value={orderDateFilter}
                    onChange={(newValue) => {
                      setOrderDateFilter(newValue ? dayjs(newValue) : null);
                    }}
                    slotProps={{
                      textField: {
                        InputProps: {
                          style: { height: "36px" },
                        },
                      },
                    }}
                  />
                </LocalizationProvider>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    value={dueDateFilter}
                    onChange={(newValue) =>
                      setDueDateFilter(newValue ? dayjs(newValue) : null)
                    }
                    slotProps={{
                      textField: {
                        InputProps: {
                          style: { height: "36px" },
                        },
                      },
                    }}
                  />
                </LocalizationProvider>
              </Box>
            </Stack>

            {filteredInvoices.length === 0 ? (
              <Typography color="text.secondary" mt={2}>
                🚫 No invoices found for selected date(s).
              </Typography>
            ) : (
              <Box
                mt={3}
                sx={{
                  overflowX: "auto",
                }}
              >
                <Table sx={{ whiteSpace: { xs: "nowrap", md: "unset" } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <CustomCheckbox
                          checked={selectAll}
                          onChange={toggleSelectAll}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="h6" fontSize="14px">
                          Id
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="h6" fontSize="14px">
                          Bill From
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="h6" fontSize="14px">
                          Bill To
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="h6" fontSize="14px">
                          Total Cost
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="h6" fontSize="14px">
                          Status
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="h6" fontSize="14px">
                          Created
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="h6" fontSize="14px">
                          Due
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="h6" fontSize="14px">
                          Action
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredInvoices
                      .slice(
                        page * rowsPerPage,
                        page * rowsPerPage + rowsPerPage
                      )
                      .map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell padding="checkbox">
                            <CustomCheckbox
                              checked={selectedProducts.includes(invoice.id)}
                              onChange={() => toggleSelectProduct(invoice.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography fontSize="14px">
                              {invoice.id}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography fontSize="14px">
                              {invoice.billFrom}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography fontSize="14px">
                              {invoice.billTo}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography fontSize="14px">
                              {Math.round(invoice.totalCost)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={invoice.status}
                              size="small"
                              sx={{
                                backgroundColor:
                                  invoice.status === "Overdue"
                                    ? "error.light"
                                    : invoice.status === "Paid"
                                    ? "success.light"
                                    : invoice.status === "Draft"
                                    ? "info.light"
                                    : invoice.status === "Pending"
                                    ? "warning.light"
                                    : "purple.light",
                                color:
                                  invoice.status === "Overdue"
                                    ? "error.main"
                                    : invoice.status === "Paid"
                                    ? "success.main"
                                    : invoice.status === "Draft"
                                    ? "info.main"
                                    : invoice.status === "Pending"
                                    ? "warning.main"
                                    : "purple.main",
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography fontSize="14px">
                              {safeFormatDate(invoice.orderDate)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography fontSize="14px">
                              {safeFormatDate(invoice.dueDate) || "no dueDate"}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="Edit Invoice">
                              <IconButton
                                color="success"
                                component={Link}
                                href={`/apps/invoice/edit/${invoice.id}`}
                              >
                                <IconEdit width={22} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="View Invoice">
                              <IconButton
                                color="primary"
                                component={Link}
                                href={`/apps/invoice/detail/${invoice.id}`}
                              >
                                <IconEye width={22} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Invoice">
                              <IconButton
                                color="error"
                                onClick={() => {
                                  setSelectedProducts([invoice.id]);
                                  handleDelete();
                                }}
                              >
                                <IconTrash width={22} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25]}
                  component="div"
                  count={filteredInvoices.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                />
              </Box>
            )}
            <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
              <DialogTitle>Confirm Delete</DialogTitle>
              <DialogContent>
                Are you sure you want to delete selected invoices?
              </DialogContent>
              <DialogActions>
                <Button variant="contained" onClick={handleCloseDeleteDialog}>
                  Cancel
                </Button>
                <Button
                  color="error"
                  variant="outlined"
                  onClick={handleConfirmDelete}
                >
                  Delete
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        </BlankCard>
      </Box>
    </Box>
  );
}
export default InvoiceList;
