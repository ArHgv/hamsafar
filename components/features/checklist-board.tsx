'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Backpack,
  Plus,
  Check,
  ChevronDown,
  Users,
  UserRound,
  Pencil,
  Trash2,
  FileCheck,
  Shirt,
  Cable,
  Pill,
  Apple,
  Droplets,
  Tent,
  Camera,
  Baby,
  Package,
  Sparkles,
  RotateCcw,
  Search,
  LockKeyhole,
} from 'lucide-react';
import type { ChecklistCategory, ChecklistItem, Trip } from '@/lib/types';
import type { ChecklistTemplateKey } from '@/lib/templates';
import { CHECKLIST_LABELS } from '@/lib/constants';
import { checklistSchema } from '@/lib/schemas';
import {
  CHECKLIST_TEMPLATES,
  checklistTemplateForTransport,
  makeChecklistTemplate,
} from '@/lib/templates';
import { cn, fa, normalizeDigits, uid } from '@/lib/utils';
import { useTripPermission } from '@/hooks/use-trip';
import { useTripStore } from '@/store/use-trip-store';
import { useToast } from '@/store/use-ui-store';
import {
  Button,
  Card,
  Badge,
  Field,
  Input,
  Select,
  EmptyState,
  ProgressRing,
  Avatar,
} from '../ui/primitives';
import { ConfirmDialog, Dialog } from '../ui/dialog';
import { NumericInput } from '../ui/numeric-input';
import { ActionsMenu } from '../ui/actions-menu';
const categoryIcons = {
  documents: FileCheck,
  clothing: Shirt,
  electronics: Cable,
  medicine: Pill,
  food: Apple,
  hygiene: Droplets,
  camping: Tent,
  photography: Camera,
  child: Baby,
  other: Package,
};
export function ChecklistBoard({ trip }: { trip: Trip }) {
  const [filter, setFilter] = useState('all'),
    [query, setQuery] = useState(''),
    [adding, setAdding] = useState(false),
    [editing, setEditing] = useState<ChecklistItem | null>(null),
    [deleting, setDeleting] = useState<ChecklistItem | null>(null),
    [templates, setTemplates] = useState(false),
    [template, setTemplate] = useState<ChecklistTemplateKey>(() =>
      checklistTemplateForTransport(trip.transport.mode),
    ),
    [reset, setReset] = useState(false);
  const editable = useTripPermission(trip, 'checklist'),
    toast = useToast(),
    done = trip.checklist.filter((i) => i.done).length,
    percent = trip.checklist.length ? (done / trip.checklist.length) * 100 : 0;
  const filtered = trip.checklist.filter(
    (i) =>
      (filter === 'all' ||
        (filter === 'shared' && i.shared) ||
        (filter === 'personal' && !i.shared) ||
        (filter === 'remaining' && !i.done)) &&
      i.name.includes(query.trim()),
  );
  const weight = trip.checklist.reduce((n, i) => n + (i.weight || 0) * i.quantity, 0);
  return (
    <>
      <Card className="checklist-summary">
        <ProgressRing value={percent} size={98} stroke={5} />
        <div>
          <p className="card-eyebrow">آماده‌سازی کیف سفر</p>
          <h2>
            {percent === 100 && trip.checklist.length
              ? 'همه‌چیز آماده‌ست؛ بزن به جاده.'
              : 'یک کیف سبک، یک خیالِ راحت.'}
          </h2>
          <p>
            {fa(done)} از {fa(trip.checklist.length)} وسیله آماده شده
            {weight > 0 ? ` · وزن ثبت‌شده: ${fa((weight / 1000).toFixed(1))} کیلوگرم` : ''}
          </p>
        </div>
        {editable && (
          <div className="checklist-summary-actions">
            <Button variant="primary" onClick={() => setAdding(true)}>
              <Plus size={17} />
              افزودن وسیله
            </Button>
            <Button variant="ghost" onClick={() => setTemplates(true)}>
              <Sparkles size={16} />
              از یک قالب شروع کن
            </Button>
          </div>
        )}
      </Card>
      <div className="filters-row">
        <div className="checklist-filters">
          {[
            { id: 'all', label: 'همه وسایل' },
            { id: 'personal', label: 'شخصی' },
            { id: 'shared', label: 'مشترک' },
            { id: 'remaining', label: 'آماده نشده' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn('chip', filter === f.id && 'active')}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="filter-search">
          <Search size={16} />
          <Input
            aria-label="جست‌وجوی وسایل"
            placeholder="یک وسیله پیدا کن…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="checklist-layout">
        <div className="checklist-categories">
          {Object.entries(CHECKLIST_LABELS).map(([key, label]) => {
            const items = filtered.filter((i) => i.category === key);
            if (!items.length) return null;
            const Icon = categoryIcons[key as ChecklistCategory];
            return (
              <Card className="checklist-category" key={key}>
                <details open>
                  <summary>
                    <span className="category-icon">
                      <Icon size={18} />
                    </span>
                    <h3>{label}</h3>
                    <span className="category-count">
                      {fa(items.filter((i) => i.done).length)} از {fa(items.length)}
                    </span>
                    <ChevronDown size={17} />
                  </summary>
                  <div className="checklist-items">
                    {items.map((item) => {
                      const member = trip.members.find((m) => m.id === item.assignedTo);
                      return (
                        <div
                          className={cn('checklist-item', item.done && 'completed')}
                          key={item.id}
                        >
                          <button
                            className="list-check-button"
                            disabled={!editable}
                            aria-label={`${item.done ? 'برداشتن تیک' : 'آماده کردن'} ${item.name}`}
                            aria-pressed={item.done}
                            onClick={() => {
                              try {
                                useTripStore.getState().toggleChecklist(trip.id, item.id);
                              } catch {
                                toast('اجازه ویرایش وسایل را ندارید.', 'error');
                              }
                            }}
                          >
                            <span className={cn('check-control', item.done && 'checked')}>
                              {item.done && <Check size={13} strokeWidth={3} />}
                            </span>
                          </button>
                          <div className="checklist-item-text">
                            <strong>{item.name}</strong>
                            <div className="checklist-item-meta">
                              <span>{fa(item.quantity)} عدد</span>
                              {item.weight !== undefined && item.weight > 0 && (
                                <span>{fa(item.weight)} گرم / عدد</span>
                              )}
                              {item.shared ? (
                                <span>
                                  <Users size={11} />
                                  مشترک
                                </span>
                              ) : (
                                <span>
                                  <UserRound size={11} />
                                  شخصی
                                </span>
                              )}
                            </div>
                          </div>
                          {item.priority === 'high' && !item.done && (
                            <Badge tone="warning">ضروری</Badge>
                          )}
                          {member && (
                            <div className="item-assignee">
                              <Avatar member={member} size={25} />
                              <span>{member.name}</span>
                            </div>
                          )}
                          {editable && (
                            <ActionsMenu
                              label={`گزینه‌های ${item.name}`}
                              items={[
                                {
                                  label: 'ویرایش وسیله',
                                  icon: Pencil,
                                  onClick: () => setEditing(item),
                                },
                                {
                                  label: 'حذف وسیله',
                                  icon: Trash2,
                                  onClick: () => setDeleting(item),
                                  destructive: true,
                                },
                              ]}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </details>
              </Card>
            );
          })}
          {!filtered.length && (
            <EmptyState
              icon={<Backpack size={28} />}
              title={trip.checklist.length ? 'کیف سفر خلوت‌تر شد' : 'هنوز چیزی توی کیف نیست'}
              description={
                trip.checklist.length
                  ? 'چیزی با این فیلتر پیدا نشد. فیلتر یا عبارت جست‌وجو را تغییر بده.'
                  : 'وسایل ضروری را اضافه کن یا از یک چک‌لیست پیشنهادی شروع کن.'
              }
              action={
                editable &&
                !trip.checklist.length && (
                  <Button variant="primary" onClick={() => setTemplates(true)}>
                    <Sparkles size={16} />
                    چک‌لیست پیشنهادی
                  </Button>
                )
              }
            />
          )}
        </div>
        <aside className="checklist-aside">
          <Card className="travel-note">
            <span className="note-eyebrow">
              <Tent size={17} />
              کمتر بردار، بیشتر ببین.
            </span>
            <h3>قبل از بستن کیف</h3>
            <p>
              مدارک و داروها را اول آماده کن. برای وسایل مشترک یک مسئول مشخص کن تا چهار تا پاوربانک
              و هیچ شارژری با خودتان نبرید!
            </p>
            <div className="packing-facts">
              <span>
                وسایل مشترک<strong>{fa(trip.checklist.filter((i) => i.shared).length)}</strong>
              </span>
              <span>
                ضروری‌های آماده‌نشده
                <strong>
                  {fa(trip.checklist.filter((i) => i.priority === 'high' && !i.done).length)}
                </strong>
              </span>
            </div>
            {editable && done > 0 && (
              <Button variant="ghost" size="small" onClick={() => setReset(true)}>
                <RotateCcw size={13} />
                بازنشانی تیک‌ها
              </Button>
            )}
            {!editable && (
              <p className="readonly-note">
                <LockKeyhole size={12} />
                برای تغییر وسایل، دسترسی برنامه‌ریزی لازم است.
              </p>
            )}
          </Card>
        </aside>
      </div>
      <ChecklistDialog
        open={adding || !!editing}
        onOpenChange={(v) => {
          if (!v) {
            setAdding(false);
            setEditing(null);
          }
        }}
        trip={trip}
        item={editing || undefined}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => {
          if (!v) setDeleting(null);
        }}
        title="این وسیله حذف شود؟"
        description={deleting?.name || ''}
        onConfirm={() => {
          if (deleting) useTripStore.getState().removeEntity(trip.id, 'checklist', deleting.id);
        }}
      />
      <ConfirmDialog
        open={reset}
        onOpenChange={setReset}
        title="از نو کیف را آماده می‌کنی؟"
        description="همه تیک‌ها برداشته می‌شوند؛ خودِ وسایل حذف نمی‌شوند."
        label="بازنشانی تیک‌ها"
        dangerous={false}
        onConfirm={() => {
          useTripStore
            .getState()
            .updateTrip(
              trip.id,
              { checklist: trip.checklist.map((i) => ({ ...i, done: false })) },
              ['checklist'],
            );
          toast('چک‌لیست آماده یک شروع تازه است.');
        }}
      />
      <Dialog
        open={templates}
        onOpenChange={setTemplates}
        title="یک شروع سبک"
        description="قالب را انتخاب کن؛ وسایل تکراری دوباره اضافه نمی‌شوند."
        footer={
          <>
            <Button onClick={() => setTemplates(false)}>انصراف</Button>
            <Button
              variant="primary"
              onClick={() => {
                try {
                  const items = makeChecklistTemplate(template, trip.checklist);
                  useTripStore
                    .getState()
                    .updateTrip(trip.id, { checklist: [...trip.checklist, ...items] }, [
                      'checklist',
                    ]);
                  toast(`${fa(items.length)} وسیله به کیف سفر اضافه شد.`);
                  setTemplates(false);
                } catch {
                  toast('وسایل اضافه نشدند؛ دسترسی را بررسی کن.', 'error');
                }
              }}
            >
              افزودن وسایل
            </Button>
          </>
        }
      >
        <div className="template-list">
          {Object.entries(CHECKLIST_TEMPLATES).map(([key, t]) => (
            <button
              key={key}
              onClick={() => setTemplate(key as ChecklistTemplateKey)}
              className={cn('template-option', key === template && 'selected')}
            >
              <span className="template-icon">
                {key === 'nature' ? (
                  <Tent size={23} />
                ) : key === 'family' ? (
                  <Baby size={23} />
                ) : (
                  <Backpack size={23} />
                )}
              </span>
              <span>
                <strong>{t.label}</strong>
                <small>
                  {t.description} · {fa(t.items.length)} وسیله
                </small>
              </span>
              <span className="radio-dot">{key === template && <i />}</span>
            </button>
          ))}
        </div>
      </Dialog>
    </>
  );
}
function ChecklistDialog({
  open,
  onOpenChange,
  trip,
  item,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  trip: Trip;
  item?: ChecklistItem;
}) {
  const toast = useToast();
  const {
    register,
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<ChecklistItem>({ resolver: zodResolver(checklistSchema) });
  useEffect(() => {
    if (open)
      reset(
        item || {
          id: uid(),
          name: '',
          category: 'other',
          done: false,
          priority: 'normal',
          quantity: 1,
          shared: false,
          assignedTo: '',
        },
      );
  }, [open, item, reset]);
  const values = watch();
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={item ? 'ویرایش وسیله' : 'چی همراهت می‌بری؟'}
      description="یک وسیله کوچک برای خیالِ راحت در سفر."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>انصراف</Button>
          <Button form="checklist-form" type="submit" variant="primary">
            {item ? 'ذخیره تغییرات' : 'افزودن وسیله'}
          </Button>
        </>
      }
    >
      <form
        id="checklist-form"
        onSubmit={handleSubmit((value) => {
          try {
            useTripStore.getState().saveEntity(trip.id, 'checklist', value);
            toast(item ? 'وسیله به‌روز شد.' : 'به کیف سفر اضافه شد.');
            onOpenChange(false);
          } catch {
            toast('وسیله ذخیره نشد؛ اطلاعات را بررسی کن.', 'error');
          }
        })}
      >
        <div className="form-grid">
          <Field
            label="نام وسیله"
            required
            id="item-name"
            className="full"
            error={errors.name?.message}
          >
            <Input
              id="item-name"
              autoFocus
              placeholder="مثلاً بارانی سبک"
              {...register('name')}
              maxLength={150}
            />
          </Field>
          <Field label="دسته‌بندی" id="item-category">
            <Select id="item-category" {...register('category')}>
              {Object.entries(CHECKLIST_LABELS).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="اولویت" id="item-priority">
            <Select id="item-priority" {...register('priority')}>
              <option value="high">ضروری</option>
              <option value="normal">معمولی</option>
              <option value="low">اگر جا بود</option>
            </Select>
          </Field>
          <Field label="تعداد" required id="item-quantity" error={errors.quantity?.message}>
            <NumericInput
              id="item-quantity"
              inputMode="numeric"
              value={values.quantity}
              onValueChange={(value) =>
                setValue('quantity', value ?? NaN, { shouldValidate: true })
              }
            />
          </Field>
          <Field label="وزن هر عدد (گرم)" optional id="item-weight" error={errors.weight?.message}>
            <NumericInput
              id="item-weight"
              optional
              value={values.weight}
              onValueChange={(value) => setValue('weight', value, { shouldValidate: true })}
            />
          </Field>
          <Field label="مسئول این وسیله" optional id="item-assignee" className="full">
            <Select id="item-assignee" {...register('assignedTo')}>
              <option value="">هنوز مشخص نشده</option>
              {trip.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>
          <label className="check-label full">
            <input type="checkbox" {...register('shared')} />
            <Users size={15} />
            <span>این وسیله بین هم‌سفرها مشترک است</span>
          </label>
        </div>
      </form>
    </Dialog>
  );
}
