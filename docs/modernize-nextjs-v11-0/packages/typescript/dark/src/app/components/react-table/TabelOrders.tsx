"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  TablePagination,
  IconButton,
  TextField,
  Menu,
  MenuItem,
  Checkbox,
  Typography,
  Grid,
  Box,
  Chip,
  Avatar,
  FormControlLabel,
  InputLabel,
  FormControl,
  Snackbar,
  Tooltip,
  SnackbarContent,
  ListItemIcon,
  ListItemText,
  Card,
  Stack,
  useTheme,
  InputBase,
  Button,
  Divider,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { orderData } from "../../api/react-table/orderData";
import { OrderType } from "@/app/(DashboardLayout)/types/table/order";
import CustomTextField from "../forms/theme-elements/CustomTextField";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs, { Dayjs } from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { KeyboardArrowDown } from "@mui/icons-material";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import CloseIcon from "@mui/icons-material/Close";
import CustomSelect from "../forms/theme-elements/CustomSelect";
import CheckIcon from "@mui/icons-material/Check";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

import CustomCheckbox from "../forms/theme-elements/CustomCheckbox";
import {
  IconArrowDown,
  IconArrowsSort,
  IconArrowUp,
  IconClockFilled,
  IconDownload,
  IconFilter,
  IconPencil,
  IconPremiumRights,
  IconProgressX,
  IconRefresh,
  IconRosetteDiscountCheckFilled,
  IconSearch,
  IconSettings,
  IconTrash,
  IconTruckFilled,
  IconX,
} from "@tabler/icons-react";

export default function OrderTable() {
  const theme = useTheme();

  const statsData = [
    {
      value: "$95.3k",
      label: "Income",
      icon: <IconPremiumRights color={theme.palette.secondary.main} />,
      bgcolor: "secondary.light",
    },
    {
      value: "485",
      label: "Pending",
      icon: <IconClockFilled color={theme.palette.success.main} />,

      bgcolor: "success.light",
    },
    {
      value: "1.4k",
      label: "Completed",
      icon: (
        <IconRosetteDiscountCheckFilled color={theme.palette.warning.main} />
      ),
      bgcolor: "warning.light",
    },

    {
      value: "996",
      label: "Shipping",
      icon: <IconTruckFilled color={theme.palette.info.main} />,
      bgcolor: "info.light",
    },
    {
      value: "2.1k",
      label: "Processing",
      icon: <IconRefresh color={theme.palette.primary.main} />,
      bgcolor: "primary.light",
    },
    {
      value: "1.1k",
      label: "Cancelled",
      icon: <IconProgressX color={theme.palette.error.main} />,
      bgcolor: "error.light",
    },
  ];

  const [data, setData] = useState(orderData);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState({});
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<Dayjs | null>(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState<boolean>(false);
  const [columnMenuAnchorEl, setColumnMenuAnchorEl] =
    useState<null | HTMLElement>(null);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editedRowData, setEditedRowData] = useState<Partial<OrderType>>({});
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState({
    id: "",
    "customer.name": "",
    product: "",
    status: "",
    date: "",
    amount: "",
    address: "",
  });

  const isColumnMenuOpen = Boolean(columnMenuAnchorEl);

  const columnHelper = createColumnHelper<OrderType>();

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "Row Selection",
        header: ({ table }) => (
          <CustomCheckbox
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <CustomCheckbox
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
      }),

      columnHelper.accessor("id", { header: " ID" }),

      columnHelper.accessor("customer.name", {
        header: "CUSTOMER",
        cell: ({ row }) =>
          editingRowId === row.original.id ? (
            <CustomTextField
              size="small"
              value={editedRowData.customer?.name ?? row.original.customer.name}
              onChange={(e: { target: { value: any } }) =>
                setEditedRowData((prev) => ({
                  ...prev,
                  customer: {
                    ...(prev.customer ?? row.original.customer),
                    name: e.target.value,
                  },
                }))
              }
            />
          ) : (
            <Box display="flex" alignItems="center" gap={1}>
              <Avatar
                src={row.original.customer.avatar}
                alt={row.original.customer.name}
                sx={{ width: 24, height: 24 }}
              />
              {row.original.customer.name}
            </Box>
          ),
      }),
      columnHelper.accessor("status", {
        header: "STATUS",
        cell: ({ row }) =>
          editingRowId === row.original.id ? (
            <FormControl fullWidth size="small">
              <CustomSelect
                value={editedRowData.status ?? row.original.status}
                onChange={(e: { target: { value: any } }) =>
                  setEditedRowData((prev) => ({
                    ...prev,
                    status: e.target.value,
                  }))
                }
              >
                {[
                  "Pending",
                  "Shipped",
                  "Completed",
                  "Cancelled",
                  "Processing",
                ].map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </CustomSelect>
            </FormControl>
          ) : (
            <Chip
              label={row.original.status}
              size="small"
              sx={{
                bgcolor: (theme) =>
                  ({
                    Shipped: theme.palette.info.light,
                    Pending: theme.palette.success.light,
                    Completed: theme.palette.warning.light,
                    Cancelled: theme.palette.error.light,
                    Processing: theme.palette.primary.light,
                  }[row.original.status] || theme.palette.secondary.light),
                color: (theme) =>
                  ({
                    Shipped: theme.palette.info.main,
                    Pending: theme.palette.success.main,
                    Completed: theme.palette.warning.main,
                    Cancelled: theme.palette.error.main,
                    Processing: theme.palette.primary.main,
                  }[row.original.status] || theme.palette.secondary.main),
              }}
            />
          ),
      }),

      columnHelper.accessor("date", {
        header: "DATE",
        cell: ({ row }) => {
          if (editingRowId === row.original.id) {
            return (
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  value={dayjs(editedRowData.date ?? row.original.date)}
                  onChange={(newValue) => {
                    if (dayjs.isDayjs(newValue)) {
                      setEditedRowData((prev) => ({
                        ...prev,
                        date: newValue.format("DD-MM-YYYY"),
                      }));
                    }
                  }}
                  slotProps={{
                    textField: { size: "small", fullWidth: true },
                  }}
                />
              </LocalizationProvider>
            );
          } else {
            return (
              <Box>
                <Typography>{row.original.date}</Typography>
                <Typography fontSize="0.75rem" color="text.secondary">
                  {row.original.time}
                </Typography>
              </Box>
            );
          }
        },
      }),
      columnHelper.accessor("amount", {
        header: "AMOUNT",

        cell: ({ row }) =>
          editingRowId === row.original.id ? (
            <CustomTextField
              value={editedRowData.amount ?? row.original.amount}
              size="small"
              onChange={(e: { target: { value: string } }) =>
                setEditedRowData((prev) => ({
                  ...prev,
                  amount: parseFloat(e.target.value),
                }))
              }
            />
          ) : (
            ` $${row.original.amount.toFixed(2)}`
          ),
      }),

      columnHelper.accessor("address", {
        header: "ADDRESS",
        cell: ({ row }) =>
          editingRowId === row.original.id ? (
            <CustomTextField
              size="small"
              fullWidth
              value={editedRowData.address ?? row.original.address}
              onChange={(e: { target: { value: any } }) =>
                setEditedRowData((prev) => ({
                  ...prev,
                  address: e.target.value,
                }))
              }
            />
          ) : (
            row.original.address
          ),
      }),

      columnHelper.display({
        id: "actions",
        header: "ACTIONS",
        cell: ({ row }) => {
          const isEditing = editingRowId === row.original.id;

          return (
            <Box display="flex" alignItems="center">
              {/* Expand/collapse */}
              <IconButton onClick={() => row.toggleExpanded()}>
                {row.getIsExpanded() ? (
                  <KeyboardArrowUpIcon fontSize="small" />
                ) : (
                  <KeyboardArrowDown fontSize="small" />
                )}
              </IconButton>
              {/* If this row is being edited, show check/close */}
              {isEditing ? (
                <>
                  <IconButton
                    onClick={() => {
                      setData((prev) =>
                        prev.map((item) =>
                          item.id === row.original.id
                            ? { ...item, ...editedRowData }
                            : item
                        )
                      );
                      setEditingRowId(null);
                      setEditedRowData({});
                    }}
                  >
                    <CheckIcon color="success" fontSize="small" />
                  </IconButton>
                  <IconButton
                    onClick={() => {
                      setEditingRowId(null);
                      setEditedRowData({});
                    }}
                  >
                    <CloseIcon color="error" fontSize="small" />
                  </IconButton>
                </>
              ) : (
                // Default More menu icon
                <>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRowId(row.original.id);
                      setAnchorEl(e.currentTarget);
                    }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                  <Menu
                    anchorEl={anchorEl}
                    open={
                      Boolean(anchorEl) && selectedRowId === row.original.id
                    }
                    onClose={() => setAnchorEl(null)}
                  >
                    <MenuItem
                      onClick={() => {
                        setEditingRowId(row.original.id);
                        setAnchorEl(null);
                      }}
                    >
                      <ListItemIcon>
                        <IconPencil size={20} />
                      </ListItemIcon>
                      <ListItemText> Edit</ListItemText>
                    </MenuItem>

                    <MenuItem onClick={handleDelete}>
                      <ListItemIcon>
                        <IconTrash stroke="red" size={20} />
                      </ListItemIcon>
                      <ListItemText> Delete</ListItemText>
                    </MenuItem>
                  </Menu>
                </>
              )}
            </Box>
          );
        },
      }),
    ],
    [editingRowId, editedRowData]
  );

  const filteredData = useMemo(() => {
    let formattedDate = null;
    if (dateRange && dayjs.isDayjs(dateRange)) {
      // format DatePicker date as "MM-DD-YYYY" to match your data
      formattedDate = dateRange.format("MM-DD-YYYY");
    }
    return data.filter((item) => {
      return (
        item.id.toLowerCase().includes(columnFilters.id.toLowerCase()) &&
        item.customer.name
          .toLowerCase()
          .includes(columnFilters["customer.name"].toLowerCase()) &&
        item.status
          .toLowerCase()
          .includes(columnFilters.status.toLowerCase()) &&
        item.amount.toString().includes(columnFilters.amount.toLowerCase()) &&
        item.address
          .toLowerCase()
          .includes(columnFilters.address.toLowerCase()) &&
        (!formattedDate || item.date === formattedDate)
      );
    });
  }, [data, columnFilters, dateRange]);

  const handleColumnMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setColumnMenuAnchorEl(event.currentTarget);
  };

  const handleColumnMenuClose = () => {
    setColumnMenuAnchorEl(null);
  };

  const handleDownload = () => {
    const headers = [
      "Order ID",
      "Customer Name",
      "Status",
      "Date",
      "Amount",
      "Payment Status",
      "Address",
    ];
    const rows = data.map((item) => [
      item.id,
      item.customer.name,
      item.status,
      item.date,
      item.amount.toFixed(2),

      item.address,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((e) => e.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "order-data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedRowId(null);
  };

  const handleEdit = () => {
    const rowToEdit = data.find((item) => item.id === selectedRowId);
    if (rowToEdit) {
      setEditingRowId(rowToEdit.id);
      setEditedRowData(rowToEdit);
    }
    handleCloseMenu();
  };

  const handleDelete = () => {
    setData((prev) => prev.filter((item) => item.id !== selectedRowId));
    setSnackbarMsg("Order deleted");
    setSnackbarOpen(true);
    handleCloseMenu();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGlobalFilter(e.target.value);
  };

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { globalFilter, columnVisibility, sorting },

    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: true,
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
  });

  const pagination = table.getState().pagination;

  return (
    <Card>
      <Stack spacing={3} p={2}>
        <Typography variant="h6">Orders History</Typography>
        <Box display="flex" gap={2} flexWrap="wrap" width="100%">
          {statsData.map((stat, index) => (
            <Card
              elevation={0}
              sx={{
                backgroundColor: stat.bgcolor,
                p: 1.5,
                flex: {
                  xs: "1 1 calc(50% - 8px)", // 2 cards per row on xs screens (100–700px)
                  sm: "1 1 calc(33.33% - 8px)", // 3 cards per row on small screens (≥600px)
                  md: "1 1 0",
                },
              }}
              key={index}
            >
              <Stack direction="row" justifyContent="space-between">
                <Box>
                  <Typography fontSize={16} fontWeight={600}>
                    {stat.value}
                  </Typography>
                  <Typography fontSize={11} color="text.secondary">
                    {stat.label}
                  </Typography>
                </Box>
                <Box width={20} height={20} fontSize={16}>
                  {stat.icon}
                </Box>
              </Stack>
            </Card>
          ))}
        </Box>

        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          width="100%"
        >
          <Typography variant="h6">Orders Table</Typography>

          <Box display="flex" alignItems="center">
            {/* Search Toggle */}
            {!showSearch ? (
              <IconButton onClick={() => setShowSearch(true)}>
                <IconSearch size={16} />
              </IconButton>
            ) : (
              <InputBase
                value={globalFilter}
                onChange={handleSearchChange}
                autoFocus
                placeholder="Search..."
                onBlur={() => {
                  if (!globalFilter) setShowSearch(false);
                }}
                sx={{
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  px: 1,
                  fontSize: 14,
                }}
              />
            )}

            {/* Filter toggle */}
            <IconButton
              onClick={() => setFilterAnchorEl((prev) => !prev)}
              aria-label="toggle filters"
            >
              {filterAnchorEl ? <IconX size={16} /> : <IconFilter size={16} />}
            </IconButton>

            {/* Column toggle */}
            <IconButton
              onClick={handleColumnMenuOpen}
              aria-label="toggle columns"
            >
              <IconSettings size={16} />
            </IconButton>

            <IconButton onClick={handleDownload}>
              <IconDownload size={16} />
            </IconButton>

            {/* Delete */}
            {table.getSelectedRowModel().rows.length > 0 && (
              <Tooltip
                title={`Delete (${table.getSelectedRowModel().rows.length})`}
              >
                <IconButton
                  color="error"
                  onClick={() => {
                    const selectedIds = table
                      .getSelectedRowModel()
                      .rows.map((r) => r.original.id);
                    setData((prev) =>
                      prev.filter((item) => !selectedIds.includes(item.id))
                    );
                    table.resetRowSelection();
                    setSnackbarMsg(`Deleted ${selectedIds.length} order(s)`);
                    setSnackbarOpen(true);
                  }}
                >
                  <IconTrash size={16} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Filter section */}
        {filterAnchorEl && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <CustomTextField
                label="Order ID"
                variant="outlined"
                size="small"
                fullWidth
                value={columnFilters.id}
                onChange={(e: { target: { value: any } }) =>
                  setColumnFilters((prev) => ({
                    ...prev,
                    id: e.target.value,
                  }))
                }
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <CustomTextField
                label="Customer Name"
                variant="outlined"
                size="small"
                fullWidth
                value={columnFilters["customer.name"]}
                onChange={(e: { target: { value: any } }) =>
                  setColumnFilters((prev) => ({
                    ...prev,
                    "customer.name": e.target.value,
                  }))
                }
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <CustomSelect
                  value={columnFilters.status}
                  onChange={(e: { target: { value: any } }) =>
                    setColumnFilters((prev) => ({
                      ...prev,
                      status: e.target.value,
                    }))
                  }
                  label="Status"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Shipped">Shipped</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                  <MenuItem value="Cancelled">Cancelled</MenuItem>
                  <MenuItem value="Processing">Processing</MenuItem>
                </CustomSelect>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <CustomTextField
                label="Amount"
                variant="outlined"
                size="small"
                fullWidth
                value={columnFilters.amount}
                onChange={(e: { target: { value: any } }) =>
                  setColumnFilters((prev) => ({
                    ...prev,
                    amount: e.target.value,
                  }))
                }
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <CustomTextField
                label="Address"
                variant="outlined"
                size="small"
                fullWidth
                value={columnFilters.address}
                onChange={(e: { target: { value: any } }) =>
                  setColumnFilters((prev) => ({
                    ...prev,
                    address: e.target.value,
                  }))
                }
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Filter Date"
                  value={dateRange}
                  onChange={(newValue) => setDateRange(newValue as Dayjs)}
                  slotProps={{
                    textField: {
                      size: "small",
                      variant: "outlined",
                      fullWidth: true,
                    },
                  }}
                />
              </LocalizationProvider>
            </Grid>
          </Grid>
        )}

        {/* Table Container */}

        <TableContainer
          sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}
        >
          <Table size="small">
            <TableHead>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isSortable = header.column.getCanSort();

                    return (
                      <TableCell
                        key={header.id}
                        onClick={
                          isSortable
                            ? header.column.getToggleSortingHandler()
                            : undefined
                        }
                        sx={{
                          cursor: isSortable ? "pointer" : "default",
                          fontWeight: 600,
                          fontSize: "14px",
                          backgroundColor: "divider",
                        }}
                      >
                        <Box display="flex" alignItems="center">
                          {/* Header label */}
                          <Typography variant="body2" fontWeight={600}>
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </Typography>

                          {/* Sorting icon */}
                          {isSortable && (
                            <Box ml={1} textAlign="center">
                              {header.column.getCanSort() &&
                                (header.column.getIsSorted() === "asc" ? (
                                  <IconArrowUp size={14} />
                                ) : header.column.getIsSorted() === "desc" ? (
                                  <IconArrowDown size={14} />
                                ) : (
                                  <IconArrowsSort size={12} />
                                ))}
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableHead>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <TableRow>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        sx={{ fontSize: "14px", fontWeight: "500" }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  {row.getIsExpanded() && (
                    <TableRow
                      sx={{
                        backgroundColor: "blackColor.black5",
                      }}
                    >
                      <TableCell colSpan={columns.length}>
                        <Box p={2}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            Customer orders:
                          </Typography>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>SKU</TableCell>

                                <TableCell>Quantity</TableCell>
                                <TableCell>Price</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {row.original.products.map((product, idx) => (
                                <TableRow key={idx}>
                                  <TableCell>
                                    <Box
                                      display="flex"
                                      alignItems="center"
                                      gap={1}
                                    >
                                      <Avatar
                                        src={product.image}
                                        alt={product.name}
                                        variant="rounded"
                                        sx={{ width: 30, height: 30 }}
                                      />
                                      <Typography variant="body2">
                                        {product.name}
                                      </Typography>
                                    </Box>
                                  </TableCell>
                                  <TableCell>{product.sku}</TableCell>
                                  <TableCell>{product.quantity}</TableCell>
                                  <TableCell>
                                    ${product.price.toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          <Divider />
                          <Box display="flex" justifyContent="flex-end" mt={3}>
                            <Box>
                              <Stack spacing={1}>
                                <Box
                                  display="flex"
                                  justifyContent="space-between"
                                  minWidth={200}
                                >
                                  <Typography variant="body2">
                                    Delivery Fee:
                                  </Typography>
                                  <Typography variant="body2" fontWeight="bold">
                                    $10.00
                                  </Typography>
                                </Box>
                                <Box
                                  display="flex"
                                  justifyContent="space-between"
                                  minWidth={200}
                                >
                                  <Typography variant="body2">Tax:</Typography>
                                  <Typography variant="body2" fontWeight="bold">
                                    $5.00
                                  </Typography>
                                </Box>

                                <Box
                                  display="flex"
                                  justifyContent="space-between"
                                  minWidth={200}
                                >
                                  <Typography variant="body1" color="primary">
                                    Total:
                                  </Typography>
                                  <Typography variant="body1" color="primary">
                                    $866.00
                                  </Typography>
                                </Box>
                              </Stack>

                              {/* Buttons */}
                              <Stack
                                direction="row"
                                spacing={1}
                                justifyContent="flex-end"
                                mt={2}
                              >
                                <Button
                                  variant="contained"
                                  size="small"
                                  sx={{
                                    px: 1,
                                    minWidth: "auto",
                                    fontSize: 10,
                                    backgroundColor: "blackColor.black10",
                                    color: "blackColor.black100",
                                  }}
                                >
                                  View
                                </Button>
                                <Button
                                  variant="contained"
                                  size="small"
                                  sx={{ px: 1, minWidth: "auto", fontSize: 10 }}
                                >
                                  Invoice
                                </Button>
                              </Stack>
                            </Box>
                          </Box>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          component="div"
          count={table.getFilteredRowModel().rows.length}
          page={pagination.pageIndex}
          rowsPerPage={pagination.pageSize}
          onPageChange={(_, newPage) => table.setPageIndex(newPage)}
          onRowsPerPageChange={(e) => table.setPageSize(Number(e.target.value))}
        />
      </Stack>

      {/* column visibility */}
      <Box display="flex" flexWrap="wrap">
        <Menu
          anchorEl={columnMenuAnchorEl}
          open={isColumnMenuOpen}
          onClose={handleColumnMenuClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Box
            sx={{
              minWidth: 180,
              display: "flex",
              flexDirection: "column",
              gap: 0,
              p: 1,
            }}
          >
            <Typography
              variant="subtitle2"
              gutterBottom
              sx={{
                fontSize: 14,
                color: "blackColor.black80",
                textTransform: "capitalize",
              }}
            >
              Toggle Columns
            </Typography>
            {table.getAllLeafColumns().map((col) => (
              <FormControlLabel
                key={col.id}
                control={
                  <Checkbox
                    checked={col.getIsVisible()}
                    onChange={col.getToggleVisibilityHandler()}
                    size="small"
                  />
                }
                label={
                  <Typography
                    sx={{
                      fontSize: 14,
                      color: "blackColor.black80",
                      textTransform: "lowercase",
                    }}
                  >
                    {typeof col.columnDef.header === "string"
                      ? col.columnDef.header
                      : col.id}
                  </Typography>
                }
              />
            ))}
          </Box>
        </Menu>
      </Box>

      {/* menu edit , delete action  */}
      <Menu
        id="long-menu"
        keepMounted
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <IconPencil size={20} />
          </ListItemIcon>
          <ListItemText> Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <ListItemIcon>
            <IconTrash color="red" size={20} />
          </ListItemIcon>
          <ListItemText> Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* delete msg */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <SnackbarContent
          sx={{
            backgroundColor: "success.main",
            display: "flex",
            alignItems: "center",
          }}
          message={
            <Box display="flex" alignItems="center" gap={1}>
              <CheckCircleOutlineIcon sx={{ color: "white" }} />
              <Typography variant="body2" sx={{ color: "white" }}>
                {snackbarMsg}
              </Typography>
            </Box>
          }
        />
      </Snackbar>
    </Card>
  );
}
