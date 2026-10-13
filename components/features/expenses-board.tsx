'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  Wallet,
  Plus,
  ArrowLeftRight,
  Hotel,
  Utensils,
  Car,
  Ticket,
  ShoppingBag,
  Compass,
  Fuel,
  ReceiptText,
  Pencil,
  Trash2,
  Search,
  LockKeyhole,
  FileText,
  ArrowUpLeft,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import type { Expense, ExpenseCategory, Trip } from '@/lib/types';
import { EXPENSE_LABELS, CURRENCY_LABELS } from '@/lib/constants';
import { formatDate } from '@/lib/dates';
import { balances, compactMoney, money, suggestSettlements, totalExpenses } from '@/lib/money';
import { cn, fa } from '@/lib/utils';
import { useTripPermission } from '@/hooks/use-trip';
import { useTripStore } from '@/store/use-trip-store';
import { useToast } from '@/store/use-ui-store';
import {
  Avatar,
  Button,
  Card,
  Badge,
  EmptyState,
  Input,
  ProgressBar,
  SectionHeading,
} from '../ui/primitives';
import { Dialog, ConfirmDialog } from '../ui/dialog';
import { ActionsMenu } from '../ui/actions-menu';
import { AttachmentLink } from '../ui/file-picker';
import { ExpenseDialog } from './expense-dialog';
const expenseIcons = {
  transport: Car,
  food: Utensils,
  hotel: Hotel,
  ticket: Ticket,
  shopping: ShoppingBag,
  entertainment: Compass,
  fuel: Fuel,
  other: ReceiptText,
};
const chartColors = [
  '#bccb9d',
  '#af9980',
  '#8da7ad',
  '#b4a6bf',
  '#808e78',
  '#c3b67f',
  '#7d9d91',
  '#999c96',
];
export function ExpensesBoard({ trip }: { trip: Trip }) {
  const [adding, setAdding] = useState(false),
    [editing, setEditing] = useState<Expense | null>(null),
    [deleting, setDeleting] = useState<Expense | null>(null),
    [viewing, setViewing] = useState<Expense | null>(null),
    [query, setQuery] = useState(''),
    [category, setCategory] = useState('all');
  const editable = useTripPermission(trip, 'expenses'),
    toast = useToast(),
    spent = totalExpenses(trip),
    remaining = trip.budget - spent,
    b = balances(trip);
  const items = trip.expenses
    .filter(
      (e) =>
        (category === 'all' || category === e.category) &&
        `${e.title} ${e.notes || ''}`.includes(query.trim()),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const dates = [...new Set(items.map((e) => e.date))],
    categories = Object.keys(EXPENSE_LABELS).filter((c) =>
      trip.expenses.some((e) => e.category === c),
    );
  const chart = Object.entries(EXPENSE_LABELS)
    .map(([key, label], i) => ({
      key,
      label,
      amount: trip.expenses.filter((e) => e.category === key).reduce((n, e) => n + e.amount, 0),
      color: chartColors[i],
    }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  let cursor = 0;
  const stops = chart
    .map((c) => {
      const start = cursor;
      cursor += (c.amount / (spent || 1)) * 100;
      return `${c.color} ${start}% ${cursor}%`;
    })
    .join(',');
  return (
    <>
      <div className="feature-toolbar">
        <div className="feature-header">
          <Wallet size={19} className="accent" />
          <div>
            <h2>حساب‌ها روشن، خیال‌ها راحت.</h2>
            <p className="card-eyebrow">
              {fa(trip.expenses.length)} هزینه ثبت‌شده · {CURRENCY_LABELS[trip.currency]}
            </p>
          </div>
        </div>
        {editable ? (
          <Button variant="primary" onClick={() => setAdding(true)}>
            <Plus size={17} />
            ثبت هزینه
          </Button>
        ) : (
          <span className="readonly-note">
            <LockKeyhole size={13} />
            دسترسی مشاهده
          </span>
        )}
      </div>
      <div className="expense-stats">
        <Card className="expense-stat">
          <span>هزینه کل سفر</span>
          <strong>
            {money(spent, trip.currency, false)}
            <small>{CURRENCY_LABELS[trip.currency]}</small>
          </strong>
          <p>
            {fa(trip.expenses.length)} هزینه، برای {fa(trip.members.length)} هم‌سفر
          </p>
        </Card>
        <Card className="expense-stat">
          <span>{remaining < 0 ? 'بیشتر از بودجه' : 'باقی‌مانده بودجه'}</span>
          <strong className={remaining < 0 ? 'danger' : 'accent'}>
            {trip.budget ? money(Math.abs(remaining), trip.currency, false) : '—'}
            <small>{CURRENCY_LABELS[trip.currency]}</small>
          </strong>
          <ProgressBar value={trip.budget ? (spent / trip.budget) * 100 : 0} label="مصرف بودجه" />
          <p>
            {trip.budget
              ? `${fa(Math.round((spent / trip.budget) * 100))}٪ از ${money(trip.budget, trip.currency)}`
              : 'هنوز بودجه تعیین نشده'}
          </p>
        </Card>
        <Card className="expense-stat settlement-stat">
          <span>قدم بعدی برای حساب‌های صاف</span>
          <strong>
            {fa(suggestSettlements(trip).length)}
            <small>پیشنهاد تسویه</small>
          </strong>
          <Link href={`/trips/${trip.id}?tab=settlements`}>
            دیدن حساب هم‌سفرها
            <ArrowUpLeft size={15} />
          </Link>
        </Card>
      </div>
      <div className="filters-row expense-filters">
        <div className="expense-category-filters">
          <button
            onClick={() => setCategory('all')}
            className={cn('chip', category === 'all' && 'active')}
          >
            همه هزینه‌ها
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn('chip', category === c && 'active')}
            >
              {EXPENSE_LABELS[c as ExpenseCategory]}
            </button>
          ))}
        </div>
        <div className="filter-search">
          <Search size={16} />
          <Input
            aria-label="جست‌وجوی هزینه"
            placeholder="جست‌وجوی یک هزینه…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="expenses-layout">
        <div className="expense-groups">
          {dates.map((date) => (
            <section key={date}>
              <h3 className="expense-date-heading">{formatDate(date, { year: 'numeric' })}</h3>
              <Card className="expense-list">
                {items
                  .filter((e) => e.date === date)
                  .map((e) => {
                    const Icon = expenseIcons[e.category],
                      payer = trip.members.find((m) => m.id === e.payerId);
                    return (
                      <div className="expense-row" key={e.id}>
                        <button
                          className="expense-row-main"
                          onClick={() => (editable ? setEditing(e) : setViewing(e))}
                        >
                          <span className="expense-row-icon">
                            <Icon size={20} strokeWidth={1.5} />
                          </span>
                          <div className="expense-row-text">
                            <strong>{e.title}</strong>
                            <small>
                              {payer?.name} پرداخت کرد<span>·</span>
                              {EXPENSE_LABELS[e.category]}
                              {e.receipt && <FileText size={11} />}
                            </small>
                          </div>
                          <div className="expense-row-amount">
                            <strong>{money(e.amount, trip.currency, false)}</strong>
                            <small>
                              {CURRENCY_LABELS[trip.currency]} · بین {fa(e.shares.length)} نفر
                            </small>
                          </div>
                        </button>
                        {editable && (
                          <ActionsMenu
                            label={`گزینه‌های هزینه ${e.title}`}
                            items={[
                              { label: 'ویرایش هزینه', icon: Pencil, onClick: () => setEditing(e) },
                              {
                                label: 'حذف هزینه',
                                icon: Trash2,
                                onClick: () => setDeleting(e),
                                destructive: true,
                              },
                            ]}
                          />
                        )}
                      </div>
                    );
                  })}
              </Card>
            </section>
          ))}
          {!items.length && (
            <EmptyState
              icon={<ReceiptText size={28} />}
              title={trip.expenses.length ? 'هزینه‌ای با این مشخصات نیست' : 'هنوز پولی خرج نشده'}
              description={
                trip.expenses.length
                  ? 'فیلتر یا عبارت جست‌وجو را تغییر بده.'
                  : 'هر هزینه را با پرداخت‌کننده‌اش ثبت کن؛ سهم هر نفر را ما حساب می‌کنیم.'
              }
              action={
                editable &&
                !trip.expenses.length && (
                  <Button variant="primary" onClick={() => setAdding(true)}>
                    <Plus size={17} />
                    اولین هزینه سفر
                  </Button>
                )
              }
            />
          )}
        </div>
        <aside className="expenses-aside">
          <Card className="expense-breakdown">
            <h3>پول‌ها کجا رفته‌اند؟</h3>
            <div
              className="donut-chart"
              style={{ background: spent ? `conic-gradient(${stops})` : 'var(--line)' }}
              role="img"
              aria-label={
                chart.map((c) => `${c.label}: ${money(c.amount, trip.currency)}`).join('، ') ||
                'بدون هزینه'
              }
            >
              <div>
                <Wallet size={20} />
                <strong>{compactMoney(spent, trip.currency)}</strong>
                <small>{CURRENCY_LABELS[trip.currency]}</small>
              </div>
            </div>
            <div className="chart-legend">
              {chart.map((c) => (
                <div key={c.key}>
                  <span>
                    <i style={{ backgroundColor: c.color }} />
                    {c.label}
                  </span>
                  <strong>{fa(Math.round((c.amount / spent) * 100))}٪</strong>
                </div>
              ))}
            </div>
            {!chart.length && (
              <p className="muted" style={{ fontSize: 11, textAlign: 'center' }}>
                نمودار پس از ثبت اولین هزینه شکل می‌گیرد.
              </p>
            )}
          </Card>
          <Card className="balance-preview">
            <SectionHeading title="حساب هم‌سفرها" />
            {trip.members.map((m) => (
              <div className="balance-preview-row" key={m.id}>
                <Avatar member={m} size={28} />
                <span>{m.name}</span>
                <small className={b[m.id] > 0 ? 'accent' : 'muted'}>
                  {b[m.id] === 0
                    ? 'حساب صاف'
                    : `${money(Math.abs(b[m.id]), trip.currency)} ${b[m.id] > 0 ? 'طلب' : 'بدهی'}`}
                </small>
              </div>
            ))}
            <Link href={`/trips/${trip.id}?tab=settlements`} className="wallet-link">
              <ArrowLeftRight size={15} />
              تسویه شفاف، با انتقال‌های کمتر
              <ArrowUpLeft size={14} />
            </Link>
          </Card>
        </aside>
      </div>
      <ExpenseDialog
        open={adding || !!editing}
        onOpenChange={(v) => {
          if (!v) {
            setAdding(false);
            setEditing(null);
          }
        }}
        trip={trip}
        expense={editing || undefined}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => {
          if (!v) setDeleting(null);
        }}
        title="این هزینه حذف شود؟"
        description="حذف هزینه، سهم‌ها و پیشنهادهای تسویه را دوباره محاسبه می‌کند."
        onConfirm={() => {
          if (deleting) {
            useTripStore.getState().removeEntity(trip.id, 'expenses', deleting.id);
            toast('هزینه و سهم‌های آن حذف شدند.');
          }
        }}
      />
      <ExpenseDetails trip={trip} expense={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
function ExpenseDetails({
  trip,
  expense,
  onClose,
}: {
  trip: Trip;
  expense: Expense | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={!!expense}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      title={expense?.title || 'هزینه'}
      description={
        expense
          ? `${trip.members.find((m) => m.id === expense.payerId)?.name} پرداخت کرده · ${formatDate(expense.date)}`
          : ''
      }
    >
      {expense && (
        <div className="form-stack">
          <div className="detail-amount">{money(expense.amount, trip.currency)}</div>
          <div className="split-members">
            {expense.shares.map((s) => {
              const m = trip.members.find((m) => m.id === s.memberId);
              return (
                <div key={s.memberId} className="split-member-row">
                  <span>{m?.name}</span>
                  <strong>
                    {money(s.amount, trip.currency)}
                    {s.percentage !== undefined ? ` · ${fa(s.percentage)}٪` : ''}
                  </strong>
                </div>
              );
            })}
          </div>
          {expense.notes && <p className="muted">{expense.notes}</p>}
          {expense.receipt && <AttachmentLink attachment={expense.receipt} />}
        </div>
      )}
    </Dialog>
  );
}
