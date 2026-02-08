"use client";
import { useContext, useEffect, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  getPaginationRowModel,
  createColumnHelper,
} from "@tanstack/react-table";

import {
  IconTrash,
  IconPencil,
  IconZoom,
  IconArrowUp,
  IconArrowDown,
  IconTransferVertical,
} from "@tabler/icons-react";

import { useRouter } from "next/navigation";
import { BlogContext } from "@/app/context/BlogContext";
import { BlogPostType } from "@/app/(DashboardLayout)/types/apps/blog";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import {
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  MenuItem,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import Image from "next/image";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";

const ManageBlogTable = () => {
  const { posts } = useContext(BlogContext);

  const [tableData, setTableData] = useState<BlogPostType[]>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [rowSelection, setRowSelection] = useState({});
  const [showSearch, setShowSearch] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [actionDeleteId, setActionDeleteId] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 7, // default
  });

  const navigate = useRouter();

  useEffect(() => {
    setTableData(posts);
  }, [posts]);

  const columnHelper = createColumnHelper<BlogPostType>();

  const columns = [
    columnHelper.display({
      id: "select",
      header: ({ table }) => (
        <CustomCheckbox
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <CustomCheckbox
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
    }),

    columnHelper.accessor("title", {
      header: "Title",
      cell: (info) => {
        const { title, coverImg } = info.row.original;
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Image
              src={coverImg}
              alt={title}
              height={50}
              width={50}
              style={{ width: "48px", height: "36px", borderRadius: "4px" }}
            />
            <Typography fontWeight={500} sx={{ whiteSpace: "nowrap" }}>
              {title}
            </Typography>
          </Box>
        );
      },
    }),
    columnHelper.accessor("category", {
      header: "Category",
      cell: (info) => {
        const category = info.getValue() || "Unknown";

        return (
          <Chip
            label={category}
            size="small"
            sx={{
              bgcolor: (theme) =>
                ({
                  Design: theme.palette.info.light,
                  Lifestyle: theme.palette.success.light,
                  Gadget: theme.palette.warning.light,
                  Social: theme.palette.error.light,
                  Health: theme.palette.primary.light,
                }[category] || theme.palette.secondary.light),
              color: (theme) =>
                ({
                  Design: theme.palette.info.main,
                  Lifestyle: theme.palette.success.main,
                  Gadget: theme.palette.warning.main,
                  Social: theme.palette.error.main,
                  Health: theme.palette.primary.main,
                }[category] || theme.palette.secondary.main),
            }}
          />
        );
      },
    }),

    columnHelper.accessor((row) => row.author, {
      id: "authorName",
      header: "Author",
      cell: (info) => (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            whiteSpace: "nowrap",
          }}
        >
          <Avatar src={info.getValue()?.avatar} alt={info.getValue()?.name} />
          <Typography fontWeight={500}>{info.getValue()?.name}</Typography>
        </Box>
      ),
    }),

    columnHelper.accessor("createdAt", {
      header: "Created At",
      cell: (info) => {
        const dateValue = info.getValue();
        return (
          <Typography fontWeight={500}>
            {dateValue ? new Date(dateValue).toLocaleDateString() : "—"}
          </Typography>
        );
      },
    }),
    columnHelper.accessor("published", {
      header: "published",
      cell: ({ row }) => {
        const postId = row.original.id;
        const published = row.original.published;

        const togglePublished = () => {
          const updatedData = tableData.map((item) =>
            item.id === postId ? { ...item, published: !item.published } : item
          );
          setTableData(updatedData);
        };

        return <Switch checked={published} onChange={togglePublished} />;
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const { id } = row.original;

        const handleEdit = () => {
          navigate.push("/apps/blog/edit");
        };

        const handleRowDelete = () => {
          // Programmatically select this row
          setRowSelection((prev) => ({
            ...prev,
            [row.id]: true,
          }));

          // Track this specific row's ID for targeted deletion
          setActionDeleteId(String(id));

          // Show confirmation modal
          setShowConfirm(true);
        };

        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Tooltip title="Edit Blog" placement="bottom">
              <IconButton onClick={handleEdit}>
                <IconPencil size={18} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Delete Blog" placement="bottom">
              <IconButton onClick={handleRowDelete}>
                <IconTrash stroke="error" size={18} />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    }),
  ];
  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      globalFilter,
      rowSelection,
      pagination,
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    globalFilterFn: (row, columnId, filterValue) => {
      return String(row.getValue(columnId))
        .toLowerCase()
        .includes(filterValue.toLowerCase());
    },
  });

  const handleDelete = () => {
    let selectedIds: string[];

    if (actionDeleteId) {
      selectedIds = [String(actionDeleteId)]; // Ensure the ID is a string
    } else {
      selectedIds = table
        .getSelectedRowModel()
        .rows.map((row) => String(row.original.id)); // Convert all ids to strings
    }

    const newData = tableData.filter(
      (item) => !selectedIds.includes(item.id.toString())
    ); // Convert item.id to string if necessary

    setTableData(newData);
    setRowSelection({});
    setShowConfirm(false);
    setActionDeleteId(null); // reset
  };

  return (
    <Card sx={{ padding: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
          mb: 2.5,
        }}
      >
        <Box>
          <Typography variant="h5">Blog List</Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {/* Search */}
          {!showSearch ? (
            <Tooltip title="Search">
              <IconButton onClick={() => setShowSearch(true)}>
                <IconZoom size={18} />
              </IconButton>
            </Tooltip>
          ) : (
            <TextField
              placeholder="Search..."
              value={globalFilter}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setGlobalFilter(e.target.value)
              }
              onBlur={() => {
                if (!globalFilter) setShowSearch(false);
              }}
            />
          )}

          {/* Category Filter */}
          <CustomSelect
            value={categoryFilter}
            onChange={(e: { target: { value: any } }) => {
              const value = e.target.value;
              setCategoryFilter(value);
              table.getColumn("category")?.setFilterValue(value);
            }}
          >
            <MenuItem value="All Categories">All Categories</MenuItem>
            <MenuItem value="Design">Design</MenuItem>
            <MenuItem value="Lifestyle">Lifestyle</MenuItem>
            <MenuItem value="Gadget">Gadget</MenuItem>
            <MenuItem value="Social">Social</MenuItem>
            <MenuItem value="Health">Health</MenuItem>
          </CustomSelect>

          {/* Bulk delete button */}
          {table.getIsAllPageRowsSelected() && (
            <IconButton color="error" onClick={() => setShowConfirm(true)}>
              <IconTrash size={18} />
            </IconButton>
          )}
        </Box>
      </Box>

      <TableContainer
        sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}
      >
        <Table size="small">
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableCell
                    key={header.id}
                    sx={{
                      cursor: header.column.getCanSort()
                        ? "pointer"
                        : "default",
                      fontWeight: 600,
                      fontSize: "14px",
                      textAlign: "left",
                      px: 2,
                      py: 1,
                    }}
                  >
                    {header.isPlaceholder ? null : (
                      <Box onClick={header.column.getToggleSortingHandler()}>
                        <Box display="flex" alignItems="center" gap={1}>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {header.column.getCanSort() && (
                            <>
                              {header.column.getIsSorted() === "asc" && (
                                <IconArrowUp size={14} />
                              )}
                              {header.column.getIsSorted() === "desc" && (
                                <IconArrowDown size={14} />
                              )}
                              {header.column.getIsSorted() === false && (
                                <IconTransferVertical size={14} />
                              )}
                            </>
                          )}
                        </Box>
                      </Box>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={table.getHeaderGroups()[0]?.headers.length || 1}
                  align="center"
                >
                  <Image
                    src="/images/svgs/no-data.webp"
                    alt="No data"
                    height={100}
                    width={100}
                    style={{ marginBottom: 4 }}
                  />
                  <Typography variant="body1" textAlign="center">
                    No data found!
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      sx={{
                        fontSize: "14px",
                        fontWeight: "500",
                        px: 2,
                        py: 1,
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination Controls */}
      {table.getPageCount() > 0 ? (
        <TablePagination
          component="div"
          count={table.getFilteredRowModel().rows.length}
          page={pagination.pageIndex}
          rowsPerPage={pagination.pageSize}
          onPageChange={(_, newPage) => table.setPageIndex(newPage)}
          onRowsPerPageChange={(e) => table.setPageSize(Number(e.target.value))}
          rowsPerPageOptions={[7, 10, 15]}
        />
      ) : null}

      <Dialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        maxWidth="md"
      >
        <DialogContent>
          <Typography>
            Are you sure you want to delete the selected posts?
          </Typography>
          <DialogActions>
            <Button color="primary" onClick={handleDelete}>
              Yes, Delete
            </Button>
            <Button color={"error"} onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
          </DialogActions>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ManageBlogTable;
