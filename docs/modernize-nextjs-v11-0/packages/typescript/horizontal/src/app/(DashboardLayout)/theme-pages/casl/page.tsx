'use client';
import React from 'react';
import { defineAbility, Ability } from '@casl/ability';
import { Can } from '@casl/react';
import Breadcrumb from '@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/app/components/container/PageContainer';
import { Box, Button, List, ListItem, Stack } from '@mui/material';
import ParentCard from '@/app/components/shared/ParentCard';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'CASL',
  },
];

interface ActionSubject {
  action: string;
  subject: string;
}

interface PermissionMap {
  [key: string]: ActionSubject;
}

const permissions: PermissionMap = {
  CanEdit: {
    action: 'Can-edit',
    subject: 'address',
  },
  CanDelete: {
    action: 'Can-delete',
    subject: 'address',
  },
};

interface UserPermissions {
  permissions: Array<keyof PermissionMap>;
}

const users: Record<string, UserPermissions> = {
  Admin: {
    permissions: ['CanEdit', 'CanDelete'],
  },
  Manager: {
    permissions: ['CanEdit'],
  },
  Subscriber: {
    permissions: [],
  },
};

interface Address {
  city: string;
  street: string;
  type: string;
}

const addresses: Address[] = [
  { city: 'New York', street: '5684 Max Summit', type: 'address' },
  { city: 'Manhatten York', street: '5684 Max Summit', type: 'address' },
  { city: 'Canada street York', street: '5684 Max Summit', type: 'address' },
  { city: 'Delhi street', street: '5684 Max Summit', type: 'address' },
  { city: 'UP Chawk', street: '5684 Max Summit', type: 'address' },
];

// Define the type of actions and subjects your app supports
type AppAbility = Ability<[string, string]>;

const RollbaseCASL = () => {
  const [userId, setUserId] = React.useState<keyof typeof users>('Admin');

  const userPermissions = users[userId].permissions.map(
    (permKey) => permissions[permKey]
  );

  const actions = Array.from(
    new Set(userPermissions.map((perm) => perm.action))
  );

  const ability = defineAbility<AppAbility>((can) => {
    userPermissions.forEach((perm) => {
      can(perm.action, perm.subject);
    });
  });

  return (
    <PageContainer title="Rollbase Access" description="this is Rollbase Access">
      <Breadcrumb title="Rollbase Access" items={BCrumb} />

      <ParentCard title="Permission Base Access with CASL">
        <>
          <Stack direction="row" gap={1}>
            {Object.entries(users).map(([id]) => (
              <Button
                key={id}
                variant={userId !== id ? 'outlined' : 'contained'}
                color="primary"
                onClick={() => setUserId(id as keyof typeof users)}
              >
                {id}
              </Button>
            ))}
          </Stack>

          <Box p={2} mt={2} bgcolor="primary.light">
            {users[userId].permissions.map((perm) => (
              <Box key={perm}>{perm}</Box>
            ))}
          </Box>

          <List>
            {addresses.map(({ city, street, type }) => (
              <ListItem key={city}>
                <Stack direction="row" gap={1} alignItems="center">
                  {city}, {street}
                  {actions.map((action) => (
                    <Can I={action} a={type} ability={ability} key={action}>
                      <Button size="small">{action}</Button>
                    </Can>
                  ))}
                </Stack>
              </ListItem>
            ))}
          </List>
        </>
      </ParentCard>
    </PageContainer>
  );
};

export default RollbaseCASL;
