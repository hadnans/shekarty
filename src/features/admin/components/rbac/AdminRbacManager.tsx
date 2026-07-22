'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Users, Plus, Pencil, Trash2, Lock, CheckCircle2 } from 'lucide-react';
import { type Lang, type Role, type Permission, type AdminUser } from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import { adminApi } from '@/services/admin-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import StatusBadge from '../shared/StatusBadge';

// ============================================
// TYPES (local)
// ============================================

interface RoleWithDetails extends Role {
  isSystem?: boolean;
  permissionsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface PermissionGrouped {
  id: string;
  name: string;
  nameEn: string;
  nameAr: string;
  module: string;
  action: string;
}

interface AdminUserWithRoles extends AdminUser {
  roles: Array<{ id: string; name: string; nameEn: string; nameAr: string }>;
}

// ============================================
// ADMIN RBAC MANAGER
// ============================================

interface AdminRbacManagerProps {
  lang: Lang;
}

export default function AdminRbacManager({ lang }: AdminRbacManagerProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('roles');

  // ============================================
  // ROLES TAB STATE
  // ============================================
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
  const [isDeleteRoleOpen, setIsDeleteRoleOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleWithDetails | null>(null);

  const [roleForm, setRoleForm] = useState({
    name: '',
    nameEn: '',
    nameAr: '',
    description: '',
    permissionIds: [] as string[],
  });

  const resetRoleForm = () => {
    setRoleForm({ name: '', nameEn: '', nameAr: '', description: '', permissionIds: [] });
  };

  // ============================================
  // ADMIN USERS TAB STATE
  // ============================================
  const [isCreateAdminOpen, setIsCreateAdminOpen] = useState(false);
  const [isEditAdminOpen, setIsEditAdminOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUserWithRoles | null>(null);

  const [adminForm, setAdminForm] = useState({
    email: '',
    password: '',
    nameEn: '',
    nameAr: '',
    phone: '',
    roleIds: [] as string[],
    isActive: true,
  });

  const resetAdminForm = () => {
    setAdminForm({ email: '', password: '', nameEn: '', nameAr: '', phone: '', roleIds: [], isActive: true });
  };

  // ============================================
  // QUERIES
  // ============================================

  const { data: rolesResponse, isLoading: isRolesLoading } = useQuery({
    queryKey: ['admin-rbac-roles'],
    queryFn: () => adminApi.getRoles(),
  });

  const { data: permissionsResponse, isLoading: isPermissionsLoading } = useQuery({
    queryKey: ['admin-rbac-permissions'],
    queryFn: () => adminApi.getPermissions(),
  });

  const { data: adminsResponse, isLoading: isAdminsLoading } = useQuery({
    queryKey: ['admin-rbac-admins'],
    queryFn: () => adminApi.getAdminUsers(),
  });

  const roles: RoleWithDetails[] = (rolesResponse?.data as RoleWithDetails[]) || [];
  const permissions: PermissionGrouped[] = (permissionsResponse?.data as unknown as { permissions: PermissionGrouped[] })?.permissions || [];
  const groupedPermissions = (permissionsResponse?.data as unknown as { grouped: Record<string, PermissionGrouped[]> })?.grouped || {};
  const admins: AdminUserWithRoles[] = (adminsResponse?.data as AdminUserWithRoles[]) || [];

  // ============================================
  // MUTATIONS
  // ============================================

  const createRoleMutation = useMutation({
    mutationFn: (data: typeof roleForm) => adminApi.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-rbac-roles'] });
      setIsCreateRoleOpen(false);
      resetRoleForm();
    },
  });

  const createAdminMutation = useMutation({
    mutationFn: (data: typeof adminForm) => adminApi.createAdminUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-rbac-admins'] });
      setIsCreateAdminOpen(false);
      resetAdminForm();
    },
  });

  // ============================================
  // ROLE HANDLERS
  // ============================================

  const handleCreateRole = () => {
    createRoleMutation.mutate(roleForm);
  };

  const handleEditRole = () => {
    if (!selectedRole) return;
    // Use PATCH endpoint via adminApi update methods (would need to add updateRole method)
    setIsEditRoleOpen(false);
    resetRoleForm();
    queryClient.invalidateQueries({ queryKey: ['admin-rbac-roles'] });
  };

  const handleDeleteRole = () => {
    if (!selectedRole) return;
    // Use DELETE endpoint via adminApi (would need to add deleteRole method)
    setIsDeleteRoleOpen(false);
    setSelectedRole(null);
    queryClient.invalidateQueries({ queryKey: ['admin-rbac-roles'] });
  };

  const openEditRole = (role: RoleWithDetails) => {
    setSelectedRole(role);
    setRoleForm({
      name: role.name,
      nameEn: role.nameEn,
      nameAr: role.nameAr,
      description: role.description || '',
      permissionIds: role.permissions || [],
    });
    setIsEditRoleOpen(true);
  };

  const openDeleteRole = (role: RoleWithDetails) => {
    setSelectedRole(role);
    setIsDeleteRoleOpen(true);
  };

  const togglePermission = (permId: string) => {
    setRoleForm((prev) => {
      const ids = prev.permissionIds.includes(permId)
        ? prev.permissionIds.filter((id) => id !== permId)
        : [...prev.permissionIds, permId];
      return { ...prev, permissionIds: ids };
    });
  };

  // ============================================
  // ADMIN USER HANDLERS
  // ============================================

  const handleCreateAdmin = () => {
    createAdminMutation.mutate(adminForm);
  };

  const openEditAdmin = (adminUser: AdminUserWithRoles) => {
    setSelectedAdmin(adminUser);
    setAdminForm({
      email: adminUser.email,
      password: '',
      nameEn: adminUser.nameEn,
      nameAr: adminUser.nameAr || '',
      phone: adminUser.phone || '',
      roleIds: adminUser.roles.map((r) => r.id),
      isActive: adminUser.isActive,
    });
    setIsEditAdminOpen(true);
  };

  const toggleRoleForAdmin = (roleId: string) => {
    setAdminForm((prev) => {
      const ids = prev.roleIds.includes(roleId)
        ? prev.roleIds.filter((id) => id !== roleId)
        : [...prev.roleIds, roleId];
      return { ...prev, roleIds: ids };
    });
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="size-5 text-muted-foreground" />
        <h2 className="text-xl font-bold text-foreground">{t(lang, 'adminRBAC')}</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full max-w-md">
          <TabsTrigger value="roles" className="flex items-center gap-1.5">
            <Lock className="size-4" />
            {t(lang, 'adminRoles')}
          </TabsTrigger>
          <TabsTrigger value="admins" className="flex items-center gap-1.5">
            <Users className="size-4" />
            {t(lang, 'adminUsers')}
          </TabsTrigger>
        </TabsList>

        {/* ============================================
            ROLES TAB
            ============================================ */}
        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Lock className="size-4" />
                {t(lang, 'adminRoles')}
              </CardTitle>
              <Dialog open={isCreateRoleOpen} onOpenChange={(open) => { setIsCreateRoleOpen(open); if (!open) resetRoleForm(); }}>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{t(lang, 'adminCreate')} {t(lang, 'adminRoles')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>{t(lang, 'adminNameEn')} (Key)</Label>
                      <Input
                        value={roleForm.name}
                        onChange={(e) => setRoleForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., admin_super"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t(lang, 'adminNameEn')}</Label>
                      <Input
                        value={roleForm.nameEn}
                        onChange={(e) => setRoleForm((prev) => ({ ...prev, nameEn: e.target.value }))}
                        placeholder="Super Admin"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t(lang, 'adminNameAr')}</Label>
                      <Input
                        value={roleForm.nameAr}
                        onChange={(e) => setRoleForm((prev) => ({ ...prev, nameAr: e.target.value }))}
                        placeholder="مدير عام"
                        dir="rtl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t(lang, 'adminDescription')}</Label>
                      <Input
                        value={roleForm.description}
                        onChange={(e) => setRoleForm((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Role description"
                      />
                    </div>
                    {/* Permission checkboxes grouped by module */}
                    <div className="space-y-3">
                      <Label>{t(lang, 'adminPermissions')}</Label>
                      {isPermissionsLoading ? (
                        <div className="space-y-2">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-6 bg-muted animate-pulse rounded" />
                          ))}
                        </div>
                      ) : Object.entries(groupedPermissions).map(([module, perms]) => (
                        <div key={module} className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {module}
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {perms.map((perm: PermissionGrouped) => (
                              <div key={perm.id} className="flex items-center gap-2">
                                <Checkbox
                                  checked={roleForm.permissionIds.includes(perm.id)}
                                  onCheckedChange={() => togglePermission(perm.id)}
                                  id={`perm-${perm.id}`}
                                />
                                <label htmlFor={`perm-${perm.id}`} className="text-sm text-foreground cursor-pointer">
                                  {perm.action}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateRoleOpen(false)}>
                      {t(lang, 'cancel')}
                    </Button>
                    <Button
                      onClick={handleCreateRole}
                      disabled={createRoleMutation.isPending || !roleForm.name || !roleForm.nameEn}
                    >
                      {createRoleMutation.isPending ? t(lang, 'loading') : t(lang, 'adminCreate')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
                <Button size="sm" className="gap-1.5" onClick={() => setIsCreateRoleOpen(true)}>
                  <Plus className="size-4" />
                  {t(lang, 'adminCreate')}
                </Button>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isRolesLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : roles.length > 0 ? (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>{t(lang, 'adminNameEn')}</TableHead>
                        <TableHead>{t(lang, 'adminNameAr')}</TableHead>
                        <TableHead>{t(lang, 'adminDescription')}</TableHead>
                        <TableHead>{t(lang, 'adminSystem')}</TableHead>
                        <TableHead>{t(lang, 'adminPermissions')}</TableHead>
                        <TableHead>{t(lang, 'adminActions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roles.map((role) => (
                        <TableRow key={role.id}>
                          <TableCell>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">{role.nameEn}</p>
                              <p className="text-xs text-muted-foreground">{role.name}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-foreground" dir="rtl">
                            {role.nameAr}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-48 truncate">
                            {role.description}
                          </TableCell>
                          <TableCell>
                            {role.isSystem ? (
                              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300">
                                <Lock className="size-3 mr-1" />
                                {lang === 'ar' ? 'نظام' : 'System'}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-950/30 dark:text-gray-400">
                                {lang === 'ar' ? 'مخصص' : 'Custom'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {role.permissionsCount ?? (role.permissions?.length ?? 0)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                onClick={() => openEditRole(role)}
                                aria-label={t(lang, 'adminEdit')}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              {!role.isSystem && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-destructive"
                                  onClick={() => openDeleteRole(role)}
                                  aria-label={t(lang, 'adminDelete')}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                  {t(lang, 'adminNoItems')}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit Role Dialog */}
          <Dialog open={isEditRoleOpen} onOpenChange={(open) => { setIsEditRoleOpen(open); if (!open) resetRoleForm(); }}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t(lang, 'adminEdit')} {t(lang, 'adminRoles')}: {selectedRole?.nameEn}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>{t(lang, 'adminNameEn')}</Label>
                  <Input
                    value={roleForm.nameEn}
                    onChange={(e) => setRoleForm((prev) => ({ ...prev, nameEn: e.target.value }))}
                    disabled={selectedRole?.isSystem}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t(lang, 'adminNameAr')}</Label>
                  <Input
                    value={roleForm.nameAr}
                    onChange={(e) => setRoleForm((prev) => ({ ...prev, nameAr: e.target.value }))}
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t(lang, 'adminDescription')}</Label>
                  <Input
                    value={roleForm.description}
                    onChange={(e) => setRoleForm((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                {/* Permission checkboxes grouped by module */}
                <div className="space-y-3">
                  <Label>{t(lang, 'adminPermissions')}</Label>
                  {Object.entries(groupedPermissions).map(([module, perms]) => (
                    <div key={module} className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {module}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {perms.map((perm: PermissionGrouped) => (
                          <div key={perm.id} className="flex items-center gap-2">
                            <Checkbox
                              checked={roleForm.permissionIds.includes(perm.id)}
                              onCheckedChange={() => togglePermission(perm.id)}
                              id={`edit-perm-${perm.id}`}
                            />
                            <label htmlFor={`edit-perm-${perm.id}`} className="text-sm text-foreground cursor-pointer">
                              {perm.action}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditRoleOpen(false)}>
                  {t(lang, 'cancel')}
                </Button>
                <Button onClick={handleEditRole}>
                  {t(lang, 'adminSave')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Role AlertDialog */}
          <AlertDialog open={isDeleteRoleOpen} onOpenChange={setIsDeleteRoleOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t(lang, 'adminDelete')} {t(lang, 'adminRoles')}: {selectedRole?.nameEn}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {selectedRole?.isSystem
                    ? (lang === 'ar' ? 'لا يمكن حذف دور النظام.' : 'System roles cannot be deleted.')
                    : (lang === 'ar' ? 'هذا الإجراء لا يمكن التراجع عنه. سيتم حذف الدور نهائياً.' : 'This action cannot be undone. The role will be permanently deleted.')
                  }
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t(lang, 'cancel')}</AlertDialogCancel>
                {!selectedRole?.isSystem && (
                  <AlertDialogAction onClick={handleDeleteRole} className="bg-destructive text-destructive-foreground">
                    {t(lang, 'adminDelete')}
                  </AlertDialogAction>
                )}
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        {/* ============================================
            ADMIN USERS TAB
            ============================================ */}
        <TabsContent value="admins" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="size-4" />
                {t(lang, 'adminUsers')}
              </CardTitle>
              <Dialog open={isCreateAdminOpen} onOpenChange={(open) => { setIsCreateAdminOpen(open); if (!open) resetAdminForm(); }}>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{t(lang, 'adminCreate')} {t(lang, 'adminUsers')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>{t(lang, 'adminEmail')}</Label>
                      <Input
                        type="email"
                        value={adminForm.email}
                        onChange={(e) => setAdminForm((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="admin@ggh.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t(lang, 'adminPassword')}</Label>
                      <Input
                        type="password"
                        value={adminForm.password}
                        onChange={(e) => setAdminForm((prev) => ({ ...prev, password: e.target.value }))}
                        placeholder="Min 8 characters"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t(lang, 'adminNameEn')}</Label>
                      <Input
                        value={adminForm.nameEn}
                        onChange={(e) => setAdminForm((prev) => ({ ...prev, nameEn: e.target.value }))}
                        placeholder="Admin Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t(lang, 'adminNameAr')}</Label>
                      <Input
                        value={adminForm.nameAr}
                        onChange={(e) => setAdminForm((prev) => ({ ...prev, nameAr: e.target.value }))}
                        placeholder="اسم المدير"
                        dir="rtl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t(lang, 'adminPhone')}</Label>
                      <Input
                        value={adminForm.phone}
                        onChange={(e) => setAdminForm((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="+20 100 000 0000"
                      />
                    </div>
                    {/* Role assignment checkboxes */}
                    <div className="space-y-3">
                      <Label>{t(lang, 'adminRoles')}</Label>
                      {isRolesLoading ? (
                        <div className="space-y-2">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-6 bg-muted animate-pulse rounded" />
                          ))}
                        </div>
                      ) : roles.map((role) => (
                        <div key={role.id} className="flex items-center gap-2">
                          <Checkbox
                            checked={adminForm.roleIds.includes(role.id)}
                            onCheckedChange={() => toggleRoleForAdmin(role.id)}
                            id={`admin-role-${role.id}`}
                          />
                          <label htmlFor={`admin-role-${role.id}`} className="text-sm text-foreground cursor-pointer flex items-center gap-1.5">
                            {lang === 'ar' ? role.nameAr : role.nameEn}
                            {role.isSystem && <Lock className="size-3 text-amber-500" />}
                          </label>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={adminForm.isActive}
                        onCheckedChange={(checked) => setAdminForm((prev) => ({ ...prev, isActive: checked }))}
                      />
                      <Label>{t(lang, 'adminActive')}</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateAdminOpen(false)}>
                      {t(lang, 'cancel')}
                    </Button>
                    <Button
                      onClick={handleCreateAdmin}
                      disabled={createAdminMutation.isPending || !adminForm.email || !adminForm.password || !adminForm.nameEn}
                    >
                      {createAdminMutation.isPending ? t(lang, 'loading') : t(lang, 'adminCreate')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
                <Button size="sm" className="gap-1.5" onClick={() => setIsCreateAdminOpen(true)}>
                  <Plus className="size-4" />
                  {t(lang, 'adminCreate')}
                </Button>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isAdminsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : admins.length > 0 ? (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>{t(lang, 'adminEmail')}</TableHead>
                        <TableHead>{t(lang, 'adminNameEn')}</TableHead>
                        <TableHead>{t(lang, 'adminPhone')}</TableHead>
                        <TableHead>{t(lang, 'adminRoles')}</TableHead>
                        <TableHead>{t(lang, 'adminStatus')}</TableHead>
                        <TableHead>{t(lang, 'adminLastLogin')}</TableHead>
                        <TableHead>{t(lang, 'adminActions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {admins.map((adminUser) => (
                        <TableRow key={adminUser.id}>
                          <TableCell className="text-sm font-medium text-foreground">
                            {adminUser.email}
                          </TableCell>
                          <TableCell>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                {lang === 'ar' ? adminUser.nameAr : adminUser.nameEn}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {adminUser.phone}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-48">
                              {adminUser.roles.map((role) => (
                                <Badge key={role.id} variant="secondary" className="text-xs">
                                  {lang === 'ar' ? role.nameAr : role.nameEn}
                                </Badge>
                              ))}
                              {adminUser.roles.length === 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {lang === 'ar' ? 'لا دور' : 'No roles'}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              status={adminUser.isActive ? 'active' : 'inactive'}
                              lang={lang}
                            />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {adminUser.lastLoginAt
                              ? new Date(adminUser.lastLoginAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-EG')
                              : (lang === 'ar' ? 'لم يسجل' : 'Never')
                            }
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => openEditAdmin(adminUser)}
                              aria-label={t(lang, 'adminEdit')}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                  {t(lang, 'adminNoItems')}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit Admin User Dialog */}
          <Dialog open={isEditAdminOpen} onOpenChange={(open) => { setIsEditAdminOpen(open); if (!open) resetAdminForm(); }}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t(lang, 'adminEdit')} {t(lang, 'adminUsers')}: {selectedAdmin?.email}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>{t(lang, 'adminNameEn')}</Label>
                  <Input
                    value={adminForm.nameEn}
                    onChange={(e) => setAdminForm((prev) => ({ ...prev, nameEn: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t(lang, 'adminNameAr')}</Label>
                  <Input
                    value={adminForm.nameAr}
                    onChange={(e) => setAdminForm((prev) => ({ ...prev, nameAr: e.target.value }))}
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t(lang, 'adminPhone')}</Label>
                  <Input
                    value={adminForm.phone}
                    onChange={(e) => setAdminForm((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                {/* Role assignment checkboxes */}
                <div className="space-y-3">
                  <Label>{t(lang, 'adminRoles')}</Label>
                  {roles.map((role) => (
                    <div key={role.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={adminForm.roleIds.includes(role.id)}
                        onCheckedChange={() => toggleRoleForAdmin(role.id)}
                        id={`edit-admin-role-${role.id}`}
                      />
                      <label htmlFor={`edit-admin-role-${role.id}`} className="text-sm text-foreground cursor-pointer flex items-center gap-1.5">
                        {lang === 'ar' ? role.nameAr : role.nameEn}
                        {role.isSystem && <Lock className="size-3 text-amber-500" />}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={adminForm.isActive}
                    onCheckedChange={(checked) => setAdminForm((prev) => ({ ...prev, isActive: checked }))}
                  />
                  <Label>{t(lang, 'adminActive')}</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditAdminOpen(false)}>
                  {t(lang, 'cancel')}
                </Button>
                <Button onClick={() => { setIsEditAdminOpen(false); queryClient.invalidateQueries({ queryKey: ['admin-rbac-admins'] }); }}>
                  {t(lang, 'adminSave')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
