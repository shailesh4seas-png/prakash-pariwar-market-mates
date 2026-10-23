import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  Copy,
  ImagePlus,
  LoaderCircle,
  MessageCircle,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Panel, StatusBadge } from "@/components/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import {
  createRetailerLink,
  createWhatsAppShareUrl,
  issueRetailerInvitation,
  validateRetailerInvitation,
  type RetailerInvitationErrors,
  type RetailerInvitationValues,
} from "@/lib/retailer-invitations";

export const Route = createFileRoute("/manufacturer/retailers")({ component: Page });

interface NetworkRecord {
  id: string;
  retailer_user_id: string | null;
  retailer_name: string;
  email: string | null;
  business_name: string;
  city: string;
  state: string | null;
  country: string | null;
  category: string | null;
  contact_number: string | null;
  profile_photo_path: string | null;
  business_logo_path: string | null;
  status: "pending" | "active" | "expired";
  joined_at: string | null;
  downloads: number | null;
  record_type: "invitation" | "retailer";
  photo_url?: string;
  business_logo_url?: string;
}

const EMPTY_INVITE: RetailerInvitationValues = {
  name: "",
  phone: "",
  business: "",
  city: "",
  photo: null,
  businessLogo: null,
};
const PUBLIC_APP_URL = import.meta.env["VITE_PUBLIC_APP_URL"] as string | undefined;

function Page() {
  const { authUser, user } = useSession();
  const [records, setRecords] = useState<NetworkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(EMPTY_INVITE);
  const [errors, setErrors] = useState<RetailerInvitationErrors>({});
  const [creating, setCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [referralError, setReferralError] = useState("");
  const [removing, setRemoving] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<NetworkRecord | null>(null);
  const invitationInFlight = useRef(false);
  const removalInFlight = useRef(false);

  const loadNetwork = useCallback(async () => {
    const client = supabase;
    if (!client) {
      setLoadError("Supabase is not configured. The retailer network is unavailable.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError("");
    try {
      const { data, error } = await client.rpc("get_retailer_network");
      if (error) throw error;
      const rows = (data ?? []) as NetworkRecord[];
      const hydrated = await Promise.all(
        rows.map(async (row) => {
          const [photo, logo] = await Promise.all(
            [row.profile_photo_path, row.business_logo_path].map(async (path) => {
              if (!path) return null;
              const { data, error } = await client.storage
                .from("profile-assets")
                .createSignedUrl(path, 3600);
              if (error) throw error;
              return data.signedUrl;
            }),
          );
          return {
            ...row,
            ...(photo ? { photo_url: photo } : {}),
            ...(logo ? { business_logo_url: logo } : {}),
          };
        }),
      );
      setRecords(hydrated);
    } catch {
      setLoadError(
        "Retailer network could not be loaded. Apply the retailer network migration and try again.",
      );
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReferral = useCallback(async () => {
    const client = supabase;
    if (!client) return;
    let code: string;
    try {
      const { data, error } = await client.rpc("get_or_create_manufacturer_referral");
      if (error || typeof data !== "string") {
        throw new Error(
          "The permanent retailer link could not be loaded. Apply the retailer network migration and try again.",
        );
      }
      code = data;
    } catch {
      setReferralError(
        "The permanent retailer link could not be loaded. Apply the retailer network migration and try again.",
      );
      return;
    }
    try {
      setReferralLink(createRetailerLink("/register", "referral", code, PUBLIC_APP_URL ?? ""));
      setReferralError("");
    } catch (cause) {
      setReferralError(
        cause instanceof Error
          ? cause.message
          : "Set VITE_PUBLIC_APP_URL to the public application URL.",
      );
    }
  }, []);

  useEffect(() => {
    void loadNetwork();
    void loadReferral();
  }, [loadNetwork, loadReferral]);

  const copyLink = async (link: string, description: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success(description);
    } catch {
      toast.error("The link could not be copied. Select and copy it manually.");
    }
  };

  const update = (field: keyof RetailerInvitationValues, value: string | File | null) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const createInvitation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (invitationInFlight.current) return;
    invitationInFlight.current = true;
    setCreatedLink("");
    const nextErrors = validateRetailerInvitation(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      invitationInFlight.current = false;
      return;
    }
    const client = supabase;
    if (!client || !authUser) {
      toast.error("Sign in as a manufacturer before creating an invitation.");
      invitationInFlight.current = false;
      return;
    }
    const uploadedPaths: string[] = [];
    const invitationPaths = {
      photoPath: "",
      businessLogoPath: "",
    };
    let invitationRequestStarted = false;
    setCreating(true);
    try {
      const { data: verified, error: verifyError } = await client.auth.getUser();
      if (verifyError || !verified.user || verified.user.id !== authUser.id) {
        throw new Error(
          "Your sign-in session expired. Sign in again before creating an invitation.",
        );
      }
      const storagePath = (file: File, folder: string) => {
        const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
        return `${verified.user.id}/manufacturer/${folder}/${crypto.randomUUID()}.${extension}`;
      };
      invitationPaths.photoPath = storagePath(values.photo!, "invitation-photos");
      invitationPaths.businessLogoPath = storagePath(values.businessLogo!, "invitation-logos");
      const link = await issueRetailerInvitation(
        values,
        PUBLIC_APP_URL ?? "",
        invitationPaths,
        async (file, path) => {
          const { error } = await client.storage.from("profile-assets").upload(path, file, {
            contentType: file.type,
            upsert: false,
          });
          if (error) throw new Error(`Image upload failed: ${error.message}`);
          uploadedPaths.push(path);
        },
        async (token, photoPath, businessLogoPath) => {
          invitationRequestStarted = true;
          const { error } = await client.rpc("create_retailer_invitation", {
            p_token: token,
            p_retailer_name: values.name.trim(),
            p_mobile_number: values.phone.trim(),
            p_business_name: values.business.trim(),
            p_city: values.city.trim(),
            p_profile_photo_path: photoPath,
            p_business_logo_path: businessLogoPath,
          });
          if (error) throw new Error("Invitation could not be saved. Please try again.");
        },
      );
      setCreatedLink(link);
      setValues(EMPTY_INVITE);
      setErrors({});
      await loadNetwork();
      toast.success("Invitation link created. Share it with the retailer to continue.");
    } catch (cause) {
      if (uploadedPaths.length && !invitationRequestStarted) {
        const { error: cleanupError } = await client.storage
          .from("profile-assets")
          .remove(uploadedPaths);
        if (cleanupError)
          toast.error(
            "The uploaded photo could not be cleaned up; contact support if it persists.",
          );
      }
      toast.error(cause instanceof Error ? cause.message : "Invitation could not be created.");
    } finally {
      invitationInFlight.current = false;
      setCreating(false);
    }
  };

  const removeRecord = async () => {
    if (!selectedRecord || !supabase || removalInFlight.current) return;
    removalInFlight.current = true;
    setRemoving(true);
    try {
      const { error } = await supabase.rpc("remove_retailer_network_record", {
        p_record_id: selectedRecord.id,
        p_record_type: selectedRecord.record_type,
      });
      if (error) throw error;
      toast.success(
        selectedRecord.record_type === "invitation"
          ? "Invitation revoked."
          : "Retailer removed from your network.",
      );
      setRecords((current) => current.filter((record) => record.id !== selectedRecord.id));
    } catch {
      toast.error("This network entry could not be removed. Refresh and try again.");
    } finally {
      removalInFlight.current = false;
      setRemoving(false);
      setSelectedRecord(null);
    }
  };

  const pendingCount = records.filter((record) => record.status === "pending").length;
  const whatsappLink = (link: string) =>
    createWhatsAppShareUrl(link, user?.business ?? "your manufacturer");

  return (
    <>
      <PageHeader
        title="Retailer network"
        desc={`${records.length} network entries · ${pendingCount} pending invitations`}
        action={
          <Button
            className="w-fit bg-gradient-primary shadow-glow"
            onClick={() => {
              setOpen(true);
              setCreatedLink("");
            }}
          >
            <UserPlus className="h-4 w-4" /> Invite retailer
          </Button>
        }
      />
      <Panel>
        {loadError && (
          <div
            role="alert"
            className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          >
            <p>{loadError}</p>
            <Button variant="outline" size="sm" onClick={() => void loadNetwork()}>
              Retry
            </Button>
          </div>
        )}
        {loading ? (
          <div
            role="status"
            className="flex items-center gap-2 py-10 text-sm text-muted-foreground"
          >
            <LoaderCircle className="h-4 w-4 animate-spin" /> Loading retailer network...
          </div>
        ) : !loadError && records.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No retailers or invitations yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-3">Retailer</th>
                  <th>Business / logo</th>
                  <th>City</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Downloads</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={`${record.record_type}:${record.id}`} className="border-b last:border-0">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        {record.photo_url ? (
                          <img
                            src={record.photo_url}
                            alt=""
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                            {record.retailer_name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <div>
                          <p className="font-semibold">{record.retailer_name}</p>
                          {record.email && (
                            <p className="text-xs text-muted-foreground">{record.email}</p>
                          )}
                          {record.contact_number && (
                            <p className="text-xs text-muted-foreground">{record.contact_number}</p>
                          )}
                          {!record.email && !record.contact_number && (
                            <p className="text-xs text-muted-foreground">
                              Invitation not yet accepted
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {record.business_logo_url ? (
                          <img
                            src={record.business_logo_url}
                            alt=""
                            className="h-8 w-8 rounded-md border object-contain"
                          />
                        ) : null}
                        <span>{record.business_name}</span>
                      </div>
                    </td>
                    <td className="text-muted-foreground">
                      {[record.city, record.state].filter(Boolean).join(", ")}
                    </td>
                    <td>
                      <StatusBadge status={record.status} />
                    </td>
                    <td className="text-muted-foreground">
                      {record.joined_at ? new Date(record.joined_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="text-muted-foreground">{record.downloads ?? "—"}</td>
                    <td className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={
                          record.record_type === "invitation"
                            ? "Revoke invitation"
                            : "Remove retailer"
                        }
                        onClick={() => setSelectedRecord(record)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted-foreground">
              Download counts are unavailable because downloads are not currently persisted.
            </p>
          </div>
        )}
      </Panel>

      <Panel title="Permanent Retailer Registration Link" className="mt-6">
        <p className="mb-3 text-sm text-muted-foreground">
          A reusable referral link for retailers to register directly with your network.
        </p>
        {referralError ? (
          <p role="alert" className="text-sm text-destructive">
            {referralError}
          </p>
        ) : referralLink ? (
          <div className="flex flex-wrap gap-2">
            <Input
              readOnly
              value={referralLink}
              aria-label="Permanent retailer registration link"
              className="min-w-[250px] flex-1"
            />
            <Button
              variant="outline"
              onClick={() => void copyLink(referralLink, "Permanent link copied.")}
            >
              <Copy className="h-4 w-4" /> Copy link
            </Button>
            <Button variant="outline" asChild>
              <a href={whatsappLink(referralLink)} target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </Button>
          </div>
        ) : (
          <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Loading permanent link...
          </div>
        )}
      </Panel>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setErrors({});
            setCreatedLink("");
          }
        }}
      >
        <DialogContent>
          <DialogTitle>Invite a retailer</DialogTitle>
          <DialogDescription>
            Generate a secure invitation link for one retailer. They become active after completing
            registration and signing in with Google.
          </DialogDescription>
          {createdLink ? (
            <div className="space-y-3">
              <p role="status" className="flex items-center gap-2 text-sm font-medium">
                <Check className="h-4 w-4 text-success" /> Invitation link created. It has not been
                sent.
              </p>
              <Input readOnly value={createdLink} aria-label="Generated invitation link" />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => void copyLink(createdLink, "Invitation link copied.")}
                >
                  <Copy className="h-4 w-4" /> Copy link
                </Button>
                <Button variant="outline" asChild>
                  <a href={whatsappLink(createdLink)} target="_blank" rel="noreferrer">
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={(event) => void createInvitation(event)} className="space-y-4">
              <Field
                label="Retailer / contact person name"
                value={values.name}
                error={errors.name}
                onChange={(value) => update("name", value)}
              />
              <Field
                label="Mobile number"
                value={values.phone}
                error={errors.phone}
                type="tel"
                onChange={(value) => update("phone", value)}
              />
              <Field
                label="Business / store name"
                value={values.business}
                error={errors.business}
                onChange={(value) => update("business", value)}
              />
              <Field
                label="City"
                value={values.city}
                error={errors.city}
                onChange={(value) => update("city", value)}
              />
              <InviteImageUpload
                id="retailer-photo"
                label="Retailer profile photo"
                file={values.photo}
                error={errors.photo}
                onChange={(file) => update("photo", file)}
              />
              <InviteImageUpload
                id="retailer-business-logo"
                label="Business / store logo"
                file={values.businessLogo}
                error={errors.businessLogo}
                onChange={(file) => update("businessLogo", file)}
              />
              <Button type="submit" disabled={creating} className="w-full bg-gradient-primary">
                {creating ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" /> Creating invitation...
                  </>
                ) : (
                  "Create invitation link"
                )}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={selectedRecord !== null}
        onOpenChange={(next) => {
          if (!next && !removing) setSelectedRecord(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedRecord?.record_type === "invitation"
                ? "Revoke this invitation?"
                : "Remove this retailer?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedRecord?.record_type === "invitation"
                ? "The link will stop working and cannot create a retailer association."
                : "This removes the retailer from your network but keeps their account and existing history."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={removing}
              onClick={(event) => {
                event.preventDefault();
                void removeRecord();
              }}
            >
              {removing ? "Removing..." : "Confirm removal"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function InviteImageUpload({
  id,
  label,
  file,
  error,
  onChange,
}: {
  id: string;
  label: string;
  file: File | null;
  error?: string | undefined;
  onChange: (file: File | null) => void;
}) {
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <label
        htmlFor={id}
        className="flex min-h-24 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-input p-3 hover:border-primary"
      >
        {preview ? (
          <img
            src={preview}
            alt={`${label} preview`}
            className="h-16 w-16 rounded-md object-cover"
          />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <ImagePlus className="h-5 w-5" />
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">
            {file?.name ?? "Choose image"}
          </span>
          <span className="text-xs text-muted-foreground">JPEG, PNG or WebP · max 5 MB</span>
        </span>
      </label>
      <Input
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(event.target.files?.[0] ?? null)
        }
        aria-invalid={Boolean(error)}
      />
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  error,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  error?: string | undefined;
  type?: string;
  onChange: (value: string) => void;
}) {
  const id = `invite-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
      />
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
