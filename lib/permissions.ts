export const PERMISSIONS=['orders.read','orders.manage','inventory.read','inventory.manage'] as const;
export type Permission=typeof PERMISSIONS[number];
export type StaffIdentity={id:string;username:string;role:string;permissions:string[]};
export function hasPermission(user:StaffIdentity|null,permission:Permission){return !!user&&(user.role==='owner'||user.permissions.includes(permission))}
export function validPermissions(value:unknown):string[]|null{
 if(!Array.isArray(value)||value.some(v=>typeof v!=='string'||!PERMISSIONS.includes(v as Permission)))return null;
 const result=new Set(value as string[]);if(result.has('orders.manage'))result.add('orders.read');if(result.has('inventory.manage'))result.add('inventory.read');return [...result];
}
