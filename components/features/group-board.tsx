'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Users,
  Plus,
  Link2,
  Copy,
  Check,
  ShieldCheck,
  Pencil,
  Trash2,
  Cloud,
  LockKeyhole,
  CalendarDays,
  Share2,
  Eye,
  Wallet,
  UserRound,
  LoaderCircle,
  Unlink,
} from 'lucide-react';
import type { Invitation, Member, MemberRole, Trip } from '@/lib/types';
import { memberSchema } from '@/lib/schemas';
import { ATTENDANCE_LABELS, MEMBER_COLORS, ROLE_HINTS, ROLE_LABELS } from '@/lib/constants';
import { cloudConfigured } from '@/lib/supabase';
import { createInvitation, listInvitations, publishTrip, revokeInvitation } from '@/lib/cloud';
import { formatDate } from '@/lib/dates';
import { cn, copyText, fa, readableError, uid } from '@/lib/utils';
import { useTripPermission } from '@/hooks/use-trip';
import { useTripStore, useIdentity } from '@/store/use-trip-store';
import { useToast } from '@/store/use-ui-store';
import { Avatar, Badge, Button, Card, Field, Input, Select, LinkButton } from '../ui/primitives';
import { ConfirmDialog, Dialog } from '../ui/dialog';
import { ActionsMenu } from '../ui/actions-menu';
const roleIcons = { viewer: Eye, planner: CalendarDays, treasurer: Wallet, admin: ShieldCheck };
export function GroupBoard({ trip }: { trip: Trip }) {
  const [adding, setAdding] = useState(false),
    [editing, setEditing] = useState<Member | null>(null),
    [deleting, setDeleting] = useState<Member | null>(null),
    [sharing, setSharing] = useState(false);
  const editable = useTripPermission(trip, 'members'),
    cloudIds = useTripStore((s) => s.cloudTripIds),
    onlineMap = useTripStore((s) => s.onlineUsers),
    identity = useIdentity(trip.id),
    isCloud = cloudIds.includes(trip.id),
    toast = useToast(),
    online = onlineMap[trip.id] || [];
  return (
    <>
      <div className="feature-toolbar">
        <div className="feature-header">
          <Users size={19} className="accent" />
          <div>
            <h2>با هم، خوش‌تر می‌گذرد.</h2>
            <p className="card-eyebrow">
              {fa(trip.members.length)} هم‌سفر
              {isCloud ? ` · ${fa(online.length)} عضو آنلاین` : ' · فهرست همراه‌های این سفر'}
            </p>
          </div>
        </div>
        {editable && (
          <div className="group-actions">
            <Button onClick={() => setAdding(true)}>
              <Plus size={16} />
              افزودن همراه
            </Button>
            <Button variant="primary" onClick={() => setSharing(true)}>
              <Link2 size={16} />
              دعوت با لینک
            </Button>
          </div>
        )}
      </div>
      <Card className="group-intro">
        <span className="group-intro-icon">
          <Users size={25} strokeWidth={1.5} />
        </span>
        <div>
          <h3>یک برنامه، برای همه هم‌سفرها.</h3>
          <p>
            {isCloud
              ? 'اعضایی که دعوت را پذیرفته‌اند، با ورود به حسابشان اطلاعات مشترک را می‌بینند. دسترسی هر نفر را تو تعیین می‌کنی.'
              : 'این فهرست روی دستگاه توست. برای دسترسی واقعی اعضا، سفر را به فضای ابری وصل کن و لینک دعوت بفرست.'}
          </p>
        </div>
        <Badge tone={isCloud ? 'accent' : 'neutral'}>
          {isCloud ? <Cloud size={12} /> : <LockKeyhole size={12} />}
          {isCloud ? 'همکاری ابری' : 'ذخیره محلی'}
        </Badge>
      </Card>
      <div className="members-grid">
        {trip.members.map((m) => {
          const Icon = roleIcons[m.role],
            me = m.userId === identity.id,
            owner = m.userId === trip.ownerId,
            active = isCloud && !!m.userId && online.includes(m.userId);
          return (
            <Card className="member-card" key={m.id}>
              <div className="member-card-top">
                <Avatar member={m} size={51} online={active} />
                <div>
                  <h3>
                    {m.name}
                    {me && <small>تو</small>}
                  </h3>
                  <p>
                    {isCloud && m.userId
                      ? active
                        ? 'آنلاین'
                        : 'عضو متصل'
                      : owner
                        ? 'سازنده سفر'
                        : 'در فهرست همراه‌ها'}
                  </p>
                </div>
                {editable && (
                  <ActionsMenu
                    label={`مدیریت ${m.name}`}
                    items={[
                      { label: 'ویرایش همراه', icon: Pencil, onClick: () => setEditing(m) },
                      ...(!owner
                        ? [
                            {
                              label: 'حذف از سفر',
                              icon: Trash2,
                              onClick: () => setDeleting(m),
                              destructive: true,
                            },
                          ]
                        : []),
                    ]}
                  />
                )}
              </div>
              <div className="member-card-role">
                <Icon size={15} />
                <span>{ROLE_LABELS[m.role]}</span>
                {owner && <ShieldCheck size={13} />}
              </div>
              <p className="member-permission-hint">{ROLE_HINTS[m.role]}</p>
              <div className="member-card-bottom">
                <Badge
                  tone={
                    m.attendance === 'confirmed'
                      ? 'accent'
                      : m.attendance === 'declined'
                        ? 'danger'
                        : 'neutral'
                  }
                >
                  {ATTENDANCE_LABELS[m.attendance]}
                </Badge>
                {m.email && (
                  <span className="latin" title={m.email}>
                    {m.email}
                  </span>
                )}
              </div>
            </Card>
          );
        })}
        {editable && (
          <button className="add-member-tile" onClick={() => setAdding(true)}>
            <Plus size={25} strokeWidth={1.4} />
            <span>یک هم‌سفر تازه</span>
            <small>خاطره‌ها را شریک شو.</small>
          </button>
        )}
      </div>
      <div className="permission-guide">
        <h3>
          <ShieldCheck size={17} />
          دسترسی‌ها، روشن و ساده
        </h3>
        <div>
          {Object.entries(ROLE_LABELS).map(([key, label]) => {
            const Icon = roleIcons[key as MemberRole];
            return (
              <div key={key}>
                <Icon size={17} />
                <strong>{label}</strong>
                <p>{ROLE_HINTS[key as MemberRole]}</p>
              </div>
            );
          })}
        </div>
      </div>
      <MemberDialog
        open={adding || !!editing}
        onOpenChange={(v) => {
          if (!v) {
            setAdding(false);
            setEditing(null);
          }
        }}
        trip={trip}
        member={editing || undefined}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => {
          if (!v) setDeleting(null);
        }}
        title="این هم‌سفر از سفر حذف شود؟"
        description="اعضایی که هزینه یا تسویه ثبت‌شده دارند قابل حذف نیستند؛ برایشان وضعیت «نمی‌آید» را انتخاب کن."
        onConfirm={() => {
          if (deleting) {
            try {
              useTripStore.getState().removeEntity(trip.id, 'members', deleting.id);
              toast('همراه از فهرست سفر حذف شد.');
            } catch (e) {
              throw new Error(
                e instanceof Error && e.message === 'MEMBER_HAS_EXPENSES'
                  ? 'این عضو در هزینه‌ها یا تسویه‌ها حضور دارد. به‌جای حذف، وضعیت حضورش را تغییر بده.'
                  : 'حذف انجام نشد؛ دسترسی را بررسی کن.',
              );
            }
          }
        }}
      />
      <ShareDialog trip={trip} open={sharing} onOpenChange={setSharing} />
    </>
  );
}
function MemberDialog({
  trip,
  member,
  open,
  onOpenChange,
}: {
  trip: Trip;
  member?: Member;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const toast = useToast(),
    owner = member?.userId === trip.ownerId;
  const {
    register,
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<Member>({ resolver: zodResolver(memberSchema) });
  useEffect(() => {
    if (open)
      reset(
        member || {
          id: uid(),
          name: '',
          email: '',
          role: 'planner',
          attendance: 'invited',
          color: MEMBER_COLORS[trip.members.length % MEMBER_COLORS.length],
        },
      );
  }, [open, member, trip.id, reset]);
  const values = watch();
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={member ? 'جزئیات هم‌سفر' : 'یک هم‌سفر تازه'}
      description="اسم و دسترسی‌اش را مشخص کن؛ دعوت واقعی با لینک انجام می‌شود."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>انصراف</Button>
          <Button form="member-form" type="submit" variant="primary">
            {member ? 'ذخیره تغییرات' : 'افزودن همراه'}
          </Button>
        </>
      }
    >
      <form
        id="member-form"
        onSubmit={handleSubmit((value) => {
          try {
            useTripStore
              .getState()
              .saveEntity(trip.id, 'members', { ...value, role: owner ? 'admin' : value.role });
            toast('فهرست هم‌سفرها به‌روز شد.');
            onOpenChange(false);
          } catch {
            toast('همراه ذخیره نشد؛ دسترسی را بررسی کن.', 'error');
          }
        })}
      >
        <div className="form-grid">
          <Field label="نام" id="member-name" required error={errors.name?.message}>
            <Input
              id="member-name"
              autoFocus
              placeholder="اسم هم‌سفرت"
              {...register('name')}
              maxLength={150}
            />
          </Field>
          <Field
            label="ایمیل"
            id="member-email"
            optional
            error={errors.email?.message}
            hint="برای پیوند خودکار این عضو به حساب دعوت‌شده."
          >
            <Input
              id="member-email"
              type="email"
              dir="ltr"
              placeholder="ایمیل هم‌سفر"
              {...register('email')}
            />
          </Field>
          <Field
            label="سطح دسترسی"
            id="member-role"
            hint={values.role ? ROLE_HINTS[values.role] : undefined}
          >
            <Select id="member-role" {...register('role')} disabled={owner}>
              {Object.entries(ROLE_LABELS).map(([v, label]) => (
                <option value={v} key={v}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="وضعیت حضور" id="member-attendance">
            <Select id="member-attendance" {...register('attendance')}>
              {Object.entries(ATTENDANCE_LABELS).map(([v, label]) => (
                <option value={v} key={v}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="رنگ نشان" className="full">
            <div className="member-color-picker">
              {MEMBER_COLORS.map((color, i) => (
                <button
                  type="button"
                  key={color}
                  aria-label={`رنگ نشان ${fa(i + 1)}`}
                  aria-pressed={values.color === color}
                  onClick={() => setValue('color', color)}
                  style={{ backgroundColor: color }}
                  className={values.color === color ? 'selected' : ''}
                >
                  {values.color === color && <Check size={17} />}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </form>
    </Dialog>
  );
}
export function ShareDialog({
  trip,
  open,
  onOpenChange,
}: {
  trip: Trip;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const cloudUser = useTripStore((s) => s.cloudUser),
    isCloud = useTripStore((s) => s.cloudTripIds.includes(trip.id)),
    toast = useToast(),
    pathname = usePathname();
  const [role, setRole] = useState<MemberRole>('viewer'),
    [link, setLink] = useState(''),
    [busy, setBusy] = useState(false),
    [issue, setIssue] = useState(''),
    [invites, setInvites] = useState<Invitation[]>([]),
    [revoking, setRevoking] = useState<Invitation | null>(null);
  useEffect(() => {
    if (open) {
      setIssue('');
      setLink('');
      if (cloudUser && isCloud)
        void listInvitations(trip.id)
          .then(setInvites)
          .catch((e) => setIssue(readableError(e)));
    }
  }, [open, isCloud, cloudUser?.id, trip.id]);
  const make = async () => {
    setBusy(true);
    setIssue('');
    try {
      const invite = await createInvitation(trip.id, role),
        url = `${location.origin}/invite/${invite.token}`;
      setLink(url);
      setInvites((v) => [invite, ...v]);
      await copyText(url);
      toast('لینک دعوت ساخته و کپی شد.');
    } catch (e) {
      setIssue(readableError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!busy) onOpenChange(v);
        }}
        title="هم‌سفرها را به این داستان دعوت کن."
        description="لینک امن، با دسترسی مشخص و اعتبار هفت‌روزه."
      >
        {!cloudConfigured ? (
          <div className="cloud-setup-info">
            <span className="cloud-symbol">
              <Cloud size={32} />
            </span>
            <h3>برای دعوت واقعی، اتصال ابری لازم است.</h3>
            <p>
              نسخه فعلی بدون حساب کاربری روی این دستگاه کار می‌کند. با تنظیم Supabase، ورود، دعوت
              امن و همگام‌سازی اعضا فعال می‌شوند.
            </p>
            <LinkButton href="/settings" variant="primary">
              راهنمای اتصال ابری
            </LinkButton>
            <small>تا آن زمان، می‌توانی نام و نقش همراه‌ها را در فهرست محلی مدیریت کنی.</small>
          </div>
        ) : !cloudUser ? (
          <div className="cloud-setup-info">
            <LockKeyhole size={32} />
            <h3>اول وارد حسابت شو.</h3>
            <p>برای ساخت یک لینک دعوت امن، به حساب شخصی نیاز داری.</p>
            <LinkButton variant="primary" href={`/login?next=${encodeURIComponent(pathname)}`}>
              ورود یا ساخت حساب
            </LinkButton>
          </div>
        ) : !isCloud ? (
          <div className="cloud-setup-info">
            <Cloud size={32} />
            <h3>این سفر هنوز روی همین دستگاه است.</h3>
            <p>
              با اتصال ابری، اطلاعات و پیوست‌های سفر در حساب تو ذخیره می‌شوند و می‌توانی لینک دعوت
              بسازی.
            </p>
            <Button
              variant="primary"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                setIssue('');
                try {
                  await publishTrip(trip);
                  toast('سفر به فضای ابری وصل شد.');
                } catch (e) {
                  setIssue(readableError(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              فعال‌سازی همکاری ابری
            </Button>
          </div>
        ) : (
          <div className="form-stack">
            <Field label="دسترسی مهمان لینک" id="invite-role" hint={ROLE_HINTS[role]}>
              <Select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value as MemberRole)}
              >
                {Object.entries(ROLE_LABELS).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            {role === 'admin' && (
              <div className="info-callout">
                <ShieldCheck size={17} />
                <p>
                  مدیریت کامل شامل حذف سفر و تغییر دسترسی اعضاست. این لینک را فقط به فرد مورد اعتماد
                  بده.
                </p>
              </div>
            )}
            <Button variant="primary" loading={busy} onClick={make}>
              <Link2 size={17} />
              ساخت و کپی لینک دعوت
            </Button>
            {link && (
              <div className="invite-link-box">
                <Input readOnly value={link} dir="ltr" aria-label="لینک دعوت" />
                <Button
                  size="icon"
                  onClick={() => {
                    void copyText(link)
                      .then(() => toast('لینک کپی شد.'))
                      .catch(() => toast('لینک را دستی کپی کن.', 'info'));
                  }}
                  aria-label="کپی لینک دعوت"
                >
                  <Copy size={17} />
                </Button>
              </div>
            )}
            {invites.length > 0 && (
              <div className="active-invites">
                <h3>لینک‌های فعال</h3>
                {invites.map((invite) => (
                  <div key={invite.token}>
                    <div>
                      <strong>{ROLE_LABELS[invite.role]}</strong>
                      <small>معتبر تا {formatDate(invite.expires_at.slice(0, 10))}</small>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="کپی لینک فعال"
                      onClick={() => {
                        const url = `${location.origin}/invite/${invite.token}`;
                        setLink(url);
                        void copyText(url)
                          .then(() => toast('لینک کپی شد.'))
                          .catch(() => toast('لینک را از کادر دستی کپی کن.', 'info'));
                      }}
                    >
                      <Copy size={15} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="لغو لینک دعوت"
                      onClick={() => setRevoking(invite)}
                    >
                      <Unlink size={15} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <p className="field-hint">
              هر دارنده لینک می‌تواند پس از ورود، به این سفر بپیوندد. لینک را عمومی منتشر نکن و پس
              از دعوت اعضا، آن را لغو کن.
            </p>
          </div>
        )}
        {issue && (
          <p className="field-error" role="alert" style={{ marginTop: 16 }}>
            {issue}
          </p>
        )}
      </Dialog>
      <ConfirmDialog
        open={!!revoking}
        onOpenChange={(v) => {
          if (!v) setRevoking(null);
        }}
        title="این لینک دعوت لغو شود؟"
        description="دیگر کسی با این لینک نمی‌تواند عضو شود؛ اعضای قبلی باقی می‌مانند."
        label="لغو لینک"
        onConfirm={async () => {
          if (revoking) {
            await revokeInvitation(revoking.token);
            setInvites((v) => v.filter((i) => i.token !== revoking.token));
            toast('لینک دعوت لغو شد.');
          }
        }}
      />
    </>
  );
}
