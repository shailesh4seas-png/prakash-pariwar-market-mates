import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { PageHeader } from "@/components/AppShell";
import { Panel } from "@/components/shared";
import { ROLE_LABEL, useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export function ProfileSettings() {
  const { user, activeRole, activeProfile, authUser, refreshAuthUser } = useSession();
  const [fields, setFields] = useState({
    name: "",
    country: "",
    state: "",
    city: "",
    business: "",
    category: "",
    phone: "",
  });
  const [logo, setLogo] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!activeProfile) return;
    setFields({
      name: activeProfile.full_name,
      country: activeProfile.country,
      state: activeProfile.state,
      city: activeProfile.city,
      business: activeProfile.business_name,
      category: activeProfile.category,
      phone: activeProfile.contact_number,
    });
    setLogo(null);
    setPhoto(null);
  }, [activeProfile]);

  if (!user) return null;

  const updateField = (field: keyof typeof fields, value: string) =>
    setFields((current) => ({ ...current, [field]: value }));

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const client = supabase;
    if (!activeProfile || !authUser || !activeRole || !client) {
      setError("Your authenticated profile is unavailable. Sign in again and retry.");
      return;
    }
    if (
      Object.values(fields).some((value) => !value.trim()) ||
      !/^\+?[0-9() .-]{7,20}$/.test(fields.phone.trim())
    ) {
      setError("Complete all required fields and enter a valid contact number.");
      return;
    }
    const files = [logo, photo].filter((file): file is File => file !== null);
    if (
      files.some(
        (file) =>
          !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
          file.size > 5 * 1024 * 1024,
      )
    ) {
      setError("Use PNG, JPG, or WebP images up to 5 MB each.");
      return;
    }

    setSaving(true);
    const uploaded: string[] = [];
    let profileUpdated = false;
    try {
      const { data: verified, error: authError } = await client.auth.getUser();
      if (authError || !verified.user || verified.user.id !== authUser.id || !verified.user.email) {
        throw new Error("Your sign-in session expired or changed. Sign in again before saving.");
      }
      const upload = async (file: File, kind: string) => {
        const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
        const path = `${verified.user.id}/${activeRole}/${kind}-${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await client.storage
          .from("profile-assets")
          .upload(path, file, {
            contentType: file.type,
            upsert: false,
          });
        if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
        uploaded.push(path);
        return path;
      };
      const nextLogo = logo
        ? await upload(logo, "business-logo")
        : activeProfile.business_logo_path;
      const nextPhoto = photo
        ? await upload(photo, "profile-photo")
        : activeProfile.profile_photo_path;
      const { data: updated, error: updateError } = await client
        .from("user_profiles")
        .update({
          full_name: fields.name.trim(),
          email: verified.user.email,
          country: fields.country.trim(),
          state: fields.state.trim(),
          city: fields.city.trim(),
          business_name: fields.business.trim(),
          business_logo_path: nextLogo,
          profile_photo_path: nextPhoto,
          category: fields.category.trim(),
          contact_number: fields.phone.trim(),
        })
        .eq("user_id", verified.user.id)
        .eq("role", activeRole)
        .select("user_id")
        .maybeSingle();
      if (updateError || !updated)
        throw new Error(updateError?.message ?? "The profile row was not updated.");
      profileUpdated = true;
      await refreshAuthUser(activeRole);

      const replaced = [
        logo ? activeProfile.business_logo_path : "",
        photo ? activeProfile.profile_photo_path : "",
      ].filter(Boolean);
      if (replaced.length) {
        const { error: deleteError } = await client.storage.from("profile-assets").remove(replaced);
        if (deleteError) toast.error("Profile saved, but an old image could not be deleted.");
      }
      setLogo(null);
      setPhoto(null);
      toast.success("Profile saved");
    } catch (cause) {
      let cleanupNotice = "";
      if (!profileUpdated && uploaded.length) {
        const { error: cleanupError } = await client.storage
          .from("profile-assets")
          .remove(uploaded);
        if (cleanupError) cleanupNotice = " Newly uploaded images could not be cleaned up.";
      }
      setError(
        (cause instanceof Error ? cause.message : "Profile could not be saved. Please try again.") +
          cleanupNotice,
      );
    } finally {
      setSaving(false);
    }
  };

  const choose = (event: ChangeEvent<HTMLInputElement>, setter: (file: File | null) => void) =>
    setter(event.target.files?.[0] ?? null);

  return (
    <>
      <PageHeader
        title="Profile"
        desc="Business details associated with your authenticated account."
      />
      <Panel>
        <div className="flex items-center gap-4">
          {activeProfile?.profilePhotoUrl ? (
            <img
              src={activeProfile.profilePhotoUrl}
              alt="Profile"
              className="h-16 w-16 rounded-full border object-cover"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary text-xl font-bold text-primary-foreground">
              {user.initials}
            </span>
          )}
          <div>
            <p className="text-lg font-bold">{user.name}</p>
            <p className="text-sm text-muted-foreground">
              {user.business} · {user.email}
            </p>
            <p className="mt-2 flex gap-2">
              {user.roles.map((role) => (
                <span
                  key={role}
                  className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground"
                >
                  {ROLE_LABEL[role]}
                </span>
              ))}
            </p>
          </div>
        </div>
        {activeProfile?.businessLogoUrl && (
          <img
            src={activeProfile.businessLogoUrl}
            alt={`${activeProfile.business_name} logo`}
            className="mt-6 h-20 max-w-48 rounded-lg border bg-white object-contain p-2"
          />
        )}
        {activeProfile?.assetError && (
          <p role="status" className="mt-4 text-sm text-muted-foreground">
            {activeProfile.assetError}
          </p>
        )}
        {activeProfile ? (
          <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Business category", activeProfile.category],
              ["Country", activeProfile.country],
              ["State", activeProfile.state],
              ["City", activeProfile.city],
              ["Contact number", activeProfile.contact_number],
              ["Terms accepted", new Date(activeProfile.terms_accepted_at).toLocaleDateString()],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-muted p-4">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p role="status" className="mt-6 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            Your business profile could not be loaded.
          </p>
        )}
      </Panel>
      {activeProfile && (
        <Panel title="Edit business profile" className="mt-6">
          <form onSubmit={(event) => void save(event)} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {(["name", "country", "state", "city", "business", "category", "phone"] as const).map(
                (field) => (
                  <label key={field} className="block text-sm font-medium capitalize">
                    {field === "name"
                      ? "Full name"
                      : field === "business"
                        ? "Business / shop name"
                        : field === "phone"
                          ? "Contact number"
                          : field}
                    <input
                      required
                      type={field === "phone" ? "tel" : "text"}
                      value={fields[field]}
                      onChange={(event) => updateField(field, event.target.value)}
                      className="mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2.5 outline-none focus:border-primary"
                    />
                  </label>
                ),
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Account email: {authUser?.email ?? user.email}. Terms acceptance is retained from
              registration.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Replace business logo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => choose(event, setLogo)}
                  className="mt-1.5 block w-full text-sm"
                />
                <span className="mt-1 block text-xs text-muted-foreground">
                  {logo?.name ?? "PNG, JPG, or WebP · up to 5 MB"}
                </span>
              </label>
              <label className="block text-sm font-medium">
                Replace profile photo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => choose(event, setPhoto)}
                  className="mt-1.5 block w-full text-sm"
                />
                <span className="mt-1 block text-xs text-muted-foreground">
                  {photo?.name ?? "PNG, JPG, or WebP · up to 5 MB"}
                </span>
              </label>
            </div>
            {error && (
              <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {saving ? "Saving profile..." : "Save profile"}
            </button>
          </form>
        </Panel>
      )}
    </>
  );
}
