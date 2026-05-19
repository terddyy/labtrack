# LABTRACK Supabase Setup

This directory contains the database schema and security model for LABTRACK.

## Apply locally

```bash
supabase start
supabase db reset
```

## First Super Admin

Create the first user in Supabase Auth, then insert or update the matching profile:

```sql
insert into public.profiles (id, email, full_name, role, department)
values (
  '<auth-user-id>',
  'superadmin@psu.edu.ph',
  'CCS Super Admin',
  'super_admin',
  'College of Computing Studies'
)
on conflict (id) do update set role = 'super_admin', is_active = true;
```

## Storage

Create a private bucket named `defect-photos`. Keep photo paths tied to `defect_photos.storage_path` and protect access through Storage RLS policies before production use.
