"use client";

import React, { useMemo, useState } from "react";
import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    useTheme,
    Avatar,
    Typography,
    Chip,
    IconButton,
    Menu,
    MenuItem,
    Stack,
    TablePagination,
    Select,
    ListItemIcon,
    ListItemText,
    Card,
    InputBase,
    Tooltip,
    FormControlLabel,
    Button,
} from "@mui/material";
import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    flexRender,
    getFilteredRowModel,
    getSortedRowModel,
} from "@tanstack/react-table";
import { MoreVert, Check, Close } from "@mui/icons-material";
import { userData } from "@/app/api/react-table/userData";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import CustomCheckbox from "../forms/theme-elements/CustomCheckbox";
import CustomTextField from "../forms/theme-elements/CustomTextField";
import CustomSelect from "../forms/theme-elements/CustomSelect";

import {
    IconSettings, IconDownload,
    IconArrowsDownUp, IconSearch, IconArrowUp, IconPencil, IconTrash
} from '@tabler/icons-react';


export default function UserTable() {
    const [globalFilter, setGlobalFilter] = useState("");
    const [anchorEl, setAnchorEl] = useState(null);

    const [selectedUserId, setSelectedUserId] = useState(null);
    const [roleFilter, setRoleFilter] = useState("All");
    const [data, setData] = useState(userData);

    const [editingUserId, setEditingUserId] = useState(null);
    const [editedUser, setEditedUser] = useState(null);

    const [showNewUserRow, setShowNewUserRow] = useState(false);

    const [menuAnchorEl, setMenuAnchorEl] = useState(null);
    const [menuUser, setMenuUser] = useState(null);

    const [newUser, setNewUser] = useState({
        name: "",
        role: "User",
        age: 0,
        phone: "",
        email: "",
        avatar: "/images/profile/user-8.png",
    });
    const [showDeleteMsg, setShowDeleteMsg] = useState(false);

    const theme = useTheme();

    const filteredData = useMemo(() => {
        return roleFilter === "All"
            ? data
            : data.filter((user) => user.role === roleFilter);
    }, [roleFilter, data]);

    const columns = useMemo(
        () => [
            {
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
            },
            {
                accessorKey: "name",
                header: "Name",
                cell: ({ row }) => {
                    const isEditing = editingUserId === row.original.id;
                    return isEditing ? (
                        <CustomTextField
                            value={editedUser?.name ?? row.original.name}
                            onChange={(e) =>
                                setEditedUser({
                                    ...editedUser,
                                    name: e.target.value,
                                })
                            }
                            size="small"
                        />
                    ) : (
                        <Box display="flex" alignItems="center" gap={1}>
                            <Avatar
                                src={row.original.avatar}
                                alt={row.original.name}
                                sx={{ width: 24, height: 24 }}
                            />
                            {row.original.name}
                        </Box>
                    );
                },
            },
            {
                accessorKey: "role",
                header: "Role",
                cell: ({ row }) => {
                    const isEditing = editingUserId === row.original.id;
                    return isEditing ? (
                        <Select
                            value={editedUser?.role ?? row.original.role}
                            onChange={(e) =>
                                setEditedUser({
                                    ...editedUser,
                                    role: e.target.value,
                                })
                            }
                            size="small"
                            fullWidth
                        >
                            <MenuItem value="Admin">Admin</MenuItem>
                            <MenuItem value="User">User</MenuItem>
                            <MenuItem value="Superadmin">Superadmin</MenuItem>
                            <MenuItem value="Moderator">Moderator</MenuItem>
                            <MenuItem value="Author">Author</MenuItem>
                        </Select>
                    ) : (
                        <Chip
                            label={row.original.role}
                            size="small"
                            sx={{
                                bgcolor: (theme) =>
                                    row.original.role === "Admin"
                                        ? theme.palette.info.light
                                        : row.original.role === "User"
                                            ? theme.palette.success.light
                                            : row.original.role === "Superadmin"
                                                ? theme.palette.warning.light
                                                : row.original.role === "Moderator"
                                                    ? theme.palette.error.light
                                                    : row.original.role === "Author"
                                                        ? theme.palette.primary.light
                                                        : theme.palette.primary.light,

                                color: (theme) =>
                                    row.original.role === "Admin"
                                        ? theme.palette.info.main
                                        : row.original.role === "User"
                                            ? theme.palette.success.main
                                            : row.original.role === "Superadmin"
                                                ? theme.palette.warning.main
                                                : row.original.role === "Moderator"
                                                    ? theme.palette.error.main
                                                    : row.original.role === "Author"
                                                        ? theme.palette.primary.main
                                                        : theme.palette.primary.main,
                            }}
                        />
                    );
                },
            },
            {
                accessorKey: "age",
                header: "Age",
                cell: ({ row }) => {
                    const isEditing = editingUserId === row.original.id;
                    return isEditing ? (
                        <CustomTextField
                            type="number"
                            value={editedUser?.age ?? row.original.age}
                            onChange={(e) =>
                                setEditedUser({
                                    ...editedUser,
                                    age: e.target.value,
                                })
                            }
                            size="small"
                        />
                    ) : (
                        row.original.age
                    );
                },
            },
            {
                accessorKey: "phone",
                header: "Phone",
                cell: ({ row }) => {
                    const isEditing = editingUserId === row.original.id;
                    return isEditing ? (
                        <CustomTextField
                            value={editedUser?.phone ?? row.original.phone}
                            onChange={(e) =>
                                setEditedUser({
                                    ...editedUser,
                                    phone: e.target.value,
                                })
                            }
                            size="small"
                        />
                    ) : (
                        row.original.phone
                    );
                },
            },
            {
                accessorKey: "email",
                header: "Email",
                cell: ({ row }) => {
                    const isEditing = editingUserId === row.original.id;
                    return isEditing ? (
                        <CustomTextField
                            value={editedUser?.email ?? row.original.email}
                            onChange={(e) =>
                                setEditedUser({
                                    ...editedUser,
                                    email: e.target.value,
                                })
                            }
                            size="small"
                        />
                    ) : (
                        row.original.email
                    );
                },
            },
            {
                id: "actions",
                header: "Actions",
                cell: ({ row }) => {
                    const isEditing = editingUserId === row.original.id;

                    if (isEditing) {
                        return (
                            <Stack direction="row">
                                <IconButton size="small" onClick={handleSaveEdit}>
                                    <Check color="success" />
                                </IconButton>
                                <IconButton size="small" onClick={handleCancelEdit}>
                                    <Close color="error" />
                                </IconButton>
                            </Stack>
                        );
                    }

                    return (
                        <>
                            <Box>
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setMenuAnchorEl(e.currentTarget);
                                        setMenuUser(row.original);
                                    }}
                                >
                                    <MoreVert fontSize="small" />
                                </IconButton>
                            </Box>
                        </>
                    );
                },
            },
        ],
        [anchorEl, selectedUserId, editingUserId, editedUser]
    );
    const handleDelete = (id) => {
        const updated = data.filter((user) => user.id !== id);
        setData(updated);
        setAnchorEl(null);
        setSelectedUserId(null);
        if (editingUserId === id) {
            setEditingUserId(null);
            setEditedUser(null);
        }

        setShowDeleteMsg(true);
    };

    const handleEditClick = (user) => {
        setEditingUserId(user.id);
        setEditedUser({ ...user });
    };

    const handleCancelEdit = () => {
        setEditingUserId(null);
        setEditedUser(null);
    };

    const handleSaveEdit = () => {
        if (!editedUser || !editingUserId) return;
        const updated = data.map((user) =>
            user.id === editingUserId ? { ...user, ...editedUser } : user
        );
        setData(updated);
        setEditingUserId(null);
        setEditedUser(null);
    };

    const table = useReactTable({
        data: filteredData,
        columns,
        state: {
            globalFilter,
        },
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        enableSorting: true,
    });

    const handleDownload = () => {
        const headers = ["User ID", "User Name", "Role", "Age", "Phone", "Email"];
        const rows = data.map((item) => [
            item.id,
            item.name,
            item.role,
            item.age,
            item.phone,
            item.email,
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map((e) => e.join(",")),
        ].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "user-data.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const [showSearch, setShowSearch] = useState(false);

    const [columnMenuAnchorEl, setColumnMenuAnchorEl] =
        useState(null);

    const handleSearchChange = (e) => {
        setGlobalFilter(e.target.value);
    };

    const handleColumnMenuOpen = (event) => {
        event.stopPropagation();
        setColumnMenuAnchorEl(event.currentTarget);
    };

    const handleColumnMenuClose = () => {
        setColumnMenuAnchorEl(null);
    };

    const isColumnMenuOpen = columnMenuAnchorEl;

    return (
        <Card>
            <Stack spacing={3} p={1}>
                <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    width="100%"
                >
                    <Typography variant="h6">User Table</Typography>

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

                        {/* Column toggle */}
                        <IconButton
                            onClick={handleColumnMenuOpen}
                            aria-label="toggle columns"
                        >
                            <IconSettings size={18} />
                        </IconButton>

                        <IconButton onClick={handleDownload}>
                            <IconDownload size={18} />
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
                                    }}
                                >
                                    <IconTrash size={18} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                </Box>

                <Stack justifyContent="space-between" direction={{ xs: "column", sm: "row" }} m={0} spacing={1} >
                    <Box
                        sx={{
                            display: "flex",
                            flexWrap: "wrap",
                            py: 0.25,
                            px: 1,
                            bgcolor: theme.palette.grey[100],
                        }}
                    >
                        {["All", "Admin", "User", "Superadmin", "Moderator", "Author"].map(
                            (role) => {
                                const isSelected = roleFilter === role;

                                return (
                                    <Box
                                        key={role}
                                        onClick={() => setRoleFilter(role)}
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            px: 2,
                                            cursor: "pointer",
                                            fontSize: 13,
                                            minHeight: "20px",
                                            bgcolor: isSelected ? "primary.main" : "transparent",
                                            color: isSelected ? "white" : "blackColor.black100",
                                            fontWeight: isSelected ? "600" : "500",
                                        }}
                                    >
                                        {role}
                                    </Box>
                                );
                            }
                        )}
                    </Box>

                    <Box>
                        <Button
                            variant="contained"
                            onClick={() => setShowNewUserRow(true)}
                            sx={{
                                backgroundColor: "primary.main",
                                color: "white",
                                width: { xs: "100%", sm: "auto" },
                            }}
                        >
                            Create User
                        </Button>
                    </Box>
                </Stack>

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
                                            onClick={header.column.getToggleSortingHandler()}
                                            sx={{
                                                cursor: header.column.getCanSort()
                                                    ? "pointer"
                                                    : "default",

                                                fontWeight: "600",
                                                fontSize: "14px",
                                                backgroundColor: "blackColor.black5",
                                            }}
                                        >
                                            {flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}

                                            <Box component="span" sx={{ ml: 1 }} textAlign="center">
                                                {header.column.getCanSort() &&
                                                    (header.column.getIsSorted() === "asc" ? (
                                                        <IconArrowUp
                                                            size={14}

                                                        />
                                                    ) : header.column.getIsSorted() === "desc" ? (
                                                        <IconArrowNarrowDown
                                                            size={14}

                                                        />
                                                    ) : (
                                                        <IconArrowsDownUp
                                                            size={12}

                                                        />
                                                    ))}
                                            </Box>
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHead>
                        <TableBody>
                            {/* Add New Row */}
                            {showNewUserRow && (
                                <TableRow>
                                    <TableCell>
                                        <CustomCheckbox size="small" />
                                    </TableCell>
                                    <TableCell>
                                        <CustomTextField
                                            size="small"
                                            value={newUser.name}
                                            onChange={(e) =>
                                                setNewUser((prev) => ({
                                                    ...prev,
                                                    name: e.target.value,
                                                }))
                                            }
                                            placeholder="Name"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <CustomSelect
                                            size="small"
                                            value={newUser.role}
                                            onChange={(e) =>
                                                setNewUser((prev) => ({
                                                    ...prev,
                                                    role: e.target.value,
                                                }))
                                            }
                                            fullWidth
                                        >
                                            <MenuItem value="Admin">Admin</MenuItem>
                                            <MenuItem value="User">User</MenuItem>
                                            <MenuItem value="Superadmin">Superadmin</MenuItem>
                                            <MenuItem value="Moderator">Moderator</MenuItem>
                                            <MenuItem value="Author">Author</MenuItem>
                                        </CustomSelect>
                                    </TableCell>
                                    <TableCell>
                                        <CustomTextField
                                            type="number"
                                            size="small"
                                            value={newUser.age}
                                            onChange={(e) =>
                                                setNewUser((prev) => ({
                                                    ...prev,
                                                    age: Number(e.target.value),
                                                }))
                                            }
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <CustomTextField
                                            size="small"
                                            value={newUser.phone}
                                            onChange={(e) =>
                                                setNewUser((prev) => ({
                                                    ...prev,
                                                    phone: e.target.value,
                                                }))
                                            }
                                            placeholder="Phone"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <CustomTextField
                                            size="small"
                                            value={newUser.email}
                                            onChange={(e) =>
                                                setNewUser((prev) => ({
                                                    ...prev,
                                                    email: e.target.value,
                                                }))
                                            }
                                            placeholder="Email"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Stack direction="row">
                                            <IconButton
                                                size="small"
                                                onClick={() => {
                                                    const id = crypto.randomUUID();
                                                    setData((prev) => [
                                                        ...prev,
                                                        { ...newUser, id },
                                                    ]);
                                                    setNewUser({
                                                        name: "",
                                                        role: "User",
                                                        age: 0,
                                                        phone: "",
                                                        email: "",
                                                        avatar: "",
                                                    });
                                                    setShowNewUserRow(false);
                                                }}
                                                disabled={!newUser.name || !newUser.email}
                                            >
                                                {newUser.name && newUser.email ? (
                                                    <Check color="success" />
                                                ) : (
                                                    <Check sx={{ color: "gray" }} />
                                                )}
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => {
                                                    setShowNewUserRow(false);
                                                    setNewUser({
                                                        name: "",
                                                        role: "User",
                                                        age: 0,
                                                        phone: "",
                                                        email: "",
                                                        avatar: "",
                                                    });
                                                }}
                                            >
                                                <Close color="error" />
                                            </IconButton>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            )}

                            {table.getRowModel().rows.map((row) => (
                                <React.Fragment key={`fragment-${row.id}`}>
                                    <TableRow key={row.id}>
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
                                </React.Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Box mt={2} display="flex" justifyContent="flex-end">
                    <TablePagination
                        component="div"
                        count={filteredData.length}
                        page={table.getState().pagination.pageIndex}
                        onPageChange={(_, newPage) => table.setPageIndex(newPage)}
                        rowsPerPage={table.getState().pagination.pageSize}
                        onRowsPerPageChange={(e) => {
                            table.setPageSize(Number(e.target.value));
                        }}
                        rowsPerPageOptions={[5, 10, 25]}
                    />
                </Box>

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
                                        <CustomCheckbox
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
            </Stack>

            <Menu
                anchorEl={menuAnchorEl}
                open={Boolean(menuAnchorEl)}
                onClose={() => {
                    setMenuAnchorEl(null);
                    setMenuUser(null);
                }}
                anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "right",
                }}
                transformOrigin={{
                    vertical: "top",
                    horizontal: "right",
                }}
            >
                <MenuItem
                    onClick={() => {
                        if (menuUser) handleEditClick(menuUser);
                        setMenuAnchorEl(null);
                    }}
                >
                    <ListItemIcon>
                        <IconPencil size={20} />
                    </ListItemIcon>
                    <ListItemText> Edit</ListItemText>
                </MenuItem>

                <MenuItem
                    onClick={() => {
                        if (menuUser) handleDelete(menuUser.id);
                        setMenuAnchorEl(null);
                    }}
                >
                    <ListItemIcon>
                        <IconTrash color="red" size={20} />
                    </ListItemIcon>
                    <ListItemText> Delete</ListItemText>
                </MenuItem>
            </Menu>
            <Snackbar
                open={showDeleteMsg}
                autoHideDuration={3000}
                onClose={() => setShowDeleteMsg(false)}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert
                    onClose={() => setShowDeleteMsg(false)}
                    severity="success"
                    icon={<CheckCircleIcon fontSize="small" />}
                    sx={{ width: "100%" }}
                >
                    User deleted successfully.
                </Alert>
            </Snackbar>
        </Card>
    );
}
