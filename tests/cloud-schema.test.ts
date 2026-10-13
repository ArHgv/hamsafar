import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { seedTrips } from '../lib/seed';
import { equalSplit } from '../lib/money';
import type { Trip } from '../lib/types';
const OWNER = '98a30000-3120-40a3-84e7-000000000001';
const VIEWER = '98a30000-3120-40a3-84e7-000000000002';
const PLANNER = '98a30000-3120-40a3-84e7-000000000003';
const FINANCE = '98a30000-3120-40a3-84e7-000000000004';
const OUTSIDER = '98a30000-3120-40a3-84e7-000000000005';
let db: PGlite;
let tripId: string;
async function asUser(id: string) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec('set role authenticated');
}
async function current() {
  return (
    await db.query<{ data: Trip; revision: number }>(
      'select data,revision from public.trips where id=$1',
      [tripId],
    )
  ).rows[0];
}
async function patch(data: Record<string, unknown>, revision?: number) {
  return db.query('select * from public.apply_trip_patch($1,$2,$3::jsonb)', [
    tripId,
    revision ?? (await current()).revision,
    JSON.stringify(data),
  ]);
}
describe('PostgreSQL schema and server permissions (Supabase schemas mocked)', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.waitReady;
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create schema storage; create schema realtime;
      create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}',email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      create table realtime.messages(id uuid primary key default gen_random_uuid(),extension text);
      alter table realtime.messages enable row level security;
      create function realtime.topic() returns text language sql stable as $$ select current_setting('realtime.topic',true) $$;
      grant usage on schema public,auth,storage,realtime to anon,authenticated;
      grant select,insert,update,delete on storage.objects,realtime.messages to authenticated;
    `);
    // PGlite has core gen_random_uuid; pgcrypto is a Supabase-installed extension.
    const sql = readFileSync('supabase/schema.sql', 'utf8').replace(
      'create extension if not exists pgcrypto;',
      '',
    );
    await db.exec(sql);
    for (const [i, id] of [OWNER, VIEWER, PLANNER, FINANCE, OUTSIDER].entries())
      await db.query(
        'insert into auth.users(id,email,raw_user_meta_data,email_confirmed_at) values($1,$2,$3::jsonb,now())',
        [id, `person${i}@example.com`, JSON.stringify({ name: `هم‌سفر ${i}` })],
      );
    await asUser(OWNER);
    const trip = seedTrips()[0];
    tripId = trip.id;
    trip.ownerId = OWNER;
    trip.members[0].userId = OWNER;
    trip.expenses = [
      {
        id: 'a81d2000-2f64-47b1-9c12-000000000301',
        title: 'هزینه آزمایشی',
        amount: 12000000,
        payerId: trip.members[0].id,
        category: 'hotel',
        date: trip.startDate,
        splitMode: 'equal',
        shares: equalSplit(
          12000000,
          trip.members.map((member) => member.id),
        ),
        createdAt: new Date().toISOString(),
      },
    ];
    await db.query('select * from public.create_trip($1::jsonb)', [JSON.stringify(trip)]);
  }, 30000);
  afterAll(async () => {
    if (db) await db.close();
  });
  it('allows the owner to create a document and blocks direct writes', async () => {
    await asUser(OWNER);
    expect((await current()).data.ownerId).toBe(OWNER);
    await expect(
      db.query("update public.trips set data='{}'::jsonb where id=$1", [tripId]),
    ).rejects.toThrow(/permission denied/i);
  });
  it('hides trips from nonmembers', async () => {
    await asUser(OUTSIDER);
    expect((await db.query('select * from public.trips')).rows).toHaveLength(0);
    await expect(patch({ title: 'نفوذ' }, 1)).rejects.toThrow(/FORBIDDEN/);
  });
  it('joins a viewer through an expiring invitation without edit access', async () => {
    await asUser(OWNER);
    const token = (
      await db.query<{ token: string }>('select * from public.create_invite($1,$2)', [
        tripId,
        'viewer',
      ])
    ).rows[0].token;
    await asUser(VIEWER);
    await db.query('select * from public.join_trip($1)', [token]);
    expect((await current()).data.members.find((m) => m.userId === VIEWER)?.role).toBe('viewer');
    await expect(patch({ title: 'دسترسی نادرست' })).rejects.toThrow(/FORBIDDEN/);
  });
  it('permits planning changes but forbids finance edits for a planner', async () => {
    await asUser(OWNER);
    const token = (
      await db.query<{ token: string }>('select * from public.create_invite($1,$2)', [
        tripId,
        'planner',
      ])
    ).rows[0].token;
    await asUser(PLANNER);
    await db.query('select * from public.join_trip($1)', [token]);
    const doc = await current(),
      checklist = structuredClone(doc.data.checklist);
    checklist[0].done = !checklist[0].done;
    await patch({ checklist });
    expect((await current()).data.checklist[0].done).toBe(checklist[0].done);
    await expect(patch({ expenses: [] })).rejects.toThrow(/FORBIDDEN/);
  });
  it('permits finance edits but forbids planning changes for a treasurer', async () => {
    await asUser(OWNER);
    const token = (
      await db.query<{ token: string }>('select * from public.create_invite($1,$2)', [
        tripId,
        'treasurer',
      ])
    ).rows[0].token;
    await asUser(FINANCE);
    await db.query('select * from public.join_trip($1)', [token]);
    const expenses = (await current()).data.expenses;
    expenses[0].title = 'هزینه ویرایش‌شده';
    await patch({ expenses });
    expect((await current()).data.expenses[0].title).toBe('هزینه ویرایش‌شده');
    await expect(patch({ activities: [] })).rejects.toThrow(/FORBIDDEN/);
  });
  it('detects stale revisions and rejects inconsistent financial shares', async () => {
    await asUser(OWNER);
    const doc = await current();
    await expect(patch({ title: 'تداخل' }, doc.revision - 1)).rejects.toThrow(/REVISION_CONFLICT/);
    const expenses = structuredClone(doc.data.expenses);
    expenses[0].shares[0].amount += 5;
    await expect(patch({ expenses })).rejects.toThrow(/INVALID_EQUAL_SPLIT|SHARES_DO_NOT_MATCH/);
  });
  it('keeps owner permissions immutable and does not allow membership impersonation', async () => {
    await asUser(OWNER);
    const doc = await current();
    const members = structuredClone(doc.data.members);
    members[0].role = 'viewer';
    members[1].userId = OUTSIDER;
    await patch({ members });
    const next = await current();
    expect(next.data.members[0].role).toBe('admin');
    expect(next.data.members[1].userId).toBeUndefined();
    await expect(
      patch({ members: next.data.members.filter((m) => m.userId !== OWNER) }),
    ).rejects.toThrow(/OWNER_REMOVE/);
  });
  it('revokes links and rejects joining after revocation', async () => {
    await asUser(OWNER);
    const token = (
      await db.query<{ token: string }>('select * from public.create_invite($1,$2)', [
        tripId,
        'viewer',
      ])
    ).rows[0].token;
    await db.query('select public.revoke_invite($1)', [token]);
    await asUser(OUTSIDER);
    await expect(db.query('select * from public.join_trip($1)', [token])).rejects.toThrow(
      /INVALID_INVITE/,
    );
  });
  it('secures planning and expense file scopes on the server', async () => {
    await asUser(PLANNER);
    await db.query('insert into storage.objects(bucket_id,name) values($1,$2)', [
      'trip-files',
      `${tripId}/plan/a10f5000-1120-43aa-9130-000000000001.pdf`,
    ]);
    await expect(
      db.query('insert into storage.objects(bucket_id,name) values($1,$2)', [
        'trip-files',
        `${tripId}/expense/a10f5000-1120-43aa-9130-000000000002.pdf`,
      ]),
    ).rejects.toThrow(/row-level security/);
    await asUser(VIEWER);
    expect((await db.query('select * from storage.objects')).rows).toHaveLength(1);
    await asUser(OUTSIDER);
    expect((await db.query('select * from storage.objects')).rows).toHaveLength(0);
  });
  it('rejects invalid date ranges and changing a used currency', async () => {
    await asUser(OWNER);
    await expect(patch({ endDate: '2000-01-01' })).rejects.toThrow(/INVALID_DATE_RANGE/);
    await expect(patch({ currency: 'USD' })).rejects.toThrow(/CURRENCY_LOCKED/);
  });
  it('makes bearer previews available to guests without exposing the full document', async () => {
    await asUser(OWNER);
    const token = (
      await db.query<{ token: string }>('select * from public.create_invite($1,$2)', [
        tripId,
        'viewer',
      ])
    ).rows[0].token;
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub','',false)");
    await db.exec('set role anon');
    const preview = (await db.query('select * from public.invite_preview($1)', [token])).rows[0];
    expect(preview).toHaveProperty('title');
    expect(preview).not.toHaveProperty('expenses');
    expect(preview).not.toHaveProperty('members');
    await expect(db.query('select * from public.trips')).rejects.toThrow(/permission denied/);
  });
  it('requires a verified email before a companion can join', async () => {
    await asUser(OWNER);
    const token = (
      await db.query<{ token: string }>('select * from public.create_invite($1,$2)', [
        tripId,
        'viewer',
      ])
    ).rows[0].token;
    await db.exec('reset role');
    await db.query('update auth.users set email_confirmed_at=null where id=$1', [OUTSIDER]);
    await asUser(OUTSIDER);
    await expect(db.query('select * from public.join_trip($1)', [token])).rejects.toThrow(
      /EMAIL_NOT_CONFIRMED/,
    );
    await db.exec('reset role');
    await db.query('update auth.users set email_confirmed_at=now() where id=$1', [OUTSIDER]);
  });
  it('rejects forged percentage rounding and accepts exact largest remainders', async () => {
    await asUser(OWNER);
    const old = (await current()).data.expenses,
      e = structuredClone(old[0]);
    e.amount = 1001;
    e.splitMode = 'percentage';
    e.shares = e.shares.map((share, i) => ({
      ...share,
      amount: [501, 250, 150, 100][i],
      percentage: [50, 25, 15, 10][i],
    }));
    await patch({ expenses: [e] });
    const forged = structuredClone(e);
    forged.shares[0].amount--;
    forged.shares[1].amount++;
    await expect(patch({ expenses: [forged] })).rejects.toThrow(/INVALID_PERCENTAGE_SPLIT/);
    await patch({ expenses: old });
  });
  it('restricts private presence to genuine authenticated trip memberships', async () => {
    await db.exec('reset role');
    await db.query("select set_config('realtime.topic',$1,false)", [`trip:${tripId}`]);
    await asUser(VIEWER);
    await db.query("insert into realtime.messages(extension) values('presence')");
    await asUser(OUTSIDER);
    expect((await db.query('select * from realtime.messages')).rows).toHaveLength(0);
    await expect(
      db.query("insert into realtime.messages(extension) values('presence')"),
    ).rejects.toThrow(/row-level security/);
  });
  it('rejects wrong attachment MIME types, unsafe dates and wrong file scopes', async () => {
    await asUser(OWNER);
    await expect(patch({ startDate: '1000-01-01', endDate: '1000-01-02' })).rejects.toThrow(
      /INVALID_DATE_RANGE/,
    );
    const expenses = structuredClone((await current()).data.expenses),
      id = 'a30d4000-2010-4a20-9431-000000000001';
    expenses[0].receipt = {
      id,
      name: 'رسید.pdf',
      mime: 'application/pdf',
      size: 123,
      cloudPath: `${tripId}/plan/${id}.pdf`,
    };
    await expect(patch({ expenses })).rejects.toThrow(/INVALID_ATTACHMENT_PATH/);
    expenses[0].receipt.cloudPath = `${tripId}/expense/${id}.pdf`;
    const invalid = expenses.map((expense) => ({
      ...expense,
      receipt: expense.receipt ? { ...expense.receipt, mime: 'text/html' } : undefined,
    }));
    await expect(patch({ expenses: invalid })).rejects.toThrow(/INVALID_ATTACHMENT/);
    await patch({ expenses });
  });
});
